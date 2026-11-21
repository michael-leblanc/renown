extends GutTest
# Tests client/play/ and client/game.gd (CLI-004): the world as the client plays it.

const TILES_PATH := "res://data/tiles.json"
const CLIENT_PATH := "res://data/client.json"

var _stand_in: SimStandInWorld
var _state: ClientState
var _play: PlayView
var _sent: Array = []


func before_each() -> void:
	var sim_settings := SimSettings.load_file("res://data/settings.json")
	var looks := SimLooks.load_file("res://data/looks.json")
	_stand_in = SimStandInWorld.build(1, sim_settings, looks)
	_state = ClientState.new()
	_state.apply_welcome(ServerView.new(_stand_in.sim, sim_settings).welcome(1))
	_sent = []
	_play = PlayView.new()
	_play.setup(_state, ClientSettings.load_file(CLIENT_PATH), func(message: Dictionary) -> void: _sent.append(message))
	add_child_autofree(_play)


func _view(own: Vector2i, others: Array = [], stepping: Array = []) -> void:
	var seen: Array = [NetMessages.seen_character(1, [own.x, own.y], stepping, "human", [])]
	var next_id := 2
	for tile: Vector2i in others:
		seen.append(NetMessages.seen_character(next_id, [tile.x, tile.y], [], "orc", []))
		next_id += 1
	_state.apply_view(NetMessages.view(_state.tick + 1, seen, []))
	_play._process(0.0)


func _tile_middle(tile: Vector2i) -> Vector2:
	return _play.land.tile_to_world(Vector2(tile))


func _first_piece(kind: String, sides: Array) -> Node2D:
	for node: Node2D in _play.characters.get_children():
		if node.has_meta("kind") and node.get_meta("kind") == kind and node.get_meta("sides") == sides:
			return node
	return null


# The sorted layer as drawn, back to front: lower y first, the later child on a tie.
func _drawn_order() -> Array:
	var items: Array = []
	for i in _play.characters.get_child_count():
		var node := _play.characters.get_child(i) as Node2D
		items.append([node.position.y, i, node])
	items.sort_custom(func(a: Array, b: Array) -> bool: return a[0] < b[0] or (a[0] == b[0] and a[1] < b[1]))
	return items.map(func(item: Array) -> Node2D: return item[2])


func _key(code: Key) -> InputEventKey:
	var event := InputEventKey.new()
	event.keycode = code
	event.pressed = true
	return event


func test_given_a_welcomed_client_when_the_game_scene_shows_then_it_draws_the_land_and_every_character_in_the_view_with_the_camera_on_your_own_and_following_it() -> void:
	var start := _stand_in.waking_spot
	_view(start, [start + Vector2i(2, 0)])
	assert_gt(_play.land.ground.get_child_count(), 0)
	assert_eq(_play.characters.drawn_ids(), [1, 2])
	var mine := _play.characters.character_of(1)
	assert_eq(_play.camera.position, mine.position)
	_view(start, [start + Vector2i(2, 0)], [start.x, start.y + 1])
	mine.advance(0.1)
	_play._process(0.0)
	assert_ne(mine.position, _tile_middle(start))
	assert_eq(_play.camera.position, mine.position)


func test_given_a_click_in_the_middle_of_the_tile_10_east_and_12_south_of_the_corner_when_it_is_handled_then_the_walk_order_names_that_tile_and_so_for_each_corner() -> void:
	var size := _play.land.tiles.tile_size
	var middle := _tile_middle(Vector2i(10, 12))
	var spots := [Vector2.ZERO, Vector2(size.x * 0.4, 0), Vector2(-size.x * 0.4, 0), Vector2(0, size.y * 0.4), Vector2(0, -size.y * 0.4)]
	for spot: Vector2 in spots:
		_sent.clear()
		_play.click_at(middle + spot)
		assert_eq(_sent, [NetMessages.order_walk([10, 12])], "click at offset %s" % spot)


func test_given_a_click_on_a_free_tile_when_it_is_handled_then_a_walk_order_is_sent_and_your_character_moves_only_when_the_views_say_so() -> void:
	var start := _stand_in.waking_spot
	_view(start)
	var mine := _play.characters.character_of(1)
	var before := mine.position
	var goal := start + Vector2i(0, 2)
	_play.click_at(_tile_middle(goal))
	assert_eq(_sent, [NetMessages.order_walk([goal.x, goal.y])])
	mine.advance(1.0)
	_play._process(0.0)
	assert_eq(mine.position, before)
	assert_eq(_state.newest(1)["tile"], [start.x, start.y])
	_view(start, [], [start.x, start.y + 1])
	mine.advance(1.0)
	assert_ne(mine.position, before)


func test_given_a_click_on_a_door_when_it_is_handled_then_an_order_to_use_that_door_is_sent() -> void:
	var node: Node2D = _play.land.door_nodes[0]
	var sprite := node.get_node("Sprite") as Sprite2D
	var image := sprite.texture.get_image()
	if image.is_compressed():
		image.decompress()
	image.convert(Image.FORMAT_RGBA8)
	var hit := Vector2(-1, -1)
	for y in image.get_height():
		for x in image.get_width():
			if hit.x < 0 and image.get_pixel(x, y).a > 0.5:
				hit = Vector2(x + 0.5, y + 0.5)
	assert_gt(hit.x, 0.0)
	_play.click_at(node.position + sprite.position + sprite.offset + hit)
	var edge: Array = node.get_meta("edge")
	assert_eq(_sent, [NetMessages.order_door([edge[0].x, edge[0].y], [edge[1].x, edge[1].y])])


