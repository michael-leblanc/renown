extends SceneTree
# The headless server: steps the world by the clock (D173, D175).
# Run: scripts/godot.sh --headless --path game -s server/server_main.gd -- --tick-limit=50
# --tick-limit=N exits 0 after N ticks and prints the count. --seed=N sets the world seed.

const SETTINGS_PATH := "res://data/settings.json"
const LOOKS_PATH := "res://data/looks.json"

var _loop: ClockLoop
var _limit: int = 0


func _initialize() -> void:
	var world_seed := 0
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--tick-limit="):
			_limit = int(arg.trim_prefix("--tick-limit="))
		elif arg.begins_with("--seed="):
			world_seed = int(arg.trim_prefix("--seed="))
	var settings := SimSettings.load_file(SETTINGS_PATH)
	if settings == null:
		quit(1)
		return
	var looks := SimLooks.load_file(LOOKS_PATH)
	if looks == null:
		quit(1)
		return
	var stand_in := SimStandInWorld.build(world_seed, settings, looks)
	Engine.max_fps = settings.tick_rate * 4
	_loop = ClockLoop.new(stand_in.sim, Time.get_ticks_usec())


func _process(_delta: float) -> bool:
	if _loop == null:
		return true
	_loop.pump(Time.get_ticks_usec(), _limit - _loop.sim.tick if _limit > 0 else -1)
	if _limit > 0 and _loop.sim.tick >= _limit:
		print("ticks: %d" % _loop.sim.tick)
		quit(0)
		return true
	return false
