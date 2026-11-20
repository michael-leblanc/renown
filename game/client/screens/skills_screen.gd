class_name SkillsScreen
extends Control
# The Skills screen (D242, D243, D252): the whole skill tree as a wheel of eight webs
# round a rosette, which the player zooms and drags about, with fixed panels over it.
# Drawn from the pieces and skills.json that scripts/art/ui/skills_tree.mjs --pieces
# writes, the way the tree page draws it (skills_tree_page.mjs, agreed for v1 on
# 2026-11-20); text in Alegreya. The window is 1152 x 648.
#
# It shows one character, a plain dictionary (what the server sends for it is not
# settled, D176): {levels: {skill: level}, taken: [node id, ..], paid: {bridge id:
# skill}}. A node id is "<skill>/<key>" (skills_layout.gd).
#   Scroll to zoom about the pointer, drag to move, the panel's - and + to zoom, the
#   figure to fly back to the whole wheel. A medallion flies into its web.
#   Pointing at a web node shows a note beside it and the way to it; a click picks it
#   and the card at the right explains it, with Take (or Take route).
#   Take sends took([id]); Take route sends took([ids along the way, in order]). The
#   screen does not change the character itself: whoever owns it decides and calls
#   show_state again. Close (or Esc) sends closed.
# Not here yet (the page has them): the opening fade, the ring filling to a new level,
# the flash of a node just taken and the light running along its strand.

signal took(ids: Array)
signal closed

const SETTINGS := "res://data/client.json"
const DRAG := 5.0 # pixels the pointer moves before a press becomes a drag

var layout: SkillsLayout = null
var character: Dictionary = {}
var z := 1.0 # the zoom
var cam := Vector2.ZERO # the tree's point at the screen's "look"
var pick := "" # a node or bead id, "skill:<name>", or ""
var hover := ""

var _paths: Dictionary = {}
var _textures := {}
var _fonts := {}
var _glows := {}
var _tree: _Layer
var _over: _Layer
var _hits: Array = []
var _press := Vector2.ZERO
var _moved := -1.0 # -1: no button held
var _fly: Tween


class _Layer:
	extends Control
	var paint: Callable

	func _draw() -> void:
		paint.call(self)


func _ready() -> void:
	if layout == null:
		setup_files(SETTINGS)


func setup_files(settings_path: String) -> void:
	var settings: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	if not settings is Dictionary or not settings.get("screens") is Dictionary:
		push_error("skills screen: %s has no screens group" % settings_path)
		return
	_paths = settings["screens"]
	setup(SkillsLayout.load_file(_paths["skills_layout"]))


func setup(skills_layout: SkillsLayout) -> void:
	layout = skills_layout
	if layout == null:
		return
	mouse_filter = Control.MOUSE_FILTER_STOP
	custom_minimum_size = layout.size()
	size = layout.size()
	for name: String in layout.font_names():
		_fonts[name] = _load(_paths["fonts"].path_join(name + ".woff"))
	_tree = _layer(layout.view(), _draw_tree)
	_tree.clip_contents = true
	_over = _layer(Rect2(Vector2.ZERO, layout.size()), _draw_over)
	z = float(layout.zoom("open"))
	cam = SkillsLayout._vec(layout.zoom("home"))


func _layer(rect: Rect2, paint: Callable) -> _Layer:
	var l := _Layer.new()
	l.paint = paint
	l.position = rect.position
	l.size = rect.size
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(l)
	return l


func show_state(ch: Dictionary) -> void:
	character = ch
	_redraw()


func _redraw() -> void:
	queue_redraw()
	if _tree != null:
		_tree.queue_redraw()
		_over.queue_redraw()


# ---------- the camera ----------
func to_screen(p: Vector2) -> Vector2:
	return (p - cam) * z + layout.look()


func to_tree(p: Vector2) -> Vector2:
	return (p - layout.look()) / z + cam


# Zoom to `to`, keeping the tree's point under `at` (a screen point) where it is.
func zoom_to(to: float, at := Vector2(-1, -1)) -> void:
	if at.x < 0:
		at = layout.look()
	var w := to_tree(at)
	z = clampf(to, float(layout.zoom("min")), float(layout.zoom("max")))
	cam = w - (at - layout.look()) / z
	_hold()
	_redraw()


func fly_to(p: Vector2, to: float) -> void:
	if _fly != null:
		_fly.kill()
	if not is_inside_tree():
		z = to
		cam = p
		_redraw()
		return
	_fly = create_tween().set_parallel().set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	var s := float(layout.zoom("fly_s"))
	_fly.tween_property(self, "z", to, s)
	_fly.tween_property(self, "cam", p, s)
	_fly.tween_method(func(_k: float) -> void: _redraw(), 0.0, 1.0, s)


func _hold() -> void:
	var x: Array = layout.zoom("camera_x")
	var y: Array = layout.zoom("camera_y")
	cam = Vector2(clampf(cam.x, x[0], x[1]), clampf(cam.y, y[0], y[1]))


