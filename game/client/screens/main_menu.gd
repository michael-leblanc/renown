class_name MainMenu
extends Control
# The main menu (D197, D250): Dawndoor's doorway at dawn the size of the window, moving
# (menu_scene.gdshader paints it, MainMenuSparks, its child, adds the stars and the dust), the name in
# bronze, then Join game, Host game, Settings, Quit. Host game opens what hosting asks
# (D197, D199). Drawn from the pieces and menu.json that
# scripts/art/ui/main_menu.mjs --pieces writes, in the json's own pixels (1152 x 648, the
# window) and in its order; text in Alegreya.
#
# It shows a plain dictionary; every key may be left out. Nothing here starts a game:
# what each choice does is the game's (not wired).
#   panel    "host" to open the Host panel, or "" for none
#   values   {"World": .., "Seed": .., "Players": .., "Port": ..}: the Host panel's fields
#            (typing in them is not done)
#   address  where the others on the home network join (D199), shown under Host
# The pointed button is lit, and so is Host game while its panel is open. A click on Join
# game, Settings or Quit sends picked(what); on Host game it opens the panel. A click on
# Host sends hosted(values). Esc closes the panel.

signal picked(what: String)
signal hosted(values: Dictionary)

const SETTINGS := "res://data/client.json"
const SHADER := "res://client/screens/menu_scene.gdshader"

var layout: MenuLayout = null
var state: Dictionary = {}
var pointed := -1 # the button under the pointer, -1 for none
var playing := true # false holds the painting still (the shot page)

var _paths: Dictionary = {}
var _textures := {} # path -> Texture2D
var _fonts := {} # name -> Font
var _scene: ColorRect = null
var _sparks: MainMenuSparks = null
var _t := 0.0


func _ready() -> void:
	if layout == null:
		setup_files(SETTINGS)


func setup_files(settings_path: String) -> void:
	var settings: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	if not settings is Dictionary or not settings.get("screens") is Dictionary:
		push_error("main menu: %s has no screens group" % settings_path)
		return
	_paths = settings["screens"]
	setup(MenuLayout.load_file(_paths["menu_layout"]))


func setup(menu_layout: MenuLayout) -> void:
	layout = menu_layout
	if layout == null:
		return
	mouse_filter = Control.MOUSE_FILTER_STOP # it covers the window
	custom_minimum_size = layout.size()
	size = layout.size()
	for name: String in layout.font_names():
		_fonts[name] = _load(_paths["fonts"].path_join(name + ".woff"))
	_add_painting()
	if not mouse_exited.is_connected(_point):
		mouse_exited.connect(_point.bind(-1))


func show_state(new_state: Dictionary) -> void:
	state = new_state
	queue_redraw()


# The moment of the painting's loop, 0 to 1.
func time() -> float:
	return _t


# Holds the painting at a moment of its loop (0 to 1).
func hold(at: float) -> void:
	playing = false
	_set_time(at)


func panel_open() -> bool:
	return str(state.get("panel", "")) != ""


# Whether button i is lit: pointed at, or its panel open.
func is_lit(i: int) -> bool:
	return i == pointed or (panel_open() and layout.panel_of(i) == str(state["panel"]))


func scene_node() -> ColorRect:
	return _scene


func sparks_node() -> MainMenuSparks:
	return _sparks


func _process(delta: float) -> void:
	if playing and layout != null:
		_set_time(fmod(_t + delta / layout.loop_seconds(), 1.0))


func _set_time(at: float) -> void:
	_t = at
	if _scene != null:
		(_scene.material as ShaderMaterial).set_shader_parameter("t", at)
	if _sparks != null:
		_sparks.set_time(at)


func _gui_input(event: InputEvent) -> void:
	if layout == null:
		return
	if event is InputEventMouseMotion:
		_point(layout.button_at(event.position))
		return
	var click := event as InputEventMouseButton
	if click == null or not click.pressed or click.button_index != MOUSE_BUTTON_LEFT:
		return
	if panel_open() and layout.host_rect().has_point(click.position):
		hosted.emit(state.get("values", {}))
		accept_event()
		return
	var i := layout.button_at(click.position)
	if i < 0:
		return
	var opens := layout.panel_of(i)
	if opens != "":
		state["panel"] = opens
		queue_redraw()
	else:
		picked.emit(layout.says(i))
	accept_event()


func _unhandled_key_input(event: InputEvent) -> void:
	if visible and panel_open() and event.is_action_pressed("ui_cancel"):
		state["panel"] = ""
		queue_redraw()
		get_viewport().set_input_as_handled()


func _point(i: int) -> void:
	if i != pointed:
		pointed = i
		queue_redraw()


