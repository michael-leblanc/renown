extends GutTest
# Tests the loot window: client/screens/loot_window.gd and loot_layout.gd (D142, D248).

const CLIENT_DATA := "res://data/client.json"
const SHOT := preload("res://client/screens/loot_shot.gd")


func _paths() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(CLIENT_DATA))["screens"]


func _layout() -> LootLayout:
	return LootLayout.load_file(_paths()["loot_layout"])


func _window(state: Dictionary) -> LootWindow:
	var window := LootWindow.new()
	add_child_autofree(window)
	window.show_state(state)
	return window


func _click(window: LootWindow, at: Vector2) -> void:
	var e := InputEventMouseButton.new()
	e.button_index = MOUSE_BUTTON_LEFT
	e.pressed = true
	e.position = at
	window._gui_input(e)


func _key(window: LootWindow, keycode: Key) -> void:
	var e := InputEventKey.new()
	e.keycode = keycode
	e.pressed = true
	window._unhandled_key_input(e)


func test_every_piece_and_font_the_layout_names_exists() -> void:
	var layout := _layout()
	var paths := _paths()
	assert_eq(layout.files().size(), 14, "the 14 pieces loot_window.mjs writes")
	for f: String in layout.files():
		assert_true(ResourceLoader.exists(paths["loot_pieces"].path_join(f)), f)
	for name: String in layout.font_names():
		assert_true(ResourceLoader.exists(paths["fonts"].path_join(name + ".woff")), name)
	assert_eq(layout.font_names().size(), 2, "Alegreya bold and Alegreya SC bold (D241)")


func test_the_window_is_the_windows_size() -> void:
	assert_eq(_layout().size(), Vector2(1152, 648))


func test_slots_run_in_rows() -> void:
	var layout := _layout()
	assert_eq(layout.slot_at("chest", 7) - layout.slot_at("chest", 0), Vector2(54, 80), "the second slot of the second row of 6")
	assert_eq(layout.slot_at("pack", 10) - layout.slot_at("pack", 0), Vector2(0, 80), "a pack row is 10 slots")


func test_a_slot_takes_its_items_material_or_shows_empty() -> void:
	var layout := _layout()
	assert_eq(layout.slot_file("Bronze"), "Slot Bronze.png")
	assert_eq(layout.slot_file(""), "Slot Empty.png")


func test_the_pack_counts_what_it_holds_out_of_its_slots() -> void:
	var state := SHOT.sample()
	var window := _window(state)
	assert_eq(window.pack_text(), "8 / 20")
	state["pack"]["slots"] = 12
	window.show_state(state)
	assert_eq(window.pack_text(), "7 / 12", "no backpack: the 13th slot and its trousers are not shown (D124)")
	state["pack"]["slots"] = 40
	window.show_state(state)
	assert_eq(window.pack_items().size(), 20, "never more than a pack can have")


func test_only_a_slot_that_holds_something_is_lit_and_has_the_note() -> void:
	var state := SHOT.sample()
	var window := _window(state)
	assert_eq(window.pointed(), 1, "the sword")
	window.pointed_slot = 5
	assert_eq(window.pointed(), -1, "an empty slot")
	window.pointed_slot = 99
	assert_eq(window.pointed(), -1)


func test_the_note_moves_down_with_the_pointed_row() -> void:
	var layout := _layout()
	assert_eq(layout.note(6)["at"] - layout.note(1)["at"], Vector2(0, 80))
	assert_eq(layout.note(6)["corner"] - layout.note(0)["corner"], Vector2(0, 80))


func test_the_mouse_moves_the_pointer() -> void:
	var window := _window(SHOT.sample())
	var e := InputEventMouseMotion.new()
	e.position = window.layout.slot_rect("chest", 6).get_center()
	window._gui_input(e)
	assert_eq(window.pointed(), 6, "the helmet")
	e.position = Vector2(700, 340)
	window._gui_input(e)
	assert_eq(window.pointed_slot, -1, "between the boards and the pack")


func test_a_click_takes_an_item_and_nothing_from_an_empty_slot() -> void:
	var window := _window(SHOT.sample())
	watch_signals(window)
	_click(window, window.layout.slot_rect("chest", 5).get_center())
	assert_signal_not_emitted(window, "took", "slot 5 is empty")
	_click(window, window.layout.slot_rect("chest", 3).get_center())
	assert_signal_emitted_with_parameters(window, "took", [3])


func test_take_all_and_close_by_click_or_key() -> void:
	var window := _window(SHOT.sample())
	watch_signals(window)
	_click(window, window.layout.take_all_rect().get_center())
	assert_signal_emit_count(window, "took_all", 1)
	_key(window, KEY_SPACE)
	assert_signal_emit_count(window, "took_all", 2, "Space")
	_click(window, Vector2(969, 312))
	assert_signal_emit_count(window, "closed", 1)
	_key(window, KEY_ESCAPE)
	assert_signal_emit_count(window, "closed", 2, "Esc")


func test_the_mouse_is_caught_only_over_the_window_parts() -> void:
	var window := _window(SHOT.sample())
	assert_false(window._has_point(Vector2(100, 100)), "the game keeps the left of the screen")
	assert_false(window._has_point(Vector2(1140, 20)), "and the corners")
	assert_true(window._has_point(window.layout.slot_rect("chest", 0).get_center()), "the boards")
	assert_true(window._has_point(window.layout.slot_rect("pack", 15).get_center()), "the satchel")
	assert_true(window._has_point(window.layout.take_all_rect().get_center()))
