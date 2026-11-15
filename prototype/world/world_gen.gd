class_name WorldGen
extends RefCounted
## Builds the test patch from a seed: plain data, no nodes. Same seed, same patch.
## All randomness comes from one RandomNumberGenerator seeded with the seed.
## Throwaway code (D201): follows none of game/sim/'s rules.

# Settings (the test game's stand-ins, nothing here is final).
const SIZE := 30                 # the patch is SIZE x SIZE tiles
const BUILDING_W := 5            # tiles, walls included (x direction)
const BUILDING_H := 4            # tiles, walls included (y direction)
const BUILDING_MARGIN := 7       # building origin stays this far from the patch edge
const TREE_COUNT := 45
const ROCK_COUNT := 16
const BIG_ROCK_SHARE := 0.4
const PEBBLE_SHARE := 0.07
const DARK_PATCHES := 7
const DIRT_PATCHES := 4
const WINDOW_COUNT := 2
const KEEP_CLEAR := 1            # tiles kept free of trees and rocks around the building

const TREES := ["Tree A1_S", "Tree A2_S", "Tree D1_S"]

var seed_value: int
var size := SIZE
var tiles: Dictionary = {}       # Vector2i -> WorldTile
var building_origin := Vector2i.ZERO
var door_cell := Vector2i.ZERO
var door_side := "S"             # "S" (south-west edge) or "E" (south-east edge)
var trees: Array[Vector2i] = []
var rocks: Array[Vector2i] = []


func _init(seed_in: int) -> void:
	seed_value = seed_in
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_in
	for y in SIZE:
		for x in SIZE:
			tiles[Vector2i(x, y)] = WorldTile.new()
	_ground(rng)
	_building(rng)
	_scatter(rng)


func tile(cell: Vector2i) -> WorldTile:
	return tiles.get(cell)


func building_rect() -> Rect2i:
	return Rect2i(building_origin, Vector2i(BUILDING_W, BUILDING_H))


## One string for the whole patch; equal for equal seeds, different otherwise.
func fingerprint() -> String:
	var parts := PackedStringArray()
	for y in SIZE:
		for x in SIZE:
			parts.append(tiles[Vector2i(x, y)].signature())
	return "\n".join(parts).sha256_text()


func _ground(rng: RandomNumberGenerator) -> void:
	_blobs(rng, "dark_grass", DARK_PATCHES, 2.0, 5.0)
	_blobs(rng, "dirt", DIRT_PATCHES, 1.5, 3.5)
	for cell in tiles:
		if tiles[cell].ground == "grass" and rng.randf() < PEBBLE_SHARE:
			tiles[cell].ground = "pebbles"


func _blobs(rng: RandomNumberGenerator, kind: String, count: int, r_min: float, r_max: float) -> void:
	for i in count:
		var centre := Vector2(rng.randf_range(0, SIZE), rng.randf_range(0, SIZE))
		var radius := rng.randf_range(r_min, r_max)
		for cell in tiles:
			if Vector2(cell).distance_to(centre) <= radius + rng.randf_range(-0.7, 0.7):
				tiles[cell].ground = kind


func _building(rng: RandomNumberGenerator) -> void:
	var span := SIZE - 2 * BUILDING_MARGIN
	building_origin = Vector2i(
		BUILDING_MARGIN + rng.randi_range(0, span - BUILDING_W),
		BUILDING_MARGIN + rng.randi_range(0, span - BUILDING_H))
	var o := building_origin
	var last := o + Vector2i(BUILDING_W - 1, BUILDING_H - 1)
	var wall_cells: Array[Vector2i] = []
	for y in range(o.y, last.y + 1):
		for x in range(o.x, last.x + 1):
			var c := Vector2i(x, y)
			var t: WorldTile = tiles[c]
			t.inside = true
			t.ground = "dirt"
			var on_x_edge := x == o.x or x == last.x
			var on_y_edge := y == o.y or y == last.y
			if not (on_x_edge or on_y_edge):
				continue
			t.kind = "wall"
			t.blocks_walk = true
			t.blocks_sight = true
			t.piece = _wall_piece(c, o, last)
			if not (on_x_edge and on_y_edge):
				wall_cells.append(c)
	# One door, on a side that faces the camera, never at a corner.
	door_side = "S" if rng.randf() < 0.5 else "E"
	if door_side == "S":
		door_cell = Vector2i(o.x + rng.randi_range(1, BUILDING_W - 2), last.y)
	else:
		door_cell = Vector2i(last.x, o.y + rng.randi_range(1, BUILDING_H - 2))
	var d: WorldTile = tiles[door_cell]
	d.kind = "door"
	d.piece = "Door A1_" + door_side
	d.blocks_walk = false   # a door never blocks a walk (D191)
	d.blocks_sight = true   # closed; the world flips it when the door opens
	wall_cells.erase(door_cell)
	# A couple of windows on the far sides (walls only: they still block).
	var far: Array[Vector2i] = []
	for c in wall_cells:
		if c.y == o.y or c.x == o.x:
			far.append(c)
	for i in WINDOW_COUNT:
		if far.is_empty():
			break
		var pick := rng.randi_range(0, far.size() - 1)
		var wc := far[pick]
		far.remove_at(pick)
		tiles[wc].kind = "window"
		tiles[wc].piece = tiles[wc].piece.replace("Wall A1_", "Wall A4_")


## Which wall piece a ring tile uses. N is the north-east edge, E the south-east,
## S the south-west, W the north-west (the tileset's names, looked at in the shot).
## Corner pieces are named for the corner of the tile they stand on.
func _wall_piece(c: Vector2i, o: Vector2i, last: Vector2i) -> String:
	var west := c.x == o.x
	var east := c.x == last.x
	var north := c.y == o.y
	var south := c.y == last.y
	if north and west:
		return "Wall A16_N"
	if north and east:
		return "Wall A16_E"
	if south and east:
		return "Wall A16_S"
	if south and west:
		return "Wall A16_W"
	if north:
		return "Wall A1_N"
	if east:
		return "Wall A1_E"
	if south:
		return "Wall A1_S"
	return "Wall A1_W"


func _scatter(rng: RandomNumberGenerator) -> void:
	var clear := Rect2i(building_origin - Vector2i(KEEP_CLEAR, KEEP_CLEAR),
		Vector2i(BUILDING_W + 2 * KEEP_CLEAR, BUILDING_H + 2 * KEEP_CLEAR))
	var tries := 0
	while trees.size() < TREE_COUNT and tries < 2000:
		tries += 1
		var c := Vector2i(rng.randi_range(0, SIZE - 1), rng.randi_range(0, SIZE - 1))
		var t: WorldTile = tiles[c]
		if clear.has_point(c) or t.kind != "":
			continue
		t.kind = "tree"
		t.piece = TREES[rng.randi_range(0, TREES.size() - 1)]
		t.blocks_walk = true
		t.blocks_sight = true   # trees block sight (D190)
		trees.append(c)
	tries = 0
	while rocks.size() < ROCK_COUNT and tries < 2000:
		tries += 1
		var c := Vector2i(rng.randi_range(0, SIZE - 1), rng.randi_range(0, SIZE - 1))
		var t: WorldTile = tiles[c]
		if clear.has_point(c) or t.kind != "":
			continue
		var big := rng.randf() < BIG_ROCK_SHARE
		t.kind = "rock_big" if big else "rock_small"
		t.piece = "Stone A2_S" if big else "Stone A1_S"
		t.blocks_walk = true
		t.blocks_sight = big    # big rocks block sight, small ones don't (D190)
		rocks.append(c)
