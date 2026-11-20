class_name Hud
extends Control
# The HUD, "corners" (D244 to D246): bars top left behind your town's landmark, the
# small map and round buttons top right, the slots bottom middle, who you clicked on
# top middle, the skill that just rose over the slots, local speech bottom left.
# Drawn from the pieces and hud.json that scripts/art/ui/hud.mjs --pieces writes, in
# the json's own pixels (1152 x 648, the window) and in its order; text in Alegreya.
#
# It shows one state, a plain dictionary (what the client knows of its own
# character, D125; what the server sends for it is not settled, D176). Every key may
# be left out:
#   town        "Dawndoor" or "Oldscar": whose landmark is painted top left (D245)
#   heading     the race, e.g. "Human"; background, e.g. "Well-woken" (D158)
#   health      [now, most] (D125)
#   run         run energy, 0 to 1 (D228); running: true lights the Run button (D226)
#   protected   seconds of waking protection left (D72, D90); 0 or less: none
#   main_hand, off_hand   the item in each hand, or null (D171)
#   bandages    how many (D169); bandaging: how far through the 4 seconds, 0 to 1
#   open        the screen that is open ("Character", "Skills", "Map"): lights its button
#   pack        [filled, slots] (D124); coins (D123)
#   target      {name, detail} of who you clicked on, only what you know (D29), or null
#   risen       {skill, value} of the skill that just rose (D20), or null
#   speech      the last lines of local speech, [[who, said], ..] (D150)
# An item is {picture: pack picture name, material: a slot material}.
# The map's land is set apart, as a texture: map_land (null: all unseen, D146).

const SETTINGS := "res://data/client.json"
const RING_STEPS := 64 # a full turn of the bandage's ring is cut in this many wedges

var layout: HudLayout = null
var state: Dictionary = {}
var map_land: Texture2D = null

var _paths: Dictionary = {}
var _textures := {} # path -> Texture2D
var _fonts := {} # name -> Font
var _plate: StyleBoxTexture = null # the target's nine-patch


func _ready() -> void:
	if layout == null:
		setup_files(SETTINGS)


func setup_files(settings_path: String) -> void:
	var settings: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	if not settings is Dictionary or not settings.get("screens") is Dictionary:
		push_error("hud: %s has no screens group" % settings_path)
		return
	_paths = settings["screens"]
	setup(HudLayout.load_file(_paths["hud_layout"]))


func setup(hud_layout: HudLayout) -> void:
	layout = hud_layout
	if layout == null:
		return
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	custom_minimum_size = layout.size()
	size = layout.size()
	for name: String in layout.font_names():
		_fonts[name] = _load(_paths["fonts"].path_join(name + ".woff"))
	var p := layout.target_plate()
	var tex := _piece(p["file"])
	if tex != null:
		_plate = StyleBoxTexture.new()
		_plate.texture = tex
		_plate.texture_margin_left = float(p["patch_margin"]["left"])
		_plate.texture_margin_right = float(p["patch_margin"]["right"])
		_plate.texture_margin_top = float(p["patch_margin"]["top"])
		_plate.texture_margin_bottom = float(p["patch_margin"]["bottom"])


func show_state(new_state: Dictionary) -> void:
	state = new_state
	queue_redraw()


# The slot picture a slot shows: its item's material, or Empty.
func slot_file(slot_name: String) -> String:
	var s := layout.slot(slot_name)
	var item: Variant = item_in(slot_name)
	if item == null:
		return layout.slot_file(s["kind"], "Empty")
	if not layout.has_material(s["kind"], item["material"]):
		push_error("hud: no %s slot for the material %s" % [s["kind"], item["material"]])
		return layout.slot_file(s["kind"], "Empty")
	return layout.slot_file(s["kind"], item["material"])


func item_in(slot_name: String) -> Variant:
	if slot_name == "bandage":
		return {"picture": "Bandage", "material": "Cloth"} if int(state.get("bandages", 0)) > 0 else null
	return state.get(slot_name)


func is_lit(button: String) -> bool:
	if button == "Run":
		return bool(state.get("running", false))
	return state.get("open", "") == button


func protected_text() -> String:
	var s := int(ceilf(float(state.get("protected", 0))))
	return "%d:%02d" % [s / 60, s % 60] if s > 0 else ""


func health_text() -> String:
	var h: Array = state.get("health", [0, 0])
	return "%d / %d" % [h[0], h[1]]


func pack_text() -> String:
	var p: Array = state.get("pack", [0, 0])
	return "%d / %d" % [p[0], p[1]]


# The wedges of the bandage ring's fill to draw at a value: each [from, to] in turns
# clockwise from the top, none longer than a quarter turn.
static func ring_wedges(value: float) -> Array:
	var out: Array = []
	var v := clampf(value, 0.0, 1.0)
	var at := 0.0
	while at < v - 0.000001:
		var to := minf(v, at + 0.25)
		out.append([at, to])
		at = to
	return out


