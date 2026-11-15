extends Node2D
## The play scene (PRO-005, test game D201): the seeded patch of PRO-002 with the
## human of PRO-003 in it. Click the ground and the human walks there along the
## shortest path, one tile every `tile_seconds` (0.3 s = about 3.3 tiles a second,
## D185), never cutting a corner, opening the door when its next step is the door
## (a closed door never blocks a walk, D191). Throwaway: it follows none of
## game/sim/'s rules.
##
## Run:  scripts/godot.sh --path prototype res://play/play.tscn [flags]
## Flags (all optional):
##   --seed N        world seed (default 1)
##   --zoom Z        camera zoom (default from play_data.json)
##   --click X,Y     start with a click on that tile
##   --advance S     then let S seconds pass at once (for --shot)
## Mouse: left click on the ground walks there; right click on the door opens or
## closes it; wheel zooms.
## Keys: [ or - lower the walk time per tile (faster), ] or = raise it (slower),
## P shows or hides the path.

const CharacterScene := preload("res://character/character_scene.gd")
const CharacterScript := preload("res://character/character.gd")
const DATA_PATH := "res://play/play_data.json"
const WORLD_SCENE := "res://world/world.tscn"

## Set before adding to the tree to override --seed.
var seed_override := -1

var settings: Dictionary
var char_data: Dictionary
var world: World
var human: Node2D
var camera: Camera2D
var pathfinder: Pathfinder

var cell := Vector2i.ZERO          # the tile the human stands on (the one it leaves while stepping)
var path: Array[Vector2i] = []     # the tiles still to walk, next first
var moving := false               # true between two tiles
var step_from := Vector2i.ZERO
var step_to := Vector2i.ZERO
var progress := 0.0               # 0..1 through the current step
var last_click := "-"             # what the last click did, for the screen
var last_click_cell := Vector2i(-1, -1)
var show_path := true
var measured_speed := 0.0         # tiles a second over the last speed_window_seconds

var _time := 0.0
var _walked := 0.0                # tiles walked so far (fractions count)
var _samples: Array[Vector2] = [] # (time, tiles walked) over the speed window
var _refused_left := 0.0
var _hud := Label.new()
var _overlay := Node2D.new()


func _ready() -> void:
	settings = _load_json(DATA_PATH)
	char_data = CharacterScene.load_data()
	# The world draws the patch. It also reads clicks and pans its own camera
	# (PRO-002), so both are switched off here; play routes clicks itself.
	world = (load(WORLD_SCENE) as PackedScene).instantiate()
	world.seed_override = seed_override
	add_child(world)
	world.set_process(false)
	world.set_process_unhandled_input(false)
	world.camera.enabled = false
	pathfinder = Pathfinder.new(world.gen, settings["diagonal_needs_both_sides_free"], settings["diagonal_extra_cost"])

	cell = find_start()
	human = CharacterScript.new()
	world.objects.add_child(human)
	human.setup(settings["race"], char_data)
	human.position = world.cell_to_world(Vector2(cell))
	human.set_direction(_direction_of(_sign(world.gen.door_cell - cell)))

	_overlay.z_index = 500
	_overlay.draw.connect(_draw_overlay)
	world.add_child(_overlay)

	camera = Camera2D.new()
	var z := float(_arg("--zoom", str(settings["zoom"])))
	camera.zoom = Vector2(z, z)
	add_child(camera)
	camera.make_current()
	_follow()

	var layer := CanvasLayer.new()
	add_child(layer)
	_hud.position = Vector2(12, 8)
	_hud.add_theme_color_override("font_outline_color", Color.BLACK)
	_hud.add_theme_constant_override("outline_size", 6)
	layer.add_child(_hud)

	var c := _arg("--click", "")
	if c != "":
		var p := c.split(",")
		click_cell(Vector2i(int(p[0]), int(p[1])))
	var adv := float(_arg("--advance", "0"))
	while adv > 0.0:
		tick(minf(adv, 1.0 / 60.0))
		adv -= 1.0 / 60.0
	_update_hud()


# --- start -------------------------------------------------------------------

