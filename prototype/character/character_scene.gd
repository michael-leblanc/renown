extends Node2D
## Three characters in a row (human, orc, goblin), built from the same stacked
## Creator parts by the same code (D4, D121). Throwaway test game (D201).
##
## Keys: Right / Left turn the three one step (they walk), Space stand or walk,
## O the orc's size, G the goblin's size, [ and ] the walk frame rate,
## F the frame rate follows the direction or stays flat.
## Run:  scripts/godot.sh --path prototype res://character/character.tscn
## Shot: add  --shot name.png -- dir=3 walk=1 frame=4 grid=1 orc=1 goblin=1
##   dir=N facing (0 E, 1 SE, 2 S, 3 SW, 4 W, 5 NW, 6 N, 7 NE), walk=1 walk instead of
##   stand, frame=N hold one animation frame, grid=1 draw all 8 directions at once,
##   orc=N / goblin=N pick a size from the data.

const DATA_PATH := "res://character/character_data.json"
const CharacterScript := preload("res://character/character.gd")

var data: Dictionary
var chars: Array = []       # Character nodes, in row order
var walking := false
var orc_size := 0
var goblin_size := 0
var held_frame := -1
var grid_mode := false
var big_mode := false       # grid of the human only, 4 by 2, drawn large, to check the layers

var _world := Node2D.new()
var _hud := Label.new()
var _start: Array[Vector2] = []
var _hud_off := false


func _ready() -> void:
	data = load_data()
	_world.y_sort_enabled = true
	add_child(_world)
	_build_ground()
	_parse_args()
	if big_mode:
		grid_mode = true
		data["sprite_scale"] = 5.0
		_build_big()
	elif grid_mode:
		_build_grid()
	else:
		_build_row()
	var layer := CanvasLayer.new()
	add_child(layer)
	_hud.position = Vector2(12, 8)
	_hud.add_theme_color_override("font_outline_color", Color.BLACK)
	_hud.add_theme_constant_override("outline_size", 6)
	layer.add_child(_hud)
	if grid_mode:
		walking = true
	_apply_walking()
	_update_hud()


static func load_data() -> Dictionary:
	var text := FileAccess.get_file_as_string(DATA_PATH)
	var parsed = JSON.parse_string(text)
	assert(parsed is Dictionary, "character_data.json did not parse")
	return parsed


func _parse_args() -> void:
	var dir := 0
	for a in OS.get_cmdline_user_args():
		var kv := a.split("=")
		if kv.size() != 2:
			continue
		match kv[0]:
			"dir": dir = int(kv[1])
			"walk": walking = kv[1] == "1"
			"frame": held_frame = int(kv[1])
			"grid": grid_mode = kv[1] == "1"
			"orc": orc_size = int(kv[1])
			"goblin": goblin_size = int(kv[1])
			"big": big_mode = kv[1] == "1"
	_start_dir = dir

var _start_dir := 0


func _make(race: String, pos: Vector2, dir: int) -> Node2D:
	var c: Node2D = CharacterScript.new()
	c.position = pos
	_world.add_child(c)
	c.setup(race, data)
	c.set_direction(dir)
	if held_frame >= 0:
		c.frozen = true
		c.frame = held_frame
	chars.append(c)
	_start.append(pos)
	return c


func _build_row() -> void:
	for i in 3:
		_make(data["row_races"][i], Vector2(data["row_x"][i], data["row_y"]), _start_dir)
	_set_size(1, orc_size)
	_set_size(2, goblin_size)


## All 8 directions at once for the sheet check: a row of 8 per race.
func _build_grid() -> void:
	var races: Array = data["row_races"]
	for r in 3:
		for d in 8:
			var c := _make(races[r], Vector2(90 + d * 150, 330 + r * 170), d)
			c.set_anim("Walk")
	_set_size(1, orc_size)
	_set_size(2, goblin_size)


func _build_big() -> void:
	for d in 8:
		var c := _make("human", Vector2(160 + (d % 4) * 320, 330 + (d / 4) * 360), d)
		c.set_anim("Walk")
		_hud_off = true


