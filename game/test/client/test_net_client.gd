extends GutTest
# Tests client/net_client.gd and the connect screen against a real server in this
# process, over loopback (CLI-001).

const WAIT := 5.0
const SCREEN := "res://client/connect/connect.tscn"

var _settings: SimSettings
var _stand_in: SimStandInWorld
var _view: ServerView
var _server_branch: NetRig.Branch
var _server: NetServer
var _port: int
var _clients: Array[NetRig.Branch] = []
var _holders: Array[Node] = []
var _id_files: Array[String] = []


func before_each() -> void:
	_settings = SimSettings.load_file("res://data/settings.json")
	var looks := SimLooks.load_file("res://data/looks.json")
	_stand_in = SimStandInWorld.build(1, _settings, looks)
	_view = ServerView.new(_stand_in.sim, _settings)
	_server_branch = NetRig.branch(self, "Server")
	_server = NetServer.new(_stand_in.sim, _view, looks, _server_branch.link, _server_branch.api, _stand_in.waking_spot)
	_server.bind_ip = "127.0.0.1"
	_port = NetRig.free_port(26700 + randi() % 2000)
	assert_eq(_server.listen(_port), OK)


func after_each() -> void:
	for b in _clients:
		b.api.multiplayer_peer = null
	_clients.clear()
	for holder in _holders:
		holder.multiplayer.multiplayer_peer = null
	_holders.clear()
	_server_branch.api.multiplayer_peer = null
	for path in _id_files:
		DirAccess.remove_absolute(path)
	_id_files.clear()


func _tick(count := 1) -> void:
	for i in count:
		_stand_in.sim.step()
		_server.after_tick()


# A client on its own branch, with what it reported recorded.
func _client(player: String, timeout := 5.0) -> Dictionary:
	var b := NetRig.branch(self, "Client%d" % _clients.size())
	_clients.append(b)
	var client := NetClient.new(b.link, b.api, player, timeout)
	var seen := {"welcomed": [], "refused": [], "failed": [], "lost": []}
	client.welcomed.connect(func() -> void: seen["welcomed"].append(true))
	client.refused.connect(func(reason: String) -> void: seen["refused"].append(reason))
	client.failed.connect(func(reason: String) -> void: seen["failed"].append(reason))
	client.lost.connect(func(reason: String) -> void: seen["lost"].append(reason))
	return {"client": client, "branch": b, "seen": seen}


func _welcomed_client(player: String) -> Dictionary:
	var c := _client(player)
	assert_eq(c["client"].connect_to("127.0.0.1", _port), OK)
	await wait_until(func() -> bool: return c["client"].is_playing(), WAIT, "welcomed")
	return c


# A connect screen with its own multiplayer branch, a temp player id file and no
# launch arguments, unless given.
func _screen(args := PackedStringArray()) -> ConnectScreen:
	var holder := Node.new()
	holder.name = "ScreenRoot%d" % _holders.size()
	add_child(holder)
	get_tree().set_multiplayer(MultiplayerAPI.create_default_interface(), holder.get_path())
	_holders.append(holder)
	var screen: ConnectScreen = load(SCREEN).instantiate()
	screen.args = args
	screen.link_parent = holder
	screen.player_file = "user://test_player_id_%d_%d.txt" % [randi(), _holders.size()]
	_id_files.append(screen.player_file)
	add_child_autofree(screen)
	return screen


func _press_connect(screen: ConnectScreen, port: int) -> void:
	screen.get_node("%Address").text = "127.0.0.1"
	screen.get_node("%Port").text = str(port)
	screen.get_node("%Connect").pressed.emit()


func test_given_a_running_server_when_the_client_connects_then_it_sends_a_hello_with_its_player_id_and_on_the_welcome_holds_the_land_and_its_own_character_id() -> void:
	var c := await _welcomed_client("ann")
	var client: NetClient = c["client"]
	var world := _stand_in.sim.world
	assert_eq(c["seen"]["welcomed"].size(), 1)
	assert_not_null(world.get_character(client.state.you), "its own character stands in the world")
	assert_eq(client.state.land["width"], world.width)
	assert_eq(client.state.land["ground"].size(), world.width * world.height)
	# The id was sent: the same player id is a second client of the same player.
	var again := _client("ann")
	assert_eq(again["client"].connect_to("127.0.0.1", _port), OK)
	await wait_until(func() -> bool: return again["seen"]["refused"].size() == 1, WAIT, "same id refused")
	assert_eq(again["seen"]["refused"][0], "player already connected")


