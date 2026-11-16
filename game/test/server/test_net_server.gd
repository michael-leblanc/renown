extends GutTest
# Tests net/link.gd and server/net_server.gd (NET-002).

const WAIT := 5.0

var _settings: SimSettings
var _looks: SimLooks
var _stand_in: SimStandInWorld
var _view: ServerView
var _server_branch: NetRig.Branch
var _server: NetServer
var _port: int
var _clients: Array[NetRig.Branch] = []


func before_each() -> void:
	_settings = SimSettings.load_file("res://data/settings.json")
	_looks = SimLooks.load_file("res://data/looks.json")
	_stand_in = SimStandInWorld.build(1, _settings, _looks)
	_view = ServerView.new(_stand_in.sim, _settings)
	_server_branch = NetRig.branch(self, "Server")
	_server = NetServer.new(_stand_in.sim, _view, _looks, _server_branch.link, _server_branch.api, _stand_in.waking_spot)
	_server.bind_ip = "127.0.0.1"
	_port = NetRig.free_port(24700 + randi() % 2000)
	assert_eq(_server.listen(_port), OK)


func after_each() -> void:
	for b in _clients:
		b.api.multiplayer_peer = null
	_clients.clear()
	_server_branch.api.multiplayer_peer = null


# A client that has connected and sent its hello.
func _join(player: String, version := NetMessages.PROTOCOL_VERSION) -> NetRig.Branch:
	var b := NetRig.branch(self, "Client%d" % _clients.size())
	_clients.append(b)
	assert_eq(NetRig.connect_client(b, _port), OK)
	await wait_until(b.connected, WAIT, "client connects")
	var message := NetMessages.hello()
	message["version"] = version
	b.link.send_hello(player, message)
	return b


func _welcomed(player: String) -> NetRig.Branch:
	var b := await _join(player)
	await wait_until(func() -> bool: return b.welcomes.size() == 1, WAIT, "welcome arrives")
	return b


func _tick(count := 1) -> void:
	for i in count:
		_stand_in.sim.step()
		_server.after_tick()


func test_given_the_server_started_with_a_port_when_it_starts_then_it_listens_on_that_port_and_with_no_port_it_uses_the_settings() -> void:
	assert_eq(_server.port, _port)
	assert_true(_server.is_listening())
	assert_eq(NetServer.port_from_args(PackedStringArray(["--port=24611"]), _settings), 24611)
	assert_eq(NetServer.port_from_args(PackedStringArray(["--seed=3"]), _settings), 24600)
	assert_eq(NetServer.port_from_args(PackedStringArray(), _settings), int(_settings.value("net_port")))


func test_given_a_client_that_sends_a_hello_with_a_player_id_when_the_server_answers_then_a_new_character_with_a_look_stands_nearest_the_waking_spot_and_the_client_is_welcomed() -> void:
	var world := _stand_in.sim.world
	# Take the waking spot itself, so the nearest free tile is another one.
	var blocker := SimCharacter.new(900)
	assert_true(world.add_character(blocker, _stand_in.waking_spot))
	var before := world._characters.size()
	var b := await _welcomed("ann")
	var welcome: Dictionary = b.welcomes[0]
	assert_eq(welcome["type"], NetMessages.WELCOME)
	assert_eq(world._characters.size(), before + 1)
	var c := world.get_character(welcome["you"])
	assert_not_null(c)
	assert_ne(c.pos, _stand_in.waking_spot)
	var d: Vector2i = (c.pos - _stand_in.waking_spot).abs()
	assert_eq(maxi(d.x, d.y), 1, "one tile from the waking spot")
	assert_ne(str(c.look.get("race", "")), "")
	assert_false(c.look.get("slots", {}).is_empty())


func test_given_a_connected_client_when_a_tick_runs_then_it_receives_one_view_built_for_its_own_character_and_never_another_clients() -> void:
	var a := await _welcomed("ann")
	var b := await _welcomed("ben")
	_tick()
	await wait_until(func() -> bool: return a.views.size() == 1 and b.views.size() == 1, WAIT, "views arrive")
	assert_eq(a.views.size(), 1)
	assert_eq(b.views.size(), 1)
	assert_eq(a.views[0]["type"], NetMessages.VIEW)
	var id_a: int = a.welcomes[0]["you"]
	var id_b: int = b.welcomes[0]["you"]
	assert_eq(a.views[0], _view.view(id_a))
	assert_eq(b.views[0], _view.view(id_b))
	# Each view lists its own viewer's character.
	var ids_a: Array = a.views[0]["characters"].map(func(c: Dictionary) -> int: return c["id"])
	assert_true(ids_a.has(id_a))


