extends GutTest
# Tests the Reputation screen: client/screens/reputation_screen.gd and reputation_layout.gd (D249).

const CLIENT_DATA := "res://data/client.json"
const SHOT := preload("res://client/screens/reputation_shot.gd")


func _paths() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(CLIENT_DATA))["screens"]


func _layout() -> ReputationLayout:
	return ReputationLayout.load_file(_paths()["reputation_layout"])


func _screen(state: Dictionary) -> ReputationScreen:
	var screen := ReputationScreen.new()
	add_child_autofree(screen)
	screen.show_state(state)
	return screen


func test_every_piece_and_font_the_layout_names_exists() -> void:
	var layout := _layout()
	var paths := _paths()
	assert_eq(layout.files().size(), 18, "the 18 pieces reputation_screen.mjs writes")
	for f: String in layout.files():
		assert_true(ResourceLoader.exists(paths["reputation_pieces"].path_join(f)), f)
	for name: String in layout.font_names():
		assert_true(ResourceLoader.exists(paths["fonts"].path_join(name + ".woff")), name)
	assert_eq(layout.font_names().size(), 2, "Alegreya bold and Alegreya SC bold (D241)")


func test_the_screen_is_the_windows_size_and_covers_the_game() -> void:
	var screen := _screen(SHOT.sample())
	assert_eq(screen.size, Vector2(1152, 648))
	assert_eq(screen.mouse_filter, Control.MOUSE_FILTER_STOP)
	assert_not_null(screen.veil_node(), "the world behind is dimmed")


func test_cards_sit_side_by_side_and_only_those_that_fit_show() -> void:
	var layout := _layout()
	assert_eq(layout.card_at(1) - layout.card_at(0), Vector2(420, 0))
	var state := SHOT.sample()
	state["towns"].append({"town": "Elsewhere", "faction": "Nobody"})
	assert_eq(_screen(state).shown_towns().size(), 2)


func test_a_town_that_told_you_nothing_is_dim_and_not_known() -> void:
	var screen := _screen(SHOT.sample())
	var towns := screen.shown_towns()
	assert_true(ReputationScreen.is_known(towns[0]), "Dawndoor told you")
	assert_false(ReputationScreen.is_known(towns[1]), "Oldscar told you nothing (D126)")
	assert_eq(screen.row_value(towns[0], "Standing"), ["Welcome", 0.72])
	assert_eq(screen.row_value(towns[1], "Standing"), ["Not known", null])
	var layout := _layout()
	assert_eq(layout.card_piece(1, false)["file"], "Card Unknown.png")
	assert_eq(layout.town_piece(1, "Oldscar", false)["file"], "Town Oldscar Unknown.png")
	assert_eq(layout.town_piece(0, "Oldscar", true)["file"], "Town Oldscar.png", "any town on any card")
	assert_eq(layout.town_piece(0, "Elsewhere", true), {}, "a town with no picture")


func test_the_mark_moves_along_the_scale_with_the_value() -> void:
	var layout := _layout()
	var low := layout.mark_piece(0, 0, 0.0)
	var high := layout.mark_piece(0, 0, 1.0)
	assert_eq(high["at"] - low["at"], Vector2(196, 0), "the scale's width")
	assert_eq(layout.mark_piece(0, 0, 2.0)["at"], high["at"], "kept on the scale")
	assert_eq(layout.mark_piece(1, 1, 0.5)["at"] - layout.mark_piece(0, 0, 0.5)["at"], Vector2(420, 38), "next card, next row")


func test_fames_bar_fills_to_its_value() -> void:
	var layout := _layout()
	var empty := layout.bar(0, 2, 0.0)
	var full := layout.bar(0, 2, 1.0)
	assert_eq(float(full["end"]) - float(empty["end"]), 200.0, "the bar's width less its inset each side")
	assert_lt(float(empty["end"]), float(empty["fill"]["at"].x) + 10.0, "nothing filled at 0")


func test_the_rules_reach_from_the_title_to_the_hint() -> void:
	var layout := _layout()
	var r := layout.title_rule(150.0, 180.0)
	assert_gt(r["length"], 400.0)
	var rects: Array = layout.rule_rects(r["at"], 50.0, Vector2(740, 12))
	assert_lt(rects[0].size.x, 70.0, "cut to its length")


func test_tales_show_where_and_when_and_only_those_that_fit() -> void:
	var state := SHOT.sample()
	var screen := _screen(state)
	assert_eq(screen.where_text(state["tales"][0]), "Dawndoor  ·  heard 2 days ago")
	for i in 6:
		state["tales"].append({"tale": "Another tale."})
	screen.show_state(state)
	assert_eq(screen.shown_tales().size(), 4)


func test_a_newborn_sees_a_blank_screen() -> void:
	var screen := _screen(SHOT.blank())
	assert_eq(screen.shown_tales().size(), 0)
	for town: Dictionary in screen.shown_towns():
		assert_false(ReputationScreen.is_known(town))
	var empty := _screen({})
	assert_eq(empty.shown_towns().size(), 0, "nothing given, nothing drawn")


func test_close_by_click_or_esc() -> void:
	var screen := _screen(SHOT.sample())
	watch_signals(screen)
	var e := InputEventMouseButton.new()
	e.button_index = MOUSE_BUTTON_LEFT
	e.pressed = true
	e.position = Vector2(500, 500)
	screen._gui_input(e)
	assert_signal_not_emitted(screen, "closed", "a click on the tales")
	e.position = Vector2(1010, 34)
	screen._gui_input(e)
	assert_signal_emit_count(screen, "closed", 1)
	var k := InputEventKey.new()
	k.keycode = KEY_ESCAPE
	k.pressed = true
	screen._unhandled_key_input(k)
	assert_signal_emit_count(screen, "closed", 2, "Esc")
