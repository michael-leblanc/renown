extends GutTest
# Tests the main menu: client/screens/main_menu.gd, menu_layout.gd and main_menu_sparks.gd (D250).

const CLIENT_DATA := "res://data/client.json"
const SHOT := preload("res://client/screens/main_menu_shot.gd")


func _paths() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(CLIENT_DATA))["screens"]


func _layout() -> MenuLayout:
	return MenuLayout.load_file(_paths()["menu_layout"])


func _menu(state: Dictionary) -> MainMenu:
	var menu := MainMenu.new()
	add_child_autofree(menu)
	menu.show_state(state)
	return menu


func _click(menu: MainMenu, at: Vector2) -> void:
	var e := InputEventMouseButton.new()
	e.button_index = MOUSE_BUTTON_LEFT
	e.pressed = true
	e.position = at
	menu._gui_input(e)


func test_every_piece_and_font_the_layout_names_exists() -> void:
	var layout := _layout()
	var paths := _paths()
	assert_eq(layout.files().size(), 17, "the 17 pieces main_menu.mjs writes")
	for f: String in layout.files():
		assert_true(ResourceLoader.exists(paths["menu_pieces"].path_join(f)), f)
	for name: String in layout.font_names():
		assert_true(ResourceLoader.exists(paths["fonts"].path_join(name + ".woff")), name)


func test_the_menu_fills_the_window_over_its_moving_painting() -> void:
	var menu := _menu(SHOT.sample())
	assert_eq(menu.size, Vector2(1152, 648))
	assert_eq(menu.mouse_filter, Control.MOUSE_FILTER_STOP)
	assert_not_null(menu.scene_node(), "the painting")
	assert_true(menu.scene_node().material is ShaderMaterial)
	assert_not_null(menu.sparks_node(), "the stars and the dust")
	assert_eq(_layout().loop_seconds(), 5.0)


func test_the_painting_moves_unless_held() -> void:
	var menu := _menu({})
	menu._process(1.0)
	assert_almost_eq(menu.time(), 0.2, 0.0001, "a fifth of a 5 second loop")
	menu._process(4.5)
	assert_almost_eq(menu.time(), 0.1, 0.0001, "it comes round")
	menu.hold(0.37)
	menu._process(1.0)
	assert_eq(menu.time(), 0.37)
	assert_eq((menu.scene_node().material as ShaderMaterial).get_shader_parameter("t"), 0.37)
	assert_eq(menu.sparks_node().t, 0.37)


func test_buttons_stack_down_and_the_pointer_finds_them() -> void:
	var layout := _layout()
	assert_eq(layout.words(), ["Join game", "Host game", "Settings", "Quit"])
	assert_eq(layout.button_rect(1).position - layout.button_rect(0).position, Vector2(0, 62))
	assert_eq(layout.button_at(layout.button_rect(2).get_center()), 2)
	assert_eq(layout.button_at(Vector2(600, 40)), -1)
	assert_eq(layout.button_piece(3, true)["file"], "Button On.png")


func test_the_pointed_button_is_lit_and_host_game_while_its_panel_is_open() -> void:
	var menu := _menu({})
	var move := InputEventMouseMotion.new()
	move.position = _layout().button_rect(0).get_center()
	menu._gui_input(move)
	assert_eq(menu.pointed, 0)
	assert_true(menu.is_lit(0))
	assert_false(menu.is_lit(1))
	menu.show_state(SHOT.sample())
	assert_true(menu.is_lit(1), "Host game, its panel open")


func test_clicks_send_quit_or_open_the_host_panel() -> void:
	var layout := _layout()
	var menu := _menu({"values": {"World": "Home"}})
	watch_signals(menu)
	_click(menu, layout.button_rect(3).get_center())
	assert_signal_emitted_with_parameters(menu, "picked", ["quit"])
	assert_false(menu.panel_open())
	_click(menu, layout.button_rect(1).get_center())
	assert_true(menu.panel_open(), "Host game opens what hosting asks")
	assert_signal_emit_count(menu, "picked", 1, "and sends nothing")
	_click(menu, layout.host_rect().get_center())
	assert_signal_emitted_with_parameters(menu, "hosted", [{"World": "Home"}])