# ---------- input ----------
func _gui_input(event: InputEvent) -> void:
	if layout == null:
		return
	var motion := event as InputEventMouseMotion
	if motion != null:
		if _moved >= 0:
			_moved += motion.relative.length()
			if _moved > DRAG and hit(_press) != "panel":
				cam -= motion.relative / z
				_hold()
				_redraw()
			accept_event()
			return
		var h := hit(motion.position)
		var hv := h if h.contains("/") or h.begins_with("find:") else ""
		if hv != hover:
			hover = hv
			_redraw()
		return
	var b := event as InputEventMouseButton
	if b == null:
		return
	if b.pressed and (b.button_index == MOUSE_BUTTON_WHEEL_UP or b.button_index == MOUSE_BUTTON_WHEEL_DOWN):
		var k := float(layout.zoom("wheel"))
		zoom_to(z * (k if b.button_index == MOUSE_BUTTON_WHEEL_UP else 1.0 / k), b.position)
	elif b.button_index == MOUSE_BUTTON_LEFT and b.pressed:
		_press = b.position
		_moved = 0.0
	elif b.button_index == MOUSE_BUTTON_LEFT and not b.pressed and _moved >= 0:
		if _moved <= DRAG:
			click(hit(b.position))
		_moved = -1.0
	else:
		return
	accept_event()


func _unhandled_key_input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_cancel"):
		closed.emit()
		get_viewport().set_input_as_handled()


# What is under a screen point, from the last drawing: a node id, "skill:<name>",
# "find:<name>", "close", "in", "out", "home", "take", "route", "panel" or "".
func hit(p: Vector2) -> String:
	var best := ""
	var bd := INF
	for i in range(_hits.size() - 1, -1, -1):
		var h: Dictionary = _hits[i]
		if h.has("box"):
			if (h["box"] as Rect2).has_point(p):
				return best if best != "" else str(h["what"])
			continue
		var d := p.distance_to(h["at"])
		if d <= float(h["r"]) and d < bd:
			best = str(h["what"])
			bd = d
	return best


func click(what: String) -> void:
	if what == "panel":
		return
	if what == "":
		pick = ""
	elif what == "close":
		closed.emit()
		return
	elif what == "in":
		zoom_to(z * float(layout.zoom("step")))
		return
	elif what == "out":
		zoom_to(z / float(layout.zoom("step")))
		return
	elif what == "home":
		fly_to(SkillsLayout._vec(layout.zoom("home")), float(layout.zoom("open")))
		return
	elif what == "take":
		if pick.contains("/") and layout.state_of(character, pick) == "open":
			took.emit([pick])
		return
	elif what == "route":
		var r := layout.route_to(character, pick)
		if not r.is_empty() and r["ok"]:
			took.emit(r["path"])
		return
	elif what.begins_with("find:"):
		var s := what.substr(5)
		pick = "skill:" + s
		fly_to(layout.into(s), 1.0 if layout.is_web(s) else 2.0)
	else:
		pick = what
		if what.begins_with("skill:"):
			var s := what.substr(6)
			if layout.is_web(s) and z < float(layout.zoom("near")):
				fly_to(layout.into(s), 1.0)
	_redraw()


# ---------- drawing ----------
func _draw() -> void:
	if layout == null:
		return
	var f: Dictionary = layout.j("pieces")["Frame"]
	_tex_at(self, f["file"], f["at"])