func test_given_a_refused_hello_when_the_refusal_arrives_then_the_client_reports_its_reason_and_is_not_connected() -> void:
	await _welcomed_client("ann")
	var second := _client("ann")
	var client: NetClient = second["client"]
	assert_eq(client.connect_to("127.0.0.1", _port), OK)
	await wait_until(func() -> bool: return second["seen"]["refused"].size() == 1, WAIT, "refusal arrives")
	assert_ne(second["seen"]["refused"][0], "")
	assert_false(client.is_playing())
	assert_false(client.is_connecting())
	assert_eq(second["seen"]["welcomed"].size(), 0)


func test_given_no_server_at_that_address_when_the_connect_timeout_is_up_then_the_client_reports_it_could_not_connect() -> void:
	var dead_port := NetRig.free_port(28800 + randi() % 1000)
	var c := _client("ann", 0.5)
	var client: NetClient = c["client"]
	assert_eq(client.connect_to("127.0.0.1", dead_port), OK)
	assert_true(client.is_connecting())
	client.process(0.4)
	assert_eq(c["seen"]["failed"].size(), 0, "not yet")
	client.process(0.2)
	assert_eq(c["seen"]["failed"].size(), 1)
	assert_string_contains(str(c["seen"]["failed"][0]), "could not connect")
	assert_false(client.is_connecting())
	# It can be started again.
	assert_eq(client.connect_to("127.0.0.1", dead_port), OK)
	assert_true(client.is_connecting())


func test_given_views_arriving_when_the_client_is_playing_then_its_state_holds_the_newest_view_and_the_one_before() -> void:
	var c := await _welcomed_client("ann")
	var client: NetClient = c["client"]
	_tick()
	await wait_until(func() -> bool: return client.state.tick == _stand_in.sim.tick, WAIT, "first view")
	var first_tick := client.state.tick
	_tick()
	await wait_until(func() -> bool: return client.state.tick == _stand_in.sim.tick, WAIT, "second view")
	assert_eq(client.state.tick, first_tick + 1)
	assert_true(client.state.is_in_sight(client.state.you))
	assert_true(client.state.has_before(client.state.you))


func test_given_a_server_that_stops_when_the_client_notices_then_it_reports_the_connection_lost() -> void:
	var c := await _welcomed_client("ann")
	var client: NetClient = c["client"]
	(_server_branch.api.multiplayer_peer as ENetMultiplayerPeer).close()
	await wait_until(func() -> bool: return c["seen"]["lost"].size() == 1, WAIT, "loss noticed")
	assert_false(client.is_playing())
	assert_ne(c["seen"]["lost"][0], "")


func test_given_a_running_server_when_connect_is_pressed_then_the_screen_holds_the_welcome_and_shows_the_game_scene() -> void:
	var screen := _screen()
	_press_connect(screen, _port)
	await wait_until(func() -> bool: return screen.get_node_or_null("Game") != null, WAIT, "game scene shown")
	assert_not_null(screen.get_node_or_null("Game"))
	assert_false(screen.get_node("%Form").visible, "the connect form is hidden")
	assert_not_null(_stand_in.sim.world.get_character(screen.client.state.you))
	assert_eq(screen.client.state.land["width"], _stand_in.sim.world.width)


func test_given_no_server_at_that_address_when_the_screens_connect_timeout_is_up_then_it_says_it_could_not_connect_and_the_button_works_again() -> void:
	var screen := _screen()
	screen.connect_timeout = 0.3
	_press_connect(screen, NetRig.free_port(29900 + randi() % 1000))
	assert_true(screen.get_node("%Connect").disabled, "no second click while connecting")
	await wait_until(func() -> bool: return not screen.get_node("%Connect").disabled, WAIT, "button works again")
	assert_string_contains(screen.get_node("%Message").text.to_lower(), "could not connect")
	assert_null(screen.get_node_or_null("Game"))


func test_given_a_refused_hello_when_the_refusal_arrives_then_the_screen_shows_its_reason() -> void:
	var first := _screen(PackedStringArray(["--player=ann"]))
	_press_connect(first, _port)
	await wait_until(func() -> bool: return first.get_node_or_null("Game") != null, WAIT, "first in")
	var second := _screen(PackedStringArray(["--player=ann"]))
	_press_connect(second, _port)
	await wait_until(func() -> bool: return second.get_node("%Message").text.contains("player already connected"), WAIT, "reason shown")
	assert_false(second.get_node("%Connect").disabled)
	assert_null(second.get_node_or_null("Game"))


func test_given_a_server_that_stops_when_the_client_notices_then_it_is_back_on_the_connect_screen_with_a_message() -> void:
	var screen := _screen()
	_press_connect(screen, _port)
	await wait_until(func() -> bool: return screen.get_node_or_null("Game") != null, WAIT, "game scene shown")
	(_server_branch.api.multiplayer_peer as ENetMultiplayerPeer).close()
	await wait_until(func() -> bool: return screen.get_node("%Form").visible, WAIT, "back on the connect screen")
	assert_ne(screen.get_node("%Message").text, "")
	assert_false(screen.get_node("%Connect").disabled)
	await wait_frames(2)
	assert_null(screen.get_node_or_null("Game"))


