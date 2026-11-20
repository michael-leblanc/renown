class_name ReputationScreen
extends Control
# The Reputation screen (D7, D8, D22, D126, D249): a card per town under its landmark,
# with Standing, Morality and Fame as you were told them there, then the tales told of
# you that you heard. It covers the game: the world behind is dimmed and greyed (the
# json's veil, done by the death screen's veil.gdshader).
# Drawn from the pieces and reputation.json that
# scripts/art/ui/reputation_screen.mjs --pieces writes, in the json's own pixels
# (1152 x 648, the window) and in its order; text in Alegreya.
#
# It shows what you know of yourself, a plain dictionary (what the server sends for it
# is not settled, D176; the words of every level are not decided). Every key may be
# left out: a newborn's screen is blank (D126).
#   towns   [{town, faction, told, rows}, ..]: a card each, as many as fit.
#           town: "Dawndoor" or "Oldscar" (its landmark); told: who told you and when.
#           rows: {"Standing": [word, v], "Morality": [word, v], "Fame": [word, v]},
#           v from 0 to 1, only what that town told you. A town with no rows told you
#           nothing: its card is dim and every row "Not known".
#   tales   [{tale, town, heard}, ..], oldest first: the tales told of you that you
#           heard (D194), where and when; as many as fit.
# A click on Close, or Esc, sends closed.

signal closed

const SETTINGS := "res://data/client.json"
const VEIL := "res://client/screens/veil.gdshader"

var layout: ReputationLayout = null
var state: Dictionary = {}

var _paths: Dictionary = {}
var _textures := {} # path -> Texture2D
var _fonts := {} # name -> Font
var _veil: ColorRect = null


func _ready() -> void:
	if layout == null:
		setup_files(SETTINGS)


func setup_files(settings_path: String) -> void:
	var settings: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	if not settings is Dictionary or not settings.get("screens") is Dictionary:
		push_error("reputation screen: %s has no screens group" % settings_path)
		return
	_paths = settings["screens"]
	setup(ReputationLayout.load_file(_paths["reputation_layout"]))


func setup(reputation_layout: ReputationLayout) -> void:
	layout = reputation_layout
	if layout == null:
		return
	mouse_filter = Control.MOUSE_FILTER_STOP # it covers the game
	custom_minimum_size = layout.size()
	size = layout.size()
	for name: String in layout.font_names():
		_fonts[name] = _load(_paths["fonts"].path_join(name + ".woff"))
	_add_veil()


func show_state(new_state: Dictionary) -> void:
	state = new_state
	queue_redraw()


# The towns that show, as many as fit.
func shown_towns() -> Array:
	var all: Array = state.get("towns", [])
	return all.slice(0, layout.card_fits())


# The tales that show, oldest first, as many as fit.
func shown_tales() -> Array:
	var all: Array = state.get("tales", [])
	return all.slice(0, layout.tale_fits())


# Whether a town told you anything (D126).
static func is_known(town: Dictionary) -> bool:
	var rows: Variant = town.get("rows", {})
	return rows is Dictionary and not rows.is_empty()


# What a town told you of one row: [word, v], v null when it told you nothing.
func row_value(town: Dictionary, row: String) -> Array:
	var rows: Variant = town.get("rows", {})
	if rows is Dictionary and rows.has(row):
		var r: Array = rows[row]
		return [str(r[0]), float(r[1])]
	return [str(layout.rows()["unknown_word"]), null]


# Where and when a tale was heard, as one line.
func where_text(tale: Dictionary) -> String:
	var parts: Array = []
	for key in ["town", "heard"]:
		if str(tale.get(key, "")) != "":
			parts.append(str(tale[key]))
	return str(layout.tales()["where"]["join"]).join(PackedStringArray(parts))


func _gui_input(event: InputEvent) -> void:
	if layout == null:
		return
	var click := event as InputEventMouseButton
	if click != null and click.pressed and click.button_index == MOUSE_BUTTON_LEFT and layout.is_on_close(click.position):
		closed.emit()
		accept_event()


