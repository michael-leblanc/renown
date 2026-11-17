extends GutTest
# Tests the drawn character: client/character/ (CLI-003).

const SCENE := "res://client/character/character.tscn"
const CLIENT_DATA := "res://data/client.json"
const LOOKS_DATA := "res://data/looks.json"
const ART := "res://client/art/creator"
const GREY := 0.725
const NAMES := ["E", "SE", "S", "SW", "W", "NW", "N", "NE"]
# The grid step each direction row is for (the sheet's rows: E, SE, S, SW, W, NW, N, NE).
const STEPS := [[1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]]
# Where each one goes on the screen.
const SCREEN_WAY := [Vector2(1, 0), Vector2(2, 1), Vector2(0, 1), Vector2(-2, 1), Vector2(-1, 0), Vector2(-2, -1), Vector2(0, -1), Vector2(2, -1)]
const PARTS := ["Shadow", "NakedBody", "Legs1", "Shoes1", "Chest1", "Belt1", "Hands1", "Head1", "Melee2", "Shield1"]
const ANIMS := ["Idle", "Walk", "Attack1", "CrouchIdle", "Die", "Special1", "TakeDamage", "Taunt"]


func _json(path: String) -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(path))


func _look() -> CharacterLook:
	return CharacterLook.from_dicts(_json(CLIENT_DATA), _json(LOOKS_DATA))


func _parts() -> Array:
	var worn: Array = []
	var outfit: Dictionary = _json(LOOKS_DATA)["outfits"]["starting"]
	for slot: String in outfit:
		if outfit[slot] != null:
			worn.append({"slot": slot, "part": outfit[slot]["part"], "colour": outfit[slot]["colour"]})
	return worn


func _entry(id: int, tile: Array, stepping: Array, race := "human") -> Dictionary:
	return NetMessages.seen_character(id, tile, stepping, race, _parts())


func _character(look: CharacterLook = null, walk_time := 0.3) -> CharacterView:
	var view: CharacterView = load(SCENE).instantiate()
	add_child_autofree(view)
	view.setup(look if look != null else _look(), walk_time)
	return view


func _stepping(d: int, from := [5, 5]) -> Dictionary:
	return _entry(1, from, [from[0] + STEPS[d][0], from[1] + STEPS[d][1]])


func _index_of(view: CharacterView, slot: String) -> int:
	return view.layers().find(slot)


func _scripts_under(dir: String) -> Array[String]:
	var found: Array[String] = []
	for file in DirAccess.get_files_at(dir):
		if file.ends_with(".gd") or file.ends_with(".tscn"):
			found.append(dir.path_join(file))
	for sub in DirAccess.get_directories_at(dir):
		found.append_array(_scripts_under(dir.path_join(sub)))
	return found


func test_given_the_creator_pngs_when_the_task_is_committed_then_they_are_under_game_client_art_creator_and_nothing_under_game_reads_from_prototype() -> void:
	for part in PARTS:
		for anim in ANIMS:
			assert_true(FileAccess.file_exists("%s/%s/%s.png" % [ART, part, anim]), "%s/%s.png is under game/client/art/creator" % [part, anim])
	var old := ProjectSettings.globalize_path("res://").path_join("../prototype/art/creator")
	assert_false(DirAccess.dir_exists_absolute(old), "prototype/art/creator is gone")
	var scripts: Array[String] = []
	for dir in ["res://client", "res://tools", "res://net", "res://server", "res://sim"]:
		scripts.append_array(_scripts_under(dir))
	assert_gt(scripts.size(), 10)
	for path in scripts:
		assert_false(FileAccess.get_file_as_string(path).contains("prototype/"), "%s reads from prototype/" % path)


func test_given_a_character_in_a_view_when_it_is_drawn_then_its_body_and_each_worn_part_are_stacked_from_the_same_code_each_tinted_with_the_colour_the_view_gives_the_body_with_its_races_skin_colour() -> void:
	var view := _character()
	view.show_entry(_entry(1, [5, 5], [], "orc"))
	var skin := Color.html(_json(LOOKS_DATA)["races"]["orc"]["skin"])
	var body := view.sprite_for("body")
	assert_not_null(body)
	assert_almost_eq(body.modulate.r, skin.r / GREY, 0.001)
	assert_almost_eq(body.modulate.g, skin.g / GREY, 0.001)
	assert_almost_eq(body.modulate.b, skin.b / GREY, 0.001)
	for worn: Dictionary in _parts():
		var sprite := view.sprite_for(worn["slot"])
		assert_not_null(sprite, "%s is drawn" % worn["slot"])
		var colour := Color.html(worn["colour"])
		assert_almost_eq(sprite.modulate.r, colour.r / GREY, 0.001, "%s red" % worn["slot"])
		assert_almost_eq(sprite.modulate.g, colour.g / GREY, 0.001, "%s green" % worn["slot"])
		assert_almost_eq(sprite.modulate.b, colour.b / GREY, 0.001, "%s blue" % worn["slot"])
		assert_eq(sprite.texture.resource_path, "%s/%s/Idle.png" % [ART, worn["part"]])
		assert_eq(sprite.get_parent(), body.get_parent(), "stacked in one place")
	assert_eq(body.texture.resource_path, "%s/NakedBody/Idle.png" % ART)
	# A part the view no longer gives is no longer drawn.
	view.show_entry(NetMessages.seen_character(1, [5, 5], [], "orc", []))
	assert_null(view.sprite_for("head"))
	assert_not_null(view.sprite_for("body"))


