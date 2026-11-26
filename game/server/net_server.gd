class_name NetServer
extends RefCounted
# Accepts clients over ENet and gives each one a character (D173, D215, D216).
# A client connects, sends a hello with its player id and gets a welcome, then a
# view every tick built for its own character. A client that sends no hello in
# time is dropped; a hello with another protocol version or an id already in use
# is refused with a reason. Orders go to `orders` (server/orders.gd), with the character id of
# the connection, never one from the message.

var port: int = 0
var bind_ip: String = "*"
var orders: ServerOrders
var players: ServerPlayers

var _sim: Sim
var _view: ServerView
var _looks: SimLooks
var _birth: SimBirth
var _link: NetLink
var _api: MultiplayerAPI
var _waking_spot: Vector2i
var _hello_ticks: int
var _max_clients: int
var _listening: bool = false
var _waiting: Dictionary = {} # peer -> ticks since it connected
var _peers: Dictionary = {} # peer -> {"player": String, "id": int}


func _init(sim: Sim, view: ServerView, looks: SimLooks, link: NetLink, api: MultiplayerAPI, waking_spot: Vector2i, birth: SimBirth = null) -> void:
	_sim = sim
	_birth = birth if birth != null else SimBirth.load_file(SimStandInWorld.BIRTH_PATH)
	orders = ServerOrders.new(sim)
	players = ServerPlayers.new(sim)
	_view = view
	_looks = looks
	_link = link
	_api = api
	_waking_spot = waking_spot
	_hello_ticks = sim.settings.ticks("hello_timeout")
	_max_clients = int(sim.settings.value("net_max_clients"))
	_api.peer_connected.connect(_on_peer_connected)
	_api.peer_disconnected.connect(_on_peer_disconnected)
	_link.on_hello = _on_hello
	_link.on_order = _on_order


# The port after `--port=N`, else the one in the settings.
static func port_from_args(args: PackedStringArray, settings: SimSettings) -> int:
	for arg in args:
		if arg.begins_with("--port="):
			return int(arg.trim_prefix("--port="))
	return int(settings.value("net_port"))


# Starts listening. Returns the engine's error when the port can't be taken.
func listen(port_to_use: int) -> Error:
	# ENet prints engine errors when the port is taken; a plain socket test first
	# lets the caller report it in its own words.
	var probe := UDPServer.new()
	var probe_err := probe.listen(port_to_use, bind_ip)
	probe.stop()
	if probe_err != OK:
		return probe_err
	var peer := ENetMultiplayerPeer.new()
	peer.set_bind_ip(bind_ip)
	var err := peer.create_server(port_to_use, _max_clients)
	if err != OK:
		return err
	_api.multiplayer_peer = peer
	port = port_to_use
	_listening = true
	print("listening on port %d" % port)
	return OK


func is_listening() -> bool:
	return _listening


# Connected clients that have not sent a hello yet.
func waiting_count() -> int:
	return _waiting.size()


# Call after the world stepped `ticks_run` ticks: drops clients whose hello is
# late, then sends each welcomed client the view of its own character.
func after_tick(ticks_run := 1) -> void:
	for peer: int in _waiting.keys():
		_waiting[peer] += ticks_run
		if _waiting[peer] >= _hello_ticks:
			_waiting.erase(peer)
			(_api.multiplayer_peer as ENetMultiplayerPeer).disconnect_peer(peer)
	if players.step(ticks_run) > 0:
		_view.invalidate()
	for peer: int in _peers:
		_link.send_view(peer, _view.view(_peers[peer]["id"]))


func _on_peer_connected(peer: int) -> void:
	_waiting[peer] = 0


func _on_peer_disconnected(peer: int) -> void:
	_waiting.erase(peer)
	if _peers.has(peer):
		players.leave(_peers[peer]["player"])
	_peers.erase(peer)
	orders.forget(peer)


func _on_hello(peer: int, player: String, message: Dictionary) -> void:
	if not _waiting.has(peer):
		return
	var version: Variant = message.get("version")
	# A version that is not a number is refused too, before comparing: a String
	# against an int is a script error, which would leave the client waiting.
	if typeof(version) not in [TYPE_INT, TYPE_FLOAT] or version != NetMessages.PROTOCOL_VERSION:
		_refuse(peer, "%s: the server speaks %d, the client %s" % [NetMessages.REASON_VERSION, NetMessages.PROTOCOL_VERSION, str(version)])
		return
	if player.is_empty():
		_refuse(peer, "no player id")
		return
	for other: Dictionary in _peers.values():
		if other["player"] == player:
			_refuse(peer, "player already connected")
			return
	var id := _character_for(player)
	if id < 0:
		_refuse(peer, "no room to wake")
		return
	_waiting.erase(peer)
	_peers[peer] = {"player": player, "id": id}
	_link.send_welcome(peer, _view.welcome(id))


func _on_order(peer: int, message: Dictionary) -> void:
	if not _peers.has(peer):
		orders.drop()
		return
	orders.handle(peer, _peers[peer]["id"], message)


func _refuse(peer: int, reason: String) -> void:
	_link.send_refusal(peer, NetMessages.refusal(reason))


# The player's own character when it is still in the world, else a new one on
# the free tile nearest the waking spot. -1 when there is no free tile.
func _character_for(player: String) -> int:
	var world := _sim.world
	var known := players.character(player)
	if known != null:
		if world.get_character(known.id) == known:
			players.returned(player)
			return known.id
		# Out of the world after the wait: back on the free tile nearest where it left.
		var back: Variant = _nearest_free(players.left_at(player))
		if back == null or not world.add_character(known, back):
			return -1
		players.keep(player, known)
		_view.invalidate()
		return known.id
	var tile: Variant = _nearest_free(_waking_spot)
	if tile == null:
		return -1
	var c := SimCharacter.new(world.new_character_id())
	if not world.add_character(c, tile):
		return -1
	_birth.born(c, _looks, SimStandInWorld.OUTFIT, _sim.rng)
	players.keep(player, c)
	_view.invalidate()
	return c.id


# The free tile fewest tiles away in a straight line (a square ring around the
# spot), ties to the lowest row, then the lowest column.
func _nearest_free(spot: Vector2i) -> Variant:
	var world := _sim.world
	for radius in maxi(world.width, world.height):
		for y in range(spot.y - radius, spot.y + radius + 1):
			for x in range(spot.x - radius, spot.x + radius + 1):
				if maxi(absi(x - spot.x), absi(y - spot.y)) != radius:
					continue
				if world.is_free(Vector2i(x, y)):
					return Vector2i(x, y)
	return null
