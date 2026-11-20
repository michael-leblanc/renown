extends GutTest
# Tests the Skills screen: client/screens/skills_screen.gd and skills_layout.gd (D242, D243, D252).

const CLIENT_DATA := "res://data/client.json"
const SHOT := preload("res://client/screens/skills_shot.gd")


func _paths() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(CLIENT_DATA))["screens"]


func _layout() -> SkillsLayout:
	return SkillsLayout.load_file(_paths()["skills_layout"])


func _screen(ch: Dictionary) -> SkillsScreen:
	var screen := SkillsScreen.new()
	add_child_autofree(screen)
	screen.show_state(ch)
	return screen


func test_every_piece_and_font_the_layout_names_exists() -> void:
	var layout := _layout()
	var paths := _paths()
	assert_eq(layout.files().size(), 30 + 85, "the 30 pieces and 85 signs skills_tree.mjs writes")
	for f: String in layout.files():
		assert_true(ResourceLoader.exists(paths["skills_pieces"].path_join(f)), f)
	for name: String in layout.font_names():
		assert_true(ResourceLoader.exists(paths["fonts"].path_join(name + ".woff")), name)


func test_eight_webs_and_four_later_skills() -> void:
	var layout := _layout()
	assert_eq(layout.skills.size(), 12)
	assert_eq(layout.web_names(), ["Swords", "Axes", "Maces", "Spears", "Bows", "Unarmed", "Shield", "Dodge"])
	assert_true(layout.is_later("Magic"))
	assert_eq(layout.by_name["Swords"]["nodes"].size(), 36, "8 named, 25 small, 2 on the bridge, the place kept for Crafting (D252)")


func test_a_bridge_joins_two_neighbours() -> void:
	var layout := _layout()
	assert_true(layout.adj["Swords/x2b"].has("Axes/eB"), "Swords' bridge opens Axes' left 40 node")
	assert_true(layout.adj["Axes/eB"].has("Swords/x2b"))


func test_points_every_five_levels_and_marks() -> void:
	var layout := _layout()
	var ch := SHOT.sample()
	assert_eq(layout.earned(ch, "Swords"), 15, "78 / 5")
	assert_eq(layout.spent(ch, "Swords"), 7)
	assert_eq(layout.free_points(ch, "Swords"), 8)
	assert_eq(layout.marks(ch, "Swords"), 3, "15, 40, 65")
	assert_eq(layout.named_taken(ch, "Swords"), 2, "Keen and Bleed")
	assert_eq(layout.free_points(ch, "Magic"), 0, "a later skill earns nothing")
	assert_eq(layout.total(ch), 238)


func test_node_states() -> void:
	var layout := _layout()
	var ch := SHOT.sample()
	assert_eq(layout.state_of(ch, "Swords/eK"), "taken")
	assert_eq(layout.state_of(ch, "Swords/ex2"), "open", "beside Bleed and its rib, Swords 25 reached")
	assert_eq(layout.state_of(ch, "Swords/eF"), "locked", "Swords 90 not reached")
	assert_eq(layout.why(ch, "Swords/eF"), "Needs Swords 90")
	assert_eq(layout.state_of(ch, "Maces/ek1"), "locked", "Maces 0: no point")
	assert_eq(layout.state_of(ch, "Swords/m1"), "taken", "Iron 25 reached")
	assert_eq(layout.state_of(ch, "Swords/m3"), "locked", "a later material")


func test_a_node_goes_dark_when_its_skill_drops_below_it() -> void:
	var layout := _layout()
	var ch := SHOT.sample()
	ch["levels"]["Swords"] = 30
	assert_eq(layout.state_of(ch, "Swords/eB"), "dark", "Bleed needs 40")


func test_a_named_node_needs_a_mark() -> void:
	var layout := _layout()
	var ch := {"levels": {"Swords": 20}, "taken": ["Swords/ek1", "Swords/ek2", "Swords/eK"]}
	ch["taken"].append("Swords/gk1")
	ch["taken"].append("Swords/gk2")
	assert_eq(layout.why(ch, "Swords/gK"), "Next named at Swords 40", "one mark at 15, used by Keen")


