class_name DeathScreen
extends Control
# The death screen (D148, D149, D247): the life on the left with its deeds in a list
# that scrolls, what the world really remembers on the right, the landmark of the
# town the life woke in in the middle, then "Wake". It covers the game: the world
# behind is dimmed and greyed (the json's veil, done by veil.gdshader).
# Drawn from the pieces and death_screen.json that
# scripts/art/ui/death_screen.mjs --pieces writes, in the json's own pixels
# (1152 x 648, the window) and in its order; text in Alegreya.
#
# It shows one life, a plain dictionary (what the server sends for it is not
# settled, D176; the words of every line are not decided). Every key may be left out:
#   town        "Dawndoor" or "Oldscar": the town the life woke in; its landmark (D247)
#   name        the life's name; heading: its race, e.g. "Orc"; background (D158)
#   rows        [[label, value], ..]: the life as it was lived (D148)
#   deeds       [deed, ..], oldest first: all it did, seen or not (D148)
#   end         [line, ..]: how it ended, as it saw it (D128)
#   remembers   [{town, faction, says}, ..]: what each town really remembers (D149),
#               the life's own town first
#   unseen      one line under them: what nobody saw (D5, D45)
# The mouse wheel over the deeds scrolls them. A click on Wake, or Enter, sends woke.

signal woke

const SETTINGS := "res://data/client.json"
const VEIL := "res://client/screens/veil.gdshader"

var layout: DeathLayout = null
var life: Dictionary = {}
var first_deed_line := 0 # the first line of the deeds that shows

var _paths: Dictionary = {}
var _textures := {} # path -> Texture2D
var _fonts := {} # name -> Font
var _thumb: StyleBoxTexture = null # the scroll bar's thumb, a nine-patch
var _lines: Array = [] # the deeds wrapped: [line, starts a deed]
var _veil: ColorRect = null


func _ready() -> void:
	if layout == null:
		setup_files(SETTINGS)


func setup_files(settings_path: String) -> void:
	var settings: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	if not settings is Dictionary or not settings.get("screens") is Dictionary:
		push_error("death screen: %s has no screens group" % settings_path)
		return
	_paths = settings["screens"]
	setup(DeathLayout.load_file(_paths["death_layout"]))


func setup(death_layout: DeathLayout) -> void:
	layout = death_layout
	if layout == null:
		return
	mouse_filter = Control.MOUSE_FILTER_STOP # it covers the game
	custom_minimum_size = layout.size()
	size = layout.size()
	for name: String in layout.font_names():
		_fonts[name] = _load(_paths["fonts"].path_join(name + ".woff"))
	var t := layout.thumb()
	var tex := _piece(t["file"])
	if tex != null:
		_thumb = StyleBoxTexture.new()
		_thumb.texture = tex
		_thumb.texture_margin_top = float(t["patch_margin"]["top"])
		_thumb.texture_margin_bottom = float(t["patch_margin"]["bottom"])
	_add_veil()


func show_life(new_life: Dictionary) -> void:
	life = new_life
	first_deed_line = 0
	_lines = []
	if layout != null:
		_lines = wrap_deeds()
	queue_redraw()


# The deeds wrapped to the list's width: each [line, whether it starts a deed].
func wrap_deeds() -> Array:
	var d := layout.deeds()
	var out: Array = []
	for deed: Variant in life.get("deeds", []):
		var lines := wrap_line(str(deed), d["face"], float(d["wrap"]))
		for i in lines.size():
			out.append([lines[i], i == 0])
	return out


func deed_line_count() -> int:
	return _lines.size()


# The lines of deeds that show now, from first_deed_line.
func shown_deed_lines() -> Array:
	return _lines.slice(first_deed_line, first_deed_line + layout.deed_lines())


func more_deeds_below() -> bool:
	return first_deed_line + layout.deed_lines() < _lines.size()


func scroll_deeds(lines: int) -> void:
	var last := maxi(0, _lines.size() - layout.deed_lines())
	first_deed_line = clampi(first_deed_line + lines, 0, last)
	queue_redraw()


# The towns that show: what each remembers, the life's own first, as many as fit.
func shown_towns() -> Array:
	var all: Array = life.get("remembers", [])
	return all.slice(0, int(layout.towns()["fits"]))


func kind_text() -> String:
	var parts: Array = []
	for key in ["heading", "background"]:
		if str(life.get(key, "")) != "":
			parts.append(str(life[key]))
	return str(layout.text("kind")["join"]).join(PackedStringArray(parts))