func test_join_game_opens_its_panel_and_join_sends_the_address() -> void:
	var layout := _layout()
	var menu := _menu({"join": {"Address": "10.0.0.2", "Port": "7777"}})
	watch_signals(menu)
	_click(menu, layout.button_rect(0).get_center())
	assert_eq(menu.state["panel"], "join")
	assert_true(menu.is_lit(0), "Join game, its panel open")
	assert_signal_not_emitted(menu, "picked")
	_click(menu, layout.other_button_rect("join").get_center())
	assert_signal_emitted_with_parameters(menu, "joined", [{"Address": "10.0.0.2", "Port": "7777"}])
	assert_signal_not_emitted(menu, "hosted")


func test_settings_opens_its_panel_and_done_closes_it() -> void:
	var layout := _layout()
	var menu := _menu({})
	_click(menu, layout.button_rect(2).get_center())
	assert_eq(menu.state["panel"], "settings")
	_click(menu, layout.other_button_rect("settings").get_center())
	assert_false(menu.panel_open())


func test_a_click_on_a_bar_sets_its_volume() -> void:
	var layout := _layout()
	var menu := _menu({"panel": "settings", "settings": {"Music": 0.6}})
	watch_signals(menu)
	var bar := layout.bar_rect(1)
	_click(menu, Vector2(bar.position.x + 2.0 + (bar.size.x - 4.0) * 0.25, bar.get_center().y))
	assert_signal_emitted_with_parameters(menu, "setting_changed", ["Music", 0.25])
	assert_eq(menu.state["settings"]["Music"], 0.25)
	assert_eq(layout.volume_at(1, bar.position.x - 10.0), 0.0, "short of the bar is silence")
	assert_eq(layout.volume_at(1, bar.end.x + 10.0), 1.0)


func test_a_click_on_a_choice_steps_it_back_or_on() -> void:
	var menu := _menu({"panel": "settings", "settings": {"Window": "Windowed"}})
	watch_signals(menu)
	var r := menu._choice_rect(0)
	_click(menu, Vector2(r.end.x - 4.0, r.get_center().y))
	assert_signal_emitted_with_parameters(menu, "setting_changed", ["Window", "Full screen"])
	_click(menu, Vector2(r.position.x + 4.0, r.get_center().y))
	assert_eq(menu.state["settings"]["Window"], "Windowed", "the left half steps back")
	_click(menu, Vector2(r.position.x + 4.0, r.get_center().y))
	assert_eq(menu.state["settings"]["Window"], "Full screen", "and comes round")
	var motion := menu._choice_rect(1)
	_click(menu, Vector2(motion.end.x - 4.0, motion.get_center().y))
	assert_eq(menu.state["settings"]["Motion"], "Reduced", "an unset choice starts at its first")


func test_the_fill_is_cut_where_the_draft_cuts_it() -> void:
	var layout := _layout()
	# main_menu.mjs keeps the fill's column i where fx + i + 0.5 < x + 2 + (w - 4) * volume,
	# fx the fill's corner one pixel left of the bar's (x), w = 132.
	assert_eq(layout.fill_columns(0, 0.0, 200), 3, "only the fill's left edge")
	assert_eq(layout.fill_columns(0, 0.5, 200), 67)
	assert_eq(layout.fill_columns(0, 1.0, 200), 131)
	assert_eq(layout.fill_columns(0, 1.0, 10), 10, "never wider than the piece")


func test_esc_closes_the_panel() -> void:
	var state := SHOT.sample()
	state["panel"] = "settings"
	var menu := _menu(state)
	var k := InputEventKey.new()
	k.keycode = KEY_ESCAPE
	k.pressed = true
	menu._unhandled_key_input(k)
	assert_false(menu.panel_open())


