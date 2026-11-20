class_name Sim
extends RefCounted
# The world stepped in fixed ticks (D175, D183). It moves only when step() is
# called: nothing here reads the clock, so tests and fast-forward runs need no
# waiting. All randomness comes from the world's own seeded generator.

var world: SimWorld
var settings: SimSettings
var tick: int = 0
var world_seed: int
var rng := RandomNumberGenerator.new()


func _init(seed_value: int, sim_settings: SimSettings, sim_world: SimWorld) -> void:
	world_seed = seed_value
	settings = sim_settings
	world = sim_world
	rng.seed = seed_value


var pathing: SimPathing:
	get:
		if _pathing == null:
			_pathing = SimPathing.new(world)
		return _pathing

var movement: SimMovement:
	get:
		if _movement == null:
			_movement = SimMovement.new(self, pathing, true)
		return _movement

var sight: SimSight:
	get:
		if _sight == null:
			_sight = SimSight.new(world, settings)
		return _sight

var doors: SimDoors:
	get:
		if _doors == null:
			_doors = SimDoors.new(world, movement, pathing)
		return _doors

var brain: SimNpcBrain:
	get:
		if _brain == null:
			_brain = SimNpcBrain.new(self, movement, sight, true)
		return _brain

# Built the first time something asks for them, so a world that never uses
# walking, doors or a brain pays for none of them.
var _pathing: SimPathing
var _movement: SimMovement
var _sight: SimSight
var _doors: SimDoors
var _brain: SimNpcBrain


# One tick: the brains think, the walks advance, characters that reached a door
# use it, then the tick number goes up.
func step() -> void:
	if _brain != null:
		_brain.step()
	if _movement != null:
		_movement.step()
	if _doors != null:
		_doors.step()
	tick += 1


func steps(count: int) -> void:
	for i in count:
		step()


# A number that is equal for equal worlds: tick, generator state and every
# character, in id order.
func state_hash() -> int:
	var parts: Array = [world_seed, tick, rng.state, world.width, world.height]
	# A world with no prop keeps the hash it always had.
	if world.props_digest() != 0:
		parts.append(world.props_digest())
	var ids: Array = world._characters.keys()
	ids.sort()
	for id in ids:
		var c: SimCharacter = world._characters[id]
		parts.append([c.id, c.pos.x, c.pos.y])
	return hash(parts)
