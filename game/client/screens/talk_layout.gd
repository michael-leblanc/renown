class_name TalkLayout
extends RefCounted
# Where everything in the talk window goes (D23, D126 to D128), read from talk.json,
# which scripts/art/ui/talk_window.mjs --pieces writes beside the pieces. Plain data:
# no nodes, so tests read it headless. Every place and size comes from the json (D175).

var _j: Dictionary = {}


static func load_file(path: String) -> TalkLayout:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("talk window: %s is not a JSON object" % path)
		return null
	return from_dict(parsed)


static func from_dict(j: Dictionary) -> TalkLayout:
	for key in ["size", "panel", "line", "options", "text"]:
		if not j.has(key):
			push_error("talk window: the layout has no %s" % key)
			return null
	var layout := TalkLayout.new()
	layout._j = j
	return layout


func size() -> Vector2:
	return _vec(_j["size"])


# {file, at} of the box's plate.
func panel() -> Dictionary:
	return _place(_j["panel"])


# The spec of a speaker's side, "left" (them) or "right" (you): {back, ring, head,
# text_centre_x}, with back and ring as {file, at}.
func side(which: String) -> Dictionary:
	var s: Dictionary = _j["line"][which]
	return {
		"back": _place(s["back"]),
		"ring": _place(s["ring"]),
		"head": {"centre": _vec(s["head"]["centre"]), "radius": float(s["head"]["radius"])},
		"text_centre_x": float(s["text_centre_x"]),
	}


# name, says, more: the line's texts (see the json's notes).
func line_spec() -> Dictionary:
	return _j["line"]


func options_spec() -> Dictionary:
	return _j["options"]


func options_most() -> int:
	return int(_j["options"]["most"])


# The Option Lit piece, {file, at}, where it sits behind the first reply.
func lit() -> Dictionary:
	return _place(_j["options"]["lit"])


# The top y of reply i's line.
func reply_y(i: int) -> float:
	var o: Dictionary = _j["options"]
	return float(o["first_y"]) + float(o["step"]) * i


func colour(name: String) -> Color:
	return Color.html(_j["text"]["colours"][name])


# A face of the json ("title", "text", "line"): {font, px}.
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
	var out: Array = [_j["panel"]["file"], _j["options"]["lit"]["file"]]
	for which: String in ["left", "right"]:
		out.append(_j["line"][which]["back"]["file"])
		out.append(_j["line"][which]["ring"]["file"])
	return out


static func _place(p: Dictionary) -> Dictionary:
	return {"file": p["file"], "at": _vec(p["at"])}


static func _vec(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