func test_given_a_click_outside_the_map_when_it_is_handled_then_nothing_is_sent_and_nothing_breaks() -> void:
	var width: int = _state.land["width"]
	var height: int = _state.land["height"]
	for tile in [Vector2i(-3, -3), Vector2i(width + 2, 0), Vector2i(0, height + 2), Vector2i(-1, 5)]:
		assert_eq(_play.click_at(_tile_middle(tile)), {})
	assert_eq(_play.click_at(Vector2(1.0e6, -1.0e6)), {})
	assert_eq(_sent, [])


func test_given_a_character_behind_a_wall_or_a_tree_and_one_in_front_when_a_shot_is_taken_then_the_first_is_hidden_by_it_and_the_second_hides_it() -> void:
	var tree := _first_piece("tree", [])
	var wall := _first_piece("wall", ["E"])
	assert_not_null(tree)
	assert_not_null(wall)
	for piece: Node2D in [tree, wall]:
		var tile: Vector2i = piece.get_meta("tile")
		_view(tile + Vector2i(-1, -1), [tile + Vector2i(1, 1)])
		var order := _drawn_order()
		var behind := _play.characters.character_of(1)
		var front := _play.characters.character_of(2)
		assert_lt(order.find(behind), order.find(piece), "behind %s" % piece.name)
		assert_gt(order.find(front), order.find(piece), "in front of %s" % piece.name)


func test_given_the_f3_key_when_it_is_pressed_then_the_screen_shows_frames_a_second_and_how_many_characters_are_drawn_and_a_second_press_hides_it() -> void:
	_view(_stand_in.waking_spot, [_stand_in.waking_spot + Vector2i(2, 0)])
	assert_false(_play.stats.visible)
	_play._unhandled_input(_key(KEY_F3))
	assert_true(_play.stats.visible)
	assert_true(_play.stats.text.contains("frames a second"))
	assert_true(_play.stats.text.contains("2 characters"))
	_play._unhandled_input(_key(KEY_F3))
	assert_false(_play.stats.visible)


func test_given_the_window_resized_when_the_next_frame_is_drawn_then_the_camera_is_still_on_your_character() -> void:
	_view(_stand_in.waking_spot)
	var mine := _play.characters.character_of(1)
	get_window().size = Vector2i(900, 520)
	await get_tree().process_frame
	_play._process(0.0)
	assert_eq(_play.camera.get_screen_center_position(), mine.position)
	get_window().size = Vector2i(640, 480)
	await get_tree().process_frame
	_play._process(0.0)
	assert_eq(_play.camera.get_screen_center_position(), mine.position)


func test_given_a_click_on_a_free_tile_when_it_is_handled_then_the_move_spot_plays_once_on_that_tile_at_the_frames_and_speed_in_anim_json_and_is_gone_after_its_last_frame() -> void:
	var strip: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(PlayView.ANIM_PATH))[PlayView.SPOT_NAME]
	var goal := _stand_in.waking_spot + Vector2i(0, 2)
	_play.click_at(_tile_middle(goal))
	assert_not_null(_play.spot)
	assert_eq(_play.spot.position, _tile_middle(goal))
	assert_eq(_play.spot.hframes, int(strip["frames"]))
	assert_eq(_play.spot.frame, 0)
	_play._process(1.5 / float(strip["fps"]))
	assert_eq(_play.spot.frame, 1)
	_play._process(float(strip["frames"]) / float(strip["fps"]))
	assert_null(_play.spot)
	assert_null(_play.land.get_node_or_null("MoveSpot"))


func test_given_a_second_click_before_the_first_spot_ends_when_it_is_handled_then_the_first_spot_goes_and_a_new_one_plays_on_the_new_tile() -> void:
	var first := _stand_in.waking_spot + Vector2i(0, 2)
	var second := _stand_in.waking_spot + Vector2i(2, 0)
	_play.click_at(_tile_middle(first))
	var old := _play.spot
	_play.click_at(_tile_middle(second))
	assert_ne(_play.spot, old)
	assert_eq(_play.spot.position, _tile_middle(second))
	await get_tree().process_frame
	assert_false(is_instance_valid(old))
	var count := 0
	for node in _play.land.get_children():
		if node.name.begins_with("MoveSpot"):
			count += 1
	assert_eq(count, 1)


func test_given_a_click_outside_the_map_when_it_is_handled_then_no_spot_plays() -> void:
	_play.click_at(_tile_middle(Vector2i(-3, -3)))
	assert_null(_play.spot)


func test_given_a_character_standing_on_the_clicked_tile_when_the_spot_plays_then_it_is_drawn_under_the_character_not_over_it() -> void:
	var start := _stand_in.waking_spot
	_view(start)
	_play.click_at(_tile_middle(start))
	assert_lt(_play.spot.get_index(), _play.characters.get_index())
	assert_eq(_play.spot.z_index, 0)
	assert_eq(_play.characters.z_index, 0)
