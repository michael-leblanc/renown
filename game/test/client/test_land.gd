extends GutTest
# Tests client/land/ (CLI-002): the land drawn from what the welcome and the views say.

const TILES_PATH := "res://data/tiles.json"
const CLIENT_PATH := "res://data/client.json"

var _stand_in: SimStandInWorld
var _state: ClientState
var _settings: ClientSettings
var _land: Land


func before_each() -> void:
	var sim_settings := SimSettings.load_file("res://data/settings.json")
	var looks := SimLooks.load_file("res://data/looks.json")
	_stand_in = SimStandInWorld.build(1, sim_settings, looks)
	_state = ClientState.new()
	_state.apply_welcome(ServerView.new(_stand_in.sim, sim_settings).welcome(1))
	_settings = ClientSettings.load_file(CLIENT_PATH)
	_land = Land.new()
	_land.setup(_state, _settings, LandTiles.load_file(TILES_PATH))
	add_child_autofree(_land)
	_land.build()


# A view with only your own character, on `tile`, and the door as given.
func _view_at(tile: Vector2i, door_state := "closed") -> void:
	var door := _stand_in.door_inside
	var outside := _stand_in.door_outside
	_state.apply_view(NetMessages.view(1, [NetMessages.seen_character(1, [tile.x, tile.y], [], "human", [])],
		[NetMessages.seen_door([door.x, door.y], [outside.x, outside.y], door_state)]))
	_land.refresh()


# The objects layer as drawn, back to front: lower y first, the later child on a tie.
func _drawn_order() -> Array:
	var items: Array = []
	for i in _land.objects.get_child_count():
		var node := _land.objects.get_child(i) as Node2D
		items.append([node.position.y, i, node])
	items.sort_custom(func(a: Array, b: Array) -> bool: return a[0] < b[0] or (a[0] == b[0] and a[1] < b[1]))
	return items.map(func(item: Array) -> Node2D: return item[2])


func _marker(at: Vector2) -> Node2D:
	var marker := Node2D.new()
	marker.position = at
	_land.objects.add_child(marker)
	return marker


func _files_in(dir_path: String, extension: String) -> Array:
	var found: Array = []
	var dir := DirAccess.open(dir_path)
	for file in dir.get_files():
		if file.get_extension() == extension:
			found.append(dir_path.path_join(file))
	return found


func test_given_the_tileset_pngs_when_the_task_is_committed_then_they_are_under_game_client_art_tiles_and_nothing_under_game_reads_from_prototype() -> void:
	assert_false(DirAccess.dir_exists_absolute(ProjectSettings.globalize_path("res://../prototype/art/tiles")))
	assert_gt(_files_in("res://client/art/tiles", "png").size(), 20)
	var needle := "proto" + "type"
	var checked := 0
	for dir_path in ["res://client", "res://client/land", "res://client/connect"]:
		for extension in ["gd", "tscn"]:
			for path: String in _files_in(dir_path, extension):
				checked += 1
				assert_false(FileAccess.get_file_as_string(path).contains(needle), path)
	assert_false(FileAccess.get_file_as_string(TILES_PATH).contains(needle))
	assert_gt(checked, 5)


func test_given_the_welcome_of_the_stand_in_world_when_the_land_is_drawn_then_every_tile_shows_a_ground_piece_every_tree_and_rock_shows_with_its_shadow_and_the_walls_stand_on_the_edges() -> void:
	assert_eq(_land.ground.get_child_count(), 64 * 64)
	var trees := 0
	var rocks := 0
	for prop: int in _state.land["props"]:
		trees += 1 if prop == 1 else 0
		rocks += 1 if prop == 2 else 0
	assert_gt(trees, 0)
	assert_gt(rocks, 0)
	var seen_trees := 0
	var seen_rocks := 0
	var walls := 0
	var covered := 0
	for node: Node2D in _land.objects.get_children():
		match node.get_meta("kind"):
			"tree":
				seen_trees += 1
			"rock":
				seen_rocks += 1
			"wall":
				walls += 1
				covered += (node.get_meta("sides") as Array).size()
	assert_eq(seen_trees, trees)
	assert_eq(seen_rocks, rocks)
	assert_eq(_land.shadows.get_child_count(), trees + rocks, "one shadow for each tree and rock")
	# 18 edges round a 5 by 4 building, 1 of them the door; the 4 corners are one piece for two edges.
	assert_eq(covered, 2 * 5 + 2 * 4 - 1)
	assert_eq(walls, covered - 4)
	for node: Node2D in _land.objects.get_children():
		if node.get_meta("kind") == "wall":
			var tile: Vector2i = node.get_meta("tile")
			assert_true(Rect2i(_stand_in.building).has_point(tile), "a wall belongs to a floor tile of the building")