func _draw_tree(c: CanvasItem) -> void:
	_hits = [] # what can be clicked, refilled each drawing: the tree first, then what stays put
	c.draw_set_transform(-layout.view().position)
	var g: Dictionary = layout.j("pieces")["Ground"]
	_tex_at(c, g["file"], g["at"])
	var far := z < float(layout.zoom("far"))
	var near := z >= float(layout.zoom("near"))
	var lo: Dictionary = layout.j("look_of")
	var aim := hover if hover.contains("/") else pick if pick.contains("/") else ""
	var route := layout.route_to(character, aim) if aim != "" and not layout.by_id[aim]["bead"] and layout.state_of(character, aim) == "locked" else {}
	var thin := maxf(1.4, 2.0 * maxf(.6, z))
	for s: Dictionary in layout.skills:
		var later := bool(s["later"])
		var lw := maxf(1.6, (2.0 if later else 3.0) * maxf(.6, z))
		_strand(c, _v(s["spoke"][0]), _v(s["spoke"][1]), not later, lw, Color.html(lo["bronze"]), Color.html(lo["spoke_unlit"]))
		if not s.has("nodes"):
			if not far:
				_strand(c, _v(s["stem"][0]), _v(s["stem"][1]), false, thin, Color(), Color.html(lo["spoke_unlit"]))
				for n: Dictionary in s["blank"]:
					var from: Vector2 = _v(s["fork"]) if int(n["after"]) < 0 else _v(s["blank"][int(n["after"])]["at"])
					_strand(c, from, _v(n["at"]), false, thin, Color(), Color.html(lo["spoke_unlit"]))
			continue
		var name: String = s["name"]
		if not far:
			for h: Dictionary in s["haze"]:
				var p := to_screen(_v(h["at"]))
				_glow(c, p, 0.0, float(h["radius"]) * z, layout.side_colour("e" if h["side"] == "left" else "g"), .07)
			for b: Dictionary in s["beads"]:
				if b.has("ring"):
					_ring(c, b)
		_strand(c, _v(s["stem"][0]), _v(s["stem"][1]), true, lw * .8, Color.html(lo["bronze"]), Color())
		if not far:
			var tail: Array = s["tail"]
			for i in range(1, tail.size()):
				_strand(c, layout.at(name + "/" + tail[i - 1]), layout.at(name + "/" + tail[i]), false, thin * .7, Color(), Color.html(lo["unlit"]))
		for l: Array in s["links"]:
			var a: Dictionary = layout.by_id[name + "/" + l[0]]
			var b2: Dictionary = layout.by_id[name + "/" + l[1]]
			var lit := layout.is_on(character, a["id"]) and layout.is_on(character, b2["id"])
			if far and not lit:
				continue
			var fam: String = a["colour"] if a.has("colour") and a["colour"] != "t" else b2.get("colour", "t")
			var stub: bool = a.get("kind", "") == "stub" or b2.get("kind", "") == "stub"
			_strand(c, _v(a["at"]), _v(b2["at"]), lit, lw * .72 if lit else thin * (.5 if stub else .9), layout.side_colour(fam), Color.html(lo["unlit"]))
		for l: Array in s["cross"]:
			var a := name + "/" + str(l[0])
			var bid := str(l[1])
			var lit := layout.is_taken(character, a) and layout.is_taken(character, bid)
			if lit:
				_strand(c, layout.at(a), layout.at(bid), true, lw * .72, layout.side_colour("x"), Color())
			elif not far:
				var p0 := to_screen(layout.at(a))
				var p1 := to_screen(layout.at(bid))
				var d := p0.distance_to(p1)
				c.draw_dashed_line(p0, p0 + (p1 - p0) * minf(d, 60.0 * z) / d, Color.html(lo["unlit"]), thin * .7, 3.0)
		if not route.is_empty() and route["path"].size() > 0 and layout.by_id[route["path"][0]]["skill"] == name and not far:
			var pts: Array = [to_screen(layout.at(route["from"]))]
			for x: String in route["path"]:
				pts.append(to_screen(layout.at(x)))
			for i in range(1, pts.size()):
				c.draw_dashed_line(pts[i - 1], pts[i], Color.html(lo["route_ok"] if route["ok"] else lo["route_no"]), maxf(1.4, 1.4 * z), 6.0)
	var names: Array = []
	for s: Dictionary in layout.skills:
		if not s.has("nodes"):
			for n: Dictionary in s["blank"]:
				var p := to_screen(_v(n["at"]))
				if far:
					_piece_at(c, "Node Locked", p, maxf(3.0, 4.0 * z) / 9.0)
				else:
					_piece_at(c, "Notable Bare Locked" if n["kind"] == "notable" else "Node Locked", p, float(n["r"]) * z / (12.0 if n["kind"] == "notable" else 9.0))
			continue
		if not far:
			for b: Dictionary in s["beads"]:
				var p := to_screen(_v(b["at"]))
				var r := float(b["r"]) * z
				_piece_at(c, "Node Taken" if layout.bead_on(character, b) else "Node Locked", p, r / 9.0)
				if pick == b["id"]:
					_ring2(c, p, r + 3.0, false)
				_hits.append({"at": p, "r": maxf(6.5, r + 4.0), "what": b["id"]})
				if pick == b["id"] or hover == b["id"]:
					var bn: String = "Later" if b["soon"] else str(b["name"]) + (" %d" % int(b["level"]) if int(b["level"]) else "")
					names.append([bn, p, r, "label" if layout.bead_on(character, b) else "hint", {"along": [0, 1], "pad": 10, "align": "center"}])
				if b.has("ring") and b["ring"]["label"] != null:
					var rl: Dictionary = b["ring"]["label"]
					names.append([rl["text"], to_screen(_v(rl["at"])), 0.0, "label" if layout.bead_on(character, b) else "hint", {"along": [0, 0], "pad": 0, "align": rl["align"]}])
		for n: Dictionary in s["nodes"]:
			_draw_node(c, n, far, near, route, names)
	var mz := float(layout.zoom("medallion_min"))
	var hb: Dictionary = layout.j("tree")["hub"]
	var plates: Array = []
	for s: Dictionary in layout.skills:
		var zz := maxf(z, mz)
		var name: String = s["name"]
		var h := to_screen(_v(s["hub"]))
		var f := layout.free_points(character, name)
		var v := layout.level(character, name)
		var gl: Array = hb["glow"]
		if f > 0:
			_glow(c, h, float(gl[0]) * zz, float(gl[1]) * zz + float(gl[2]), layout.colour("blue"), .5)
		_piece_at(c, "Ring Empty", h, zz)
		if v > 0:
			_pie(c, "Ring Full", h, zz, v / 100.0)
		_piece_at(c, "Medallion " + name, h, zz)
		var ring := float(hb["ring"]) * zz
		if pick == "skill:" + name:
			_ring2(c, h, ring + (9.0 if f > 0 else 5.0), false)
		if f > 0:
			c.draw_arc(h, ring + float(hb["plus_gap"]), 0, TAU, 64, Color.html(lo["blue_ring"]), 2.2, true)
			_say(c, "+%d" % f, "title", h + Vector2(0, ring + 5), layout.colour("blue"), "center", true, 2)
		_hits.append({"at": h, "r": float(hb["hit"]) * zz, "what": "skill:" + name})
		var face := "line" if far else "title"
		var py := roundf(h.y + float(hb["plate_dy"]) * zz + (float(hb["under_100"]) if zz < 1.0 else 0.0) + (float(hb["with_points"]) if f > 0 else 0.0))
		plates.append([s, h.x, py, face, f])
	_piece_at(c, "Rosette", to_screen(layout.root()), maxf(z, mz))
	for pl: Array in plates:
		var s: Dictionary = pl[0]
		var later := bool(s["later"])
		var face: String = pl[3]
		var val := "later" if later else str(layout.level(character, s["name"]))
		var vface := "line" if later else face
		var nw := _width(s["name"], face)
		var wd := nw + (5.0 if far else 7.0) + _width(val, vface) + (16.0 if far else 24.0)
		var hh := 20.0 if far else 26.0
		_plate(c, Rect2(pl[1] - wd / 2.0, pl[2] - hh / 2.0, wd, hh))
		var x0: float = pl[1] - wd / 2.0 + (8.0 if far else 12.0)
		_say(c, s["name"], face, Vector2(x0, pl[2]), layout.colour("hint" if later else "label"), "left", true)
		_say(c, val, vface, Vector2(x0 + nw + (5.0 if far else 7.0), pl[2]), layout.colour("hint" if later else "value"), "left", true)
	for nm: Array in names:
		var L: Dictionary = nm[4]
		var p: Vector2 = nm[1] + _v(L["along"]) * (float(nm[2]) + float(L["pad"]))
		_say(c, nm[0], "line", p, layout.colour(nm[3]), L["align"], true, 2)
	if z >= float(layout.zoom("side_names")):
		for s: Dictionary in layout.skills:
			for sn: Dictionary in s.get("side_names", []):
				var col := layout.side_colour("e" if sn["side"] == "left" else "g")
				col.a = float(layout.j("text")["side_name"]["alpha"])
				_say(c, sn["text"], "title", to_screen(_v(sn["at"])), col, "center", true, 2)
	c.draw_set_transform(Vector2.ZERO)


