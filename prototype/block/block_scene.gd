extends Node2D
## Five armed humans side by side, each playing a stand-in for a block (the Creator
## has no block animation, D163), each with a short sound. Throwaway test game (D201).
##
## Keys: Right / Left turn all five together through the 8 directions, 1 to 5 replay
## one candidate now, M mute.
## Run:  scripts/godot.sh --path prototype res://block/block.tscn
## Shot: add  --shot name.png -- dir=3 grid=1
##   dir=N facing (0 E, 1 SE, 2 S, 3 SW, 4 W, 5 NW, 6 N, 7 NE),
##   flash=1 keeps the white flash on so a still shot shows it,
##   grid=1 one row per candidate, one column per direction (all 8 at once).
## Every number is in block_data.json and character/character_data.json.

const DATA_PATH := "res://block/block_data.json"
const CHAR_DATA_PATH := "res://character/character_data.json"
const CharacterScript := preload("res://character/character.gd")
const FLASH_SHADER := """
shader_type canvas_item;
uniform float flash : hint_range(0.0, 1.0) = 0.0;
uniform vec4 flash_colour : source_color = vec4(1.0);
void fragment() {
	// COLOR is the texture times the part's tint here; keep its alpha.
	COLOR.rgb = mix(COLOR.rgb, flash_colour.rgb, flash);
}
"""

## Emitted each time a candidate starts its loop and its sound plays.
signal candidate_started(index: int)

var data: Dictionary
var char_data: Dictionary
var cands: Array = []        # one Dictionary per candidate, see _add_candidate
var direction := 0
var grid_mode := false
var muted := false
var _flash_forever := false   # shot only: keep the white flash on, to see it

var _world := Node2D.new()
var _hud := Label.new()
var _flash_material := ShaderMaterial.new()   # template; each character gets its own copy


func _ready() -> void:
	data = _load_json(DATA_PATH)
	char_data = _load_json(CHAR_DATA_PATH)
	direction = int(data["start_direction"])
	_parse_args()
	if _flash_forever:
		data["flash_seconds"] = 1.0e6
		data["flash_hold_seconds"] = 1.0e6
	char_data["sprite_scale"] = float(data["grid"]["sprite_scale"]) if grid_mode else float(data["sprite_scale"])
	_world.y_sort_enabled = true
	add_child(_world)
	_build_ground()
	var shader := Shader.new()
	shader.code = FLASH_SHADER
	_flash_material.shader = shader
	_flash_material.set_shader_parameter("flash_colour", Color.html(data["flash_colour"]))
	if grid_mode:
		_build_grid()
	else:
		_build_row()
	var layer := CanvasLayer.new()
	add_child(layer)
	_hud.position = Vector2(12, 8)
	_hud.add_theme_color_override("font_outline_color", Color.BLACK)
	_hud.add_theme_constant_override("outline_size", 6)
	layer.add_child(_hud)
	muted = bool(data["sound"]["mute_at_start"])
	AudioServer.set_bus_mute(0, muted)
	_update_hud()


static func _load_json(path: String) -> Dictionary:
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
	assert(parsed is Dictionary, path + " did not parse")
	return parsed


func _parse_args() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.split("=")
		if kv.size() != 2:
			continue
		match kv[0]:
			"dir": direction = posmod(int(kv[1]), 8)
			"grid": grid_mode = kv[1] == "1"
			"flash": _flash_forever = kv[1] == "1"


func _build_row() -> void:
	for i in data["candidates"].size():
		var pos := Vector2(data["row_x"][i], data["row_y"])
		var label_pos: Vector2 = pos + Vector2(data["label_offset"][0], data["label_offset"][1])
		_add_candidate(i, pos, direction, label_pos, int(data["label_font_size"]))


func _build_grid() -> void:
	var g: Dictionary = data["grid"]
	for i in data["candidates"].size():
		for d in 8:
			var pos := Vector2(g["x0"] + d * g["dx"], g["y0"] + i * g["dy"])
			# A label at the start of each row only; the row is one candidate.
			var label_pos := Vector2(-1000, -1000)
			_add_candidate(i, pos, d, label_pos, 12, d == 0)


func _add_candidate(i: int, pos: Vector2, dir: int, label_pos: Vector2, font_size: int, with_label := true) -> void:
	var spec: Dictionary = data["candidates"][i]
	var c: Node2D = CharacterScript.new()
	c.position = pos
	_world.add_child(c)
	c.setup("human", char_data)
	c.set_direction(dir)
	# One material for all the parts of this character, so it flashes as one.
	var mat := _flash_material.duplicate() as ShaderMaterial
	for part in c._sprites:
		if part != "Shadow":
			c._sprites[part].material = mat
	var label: Label = null
	if with_label:
		label = Label.new()
		label.text = spec["label"]
		label.add_theme_font_size_override("font_size", font_size)
		label.add_theme_color_override("font_outline_color", Color.BLACK)
		label.add_theme_constant_override("outline_size", 6)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.custom_minimum_size = Vector2(data["label_width"], 0)
		label.position = label_pos if not grid_mode else Vector2(pos.x - 60.0, pos.y + 8.0)
		add_child(label)
	var player := AudioStreamPlayer.new()
	player.stream = make_sound(spec["sound"], int(data["sound"]["mix_rate"]), i)
	add_child(player)
	var state := {
		"char": c, "label": label, "player": player, "spec": spec, "index": i,
		"t": 0.0, "length": 0.0, "cycles": 0, "sounds": 0,
		"flash_on": false, "material": mat,
	}
	state["length"] = _cycle_length(state)
	cands.append(state)
	_start_cycle(state)