func _unhandled_key_input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_cancel"):
		closed.emit()
		get_viewport().set_input_as_handled()


func _add_veil() -> void:
	if _veil != null:
		return
	var v := layout.veil()
	var mat := ShaderMaterial.new()
	mat.shader = load(VEIL)
	mat.set_shader_parameter("dark", v["dark"])
	mat.set_shader_parameter("grey", v["grey"])
	var tint: Color = v["tint"]
	mat.set_shader_parameter("tint", Vector3(tint.r, tint.g, tint.b))
	mat.set_shader_parameter("corners", v["corners"])
	_veil = ColorRect.new()
	_veil.name = "Veil"
	_veil.material = mat
	_veil.size = layout.size()
	_veil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_veil.show_behind_parent = true # under the screen's own drawing, over the world
	add_child(_veil)


func veil_node() -> ColorRect:
	return _veil


func _draw() -> void:
	if layout == null:
		return
	for layer: String in layout.order():
		if layer == "veil":
			continue # the Veil child, drawn behind this node
		elif layout.is_piece(layer):
			_put(layout.piece(layer))
		elif layer == "rules":
			_draw_rules()
		elif layer == "cards":
			_draw_cards()
		elif layer == "bullets":
			var b: Dictionary = layout.tales()["bullet"]
			for i in shown_tales().size():
				_put({"file": b["file"], "at": Vector2(float(b["at"][0]), layout.tale_y(i) + float(b["at"][1]))})
		elif layer == "text":
			_draw_text()
		else:
			push_error("reputation screen: unknown layer %s" % layer)


func _draw_rules() -> void:
	var title: Dictionary = layout.text("title")
	var hint: Dictionary = layout.text("hint")
	var tales_title: Dictionary = layout.text("tales_title")
	var tex := _piece(layout.rule_file())
	if tex == null:
		return
	for r: Dictionary in [
		layout.title_rule(_width(title["text"], title["face"]), _width(hint["text"], hint["face"])),
		layout.tales_rule(_width(tales_title["text"], tales_title["face"])),
	]:
		if r["length"] <= 0.0:
			continue
		var rects := layout.rule_rects(r["at"], r["length"], Vector2(tex.get_size()))
		draw_texture_rect_region(tex, rects[1], rects[0])


func _draw_cards() -> void:
	var towns := shown_towns()
	for n in towns.size():
		var town: Dictionary = towns[n]
		var known := is_known(town)
		_put(layout.card_piece(n, known))
		var pic := layout.town_piece(n, str(town.get("town", "")), known)
		if not pic.is_empty():
			_put(pic)
		var names := layout.row_names()
		for i in names.size():
			var row: String = names[i]
			_put(layout.sign_piece(n, i, row))
			var v: Variant = row_value(town, row)[1]
			if row == "Fame":
				var b := layout.bar(n, i, 0.0 if v == null else float(v))
				_put(b["under"])
				_put_cut(b["fill"], float(b["end"]))
			else:
				_put(layout.scale_piece(n, i))
				if v != null:
					_put(layout.mark_piece(n, i, float(v)))


