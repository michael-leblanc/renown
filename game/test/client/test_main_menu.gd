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
	assert_eq(layout.files().size(), 13, "the 13 pieces main_menu.mjs writes")
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


func test_clicks_send_the_choice_or_open_the_host_panel() -> void:
	var layout := _layout()
	var menu := _menu({"values": {"World": "Home"}})
	watch_signals(menu)
	_click(menu, layout.button_rect(0).get_center())
	assert_signal_emitted_with_parameters(menu, "picked", ["join"])
	_click(menu, layout.button_rect(3).get_center())
	assert_signal_emitted_with_parameters(menu, "picked", ["quit"])
	assert_false(menu.panel_open())
	_click(menu, layout.button_rect(1).get_center())
	assert_true(menu.panel_open(), "Host game opens what hosting asks")
	assert_signal_emit_count(menu, "picked", 2, "and sends nothing")
	_click(menu, layout.host_rect().get_center())
	assert_signal_emitted_with_parameters(menu, "hosted", [{"World": "Home"}])


func test_esc_closes_the_panel() -> void:
	var menu := _menu(SHOT.sample())
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
