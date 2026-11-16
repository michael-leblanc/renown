extends GutTest
# Tests sim/doors.gd (SIM-011).

const Sim := preload("res://sim/sim.gd")
const World := preload("res://sim/world.gd")
const Character := preload("res://sim/character.gd")
const Movement := preload("res://sim/movement.gd")
const Pathing := preload("res://sim/pathing.gd")
const Sight := preload("res://sim/sight.gd")
const Brain := preload("res://sim/npc_brain.gd")
const Doors := preload("res://sim/doors.gd")

const A := Vector2i(10, 10)
const B := Vector2i(11, 10)


class Rig:
	var world: SimWorld
	var pathing: SimPathing
	var movement: SimMovement
	var doors: SimDoors
	var settings: SimSettings


# A world with a closed door between A and B and a character 1 at `start`.
func _rig(start: Vector2i, blocked: Array = []) -> Rig:
	var r := Rig.new()
	r.world = World.new(30, 30)
	for p in blocked:
		r.world.set_blocked(p, true)
	r.world.set_door(A, B, false)
	r.world.add_character(Character.new(1), start)
	r.settings = SimSettings.load_file("res://data/settings.json")
	var sim := Sim.new(1, r.settings, r.world)
	r.pathing = Pathing.new(r.world)
	r.movement = Movement.new(sim, r.pathing)
	r.doors = Doors.new(r.world, r.movement, r.pathing)
	return r


func _tick(r: Rig, n: int) -> void:
	for i in n:
		r.movement.step()
		r.doors.step()


func test_a_closed_door_opens_and_an_open_door_closes_for_a_character_on_one_of_its_tiles() -> void:
	var r := _rig(A)
	assert_true(r.doors.use(1, A, B))
	assert_true(r.world.door_is_open(A, B))
	assert_true(r.doors.use(1, B, A))
	assert_false(r.world.door_is_open(A, B))
	r.world.move_character(1, B)
	assert_true(r.doors.use(1, A, B))
	assert_true(r.world.door_is_open(A, B))


func test_a_character_elsewhere_walks_to_the_nearer_tile_and_the_door_changes_on_arrival() -> void:
	var r := _rig(Vector2i(14, 10))
	assert_true(r.doors.use(1, A, B))
	assert_false(r.world.door_is_open(A, B), "not yet")
	_tick(r, 60)
	assert_eq(r.world.get_character(1).pos, B, "the nearer tile")
	assert_true(r.world.door_is_open(A, B))


func test_a_door_across_a_wall_is_used_from_the_tile_that_can_be_reached() -> void:
	var r := _rig(Vector2i(14, 10), [B])
	assert_true(r.doors.use(1, A, B))
	_tick(r, 120)
	assert_eq(r.world.get_character(1).pos, A)
	assert_true(r.world.door_is_open(A, B))


func test_a_closed_door_on_the_path_is_open_after_the_step_across_it_and_stays_open() -> void:
	var r := _rig(A)
	r.movement.order(1, B)
	_tick(r, 3)
	assert_eq(r.world.get_character(1).pos, B)
	assert_true(r.world.door_is_open(A, B))
	_tick(r, 10)
	assert_true(r.world.door_is_open(A, B))


func test_sight_across_a_door_edge_is_clear_only_while_the_door_is_open() -> void:
	var r := _rig(Vector2i(8, 10))
	r.world.add_character(Character.new(2), Vector2i(14, 10))
	var sight := Sight.new(r.world, r.settings)
	var both := [r.world.get_character(1), r.world.get_character(2)]
	sight.rebuild(both)
	assert_false(sight.in_sight(1).has(2), "closed")
	r.world.move_character(1, A)
	r.doors.use(1, A, B)
	sight.rebuild(both)
	assert_true(sight.in_sight(1).has(2), "open")
	r.doors.use(1, A, B)
	sight.rebuild(both)
	assert_false(sight.in_sight(1).has(2), "closed again")


func test_an_order_to_use_an_edge_with_no_door_is_refused_and_nothing_changes() -> void:
	var r := _rig(Vector2i(14, 10))
	assert_false(r.doors.use(1, Vector2i(14, 12), Vector2i(15, 12)))
	assert_false(r.doors.use(1, A, Vector2i(12, 10)), "not an edge")
	assert_false(r.world.door_is_open(A, B))
	_tick(r, 30)
	assert_eq(r.world.get_character(1).pos, Vector2i(14, 10))
	assert_eq(r.movement.status(1), Movement.NONE)


func test_a_character_with_a_brain_that_walks_across_a_closed_door_opens_it_the_same_way() -> void:
	var r := _rig(A)
	var sim := Sim.new(1, r.settings, r.world)
	var brain := Brain.new(sim, r.movement, Sight.new(r.world, r.settings))
	brain.attach(1)
	r.movement.order(1, B)
	_tick(r, 3)
	assert_eq(r.world.get_character(1).pos, B)
	assert_true(r.world.door_is_open(A, B))


func test_a_door_that_changes_runs_no_relabel() -> void:
	var r := _rig(Vector2i(14, 10))
	var before: int = r.pathing.relabels
	r.doors.use(1, A, B)
	_tick(r, 60)
	r.doors.use(1, A, B)
	assert_false(r.world.door_is_open(A, B))
	assert_eq(r.pathing.relabels, before)
