extends GutTest
# Tests the shop window: client/screens/shop_window.gd and shop_layout.gd (D64, D143 to D145).

const CLIENT_DATA := "res://data/client.json"
const SHOT := preload("res://client/screens/shop_shot.gd")


func _paths() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(CLIENT_DATA))["screens"]


func _layout() -> ShopLayout:
	return ShopLayout.load_file(_paths()["shop_layout"])


func _window(state: Dictionary) -> ShopWindow:
	var window := ShopWindow.new()
	window.animate = false
	add_child_autofree(window)
	window.show_state(state)
	return window


func _click(window: ShopWindow, at: Vector2, button := MOUSE_BUTTON_LEFT) -> void:
	var e := InputEventMouseButton.new()
	e.button_index = button
	e.pressed = true
	e.position = at
	window._gui_input(e)


func _key(window: ShopWindow, keycode: Key) -> void:
	var e := InputEventKey.new()
	e.keycode = keycode
	e.pressed = true
	window._unhandled_key_input(e)


func _centre(window: ShopWindow, group: String, i: int) -> Vector2:
	return window.layout.slot_rect(group, i).get_center()


func _open_menu(window: ShopWindow, group: String, i: int) -> void:
	_click(window, _centre(window, group, i), MOUSE_BUTTON_RIGHT)


func _line(window: ShopWindow, i: int) -> Vector2:
	return window.menu_line_rect(i).get_center()


func test_it_draws_the_keepers_face_and_line_the_items_with_counts_and_your_pack() -> void:
	var layout := _layout()
	var paths := _paths()
	assert_eq(layout.files().size(), 20, "the 20 pieces shop_window.mjs writes")
	for f: String in layout.files():
		assert_true(ResourceLoader.exists(paths["shop_pieces"].path_join(f)), f)
	for name: String in layout.font_names():
		assert_true(ResourceLoader.exists(paths["fonts"].path_join(name + ".woff")), name)
	var window := _window(SHOT.sample())
	assert_not_null(window.state["face"], "the keeper's face")
	assert_eq(window.says_text(), "\"Good iron, fair prices. Mostly fair.\"")
	assert_eq(window.shop_items().size(), 30)
	assert_eq(window.shop_items()[7]["left"], 1, "the platebody's count")
	assert_eq(window.shop_items()[7]["price"], 120)
	assert_eq(window.pack_items().size(), 20)
	assert_eq(window.pack_text(), "9 / 20")
	var shape := ShopWindow.cut_face(SHOT.keeper_figure(), layout.face_spec())
	var r: int = layout.face_spec()["radius"]
	assert_eq(shape.get_size(), Vector2i(r * 2, r * 2))
	assert_eq(shape.get_pixel(0, 0).a, 0.0, "cut to a circle")
	assert_gt(shape.get_pixel(r, r).a, 0.0, "the face in the middle")
	await get_tree().process_frame
	assert_eq(window.size, Vector2(1152, 648), "the window's pixels")


func test_the_shot_page_lays_the_draft_out_at_1x() -> void:
	var window := _window(SHOT.sample())
	assert_eq(window.pointed_group, "shop")
	assert_eq(window.pointed(), 7)
	assert_eq(window.state["fresh"], 7)
	assert_eq(window.state["pop"], "-90")
	assert_eq(window.layout.size(), Vector2(1152, 648))
	assert_eq(window.layout.slot_at("shop", 11) - window.layout.slot_at("shop", 0), Vector2(54, 80))


func test_a_click_on_a_shop_item_buys_one_and_changes_nothing_on_screen() -> void:
	var window := _window(SHOT.sample())
	var before := window.state.duplicate(true)
	watch_signals(window)
	_click(window, _centre(window, "shop", 2))
	assert_signal_emitted_with_parameters(window, "bought", ["Axe Iron", 1])
	assert_eq(window.state, before, "the server's new state shows the buy")
	assert_eq(window.shop_items()[2]["left"], 3, "the count did not tick")
	_click(window, _centre(window, "shop", 29))
	assert_signal_emit_count(window, "bought", 1, "an empty slot buys nothing")
	_click(window, _centre(window, "pack", 2))
	assert_signal_not_emitted(window, "sold", "a click on your pack only shows its value")


func test_a_right_click_opens_the_menu_with_value_and_buy_or_sell() -> void:
	var window := _window(SHOT.sample())
	_open_menu(window, "shop", 2)
	assert_eq(window.menu_lines(), ["Value", "Buy 1", "Buy 5", "Buy 10", "Buy X"])
	_open_menu(window, "pack", 2)
	assert_eq(window.menu_lines(), ["Value", "Sell 1", "Sell 5", "Sell 10", "Sell X"])
	_open_menu(window, "pack", 0)
	assert_eq(window.menu_lines(), ["Value"], "coins are not sold")
	_open_menu(window, "shop", 29)
	assert_eq(window.menu_lines(), [], "nothing in an empty slot")