func _draw_node(c: CanvasItem, n: Dictionary, far: bool, near: bool, route: Dictionary, names: Array) -> void:
	var id: String = n["id"]
	var p := to_screen(_v(n["at"]))
	var st := layout.state_of(character, id)
	var key := "Locked" if st == "dark" else st.capitalize()
	var kind: String = n["kind"]
	var notable := kind == "notable"
	var little := not layout.is_named(n)
	var lo: Dictionary = layout.j("look_of")
	if far:
		_piece_at(c, "Node " + key, p, (maxf(1.8, 2.4 * z) if little else maxf(3.0, 4.0 * z)) / 9.0)
		_hits.append({"at": p, "r": 5.0 if little else 9.0, "what": id})
		return
	var r := float(n["r"]) * z
	var col := layout.side_colour(n["colour"])
	if st == "open":
		_glow(c, p, r * .7, r + (6.0 if little else 10.0) * maxf(1.0, z * .8), col, .4)
	if kind == "bridge" or kind == "stub":
		c.draw_arc(p, r + 2.2 * z, 0, TAU, 48, Color(214 / 255.0, 170 / 255.0, 98 / 255.0, .8) if st == "taken" else Color(110 / 255.0, 116 / 255.0, 116 / 255.0, .7), maxf(1.0, .7 * z), true)
	var bare := ("Notable" if notable else "Node") + " Bare "
	var k := float(n["r"]) / (12.0 if notable else 9.0) * z
	_piece_at(c, bare + key, p, k, Color(1, 1, 1, float(lo["stub_alpha"]) if kind == "stub" else 1.0))
	if st == "dark":
		_piece_at(c, bare + "Taken", p, k, Color(1, 1, 1, float(lo["dark_overlay"])))
	if kind != "stub":
		var sg: Dictionary = layout.j("signs")
		var size := r * float(sg["size"][kind])
		var tint := Color.html(lo["sign_taken"]) if st == "taken" else Color(col, float(lo["sign_alpha"][st]))
		if size >= float(sg["min_px"]):
			var tex := _piece(n["sign"] + ".png")
			if tex != null:
				c.draw_texture_rect(tex, Rect2(p - Vector2(size, size) / 2.0, Vector2(size, size)), false, tint)
		else:
			c.draw_circle(p, r * float(sg["dot"]), tint)
		if st == "taken":
			var d := r + (3.0 if notable else 1.7) * z
			_shape(c, p, d, notable, Color(col, .7), maxf(1.0, .6 * z))
		if not route.is_empty() and route["path"].has(id):
			c.draw_arc(p, r + 3.2 * maxf(1.0, z * .6), 0, TAU, 48, Color.html(lo["route_ok"] if route["ok"] else lo["route_no"]), 1.3, true)
	if pick == id:
		_ring2(c, p, r + 4.0, notable)
	elif hover == id:
		_shape(c, p, r + 3.0, notable, Color.html(lo["pointed"]), 1.2)
	_hits.append({"at": p, "r": maxf(7.5 if little else 10.0, r + 4.0), "what": id})
	if (near and layout.is_named(n)) or pick == id:
		var nn: Dictionary = layout.j("text")["node_name"]
		names.append([n["name"], p, r + (2.0 if notable else 0.0), nn["colour"][st], n["label"]])


