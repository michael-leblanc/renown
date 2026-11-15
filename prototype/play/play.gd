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
##   --attack        start with a click on the dummy
##   --block N       start with block candidate N (1 to 5) chosen
## Mouse: left click on the ground walks there; left click on the dummy (an orc)
## walks next to it and starts the fight (PRO-006, fight/fight.gd); right click on
## the door opens or closes it; wheel zooms.
## Keys: [ or - lower the walk time per tile (faster), ] or = raise it (slower),
## P shows or hides the path, G switches the diagonal rule, 1 to 5 choose the block
## candidate shown on a miss, R puts both back at full health where they started,
## and the pairs listed in fight/fight_data.json ("keys") change the fight numbers.

const CharacterScene := preload("res://character/character_scene.gd")
const CharacterScript := preload("res://character/character.gd")
const BlockPlayer := preload("res://block/block_player.gd")
const DATA_PATH := "res://play/play_data.json"
const FIGHT_PATH := "res://fight/fight_data.json"
const WORLD_SCENE := "res://world/world.tscn"

## Emitted for each thing that happens in the fight, after it has been shown
## (see fight.gd for the dictionaries).
signal fight_event(ev: Dictionary)

## Set before adding to the tree to override --seed.
var seed_override := -1

var settings: Dictionary
var char_data: Dictionary
var world: World
var human: Node2D
var camera: Camera2D
var pathfinder: Pathfinder
var fight_data: Dictionary         # fight/fight_data.json, changed live by keys
var block_data: Dictionary         # block/block_data.json
var fight: Fight
var dummy: Node2D
var dummy_cell := Vector2i.ZERO
var human_start := Vector2i.ZERO
var block_index := 0               # block candidate shown on a miss (key 1 to 5 = 0 to 4)
var attack_pending := false        # the human is walking to the dummy to fight it
var messages: Array[String] = []   # the last fight events, newest last, for the screen
var fight_note := ""               # how the last fight ended

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
var _walk_anim := false           # the walk animation is on: set Idle once when it ends
var _human_dir0 := 0
var _dummy_dir0 := 0
var _key_map := {}                # keycode -> [fight_data key entry, +1 or -1]
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
	fight_data = _load_json(FIGHT_PATH)
	block_data = BlockPlayer.load_data()
	block_index = clampi(int(_arg("--block", str(int(fight_data["block_default"]) + 1))) - 1, 0, block_data["candidates"].size() - 1)
	for entry in fight_data["keys"]:
		_key_map[OS.find_keycode_from_string(entry["down"])] = [entry, -1]
		_key_map[OS.find_keycode_from_string(entry["up"])] = [entry, 1]
	fight = Fight.new(fight_data, int(_arg("--fight-seed", str(fight_data["rng_seed"]))))

	cell = find_start()
	human_start = cell
	human = CharacterScript.new()
	world.objects.add_child(human)
	human.setup(settings["race"], char_data)
	human.position = world.cell_to_world(Vector2(cell))
	_human_dir0 = _direction_of(_sign(world.gen.door_cell - cell))
	human.set_direction(_human_dir0)

	# The dummy: an orc (same character code, D4) that stands still. Characters
	# are not obstacles (D187), so it takes no tile out of the walkable map.
	dummy_cell = find_dummy_cell()
	dummy = CharacterScript.new()
	world.objects.add_child(dummy)
	dummy.setup(fight_data["dummy_race"], char_data)
	dummy.position = world.cell_to_world(Vector2(dummy_cell))
	_dummy_dir0 = _direction_of(_sign(cell - dummy_cell))
	dummy.set_direction(_dummy_dir0)
	human.finished.connect(_on_finished.bind("human"))
	dummy.finished.connect(_on_finished.bind("dummy"))

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
	if _all_args().has("--attack"):
		click_dummy()
	var adv := float(_arg("--advance", "0"))
	while adv > 0.0:
		var dt := minf(adv, 1.0 / 60.0)
		tick(dt)
		# The characters' own clocks run in their _process; a shot has no frames, so run them here.
		human._process(dt)
		dummy._process(dt)
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