func _cycle_length(state: Dictionary) -> float:
	var spec: Dictionary = state["spec"]
	if spec["mode"] == "flash":
		return float(data["flash_hold_seconds"]) + float(data["gap_seconds"])
	var c: Node2D = state["char"]
	var frames := int(spec["to"]) - int(spec["from"]) + 1
	return frames / c.fps_of(spec["anim"]) + float(data["gap_seconds"])


func _start_cycle(state: Dictionary) -> void:
	var spec: Dictionary = state["spec"]
	var c: Node2D = state["char"]
	state["t"] = 0.0
	state["cycles"] += 1
	if spec["mode"] == "flash":
		c.play(spec["anim"])
		c.frozen = true
		c.set_frame(int(spec["frame"]))
		_set_flash(state, true)
	else:
		c.frozen = false
		c.play(spec["anim"], false, int(spec["from"]), int(spec["to"]))
	var p: AudioStreamPlayer = state["player"]
	p.play()
	state["sounds"] += 1
	candidate_started.emit(state["index"])


func _set_flash(state: Dictionary, on: bool) -> void:
	state["flash_on"] = on
	var m: ShaderMaterial = state["material"]
	m.set_shader_parameter("flash", 1.0 if on else 0.0)


func _process(delta: float) -> void:
	for state in cands:
		state["t"] += delta
		if state["spec"]["mode"] == "flash" and state["flash_on"] and state["t"] >= float(data["flash_seconds"]):
			_set_flash(state, false)
		if state["t"] >= state["length"]:
			_start_cycle(state)
	_update_hud()


func _unhandled_key_input(event: InputEvent) -> void:
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	match event.keycode:
		KEY_RIGHT: turn(1)
		KEY_LEFT: turn(-1)
		KEY_M:
			muted = not muted
			AudioServer.set_bus_mute(0, muted)
		KEY_1, KEY_2, KEY_3, KEY_4, KEY_5:
			var i: int = event.keycode - KEY_1
			for state in cands:
				if state["index"] == i:
					_start_cycle(state)
	_update_hud()


## Turn all five together one step (-1 or +1) round the 8 directions.
func turn(step: int) -> void:
	direction = posmod(direction + step, 8)
	for state in cands:
		state["char"].set_direction(posmod(state["char"].direction + step, 8))


func _update_hud() -> void:
	if grid_mode:
		_hud.text = "Rows: the five candidates. Columns: E SE S SW W NW N NE"
		return
	var t := "Facing: %s   (all five turn together)\n" % char_data["directions"][direction]
	t += "Loop: each candidate plays, then waits %.1f s, then again; each play has a sound%s\n" % [float(data["gap_seconds"]), " (muted)" if muted else ""]
	t += "Keys: Left/Right turn all five, 1-5 replay one now, M mute"
	_hud.text = t


## A short sound made in code (no file is bought or shipped, D163): thud, clank or whoosh.
## The seed is the candidate index, so the same candidate always sounds the same.
static func make_sound(spec: Dictionary, mix_rate: int, seed_value: int) -> AudioStreamWAV:
	var n := int(float(spec["seconds"]) * mix_rate)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value + 1
	var hz: float = spec["hz"]
	var vol: float = spec["volume"]
	var bytes := PackedByteArray()
	bytes.resize(n * 2)
	var lowpass := 0.0
	for k in n:
		var t := float(k) / mix_rate
		var u := float(k) / maxf(1.0, n - 1.0)    # 0 to 1 over the sound
		var v := 0.0
		match spec["kind"]:
			"thud":   # a sine that falls in pitch and dies away
				v = sin(TAU * hz * (1.0 - 0.5 * u) * t) * exp(-5.0 * u)
			"clank":  # metal: a few unrelated tones that die away
				v = (sin(TAU * hz * t) + 0.6 * sin(TAU * hz * 2.76 * t) + 0.4 * sin(TAU * hz * 5.4 * t)) / 2.0 * exp(-7.0 * u)
			"whoosh": # noise through a one-pole low-pass, swelling then fading
				lowpass += (rng.randf_range(-1.0, 1.0) - lowpass) * clampf(hz / mix_rate * 6.0, 0.01, 1.0)
				v = lowpass * 3.0 * sin(PI * u)
		bytes.encode_s16(k * 2, int(clampf(v * vol, -1.0, 1.0) * 32767.0))
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = mix_rate
	wav.stereo = false
	wav.data = bytes
	return wav


func _build_ground() -> void:
	var tex: Texture2D = load(char_data["ground_tile"])
	var centre: Array = char_data["ground_tile_centre"]
	var tile: Array = char_data["tile_px"]
	for u in range(-3, 24):
		for v in range(-3, 28):
			if (u + v) % 2 != 0:
				continue
			var s := Sprite2D.new()
			s.texture = tex
			s.centered = false
			s.position = Vector2(u * tile[0] / 2.0 - centre[0], v * tile[1] / 2.0 - centre[1])
			s.z_index = -1000
			_world.add_child(s)
