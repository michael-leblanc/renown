extends GutTest
# Tests the death screen: client/screens/death_screen.gd and death_layout.gd (D148,
# D149, D247).

const CLIENT_DATA := "res://data/client.json"
const SHOT := preload("res://client/screens/death_shot.gd")


func _paths() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(CLIENT_DATA))["screens"]


func _layout() -> DeathLayout:
	return DeathLayout.load_file(_paths()["death_layout"])


func _screen(life: Dictionary) -> DeathScreen:
	var screen := DeathScreen.new()
	add_child_autofree(screen)
	screen.show_life(life)
	return screen


func _click(screen: DeathScreen, at: Vector2, button := MOUSE_BUTTON_LEFT) -> void:
	var e := InputEventMouseButton.new()
	e.button_index = button
	e.pressed = true
	e.position = at
	screen._gui_input(e)


func test_every_piece_and_font_the_layout_names_exists() -> void:
	var layout := _layout()
	var paths := _paths()
	assert_eq(layout.files().size(), 13, "the 13 pieces death_screen.mjs writes")
	for f: String in layout.files():
		assert_true(ResourceLoader.exists(paths["death_pieces"].path_join(f)), f)
	for name: String in layout.font_names():
		assert_true(ResourceLoader.exists(paths["fonts"].path_join(name + ".woff")), name)
	assert_eq(layout.font_names().size(), 2, "Alegreya bold and Alegreya SC bold (D241)")


func test_the_screen_is_the_windows_size() -> void:
	assert_eq(_layout().size(), Vector2(1152, 648))


func test_each_town_has_its_landmark_big_and_small() -> void:
	var layout := _layout()
	for town: String in ["Dawndoor", "Oldscar"]:
		assert_eq(layout.landmark_file(town), "Landmark %s.png" % town)
		assert_eq(layout.town_file(town), "Town %s.png" % town)


func test_the_deeds_scroll_and_never_past_either_end() -> void:
	var screen := _screen(SHOT.sample("Dawndoor"))
	var shown := screen.layout.deed_lines()
	assert_eq(shown, 7)
	assert_gte(screen.deed_line_count(), 12, "a line or more per deed")
	assert_eq(screen.shown_deed_lines().size(), shown)
	assert_true(screen.more_deeds_below(), "the fade and the scroll bar show")
	screen.scroll_deeds(100)
	assert_eq(screen.first_deed_line, screen.deed_line_count() - shown, "the last line shows at the bottom")
	assert_false(screen.more_deeds_below(), "no fade at the end")
	screen.scroll_deeds(-100)
	assert_eq(screen.first_deed_line, 0)


func test_a_short_life_has_no_scroll_bar() -> void:
	var life := SHOT.sample("Dawndoor")
	life["deeds"] = ["Killed a goblin by the old well."]
	var screen := _screen(life)
	assert_false(screen.more_deeds_below())
	screen.scroll_deeds(3)
	assert_eq(screen.first_deed_line, 0, "nothing to scroll")


func test_a_long_deed_wraps_and_only_its_first_line_has_a_bullet() -> void:
	var life := SHOT.sample("Dawndoor")
	life["deeds"] = ["Killed an orc in steel plate on the west road after a long chase through the north wood and across the ford."]
	var screen := _screen(life)
	var lines := screen.wrap_deeds()
	assert_gt(lines.size(), 1)
	assert_true(lines[0][1])
	assert_false(lines[1][1])
	for l: Array in lines:
		assert_lte(screen._width(l[0], "line"), float(screen.layout.deeds()["wrap"]), l[0])


func test_the_thumb_runs_the_length_of_the_trough() -> void:
	var layout := _layout()
	var t := layout.thumb()
	var tex := Vector2(12, 50)
	var top := layout.thumb_rect(0, 12, tex)
	assert_eq(top.position.y, float(t["top"]) - float(t["shadow_top"]))
	assert_eq(top.size.y, roundf(130.0 * 7.0 / 12.0) + tex.y - float(t["drawn"]), "as long as the share that shows")
	var bottom := layout.thumb_rect(5, 12, tex)
	var thumb_end := bottom.position.y + float(t["shadow_top"]) + bottom.size.y - tex.y + float(t["drawn"])
	assert_almost_eq(thumb_end, float(t["top"]) + float(t["travel"]), 1.0, "reaches the trough's end")
	assert_eq(layout.thumb_rect(0, 400, tex).size.y, float(t["min"]) + tex.y - float(t["drawn"]), "never shorter than min")