func test_the_host_button_does_nothing_while_the_panel_is_shut() -> void:
	var menu := _menu({})
	watch_signals(menu)
	_click(menu, _layout().host_rect().get_center())
	assert_signal_not_emitted(menu, "hosted")


func test_the_sparks_use_the_paintings_noise_and_doorway() -> void:
	var menu := _menu({})
	var sparks := menu.sparks_node()
	assert_almost_eq(sparks.vnoise(3.3, 7.1), 0.0947, 0.0002, "kit.mjs's vnoise(3.3, 7.1)")
	var door := _layout().door()
	assert_true(sparks.in_opening(float(door["sx"]), float(door["hy"]) + 40.0), "straight through the doorway")
	assert_false(sparks.in_opening(float(door["sx"]) + 300.0, float(door["hy"])), "beside it")
	assert_gt(_layout().stars().size(), 100)
	assert_eq(_layout().dust().size(), 64)


func _key(menu: MainMenu, keycode: Key, text := "") -> void:
	var k := InputEventKey.new()
	k.keycode = keycode
	k.unicode = text.unicode_at(0) if text != "" else 0
	k.pressed = true
	menu._unhandled_key_input(k)


func _type(menu: MainMenu, text: String) -> void:
	for c in text:
		_key(menu, KEY_NONE, c)


func test_typing_in_the_join_fields_changes_their_text_and_the_port_takes_only_digits() -> void:
	var layout := _layout()
	var menu := _menu({"join": {"Address": "", "Port": ""}})
	_click(menu, layout.button_rect(0).get_center())
	assert_eq(menu.state["focus"], "Address", "Join opens ready to type the address")
	_type(menu, "10.0.0.2")
	assert_eq(menu.state["join"]["Address"], "10.0.0.2")
	_key(menu, KEY_BACKSPACE)
	assert_eq(menu.state["join"]["Address"], "10.0.0.")
	_click(menu, menu.field_rect("join", 1).get_center())
	assert_eq(menu.state["focus"], "Port", "a click focuses a field")
	_type(menu, "7a7b7")
	assert_eq(menu.state["join"]["Port"], "777")
	_type(menu, "1234567")
	assert_eq(menu.state["join"]["Port"].length(), 5, "no more than the digit limit")
	_key(menu, KEY_TAB)
	assert_eq(menu.state["focus"], "Address", "Tab goes to the next field")


func test_typing_in_host_games_fields_changes_their_text() -> void:
	var layout := _layout()
	var menu := _menu({"values": {"World": "", "Players": ""}})
	_click(menu, layout.button_rect(1).get_center())
	_type(menu, "Home")
	assert_eq(menu.state["values"]["World"], "Home")
	_click(menu, menu.field_rect("host", 2).get_center())
	_type(menu, "x8")
	assert_eq(menu.state["values"]["Players"], "8", "Players takes digits only")


func test_enter_in_the_join_panel_sends_it() -> void:
	var menu := _menu({"panel": "join", "join": {"Address": "a", "Port": "1"}})
	watch_signals(menu)
	_key(menu, KEY_ENTER)
	assert_signal_emitted_with_parameters(menu, "joined", [{"Address": "a", "Port": "1"}])


func test_dragging_along_a_bar_follows_the_pointer_until_the_button_is_let_go() -> void:
	var layout := _layout()
	var menu := _menu({"panel": "settings", "settings": {"Master": 0.1}})
	var bar := layout.bar_rect(0)
	var y := bar.get_center().y
	_click(menu, Vector2(bar.position.x + 2.0 + (bar.size.x - 4.0) * 0.5, y))
	assert_eq(menu.state["settings"]["Master"], 0.5)
	var move := InputEventMouseMotion.new()
	move.position = Vector2(bar.position.x + 2.0 + (bar.size.x - 4.0) * 0.75, y + 300.0)
	menu._gui_input(move)
	assert_eq(menu.state["settings"]["Master"], 0.75, "the drag keeps going off the bar")
	var up := InputEventMouseButton.new()
	up.button_index = MOUSE_BUTTON_LEFT
	up.pressed = false
	menu._gui_input(up)
	move.position.x = bar.position.x + 2.0
	menu._gui_input(move)
	assert_eq(menu.state["settings"]["Master"], 0.75, "and stops on release")