func deeds_heading() -> String:
	return str(layout.headings()["deeds"]["text"]).replace("<n>", str(life.get("deeds", []).size()))


# Breaks a line into lines no wider than max_width in a face, word by word.
func wrap_line(line: String, face_name: String, max_width: float) -> Array:
	var out: Array = []
	var current := ""
	for word in line.split(" ", false):
		var next := word if current == "" else current + " " + word
		if current != "" and _width(next, face_name) > max_width:
			out.append(current)
			current = word
		else:
			current = next
	if current != "":
		out.append(current)
	return out


func _gui_input(event: InputEvent) -> void:
	if layout == null:
		return
	var click := event as InputEventMouseButton
	if click == null or not click.pressed:
		return
	if click.button_index == MOUSE_BUTTON_LEFT and layout.wake_rect().has_point(click.position):
		woke.emit()
		accept_event()
	elif click.button_index in [MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_DOWN] and layout.deeds_rect().has_point(click.position):
		scroll_deeds(-1 if click.button_index == MOUSE_BUTTON_WHEEL_UP else 1)
		accept_event()


func _unhandled_key_input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_accept"):
		woke.emit()
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
		elif layer == "Scroll Trough":
			if more_deeds_below() or first_deed_line > 0:
				_put(layout.piece(layer))
		elif layer == "Scroll Thumb":
			_draw_thumb()
		elif layer == "Fade":
			if more_deeds_below():
				_put(layout.piece(layer))
		elif layout.is_piece(layer):
			_put(layout.piece(layer))
		elif layer == "rules":
			_draw_rules()
		elif layer == "bullets":
			_draw_bullets()
		elif layer == "towns":
			_draw_towns()
		elif layer == "landmark":
			var file := layout.landmark_file(life.get("town", "Dawndoor"))
			if file != "":
				_put({"file": file, "at": layout.landmark_at()})
		elif layer == "text":
			_draw_text()
		else:
			push_error("death screen: unknown layer %s" % layer)


func _draw_rules() -> void:
	var rules: Array = []
	if str(life.get("name", "")) != "":
		rules.append_array(layout.text_rules("", _width(life["name"], layout.text("name")["face"])))
	for key: String in ["life", "deeds", "end", "world"]:
		rules.append_array(layout.text_rules(key, _width(_heading_text(key), layout.headings()[key]["face"])))
	rules.append_array(layout.divider(shown_towns().size()))
	for r: Dictionary in rules:
		var tex := _piece(layout.rule_file(r["side"]))
		if tex == null or r["length"] <= 0.0:
			continue
		var rects := layout.rule_rects(r["side"], r["at"], r["length"], Vector2(tex.get_size()))
		draw_texture_rect_region(tex, rects[1], rects[0])


func _draw_bullets() -> void:
	var d := layout.deeds()
	var b: Dictionary = d["bullet"]
	var shown := shown_deed_lines()
	for n in shown.size():
		if shown[n][1]:
			_put({"file": b["file"], "at": _deed_at(n) + Vector2(float(b["dx"]), float(b["dy"]))})


func _draw_thumb() -> void:
	if _thumb == null or not (more_deeds_below() or first_deed_line > 0):
		return
	draw_style_box(_thumb, layout.thumb_rect(first_deed_line, _lines.size(), Vector2(_thumb.texture.get_size())))


func _draw_towns() -> void:
	var t := layout.towns()
	var towns := shown_towns()
	for i in towns.size():
		var file := layout.town_file(str(towns[i].get("town", "")))
		if file != "":
			_put({"file": file, "at": _v(t["at"]) + Vector2(0, float(t["step"]) * i)})


# Where the text of the n-th deed line that shows starts.
func _deed_at(n: int) -> Vector2:
	var d := layout.deeds()
	return _v(d["at"]) + Vector2(float(d["text_dx"]), float(d["step"]) * n)


func _heading_text(key: String) -> String:
	return deeds_heading() if key == "deeds" else str(layout.headings()[key]["text"])


