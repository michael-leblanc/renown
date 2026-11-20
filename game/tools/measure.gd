extends SceneTree
# The first measurement (D6, D184, D186): how long a tick takes with N stand-in NPCs
# on a 512 by 512 map, run headless. The NPCs think about once a second in turns
# (D181), wander by path-finding and work out who they have in sight (D179).
# For each count it prints the average and the worst tick in milliseconds over one
# game minute after a warm-up, and the state hash so two PCs can be compared.
# Then the NPC budget: the largest count whose worst tick is under 20 ms (D184),
# with the CPU name, the OS and the Godot version.
# Run: scripts/measure.sh [--count=N] [--budget-ms=MS]
#   --count=N       measure only that count and print only its line
#   --budget-ms=MS  the worst tick a budget may have (default 20, a fifth of a tick)
# Run it with nothing heavy going on the PC. Same seed, same world: every PC does
# exactly the same work, so the numbers compare.

const DEFAULT_COUNTS := [32, 100, 250, 500, 1000, 2000, 4000, 8000]
const MAP_SIZE := 512
const MEASURE_SEED := 186
const BLOCKED_SHARE := 0.15
const CLUMP_MIN := 3
const CLUMP_MAX := 9
const TOWN_TILES_PER_NPC := 100
const WARMUP_SECONDS := 10
const MEASURE_SECONDS := 60
const BUDGET_MS := 20.0
const SETTINGS_PATH := "res://data/settings.json"


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var counts := parse_counts(args)
	var budget_ms := parse_budget_ms(args)
	var single := counts.size() == 1 and counts != DEFAULT_COUNTS
	var settings := SimSettings.load_file(SETTINGS_PATH)
	var results: Array = []
	for n in counts:
		var r := measure(n, WARMUP_SECONDS * settings.tick_rate,
				MEASURE_SECONDS * settings.tick_rate, MEASURE_SEED, MAP_SIZE)
		results.append(r)
		if not single:
			print(result_line(r))
	var info := {
		"cpu": OS.get_processor_name(),
		"os": "%s %s" % [OS.get_distribution_name(), OS.get_version()],
		"godot": Engine.get_version_info()["string"],
	}
	if single:
		print(result_line(results[0]))
	else:
		var lines := report_lines(results, false, info, budget_ms)
		# The count lines were printed as they came; print the rest.
		for i in range(results.size(), lines.size()):
			print(lines[i])
	quit(0)


# --- Arguments and the report ------------------------------------------------

# The counts to measure: --count=N or a bare N, else the default list.
static func parse_counts(args: PackedStringArray) -> Array:
	for arg in args:
		var text := arg.trim_prefix("--count=")
		if text.is_valid_int() and int(text) > 0:
			return [int(text)]
	return DEFAULT_COUNTS.duplicate()


static func parse_budget_ms(args: PackedStringArray) -> float:
	for arg in args:
		if arg.begins_with("--budget-ms=") and arg.trim_prefix("--budget-ms=").is_valid_float():
			return float(arg.trim_prefix("--budget-ms="))
	return BUDGET_MS


static func result_line(r: Dictionary) -> String:
	return "%d NPCs: average %.3f ms, worst %.3f ms, hash %d" % [r.npcs, r.avg, r.worst, r.hash]


# The largest count whose worst tick is under the limit, or 0 when none is.
static func budget(results: Array, limit_ms: float) -> int:
	var best := 0
	for r in results:
		if r.worst < limit_ms:
			best = maxi(best, r.npcs)
	return best


# Every line of the output. One count alone gives just its line.
static func report_lines(results: Array, single: bool, info: Dictionary,
		limit_ms: float = BUDGET_MS) -> PackedStringArray:
	var lines := PackedStringArray()
	for r in results:
		lines.append(result_line(r))
	if single:
		return lines
	var largest := 0
	for r in results:
		largest = maxi(largest, r.npcs)
	var b := budget(results, limit_ms)
	if b == largest:
		lines.append("budget: more than %d NPCs (worst tick under %s ms)" % [largest, str(limit_ms)])
	elif b == 0:
		lines.append("budget: fewer than %d NPCs (worst tick under %s ms)" % [results[0].npcs, str(limit_ms)])
	else:
		lines.append("budget: %d NPCs (worst tick under %s ms)" % [b, str(limit_ms)])
	lines.append("cpu: %s" % info.cpu)
	lines.append("os: %s" % info.os)
	lines.append("godot: %s" % info.godot)
	return lines


# --- The run -----------------------------------------------------------------