# A material's ring across a web: dotted, warm once the material is reached.
func _ring(c: CanvasItem, b: Dictionary) -> void:
	var lo: Dictionary = layout.j("look_of")
	var R := to_screen(layout.root())
	var rad := float(b["ring"]["radius"]) * z
	var col := Color.html(lo["ring_on"] if layout.bead_on(character, b) else lo["ring_off"])
	var a := deg_to_rad(float(b["ring"]["from"]))
	var end := deg_to_rad(float(b["ring"]["to"]))
	var dash := 2.5 * z / rad
	var step := 6.0 * z / rad
	while a < end:
		var e := minf(a + dash, end)
		c.draw_line(R + Vector2.from_angle(a) * rad, R + Vector2.from_angle(e) * rad, col, maxf(1.0, .8 * z), true)
		a += step


func _strand(c: CanvasItem, a: Vector2, b: Vector2, lit: bool, w: float, col: Color, dim: Color) -> void:
	a = to_screen(a)
	b = to_screen(b)
	var lo: Dictionary = layout.j("look_of")
	if lit:
		c.draw_line(a, b, Color.html(lo["under"]), w + 1.6, true)
		c.draw_line(a, b, col, w, true)
		c.draw_line(a, b, Color.html(lo["on_top"]), maxf(.6, w * .3), true)
	else:
		c.draw_line(a, b, dim, w, true)


func _shape(c: CanvasItem, p: Vector2, d: float, diamond: bool, col: Color, w: float) -> void:
	if diamond:
		c.draw_polyline(PackedVector2Array([p + Vector2(0, -d), p + Vector2(d, 0), p + Vector2(0, d), p + Vector2(-d, 0), p + Vector2(0, -d)]), col, w, true)
	else:
		c.draw_arc(p, d, 0, TAU, 48, col, w, true)


func _ring2(c: CanvasItem, p: Vector2, r: float, notable: bool) -> void:
	_shape(c, p, r * (1.06 if notable else 1.0), notable, Color.html(layout.j("look_of")["picked"]), 2.0)


# A soft round light: `a` at its middle out to r0, nothing at r1.
func _glow(c: CanvasItem, p: Vector2, r0: float, r1: float, col: Color, a: float) -> void:
	if r1 <= 0.0:
		return
	var k := int(roundf(clampf(r0 / r1, 0.0, .95) * 20.0))
	if not _glows.has(k):
		var g := Gradient.new()
		g.set_color(0, Color(1, 1, 1, 1))
		g.set_color(1, Color(1, 1, 1, 0))
		g.set_offset(0, k / 20.0)
		var t := GradientTexture2D.new()
		t.gradient = g
		t.fill = GradientTexture2D.FILL_RADIAL
		t.fill_from = Vector2(.5, .5)
		t.fill_to = Vector2(1, .5)
		t.width = 128
		t.height = 128
		_glows[k] = t
	c.draw_texture_rect(_glows[k], Rect2(p - Vector2(r1, r1), Vector2(r1, r1) * 2.0), false, Color(col, a))


# A tree piece with its middle on p, shrunk to `k` of its size at 100% (pieces are "scale" times bigger).
func _piece_at(c: CanvasItem, name: String, p: Vector2, k: float, mod := Color.WHITE) -> void:
	var tp: Dictionary = layout.j("tree_pieces")[name]
	var tex := _piece(tp["file"])
	if tex == null:
		return
	var s := k / float(layout.j("scale"))
	c.draw_texture_rect(tex, Rect2(p - _v(tp["middle"]) * s, tex.get_size() * s), false, mod)


# Ring Full shown as a pie from the top, clockwise, up to `part` of a turn.
func _pie(c: CanvasItem, name: String, p: Vector2, k: float, part: float) -> void:
	var tp: Dictionary = layout.j("tree_pieces")[name]
	var tex := _piece(tp["file"])
	if tex == null:
		return
	var s := k / float(layout.j("scale"))
	var mid := _v(tp["middle"])
	var big := tex.get_size().length()
	var pts := PackedVector2Array([mid])
	var steps := maxi(2, int(ceil(part * 64.0)))
	for i in steps + 1:
		pts.append(mid + Vector2.from_angle(-PI / 2.0 + TAU * part * i / steps) * big)
	var uvs := PackedVector2Array()
	var at := PackedVector2Array()
	for q in pts:
		uvs.append(q / tex.get_size())
		at.append(p + (q - mid) * s)
	c.draw_colored_polygon(at, Color.WHITE, uvs, tex)


