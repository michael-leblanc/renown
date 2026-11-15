extends GutTest
# Tests sim/sight.gd (SIM-005).

const World := preload("res://sim/world.gd")
const Character := preload("res://sim/character.gd")
const Settings := preload("res://sim/settings.gd")
const Sight := preload("res://sim/sight.gd")


func _settings() -> Settings:
	return Settings.from_dict({
		"tick_rate": 10,
		"timings": {},
		"values": {"sight_distance": 16, "sight_bucket_size": 16},
	})


# Two characters on one row, `apart` tiles from each other, on open ground.
func _pair(w: World, a: Vector2i, b: Vector2i) -> Sight:
	w.add_character(Character.new(1), a)
	w.add_character(Character.new(2), b)
	var s := Sight.new(w, _settings())
	s.rebuild([w.get_character(1), w.get_character(2)])
	return s


func _mutual(s: Sight) -> bool:
	return s.in_sight(1).has(2) and s.in_sight(2).has(1)


func _neither(s: Sight) -> bool:
	return not s.in_sight(1).has(2) and not s.in_sight(2).has(1)


func test_two_characters_5_tiles_apart_on_open_ground_see_each_other() -> void:
	var w := World.new(64, 48)
	var s := _pair(w, Vector2i(10, 10), Vector2i(15, 10))
	assert_true(_mutual(s))


func test_two_characters_17_tiles_apart_on_open_ground_see_neither() -> void:
	var w := World.new(64, 48)
	var s := _pair(w, Vector2i(10, 10), Vector2i(27, 10))
	assert_true(_neither(s))


func test_tile_that_blocks_sight_between_them_hides_both() -> void:
	var w := World.new(64, 48)
	w.set_tile_flags(Vector2i(12, 10), false, true)
	var s := _pair(w, Vector2i(10, 10), Vector2i(15, 10))
	assert_true(_neither(s))


func test_tile_that_blocks_walking_but_not_sight_between_them_hides_nobody() -> void:
	var w := World.new(64, 48)
	w.set_tile_flags(Vector2i(12, 10), true, false)
	var s := _pair(w, Vector2i(10, 10), Vector2i(15, 10))
	assert_true(_mutual(s))


func test_edge_that_blocks_sight_crossed_by_the_line_hides_both() -> void:
	var w := World.new(64, 48)
	w.set_edge_flags(Vector2i(12, 10), Vector2i(13, 10), false, true)
	var s := _pair(w, Vector2i(10, 10), Vector2i(15, 10))
	assert_true(_neither(s))


func test_edge_that_blocks_sight_on_a_vertical_line_hides_both() -> void:
	var w := World.new(64, 48)
	w.set_edge_flags(Vector2i(10, 12), Vector2i(10, 13), false, true)
	var s := _pair(w, Vector2i(10, 10), Vector2i(10, 15))
	assert_true(_neither(s))


func test_edge_that_blocks_walking_but_not_sight_hides_nobody() -> void:
	var w := World.new(64, 48)
	w.set_edge_flags(Vector2i(12, 10), Vector2i(13, 10), true, false)
	var s := _pair(w, Vector2i(10, 10), Vector2i(15, 10))
	assert_true(_mutual(s))


func test_closed_door_hides_both_and_open_door_shows_both() -> void:
	var w := World.new(64, 48)
	w.set_door(Vector2i(12, 10), Vector2i(13, 10), false)
	var s := _pair(w, Vector2i(10, 10), Vector2i(15, 10))
	assert_true(_neither(s))
	w.set_door(Vector2i(12, 10), Vector2i(13, 10), true)
	s.rebuild([w.get_character(1), w.get_character(2)])
	assert_true(_mutual(s))


func test_line_through_a_corner_is_blocked_only_when_both_ways_around_are() -> void:
	# The line from (10,10) to (12,12) passes exactly through the corner (11,11).
	var w := World.new(64, 48)
	# L-shaped wall corner: two edges meeting at that corner point.
	w.set_edge_flags(Vector2i(10, 10), Vector2i(11, 10), false, true)
	w.set_edge_flags(Vector2i(10, 10), Vector2i(10, 11), false, true)
	var s := _pair(w, Vector2i(10, 10), Vector2i(12, 12))
	assert_true(_neither(s), "L-shaped corner hides")
	# The free end of a wall: only one way around is blocked.
	var w2 := World.new(64, 48)
	w2.set_edge_flags(Vector2i(10, 10), Vector2i(11, 10), false, true)
	var s2 := _pair(w2, Vector2i(10, 10), Vector2i(12, 12))
	assert_true(_mutual(s2), "free end of a wall shows")


func test_straight_wall_through_a_corner_hides_both() -> void:
	# The line from (10,10) to (12,12) passes exactly through the corner (11,11),
	# and a straight wall runs through that corner: both ways around cross it.
	var w := World.new(64, 48)
	w.set_edge_flags(Vector2i(10, 10), Vector2i(11, 10), false, true)
	w.set_edge_flags(Vector2i(10, 11), Vector2i(11, 11), false, true)
	var s := _pair(w, Vector2i(10, 10), Vector2i(12, 12))
	assert_true(_neither(s))


func test_a_character_facing_away_still_has_the_other_in_sight() -> void:
	# Characters have no facing in sight: whichever way one looks, the other
	# one is seen, and the one on the other side has the first in sight too.
	var w := World.new(64, 48)
	var s := _pair(w, Vector2i(10, 10), Vector2i(15, 10))
	assert_true(s.in_sight(1).has(2))
	assert_true(s.in_sight(2).has(1))


func test_with_1000_characters_only_nearby_buckets_are_compared() -> void:
	var w := World.new(512, 512)
	var rng := RandomNumberGenerator.new()
	rng.seed = 5
	var chars: Array = []
	for i in 1000:
		var c := Character.new(i)
		while not w.add_character(c, Vector2i(rng.randi_range(0, 511), rng.randi_range(0, 511))):
			pass
		chars.append(c)
	var s := Sight.new(w, _settings())
	s.rebuild(chars)
	var seen := s.in_sight(0)
	# Brute force: same answer, but compared against everyone.
	var expected: Array = []
	var me: Vector2i = chars[0].pos
	for c in chars:
		if c.id != 0 and (c.pos - me).length_squared() <= 16 * 16:
			expected.append(c.id)
	assert_eq(seen, expected)
	assert_lt(s.compared, 100, "only nearby buckets compared")
	assert_lt(s.compared, chars.size() / 10)
