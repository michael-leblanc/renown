class_name TalkWindow
extends Control
# The talk window (D23, D126 to D128): a box in the bottom left, one line at a time.
# Drawn from the pieces and talk.json that scripts/art/ui/talk_window.mjs --pieces
# writes, in the json's own pixels (1152 x 648, the window); text in Alegreya.
#
# It shows only the state it is given, a plain dictionary (what the server sends for
# it is not settled, D176; how talking is opened is not decided). It never works out
# a name: you are told one (D31) or you see the person (D29, D128). One of:
#   line     {mine: bool, name: String, seen: String, says: String, head: Texture2D}
#            mine: you speak, your head on the right, named "You". Otherwise they speak,
#            their head on the left, under the name you were told; name "" when you
#            were not, and what you see of them (seen) stands in its place. head is
#            the game's drawing of the character's head, 2 x radius square; left out,
#            the disc stays empty.
#   options  [String, ..]  your replies ("Select an option"), at most 5
#   people   [{label, kind}, ..]  what "Tell me more about this person" lists: only
#            people from your own knowledge (D127, D128), and Back if the game gives
#            it. kind is how you know them ("by name", "seen", "heard of") or "".
#   lit      the reply at first pointed at, -1 for none; then the mouse moves it
# Options and people show as the same numbered list. A click on the box or Space sends
# next (a line), a click on a reply or its number key 1 to 5 sends picked(n), n from 1,
# Esc sends closed. It catches the mouse only over the box.

signal next
signal picked(n: int)
signal closed

const SETTINGS := "res://data/client.json"
const YOU := "You"
const KEYS := [KEY_1, KEY_2, KEY_3, KEY_4, KEY_5]

var layout: TalkLayout = null
var state: Dictionary = {}
var lit_reply := -1

var _paths: Dictionary = {}
var _textures := {} # path -> Texture2D
var _fonts := {} # name -> Font


func _ready() -> void:
	if layout == null:
		setup_files(SETTINGS)
	mouse_exited.connect(_point.bind(-1))


func setup_files(settings_path: String) -> void:
	var settings: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	if not settings is Dictionary or not settings.get("screens") is Dictionary:
		push_error("talk window: %s has no screens group" % settings_path)
		return
	_paths = settings["screens"]
	setup(TalkLayout.load_file(_paths["talk_layout"]))


func setup(talk_layout: TalkLayout) -> void:
	layout = talk_layout
	if layout == null:
		return
	mouse_filter = Control.MOUSE_FILTER_STOP
	custom_minimum_size = layout.size()
	size = layout.size()
	for name: String in layout.font_names():
		_fonts[name] = _load(_paths["fonts"].path_join(name + ".woff"))


func show_state(new_state: Dictionary) -> void:
	state = new_state
	lit_reply = int(state.get("lit", -1))
	queue_redraw()


# "line", "options" or "people": what the state shows.
func mode() -> String:
	for m: String in ["line", "options", "people"]:
		if state.has(m):
			return m
	return ""


# The name over a line: yours is You; theirs is the name you were told (D31), and when
# you were not told one, what you see of them (D29, D128).
func speaker_name() -> String:
	var line: Dictionary = state.get("line", {})
	if line.get("mine", false):
		return YOU
	var told := str(line.get("name", ""))
	return told if told != "" else str(line.get("seen", ""))


# What the numbered list holds: [[words, kind], ..], at most 5.
func replies() -> Array:
	var out: Array = []
	if mode() == "options":
		for r: Variant in state["options"]:
			out.append([str(r), ""])
	elif mode() == "people":
		for p: Dictionary in state["people"]:
			out.append([str(p.get("label", "")), str(p.get("kind", ""))])
	return out.slice(0, layout.options_most())


func reply_rect(i: int) -> Rect2:
	var lit := layout.lit()
	var tex := _piece(lit["file"])
	var s := tex.get_size() if tex != null else Vector2.ZERO
	return Rect2(lit["at"] + Vector2(0, float(layout.options_spec()["step"]) * i), s)


func reply_at(point: Vector2) -> int:
	for i in replies().size():
		if reply_rect(i).has_point(point):
			return i
	return -1


# A line cut into the rows it is drawn in, none wider than the json's width.
func wrapped(text: String) -> Array:
	var spec: Dictionary = layout.line_spec()["says"]
	var rows: Array = []
	var row := ""
	for word: String in text.split(" ", false):
		var tried := word if row == "" else row + " " + word
		if row != "" and _width(tried, spec["face"]) > float(spec["width"]):
			rows.append(row)
			row = word
		else:
			row = tried
	if row != "":
		rows.append(row)
	return rows.slice(0, int(spec["most_lines"]))


func _has_point(point: Vector2) -> bool:
	if layout == null:
		return false
	var p := layout.panel()
	var tex := _piece(p["file"])
	return tex != null and Rect2(p["at"], tex.get_size()).has_point(point)