func _add_painting() -> void:
	if _scene != null:
		return
	var s := layout.scene_pieces()
	var door := layout.door()
	var mat := ShaderMaterial.new()
	mat.shader = load(SHADER)
	mat.set_shader_parameter("noise", _piece(s["noise"]))
	mat.set_shader_parameter("door_tex", _piece(s["door"]["file"]))
	mat.set_shader_parameter("door_at", s["door"]["at"])
	mat.set_shader_parameter("steps_tex", _piece(s["steps"]["file"]))
	mat.set_shader_parameter("steps_at", s["steps"]["at"])
	mat.set_shader_parameter("light", _piece(s["light"]))
	mat.set_shader_parameter("size", layout.size())
	mat.set_shader_parameter("drift", layout.drift())
	for key in ["sx", "hy", "base", "top"]:
		mat.set_shader_parameter(key, float(door[key]))
	_scene = ColorRect.new()
	_scene.name = "Painting"
	_scene.material = mat
	_scene.size = layout.size()
	_scene.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_scene.show_behind_parent = true # under the menu's own drawing
	add_child(_scene)
	_sparks = MainMenuSparks.new()
	_sparks.name = "Sparks"
	_sparks.size = layout.size()
	var noise := _piece(s["noise"])
	var light := _piece(s["light"])
	if noise != null and light != null:
		_sparks.setup(layout, noise.get_image(), light.get_image())
	_scene.add_child(_sparks) # over the painting, under the menu's own drawing
	_set_time(_t)


func _draw() -> void:
	if layout == null:
		return
	for layer: String in layout.order():
		if layer == "scene" or layer == "sparks":
			continue # the Painting and Sparks children, drawn behind this node
		elif layout.is_piece(layer):
			_put(layout.piece(layer))
		elif layer == "buttons":
			for i in layout.words().size():
				_put(layout.button_piece(i, is_lit(i)))
		elif layer == "panel":
			if panel_open():
				_draw_panel()
		elif layer == "text":
			_draw_text()
		else:
			push_error("main menu: unknown layer %s" % layer)


func _draw_panel() -> void:
	for name: String in ["Panel", "Crest", "Panel Rules"]:
		_put(layout.panel_piece(name))
	for i in layout.field_names().size():
		_put(layout.field_piece(i))
	_put(_place(layout.panel()["host"]["piece"]))


func _draw_text() -> void:
	var bt := layout.button_text()
	var words := layout.words()
	for i in words.size():
		var lit := is_lit(i)
		_say(str(words[i]), bt["face"], layout.button_rect(i).position + _v(bt["centre"]), bt["on"] if lit else bt["colour"], HORIZONTAL_ALIGNMENT_CENTER, int(bt["outline"]))
	var version: Dictionary = layout.text("version")
	_spec(version["text"], version)
	if not panel_open():
		return
	var p := layout.panel()
	_spec(p["heading"]["text"], p["heading"])
	var f: Dictionary = p["fields"]
	var values: Dictionary = state.get("values", {})
	var names := layout.field_names()
	for i in names.size():
		var y := layout.field_at(i).y
		_say(str(names[i]), f["label"]["face"], Vector2(float(f["label"]["x"]), y + float(f["label"]["dy"])), f["label"]["colour"])
		_say(str(values.get(names[i], "")), f["value"]["face"], Vector2(float(f["value"]["x"]), y + float(f["value"]["dy"])), f["value"]["colour"])
	_spec(p["hint"]["text"], p["hint"])
	_spec(p["host"]["text"]["text"], p["host"]["text"])
	_spec(p["address"]["text"], p["address"])
	_spec(str(state.get("address", "")), p["address"]["value"])


# A line of text placed by a json spec: {face, colour, at or centre, outline}.
func _spec(line: String, spec: Dictionary) -> void:
	var centred := spec.has("centre")
	_say(line, spec["face"], _v(spec["centre"] if centred else spec["at"]), spec["colour"], HORIZONTAL_ALIGNMENT_CENTER if centred else HORIZONTAL_ALIGNMENT_LEFT, int(spec.get("outline", 0)))


# A line of text. `at` is its top left, top right or top middle by `align`; the top
# is the font's ascent line (the json's note). The baseline is kept on a whole pixel.
func _say(line: String, face_name: String, at: Vector2, colour: String, align := HORIZONTAL_ALIGNMENT_LEFT, outline := 0) -> void:
	if line == "":
		return
	var face := layout.face(face_name)
	var f: Font = _fonts.get(face["font"])
	if f == null:
		return
	var px := int(face["px"])
	var w := f.get_string_size(line, HORIZONTAL_ALIGNMENT_LEFT, -1, px).x
	var x := at.x - (w if align == HORIZONTAL_ALIGNMENT_RIGHT else w / 2.0 if align == HORIZONTAL_ALIGNMENT_CENTER else 0.0)
	var base := Vector2(x, roundf(at.y + f.get_ascent(px)))
	if outline > 0:
		# The json's outline is how far it reaches out from the letters; Godot's size
		# is its whole width, half of it outside.
		draw_string_outline(f, base, line, HORIZONTAL_ALIGNMENT_LEFT, -1, px, outline * 2, layout.colour("outline"))
	draw_string(f, base, line, HORIZONTAL_ALIGNMENT_LEFT, -1, px, layout.colour(colour))


func _put(p: Dictionary) -> void:
	var tex := _piece(p["file"])
	if tex != null:
		draw_texture(tex, p["at"])


func _piece(file: String) -> Texture2D:
	return _texture(_paths["menu_pieces"].path_join(file))


func _texture(path: String) -> Texture2D:
	if not _textures.has(path):
		_textures[path] = _load(path)
	return _textures[path]


func _load(path: String) -> Resource:
	if not ResourceLoader.exists(path):
		push_error("main menu: missing %s" % path)
		return null
	return load(path)


static func _place(p: Dictionary) -> Dictionary:
	return {"file": p["file"], "at": _v(p["at"])}


static func _v(a: Variant) -> Vector2:
	if a is Vector2:
		return a
	return Vector2(a[0], a[1])
