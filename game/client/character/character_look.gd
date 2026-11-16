class_name CharacterLook
extends RefCounted
# The drawing tables for a character (D121, D205): from client.json how the
# sheets are cut, the layer order and the walk rates, from looks.json each race's
# size and skin colour. Plain JSON, never the sim's classes (D215).

var _c: Dictionary = {}
var _races: Dictionary = {}


static func load_files(client_path: String, looks_path: String) -> CharacterLook:
	return from_dicts(_read(client_path), _read(looks_path))


static func from_dicts(client: Dictionary, looks: Dictionary) -> CharacterLook:
	if not client.get("character") is Dictionary or not looks.get("races") is Dictionary:
		push_error("character look: client.json needs a character group and looks.json races")
		return null
	var look := CharacterLook.new()
	look._c = client["character"]
	look._races = looks["races"]
	return look


# Size of the race's sprite as a share of the human's (D205).
func size(race: String) -> Vector2:
	var s: Array = _race(race).get("size", [1.0, 1.0])
	return Vector2(s[0], s[1])


# The tint of the body, a "#rrggbb" string.
func skin(race: String) -> String:
	return _race(race).get("skin", "#ffffff")


func number(key: String) -> float:
	return float(_c[key])


func text(key: String) -> String:
	return str(_c[key])


func frames() -> int:
	return int(_c["sheet"]["frames"])


func foot_origin() -> Vector2:
	var o: Array = _c["sheet"]["foot_origin"]
	return Vector2(o[0], o[1])


# The sheet's grey is divided out so a part takes the colour the view gives.
func tint(colour: String) -> Color:
	var grey: float = _c["sheet"]["grey_ref"]
	var c := Color.html(colour)
	return Color(c.r / grey, c.g / grey, c.b / grey, 1.0)


func shadow_modulate() -> Color:
	return Color(1, 1, 1, number("shadow_alpha"))


# Where a tile's centre is on the screen, in pixels.
func screen(tile: Array) -> Vector2:
	var px: Array = _c["tile_px"]
	return Vector2((tile[0] - tile[1]) * px[0] / 2.0, (tile[0] + tile[1]) * px[1] / 2.0)


# How far from its tile a character may be drawn before it jumps there, in pixels.
func snap_distance() -> float:
	return number("snap_tiles") * float(_c["tile_px"][0])


# The row in the sheets for a step of the grid, -1 when it is not one of the 8.
func direction_of(step: Array) -> int:
	var grid: Array = _c["direction_grid_step"]
	for d in grid.size():
		if grid[d][0] == step[0] and grid[d][1] == step[1]:
			return d
	return -1


# Slots back to front for a row of the sheets.
func layer_order(direction: int) -> Array:
	return _c["layer_order"][_c["directions"][direction]]


func fps(anim: String, direction: int) -> float:
	if anim == "Walk":
		var group: String = _c["walk_group"][_c["directions"][direction]]
		return float(_c["walk_fps"][group])
	return float(_c["anim_fps"].get(anim, 0.0))


func art_path(part: String, anim: String) -> String:
	return "%s/%s/%s.png" % [_c["art"], part, anim]


func _race(race: String) -> Dictionary:
	if not _races.has(race):
		push_error("race not in looks data: %s" % race)
		return {}
	return _races[race]


static func _read(path: String) -> Dictionary:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("%s is not a JSON object" % path)
		return {}
	return parsed
