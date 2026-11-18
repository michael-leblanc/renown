extends GutTest
# Tests the character screen: client/screens/ (D239 to D241).

const CLIENT_DATA := "res://data/client.json"
const LOOKS_DATA := "res://data/looks.json"
const GEAR := ["Main hand", "Head", "Chest", "Hands", "Back", "Belt", "Legs", "Feet", "Off hand"]
const SHOT := preload("res://client/screens/character_screen_shot.gd")


func _paths() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(CLIENT_DATA))["screens"]


func _layout() -> CharacterScreenLayout:
	return CharacterScreenLayout.load_file(_paths()["character_layout"])


func _screen(sheet: Dictionary) -> CharacterScreen:
	var screen := CharacterScreen.new()
	add_child_autofree(screen)
	screen.show_sheet(sheet)
	return screen


func test_the_layout_names_nine_worn_slots_twenty_pack_slots_and_the_bandage() -> void:
	var slots := _layout().slots()
	assert_eq(slots.size(), 30)
	var names: Array = []
	for s: Dictionary in slots.slice(0, 9):
		names.append(s["gear"])
	assert_eq(names, GEAR)
	assert_eq(slots[0]["kind"], "Hand", "the hands are the bigger slots at the ends")
	assert_eq(slots[8]["kind"], "Hand")
	assert_eq(slots[9]["pack"], 0)
	assert_eq(slots[28]["pack"], 19)
	assert_true(slots[29]["bandage"])


func test_pack_slots_run_left_to_right_then_down() -> void:
	var slots := _layout().slots()
	assert_eq(slots[9]["at"], Vector2(40, 578))
	assert_eq(slots[10]["at"], Vector2(94, 578))
	assert_eq(slots[19]["at"], Vector2(40, 654), "the 11th starts the second row")


func test_every_piece_slot_picture_and_font_it_names_exists() -> void:
	var layout := _layout()
	var paths := _paths()
	var files: Array = []
	for layer: String in layout.order():
		if layout.is_piece(layer):
			files.append(layout.piece_file(layer))
	for m: Dictionary in layout.medallions():
		files.append(m["file"])
	for kind: String in ["Gear", "Hand", "Pack"]:
		for material: String in ["Iron", "Bronze", "Cloth", "Leather", "Wood", "Gold", "Empty"]:
			files.append(layout.slot_file(kind, material))
	files.append(layout.slot_file("Round", "Cloth"))
	files.append(layout.slot_file("Round", "Empty"))
	for f: String in files:
		assert_true(ResourceLoader.exists(paths["pieces"].path_join(f)), f)
	for name: String in layout.font_names():
		assert_true(ResourceLoader.exists(paths["fonts"].path_join(name + ".woff")), name)
	assert_eq(layout.font_names().size(), 2, "Alegreya bold and Alegreya SC bold (D241)")


func test_an_item_picture_is_centred_in_its_slot_on_whole_pixels() -> void:
	var layout := _layout()
	var pack_slot: Dictionary = layout.slots()[9]
	var r := layout.picture_rect(pack_slot)
	assert_eq(r.size, Vector2(46, 46))
	assert_eq(r.position, Vector2(42, 590))


func test_a_slot_takes_its_items_material_or_shows_empty() -> void:
	var screen := _screen(SHOT.sample("human"))
	var slots := screen.layout.slots()
	assert_eq(screen.slot_file(slots[0]), "Slot Hand Iron.png", "the iron sword")
	assert_eq(screen.slot_file(slots[1]), "Slot Gear Empty.png", "no head gear")
	assert_eq(screen.slot_file(slots[9]), "Slot Pack Gold.png", "coins")
	assert_eq(screen.slot_file(slots[29]), "Slot Round Cloth.png", "bandages")


func test_no_bandages_leave_the_round_slot_empty() -> void:
	var sheet := SHOT.sample("human")
	sheet["bandages"] = 0
	var screen := _screen(sheet)
	assert_null(screen.item_in(screen.layout.slots()[29]))


func test_the_pack_line_counts_the_filled_slots() -> void:
	var screen := _screen(SHOT.sample("human"))
	assert_eq(screen.pack_text(), "8 / 20")
	var sheet := SHOT.sample("human")
	sheet["pack_slots"] = 12
	screen.show_sheet(sheet)
	assert_eq(screen.pack_text(), "8 / 12", "without a backpack (D124)")


func test_the_characters_feet_stand_where_the_layout_says() -> void:
	for race: String in ["human", "orc", "goblin"]:
		var screen := _screen(SHOT.sample(race))
		var drawn := screen.drawn_rect()
		var stand: Node2D = screen.character_view().get_parent()
		var bottom_middle := stand.position + Vector2(drawn.get_center().x, drawn.end.y) * stand.scale
		assert_almost_eq(bottom_middle, screen.layout.character_feet(), Vector2(0.01, 0.01), race)


func test_the_character_is_drawn_four_times_bigger_in_hard_pixels() -> void:
	var screen := _screen(SHOT.sample("human"))
	var view := screen.character_view()
	var drawn_scale: Vector2 = view.get_parent().scale * view.stack.scale
	assert_almost_eq(drawn_scale, Vector2(4, 4), Vector2(0.001, 0.001))
	assert_eq(view.get_parent().texture_filter, CanvasItem.TEXTURE_FILTER_NEAREST)
	assert_false(view.sprite_for("shadow").visible, "no shadow on the stage")