func test_the_route_to_a_far_node() -> void:
	var layout := _layout()
	var ch := SHOT.sample()
	var r := layout.route_to(ch, "Swords/eQ")
	assert_eq(r["path"].back(), "Swords/eQ")
	assert_eq(int(r["cost"]), 4)
	assert_true(r["ok"])
	assert_eq(layout.route_to(ch, "Swords/eK"), {}, "taken: no route")


func test_take_adds_an_open_node_and_ignores_a_locked_one() -> void:
	var layout := _layout()
	var ch := SHOT.sample()
	var after := layout.take(ch, "Swords/ex2")
	assert_true(after["taken"].has("Swords/ex2"))
	assert_false(ch["taken"].has("Swords/ex2"), "the old character is not changed")
	assert_eq(layout.take(ch, "Swords/eF"), ch)


func test_a_bridge_is_paid_by_either_skill() -> void:
	var layout := _layout()
	var right := ["Swords/gk1", "Swords/gk2", "Swords/gK", "Swords/gx1", "Swords/gb1", "Swords/gb2", "Swords/gB"]
	var ch := {"levels": {"Swords": 35, "Axes": 30}, "taken": right}
	assert_eq(layout.free_points(ch, "Swords"), 0, "7 points, 7 spent")
	assert_eq(layout.state_of(ch, "Swords/x1b"), "open", "Axes has points and is past the bridge's 25")
	assert_eq(layout.take(ch, "Swords/x1b")["paid"]["Swords/x1b"], "Axes")
	ch["levels"]["Axes"] = 0
	assert_eq(layout.why(ch, "Swords/x1b"), "No point to spend")


func test_the_screen_opens_on_the_whole_wheel() -> void:
	var screen := _screen(SHOT.sample())
	assert_almost_eq(screen.z, 0.2, 0.001)
	assert_eq(screen.to_screen(screen.layout.root()), screen.layout.look())


func test_zoom_keeps_the_point_under_the_pointer() -> void:
	var screen := _screen(SHOT.sample())
	var at := Vector2(800, 200)
	var before := screen.to_tree(at)
	screen.zoom_to(1.0, at)
	assert_almost_eq(screen.to_tree(at).distance_to(before), 0.0, 0.01)
	screen.zoom_to(99.0)
	assert_eq(screen.z, 2.4, "never past the json's max")


func test_take_sends_the_node_and_route_sends_the_way() -> void:
	var screen := _screen(SHOT.sample())
	watch_signals(screen)
	screen.click("Swords/ex2")
	screen.click("take")
	assert_signal_emitted_with_parameters(screen, "took", [["Swords/ex2"]])
	screen.click("Swords/eQ")
	screen.click("route")
	var ids: Array = get_signal_parameters(screen, "took")[0]
	assert_eq(ids.size(), 4)
	assert_eq(ids.back(), "Swords/eQ")


func test_take_on_a_locked_node_sends_nothing() -> void:
	var screen := _screen(SHOT.sample())
	watch_signals(screen)
	screen.click("Swords/eF")
	screen.click("take")
	assert_signal_not_emitted(screen, "took")


func test_close_and_escape() -> void:
	var screen := _screen(SHOT.sample())
	watch_signals(screen)
	screen.click("close")
	assert_signal_emit_count(screen, "closed", 1)
	var e := InputEventAction.new()
	e.action = "ui_cancel"
	e.pressed = true
	screen._unhandled_key_input(e)
	assert_signal_emit_count(screen, "closed", 2, "Esc")


func test_a_click_on_nothing_drops_the_pick() -> void:
	var screen := _screen(SHOT.sample())
	screen.click("Swords/eK")
	assert_eq(screen.pick, "Swords/eK")
	screen.click("")
	assert_eq(screen.pick, "")