func test_given_a_human_an_orc_and_a_goblin_when_they_are_drawn_then_the_humans_sprite_is_2_5_times_the_sheet_the_orc_1_4_wide_by_1_2_tall_of_that_and_the_goblin_0_75_of_that() -> void:
	var races: Dictionary = _json(LOOKS_DATA)["races"]
	assert_eq(races["human"]["size"], [1.0, 1.0])
	assert_eq(races["orc"]["size"], [1.4, 1.2])
	assert_eq(races["goblin"]["size"], [0.75, 0.75])
	var want := {"human": Vector2(2.5, 2.5), "orc": Vector2(3.5, 3.0), "goblin": Vector2(1.875, 1.875)}
	for race: String in want:
		var view := _character()
		view.show_entry(_entry(1, [5, 5], [], race))
		assert_almost_eq(view.stack.scale.x, want[race].x, 0.0001, "%s width" % race)
		assert_almost_eq(view.stack.scale.y, want[race].y, 0.0001, "%s height" % race)


func test_given_a_character_that_steps_in_each_of_the_8_directions_when_a_shot_of_each_is_taken_then_it_faces_the_way_it_steps_and_no_part_is_on_the_wrong_side_of_the_body() -> void:
	var frames := int(_json(CLIENT_DATA)["character"]["sheet"]["frames"])
	for d in 8:
		var view := _character()
		view.show_entry(_stepping(d))
		view.advance(0.05)
		assert_eq(view.facing, d, "faces %s" % NAMES[d])
		assert_eq(floori(view.sprite_for("body").frame / float(frames)), d,"row for %s" % NAMES[d])
		var way: Vector2 = (view.target - view.position).normalized()
		assert_almost_eq(way.dot(SCREEN_WAY[d].normalized()), 1.0, 0.001, "moves %s on the screen" % NAMES[d])
		var body := _index_of(view, "body")
		# The shield is on the left arm and the sword in the right hand.
		var shield_behind: bool = NAMES[d] in ["E", "SE", "N", "NE"]
		var sword_behind: bool = NAMES[d] in ["SW", "W", "NW", "N"]
		assert_eq(_index_of(view, "off_hand") < body, shield_behind, "shield side facing %s" % NAMES[d])
		assert_eq(_index_of(view, "main_hand") < body, sword_behind, "sword side facing %s" % NAMES[d])
		assert_eq(_index_of(view, "shadow"), 0, "shadow under all, facing %s" % NAMES[d])
		assert_gt(_index_of(view, "head"), _index_of(view, "chest"))


func test_given_a_view_that_says_a_character_is_stepping_onto_the_next_tile_when_frames_are_drawn_then_it_slides_there_over_the_walk_time_per_tile_and_does_not_jump_when_the_next_view_arrives() -> void:
	var look := _look()
	var view := _character(look, 0.3)
	view.show_entry(_entry(1, [3, 3], []))
	var start := look.screen([3, 3])
	assert_eq(view.position, start, "on its tile when it enters")
	view.show_entry(_entry(1, [3, 3], [4, 3]))
	var end := look.screen([4, 3])
	assert_eq(view.position, start, "does not move before a frame is drawn")
	view.advance(0.15)
	assert_almost_eq(view.position.x, (start.x + end.x) / 2.0, 0.01)
	assert_almost_eq(view.position.y, (start.y + end.y) / 2.0, 0.01)
	# The next view arrives early, with the character still stepping to a tile after it.
	var before := view.position
	view.show_entry(_entry(1, [4, 3], [5, 3]))
	assert_eq(view.position, before, "no jump when the next view arrives")
	view.advance(0.15)
	assert_almost_eq(view.position.x, end.x, 0.01, "reaches the tile one walk time after it set off")
	assert_almost_eq(view.position.y, end.y, 0.01)
	view.advance(0.3)
	var after := look.screen([5, 3])
	assert_almost_eq(view.position.x, after.x, 0.01)
	assert_almost_eq(view.position.y, after.y, 0.01)