# --- the main menu as the game's first scene (app.gd, CLI-009)

func _app(args := PackedStringArray()) -> App:
	var holder := Node.new()
	holder.name = "AppRoot%d" % _holders.size()
	add_child(holder)
	get_tree().set_multiplayer(MultiplayerAPI.create_default_interface(), holder.get_path())
	_holders.append(holder)
	var app: App = load("res://client/connect/app.tscn").instantiate()
	app.args = args
	app.link_parent = holder
	app.player_file = "user://test_player_id_%d_%d.txt" % [randi(), _holders.size()]
	app.settings_file = "user://test_app_settings_%d.json" % _holders.size()
	_id_files.append(app.player_file)
	_id_files.append(app.settings_file)
	holder.add_child(app)
	return app


func test_given_the_game_started_with_no_arguments_when_it_opens_then_it_shows_the_main_menu_and_does_not_connect() -> void:
	var app := _app()
	await wait_frames(3)
	assert_not_null(app.menu)
	assert_true(app.menu.visible)
	assert_null(app.client)
	assert_null(app.get_node_or_null("Game"))
	assert_eq(ProjectSettings.get_setting("application/run/main_scene"), "res://client/connect/app.tscn")


func test_given_join_game_when_it_is_clicked_then_its_panel_opens_with_the_address_and_port_filled_in() -> void:
	var app := _app()
	var layout := MenuLayout.load_file("res://client/art/made/ui/menu/menu.json")
	var e := InputEventMouseButton.new()
	e.button_index = MOUSE_BUTTON_LEFT
	e.pressed = true
	e.position = layout.button_rect(0).get_center()
	app.menu._gui_input(e)
	assert_eq(app.menu.state["panel"], "join")
	assert_eq(app.menu.state["join"]["Address"], "127.0.0.1")
	assert_eq(app.menu.state["join"]["Port"], str(ClientSettings.default_port()))


func test_given_join_with_a_server_running_when_it_is_clicked_then_the_client_connects_the_game_scene_shows_and_the_address_is_remembered() -> void:
	var app := _app()
	app.menu.state["join"] = {"Address": "127.0.0.1", "Port": str(_port)}
	app.menu.joined.emit(app.menu.state["join"])
	await wait_until(func() -> bool: return app.get_node_or_null("Game") != null, WAIT, "game scene shown")
	assert_false(app.menu.visible)
	assert_not_null(_stand_in.sim.world.get_character(app.client.state.you))
	assert_eq(app.user.last(), "127.0.0.1 : %d" % _port)
	assert_eq(UserSettings.load_file(app.settings_file, app.user.values).last(), "127.0.0.1 : %d" % _port)


func test_given_join_with_a_wrong_address_when_the_timeout_is_up_then_the_panel_says_so_and_nothing_crashes() -> void:
	var app := _app()
	app.connect_timeout = 0.3
	app.menu.joined.emit({"Address": "127.0.0.1", "Port": str(NetRig.free_port(29900 + randi() % 1000))})
	assert_true(app.is_connecting())
	await wait_until(func() -> bool: return app.client == null, WAIT, "back to the panel")
	assert_eq(app.menu.state["panel"], "join")
	assert_string_contains(app.menu.state["message"].to_lower(), "could not connect")
	assert_null(app.get_node_or_null("Game"))
	app.menu.joined.emit({"Address": "", "Port": "1"})
	assert_string_contains(app.menu.state["message"], "address")
	app.menu.joined.emit({"Address": "x", "Port": "99999"})
	assert_string_contains(app.menu.state["message"], "port")


func test_given_an_address_argument_when_the_game_opens_then_it_connects_straight_away() -> void:
	var app := _app(PackedStringArray(["--address=127.0.0.1", "--port=%d" % _port, "--connect"]))
	await wait_until(func() -> bool: return app.get_node_or_null("Game") != null, WAIT, "game scene shown")
	assert_false(app.menu.visible)


func test_given_a_server_that_stops_when_the_client_notices_then_the_menu_is_back_on_the_join_panel_with_a_message() -> void:
	var app := _app(PackedStringArray(["--address=127.0.0.1", "--port=%d" % _port]))
	await wait_until(func() -> bool: return app.get_node_or_null("Game") != null, WAIT, "game scene shown")
	(_server_branch.api.multiplayer_peer as ENetMultiplayerPeer).close()
	await wait_until(func() -> bool: return app.menu.visible, WAIT, "menu back")
	assert_eq(app.menu.state["panel"], "join")
	assert_ne(app.menu.state["message"], "")