# ---------- movement (D175: every timing is read from skills.json) ----------
func _owned(ch: Dictionary) -> SkillsScreen:
	var screen := SkillsScreen.new()
	add_child_autofree(screen)
	screen.clock_auto = false
	screen.took.connect(func(ids: Array) -> void:
		var c := screen.character
		for id: String in ids:
			c = screen.layout.take(c, id)
		screen.show_state(c))
	screen.show_state(ch)
	screen.set_time(0.0)
	return screen


func _route_of(layout: SkillsLayout, ch: Dictionary, size: int) -> String:
	for id: String in layout.by_id:
		if layout.by_id[id]["bead"]:
			continue
		var r := layout.route_to(ch, id)
		if not r.is_empty() and r["ok"] and int(r["cost"]) == size:
			return id
	return ""


func test_the_json_has_a_timings_block_with_the_pages_numbers() -> void:
	var layout := _layout()
	assert_almost_eq(float(layout.timing("open")), 0.3, 0.0001)
	assert_almost_eq(float(layout.timing("strand")), 0.18, 0.0001)
	assert_almost_eq(float(layout.timing("route_step")), 0.11, 0.0001)
	for k: String in ["burst", "bead", "ring", "earned", "zoom"]:
		assert_gt(float(layout.timing(k)), 0.0, k)


func test_the_screen_fades_in_from_nothing_to_full_eased_out() -> void:
	var screen := _owned(SHOT.sample())
	screen.open()
	screen.set_time(0.0)
	assert_almost_eq(screen.opacity(), 0.0, 0.0001)
	screen.set_time(0.15)
	assert_almost_eq(screen.opacity(), 0.875, 0.0001, "1 - (1 - .5)^3: eased out, past halfway")
	assert_almost_eq(screen.modulate.a, 0.875, 0.0001)
	screen.set_time(0.3)
	assert_almost_eq(screen.opacity(), 1.0, 0.0001)


func test_a_node_taken_flashes_and_the_light_runs_from_where_it_was_bought() -> void:
	var screen := _owned(SHOT.sample())
	screen.set_time(1.0)
	screen.click("Swords/ex2")
	screen.click("take")
	var from := screen.light_from("Swords/ex2")
	assert_true(SHOT.sample()["taken"].has(from) and screen.layout.adj["Swords/ex2"].has(from), "a taken node beside it")
	assert_almost_eq(screen.strand_light("Swords/ex2"), 0.0, 0.0001)
	screen.set_time(1.09)
	assert_almost_eq(screen.strand_light("Swords/ex2"), 0.5, 0.0001)
	assert_eq(screen.layout.state_of(screen.shown_character(), "Swords/ex2"), "taken")
	screen.set_time(1.18)
	assert_almost_eq(screen.strand_light("Swords/ex2"), 1.0, 0.0001)
	assert_gt(screen.node_flash("Swords/ex2"), 0.9, "the thin ring starts as the light arrives")
	screen.set_time(1.18 + 0.4)
	assert_almost_eq(screen.node_flash("Swords/ex2"), 0.0, 0.0001, "and is gone: nothing loops")
	assert_false(screen.is_moving())


func test_take_route_takes_the_nodes_one_after_another() -> void:
	var ch := SHOT.sample()
	var screen := _owned(ch)
	var target := _route_of(screen.layout, ch, 3)
	assert_ne(target, "", "a three-node route exists")
	screen.click(target)
	screen.click("route")
	var path: Array = screen.layout.route_to(ch, target)["path"]
	assert_eq(path.size(), 3)
	assert_eq(screen.taken_count(), 10 + 1, "only the first is taken at 0")
	screen.set_time(0.10)
	assert_eq(screen.taken_count(), 10 + 1)
	screen.set_time(0.11)
	assert_eq(screen.taken_count(), 10 + 2)
	screen.set_time(0.22)
	assert_eq(screen.taken_count(), 10 + 3)
	assert_true(screen.layout.is_taken(screen.shown_character(), path[2]))


