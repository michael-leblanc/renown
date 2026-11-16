extends GutTest
# Tests client/client_state.gd (CLI-001).


func _seen(id: int, x: int, y: int) -> Dictionary:
	return NetMessages.seen_character(id, [x, y], [], "human", [])


func _view(tick: int, characters: Array) -> Dictionary:
	return NetMessages.view(tick, characters, [])


func test_given_a_welcome_when_the_client_state_is_read_then_it_holds_the_land_and_its_own_character_id() -> void:
	var state := ClientState.new()
	state.apply_welcome(NetMessages.welcome(7, 10, 0.6, 2, 1, [1, 2], [0, 3], [[0, 0, 1, 0, "wall"]]))
	assert_eq(state.you, 7)
	assert_eq(state.tick_rate, 10)
	assert_eq(state.walk_time, 0.6)
	assert_eq(state.land["width"], 2)
	assert_eq(state.land["ground"], [1, 2])
	assert_eq(state.land["edges"], [[0, 0, 1, 0, "wall"]])


func test_given_views_arriving_when_the_client_state_is_read_then_it_holds_the_newest_view_and_the_one_before_for_every_character_in_sight_and_a_character_absent_from_the_newest_view_is_gone() -> void:
	var state := ClientState.new()
	state.apply_view(_view(1, [_seen(1, 3, 3), _seen(2, 5, 5)]))
	assert_eq(state.ids(), [1, 2])
	assert_eq(state.newest(1)["tile"], [3, 3])
	assert_false(state.has_before(1), "nothing before the first view")

	state.apply_view(_view(2, [_seen(1, 4, 3), _seen(2, 5, 6)]))
	assert_eq(state.newest(1)["tile"], [4, 3])
	assert_eq(state.before(1)["tile"], [3, 3])
	assert_eq(state.before(2)["tile"], [5, 5])
	assert_eq(state.tick, 2)

	# Character 2 leaves sight and a new one, 3, comes in.
	state.apply_view(_view(3, [_seen(1, 5, 3), _seen(3, 9, 9)]))
	assert_eq(state.ids(), [1, 3])
	assert_false(state.is_in_sight(2))
	assert_eq(state.newest(2), {})
	assert_eq(state.before(2), {})
	assert_eq(state.before(1)["tile"], [4, 3], "only the one before, not older")
	assert_false(state.has_before(3), "a character that just came in has none before")

	# Gone and back: no stale before.
	state.apply_view(_view(4, [_seen(1, 6, 3)]))
	state.apply_view(_view(5, [_seen(1, 7, 3), _seen(3, 9, 8)]))
	assert_false(state.has_before(3))


func test_given_a_view_with_doors_when_the_client_state_is_read_then_it_holds_the_doors_of_the_newest_view() -> void:
	var state := ClientState.new()
	state.apply_view(NetMessages.view(1, [], [NetMessages.seen_door([1, 1], [1, 2], "closed")]))
	state.apply_view(NetMessages.view(2, [], [NetMessages.seen_door([1, 1], [1, 2], "open")]))
	assert_eq(state.doors.size(), 1)
	assert_eq(state.doors[0]["state"], "open")


func test_given_a_new_welcome_when_it_arrives_then_the_views_held_before_are_dropped() -> void:
	var state := ClientState.new()
	state.apply_view(_view(1, [_seen(1, 3, 3)]))
	state.apply_welcome(NetMessages.welcome(1, 10, 0.6, 1, 1, [0], [0], []))
	assert_eq(state.ids(), [])
	assert_eq(state.tick, -1)
