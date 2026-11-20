extends GutTest
# Tests the HUD: client/screens/hud.gd and hud_layout.gd (D244 to D246).

const CLIENT_DATA := "res://data/client.json"
const SHOT := preload("res://client/screens/hud_shot.gd")


func _paths() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(CLIENT_DATA))["screens"]


func _layout() -> HudLayout:
	return HudLayout.load_file(_paths()["hud_layout"])


func _hud(state: Dictionary) -> Hud:
	var hud := Hud.new()
	add_child_autofree(hud)
	hud.show_state(state)
	return hud


func test_every_piece_and_font_the_layout_names_exists() -> void:
	var layout := _layout()
	var paths := _paths()
	assert_eq(layout.files().size(), 37, "the 37 pieces hud.mjs writes")
	for f: String in layout.files():
		assert_true(ResourceLoader.exists(paths["hud_pieces"].path_join(f)), f)
	for name: String in layout.font_names():
		assert_true(ResourceLoader.exists(paths["fonts"].path_join(name + ".woff")), name)
	assert_eq(layout.font_names().size(), 2, "Alegreya bold and Alegreya SC bold (D241)")


func test_the_hud_is_the_windows_size() -> void:
	assert_eq(_layout().size(), Vector2(1152, 648))


func test_a_bars_liquid_ends_at_its_value() -> void:
	var layout := _layout()
	assert_eq(layout.fill_end("health", 0.0), 116.0, "track 114 + inset 2")
	assert_eq(layout.fill_end("health", 1.0), 332.0, "track end 334 - inset 2")
	assert_eq(layout.fill_end("health", 0.5), 224.0)
	assert_eq(layout.fill_end("run", 2.0), 332.0, "never past the end")


func test_the_bandage_ring_is_cut_in_quarter_turns_at_most() -> void:
	assert_eq(Hud.ring_wedges(0.0), [])
	assert_eq(Hud.ring_wedges(0.6), [[0.0, 0.25], [0.25, 0.5], [0.5, 0.6]])
	assert_eq(Hud.ring_wedges(1.5).size(), 4, "a full turn, no more")


func test_a_slot_takes_its_items_material_or_shows_empty() -> void:
	var state := SHOT.sample("Dawndoor")
	var hud := _hud(state)
	assert_eq(hud.slot_file("main_hand"), "Slot Square Iron.png", "the iron sword")
	assert_eq(hud.slot_file("off_hand"), "Slot Square Wood.png", "a wooden shield (D220)")
	assert_eq(hud.slot_file("bandage"), "Slot Round Cloth.png")
	state["off_hand"] = null
	state["bandages"] = 0
	hud.show_state(state)
	assert_eq(hud.slot_file("off_hand"), "Slot Square Empty.png")
	assert_eq(hud.slot_file("bandage"), "Slot Round Empty.png", "no bandages left")


func test_run_lights_when_running_and_a_screens_button_when_it_is_open() -> void:
	var state := SHOT.sample("Dawndoor")
	var hud := _hud(state)
	assert_true(hud.is_lit("Run"))
	assert_false(hud.is_lit("Character"))
	state["running"] = false
	state["open"] = "Character"
	hud.show_state(state)
	assert_false(hud.is_lit("Run"), "walking (D226)")
	assert_true(hud.is_lit("Character"))


func test_the_protection_shows_minutes_and_seconds_or_nothing() -> void:
	var state := SHOT.sample("Dawndoor")
	var hud := _hud(state)
	assert_eq(hud.protected_text(), "2:41")
	state["protected"] = 0
	hud.show_state(state)
	assert_eq(hud.protected_text(), "", "no protection: no sign, no time")


func test_health_and_pack_read_as_numbers() -> void:
	var hud := _hud(SHOT.sample("Dawndoor"))
	assert_eq(hud.health_text(), "32 / 44", "exact numbers (D125)")
	assert_eq(hud.pack_text(), "13 / 20")


func test_each_town_has_its_emblem() -> void:
	var layout := _layout()
	assert_eq(layout.emblem_file("Dawndoor"), "Emblem Dawndoor.png")
	assert_eq(layout.emblem_file("Oldscar"), "Emblem Oldscar.png")


func test_the_target_plate_grows_with_its_text_and_stays_centred() -> void:
	var layout := _layout()
	var narrow := layout.target_rect(60.0, 410.0, 66.0)
	var wide := layout.target_rect(160.0, 410.0, 66.0)
	assert_eq(wide.size.x - narrow.size.x, 100.0)
	var p := layout.target_plate()
	var middle := narrow.position.x + float(p["shadow_left"]) + (narrow.size.x - 410.0 + float(p["drawn"])) / 2.0
	assert_almost_eq(middle, float(p["centre_x"]), 1.0)