func _draw() -> void:
	if layout == null:
		return
	for layer: String in layout.order():
		if layout.is_piece(layer):
			if (layer != "Protected" or protected_text() != "") and (layer != "Crest Target" or state.get("target") is Dictionary):
				_put(layout.piece(layer))
		elif layer == "bars":
			_draw_bar("health", _ratio(state.get("health", [0, 1])))
			_draw_bar("run", float(state.get("run", 0.0)))
		elif layer == "emblem":
			var file := layout.emblem_file(state.get("town", "Dawndoor"))
			if file != "":
				_put({"file": file, "at": layout.emblem_at()})
		elif layer == "bandage ring":
			_draw_ring(float(state.get("bandaging", 0.0)))
		elif layer == "slots":
			for s: String in layout.slot_names():
				_put({"file": slot_file(s), "at": layout.slot(s)["at"]})
		elif layer == "pictures":
			_draw_pictures()
		elif layer == "map land":
			_draw_map()
		elif layer == "buttons":
			for b: Dictionary in layout.buttons():
				_put(b["on"] if is_lit(b["name"]) else b["off"])
		elif layer == "Plate Target":
			_draw_target_plate()
		elif layer == "rules":
			_draw_rules()
		elif layer == "text":
			_draw_text()
		else:
			push_error("hud: unknown layer %s" % layer)


func _draw_bar(name: String, value: float) -> void:
	var b := layout.bar(name)
	_put(b["under"])
	var tex := _piece(b["fill"]["file"])
	if tex == null:
		return
	var w := clampf(roundf(layout.fill_end(name, value)) - b["fill"]["at"].x, 0.0, float(tex.get_width()))
	if w > 0.0:
		var h := float(tex.get_height())
		draw_texture_rect_region(tex, Rect2(b["fill"]["at"], Vector2(w, h)), Rect2(0, 0, w, h))


func _draw_ring(value: float) -> void:
	var r := layout.ring()
	_put(r["under"])
	var tex := _piece(r["fill"]["file"])
	if tex == null or value <= 0.0:
		return
	var at: Vector2 = r["fill"]["at"]
	var tex_size := Vector2(tex.get_size())
	var c: Vector2 = r["centre"]
	var reach := tex_size.length() # past every corner of the piece
	var box := PackedVector2Array([at, at + Vector2(tex_size.x, 0), at + tex_size, at + Vector2(0, tex_size.y)])
	for w: Array in ring_wedges(value):
		var points := PackedVector2Array([c])
		var steps := maxi(1, ceili((w[1] - w[0]) * RING_STEPS))
		for i in steps + 1:
			var turn: float = lerpf(w[0], w[1], float(i) / steps)
			points.append(c + Vector2(sin(turn * TAU), -cos(turn * TAU)) * reach)
		# Cut to the piece: past its edge a texture's border pixels would be stretched.
		for part: PackedVector2Array in Geometry2D.intersect_polygons(points, box):
			var uvs := PackedVector2Array()
			for p in part:
				uvs.append((p - at) / tex_size)
			draw_colored_polygon(part, Color.WHITE, uvs, tex)


func _draw_pictures() -> void:
	for s: String in layout.slot_names():
		var item: Variant = item_in(s)
		if item == null:
			continue
		var tex := _texture(_paths["item_pictures"].path_join(item["picture"] + ".png"))
		if tex != null:
			draw_texture_rect_region(tex, layout.picture_rect(layout.slot(s)), layout.picture_from())


func _draw_map() -> void:
	var c := layout.map_centre()
	var r := layout.map_radius()
	if map_land == null:
		draw_circle(c, r, layout.map_unseen())
		return
	var points := PackedVector2Array()
	var uvs := PackedVector2Array()
	for i in 96:
		var a := TAU * i / 96.0
		var d := Vector2(cos(a), sin(a))
		points.append(c + d * r)
		uvs.append(Vector2(0.5, 0.5) + d * 0.5)
	draw_colored_polygon(points, Color.WHITE, uvs, map_land)


func _target_width() -> float:
	var t: Variant = state.get("target")
	if not t is Dictionary:
		return 0.0
	var spec: Dictionary = layout.text("target")
	return maxf(_width(t.get("name", ""), spec["name"]["face"]), _width(t.get("detail", ""), spec["detail"]["face"]))


func _draw_target_plate() -> void:
	if not state.get("target") is Dictionary or _plate == null:
		return
	var tex := _plate.texture
	draw_style_box(_plate, layout.target_rect(_target_width(), tex.get_width(), tex.get_height()))


func _toast() -> Dictionary:
	var risen: Variant = state.get("risen")
	if not risen is Dictionary:
		return {}
	var face: String = layout.text("toast")["face"]
	var a := "%s rises to " % risen["skill"]
	var b := str(risen["value"])
	var w := _width(a, face) + _width(b, face)
	return {"a": a, "b": b, "w": w, "x": roundf(float(layout.toast()["centre_x"]) - w / 2.0), "y": float(layout.toast()["top"])}


