class_name NetClient
extends RefCounted
# The client's end of the connection (D173, D215, D216): connects over ENet, sends
# the hello with the player id, and on the welcome holds the land and its own
# character id in `state`; every view after that goes into `state` too. It reports
# four ends: welcomed, refused (the server said no, with its reason), failed (no
# welcome before the connect timeout) and lost (the server went away while playing).
# Call process(delta) every frame: the timeout counts in seconds of those.

signal welcomed
signal refused(reason: String)
signal failed(reason: String)
signal lost(reason: String)

enum Phase { IDLE, CONNECTING, PLAYING }

var state := ClientState.new()
var phase: Phase = Phase.IDLE

var _link: NetLink
var _api: MultiplayerAPI
var _player: String
var _timeout: float
var _waited: float = 0.0
var _target: String = ""


func _init(link: NetLink, api: MultiplayerAPI, player: String, connect_timeout: float) -> void:
	_link = link
	_api = api
	_player = player
	_timeout = connect_timeout
	_link.on_welcome = _on_welcome
	_link.on_view = _on_view
	_link.on_refusal = _on_refusal
	_api.connected_to_server.connect(_on_connected)
	_api.connection_failed.connect(_on_connection_failed)
	_api.server_disconnected.connect(_on_server_disconnected)


func is_connecting() -> bool:
	return phase == Phase.CONNECTING


func is_playing() -> bool:
	return phase == Phase.PLAYING


# Starts connecting. Returns the engine's error when it can't even start.
func connect_to(address: String, port: int) -> Error:
	stop()
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_client(address, port)
	if err != OK:
		return err
	_api.multiplayer_peer = peer
	_target = "%s:%d" % [address, port]
	_waited = 0.0
	phase = Phase.CONNECTING
	return OK


func process(delta: float) -> void:
	if phase != Phase.CONNECTING:
		return
	_waited += delta
	if _waited >= _timeout:
		_fail()


# Closes the connection and goes back to idle. Reports nothing.
func stop() -> void:
	phase = Phase.IDLE
	if _api.multiplayer_peer != null:
		_api.multiplayer_peer.close()
		_api.multiplayer_peer = null


# Lets go of the link and the multiplayer. Call when the client is done with for good.
func release() -> void:
	stop()
	_link.on_welcome = Callable()
	_link.on_view = Callable()
	_link.on_refusal = Callable()
	_api.connected_to_server.disconnect(_on_connected)
	_api.connection_failed.disconnect(_on_connection_failed)
	_api.server_disconnected.disconnect(_on_server_disconnected)


func _fail() -> void:
	stop()
	failed.emit("could not connect to %s" % _target)


func _on_connected() -> void:
	if phase != Phase.CONNECTING:
		return
	var message := NetMessages.hello()
	_link.send_hello(_player, message)


func _on_connection_failed() -> void:
	if phase == Phase.CONNECTING:
		_fail()


func _on_server_disconnected() -> void:
	if phase == Phase.PLAYING:
		stop()
		lost.emit("the connection to the server was lost")
	elif phase == Phase.CONNECTING:
		_fail()


func _on_welcome(message: Dictionary) -> void:
	if phase != Phase.CONNECTING:
		return
	state.apply_welcome(message)
	phase = Phase.PLAYING
	welcomed.emit()


func _on_view(message: Dictionary) -> void:
	if phase == Phase.PLAYING:
		state.apply_view(message)


func _on_refusal(message: Dictionary) -> void:
	if phase != Phase.CONNECTING:
		return
	stop()
	refused.emit(str(message.get("reason", "no reason given")))
