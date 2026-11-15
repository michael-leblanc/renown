extends Node2D
## One stacked Creator character (D121). Human, orc and goblin all run this same
## code (D4); only the data (tints, size) differs. Throwaway test game (D201):
## it follows none of game/sim/'s rules.

var data: Dictionary
var race := ""
var direction := 0          # row in the sheets: 0 E, 1 SE, 2 S, 3 SW, 4 W, 5 NW, 6 N, 7 NE
## Emitted when a play-once animation (play(..., false)) has shown its last frame.
## It then holds that frame (Die stays down).
signal finished(anim: String)

var anim := ""              # animation name, a file name in art/creator/<Part>/
var frame := 0              # column in the sheet, 0 to frames-1
var fps_now := 0.0          # frame rate the animation runs at right now
var size_scale := Vector2.ONE
var frozen := false         # true: the frame does not advance (a held Idle frame, a shot)
var looping := true
var playing := false        # false after a play-once animation ended
var range_from := 0
var range_to := 0           # last frame of the range, inclusive

var _clock := 0.0
var _sprites := {}          # part name -> Sprite2D
var _textures := {}         # "Part/Anim" -> Texture2D
var _body := Node2D.new()   # the stacked parts, scaled by sprite_scale and race size


func setup(race_name: String, game_data: Dictionary) -> void:
	race = race_name
	data = game_data
	add_child(_body)
	var origin: Array = data["sheet"]["foot_origin"]
	var grey: float = data["sheet"]["grey_ref"]
	for part in data["parts"]:
		var s := Sprite2D.new()
		s.name = part
		s.centered = false
		s.position = -Vector2(origin[0], origin[1])
		s.hframes = data["sheet"]["frames"]
		s.vframes = 8
		if part == "Shadow":
			s.modulate = Color(1, 1, 1, float(data["shadow_alpha"]))
		else:
			# The part is grey; the tint replaces the grey (a part's own colour).
			var t := Color.html(data["races"][race]["tints"][part])
			s.modulate = Color(t.r / grey, t.g / grey, t.b / grey, 1.0)
		_sprites[part] = s
		_body.add_child(s)
	set_size(data["races"][race]["scale"])
	set_direction(0)
	play("Idle")


func set_size(s) -> void:
	size_scale = Vector2(s[0], s[1])
	_body.scale = size_scale * float(data["sprite_scale"])


func set_direction(d: int) -> void:
	direction = posmod(d, 8)
	var order: Array = data["layer_order"][data["directions"][direction]]
	for i in order.size():
		_body.move_child(_sprites[order[i]], i)
	_show_frame()


## Play an animation. Always restarts it.
##   loop: repeat from..to; false: play once, hold the last frame and emit finished.
##   from_frame, to_frame: the frames to play (to_frame -1 = the last one), for
##   example the first frames of TakeDamage.
func play(a: String, loop := true, from_frame := 0, to_frame := -1) -> void:
	var n := int(data["sheet"]["frames"])
	anim = a
	looping = loop
	range_from = clampi(from_frame, 0, n - 1)
	range_to = n - 1 if to_frame < 0 else clampi(to_frame, range_from, n - 1)
	playing = true
	_clock = 0.0
	frame = range_from
	for part in _sprites:
		_sprites[part].texture = _texture(part, anim)
	_show_frame()


## Switch to an animation looping from its first frame; does nothing if it is already playing.
func set_anim(a: String) -> void:
	if anim == a and playing:
		return
	play(a)


## Show one frame of the current animation now (a frozen Idle frame: play("Idle"),
## frozen = true, set_frame(7)).
func set_frame(n: int) -> void:
	frame = clampi(n, 0, int(data["sheet"]["frames"]) - 1)
	_show_frame()


## Frames a second for an animation. Walk is worked out (see walk_fps).
func fps_of(a: String) -> float:
	if a == "Walk":
		return walk_fps()
	return float(data["anim_fps"][a])


## Screen velocity of this character while it walks, in pixels a second (D185).
func walk_velocity() -> Vector2:
	return _screen_step(direction) / float(data["tile_seconds"])


## Frame rate that keeps the planted foot still on the ground while walking, times
## walk_fps_multiplier (1.0 = no slide). The ground moves walk_velocity() px/s; a
## foot in the art moves foot_px_per_frame * body scale * sprite_scale px a frame
## against the body. It follows tile_seconds, sprite_scale and the size at once.
## With fps_follows_direction off, it is the human's rate walking SE in every direction.
func walk_fps() -> float:
	var mult: float = data["walk_fps_multiplier"]
	if data["fps_follows_direction"]:
		return mult * _needed_fps(direction, size_scale)
	return mult * _needed_fps(1, Vector2.ONE)


func _screen_step(d: int) -> Vector2:
	var step: Array = data["direction_grid_step"][d]
	var tile: Array = data["tile_px"]
	return Vector2((step[0] - step[1]) * tile[0] / 2.0, (step[0] + step[1]) * tile[1] / 2.0)


## ground px/s / (foot px a frame * body scale along the walk * sprite_scale)
func _needed_fps(d: int, size: Vector2) -> float:
	var screen := _screen_step(d)
	var ground := screen.length() / float(data["tile_seconds"])
	var unit := screen.normalized()
	# A bigger body takes bigger strides, so its legs turn slower (same code for every race).
	var along := Vector2(unit.x * size.x, unit.y * size.y).length()
	return ground / (float(data["foot_px_per_frame"][d]) * along * float(data["sprite_scale"]))


## How fast the planted foot moves compared with the ground (1.0 = no slide).
func slide_ratio() -> float:
	if anim != "Walk":
		return 0.0
	var scr := walk_velocity()
	var unit := scr.normalized()
	var along := Vector2(unit.x * size_scale.x, unit.y * size_scale.y).length()
	var foot := float(data["foot_px_per_frame"][direction]) * along * float(data["sprite_scale"]) * fps_now
	return foot / scr.length()


func _process(delta: float) -> void:
	_body.scale = size_scale * float(data["sprite_scale"])
	fps_now = fps_of(anim) if anim != "" else 0.0
	if frozen or not playing:
		return
	_clock += delta * fps_now
	var span := range_to - range_from + 1
	if looping:
		frame = range_from + int(_clock) % span
	elif int(_clock) >= span:
		frame = range_to
		playing = false
		_show_frame()
		finished.emit(anim)
		return
	else:
		frame = range_from + int(_clock)
	_show_frame()


func _show_frame() -> void:
	for part in _sprites:
		_sprites[part].frame = direction * int(data["sheet"]["frames"]) + frame


func _texture(part: String, a: String) -> Texture2D:
	var key := part + "/" + a
	if not _textures.has(key):
		_textures[key] = load("res://art/creator/%s/%s.png" % [part, a])
	return _textures[key]