## The nearest free tile at least dummy_min_distance tiles from the human's start,
## outside the building, with room around it (at least 5 free tiles beside it) so
## the human can stand next to it, found by walking out from the start. Same seed,
## same tile.
func find_dummy_cell() -> Vector2i:
	var min_d: int = fight_data["dummy_min_distance"]
	var seen := {cell: true}
	var queue: Array[Vector2i] = [cell]
	var head := 0
	while head < queue.size():
		var c := queue[head]
		head += 1
		var dist := maxi(absi(c.x - cell.x), absi(c.y - cell.y))
		if dist >= min_d and not world.gen.tile(c).inside and c != world.gen.door_cell and stand_cells_next_to(c).size() >= 5:
			return c
		for d in Pathfinder.DIRS:
			var n := c + d
			if not seen.has(n) and pathfinder.can_step(c, d):
				seen[n] = true
				queue.append(n)
	return cell


## The tiles around `c` a character can stand on.
func stand_cells_next_to(c: Vector2i) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	for d in Pathfinder.DIRS:
		if pathfinder.walkable(c + d):
			out.append(c + d)
	return out


func stand_cells_next_to_dummy() -> Array[Vector2i]:
	return stand_cells_next_to(dummy_cell)


func _adjacent(a: Vector2i, b: Vector2i) -> bool:
	return a != b and maxi(absi(a.x - b.x), absi(a.y - b.y)) == 1


# --- clicks ------------------------------------------------------------------

## Walk to a tile. Returns what happened: "ok" (walking), "here", "blocked",
## "unreachable" or "outside". On anything but "ok" the human carries on as it was.
func click_cell(target: Vector2i) -> String:
	if not fight.fighters["human"]["alive"]:
		last_click = "dead (R brings you back)"
		last_click_cell = target
		return "dead"
	# Mid-step the human finishes the step first, so the new path starts there.
	var from := step_to if moving else cell
	var new_path := pathfinder.find_path(from, target)
	var result := pathfinder.last_result
	last_click = result
	last_click_cell = target
	if result == "ok" or (result == "here" and moving):
		path = new_path
		_leave_fight()
	elif result == "blocked" or result == "unreachable" or result == "outside":
		_refused_left = settings["refused_flash_seconds"]
	_overlay.queue_redraw()
	return result


## Walk next to the dummy and fight it. Returns "ok" (walking, or already next to
## it), "dead" (one of them is dead: R), "fighting" or "unreachable".
func click_dummy() -> String:
	last_click_cell = dummy_cell
	if not fight.fighters["human"]["alive"]:
		last_click = "dead (R brings you back)"
		return "dead"
	if not fight.fighters["dummy"]["alive"]:
		last_click = "the dummy is dead (R)"
		return "dead"
	if fight.active:
		last_click = "already fighting"
		return "fighting"
	var from := step_to if moving else cell
	last_click = "dummy"
	if _adjacent(from, dummy_cell):
		path.clear()
		attack_pending = true
		return "ok"
	# The nearest free tile next to the dummy (never its own tile, D187: characters
	# are not obstacles, but the human stops beside it).
	var best: Array[Vector2i] = []
	for n in stand_cells_next_to(dummy_cell):
		var route := pathfinder.find_path(from, n)
		if pathfinder.last_result == "ok" and (best.is_empty() or route.size() < best.size()):
			best = route
	if best.is_empty():
		last_click = "unreachable"
		_refused_left = settings["refused_flash_seconds"]
		_overlay.queue_redraw()
		return "unreachable"
	path = best
	attack_pending = true
	_overlay.queue_redraw()
	return "ok"


## True when the click lands on the dummy's body (a box above its feet, scaled by its
## size) or on its tile.
func dummy_hit(pos: Vector2) -> bool:
	if world.world_to_cell(pos) == dummy_cell:
		return true
	var k: Vector2 = dummy.size_scale
	var foot: Vector2 = dummy.position
	var half_w: float = float(fight_data["dummy_hit_half_width"]) * k.x
	var up: float = float(fight_data["dummy_hit_height"]) * k.y
	var down: float = float(fight_data["dummy_hit_below"]) * k.y
	return Rect2(foot.x - half_w, foot.y - up, half_w * 2.0, up + down).has_point(pos)


func click_world(pos: Vector2) -> String:
	if dummy_hit(pos):
		return click_dummy()
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
		KEY_G:
			pathfinder.strict_corners = not pathfinder.strict_corners
			pathfinder.relabel()
		KEY_R:
			reset_all()
		KEY_1, KEY_2, KEY_3, KEY_4, KEY_5:
			block_index = keycode - KEY_1
		_:
			if _key_map.has(keycode):
				change_fight_setting(_key_map[keycode][0], _key_map[keycode][1])


