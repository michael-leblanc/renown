class_name DeathLayout
extends RefCounted
# Where everything on the death screen goes (D148, D149, D247), read from
# death_screen.json, which scripts/art/ui/death_screen.mjs --pieces writes beside the
# pieces. Plain data: no nodes, so tests read it headless. Every place and size comes
# from the json (D175).

var _j: Dictionary = {}


static func load_file(path: String) -> DeathLayout:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("death screen: %s is not a JSON object" % path)
		return null
	return from_dict(parsed)


static func from_dict(j: Dictionary) -> DeathLayout:
	for key in ["size", "order", "veil", "pieces", "rules", "headings", "deeds", "towns", "landmark", "wake", "text"]:
		if not j.has(key):
			push_error("death screen: the layout has no %s" % key)
			return null
	var layout := DeathLayout.new()
	layout._j = j
	return layout


func size() -> Vector2:
	return _vec(_j["size"])


# What is drawn, back to front: a piece's name, or one of "veil", "rules", "bullets",
# "towns", "landmark", "text".
func order() -> Array:
	return _j["order"]


func is_piece(name: String) -> bool:
	return _j["pieces"].has(name)


# {file, at} of a piece in the "pieces" group.
func piece(name: String) -> Dictionary:
	return _place(_j["pieces"][name])


# The veil over the world behind: {dark, grey, tint: Color, corners}.
func veil() -> Dictionary:
	var v: Dictionary = _j["veil"]
	return {"dark": float(v["dark"]), "grey": float(v["grey"]), "tint": Color.html(v["tint"]), "corners": float(v["corners"])}


func rule_file(side: String) -> String:
	return _j["rules"][side]["file"]


# The part of a rule piece to draw and where it goes: [source, screen], for a rule
# from its inner end at `at` out to `length` (the json's note). `side` is "left" or
# "right"; tex_size is the piece's size.
func rule_rects(side: String, at: Vector2, length: float, tex_size: Vector2) -> Array:
	var inner := _vec(_j["rules"][side]["inner"])
	var corner := at.round() - inner
	var reach := clampf(roundf(length), 0.0, float(_j["rules"]["drawn"]))
	var from := 0.0
	var to := tex_size.x
	if side == "left":
		from = maxf(0.0, inner.x - reach)
	else:
		to = minf(tex_size.x, inner.x + reach + 1.0)
	var source := Rect2(from, 0, maxf(0.0, to - from), tex_size.y)
	return [source, Rect2(corner + Vector2(from, 0), source.size)]


# The rules either side of the name, or of a heading's text this wide: each
# {side, at, length}. `heading` is a key of "headings"; "" for the name.
func text_rules(heading: String, text_width: float) -> Array:
	var r: Dictionary = _j["rules"]
	var mid: float
	var y: float
	var gap: float
	var length: float
	if heading == "":
		mid = float(_j["text"]["name"]["centre"][0])
		y = float(r["name"]["y"])
		gap = float(r["name"]["gap"])
		length = float(r["name"]["length"])
	else:
		var h: Dictionary = _j["headings"][heading]
		mid = float(h["centre"][0])
		y = float(h["centre"][1]) + float(face(h["face"])["px"]) * float(r["heading"]["drop"])
		gap = float(r["heading"]["gap"])
		length = float(r["heading"]["half"]) - text_width / 2.0 - gap
	return [
		{"side": "left", "at": Vector2(mid - text_width / 2.0 - gap, y), "length": length},
		{"side": "right", "at": Vector2(mid + text_width / 2.0 + gap, y), "length": length},
	]


# The divider under `towns` towns: its two rules, each {side, at, length}.
func divider(towns: int) -> Array:
	var d: Dictionary = _j["rules"]["divider"]
	var at := Vector2(float(d["x"]), towns_end(towns) + float(d["dy"]))
	return [{"side": "left", "at": at, "length": float(d["length"])}, {"side": "right", "at": at, "length": float(d["length"])}]


func headings() -> Dictionary:
	return _j["headings"]


func deeds() -> Dictionary:
	return _j["deeds"]


# How many lines of deeds show at once.
func deed_lines() -> int:
	return int(_j["deeds"]["lines"])


# Where the deeds' list is, for the mouse wheel.
func deeds_rect() -> Rect2:
	var r: Array = _j["deeds"]["rect"]
	return Rect2(r[0], r[1], r[2], r[3])


# Where the scroll bar's thumb goes, its shadow and all, for a list of `total` lines
# with `first` the first one that shows, and how tall it is drawn (the json's note).
func thumb_rect(first: int, total: int, texture_size: Vector2) -> Rect2:
	var t: Dictionary = _j["deeds"]["thumb"]
	var shown := deed_lines()
	var y := roundf(float(t["top"]) + float(t["travel"]) * float(first) / float(maxi(1, total)))
	var tall := maxf(float(t["min"]), roundf(float(t["travel"]) * float(shown) / float(maxi(1, total))))
	return Rect2(float(t["x"]), y - float(t["shadow_top"]), texture_size.x, tall + texture_size.y - float(t["drawn"]))


func thumb() -> Dictionary:
	return _j["deeds"]["thumb"]


func towns() -> Dictionary:
	return _j["towns"]


func town_file(town: String) -> String:
	var files: Dictionary = _j["towns"]["files"]
	if not files.has(town):
		push_error("death screen: no small landmark for the town %s" % town)
		return ""
	return files[town]


# Where the next town would start after `n` towns.
func towns_end(n: int) -> float:
	return float(_j["towns"]["top"]) + float(_j["towns"]["step"]) * mini(n, int(_j["towns"]["fits"]))


func landmark_file(town: String) -> String:
	var files: Dictionary = _j["landmark"]["files"]
	if not files.has(town):
		push_error("death screen: no landmark for the town %s" % town)
		return ""
	return files[town]


func landmark_at() -> Vector2:
	return _vec(_j["landmark"]["at"])


func wake_rect() -> Rect2:
	var r: Array = _j["wake"]["rect"]
	return Rect2(r[0], r[1], r[2], r[3])


func text(group: String) -> Variant:
	return _j["text"][group]


func colour(name: String) -> Color:
	return Color.html(_j["text"]["colours"][name])


# A face of the json ("title", "line", ..): {font, px}.
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
	for name: String in _j["pieces"]:
		out.append(piece(name)["file"])
	out.append(rule_file("left"))
	out.append(rule_file("right"))
	out.append(_j["deeds"]["bullet"]["file"])
	out.append(_j["deeds"]["thumb"]["file"])
	out.append_array(_j["towns"]["files"].values())
	out.append_array(_j["landmark"]["files"].values())
	return out


static func _place(p: Dictionary) -> Dictionary:
	return {"file": p["file"], "at": _vec(p["at"])}


static func _vec(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
