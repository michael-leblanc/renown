class_name MenuLayout
extends RefCounted
# Where everything in the main menu goes (D250), read from menu.json, which
# scripts/art/ui/main_menu.mjs --pieces writes beside the pieces. Plain data: no nodes,
# so tests read it headless. Every place and size comes from the json (D175).

var _j: Dictionary = {}


static func load_file(path: String) -> MenuLayout:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("main menu: %s is not a JSON object" % path)
		return null
	return from_dict(parsed)


static func from_dict(j: Dictionary) -> MenuLayout:
	for key in ["size", "order", "scene", "sparks", "pieces", "buttons", "panel", "text"]:
		if not j.has(key):
			push_error("main menu: the layout has no %s" % key)
			return null
	var layout := MenuLayout.new()
	layout._j = j
	return layout


func size() -> Vector2:
	return _vec(_j["size"])


# What is drawn, back to front: a piece's name, or one of "scene", "sparks", "buttons",
# "panel", "text".
func order() -> Array:
	return _j["order"]


func is_piece(name: String) -> bool:
	return _j["pieces"].has(name)


# {file, at} of a piece in the "pieces" group.
func piece(name: String) -> Dictionary:
	return _place(_j["pieces"][name])


# Seconds the painting takes to come round.
func loop_seconds() -> float:
	return float(_j["scene"]["loop_seconds"])


# The painting's pieces: {door: {file, at}, steps: {file, at}, light: file, noise: file}.
func scene_pieces() -> Dictionary:
	var s: Dictionary = _j["scene"]
	return {"door": _place(s["door_piece"]), "steps": _place(s["steps"]), "light": s["light"]["file"], "noise": s["noise"]["file"]}


# The doorway's shape (scenes.mjs DOOR): sx, hy, base, half, spring, top, deep.
func door() -> Dictionary:
	return _j["scene"]["door"]


# How far the cloud drifts in one loop, in pixels.
func drift() -> float:
	return float(_j["scene"]["drift"])


# [[i, j, x, y, amp, n, p], ..]: the json's note.
func stars() -> Array:
	return _j["sparks"]["stars"]


# [[x, y, n, p, s], ..]: the json's note.
func dust() -> Array:
	return _j["sparks"]["dust"]


func words() -> Array:
	return _j["buttons"]["words"]


# What a click on button i sends: "join", "host", "settings", "quit".
func says(i: int) -> String:
	return _j["buttons"]["says"][i]


func button_rect(i: int) -> Rect2:
	var b: Dictionary = _j["buttons"]
	return Rect2(_vec(b["first"]) + _vec(b["step"]) * i, _vec(b["size"]))


# Button i's piece, lit or not: {file, at}.
func button_piece(i: int, on: bool) -> Dictionary:
	var p: Dictionary = _j["buttons"]["on" if on else "off"]
	return {"file": p["file"], "at": button_rect(i).position + _vec(p["at"])}


# The button under a point, or -1.
func button_at(point: Vector2) -> int:
	for i in words().size():
		if button_rect(i).has_point(point):
			return i
	return -1


# {face, centre (from the button's corner), colour, on, outline}.
func button_text() -> Dictionary:
	return _j["buttons"]["text"]


func panel() -> Dictionary:
	return _j["panel"]


# The panel button i opens ("host"), or "" when it opens none.
func panel_of(i: int) -> String:
	return str(_j["panel"]["name"]) if says(i) == str(_j["panel"]["name"]) else ""


func panel_rect() -> Rect2:
	var r: Array = _j["panel"]["rect"]
	return Rect2(r[0], r[1], r[2], r[3])


func panel_piece(name: String) -> Dictionary:
	return _place(_j["panel"]["pieces"][name])


func field_names() -> Array:
	return _j["panel"]["fields"]["names"]


# The top left corner of field i.
func field_at(i: int) -> Vector2:
	var f: Dictionary = _j["panel"]["fields"]
	return _vec(f["first"]) + _vec(f["step"]) * i


func field_piece(i: int) -> Dictionary:
	var f: Dictionary = _j["panel"]["fields"]
	return {"file": f["piece"]["file"], "at": field_at(i) + _vec(f["piece"]["at"])}


func host_rect() -> Rect2:
	var r: Array = _j["panel"]["host"]["rect"]
	return Rect2(r[0], r[1], r[2], r[3])


func text(group: String) -> Variant:
	return _j["text"][group]


func colour(name: String) -> Color:
	return Color.html(_j["text"]["colours"][name])


# A face of the json ("mid", "line", ..): {font, px}.
func face(name: String) -> Dictionary:
	return _j["text"]["faces"][name]


# The fonts the layout names, each once.
func font_names() -> Array:
	var names: Array = []
	for f: Dictionary in _j["text"]["faces"].values():
		if not names.has(f["font"]):
			names.append(f["font"])
	return names


# Every piece file the layout names, for checks.
func files() -> Array:
	var out: Array = []
	var s := scene_pieces()
	out.append_array([s["door"]["file"], s["steps"]["file"], s["light"], s["noise"]])
	for name: String in _j["pieces"]:
		out.append(piece(name)["file"])
	out.append(_j["buttons"]["off"]["file"])
	out.append(_j["buttons"]["on"]["file"])
	for name: String in _j["panel"]["pieces"]:
		out.append(panel_piece(name)["file"])
	out.append(_j["panel"]["fields"]["piece"]["file"])
	out.append(_j["panel"]["host"]["piece"]["file"])
	return out


static func _place(p: Dictionary) -> Dictionary:
	return {"file": p["file"], "at": _vec(p["at"])}


static func _vec(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
