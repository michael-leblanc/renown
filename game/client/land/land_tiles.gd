class_name LandTiles
extends RefCounted
# Which picture draws what, read from game/data/tiles.json (D175): a ground kind,
# a prop, a wall or a door. No file name is written in code. A missing entry is an
# error, never a silent default.

const SIDES := ["N", "E", "S", "W"]
# A corner piece is named for the corner of the tile it stands on, and holds the two
# edges that meet there: N the north-east and north-west edges, E the north-east and
# south-east, S the south-east and south-west, W the south-west and north-west.
const CORNERS := {"N": ["N", "W"], "E": ["N", "E"], "S": ["E", "S"], "W": ["S", "W"]}

var folder: String = ""
var extension: String = ""
var tile_size := Vector2.ZERO
var anchor := Vector2.ZERO # the middle of a tile's top face inside every piece

var _data: Dictionary = {}
var _textures: Dictionary = {}


static func load_file(path: String) -> LandTiles:
	if not FileAccess.file_exists(path):
		push_error("cannot read %s" % path)
		return null
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("%s is not a JSON object" % path)
		return null
	var tiles := LandTiles.new()
	tiles._data = parsed
	tiles.folder = str(parsed["folder"])
	tiles.extension = str(parsed["extension"])
	var tile: Dictionary = parsed["tile"]
	tiles.tile_size = Vector2(float(tile["width"]), float(tile["height"]))
	tiles.anchor = Vector2(float(tile["anchor_x"]), float(tile["anchor_y"]))
	return tiles


# The piece for a ground kind as the welcome numbers it, "" when there is none.
func ground_piece(kind: int) -> String:
	var table: Array = _data["ground"]
	if kind < 0 or kind >= table.size():
		push_error("no ground piece for kind %d" % kind)
		return ""
	return str(table[kind])


# The prop's name as the welcome numbers it ("none" for no prop).
func prop_name(kind: int) -> String:
	var table: Array = _data["prop_kinds"]
	if kind < 0 or kind >= table.size():
		push_error("no prop named for kind %d" % kind)
		return "none"
	return str(table[kind])


# {piece, shadow} for a prop on a tile: the same tile always gets the same variant.
func prop_variant(prop: String, tile: Vector2i) -> Dictionary:
	var variants: Array = _data["props"][prop]
	return variants[posmod(tile.x * 7 + tile.y * 13, variants.size())]


func wall_straight(side: String) -> String:
	return str(_data["wall"]["straight"]) + side


func wall_corner(corner: String) -> String:
	return str(_data["wall"]["corner"]) + corner


func door_closed(side: String) -> String:
	return str(_data["door"]["closed"]) + side


# Every piece name the table can draw, for checks.
func all_pieces() -> Array:
	var found: Array = []
	found.append_array(_data["ground"])
	for variants: Array in _data["props"].values():
		for variant: Dictionary in variants:
			found.append(variant["piece"])
			found.append(variant["shadow"])
	for side in SIDES:
		found.append(wall_straight(side))
		found.append(wall_corner(side))
		found.append(door_closed(side))
	return found


func texture(piece: String) -> Texture2D:
	if not _textures.has(piece):
		_textures[piece] = load(folder + piece + extension)
	return _textures[piece]
