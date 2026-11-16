class_name SimStandInWorld
extends RefCounted
# The stand-in world the server starts with (D214): grass, one walled building
# with a door, trees and rocks, a waking spot, and NPCs with the stand-in
# brain. Made in code from the seed, using only the world's own generator.
# This stands in until the land generator (D136). Every number is a setting.

const LOOKS_PATH := "res://data/looks.json"
const OUTFIT := "starting"

var sim: Sim
var building: Rect2i
var place_id: int = 1
var door_inside: Vector2i
var door_outside: Vector2i
var waking_spot: Vector2i
var npc_ids: Array[int] = []


static func build(world_seed: int, settings: SimSettings, looks: SimLooks) -> SimStandInWorld:
	var s := SimStandInWorld.new()
	var width := int(settings.value("map_width"))
	var height := int(settings.value("map_height"))
	var world := SimWorld.new(width, height)
	s.sim = Sim.new(world_seed, settings, world)
	s._build_building(settings)
	s._scatter_props(settings)
	s._join_areas()
	s._add_npcs(settings, looks)
	return s


func _build_building(settings: SimSettings) -> void:
	var world := sim.world
	var size := Vector2i(int(settings.value("building_width")), int(settings.value("building_height")))
	building = Rect2i((Vector2i(world.width, world.height) - size) / 2, size)
	world.set_place_rect(building, place_id)
	for x in range(building.position.x, building.end.x):
		world.set_edge_flags(Vector2i(x, building.position.y - 1), Vector2i(x, building.position.y), true, true)
		world.set_edge_flags(Vector2i(x, building.end.y - 1), Vector2i(x, building.end.y), true, true)
	for y in range(building.position.y, building.end.y):
		world.set_edge_flags(Vector2i(building.position.x - 1, y), Vector2i(building.position.x, y), true, true)
		world.set_edge_flags(Vector2i(building.end.x - 1, y), Vector2i(building.end.x, y), true, true)
	# The door is on the south wall, in the middle: an edge a walk crosses (D191).
	var door_x := building.position.x + building.size.x / 2
	door_inside = Vector2i(door_x, building.end.y - 1)
	door_outside = Vector2i(door_x, building.end.y)
	world.set_edge_flags(door_inside, door_outside, false, false)
	world.set_door(door_inside, door_outside, false)
	waking_spot = door_outside + Vector2i(0, int(settings.value("waking_distance")))


func _scatter_props(settings: SimSettings) -> void:
	var world := sim.world
	var keep_off := int(settings.value("door_clear_distance"))
	var candidates: Array[Vector2i] = []
	var outside := 0
	for y in world.height:
		for x in world.width:
			var p := Vector2i(x, y)
			if building.has_point(p):
				continue
			outside += 1
			if p == waking_spot:
				continue
			if maxi(absi(p.x - door_outside.x), absi(p.y - door_outside.y)) <= keep_off:
				continue
			candidates.append(p)
	var count := mini(roundi(outside * float(settings.value("prop_share"))), candidates.size())
	var rock_share := float(settings.value("rock_share"))
	# A partial shuffle: the first `count` picks, drawn from the world's generator.
	for i in count:
		var j := sim.rng.randi_range(i, candidates.size() - 1)
		var picked := candidates[j]
		candidates[j] = candidates[i]
		candidates[i] = picked
		var kind := SimWorld.PROP_ROCK if sim.rng.randf() < rock_share else SimWorld.PROP_TREE
		world.set_prop(picked, kind)


# Props can wall off free tiles. Until every free tile is in the waking spot's
# area, a prop beside a cut-off tile is removed, picked by the world's generator.
func _join_areas() -> void:
	var world := sim.world
	while true:
		var area := SimPathing.label_areas(world)
		var main := area[waking_spot.y * world.width + waking_spot.x]
		var beside: Array[Vector2i] = []
		for y in world.height:
			for x in world.width:
				var a := area[y * world.width + x]
				if a == SimPathing.NO_AREA or a == main:
					continue
				var p := Vector2i(x, y)
				for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
					var q: Vector2i = p + d
					if world.prop_at(q) != SimWorld.PROP_NONE and world.tile_blocks_walking(q) \
							and not world.edge_blocks_walking(p, q) and not beside.has(q):
						beside.append(q)
		if beside.is_empty():
			return
		world.set_prop(beside[sim.rng.randi_range(0, beside.size() - 1)], SimWorld.PROP_NONE)


func _add_npcs(settings: SimSettings, looks: SimLooks) -> void:
	var world := sim.world
	var count := int(settings.value("npc_count"))
	var brain := sim.brain
	var id := 1
	while npc_ids.size() < count:
		var p := Vector2i(sim.rng.randi_range(0, world.width - 1), sim.rng.randi_range(0, world.height - 1))
		if p == waking_spot or not world.is_free(p):
			continue
		var c := SimCharacter.new(id)
		world.add_character(c, p)
		looks.give_look(c, looks.roll_race(sim.rng), OUTFIT)
		brain.attach(id)
		npc_ids.append(id)
		id += 1