func _draw_text() -> void:
	var title: Dictionary = layout.text("title")
	_say_spec(title["text"], title, title["centre"])
	var n: Dictionary = layout.text("name")
	_say_spec(str(life.get("name", "")), n, n["centre"])
	var k: Dictionary = layout.text("kind")
	_say_spec(kind_text(), k, k["centre"])
	var h := layout.headings()
	for key: String in ["life", "deeds", "end", "world"]:
		_say(_heading_text(key), h[key]["face"], _v(h[key]["centre"]), h[key]["colour"], HORIZONTAL_ALIGNMENT_CENTER, int(h["outline"]))
	var rows: Dictionary = layout.text("rows")
	var list: Array = life.get("rows", [])
	for i in list.size():
		var dy := Vector2(0, float(rows["step"]) * i)
		_say(str(list[i][0]), rows["face"], _v(rows["label_at"]) + dy, rows["label"])
		_say(str(list[i][1]), rows["face"], _v(rows["value_right"]) + dy, rows["value"], HORIZONTAL_ALIGNMENT_RIGHT)
	var d := layout.deeds()
	var shown := shown_deed_lines()
	for i in shown.size():
		_say(shown[i][0], d["face"], _deed_at(i), d["colour"])
	var e: Dictionary = layout.text("end")
	var ends: Array = life.get("end", [])
	for i in ends.size():
		_say(str(ends[i]), e["face"], _v(e["centre"]) + Vector2(0, float(e["step"]) * i), e["colour"], HORIZONTAL_ALIGNMENT_CENTER)
	var t := layout.towns()
	var towns := shown_towns()
	for i in towns.size():
		var dy := Vector2(0, float(t["step"]) * i)
		_say(str(towns[i].get("town", "")), t["name"]["face"], _v(t["name"]["at"]) + dy, t["name"]["colour"])
		_say(str(towns[i].get("faction", "")), t["faction"]["face"], _v(t["faction"]["right"]) + dy, t["faction"]["colour"], HORIZONTAL_ALIGNMENT_RIGHT)
		var s: Dictionary = t["says"]
		_para(str(towns[i].get("says", "")), s, _v(s["at"]) + dy)
	var u: Dictionary = t["unseen"]
	_para(str(life.get("unseen", "")), u, Vector2(float(u["x"]), layout.towns_end(towns.size()) + float(u["dy"])))
	var lb: Dictionary = layout.text("left_behind")
	for i in lb["lines"].size():
		_say_spec(lb["lines"][i], lb, [lb["centre"][0], float(lb["centre"][1]) + float(lb["step"]) * i])
	var w: Dictionary = layout.text("wake")
	_say_spec(w["text"], w, w["centre"])
	var nl: Dictionary = layout.text("new_life")
	_say_spec(nl["text"], nl, nl["centre"])


# A line of text placed by the centre of a json spec ({face, colour, outline}).
func _say_spec(line: String, spec: Dictionary, centre: Array) -> void:
	_say(line, spec["face"], _v(centre), spec["colour"], HORIZONTAL_ALIGNMENT_CENTER, int(spec.get("outline", 0)))


# A wrapped paragraph from `at`, "step" apart ({face, wrap, step, colour}).
func _para(line: String, spec: Dictionary, at: Vector2) -> void:
	var lines := wrap_line(line, spec["face"], float(spec["wrap"]))
	for i in lines.size():
		_say(lines[i], spec["face"], at + Vector2(0, float(spec["step"]) * i), spec["colour"])


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
	var w := _width(line, face_name)
	var x := at.x - (w if align == HORIZONTAL_ALIGNMENT_RIGHT else w / 2.0 if align == HORIZONTAL_ALIGNMENT_CENTER else 0.0)
	var base := Vector2(x, roundf(at.y + f.get_ascent(px)))
	if outline > 0:
		# The json's outline is how far it reaches out from the letters; Godot's size
		# is its whole width, half of it outside.
		draw_string_outline(f, base, line, HORIZONTAL_ALIGNMENT_LEFT, -1, px, outline * 2, layout.colour("outline"))
	draw_string(f, base, line, HORIZONTAL_ALIGNMENT_LEFT, -1, px, layout.colour(colour))


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


func _piece(file: String) -> Texture2D:
	return _texture(_paths["death_pieces"].path_join(file))


func _texture(path: String) -> Texture2D:
	if not _textures.has(path):
		_textures[path] = _load(path)
	return _textures[path]


func _load(path: String) -> Resource:
	if not ResourceLoader.exists(path):
		push_error("death screen: missing %s" % path)
		return null
	return load(path)


static func _v(a: Variant) -> Vector2:
	if a is Vector2:
		return a
	return Vector2(a[0], a[1])
