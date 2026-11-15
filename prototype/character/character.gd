extends Node2D
## One stacked Creator character (D121). Human, orc and goblin all run this same
## code (D4); only the data (tints, size) differs. Throwaway test game (D201):
## it follows none of game/sim/'s rules.

var data: Dictionary
var race := ""
var direction := 0          # row in the sheets: 0 E, 1 SE, 2 S, 3 SW, 4 W, 5 NW, 6 N, 7 NE
var anim := ""              # "Idle" or "Walk"
var frame := 0
var fps_now := 0.0          # frame rate the animation runs at right now
var size_scale := Vector2.ONE
var frozen := false         # a shot holds one frame

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
	set_anim("Idle")


func set_size(s) -> void:
	size_scale = Vector2(s[0], s[1])
	_body.scale = size_scale * float(data["sprite_scale"])


func set_direction(d: int) -> void:
	direction = posmod(d, 8)
	var order: Array = data["layer_order"][data["directions"][direction]]
	for i in order.size():
		_body.move_child(_sprites[order[i]], i)
	_show_frame()


func set_anim(a: String) -> void:
	if anim == a:
		return
	anim = a
	if not frozen:
		frame = 0
	_clock = 0.0
	for part in _sprites:
		_sprites[part].texture = _texture(part, anim)
	_show_frame()


## Screen velocity of this character while it walks, in pixels a second (D185).
func walk_velocity() -> Vector2:
	var step: Array = data["direction_grid_step"][direction]
	var tile: Array = data["tile_px"]
	var screen := Vector2((step[0] - step[1]) * tile[0] / 2.0, (step[0] + step[1]) * tile[1] / 2.0)
	return screen / float(data["tile_seconds"])


## Frame rate that keeps the planted foot still on the ground while walking:
## the ground moves walk_velocity() px/s, a foot in the art moves
## foot_px_per_frame * scale px per frame against the body. With fps_follows_direction
## off, it is the plain walk_fps setting.
func walk_fps() -> float:
	var base: float = data["walk_fps"]
	if not data["fps_follows_direction"]:
		return base
	# The setting is the human's rate walking SE; other directions and sizes scale from it.
	return base * _fps_factor(direction, size_scale) / _fps_factor(1, Vector2.ONE)


## Needed frame rate for one direction, before the base setting is applied.
func _fps_factor(d: int, size: Vector2) -> float:
	var step: Array = data["direction_grid_step"][d]
	var tile: Array = data["tile_px"]
	var screen := Vector2((step[0] - step[1]) * tile[0] / 2.0, (step[0] + step[1]) * tile[1] / 2.0)
	var ground := screen.length() / float(data["tile_seconds"])
	var unit := screen.normalized()
	# A bigger body takes bigger strides, so its legs turn slower (same code for every race).
	var along := Vector2(unit.x * size.x, unit.y * size.y).length()
	return ground / (float(data["foot_px_per_frame"][d]) * along)


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
	fps_now = walk_fps() if anim == "Walk" else float(data["idle_fps"])
	if frozen:
		return
	_clock += delta * fps_now
	var n := int(data["sheet"]["frames"])
	frame = int(_clock) % n
	_show_frame()


func _show_frame() -> void:
	for part in _sprites:
		_sprites[part].frame = direction * int(data["sheet"]["frames"]) + frame


func _texture(part: String, a: String) -> Texture2D:
	var key := part + "/" + a
	if not _textures.has(key):
		_textures[key] = load("res://art/creator/%s/%s.png" % [part, a])
	return _textures[key]