func _draw_rules() -> void:
	var t := _toast()
	if t.is_empty():
		return
	var spec := layout.toast()
	var left: Dictionary = spec["rule_left"]
	var right: Dictionary = spec["rule_right"]
	_put({"file": left["file"], "at": Vector2(t["x"] + float(left["dx"]), t["y"] + float(left["dy"]))})
	_put({"file": right["file"], "at": Vector2(t["x"] + roundf(t["w"]) + float(right["dx"]), t["y"] + float(right["dy"]))})


func _draw_text() -> void:
	var race: Dictionary = layout.text("race")
	_say(str(state.get("heading", "")), race["face"], _v(race["at"]), race["colour"])
	var bg: Dictionary = layout.text("background")
	_say(str(state.get("background", "")), bg["face"], _v(bg["right"]), bg["colour"], HORIZONTAL_ALIGNMENT_RIGHT)
	if state.has("health"):
		var h: Dictionary = layout.text("health")
		_say(health_text(), h["face"], _v(h["centre"]), h["colour"], HORIZONTAL_ALIGNMENT_CENTER, int(h["outline"]))
	if protected_text() != "":
		var p: Dictionary = layout.text("protection")
		_say(protected_text(), p["face"], _v(p["at"]), p["colour"], HORIZONTAL_ALIGNMENT_LEFT, int(p["outline"]))
	var n := int(state.get("bandages", 0))
	if n > 0:
		var bn: Dictionary = layout.text("bandages")
		_say(str(n), bn["face"], _v(bn["at"]), bn["colour"], HORIZONTAL_ALIGNMENT_LEFT, int(bn["outline"]))
	var bk: Dictionary = layout.text("bandage_key")
	_say(bk["text"], bk["face"], _v(bk["at"]), bk["colour"], HORIZONTAL_ALIGNMENT_LEFT, int(bk["outline"]))
	var key: Dictionary = layout.text("button_key")
	for b: Dictionary in layout.buttons():
		_say(b["key"], key["face"], b["centre"] + _v(key["from_centre"]), key["colour"]["on" if is_lit(b["name"]) else "off"], HORIZONTAL_ALIGNMENT_LEFT, int(key["outline"]))
	for group: String in ["pack", "coins"]:
		var g: Dictionary = layout.text(group)
		_say(group.capitalize(), g["face"], _v(g["label_at"]), "label", HORIZONTAL_ALIGNMENT_LEFT, int(g["outline"]))
		_say(pack_text() if group == "pack" else str(state.get("coins", 0)), g["face"], _v(g["value_at"]), "value", HORIZONTAL_ALIGNMENT_LEFT, int(g["outline"]))
	var t: Variant = state.get("target")
	if t is Dictionary:
		var spec: Dictionary = layout.text("target")
		_say(t.get("name", ""), spec["name"]["face"], _v(spec["name"]["centre"]), spec["name"]["colour"], HORIZONTAL_ALIGNMENT_CENTER)
		_say(t.get("detail", ""), spec["detail"]["face"], _v(spec["detail"]["centre"]), spec["detail"]["colour"], HORIZONTAL_ALIGNMENT_CENTER)
	var toast := _toast()
	if not toast.is_empty():
		var ts: Dictionary = layout.text("toast")
		_say(toast["a"], ts["face"], Vector2(toast["x"], toast["y"]), ts["label"], HORIZONTAL_ALIGNMENT_LEFT, int(ts["outline"]))
		_say(toast["b"], ts["face"], Vector2(toast["x"] + _width(toast["a"], ts["face"]), toast["y"]), ts["value"], HORIZONTAL_ALIGNMENT_LEFT, int(ts["outline"]))
	var sp: Dictionary = layout.text("speech")
	var lines: Array = state.get("speech", [])
	lines = lines.slice(maxi(0, lines.size() - int(sp["lines"])))
	for i in lines.size():
		var at := _v(sp["at"]) + Vector2(0, i * float(sp["step"]))
		var who := "%s:" % lines[i][0]
		_say(who, sp["face"], at, sp["who"], HORIZONTAL_ALIGNMENT_LEFT, int(sp["outline"]))
		_say(str(lines[i][1]), sp["face"], at + Vector2(_width(who, sp["face"]) + float(sp["gap"]), 0), sp["said"], HORIZONTAL_ALIGNMENT_LEFT, int(sp["outline"]))
	var hint: Dictionary = sp["hint"]
	_say(hint["text"], hint["face"], _v(hint["at"]), hint["colour"])


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
	return _texture(_paths["hud_pieces"].path_join(file))


func _texture(path: String) -> Texture2D:
	if not _textures.has(path):
		_textures[path] = _load(path)
	return _textures[path]


func _load(path: String) -> Resource:
	if not ResourceLoader.exists(path):
		push_error("hud: missing %s" % path)
		return null
	return load(path)


static func _ratio(h: Array) -> float:
	return float(h[0]) / float(h[1]) if float(h[1]) > 0.0 else 0.0


static func _v(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
