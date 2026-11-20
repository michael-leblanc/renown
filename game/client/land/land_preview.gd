extends Node2D
# A look at the land for shots (CLI-002), not part of the game. It connects to a
# running server like the real client, draws the welcome with Land and centres a
# camera on the middle of the map, where the stand-in world puts its building.
#
# scripts/godot.sh --headless --path game -s server/server_main.gd -- --seed=1 --port=24611
# scripts/godot.sh --path game res://client/land/land_preview.tscn --shot FILE -- --port 24611 [flags]
#   --address A   server address (default: default_address in client.json)
#   --port N      server port (default: net_port in settings.json)
#   --at X,Y      show your own character on tile X,Y on this screen, whatever the server says
#   --door STATE  show every door open or closed on this screen, whatever the server says
#   --markers     a marker behind and one in front of a wall and of a tree
#   --zoom Z      camera zoom (default 1)
#   --center X,Y  camera centre in tiles (default: the middle of the map)

const PLAYER := "land-preview"
const TILES_PATH := "res://data/tiles.json"
const CLIENT_PATH := "res://data/client.json"
const MARKER_SIZE := Vector2i(28, 64)
const MARKER_GAP := 12.0
const MARKER_TREE_SEARCH := 6

var land: Land = null
var client: NetClient = null

var _link: NetLink = null
var _settings: ClientSettings = null
var _at := Vector2i(-1, -1)
var _door := ""


func _ready() -> void:
	_settings = ClientSettings.load_file(CLIENT_PATH)
	_link = NetLink.new()
	_link.name = "Link"
	get_tree().root.add_child.call_deferred(_link)
	await get_tree().process_frame
	client = NetClient.new(_link, get_tree().root.multiplayer, PLAYER, _settings.number("connect_timeout"))
	client.welcomed.connect(_on_welcomed)
	client.failed.connect(func(reason: String) -> void: printerr("land preview: ", reason))
	client.refused.connect(func(reason: String) -> void: printerr("land preview: refused: ", reason))
	var address := _arg("--address", _settings.text("default_address"))
	var port := int(_arg("--port", str(ClientSettings.default_port())))
	if client.connect_to(address, port) != OK:
		printerr("land preview: could not start connecting")
	_door = _arg("--door", "")
	if _arg("--at", "") != "":
		var parts := _arg("--at", "").split(",")
		_at = Vector2i(int(parts[0]), int(parts[1]))


func _process(delta: float) -> void:
	if client == null:
		return
	client.process(delta)
	if land != null and (_at.x >= 0 or _door != ""):
		var state := client.state
		var mine := state.newest(state.you)
		var tile: Array = mine.get("tile", [0, 0])
		if _at.x >= 0:
			tile = [_at.x, _at.y]
		var doors: Array = []
		for told: Dictionary in state.doors:
			doors.append(NetMessages.seen_door(told["a"], told["b"], _door if _door != "" else told["state"]))
		state.apply_view(NetMessages.view(state.tick, [NetMessages.seen_character(state.you, tile, [], "human", [])], doors))


func _exit_tree() -> void:
	if client != null:
		client.release()


func _on_welcomed() -> void:
	land = Land.new()
	land.setup(client.state, _settings, LandTiles.load_file(TILES_PATH))
	add_child(land)
	land.build()
	var camera := Camera2D.new()
	var middle := Vector2(client.state.land["width"], client.state.land["height"]) / 2.0 - Vector2(0.5, 0.5)
	if _arg("--center", "") != "":
		var parts := _arg("--center", "").split(",")
		middle = Vector2(float(parts[0]), float(parts[1]))
	camera.position = land.tile_to_world(middle)
	var zoom := float(_arg("--zoom", "1"))
	camera.zoom = Vector2(zoom, zoom)
	add_child(camera)
	if _has_arg("--markers"):
		_place_markers(Vector2i(middle))


# One marker behind and one in front of a wall of the building and of a tree near it,
# each a little off the piece's foot so the order is plain to see. The wall is the
# first one whose only side is south-east, south of the middle.
func _place_markers(middle: Vector2i) -> void:
	var tree_done := false
	var wall_done := false
	for node: Node2D in land.objects.get_children():
		var tile: Vector2i = node.get_meta("tile")
		if node.get_meta("kind") == "wall" and node.get_meta("sides") == ["E"] and not wall_done and tile.y >= middle.y:
			wall_done = true
			# The south-east edge's middle is a quarter of a tile's width right of the tile's middle.
			var middle_of_edge := node.position + Vector2(land.tiles.tile_size.x / 4.0, 0)
			_marker(middle_of_edge + Vector2(0, -MARKER_GAP))
			_marker(middle_of_edge + Vector2(0, MARKER_GAP))
		elif node.get_meta("kind") == "tree" and not tree_done and (tile - middle).abs().x <= MARKER_TREE_SEARCH and (tile - middle).abs().y <= MARKER_TREE_SEARCH:
			tree_done = true
			_marker(node.position + Vector2(0, -MARKER_GAP * 2))
			_marker(node.position + Vector2(0, MARKER_GAP * 2))


func _marker(foot: Vector2) -> void:
	var image := Image.create(MARKER_SIZE.x, MARKER_SIZE.y, false, Image.FORMAT_RGBA8)
	image.fill(Color(1, 1, 1))
	image.fill_rect(Rect2i(3, 3, MARKER_SIZE.x - 6, MARKER_SIZE.y - 6), Color(1, 0, 0.8))
	var sprite := Sprite2D.new()
	sprite.texture = ImageTexture.create_from_image(image)
	sprite.centered = false
	sprite.offset = Vector2(-MARKER_SIZE.x / 2.0, -MARKER_SIZE.y)
	var holder := Node2D.new()
	holder.position = foot
	holder.set_meta("kind", "marker")
	holder.add_child(sprite)
	land.objects.add_child(holder)


func _args() -> PackedStringArray:
	var args := OS.get_cmdline_args()
	args.append_array(OS.get_cmdline_user_args())
	return args


func _has_arg(flag: String) -> bool:
	return _args().has(flag)


func _arg(flag: String, fallback: String) -> String:
	var args := _args()
	var i := args.find(flag)
	if i == -1 or i + 1 >= args.size():
		return fallback
	return args[i + 1]
