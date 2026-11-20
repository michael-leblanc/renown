class_name CharacterView
extends Node2D
# One character drawn (D121): the Creator's shadow, body and worn parts stacked as
# sprites, each tinted with the colour the view gives, the body with its race's
# skin colour. A player's character and an NPC are drawn by this same scene and
# code (D4). It slides from tile to tile at the walk time per tile and never jumps
# when a view arrives (D215).

var look: CharacterLook = null
var walk_time := 0.3 # seconds a tile takes, from the welcome
var race := ""
var facing := 2 # row in the sheets: 0 E, 1 SE, 2 S, 3 SW, 4 W, 5 NW, 6 N, 7 NE
var anim := ""
var frame := 0
var fps_now := 0.0
var target := Vector2.ZERO # where on the screen it is sliding to
var stack := Node2D.new() # the parts, scaled by the sprite scale and the race's size

var _sprites := {} # slot -> Sprite2D
var _part_of := {} # slot -> part name
var _worn: Array = []
var _clock := 0.0
var _speed := 0.0 # pixels a second while sliding
var _entered := false
var _textures := {} # "Part/Anim" -> Texture2D


func setup(tables: CharacterLook, seconds_a_tile: float) -> void:
	look = tables
	walk_time = seconds_a_tile
	if stack.get_parent() == null:
		add_child(stack)


# Takes one character's entry of the newest view (net/messages.gd seen_character).
func show_entry(entry: Dictionary) -> void:
	var worn: Array = entry["parts"]
	if entry["race"] != race or worn != _worn:
		race = entry["race"]
		_worn = worn.duplicate(true)
		_rebuild()
	var tile: Array = entry["tile"]
	var home := look.screen(tile)
	var stepping: Array = entry["stepping"]
	if not _entered:
		_entered = true
		position = home
		target = home
	if stepping.size() == 2:
		var goal := look.screen(stepping)
		var d := look.direction_of([stepping[0] - tile[0], stepping[1] - tile[1]])
		if d != -1:
			_face(d)
		_speed = home.distance_to(goal) / maxf(walk_time, 0.001)
		target = goal
	else:
		target = home
	if position.distance_to(home) > look.snap_distance() or (position != target and _speed == 0.0):
		position = home
	_apply_anim()


# Slots drawn, back to front.
func layers() -> Array:
	var names: Array = []
	for child in stack.get_children():
		names.append(str(child.name))
	return names


func sprite_for(slot: String) -> Sprite2D:
	return _sprites.get(slot)


func advance(delta: float) -> void:
	if look == null:
		return
	position = position.move_toward(target, _speed * delta)
	_apply_anim()
	fps_now = look.fps(anim, facing)
	_clock += delta * fps_now
	var shown := int(_clock) % look.frames()
	if shown != frame:
		frame = shown
		_show_frame()


func _process(delta: float) -> void:
	advance(delta)


func _apply_anim() -> void:
	var wanted := "Walk" if position != target else "Idle"
	if wanted == anim:
		return
	anim = wanted
	_clock = 0.0
	frame = 0
	for slot: String in _sprites:
		_sprites[slot].texture = _texture(_part_of[slot], anim)
	_show_frame()


func _face(d: int) -> void:
	if d == facing:
		return
	facing = d
	_order()
	_show_frame()


func _rebuild() -> void:
	for sprite: Sprite2D in _sprites.values():
		stack.remove_child(sprite)
		sprite.queue_free()
	_sprites.clear()
	_part_of.clear()
	var size := look.size(race)
	stack.scale = size * look.number("sprite_scale")
	_add("shadow", look.text("shadow_part"), look.shadow_modulate())
	_add("body", look.text("body_part"), look.tint(look.skin(race)))
	for worn: Dictionary in _worn:
		_add(worn["slot"], worn["part"], look.tint(worn["colour"]))
	_order()
	_show_frame()


func _add(slot: String, part: String, colour: Color) -> void:
	var sprite := Sprite2D.new()
	sprite.name = slot
	sprite.centered = false
	sprite.position = -look.foot_origin()
	sprite.hframes = look.frames()
	sprite.vframes = 8
	sprite.modulate = colour
	sprite.texture = _texture(part, anim if anim != "" else "Idle")
	_sprites[slot] = sprite
	_part_of[slot] = part
	stack.add_child(sprite)


func _order() -> void:
	var at := 0
	for slot: String in look.layer_order(facing):
		if _sprites.has(slot):
			stack.move_child(_sprites[slot], at)
			at += 1


func _show_frame() -> void:
	for sprite: Sprite2D in _sprites.values():
		sprite.frame = facing * look.frames() + frame


func _texture(part: String, a: String) -> Texture2D:
	var key := part + "/" + a
	if not _textures.has(key):
		var path := look.art_path(part, a)
		if not ResourceLoader.exists(path):
			push_error("character art missing: %s" % path)
			return null
		_textures[key] = load(path)
	return _textures[key]
