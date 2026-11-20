extends GutTest
# Tests the body's loot window: client/screens/body_loot.gd and body_loot_layout.gd (D128, D248).

const CLIENT_DATA := "res://data/client.json"
const SHOT := preload("res://client/screens/body_loot_shot.gd")


func _paths() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(CLIENT_DATA))["screens"]


func _layout() -> BodyLootLayout:
	return BodyLootLayout.load_body(_paths()["body_layout"])


func _window(state: Dictionary) -> BodyLoot:
	var window := BodyLoot.new()
	add_child_autofree(window)
	window.show_state(state)
	return window


func _click(window: BodyLoot, at: Vector2) -> void:
	var e := InputEventMouseButton.new()
	e.button_index = MOUSE_BUTTON_LEFT
	e.pressed = true
	e.position = at
	window._gui_input(e)


func _key(window: BodyLoot, keycode: Key) -> void:
	var e := InputEventKey.new()
	e.keycode = keycode
	e.pressed = true
	window._unhandled_key_input(e)


func test_it_draws_the_title_free_line_worn_carried_take_all_and_your_pack() -> void:
	var layout := _layout()
	var paths := _paths()
	assert_eq(layout.files().size(), 15, "the 15 pieces body_loot.mjs writes")
	for f: String in layout.files():
		assert_true(ResourceLoader.exists(paths["body_pieces"].path_join(f)), f)
	assert_eq(layout.worn_names(), ["Main hand", "Head", "Chest", "Hands", "Back", "Belt", "Legs", "Feet", "Off hand"], "the character screen's gear order")
	var window := _window(SHOT.sample())
	assert_eq(window.layout.text("name")["text"], "Loot")
	assert_eq(window.layout.text("free")["text"], "Free to take")
	assert_eq(window.worn_items().size(), 9)
	assert_eq(window.carried_items().size(), 20)
	assert_eq(window.pack_text(), "8 / 20")
	assert_eq(window.layout.text("take_all")["text"], "Take all")
	assert_eq(window.layout.order().size(), 14)
	assert_eq(window.title_face(), "mid")


func test_the_shot_page_is_the_draft() -> void:
	var state := SHOT.sample()
	assert_eq(state["pointed"], 2, "the draft points at the chest plate")
	assert_eq(state["worn"][2]["name"], "Platebody")
	assert_null(state["worn"][8], "the off hand is empty and shows its name")
	assert_eq(state["carried"]["items"][10]["count"], 9)
	assert_eq(state["coins"], 37)


func test_the_mouse_over_a_slot_lights_it_and_shows_its_note() -> void:
	var window := _window(SHOT.sample())
	var e := InputEventMouseMotion.new()
	e.position = window.body.body_rect(1).get_center()
	window._gui_input(e)
	assert_eq(window.pointed(), 1, "the helmet")
	e.position = window.body.body_rect(9 + 2).get_center()
	window._gui_input(e)
	assert_eq(window.pointed(), 11, "the mace")
	e.position = window.body.body_rect(8).get_center()
	window._gui_input(e)
	assert_eq(window.pointed_slot, 8)
	assert_eq(window.pointed(), -1, "an empty slot is not lit and has no note")
	assert_eq(window.body.note(11)["at"].y - window.body.note(1)["at"].y, window.body.body_at(11).y - window.body.body_at(1).y, "the note goes down with the slot")


func test_a_click_on_a_worn_or_carried_slot_emits_took_and_changes_nothing() -> void:
	var state := SHOT.sample()
	var window := _window(state)
	watch_signals(window)
	_click(window, window.body.body_rect(3).get_center())
	assert_signal_emitted_with_parameters(window, "took", [3])
	_click(window, window.body.body_rect(9 + 1).get_center())
	assert_signal_emitted_with_parameters(window, "took", [10])
	_click(window, window.body.body_rect(8).get_center())
	assert_signal_emit_count(window, "took", 2, "an empty slot sends nothing")
	assert_eq(window.worn_items()[3]["name"], state["worn"][3]["name"], "the item stays until a new state is shown")
	_click(window, window.layout.slot_rect("pack", 0).get_center())
	assert_signal_emit_count(window, "took", 2, "a pack slot is not the body's")


func test_space_takes_all_and_esc_closes() -> void:
	var window := _window(SHOT.sample())
	watch_signals(window)
	_key(window, KEY_SPACE)
	assert_signal_emit_count(window, "took_all", 1)
	_click(window, window.layout.take_all_rect().get_center())
	assert_signal_emit_count(window, "took_all", 2, "the button too")
	var e := InputEventAction.new()
	e.action = "ui_cancel"
	e.pressed = true
	window._unhandled_key_input(e)
	assert_signal_emit_count(window, "closed", 1, "Esc")


func test_the_window_does_not_catch_the_mouse_outside_it() -> void:
	var window := _window(SHOT.sample())
	assert_false(window._has_point(Vector2(100, 100)), "the game keeps the left of the screen")
	assert_false(window._has_point(Vector2(1148, 4)), "and the corners")
	assert_true(window._has_point(window.body.body_rect(0).get_center()), "the panel")
	assert_true(window._has_point(window.layout.slot_rect("pack", 15).get_center()), "the satchel")
	assert_true(window._has_point(window.layout.take_all_rect().get_center()))