## One key press on a fight number (an entry of fight_data["keys"], direction -1 or +1).
func change_fight_setting(entry: Dictionary, direction_sign: int) -> void:
	var name: String = entry["setting"]
	var v: float = float(fight_data[name]) + direction_sign * float(entry["step"])
	v = snappedf(clampf(v, float(entry["min"]), float(entry["max"])), 0.0001)
	fight_data[name] = int(roundf(v)) if name == "health" or name == "damage" else v
	if name == "health":
		fight.change_health(int(fight_data[name]))


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
		# Idle is set once, when a walk ends: forcing it every frame would cut off a
		# swing, a hit, a block or the fall (PRO-005 review).
		if _walk_anim:
			_walk_anim = false
			if fight.fighters["human"]["alive"]:
				human.set_anim("Idle")
	_step_fight(delta)
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
	human.frozen = false
	human.set_anim("Walk")
	_walk_anim = true
	# The human reaches the door: it opens and the human walks through (D191).
	if step_to == world.gen.door_cell and not world.door_open:
		world.set_door_open(true)


func _end_step() -> void:
	cell = step_to
	moving = false
	progress = 0.0


# --- the fight ---------------------------------------------------------------

func _step_fight(delta: float) -> void:
	if attack_pending and not moving and path.is_empty():
		attack_pending = false
		if _adjacent(cell, dummy_cell) and fight.fighters["human"]["alive"] and fight.fighters["dummy"]["alive"] and not fight.active:
			_start_fight()
	if fight.active:
		for ev in fight.tick(delta):
			_apply(ev)


func _start_fight() -> void:
	human.set_direction(_direction_of(_sign(dummy_cell - cell)))
	dummy.set_direction(_direction_of(_sign(cell - dummy_cell)))
	fight.begin()
	fight_note = ""
	_say("The fight starts.")


## The human walked off: the fight stops where it is, health stays as it is.
func _leave_fight() -> void:
	attack_pending = false
	if fight.active:
		fight.stop()
		fight_note = "You walked away at %.1f s. Click the dummy to carry on." % fight.t
		_say("The human walks away.")


func _character(who: String) -> Node2D:
	return human if who == "human" else dummy


func _play(c: Node2D, anim: String, loop := true, from_frame := 0, to_frame := -1) -> void:
	c.frozen = false   # a block candidate may have left it frozen
	c.play(anim, loop, from_frame, to_frame)


## Show one event on the characters and on the screen, then pass it on.
func _apply(ev: Dictionary) -> void:
	var who: String = ev["who"]
	match ev["type"]:
		"swing":
			_play(_character(who), "Attack1", false)
		"hit":
			var target: Node2D = _character(ev["target"])
			if ev["killed"]:
				_play(target, "Die", false)
			else:
				_play(target, "TakeDamage", false, 0, int(fight_data["hit_anim_to_frame"]))
			_say("%s hits %s for %d (%d/%d)" % [who, ev["target"], ev["damage"], fight.fighters[ev["target"]]["health"], fight.fighters[ev["target"]]["max"]])
		"miss":
			BlockPlayer.play_candidate(_character(ev["target"]), block_index, block_data)
			_say("%s misses: %s blocks (%s)" % [who, ev["target"], block_data["candidates"][block_index]["label"]])
		"die":
			fight_note = "%s dies after %.1f s. R: both back at full health." % [who, ev["time"]]
			_say("%s dies." % who)
	fight_event.emit(ev)


func _say(text: String) -> void:
	messages.append("%.1f s  %s" % [fight.t, text])
	while messages.size() > int(fight_data["message_lines"]):
		messages.pop_front()


## An animation that played once is over: stand again (unless dead, or walking).
func _on_finished(anim: String, who: String) -> void:
	if anim == "Die" or not fight.fighters[who]["alive"]:
		return
	var c := _character(who)
	if who == "human" and moving:
		return
	c.set_anim("Idle")