func _gui_input(event: InputEvent) -> void:
	if layout == null:
		return
	if event is InputEventMouseMotion:
		_point(reply_at(event.position))
		return
	var click := event as InputEventMouseButton
	if click == null or not click.pressed or click.button_index != MOUSE_BUTTON_LEFT:
		return
	if mode() == "line":
		next.emit()
	else:
		var i := reply_at(click.position)
		if i == -1:
			return
		picked.emit(i + 1)
	accept_event()


func _unhandled_key_input(event: InputEvent) -> void:
	if not visible:
		return
	var key := event as InputEventKey
	if key != null and key.pressed and not key.echo and key.keycode == KEY_SPACE and mode() == "line":
		next.emit()
		get_viewport().set_input_as_handled()
	elif key != null and key.pressed and not key.echo and KEYS.has(key.keycode) and mode() != "line":
		var n: int = KEYS.find(key.keycode) + 1
		if n <= replies().size():
			picked.emit(n)
			get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_cancel"):
		closed.emit()
		get_viewport().set_input_as_handled()


func _point(i: int) -> void:
	if lit_reply != i:
		lit_reply = i
		queue_redraw()


func _draw() -> void:
	if layout == null:
		return
	_put(layout.panel())
	match mode():
		"line":
			_draw_line()
		"options", "people":
			_draw_replies()


func _draw_line() -> void:
	var line: Dictionary = state["line"]
	var s := layout.side("right" if line.get("mine", false) else "left")
	_put(s["back"])
	var head: Variant = line.get("head")
	if head is Texture2D:
		var c: Vector2 = s["head"]["centre"]
		var r: float = s["head"]["radius"]
		var pts := PackedVector2Array()
		var uvs := PackedVector2Array()
		for k in 48:
			var a := TAU * k / 48.0
			pts.append(c + Vector2(cos(a), sin(a)) * r)
			uvs.append(Vector2(0.5 + cos(a) * 0.5, 0.5 + sin(a) * 0.5))
		draw_colored_polygon(pts, Color.WHITE, uvs, head)
	_put(s["ring"])
	var spec: Dictionary = layout.line_spec()
	var mid: float = s["text_centre_x"]
	var n: Dictionary = spec["name"]
	_say(speaker_name(), n["face"], Vector2(mid, float(n["y"])), n["colour"], HORIZONTAL_ALIGNMENT_CENTER, int(n["outline"]))
	var sy: Dictionary = spec["says"]
	var rows := wrapped(str(line.get("says", "")))
	for i in rows.size():
		_say(rows[i], sy["face"], Vector2(mid, float(sy["y"]) + float(sy["step"]) * i), sy["colour"], HORIZONTAL_ALIGNMENT_CENTER, int(sy["outline"]))
	var m: Dictionary = spec["more"]
	_say(m["text"], m["face"], Vector2(mid, float(m["y"])), m["colour"], HORIZONTAL_ALIGNMENT_CENTER, int(m["outline"]))


func _draw_replies() -> void:
	var o: Dictionary = layout.options_spec()
	var rows := replies()
	if lit_reply >= 0 and lit_reply < rows.size():
		var lit := layout.lit()
		_put({"file": lit["file"], "at": lit["at"] + Vector2(0, float(o["step"]) * lit_reply)})
	var h: Dictionary = o["heading"]
	var hc: Vector2 = TalkLayout._vec(h["centre"])
	_say(h["text"], h["face"], hc, h["colour"], HORIZONTAL_ALIGNMENT_CENTER, int(h["outline"]))
	var w: Dictionary = o["words"]
	var k: Dictionary = o["kind"]
	for i in rows.size():
		var words := "%d. %s" % [i + 1, rows[i][0]]
		var tail := " (%s)" % rows[i][1] if rows[i][1] != "" else ""
		var total := _width(words, w["face"]) + (_width(tail, k["face"]) if tail != "" else 0.0)
		var x := float(o["centre_x"]) - total / 2.0
		var y := layout.reply_y(i)
		_say(words, w["face"], Vector2(x, y), w["on"] if i == lit_reply else w["colour"], HORIZONTAL_ALIGNMENT_LEFT, int(w["outline"]))
		if tail != "":
			_say(tail, k["face"], Vector2(x + _width(words, w["face"]), y + float(k["kind_dy"])), k["colour"], HORIZONTAL_ALIGNMENT_LEFT, int(k["outline"]))


# A line of text. `at` is its top left, top right or top middle by `align`; the top is
# the font's ascent line (the json's note). The baseline is kept on a whole pixel.
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
	return _texture(_paths["talk_pieces"].path_join(file))


func _texture(path: String) -> Texture2D:
	if not _textures.has(path):
		_textures[path] = _load(path)
	return _textures[path]


func _load(path: String) -> Resource:
	if not ResourceLoader.exists(path):
		push_error("talk window: missing %s" % path)
		return null
	return load(path)