func test_a_message_replaces_the_join_hint() -> void:
	var menu := _menu({"panel": "join", "message": "Could not connect."})
	await wait_frames(1)
	assert_eq(menu.state["message"], "Could not connect.")


func test_done_and_esc_close_every_panel() -> void:
	var layout := _layout()
	for i in [0, 1, 2]:
		var menu := _menu({})
		_click(menu, layout.button_rect(i).get_center())
		assert_true(menu.panel_open())
		_key(menu, KEY_ESCAPE)
		assert_false(menu.panel_open(), "Esc closes %s" % layout.says(i))
	var menu := _menu({})
	_click(menu, layout.button_rect(2).get_center())
	_click(menu, layout.other_button_rect("settings").get_center())
	assert_false(menu.panel_open(), "Done closes Settings")


func test_the_shot_page_reads_the_panel_argument() -> void:
	assert_eq(SHOT.panel_from(PackedStringArray(["--panel", "join"])), "join")
	assert_eq(SHOT.panel_from(PackedStringArray(["--panel", "settings"])), "settings")


# --- the user's settings (user_settings.gd)

const TEST_SETTINGS := "user://test_settings.json"


func _defaults() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(CLIENT_DATA))["user_defaults"]


func after_each() -> void:
	DirAccess.remove_absolute(TEST_SETTINGS)
	UserSettings.reduced = false
	for name: String in ["Music", "Effects"]:
		var i := AudioServer.get_bus_index(name)
		if i >= 0:
			AudioServer.remove_bus(i)
	AudioServer.set_bus_volume_db(0, 0.0)


func test_a_changed_setting_applies_at_once_to_the_audio_buses_and_to_reduced_motion() -> void:
	var user := UserSettings.load_file(TEST_SETTINGS, _defaults())
	assert_eq(user.values["Master"], 0.8, "the default, from client.json")
	user.set_value("Master", 0.5)
	assert_almost_eq(AudioServer.get_bus_volume_db(0), linear_to_db(0.5), 0.001)
	user.set_value("Music", 0.25)
	assert_almost_eq(AudioServer.get_bus_volume_db(AudioServer.get_bus_index("Music")), linear_to_db(0.25), 0.001)
	user.set_value("Effects", 0.0)
	assert_eq(AudioServer.get_bus_volume_db(AudioServer.get_bus_index("Effects")), UserSettings.SILENT_DB)
	assert_false(UserSettings.reduced)
	user.set_value("Motion", "Reduced")
	assert_true(UserSettings.reduced)
	var skills := SkillsScreen.new()
	assert_true(skills.reduced_motion, "the Skills screen starts reduced")
	skills.free()


func test_a_changed_setting_and_the_last_address_are_still_there_after_a_restart() -> void:
	var user := UserSettings.load_file(TEST_SETTINGS, _defaults())
	user.set_value("Music", 0.3)
	user.set_value("Window", "Full screen")
	user.remember("192.168.1.20", "7777")
	var again := UserSettings.load_file(TEST_SETTINGS, _defaults())
	assert_eq(again.values["Music"], 0.3)
	assert_eq(again.values["Window"], "Full screen")
	assert_eq(again.values["Master"], 0.8, "what was not changed keeps its default")
	assert_eq(again.last(), "192.168.1.20 : 7777")
	assert_eq(UserSettings.load_file("user://nothing_here.json", _defaults()).last(), "")