## The nearest free tile at least start_min_distance tiles from the door, in the
## door's area (so the walk to the door is never blocked), found by walking out
## from the door. Same seed, same tile.
func find_start() -> Vector2i:
	var door := world.gen.door_cell
	var min_d: int = settings["start_min_distance"]
	var seen := {door: true}
	var queue: Array[Vector2i] = [door]
	var head := 0
	while head < queue.size():
		var c := queue[head]
		head += 1
		var dist := maxi(absi(c.x - door.x), absi(c.y - door.y))
		if dist >= min_d and not world.gen.tile(c).inside:
			return c
		for d in Pathfinder.DIRS:
			var n := c + d
			if not seen.has(n) and pathfinder.can_step(c, d):
				seen[n] = true
				queue.append(n)
	return door


# --- clicks ------------------------------------------------------------------

## Walk to a tile. Returns what happened: "ok" (walking), "here", "blocked",
## "unreachable" or "outside". On anything but "ok" the human carries on as it was.
func click_cell(target: Vector2i) -> String:
	# Mid-step the human finishes the step first, so the new path starts there.
	var from := step_to if moving else cell
	var new_path := pathfinder.find_path(from, target)
	var result := pathfinder.last_result
	last_click = result
	last_click_cell = target
	if result == "ok" or (result == "here" and moving):
		path = new_path
	elif result == "blocked" or result == "unreachable" or result == "outside":
		_refused_left = settings["refused_flash_seconds"]
	_overlay.queue_redraw()
	return result


func click_world(pos: Vector2) -> String:
	if world.door_hit(pos):
		return click_cell(world.gen.door_cell)
	return click_cell(world.world_to_cell(pos))


func toggle_door_at(pos: Vector2) -> bool:
	if not world.door_hit(pos):
		return false
	world.set_door_open(not world.door_open)
	return true


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		match event.button_index:
			MOUSE_BUTTON_LEFT: click_world(get_global_mouse_position())
			MOUSE_BUTTON_RIGHT: toggle_door_at(get_global_mouse_position())
			MOUSE_BUTTON_WHEEL_UP: _zoom_by(settings["zoom_step"])
			MOUSE_BUTTON_WHEEL_DOWN: _zoom_by(1.0 / float(settings["zoom_step"]))
	elif event is InputEventKey and event.pressed and not event.echo:
		handle_key(event.keycode)


func handle_key(keycode: int) -> void:
	var step: float = settings["tile_seconds_step"]
	match keycode:
		KEY_BRACKETLEFT, KEY_MINUS, KEY_KP_SUBTRACT: set_tile_seconds(tile_seconds() - step)
		KEY_BRACKETRIGHT, KEY_EQUAL, KEY_KP_ADD: set_tile_seconds(tile_seconds() + step)
		KEY_P:
			show_path = not show_path
			_overlay.queue_redraw()


func tile_seconds() -> float:
	return char_data["tile_seconds"]


## Live: the step in progress and the walk animation follow at once.
func set_tile_seconds(s: float) -> void:
	char_data["tile_seconds"] = snappedf(clampf(s, settings["tile_seconds_min"], settings["tile_seconds_max"]), 0.001)


func _zoom_by(f: float) -> void:
	var z := clampf(camera.zoom.x * f, settings["zoom_min"], settings["zoom_max"])
	camera.zoom = Vector2(z, z)


# --- walking -----------------------------------------------------------------

func _process(delta: float) -> void:
	tick(delta)


## Moves the human on by `delta` seconds, over as many tiles as that covers.
func tick(delta: float) -> void:
	_time += delta
	_refused_left = maxf(0.0, _refused_left - delta)
	var left := delta
	while left > 0.0:
		if not moving:
			if path.is_empty():
				break
			_begin_step()
		var need := (1.0 - progress) * tile_seconds()
		if left >= need:
			left -= need
			_walked += 1.0 - progress
			progress = 1.0
			_end_step()
		else:
			var f := left / tile_seconds()
			progress += f
			_walked += f
			left = 0.0
	if moving:
		human.position = world.cell_to_world(Vector2(step_from)).lerp(world.cell_to_world(Vector2(step_to)), progress)
	else:
		human.position = world.cell_to_world(Vector2(cell))
		human.set_anim("Idle")
	_sample_speed()
	_follow()
	_update_hud()
	if _overlay.visible:
		_overlay.queue_redraw()