func test_given_two_clients_with_different_player_ids_when_both_are_welcomed_then_each_has_its_own_character_on_its_own_tile() -> void:
	var a := await _welcomed("ann")
	var b := await _welcomed("ben")
	var world := _stand_in.sim.world
	var id_a: int = a.welcomes[0]["you"]
	var id_b: int = b.welcomes[0]["you"]
	assert_ne(id_a, id_b)
	assert_ne(world.get_character(id_a).pos, world.get_character(id_b).pos)


func test_given_a_hello_with_a_player_id_already_connected_when_it_arrives_then_it_is_refused_with_a_reason_and_the_first_client_is_not_disturbed() -> void:
	var a := await _welcomed("ann")
	var count := _stand_in.sim.world._characters.size()
	var second := await _join("ann")
	await wait_until(func() -> bool: return second.refusals.size() == 1, WAIT, "refusal arrives")
	assert_eq(second.refusals[0]["type"], NetMessages.REFUSAL)
	assert_ne(str(second.refusals[0]["reason"]), "")
	assert_eq(second.welcomes.size(), 0)
	assert_eq(_stand_in.sim.world._characters.size(), count)
	_tick()
	await wait_until(func() -> bool: return a.views.size() == 1, WAIT, "first still gets its view")
	assert_eq(a.refusals.size(), 0)
	assert_true(a.connected())


func test_given_a_hello_with_another_protocol_version_when_it_arrives_then_it_is_refused_with_a_reason_that_gives_both_versions() -> void:
	var other := NetMessages.PROTOCOL_VERSION + 6
	var b := await _join("ann", other)
	await wait_until(func() -> bool: return b.refusals.size() == 1, WAIT, "refusal arrives")
	var reason := str(b.refusals[0]["reason"])
	assert_true(reason.begins_with(NetMessages.REASON_VERSION), reason)
	assert_string_contains(reason, str(NetMessages.PROTOCOL_VERSION))
	assert_string_contains(reason, str(other))
	assert_eq(b.welcomes.size(), 0)


func test_given_a_client_that_sends_no_hello_within_the_hello_timeout_when_the_time_is_up_then_the_server_drops_it() -> void:
	var b := NetRig.branch(self, "Silent")
	_clients.append(b)
	assert_eq(NetRig.connect_client(b, _port), OK)
	await wait_until(b.connected, WAIT, "client connects")
	await wait_until(func() -> bool: return _server.waiting_count() == 1, WAIT, "server sees it")
	_tick(_settings.ticks("hello_timeout") - 1)
	assert_eq(_server.waiting_count(), 1, "not yet")
	_tick()
	assert_eq(_server.waiting_count(), 0)
	await wait_until(b.disconnected, WAIT, "client is dropped")
	assert_true(b.disconnected())


func test_given_a_port_already_in_use_when_the_server_starts_then_it_reports_the_error() -> void:
	var other_branch := NetRig.branch(self, "Other")
	var other := NetServer.new(_stand_in.sim, _view, _looks, other_branch.link, other_branch.api, _stand_in.waking_spot)
	other.bind_ip = "127.0.0.1"
	assert_ne(other.listen(_port), OK)
	assert_false(other.is_listening())


func test_given_the_link_when_it_is_read_then_it_declares_every_message_of_the_messages_file_as_an_rpc() -> void:
	# A script's @rpc annotations are not readable at run time, so read the source.
	var source := FileAccess.get_file_as_string("res://net/link.gd")
	for message_name: String in [NetMessages.HELLO, NetMessages.WELCOME, NetMessages.VIEW, NetMessages.ORDER, NetMessages.REFUSAL]:
		var declared := RegEx.create_from_string("@rpc\\([^\\n]*\\)\\nfunc %s\\(" % message_name)
		assert_not_null(declared.search(source), "rpc for %s" % message_name)