func _set_size(index: int, choice: int) -> void:
	var race: String = data["row_races"][index]
	var choices: Array = data["races"][race]["size_choices"]
	var pick: Array = choices[choice % choices.size()]
	for c in chars:
		if c.race == race:
			c.set_size(pick)


func _build_ground() -> void:
	var tex: Texture2D = load(data["ground_tile"])
	var centre: Array = data["ground_tile_centre"]
	var tile: Array = data["tile_px"]
	for i in range(-14, 30):
		for j in range(-24, 20):
			var s := Sprite2D.new()
			s.texture = tex
			s.centered = false
			s.position = Vector2((i - j) * tile[0] / 2.0 - centre[0], (i + j) * tile[1] / 2.0 - centre[1])
			s.z_index = -1000
			_world.add_child(s)


func _unhandled_key_input(event: InputEvent) -> void:
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	match event.keycode:
		KEY_RIGHT: _turn(1)
		KEY_LEFT: _turn(-1)
		KEY_SPACE:
			walking = not walking
			_apply_walking()
		KEY_O: cycle_orc()
		KEY_G: cycle_goblin()
		KEY_BRACKETLEFT: data["walk_fps"] = max(1.0, float(data["walk_fps"]) - float(data["fps_step"]))
		KEY_BRACKETRIGHT: data["walk_fps"] = float(data["walk_fps"]) + float(data["fps_step"])
		KEY_F: data["fps_follows_direction"] = not data["fps_follows_direction"]
	_update_hud()


func cycle_orc() -> void:
	orc_size += 1
	_set_size(1, orc_size)


func cycle_goblin() -> void:
	goblin_size += 1
	_set_size(2, goblin_size)


func _turn(step: int) -> void:
	walking = true
	for i in chars.size():
		chars[i].position = _start[i]
		chars[i].set_direction(chars[i].direction + step)
	_apply_walking()


func _apply_walking() -> void:
	for c in chars:
		c.set_anim("Walk" if walking else "Idle")


func _process(delta: float) -> void:
	if walking and not grid_mode:
		for c in chars:
			c.position += c.walk_velocity() * delta
			c.position.x = wrapf(c.position.x, -120.0, 1400.0)
			c.position.y = wrapf(c.position.y, 60.0, 860.0)
	_update_hud()


func _update_hud() -> void:
	if chars.is_empty():
		return
	if _hud_off:
		_hud.text = ""
		return
	var human = chars[0]
	var orc = chars[1] if not grid_mode else chars[8]
	var gob = chars[2] if not grid_mode else chars[16]
	var t := ""
	t += "Facing: %s\n" % data["directions"][human.direction]
	t += "Orc size: %s   Goblin size: %s   (human 100%%)\n" % [_pct(orc.size_scale), _pct(gob.size_scale)]
	t += "Walk frame rate (setting): %.0f fps   follows direction: %s\n" % [data["walk_fps"], "yes" if data["fps_follows_direction"] else "no"]
	t += "Now: human %.1f fps, orc %.1f fps, goblin %.1f fps\n" % [human.fps_now, orc.fps_now, gob.fps_now]
	t += "Walk speed: one tile every %.1f s = %.1f tiles/s (D185)\n" % [data["tile_seconds"], 1.0 / float(data["tile_seconds"])]
	t += "Foot speed against ground (1.00 = no slide): human %.2f  orc %.2f  goblin %.2f\n" % [human.slide_ratio(), orc.slide_ratio(), gob.slide_ratio()]
	t += "Keys: Left/Right turn, Space stand/walk, O orc size, G goblin size, [ ] fps, F fps follows direction"
	_hud.text = t


func _pct(s: Vector2) -> String:
	if is_equal_approx(s.x, s.y):
		return "%d%%" % roundi(s.x * 100.0)
	return "%d%% wide by %d%% tall" % [roundi(s.x * 100.0), roundi(s.y * 100.0)]