# ---------- what stays put ----------
func _draw_over(c: CanvasItem) -> void:
	var P: Dictionary = layout.j("panels")
	var cl: Dictionary = layout.j("pieces")["Close"]
	_tex_at(c, cl["file"], cl["at"])
	_hits.append({"at": _v(P["close"]["centre"]), "r": float(P["close"]["radius"]), "what": "close"})
	var S: Dictionary = P["skills"]
	var list: Array = []
	for s: Dictionary in layout.skills:
		if layout.free_points(character, s["name"]) > 0:
			list.append(s["name"])
	var step := float(S["row_step"])
	var first := _v(S["first_row"])
	var h := maxf(float(S["min_height"]), first.y + list.size() * step + (30.0 if list.size() else 8.0) - 24.0)
	var box := Rect2(_v(S["at"]), Vector2(float(S["width"]), h))
	_plate(c, box)
	_hits.append({"box": box, "what": "panel"})
	_say(c, "Skills", "heading", _v(S["heading"]), layout.colour("value"))
	_say(c, "Total", "title", _v(S["total"]), layout.colour("label"))
	_say(c, "%d / %d" % [layout.total(character), int(layout.rule("total_cap"))], "title", _v(S["total"]) + Vector2(_width("Total", "title") + 8.0, 0), layout.colour("value"))
	_say(c, "Points to spend", "title", _v(S["points"]), layout.colour("label"))
	for i in list.size():
		var y := first.y + i * step
		_say(c, list[i], "line", Vector2(first.x, y), layout.colour("label" if hover == "find:" + list[i] else "value"))
		_say(c, "+%d" % layout.free_points(character, list[i]), "line", Vector2(float(S["plus_right"]), y), layout.colour("blue"), "right")
		_hits.append({"box": Rect2(first.x - 8.0, y - 2.0, float(S["width"]) - 12.0, 18.0), "what": "find:" + list[i]})
	if list.size():
		_say(c, "Click one to find it", "line", Vector2(first.x, first.y + list.size() * step + 6.0), layout.colour("hint"))
	else:
		_say(c, "None", "line", first, layout.colour("hint"))
	var Z: Dictionary = P["zoom"]
	var zr := _r(Z["rect"])
	_plate(c, zr)
	var bt: Dictionary = layout.j("pieces")["Button"]
	var off := _v(bt["at"]) - _r(Z["out"]).position
	_tex_at(c, bt["file"], _r(Z["out"]).position + off)
	_tex_at(c, bt["file"], _r(Z["in"]).position + off)
	_say(c, "−", "title", Vector2(_r(Z["out"]).get_center().x, float(Z["figure"][1])), layout.colour("value"), "center", true)
	_say(c, "+", "title", Vector2(_r(Z["in"]).get_center().x, float(Z["figure"][1])), layout.colour("value"), "center", true)
	_say(c, "%d%%" % roundi(z * 100.0), "title", _v(Z["figure"]), layout.colour("value"), "center", true)
	_hits.append({"box": zr, "what": "panel"})
	_hits.append({"box": _r(Z["out"]), "what": "out"})
	_hits.append({"box": _r(Z["in"]), "what": "in"})
	_hits.append({"box": _r(Z["home"]), "what": "home"})
	if pick != "":
		_card(c)
	if hover.contains("/") and hover != pick:
		_tip(c, hover)