func test_given_a_closed_door_when_it_is_drawn_then_the_door_piece_stands_on_its_edge_and_an_open_door_draws_nothing_there() -> void:
	var door := _land.door_nodes[0] as Node2D
	assert_true(door.visible, "closed before any view")
	assert_eq(door.get_meta("kind"), "door")
	assert_eq(door.get_meta("tile"), _stand_in.door_inside)
	assert_eq(door.get_meta("sides"), ["S"])
	assert_eq(door.position.y, _land.tile_to_world(Vector2(_stand_in.door_inside)).y + 16.0, "on the south-west edge of its floor tile")
	_view_at(_stand_in.waking_spot, "open")
	assert_false(door.visible)


func test_given_a_view_that_says_a_door_changed_when_the_next_frame_is_drawn_then_the_door_is_drawn_in_its_new_state() -> void:
	var door := _land.door_nodes[0] as Node2D
	_view_at(_stand_in.waking_spot, "closed")
	assert_true(door.visible)
	_view_at(_stand_in.waking_spot, "open")
	assert_false(door.visible)
	_view_at(_stand_in.waking_spot, "closed")
	assert_true(door.visible)


func test_given_a_test_marker_behind_a_wall_and_one_in_front_when_a_shot_is_taken_then_the_wall_hides_the_first_and_the_second_hides_the_wall_and_the_same_holds_for_a_tree() -> void:
	var b := _stand_in.building
	var wall: Node2D = null
	var tree: Node2D = null
	for node: Node2D in _land.objects.get_children():
		if node.get_meta("kind") == "wall" and node.get_meta("tile") == Vector2i(b.end.x - 1, b.position.y + 1):
			wall = node
		if node.get_meta("kind") == "tree" and tree == null:
			tree = node
	assert_not_null(wall)
	assert_not_null(tree)
	for pair: Array in [[wall, 10.0], [tree, 24.0]]:
		var piece: Node2D = pair[0]
		var gap: float = pair[1]
		var behind := _marker(piece.position + Vector2(0, -gap))
		var front := _marker(piece.position + Vector2(0, gap))
		var order := _drawn_order()
		assert_lt(order.find(behind), order.find(piece), "the piece hides the marker behind it")
		assert_gt(order.find(front), order.find(piece), "the marker in front hides the piece")


func test_given_your_character_on_a_tile_that_carries_the_buildings_place_when_the_land_is_drawn_then_the_walls_on_the_near_side_are_faded_to_the_alpha_in_the_settings_and_when_outside_they_are_whole() -> void:
	var alpha := _settings.number("near_wall_alpha")
	assert_lt(alpha, 1.0)
	var near := 0
	var far := 0
	_view_at(Vector2i(_stand_in.building.position) + Vector2i(2, 1))
	for node: Node2D in _land.wall_nodes + _land.door_nodes:
		var sides: Array = node.get_meta("sides")
		if sides.has("E") or sides.has("S"):
			near += 1
			assert_almost_eq(node.modulate.a, alpha, 0.0001, "near wall %s" % [node.get_meta("tile")])
		else:
			far += 1
			assert_eq(node.modulate.a, 1.0, "far wall stays whole")
	assert_gt(near, 0)
	assert_gt(far, 0)
	_view_at(_stand_in.waking_spot)
	for node: Node2D in _land.wall_nodes + _land.door_nodes:
		assert_eq(node.modulate.a, 1.0, "whole outside")


func test_given_which_png_draws_a_ground_kind_a_prop_a_wall_or_a_door_when_the_code_is_read_then_every_file_name_comes_from_tiles_json_and_none_is_written_in_code() -> void:
	var names := LandTiles.load_file(TILES_PATH).all_pieces()
	assert_gt(names.size(), 10)
	for piece: String in names:
		assert_true(FileAccess.file_exists("res://client/art/tiles/%s.png" % piece), piece)
	var banned := RegEx.create_from_string("\\.png|\"(Ground|Tree|Stone|Wall|Door|Shadow)")
	var checked := 0
	for path: String in _files_in("res://client/land", "gd"):
		checked += 1
		var code := FileAccess.get_file_as_string(path)
		assert_null(banned.search(code), "%s writes a file name" % path)
		for piece: String in names:
			assert_false(code.contains(piece), "%s writes %s" % [path, piece])
	assert_gt(checked, 1)
