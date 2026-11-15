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


func step() -> void:
	tick += 1


func steps(count: int) -> void:
	for i in count:
		step()


# A number that is equal for equal worlds: tick, generator state and every
# character, in id order.
func state_hash() -> int:
	var parts: Array = [world_seed, tick, rng.state, world.width, world.height]
	var ids: Array = world._characters.keys()
	ids.sort()
	for id in ids:
		var c: SimCharacter = world._characters[id]
		parts.append([c.id, c.pos.x, c.pos.y])
	return hash(parts)
