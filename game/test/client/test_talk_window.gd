extends GutTest
# Tests the talk window: client/screens/talk_window.gd and talk_layout.gd (D23, D126 to D128).

const CLIENT_DATA := "res://data/client.json"
const SHOT := preload("res://client/screens/talk_shot.gd")


func _paths() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(CLIENT_DATA))["screens"]


func _layout() -> TalkLayout:
	return TalkLayout.load_file(_paths()["talk_layout"])


func _window(state: Dictionary) -> TalkWindow:
	var window := TalkWindow.new()
	add_child_autofree(window)
	window.show_state(state)
	return window


func _click(window: TalkWindow, at: Vector2) -> void:
	var e := InputEventMouseButton.new()
	e.button_index = MOUSE_BUTTON_LEFT
	e.pressed = true
	e.position = at
	window._gui_input(e)


func _key(window: TalkWindow, keycode: Key) -> void:
	var e := InputEventKey.new()
	e.keycode = keycode
	e.pressed = true
	window._unhandled_key_input(e)


func test_a_line_is_drawn_in_a_box_bottom_left_from_the_json_and_its_pieces() -> void:
	var layout := _layout()
	var paths := _paths()
	assert_eq(layout.size(), Vector2(1152, 648))
	assert_eq(layout.files().size(), 6, "the 6 pieces talk_window.mjs writes")
	for f: String in layout.files():
		assert_true(ResourceLoader.exists(paths["talk_pieces"].path_join(f)), f)
	var panel := layout.panel()["at"] as Vector2
	assert_lt(panel.x, 100.0, "left")
	assert_gt(panel.y, 324.0, "bottom")
	assert_lt(layout.side("left")["head"]["centre"].x, layout.side("right")["head"]["centre"].x, "theirs on the left, yours on the right")
	var window := _window(SHOT.sample("npc"))
	assert_eq(window.mode(), "line")
	assert_eq(window.speaker_name(), "Hesk")
	assert_between(window.wrapped(window.state["line"]["says"]).size(), 2, 3, "the line is wrapped to the box")
	assert_true(window._has_point(layout.panel()["at"] + Vector2(50, 50)), "the box catches the mouse")
	assert_false(window._has_point(Vector2(800, 300)), "the rest is the game's")


func test_a_name_you_were_not_told_shows_what_you_see_and_you_are_named_you() -> void:
	var window := _window({"line": {"name": "", "seen": "The orc in plate", "says": "Hm."}})
	assert_eq(window.speaker_name(), "The orc in plate")
	window.show_state({"line": {"name": "Hesk", "seen": "The man in red", "says": "Hm."}})
	assert_eq(window.speaker_name(), "Hesk", "a told name wins")
	window.show_state({"line": {"mine": true, "name": "Real Name", "says": "Hm."}})
	assert_eq(window.speaker_name(), "You")


func test_each_of_the_four_drafts_is_a_state_the_shot_page_shows() -> void:
	var modes := {"npc": "line", "you": "line", "options": "options", "people": "people"}
	for draft: String in modes:
		var window := _window(SHOT.sample(draft))
		assert_eq(window.mode(), modes[draft], draft)
	assert_true(_window(SHOT.sample("you")).state["line"]["mine"], "your head on the right")
	assert_eq(_window(SHOT.sample("options")).replies().size(), 5)
	assert_eq(_window(SHOT.sample("options")).lit_reply, 1, "the draft points at the second reply")
	assert_eq(_window(SHOT.sample("people")).lit_reply, 2)
	var layout := _layout()
	assert_eq(layout.reply_y(0), 528.0, "the draft's first reply")
	assert_eq(layout.reply_y(4) - layout.reply_y(0), 84.0)


func test_a_click_on_the_box_or_space_sends_next() -> void:
	var window := _window(SHOT.sample("npc"))
	watch_signals(window)
	_click(window, window.layout.panel()["at"] + Vector2(100, 60))
	assert_signal_emit_count(window, "next", 1)
	_key(window, KEY_SPACE)
	assert_signal_emit_count(window, "next", 2, "Space")


func test_a_click_on_a_reply_or_its_number_sends_picked() -> void:
	var window := _window(SHOT.sample("options"))
	watch_signals(window)
	_click(window, window.reply_rect(2).get_center())
	assert_signal_emitted_with_parameters(window, "picked", [3])
	_key(window, KEY_5)
	assert_signal_emitted_with_parameters(window, "picked", [5])
	_click(window, Vector2(800, 300))
	assert_signal_emit_count(window, "picked", 2, "off the list nothing is picked")
	_key(window, KEY_SPACE)
	assert_signal_not_emitted(window, "next", "Space is for a line")


func test_the_people_list_shows_the_people_in_the_state_and_nothing_else() -> void:
	var window := _window({"people": [{"label": "Brannoc", "kind": "by name"}, {"label": "Back", "kind": ""}]})
	assert_eq(window.replies(), [["Brannoc", "by name"], ["Back", ""]])
	watch_signals(window)
	_key(window, KEY_3)
	assert_signal_not_emitted(window, "picked", "there is no third")
	_key(window, KEY_2)
	assert_signal_emitted_with_parameters(window, "picked", [2])
	assert_eq(_window({"people": []}).replies(), [])


func test_esc_closes() -> void:
	for draft: String in ["npc", "options", "people"]:
		var window := _window(SHOT.sample(draft))
		watch_signals(window)
		_key(window, KEY_ESCAPE)
		assert_signal_emit_count(window, "closed", 1, draft)
