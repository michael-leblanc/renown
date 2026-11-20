class_name PlayClicks
extends RefCounted
# What a click means (D16, D52): a point on the land becomes the order it asks for.
# A click on a door is an order to use that door; a click on any other spot of the
# map is an order to walk to the tile under it; a click outside the map is nothing.
# The client knows no more than it was told (D176), so it does not judge whether a
# tile can be walked to: the server answers in its views.

var _doors: Dictionary = {} # door's texture -> its Image, decompressed once


# The tile whose diamond holds `point` (pixels in the land's own space, where tile
# (0, 0) is centred on the origin, grid x runs down-right and y down-left).
static func tile_at(point: Vector2, tile_size: Vector2) -> Vector2i:
	var gx := (point.x / (tile_size.x / 2.0) + point.y / (tile_size.y / 2.0)) / 2.0
	var gy := (point.y / (tile_size.y / 2.0) - point.x / (tile_size.x / 2.0)) / 2.0
	return Vector2i(roundi(gx), roundi(gy))


# The order for a click at `point` in the land's space, {} when it asks for nothing.
func order_at(land: Land, point: Vector2) -> Dictionary:
	if land.plan == null:
		return {}
	var node := _door_at(land, point)
	if node != null:
		var edge: Array = node.get_meta("edge")
		return NetMessages.order_door([edge[0].x, edge[0].y], [edge[1].x, edge[1].y])
	var tile := tile_at(point, land.tiles.tile_size)
	if tile.x < 0 or tile.y < 0 or tile.x >= land.plan.width or tile.y >= land.plan.height:
		return {}
	return NetMessages.order_walk([tile.x, tile.y])


# The door piece whose drawing is under `point`, open or closed, null when none.
func _door_at(land: Land, point: Vector2) -> Node2D:
	for node: Node2D in land.door_nodes:
		var sprite := node.get_node("Sprite") as Sprite2D
		var pixel := point - node.position - sprite.position - sprite.offset
		var image := _image(sprite.texture)
		if pixel.x < 0.0 or pixel.y < 0.0 or pixel.x >= image.get_width() or pixel.y >= image.get_height():
			continue
		if image.get_pixel(int(pixel.x), int(pixel.y)).a > 0.1:
			return node
	return null


func _image(texture: Texture2D) -> Image:
	if not _doors.has(texture):
		var image := texture.get_image()
		if image.is_compressed():
			image.decompress()
		image.convert(Image.FORMAT_RGBA8)
		_doors[texture] = image
	return _doors[texture]
