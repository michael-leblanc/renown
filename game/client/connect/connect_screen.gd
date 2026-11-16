class_name ConnectScreen
extends Control
# The game's first screen (D215): an address field, a port field and a Connect
# button. Connecting sends the hello with the player id (D216); on the welcome the
# game scene shows and this form hides. A failed connect, a refusal or a lost
# connection brings the form back with a message. Launch arguments: see LaunchArgs.

const GAME_SCENE := preload("res://client/game.tscn")
const CLIENT_SETTINGS := "res://data/client.json"

# Set before the screen enters the tree to change them (tests do).
var args: PackedStringArray = LaunchArgs.from_command_line()
var player_file: String = PlayerId.FILE
var link_parent: Node = null # where the network link goes; null is the tree's root

var connect_timeout: float = 0.0
var player: String = ""
var client: NetClient = null

var _link: NetLink = null


func _ready() -> void:
	var settings := ClientSettings.load_file(CLIENT_SETTINGS)
	if settings == null:
		%Message.text = "The client settings are missing."
		%Connect.disabled = true
		return
	connect_timeout = settings.number("connect_timeout")
	player = PlayerId.resolve(args, player_file)
	var launch := LaunchArgs.parse(args)
	%Address.text = launch.get("address", settings.text("default_address"))
	%Port.text = str(launch.get("port", ClientSettings.default_port()))
	%Connect.pressed.connect(_on_connect_pressed)
	if launch["connect"]:
		_on_connect_pressed.call_deferred()


func _process(delta: float) -> void:
	if client != null:
		client.process(delta)


func _exit_tree() -> void:
	_drop_client()


func is_connecting() -> bool:
	return client != null and client.is_connecting()


func _on_connect_pressed() -> void:
	if is_connecting() or client != null:
		return
	var address: String = %Address.text.strip_edges()
	var port := int(%Port.text)
	var parent := link_parent if link_parent != null else get_tree().root
	_link = NetLink.new()
	_link.name = "Link"
	parent.add_child(_link)
	client = NetClient.new(_link, parent.multiplayer, player, connect_timeout)
	client.welcomed.connect(_on_welcomed)
	client.refused.connect(func(reason: String) -> void: _back_to_form("The server refused: %s" % reason))
	client.failed.connect(func(reason: String) -> void: _back_to_form(_sentence(reason)))
	client.lost.connect(func(reason: String) -> void: _back_to_form(_sentence(reason)))
	var err := client.connect_to(address, port)
	if err != OK:
		_back_to_form("Could not connect to %s:%d (%s)." % [address, port, error_string(err)])
		return
	%Message.text = "Connecting to %s:%d..." % [address, port]
	%Connect.disabled = true


func _on_welcomed() -> void:
	var game := GAME_SCENE.instantiate()
	game.name = "Game"
	game.setup(client)
	add_child(game)
	%Form.visible = false


func _back_to_form(message: String) -> void:
	var game := get_node_or_null("Game")
	if game != null:
		remove_child(game)
		game.queue_free()
	_drop_client()
	%Message.text = message
	%Connect.disabled = false
	%Form.visible = true


func _drop_client() -> void:
	if client != null:
		client.release()
		client = null
	if _link != null:
		# Renamed, not removed: the tree may be busy, and a new link must be able to
		# take the name "Link", which the server's RPC path needs.
		_link.name = "LinkClosed"
		_link.queue_free()
		_link = null


static func _sentence(text: String) -> String:
	return text.substr(0, 1).to_upper() + text.substr(1) + "."