func test_a_rule_is_cut_from_its_inner_end() -> void:
	var layout := _layout()
	var tex := Vector2(220, 14)
	var at := Vector2(300.4, 156.4)
	var left: Array = layout.rule_rects("left", at, 80.0, tex)
	var right: Array = layout.rule_rects("right", at, 80.0, tex)
	assert_eq(left[1].position.x, 300.0 - 80.0, "reaches 80 to the left")
	assert_eq(right[1].end.x, 300.0 + 80.0 + 1.0, "reaches 80 to the right")
	assert_eq(left[0].size, left[1].size)
	assert_eq(layout.rule_rects("left", at, 999.0, tex)[1].position.x, 300.0 - 200.0, "never longer than it was drawn")


func test_a_headings_rules_shorten_as_its_text_widens() -> void:
	var layout := _layout()
	var narrow := layout.text_rules("deeds", 80.0)
	var wide := layout.text_rules("deeds", 100.0)
	assert_eq(narrow[0]["length"] - wide[0]["length"], 10.0)
	var mid := float(layout.headings()["deeds"]["centre"][0])
	assert_eq(wide[0]["at"].x, mid - 50.0 - 10.0, "a gap of 10 from the text")
	assert_eq(wide[1]["at"].x, mid + 50.0 + 10.0)
	assert_eq(layout.text_rules("", 100.0)[0]["length"], 132.0, "the name's are the same length whatever the name")


func test_only_the_towns_that_fit_show_and_the_divider_follows_them() -> void:
	var life := SHOT.sample("Dawndoor")
	life["remembers"].append({"town": "Dawndoor", "faction": "The Keeping", "says": "A third."})
	var screen := _screen(life)
	assert_eq(screen.shown_towns().size(), 2, "the slice's two towns (D11)")
	var layout := screen.layout
	var t := layout.towns()
	assert_eq(layout.divider(1)[0]["at"].y, float(t["top"]) + float(t["step"]) - 14.0)
	assert_eq(layout.divider(0)[0]["at"].y, float(t["top"]) - 14.0, "nobody remembers: the divider moves up")


func test_the_lines_built_from_the_life() -> void:
	var life := SHOT.sample("Dawndoor")
	var screen := _screen(life)
	assert_eq(screen.kind_text(), "Human  ·  Well-woken")
	assert_eq(screen.deeds_heading(), "Deeds  ·  12")
	life.erase("background")
	screen.show_life(life)
	assert_eq(screen.kind_text(), "Human")


func test_wake_is_sent_by_a_click_on_its_button_only() -> void:
	var screen := _screen(SHOT.sample("Dawndoor"))
	watch_signals(screen)
	_click(screen, Vector2(10, 10))
	assert_signal_not_emitted(screen, "woke")
	_click(screen, screen.layout.wake_rect().get_center())
	assert_signal_emitted(screen, "woke")


func test_the_wheel_scrolls_the_deeds_only_over_them() -> void:
	var screen := _screen(SHOT.sample("Dawndoor"))
	_click(screen, Vector2(576, 300), MOUSE_BUTTON_WHEEL_DOWN)
	assert_eq(screen.first_deed_line, 0, "not over the list")
	_click(screen, screen.layout.deeds_rect().get_center(), MOUSE_BUTTON_WHEEL_DOWN)
	assert_eq(screen.first_deed_line, 1)
	_click(screen, screen.layout.deeds_rect().get_center(), MOUSE_BUTTON_WHEEL_UP)
	assert_eq(screen.first_deed_line, 0)


func test_the_veil_takes_the_jsons_numbers() -> void:
	var screen := _screen(SHOT.sample("Dawndoor"))
	var v := screen.veil_node()
	assert_not_null(v)
	assert_true(v.show_behind_parent, "under the screen, over the world")
	var m := v.material as ShaderMaterial
	assert_almost_eq(float(m.get_shader_parameter("grey")), 0.7, 0.0001)
	assert_almost_eq(float(m.get_shader_parameter("dark")), 0.5, 0.0001)
	assert_almost_eq(float(m.get_shader_parameter("corners")), 0.35, 0.0001)
