class_name PlayView
extends Node2D
# The world as the client plays it (D16, D52, D215): the land and every character in
# sight in one y-sorted layer, so a character can stand behind a tree or a wall, with
# the camera on your own character. A left click sends the order it asks for
# (PlayClicks) and nothing moves until a view says so: there is no prediction in this
# wave. F3 shows frames a second and how many characters are drawn.

const TILES_PATH := "res://data/tiles.json"
const CLIENT_PATH := "res://data/client.json"
const LOOKS_PATH := "res://data/looks.json"

var state: ClientState = null
var land: Land = null
var characters: CharacterLayer = null # also the land's sorted layer, so pieces and characters sort together
var camera: Camera2D = null
var stats: Label = null

var _send: Callable # (message: Dictionary)
var _clicks := PlayClicks.new()
var _synced_tick := -2
var _middle := Vector2.ZERO


func setup(client_state: ClientState, settings: ClientSettings, send_order: Callable) -> void:
	state = client_state
	_send = send_order
	# After the characters have moved this frame, so the camera is never a frame late.
	process_priority = 100
	land = Land.new()
	land.setup(state, settings, LandTiles.load_file(TILES_PATH))
	add_child(land)
	land.build()
	characters = CharacterLayer.new()
	characters.name = "objects"
	characters.setup(CharacterLook.load_files(CLIENT_PATH, LOOKS_PATH))
	for piece in land.objects.get_children():
		land.objects.remove_child(piece)
		characters.add_child(piece)
	land.remove_child(land.objects)
	land.objects.queue_free()
	land.add_child(characters)
	land.objects = characters
	_middle = land.tile_to_world(Vector2(state.land["width"], state.land["height"]) / 2.0 - Vector2(0.5, 0.5))
	camera = Camera2D.new()
	camera.zoom = Vector2.ONE * settings.number("camera_zoom")
	camera.position = _middle
	add_child(camera)
	var overlay := CanvasLayer.new()
	stats = Label.new()
	stats.position = Vector2(8, 8)
	stats.visible = false
	overlay.add_child(stats)
	add_child(overlay)


func _process(_delta: float) -> void:
	if state == null:
		return
	if state.tick != _synced_tick:
		_synced_tick = state.tick
		characters.sync(state)
	var mine := characters.character_of(state.you)
	camera.position = mine.position if mine != null else _middle
	if stats.visible:
		_update_stats()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F3:
		stats.visible = not stats.visible
		_update_stats()
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		click_at(get_global_mouse_position())


# Handles a click at a point of the screen's world; returns the order sent, {} when none.
func click_at(world: Vector2) -> Dictionary:
	var order := _clicks.order_at(land, land.to_local(world))
	if not order.is_empty() and _send.is_valid():
		_send.call(order)
	return order


func _update_stats() -> void:
	stats.text = "%d frames a second\n%d characters drawn" % [Engine.get_frames_per_second(), characters.drawn_ids().size()]
