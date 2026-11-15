extends Node
## Plays one block candidate on any stacked character (character/character.gd):
## the animation or the frozen frame with a white flash, and its sound. One helper
## for the block scene and for the fight (PRO-006: call it on a miss). Throwaway
## test game (D201).
##
##   const BlockPlayer := preload("res://block/block_player.gd")
##   BlockPlayer.play_candidate(character, 2)     # index 0 to 4 = candidates 1 to 5
##
## It makes a child node on the character the first time. Afterwards the character
## is never left frozen or flashing: an animation candidate plays once and holds its
## last frame (character.gd's play() does not clear `frozen`, so it is cleared here
## first); the flash candidate holds one Idle frame for flash_hold_seconds with the
## flash on for flash_seconds, then unfreezes. All numbers are in block_data.json.

const DATA_PATH := "res://block/block_data.json"
const NODE_NAME := "BlockPlayer"
const FLASH_SHADER := """
shader_type canvas_item;
uniform float flash : hint_range(0.0, 1.0) = 0.0;
uniform vec4 flash_colour : source_color = vec4(1.0);
void fragment() {
	// COLOR is the texture times the part's tint here; keep its alpha.
	COLOR.rgb = mix(COLOR.rgb, flash_colour.rgb, flash);
}
"""

## Emitted each time a candidate starts (its sound plays with it).
signal started(index: int)

var data: Dictionary
var character: Node2D
var material: ShaderMaterial     # on every part of the character except its shadow
var player := AudioStreamPlayer.new()
var index := -1                  # the candidate playing or last played
var sounds := 0                  # how many times a sound was started
var flash_on := false
var holding := false             # true while a flash candidate holds its frozen frame

var _t := 0.0
var _streams := {}               # candidate index -> AudioStreamWAV


## The helper of this character: made on the first call. `block_data` is used only
## then (leave it empty to read block_data.json).
static func for_character(c: Node2D, block_data: Dictionary = {}) -> Node:
	var found := c.get_node_or_null(NODE_NAME)
	if found != null:
		return found
	var h: Node = new()
	h.name = NODE_NAME
	h.data = block_data if not block_data.is_empty() else load_data()
	c.add_child(h)
	h.attach(c)
	return h


## Play candidate `index` (0 to 4) on `c` now. Returns the helper.
static func play_candidate(c: Node2D, candidate_index: int, block_data: Dictionary = {}) -> Node:
	var h := for_character(c, block_data)
	h.play(candidate_index)
	return h


static func load_data() -> Dictionary:
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(DATA_PATH))
	assert(parsed is Dictionary, DATA_PATH + " did not parse")
	return parsed


func attach(c: Node2D) -> void:
	character = c
	var shader := Shader.new()
	shader.code = FLASH_SHADER
	material = ShaderMaterial.new()
	material.shader = shader
	material.set_shader_parameter("flash_colour", Color.html(data["flash_colour"]))
	material.set_shader_parameter("flash", 0.0)
	for part in c._sprites:
		if part != "Shadow":
			c._sprites[part].material = material
	add_child(player)


func play(candidate_index: int) -> void:
	var spec: Dictionary = data["candidates"][candidate_index]
	index = candidate_index
	_t = 0.0
	character.frozen = false          # play() does not clear it
	_set_flash(false)
	holding = false
	if spec["mode"] == "flash":
		character.play(spec["anim"])
		character.frozen = true
		character.set_frame(int(spec["frame"]))
		holding = true
		_set_flash(true)
	else:
		character.play(spec["anim"], false, int(spec["from"]), int(spec["to"]))
	player.stream = _sound(candidate_index, spec)
	player.play()
	sounds += 1
	started.emit(candidate_index)


## Seconds one play of this candidate lasts (the animation, or the flash hold).
func length_of(candidate_index: int) -> float:
	var spec: Dictionary = data["candidates"][candidate_index]
	if spec["mode"] == "flash":
		return float(data["flash_hold_seconds"])
	var frames := int(spec["to"]) - int(spec["from"]) + 1
	return frames / character.fps_of(spec["anim"])


func _process(delta: float) -> void:
	_t += delta
	if flash_on and _t >= float(data["flash_seconds"]):
		_set_flash(false)
	if holding and _t >= float(data["flash_hold_seconds"]):
		holding = false
		character.frozen = false


func _set_flash(on: bool) -> void:
	flash_on = on
	material.set_shader_parameter("flash", 1.0 if on else 0.0)


func _sound(i: int, spec: Dictionary) -> AudioStreamWAV:
	if not _streams.has(i):
		_streams[i] = make_sound(spec["sound"], int(data["sound"]["mix_rate"]), i)
	return _streams[i]


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