func _begin_step() -> void:
	step_from = cell
	step_to = path.pop_front()
	progress = 0.0
	moving = true
	human.set_direction(_direction_of(step_to - step_from))
	human.set_anim("Walk")
	# The human reaches the door: it opens and the human walks through (D191).
	if step_to == world.gen.door_cell and not world.door_open:
		world.set_door_open(true)


func _end_step() -> void:
	cell = step_to
	moving = false
	progress = 0.0


func _sample_speed() -> void:
	_samples.append(Vector2(_time, _walked))
	while _samples.size() > 2 and _samples[0].x < _time - float(settings["speed_window_seconds"]):
		_samples.pop_front()
	var a := _samples[0]
	var b := _samples[_samples.size() - 1]
	measured_speed = (b.y - a.y) / (b.x - a.x) if b.x > a.x else 0.0


## Index of a one-tile step in the 8 facings (0 E, 1 SE, 2 S, 3 SW, 4 W, 5 NW, 6 N, 7 NE).
func _direction_of(step: Vector2i) -> int:
	var steps: Array = char_data["direction_grid_step"]
	for i in steps.size():
		if int(steps[i][0]) == step.x and int(steps[i][1]) == step.y:
			return i
	return human.direction if human != null else 0


func _sign(v: Vector2i) -> Vector2i:
	return Vector2i(signi(v.x), signi(v.y))


func _follow() -> void:
	var off: Array = settings["camera_offset"]
	camera.position = human.position + Vector2(off[0], off[1])


# --- screen ------------------------------------------------------------------

func _update_hud() -> void:
	var s := tile_seconds()
	var t := "Walk time per tile: %.2f s = %.1f tiles a second (setting)\n" % [s, 1.0 / s]
	t += "Measured: %.1f tiles a second%s\n" % [measured_speed, "" if moving else " (standing)"]
	t += "Tile (%d, %d)   facing %s   door %s\n" % [cell.x, cell.y, char_data["directions"][human.direction], "open" if world.door_open else "closed"]
	t += "Last click: %s%s\n" % [last_click, "" if last_click_cell.x < 0 else " at (%d, %d)" % [last_click_cell.x, last_click_cell.y]]
	t += "Click ground: walk   right click door: open or close   wheel: zoom   P: path\n"
	t += "[ or -: lower the walk time (faster)   ] or =: raise it (slower)"
	_hud.text = t


func _draw_overlay() -> void:
	if not show_path:
		return
	var col_path := Color.html(settings["overlay_path_color"])
	var col_target := Color.html(settings["overlay_target_color"])
	for c in path:
		_diamond(c, col_path)
	if path.size() > 0:
		_diamond(path[path.size() - 1], col_target)
	if _refused_left > 0.0 and last_click_cell.x >= 0:
		_diamond(last_click_cell, Color.html(settings["overlay_refused_color"]))


func _diamond(c: Vector2i, col: Color) -> void:
	var m: Vector2 = world.cell_to_world(Vector2(c))
	var k: float = settings["overlay_shrink"]
	var hw := World.TILE_W / 2.0 * k
	var hh := World.TILE_H / 2.0 * k
	_overlay.draw_colored_polygon(PackedVector2Array([m + Vector2(0, -hh), m + Vector2(hw, 0), m + Vector2(0, hh), m + Vector2(-hw, 0)]), col)


# --- arguments ---------------------------------------------------------------

static func _load_json(p: String) -> Dictionary:
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(p))
	assert(parsed is Dictionary, p + " did not parse")
	return parsed


func _all_args() -> PackedStringArray:
	var a := OS.get_cmdline_args()
	a.append_array(OS.get_cmdline_user_args())
	return a


func _arg(flag: String, fallback: String) -> String:
	var a := _all_args()
	var i := a.find(flag)
	if i == -1 or i + 1 >= a.size():
		return fallback
	return a[i + 1]
