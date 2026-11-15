extends GutTest
# Tests sim/npc_brain.gd (SIM-006).

const Sim := preload("res://sim/sim.gd")
const World := preload("res://sim/world.gd")
const Character := preload("res://sim/character.gd")
const Movement := preload("res://sim/movement.gd")
const Pathing := preload("res://sim/pathing.gd")
const Sight := preload("res://sim/sight.gd")
const Brain := preload("res://sim/npc_brain.gd")


class Rig:
	var world: SimWorld
	var movement: SimMovement
	var brain: SimNpcBrain


func _rig(world: SimWorld, npc_ids: Array, at: Array) -> Rig:
	var r := Rig.new()
	r.world = world
	for i in npc_ids.size():
		world.add_character(Character.new(npc_ids[i]), at[i])
	var settings := SimSettings.load_file("res://data/settings.json")
	var sim := Sim.new(7, settings, world)
	r.movement = Movement.new(sim, Pathing.new(world))
	r.brain = Brain.new(sim, r.movement, Sight.new(world, settings))
	for id in npc_ids:
		r.brain.attach(id)
	return r


# One tick: the brain thinks, then the walks advance.
func _tick(r: Rig) -> void:
	r.brain.step()
	r.movement.step()


func _crowd(n: int) -> Rig:
	var w := World.new(40, 40)
	var ids: Array = []
	var at: Array = []
	for i in n:
		ids.append(i + 1)
		at.append(Vector2i(2 + (i % 10) * 3, 2 + (i / 10) * 3))
	return _rig(w, ids, at)


func test_given_100_npcs_and_a_think_interval_of_1_second_when_10_ticks_run_then_every_npc_has_thought_exactly_once() -> void:
	var r := _crowd(100)
	for i in 10:
		_tick(r)
	for id in range(1, 101):
		assert_eq(r.brain.think_count(id), 1, "npc %d" % id)


func test_given_100_npcs_when_any_single_tick_runs_then_exactly_10_of_them_think_in_it() -> void:
	var r := _crowd(100)
	for i in 25:
		_tick(r)
		assert_eq(r.brain.thought_last_step, 10, "tick %d" % i)


func test_given_two_possible_actions_with_different_scores_when_an_npc_thinks_then_it_does_the_one_with_the_higher_score() -> void:
	var r := _rig(World.new(10, 10), [1], [Vector2i(5, 5)])
	var did: Array = []
	r.brain.clear_actions()
	r.brain.add_action("low", func(_id): return 1.0, func(_id): did.append("low"))
	r.brain.add_action("high", func(_id): return 3.0, func(_id): did.append("high"))
	r.brain.add_action("mid", func(_id): return 2.0, func(_id): did.append("mid"))
	_tick(r)
	assert_eq(did, ["high"])


func test_given_an_npc_with_nothing_else_to_do_when_it_thinks_then_it_picks_a_free_tile_nearby_walks_there_and_keeps_walking_between_two_thoughts() -> void:
	var w := World.new(30, 30)
	var r := _rig(w, [1], [Vector2i(15, 15)])
	var radius := int(SimSettings.load_file("res://data/settings.json").value("npc_wander_radius"))
	r.brain.step()
	assert_eq(r.movement.status(1), Movement.WALKING)
	var start := Vector2i(15, 15)
	var moved_at: Array = []
	for i in 9: # up to just before the next thought
		r.movement.step()
		if w.get_character(1).pos != start:
			moved_at.append(i)
	assert_gt(moved_at.size(), 1, "kept walking after the thought, over several ticks")
	var pos := w.get_character(1).pos
	assert_ne(pos, start)
	assert_lte(maxi(absi(pos.x - 15), absi(pos.y - 15)), radius, "nearby")
	assert_true(w.is_free(pos) or w.character_at(pos) == 1)


func test_given_an_npc_that_thinks_when_the_thought_ends_then_its_list_of_characters_in_sight_is_fresh() -> void:
	var w := World.new(30, 30)
	var r := _rig(w, [1], [Vector2i(5, 5)])
	r.brain.clear_actions()
	w.add_character(Character.new(2), Vector2i(8, 5))
	_tick(r)
	assert_eq(r.brain.in_sight(1), [2])
	w.move_character(2, Vector2i(29, 29))
	for i in 9:
		_tick(r)
	_tick(r) # second thought
	assert_eq(r.brain.in_sight(1), [])


func test_given_a_character_with_no_brain_attached_when_ticks_run_then_nothing_moves_it() -> void:
	var w := World.new(20, 20)
	var r := _rig(w, [1], [Vector2i(5, 5)])
	w.add_character(Character.new(2), Vector2i(10, 10))
	for i in 50:
		_tick(r)
	assert_eq(w.get_character(2).pos, Vector2i(10, 10))