func test_a_point_earned_shows_the_blue_ring_and_a_level_eases_to_its_new_place() -> void:
	var ch := SHOT.sample()
	var screen := _owned(ch)
	assert_almost_eq(screen.point_flash("Swords"), 0.0, 0.0001)
	assert_almost_eq(screen.ring_level("Swords"), 78.0, 0.0001)
	screen.set_time(1.0)
	var up := ch.duplicate(true)
	up["levels"]["Swords"] = 80
	screen.show_state(up)
	assert_almost_eq(screen.point_flash("Swords"), 1.0, 0.0001, "80 / 5 = 16: a point")
	assert_almost_eq(screen.point_flash("Shield"), 0.0, 0.0001)
	assert_almost_eq(screen.ring_level("Swords"), 78.0, 0.0001)
	screen.set_time(1.0 + 0.2)
	assert_between(screen.ring_level("Swords"), 79.0, 80.0, "on its way, eased out")
	screen.set_time(1.0 + 0.4)
	assert_almost_eq(screen.ring_level("Swords"), 80.0, 0.0001)
	screen.set_time(1.0 + 0.45)
	assert_almost_eq(screen.point_flash("Swords"), 0.0, 0.0001)


func test_a_zoom_on_the_wheel_glides_instead_of_jumping() -> void:
	var screen := _owned(SHOT.sample())
	screen.set_time(1.0)
	var from := screen.z
	var e := InputEventMouseButton.new()
	e.button_index = MOUSE_BUTTON_WHEEL_UP
	e.pressed = true
	e.position = Vector2(800, 200)
	var under := screen.to_tree(e.position)
	screen._gui_input(e)
	var to := from * float(screen.layout.zoom("wheel"))
	assert_almost_eq(screen.z, from, 0.0001, "not at once")
	screen.set_time(1.125)
	assert_between(screen.z, from + 0.0001, to - 0.0001)
	assert_almost_eq(screen.to_tree(e.position).distance_to(under), 0.0, 0.01, "the point under the pointer stays")
	screen.set_time(1.25)
	assert_almost_eq(screen.z, to, 0.0001)
	assert_false(screen.is_moving())


func test_reduced_motion_shows_the_final_state_at_once() -> void:
	var ch := SHOT.sample()
	var screen := SkillsScreen.new()
	add_child_autofree(screen)
	screen.clock_auto = false
	screen.reduced_motion = true
	screen.took.connect(func(ids: Array) -> void:
		var c := screen.character
		for id: String in ids:
			c = screen.layout.take(c, id)
		screen.show_state(c))
	screen.show_state(ch)
	screen.open()
	screen.set_time(0.0)
	assert_almost_eq(screen.opacity(), 1.0, 0.0001)
	var target := _route_of(screen.layout, ch, 3)
	screen.click(target)
	screen.click("route")
	assert_eq(screen.taken_count(), 13, "the whole route")
	assert_almost_eq(screen.strand_light(target), 1.0, 0.0001)
	assert_almost_eq(screen.node_flash(target), 0.0, 0.0001)
	var up := screen.character.duplicate(true)
	up["levels"]["Swords"] = 80
	screen.show_state(up)
	assert_almost_eq(screen.ring_level("Swords"), 80.0, 0.0001)
	assert_almost_eq(screen.point_flash("Swords"), 0.0, 0.0001)
	var from := screen.z
	screen.glide_to(from * 1.5)
	assert_almost_eq(screen.z, from * 1.5, 0.0001)
	assert_false(screen.is_moving())


func test_the_shot_page_takes_a_frame_at_a_time() -> void:
	var shot := SHOT.new()
	add_child_autofree(shot)
	var screen: SkillsScreen = shot.screen
	assert_not_null(screen)
	assert_false(screen.clock_auto, "the shot holds the clock still")
	shot.at_time(0.15)
	assert_almost_eq(screen.opacity(), 0.875, 0.0001)
	shot.at_time(5.0)
	assert_almost_eq(screen.opacity(), 1.0, 0.0001)
	assert_false(screen.is_moving(), "settled: nothing loops")