## R: both back at full health, on the tiles they started on, standing.
func reset_all() -> void:
	path.clear()
	moving = false
	progress = 0.0
	attack_pending = false
	_walk_anim = false
	cell = human_start
	human.position = world.cell_to_world(Vector2(cell))
	human.set_direction(_human_dir0)
	_play(human, "Idle")
	dummy.position = world.cell_to_world(Vector2(dummy_cell))
	dummy.set_direction(_dummy_dir0)
	_play(dummy, "Idle")
	fight.reset()
	messages.clear()
	fight_note = ""
	last_click = "-"
	last_click_cell = Vector2i(-1, -1)
	_follow()
	_overlay.queue_redraw()


func human_bar_text() -> String:
	var f: Dictionary = fight.fighters["human"]
	return "human %d/%d" % [f["health"], f["max"]]


func dummy_bar_text() -> String:
	var f: Dictionary = fight.fighters["dummy"]
	return "%s %d/%d" % [fight_data["dummy_race"], f["health"], f["max"]]


func _fight_status() -> String:
	if fight.over:
		return fight_note
	if fight.active:
		return "fighting"
	if fight_note != "":
		return fight_note
	return "not started: click the dummy"


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
	t += "Click ground: walk   click the dummy: fight it   right click door: open or close   wheel: zoom   P: path\n"
	t += "[ or -: lower the walk time (faster)   ] or =: raise it (slower)\n"
	t += "G: diagonal rule, now %s\n" % ("strict (a diagonal step needs both tiles beside it free)" if pathfinder.strict_corners else "D185 (refused only between two blocked tiles)")
	t += "Fight timer: %.1f s   %s\n" % [fight.t, _fight_status()]
	t += "Health: %s   %s\n" % [human_bar_text(), dummy_bar_text()]
	t += "Block shown on a miss (keys 1 to 5): %s\n" % block_data["candidates"][block_index]["label"]
	t += "Fight numbers, key down / key up (R: both back at full health):\n"
	for entry in fight_data["keys"]:
		t += "   %s %s%s   (%s / %s)\n" % [entry["label"], String.num(float(fight_data[entry["setting"]]) * float(entry["scale"]), int(entry["decimals"])), entry["unit"], entry["down"], entry["up"]]
	for m in messages:
		t += m + "\n"
	_hud.text = t


func _draw_overlay() -> void:
	if show_path:
		_draw_path()
	_draw_fight()


func _draw_fight() -> void:
	var b: Dictionary = fight_data["bars"]
	if fight.active or attack_pending:
		_diamond(dummy_cell, Color.html(b["target_colour"]), float(b["target_shrink"]))
	if not b["show"]:
		return
	var font := ThemeDB.fallback_font
	var size := int(b["font_size"])
	for who in ["human", "dummy"]:
		var c := _character(who)
		var f: Dictionary = fight.fighters[who]
		var w: float = b["width"]
		var h: float = b["height"]
		var top_left: Vector2 = c.position + Vector2(-w / 2.0, -float(b["above_feet"]) * c.size_scale.y)
		var frac := clampf(float(f["health"]) / float(maxi(1, int(f["max"]))), 0.0, 1.0)
		_overlay.draw_rect(Rect2(top_left, Vector2(w, h)), Color.html(b["back_colour"]))
		var col := Color.html(b["low_colour"] if frac < float(b["low_below"]) else b["fill_colour"])
		_overlay.draw_rect(Rect2(top_left, Vector2(w * frac, h)), col)
		var label := "%d/%d" % [f["health"], f["max"]]
		var at := top_left + Vector2(0.0, -4.0)
		_overlay.draw_string_outline(font, at, label, HORIZONTAL_ALIGNMENT_CENTER, w, size, 5, Color.BLACK)
		_overlay.draw_string(font, at, label, HORIZONTAL_ALIGNMENT_CENTER, w, size, Color.html(b["text_colour"]))


func _draw_path() -> void:
	var col_path := Color.html(settings["overlay_path_color"])
	var col_target := Color.html(settings["overlay_target_color"])
	for c in path:
		_diamond(c, col_path)
	if path.size() > 0:
		_diamond(path[path.size() - 1], col_target)
	if _refused_left > 0.0 and last_click_cell.x >= 0:
		_diamond(last_click_cell, Color.html(settings["overlay_refused_color"]))


func _diamond(c: Vector2i, col: Color, shrink := -1.0) -> void:
	var m: Vector2 = world.cell_to_world(Vector2(c))
	var k: float = settings["overlay_shrink"] if shrink < 0.0 else shrink
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