func test_given_a_character_that_has_stopped_when_frames_are_drawn_then_it_plays_idle_on_its_tile_and_walk_while_it_slides() -> void:
	var look := _look()
	var view := _character(look, 0.3)
	view.show_entry(_entry(1, [3, 3], []))
	view.advance(0.1)
	assert_eq(view.anim, "Idle")
	view.show_entry(_entry(1, [3, 3], [4, 3]))
	view.advance(0.1)
	assert_eq(view.anim, "Walk")
	assert_eq(view.sprite_for("body").texture.resource_path, "%s/NakedBody/Walk.png" % ART)
	view.show_entry(_entry(1, [4, 3], []))
	view.advance(0.3)
	assert_eq(view.anim, "Idle")
	assert_eq(view.position, look.screen([4, 3]), "on its tile")
	assert_eq(view.sprite_for("body").texture.resource_path, "%s/NakedBody/Idle.png" % ART)
	assert_eq(view.facing, 1, "keeps facing the way it went")


func test_given_the_walk_animation_when_it_plays_then_it_plays_at_one_rate_on_every_side_the_se_straight_step_rate_from_the_settings() -> void:
	var client := _json(CLIENT_DATA)
	# D227: the test game's rate with fps_follows_direction off, for a human at 0.3 s a tile:
	# ground speed / (foot px a frame * sprite_scale), walking SE, one tile step (1, 0).
	var c: Dictionary = client["character"]
	var tile: Array = c["tile_px"]
	var ground := Vector2(tile[0] / 2.0, tile[1] / 2.0).length() / 0.3
	var se_rate := ground / (3.1 * float(c["sprite_scale"]))
	assert_almost_eq(se_rate, 30.78, 0.01, "the formula gives about 30.8")
	assert_almost_eq(float(c["walk_fps"]), se_rate, 0.05, "the setting is the SE straight-step rate")
	for d in 8:
		var view := _character()
		view.show_entry(_stepping(d))
		view.advance(0.05)
		assert_eq(view.fps_now, float(c["walk_fps"]), "%s plays at the one rate" % NAMES[d])
	# Change the setting and every side follows.
	client["character"]["walk_fps"] = 20.0
	var look := CharacterLook.from_dicts(client, _json(LOOKS_DATA))
	for d in 8:
		var view := _character(look)
		view.show_entry(_stepping(d))
		view.advance(0.05)
		assert_eq(view.fps_now, 20.0, NAMES[d])


func test_given_a_character_that_leaves_the_views_when_the_next_frame_is_drawn_then_it_is_off_the_screen_and_one_that_enters_appears_on_its_tile() -> void:
	var look := _look()
	var layer := CharacterLayer.new()
	add_child_autofree(layer)
	layer.setup(look)
	var state := ClientState.new()
	state.apply_welcome(NetMessages.welcome(1, 10, 0.3, 1, 1, [0], [0], []))
	state.apply_view(NetMessages.view(1, [_entry(1, [3, 3], []), _entry(2, [6, 4], [])], []))
	layer.sync(state)
	assert_eq(layer.drawn_ids(), [1, 2])
	assert_eq(layer.character_of(2).position, look.screen([6, 4]))
	state.apply_view(NetMessages.view(2, [_entry(1, [3, 3], []), _entry(3, [8, 8], [])], []))
	layer.sync(state)
	await wait_frames(1)
	assert_eq(layer.drawn_ids(), [1, 3])
	assert_null(layer.character_of(2))
	assert_eq(layer.get_child_count(), 2, "the one that left is off the screen")
	assert_eq(layer.character_of(3).position, look.screen([8, 8]), "the one that came in is on its tile")


func test_given_a_players_character_and_an_npc_in_a_view_when_each_is_drawn_then_the_same_scene_and_code_drew_both() -> void:
	var layer := CharacterLayer.new()
	add_child_autofree(layer)
	layer.setup(_look())
	var state := ClientState.new()
	state.apply_welcome(NetMessages.welcome(1, 10, 0.3, 1, 1, [0], [0], []))
	state.apply_view(NetMessages.view(1, [_entry(1, [3, 3], []), _entry(2, [6, 4], [], "goblin")], []))
	layer.sync(state)
	var you := layer.character_of(state.you)
	var npc := layer.character_of(2)
	assert_not_null(you)
	assert_not_null(npc)
	assert_eq(you.scene_file_path, SCENE)
	assert_eq(npc.scene_file_path, SCENE)
	assert_eq(you.get_script(), npc.get_script())