# The picked node, bead or skill, explained at the right.
func _card(c: CanvasItem) -> void:
	var C: Dictionary = layout.j("panels")["card"]
	var x := float(C["x"])
	var w := float(C["width"])
	var tx := x + float(C["text_x"])
	var tw := w - 2.0 * float(C["text_x"])
	var rows: Array = []
	var button: Array = []
	var ch := character
	if pick.begins_with("skill:"):
		var s := pick.substr(6)
		rows.append(["head", s])
		if layout.is_later(s):
			rows.append(["pair", "Later", ""])
			rows.append(["text", "This skill comes after the first eight.", "hint"])
		else:
			rows.append(["pair", "Skill", "%d / 100" % layout.level(ch, s)])
			rows.append(["text", "Rises as you use it. A point every %d levels. A mark at %s: each lets you take one named node." % [int(layout.rule("point_every")), ", ".join(PackedStringArray(layout.rule("marks").map(func(m: Variant) -> String: return str(int(m)))))], "value"])
			rows.append(["gap"])
			rows.append(["kv", "Points", "%d to spend, %d spent" % [layout.free_points(ch, s), layout.spent(ch, s)]])
			var paths: Dictionary = layout.by_name[s]["paths"]
			rows.append(["kv", "Paths", "%s, %s" % [paths["left"], paths["right"]]])
	else:
		var n: Dictionary = layout.by_id[pick]
		var s: String = n["skill"]
		var st := layout.state_of(ch, pick)
		if n["bead"]:
			rows.append(["head", n["name"]])
			rows.append(["pair", s, "Material"])
			rows.append(["text", n["text"], "value"])
			rows.append(["gap"])
			rows.append(["kv", "Costs", "Nothing"])
			rows.append(["kv", "Lit at", "%s %d" % [s, int(n["level"])] if int(n["level"]) else "The start"])
			rows.append(["kv", "Opens" if int(n["level"]) else "Starts", "The nodes past its ring" if int(n["level"]) else "Every route"])
			rows.append(["note", "Not designed yet" if n["soon"] else "Lit" if st == "taken" else "Not yet", "label" if st == "taken" else "hint"])
		elif n["kind"] == "stub":
			rows.append(["head", n["name"]])
			rows.append(["pair", s, "Later"])
			rows.append(["text", n["text"], "hint"])
		else:
			var bridge: bool = n["kind"] == "bridge"
			var path: String = layout.by_name[s]["paths"][n["side"]] if n["side"] in ["left", "right"] else "Bridge to " + str(layout.by_name[s].get("next", "")) if bridge else "Stem"
			rows.append(["head", n["name"]])
			rows.append(["pair", path if bridge else s + " · " + path, {"bridge": "Bridge", "small": "Small", "notable": "Notable", "node": "Named"}[n["kind"]]])
			rows.append(["text", n["text"], "value"])
			rows.append(["gap"])
			var other := str(n.get("also", ""))
			rows.append(["kv", "Costs", "1 %s or %s point" % [s, other] if bridge else "1 %s point" % s])
			var lv := int(n["level"])
			var needs := ("%s %d, a" % [s + " or " + other if bridge else s, lv]) if lv else "A"
			rows.append(["kv", "Needs", needs + " taken node beside it" + (", a mark" if layout.is_named(n) else "")])
			if layout.is_named(n):
				rows.append(["kv", "Marks", "%d of %d used (%s)" % [layout.named_taken(ch, s), layout.marks(ch, s), ", ".join(PackedStringArray(layout.rule("marks").map(func(m: Variant) -> String: return str(int(m)))))]])
			if bridge:
				rows.append(["note", "Counts in both skills", "label"])
			if st == "dark":
				rows.append(["note", "Dark: %s is under %d" % [s, lv], "hint"])
			var rt := layout.route_to(ch, pick) if st == "locked" else {}
			if not rt.is_empty() and int(rt["cost"]) > 1:
				var names := PackedStringArray()
				for step_id: String in rt["path"]:
					names.append(layout.by_id[step_id]["name"])
				rows.append(["note", "The route: " + ", ".join(names), "label" if rt["ok"] else "hint"])
			if st == "open":
				button = ["Take", true, "take"]
			elif st == "taken" or st == "dark":
				button = ["Taken", false, ""]
			elif not rt.is_empty() and rt["ok"]:
				button = ["Take route · %d" % int(rt["cost"]), true, "route"]
			else:
				button = [rt["why"] if not rt.is_empty() else layout.why(ch, pick), false, ""]
	var hgt := 16.0
	var tops: Array = []
	for row: Array in rows:
		tops.append(hgt)
		match row[0]:
			"head":
				row.append(_wrap(row[1], "heading", tw))
				hgt += row[2].size() * 24.0 + 4.0
			"pair":
				hgt += 24.0
			"text":
				row.append(_wrap(row[1], "line", tw))
				hgt += row[3].size() * 18.0 + 4.0
			"gap":
				hgt += 8.0
			"kv":
				row.append(_wrap(row[2], "line", tw - 48.0))
				hgt += row[3].size() * 17.0 + 2.0
			"note":
				row.append(_wrap(row[1], "line", tw))
				hgt += row[3].size() * 17.0 + 4.0
	hgt += 54.0 if button.size() else 12.0
	var y0 := float(C["bottom"]) - hgt
	var box := Rect2(x, y0, w, hgt)
	_plate(c, box)
	_hits.append({"box": box, "what": "panel"})
	for i in rows.size():
		var row: Array = rows[i]
		var y: float = y0 + tops[i]
		match row[0]:
			"head":
				for j in row[2].size():
					_say(c, row[2][j], "heading", Vector2(tx, y + j * 24.0), layout.colour("value"))
			"pair":
				_say(c, row[1], "line", Vector2(tx, y + 4.0), layout.colour("label"))
				_say(c, row[2], "line", Vector2(x + w - 16.0, y + 4.0), layout.colour("hint"), "right")
			"text":
				for j in row[3].size():
					_say(c, row[3][j], "line", Vector2(tx, y + j * 18.0), layout.colour(row[2]))
			"kv":
				_say(c, row[1], "line", Vector2(tx, y), layout.colour("label"))
				for j in row[3].size():
					_say(c, row[3][j], "line", Vector2(tx + 48.0, y + j * 17.0), layout.colour("value"))
			"note":
				for j in row[3].size():
					_say(c, row[3][j], "line", Vector2(tx, y + j * 17.0), layout.colour(row[2]))
	if button.size():
		var tk: Dictionary = C["take"]
		var bp := Vector2(x + float(tk["dx"]), y0 + hgt - float(tk["dy_from_bottom"]))
		var bt: Dictionary = layout.j("pieces")["Button Take"]
		var tex := _piece(bt["file"])
		if tex != null:
			c.draw_texture(tex, bp, Color(1, 1, 1, 1.0 if button[1] else .45))
		var bs := _v(tk["size"])
		var big := _width(button[0], "title") <= bs.x - 16.0
		_say(c, button[0], "title" if big else "line", bp + Vector2(bs.x / 2.0, bs.y / 2.0), layout.colour("value" if button[1] else "hint"), "center", true)
		if button[1]:
			_hits.append({"box": Rect2(bp, bs), "what": button[2]})