func _draw_text() -> void:
	var title: Dictionary = layout.text("title")
	_say(title["text"], title["face"], _v(title["at"]), title["colour"])
	var hint: Dictionary = layout.text("hint")
	_say(hint["text"], hint["face"], _v(hint["right"]), hint["colour"], HORIZONTAL_ALIGNMENT_RIGHT)
	var c := layout.cards()
	var r := layout.rows()
	var towns := shown_towns()
	for n in towns.size():
		var town: Dictionary = towns[n]
		var known := is_known(town)
		var corner := layout.card_at(n)
		var tone := func(spec: Dictionary) -> String: return spec["colour"] if known else spec["unknown"]
		_say(str(town.get("town", "")), c["name"]["face"], corner + _v(c["name"]["at"]), tone.call(c["name"]))
		_say(str(town.get("faction", "")), c["faction"]["face"], corner + _v(c["faction"]["at"]), tone.call(c["faction"]))
		var names := layout.row_names()
		for i in names.size():
			var row: String = names[i]
			var at := Vector2(corner.x, layout.row_y(n, i))
			_say(row, r["label"]["face"], at + _v(r["label"]["at"]), tone.call(r["label"]))
			_say(row_value(town, row)[0], r["word"]["face"], at + _v(r["word"]["at"]), tone.call(r["word"]))
			var e: Dictionary = r["ends"]
			_say(str(e["words"][row][0]), e["face"], at + _v(e["left_at"]), e["colour"])
			_say(str(e["words"][row][1]), e["face"], at + _v(e["right"]), e["colour"], HORIZONTAL_ALIGNMENT_RIGHT)
		_say(str(town.get("told", "")), c["told"]["face"], corner + _v(c["told"]["at"]), tone.call(c["told"]))
	var tt: Dictionary = layout.text("tales_title")
	_say(tt["text"], tt["face"], _v(tt["at"]), tt["colour"])
	var t := layout.tales()
	var tales := shown_tales()
	for i in tales.size():
		var y := layout.tale_y(i)
		_say(str(tales[i].get("tale", "")), t["text"]["face"], Vector2(float(t["text"]["x"]), y + float(t["text"]["dy"])), t["text"]["colour"])
		_say(where_text(tales[i]), t["where"]["face"], Vector2(float(t["where"]["right"]), y + float(t["where"]["dy"])), t["where"]["colour"], HORIZONTAL_ALIGNMENT_RIGHT)
	var ask: Dictionary = layout.text("ask")
	_say(ask["text"], ask["face"], _v(ask["centre"]), ask["colour"], HORIZONTAL_ALIGNMENT_CENTER)


# A line of text. `at` is its top left, top right or top middle by `align`; the top
# is the font's ascent line (the json's note). The baseline is kept on a whole pixel.
func _say(line: String, face_name: String, at: Vector2, colour: String, align := HORIZONTAL_ALIGNMENT_LEFT) -> void:
	if line == "":
		return
	var face := layout.face(face_name)
	var f: Font = _fonts.get(face["font"])
	if f == null:
		return
	var px := int(face["px"])
	var w := _width(line, face_name)
	var x := at.x - (w if align == HORIZONTAL_ALIGNMENT_RIGHT else w / 2.0 if align == HORIZONTAL_ALIGNMENT_CENTER else 0.0)
	draw_string(f, Vector2(x, roundf(at.y + f.get_ascent(px))), line, HORIZONTAL_ALIGNMENT_LEFT, -1, px, layout.colour(colour))


func _width(line: String, face_name: String) -> float:
	var face := layout.face(face_name)
	var f: Font = _fonts.get(face["font"])
	if f == null:
		return 0.0
	return f.get_string_size(line, HORIZONTAL_ALIGNMENT_LEFT, -1, int(face["px"])).x


func _put(p: Dictionary) -> void:
	var tex := _piece(p["file"])
	if tex != null:
		draw_texture(tex, p["at"])


# A piece drawn only left of x = end (a bar's fill cut at its value).
func _put_cut(p: Dictionary, end: float) -> void:
	var tex := _piece(p["file"])
	if tex == null:
		return
	var at: Vector2 = p["at"]
	var w := clampf(roundf(end - at.x), 0.0, float(tex.get_width()))
	if w <= 0.0:
		return
	draw_texture_rect_region(tex, Rect2(at, Vector2(w, tex.get_height())), Rect2(0, 0, w, tex.get_height()))


func _piece(file: String) -> Texture2D:
	return _texture(_paths["reputation_pieces"].path_join(file))


func _texture(path: String) -> Texture2D:
	if not _textures.has(path):
		_textures[path] = _load(path)
	return _textures[path]


func _load(path: String) -> Resource:
	if not ResourceLoader.exists(path):
		push_error("reputation screen: missing %s" % path)
		return null
	return load(path)


static func _v(a: Variant) -> Vector2:
	if a is Vector2:
		return a
	return Vector2(a[0], a[1])