func test_a_menu_line_buys_or_sells_that_many_and_closes_the_menu() -> void:
	var window := _window(SHOT.sample())
	watch_signals(window)
	_open_menu(window, "shop", 5)
	_click(window, _line(window, 2))
	assert_signal_emitted_with_parameters(window, "bought", ["Short Bow", 5])
	assert_eq(window.menu_lines(), [], "closed")
	_open_menu(window, "pack", 2)
	_click(window, _line(window, 3))
	assert_signal_emitted_with_parameters(window, "sold", ["Short Bow", 10])
	_open_menu(window, "shop", 5)
	_click(window, _line(window, 0))
	assert_signal_emit_count(window, "bought", 1, "Value only shows the price")


func test_x_asks_how_many_and_the_typed_number_is_sent() -> void:
	var window := _window(SHOT.sample())
	watch_signals(window)
	_open_menu(window, "shop", 7)
	_click(window, _line(window, 4))
	assert_true(window.is_asking())
	_key(window, KEY_1)
	_key(window, KEY_2)
	assert_eq(window.typed, "12")
	_key(window, KEY_ENTER)
	assert_signal_emitted_with_parameters(window, "bought", ["Platebody Iron", 12])
	assert_false(window.is_asking())
	_open_menu(window, "pack", 3)
	_click(window, _line(window, 4))
	_key(window, KEY_7)
	_key(window, KEY_ENTER)
	assert_signal_emitted_with_parameters(window, "sold", ["Leather Tunic", 7])
	_open_menu(window, "pack", 3)
	_click(window, _line(window, 4))
	_key(window, KEY_ENTER)
	assert_signal_emit_count(window, "sold", 1, "no number, nothing sent")


func test_a_refusal_says_why() -> void:
	var state := SHOT.sample()
	var window := _window(state)
	assert_eq(window.refusal_text(), "")
	state["refusal"] = "short"
	window.show_state(state)
	assert_eq(window.refusal_text(), "You are short of coins")
	state["refusal"] = "not_buying"
	window.show_state(state)
	assert_eq(window.refusal_text(), "The shop is not buying that now")


func test_an_item_that_ran_out_is_greyed_and_a_trade_is_felt() -> void:
	var window := _window(SHOT.sample())
	assert_true(window.is_out(4), "the spear: 0 left")
	assert_true(window.is_out(6), "the steel helmet")
	assert_false(window.is_out(7))
	assert_false(window.is_out(29), "an empty slot is not an item that ran out")
	assert_eq(window.new_slot(), 7, "Slot New on the helmet just got")
	assert_eq(window.pop_amount(), "-90", "Coin Pop with the amount")
	var layout := window.layout
	assert_eq(layout.overlay("out")["file"], "Slot Out.png")
	assert_eq(layout.overlay("new")["file"], "Slot New.png")
	assert_gt(layout.new_fade(), 0.0, "the flash fades over a setting")


func test_the_flash_and_the_coins_fade_with_time() -> void:
	var window := ShopWindow.new()
	add_child_autofree(window)
	window.show_state(SHOT.sample())
	assert_eq(window.flash_alpha(), 1.0)
	window.advance(window.layout.new_fade() / 2.0)
	assert_almost_eq(window.flash_alpha(), 0.5, 0.01)
	window.advance(window.layout.new_fade())
	assert_eq(window.flash_alpha(), 0.0)
	assert_eq(window.pop_alpha(), 0.0, "the coins are gone after their time")


func test_close_by_click_or_esc() -> void:
	var window := _window(SHOT.sample())
	watch_signals(window)
	_click(window, Vector2(574, 366))
	assert_signal_emit_count(window, "closed", 1)
	_key(window, KEY_ESCAPE)
	assert_signal_emit_count(window, "closed", 2, "Esc")
	_open_menu(window, "shop", 2)
	_key(window, KEY_ESCAPE)
	assert_signal_emit_count(window, "closed", 2, "Esc shuts an open menu first")
	assert_eq(window.menu_lines(), [])


func test_the_mouse_is_caught_only_over_the_window_parts() -> void:
	var window := _window(SHOT.sample())
	assert_false(window._has_point(Vector2(100, 100)), "the game keeps the left of the screen")
	assert_true(window._has_point(_centre(window, "shop", 0)), "the shop's plate")
	assert_true(window._has_point(_centre(window, "pack", 15)), "the satchel")