# What the pointer is on, beside it: its name, what it does, how far it is.
func _tip(c: CanvasItem, id: String) -> void:
	var n: Dictionary = layout.by_id[id]
	var T: Dictionary = layout.j("panels")["tip"]
	var w := float(T["width"])
	var lines := _wrap(n["text"], "line", w - 24.0)
	var st := layout.state_of(character, id)
	var foot := ""
	var fc := "hint"
	if n["bead"]:
		foot = "Not designed yet" if n["soon"] else "Lit" if st == "taken" else "Lit at %s %d" % [n["skill"], int(n["level"])]
		fc = "label" if st == "taken" else "hint"
	elif n["kind"] == "stub":
		foot = "Later"
	elif st == "taken":
		foot = "Taken"
		fc = "label"
	elif st == "dark":
		foot = "Dark: %s is under %d" % [n["skill"], int(n["level"])]
	elif st == "open":
		foot = "1 point · click to read and take"
		fc = "blue"
	else:
		var rt := layout.route_to(character, id)
		if not rt.is_empty() and rt["ok"]:
			foot = "%d points away · click for the route" % int(rt["cost"])
			fc = "blue"
		else:
			foot = rt["why"] if not rt.is_empty() and rt["why"] != "" else layout.why(character, id)
	var p := to_screen(_v(n["at"]))
	var rz := float(n["r"]) * z
	var h := 12.0 + 22.0 + 18.0 + lines.size() * 17.0 + 8.0 + 16.0 + 10.0
	var view := layout.view()
	var gap := float(T["gap"])
	var x := p.x + rz + gap
	if x + w > view.end.x - 8.0 or (pick != "" and x + w > float(layout.j("panels")["card"]["x"]) - 8.0):
		x = p.x - rz - gap - w
	x = maxf(x, view.position.x + 8.0)
	var y := clampf(p.y - h / 2.0, view.position.y + 8.0, view.end.y - 8.0 - h)
	_plate(c, Rect2(x, y, w, h))
	var col := layout.side_colour(n["colour"]) if n.has("colour") else layout.colour("label")
	if n.has("sign"):
		var tex := _piece(n["sign"] + ".png")
		if tex != null:
			c.draw_texture_rect(tex, Rect2(Vector2(x + w - 32.0, y + 12.0), Vector2(20, 20)), false, Color(col, .95))
	_say(c, n["name"], "title", Vector2(x + 12.0, y + 11.0), layout.colour("value"))
	var kind := "Material" if n["bead"] else "%s · %s" % [{"small": "Small", "bridge": "Bridge", "node": "Named", "notable": "Notable", "stub": "Later"}[n["kind"]], layout.by_name[n["skill"]]["paths"].get(n["side"], n["side"].capitalize())]
	_say(c, kind, "line", Vector2(x + 12.0, y + 34.0), col if not n["bead"] else layout.colour("label"))
	for j in lines.size():
		_say(c, lines[j], "line", Vector2(x + 12.0, y + 54.0 + j * 17.0), layout.colour("value"))
	_say(c, foot, "line", Vector2(x + 12.0, y + 54.0 + lines.size() * 17.0 + 6.0), layout.colour(fc))


# ---------- pieces and text ----------
# A plate of any size cut from Panel, never stretched.
func _plate(c: CanvasItem, r: Rect2) -> void:
	var tex := _piece(layout.j("panel")["file"])
	if tex == null:
		return
	var e := float(layout.j("panel")["cut"])
	var x := roundf(r.position.x)
	var y := roundf(r.position.y)
	var w := roundf(r.size.x)
	var h := roundf(r.size.y)
	var t := tex.get_size()
	c.draw_texture_rect_region(tex, Rect2(x, y, w - e, h - e), Rect2(0, 0, w - e, h - e))
	c.draw_texture_rect_region(tex, Rect2(x + w - e, y, e, h - e), Rect2(t.x - e, 0, e, h - e))
	c.draw_texture_rect_region(tex, Rect2(x, y + h - e, w - e, e), Rect2(0, t.y - e, w - e, e))
	c.draw_texture_rect_region(tex, Rect2(x + w - e, y + h - e, e, e), Rect2(t.x - e, t.y - e, e, e))


# A line of text: its capitals centred on y ("mid"), or its line starting at y.
func _say(c: CanvasItem, line: String, face_name: String, at: Vector2, col: Color, align := "left", mid := false, outline := 0) -> void:
	if line == "":
		return
	var face := layout.face(face_name)
	var f: Font = _fonts.get(face["font"])
	if f == null:
		return
	var px := int(face["px"])
	var bl: Dictionary = layout.j("text")["baseline"]
	var w := _width(line, face_name)
	var x := at.x - (w if align == "right" else w / 2.0 if align == "center" else 0.0)
	var base := Vector2(roundf(x), roundf(at.y + px * (float(bl["mid"]) if mid else float(bl["top"][face_name]))))
	if outline > 0:
		c.draw_string_outline(f, base, line, HORIZONTAL_ALIGNMENT_LEFT, -1, px, outline * 2, Color(layout.colour("outline"), col.a))
	c.draw_string(f, base, line, HORIZONTAL_ALIGNMENT_LEFT, -1, px, col)


func _width(line: String, face_name: String) -> float:
	var face := layout.face(face_name)
	var f: Font = _fonts.get(face["font"])
	if f == null:
		return 0.0
	return f.get_string_size(line, HORIZONTAL_ALIGNMENT_LEFT, -1, int(face["px"])).x


func _wrap(line: String, face_name: String, w: float) -> Array:
	var out: Array = []
	var cur := ""
	for word in line.split(" "):
		var t := word if cur == "" else cur + " " + word
		if cur != "" and _width(t, face_name) > w:
			out.append(cur)
			cur = word
		else:
			cur = t
	if cur != "":
		out.append(cur)
	return out


func _tex_at(c: CanvasItem, file: String, at: Variant) -> void:
	var tex := _piece(file)
	if tex != null:
		c.draw_texture(tex, at if at is Vector2 else _v(at))


func _piece(file: String) -> Texture2D:
	var path: String = _paths["skills_pieces"].path_join(file)
	if not _textures.has(path):
		_textures[path] = _load(path)
	return _textures[path]


func _load(path: String) -> Resource:
	if not ResourceLoader.exists(path):
		push_error("skills screen: missing %s" % path)
		return null
	return load(path)


static func _v(a: Array) -> Vector2:
	return Vector2(a[0], a[1])


static func _r(a: Array) -> Rect2:
	return Rect2(a[0], a[1], a[2], a[3])