# Builds a map_size by map_size world for `n` NPCs and steps it: `warmup` ticks
# unmeasured, then `ticks` timed one by one. Returns {npcs, avg, worst (ms), hash}.
# The run itself uses MAP_SIZE; tests pass a small map to stay fast.
static func measure(n: int, warmup: int, ticks: int, seed_value: int, map_size: int) -> Dictionary:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var world := make_map(map_size, rng)
	var placed := place_npcs(world, n, rng)
	var settings := SimSettings.load_file(SETTINGS_PATH)
	var sim := Sim.new(seed_value, settings, world)
	var brain := sim.brain
	for key in ["town_a", "town_b", "spread"]:
		for p: Vector2i in placed[key]:
			var id := world.new_character_id()
			world.add_character(SimCharacter.new(id), p)
			brain.attach(id)
	for i in warmup:
		sim.step()
	var total := 0
	var worst := 0
	for i in ticks:
		var started := Time.get_ticks_usec()
		sim.step()
		var took := Time.get_ticks_usec() - started
		total += took
		worst = maxi(worst, took)
	return {
		"npcs": n,
		"avg": total / 1000.0 / maxf(1.0, ticks),
		"worst": worst / 1000.0,
		"hash": sim.state_hash(),
	}


# --- The map -----------------------------------------------------------------

# Blocked clumps 3 to 9 tiles a side, a free tile apart, until about 15% of the
# map is blocked (D186). Stand-ins for buildings and rocks, not the land generator.
static func make_map(size: int, rng: RandomNumberGenerator) -> SimWorld:
	var w := SimWorld.new(size, size)
	var claimed := PackedByteArray()
	claimed.resize(size * size)
	var covered := 0
	var wanted := int(size * size * BLOCKED_SHARE)
	var tries := 0
	while covered < wanted and tries < 100000:
		tries += 1
		var cw := rng.randi_range(CLUMP_MIN, CLUMP_MAX)
		var ch := rng.randi_range(CLUMP_MIN, CLUMP_MAX)
		var x0 := rng.randi_range(2, size - cw - 2)
		var y0 := rng.randi_range(2, size - ch - 2)
		var clear := true
		for y in range(y0 - 1, y0 + ch + 1):
			for x in range(x0 - 1, x0 + cw + 1):
				if claimed[y * size + x] == 1:
					clear = false
					break
			if not clear:
				break
		if not clear:
			continue
		for y in range(y0 - 1, y0 + ch + 1):
			for x in range(x0 - 1, x0 + cw + 1):
				claimed[y * size + x] = 1
		for y in range(y0, y0 + ch):
			for x in range(x0, x0 + cw):
				w.set_blocked(Vector2i(x, y), true)
		covered += cw * ch
	return w


# --- The NPCs ----------------------------------------------------------------

# A quarter of the NPCs start in each of two towns, one per 100 tiles of town, and
# the rest (about half) are spread over the map (D186). A town is a square around
# a fixed centre; where the density can't fit on the map (the biggest counts) the
# square is cut to the map and the towns overlap. One NPC to a tile.
# Returns {town_a, town_b, spread: Array of Vector2i, rect_a, rect_b}.
static func place_npcs(world: SimWorld, n: int, rng: RandomNumberGenerator) -> Dictionary:
	var per_town := n / 4
	var rect_a := _town_rect(world, per_town, Vector2(0.25, 0.3))
	var rect_b := _town_rect(world, per_town, Vector2(0.7, 0.7))
	var taken := {}
	var town_a := _pick(world, rect_a, per_town, rng, taken)
	var town_b := _pick(world, rect_b, per_town, rng, taken)
	var spread := _pick(world, Rect2i(0, 0, world.width, world.height), n - 2 * per_town, rng, taken)
	return {"town_a": town_a, "town_b": town_b, "spread": spread, "rect_a": rect_a, "rect_b": rect_b}


static func _town_rect(world: SimWorld, npcs: int, centre: Vector2) -> Rect2i:
	var side := mini(int(ceil(sqrt(float(npcs * TOWN_TILES_PER_NPC)))), mini(world.width, world.height))
	var x := clampi(int(world.width * centre.x) - side / 2, 0, world.width - side)
	var y := clampi(int(world.height * centre.y) - side / 2, 0, world.height - side)
	return Rect2i(x, y, side, side)


# `count` distinct free tiles of the rect not yet taken, drawn in random order.
static func _pick(world: SimWorld, rect: Rect2i, count: int, rng: RandomNumberGenerator,
		taken: Dictionary) -> Array[Vector2i]:
	var tiles: Array[Vector2i] = []
	for y in range(rect.position.y, rect.end.y):
		for x in range(rect.position.x, rect.end.x):
			var p := Vector2i(x, y)
			if not world.tile_blocks_walking(p) and not taken.has(p):
				tiles.append(p)
	# A partial shuffle: the first `count` of the list are the draw.
	var out: Array[Vector2i] = []
	for i in mini(count, tiles.size()):
		var j := rng.randi_range(i, tiles.size() - 1)
		var t := tiles[j]
		tiles[j] = tiles[i]
		tiles[i] = t
		out.append(t)
		taken[t] = true
	return out
