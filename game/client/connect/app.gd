class_name App
extends Control
# The game's first scene (D197, D250): the main menu. Join game connects (sending the
# hello with the player id, D216); on the welcome the game scene shows and the menu
# hides. A failed connect or a refusal says so on the Join panel; a lost connection
# brings the menu back there. Settings apply at once and are kept under user://
# (UserSettings). Launch arguments: see LaunchArgs; with --address (play.sh adds
# --connect) it connects at once. Host game is not wired yet (D198).

const GAME_SCENE := preload("res://client/game.tscn")
const CLIENT_SETTINGS := "res://data/client.json"

# Set before the scene enters the tree to change them (tests do).
var args: PackedStringArray = LaunchArgs.from_command_line()
var player_file: String = PlayerId.FILE
var settings_file: String = UserSettings.FILE
var link_parent: Node = null # where the network link goes; null is the tree's root

var connect_timeout := 0.0
var player := ""
var client: NetClient = null
var menu: MainMenu = null
var user: UserSettings = null

var _link: NetLink = null
var _config: Dictionary = {}


func _ready() -> void:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(CLIENT_SETTINGS))
	var settings := ClientSettings.load_file(CLIENT_SETTINGS)
	if not parsed is Dictionary or settings == null:
		push_error("app: %s is missing or broken" % CLIENT_SETTINGS)
		return
	_config = parsed
	connect_timeout = settings.number("connect_timeout")
	player = PlayerId.resolve(args, player_file)
	user = UserSettings.load_file(settings_file, _config["user_defaults"])
	user.apply_all()
	var launch := LaunchArgs.parse(args)
	var address: String = launch.get("address", user.last_address if user.last_address != "" else settings.text("default_address"))
	var port := str(launch.get("port", int(user.last_port) if user.last_port != "" else ClientSettings.default_port()))
	menu = MainMenu.new()
	menu.name = "Menu"
	add_child(menu)
	var host: Dictionary = _config["menu"]["host_defaults"].duplicate()
	host["Port"] = str(ClientSettings.default_port())
	menu.show_state({
		"panel": "",
		"values": host,
		"join": {"Address": address, "Port": port},
		"last": user.last(),
		"settings": user.values.duplicate(),
		"address": "",
		"message": "",
	})
	menu.playing = not UserSettings.reduced
	menu.picked.connect(_on_picked)
	menu.joined.connect(_join)
	menu.setting_changed.connect(_on_setting_changed)
	get_viewport().size_changed.connect(_centre_menu)
	_centre_menu()
	if launch["connect"] or launch.has("address"):
		_join.call_deferred(menu.state["join"])


func _process(delta: float) -> void:
	if client != null:
		client.process(delta)


func _exit_tree() -> void:
	_drop_client()


func is_connecting() -> bool:
	return client != null and client.is_connecting()


func _centre_menu() -> void:
	if menu != null:
		menu.position = ((get_viewport_rect().size - menu.size) / 2.0).max(Vector2.ZERO)


func _on_picked(what: String) -> void:
	if what == "quit":
		get_tree().quit()


func _on_setting_changed(name: String, value: Variant) -> void:
	user.set_value(name, value)
	if name == "Motion":
		menu.playing = value != "Reduced"


func _say(message: String, panel := "join") -> void:
	menu.state["message"] = message
	menu.state["panel"] = panel
	if str(menu.state.get("focus", "")) == "":
		menu.state["focus"] = "Address"
	menu.queue_redraw()


func _join(fields: Dictionary) -> void:
	if client != null:
		return
	var address := str(fields.get("Address", "")).strip_edges()
	var port_text := str(fields.get("Port", ""))
	var port := int(port_text)
	if address == "":
		_say("Type the address the host's game shows.")
		return
	if port < 1 or port > 65535:
		_say("The port is a number from 1 to 65535.")
		return
	var parent := link_parent if link_parent != null else get_tree().root
	_link = NetLink.new()
	_link.name = "Link"
	parent.add_child(_link)
	client = NetClient.new(_link, parent.multiplayer, player, connect_timeout)
	client.welcomed.connect(_on_welcomed.bind(address, port_text))
	client.refused.connect(func(reason: String) -> void: _back_to_menu("The server refused: %s" % reason))
	client.failed.connect(func(reason: String) -> void: _back_to_menu(_sentence(reason)))
	client.lost.connect(func(reason: String) -> void: _back_to_menu(_sentence(reason)))
	var err := client.connect_to(address, port)
	if err != OK:
		_back_to_menu("Could not connect to %s:%d (%s)." % [address, port, error_string(err)])
		return
	_say("Connecting to %s:%d..." % [address, port])


func _on_welcomed(address: String, port_text: String) -> void:
	user.remember(address, port_text)
	menu.state["last"] = user.last()
	menu.state["message"] = ""
	var game := GAME_SCENE.instantiate()
	game.name = "Game"
	game.setup(client)
	add_child(game)
	menu.visible = false
	menu.process_mode = Node.PROCESS_MODE_DISABLED


func _back_to_menu(message: String) -> void:
	var game := get_node_or_null("Game")
	if game != null:
		remove_child(game)
		game.queue_free()
	_drop_client()
	menu.visible = true
	menu.process_mode = Node.PROCESS_MODE_INHERIT
	_say(message)


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
