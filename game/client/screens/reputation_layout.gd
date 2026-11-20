class_name ReputationLayout
extends RefCounted
# Where everything in the Reputation screen goes (D249), read from reputation.json,
# which scripts/art/ui/reputation_screen.mjs --pieces writes beside the pieces. Plain
# data: no nodes, so tests read it headless. Every place and size comes from the json (D175).

var _j: Dictionary = {}


static func load_file(path: String) -> ReputationLayout:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("reputation screen: %s is not a JSON object" % path)
		return null
	return from_dict(parsed)


static func from_dict(j: Dictionary) -> ReputationLayout:
	for key in ["size", "order", "veil", "pieces", "rule", "cards", "tales", "close", "text"]:
		if not j.has(key):
			push_error("reputation screen: the layout has no %s" % key)
			return null
	var layout := ReputationLayout.new()
	layout._j = j
	return layout


func size() -> Vector2:
	return _vec(_j["size"])


# What is drawn, back to front: a piece's name, or one of "veil", "rules", "cards",
# "bullets", "text".
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


func rule_file() -> String:
	return _j["rule"]["file"]


# The rule from its diamond end at `at`, `length` to the right: [source, destination]
# rects for draw_texture_rect_region.
func rule_rects(at: Vector2, length: float, tex_size: Vector2) -> Array:
	var inner := _vec(_j["rule"]["inner"])
	var reach := clampf(roundf(length), 0.0, float(_j["rule"]["drawn"]))
	var source := Rect2(0, 0, minf(tex_size.x, inner.x + reach + 1.0), tex_size.y)
	return [source, Rect2(at.round() - inner, source.size)]


# The rule after the title, from the title's and the hint's widths: {at, length}.
func title_rule(title_width: float, hint_width: float) -> Dictionary:
	var r: Dictionary = _j["rule"]["title"]
	var x0 := float(text("title")["at"][0]) + title_width + float(r["gap"])
	var x1 := float(text("hint")["right"][0]) - hint_width - float(r["gap_hint"])
	return {"at": Vector2(x0, float(r["y"])), "length": x1 - x0}


# The rule after the tales' heading, from its width: {at, length}.
func tales_rule(heading_width: float) -> Dictionary:
	var r: Dictionary = _j["rule"]["tales"]
	var at := _vec(text("tales_title")["at"])
	var x0 := at.x + heading_width + float(r["gap"])
	return {"at": Vector2(x0, at.y + float(r["dy"])), "length": float(r["end"]) - x0}


func cards() -> Dictionary:
	return _j["cards"]


# How many towns' cards fit.
func card_fits() -> int:
	return int(_j["cards"]["fits"])


# The top left corner of card n.
func card_at(n: int) -> Vector2:
	var c: Dictionary = _j["cards"]
	return _vec(c["first"]) + _vec(c["step"]) * n


func card_rect(n: int) -> Rect2:
	return Rect2(card_at(n), _vec(_j["cards"]["size"]))


# Card n's stage, lit when the town told you anything: {file, at}.
func card_piece(n: int, known: bool) -> Dictionary:
	var p: Dictionary = _j["cards"]["card"]["known" if known else "unknown"]
	return {"file": p["file"], "at": card_at(n) + _vec(p["at"])}


# A town's landmark on card n, greyed when it told you nothing: {file, at}, or {} for
# a town with no picture.
func town_piece(n: int, town: String, known: bool) -> Dictionary:
	var towns: Dictionary = _j["cards"]["towns"]
	if not towns.has(town):
		return {}
	var p: Dictionary = towns[town]["known" if known else "unknown"]
	return {"file": p["file"], "at": card_at(n) + _vec(p["at"])}


func rows() -> Dictionary:
	return _j["cards"]["rows"]


# The rows in order: Standing, Morality, Fame.
func row_names() -> Array:
	return _j["cards"]["rows"]["names"]


# The y of row i of card n (its labels and scale are placed from it).
func row_y(n: int, i: int) -> float:
	var r: Dictionary = _j["cards"]["rows"]
	return card_at(n).y + float(r["first"]) + float(r["step"]) * i


# Row `name`'s sign on card n: {file, at}.
func sign_piece(n: int, i: int, name: String) -> Dictionary:
	var s: Dictionary = _j["cards"]["rows"]["signs"][name]
	return {"file": s["file"], "at": Vector2(card_at(n).x, row_y(n, i)) + _vec(s["at"])}


# The empty scale of row i on card n: {file, at}.
func scale_piece(n: int, i: int) -> Dictionary:
	var s: Dictionary = _j["cards"]["rows"]["scale"]
	return {"file": s["file"], "at": Vector2(card_at(n).x, row_y(n, i)) + _vec(s["at"])}


# The scale's diamond where v (0 to 1) falls, on row i of card n: {file, at}.
func mark_piece(n: int, i: int, v: float) -> Dictionary:
	var s: Dictionary = _j["cards"]["rows"]["scale"]
	var m: Dictionary = s["mark"]
	var x := roundf(card_at(n).x + float(m["at"][0]) + float(s["width"]) * clampf(v, 0.0, 1.0))
	return {"file": m["file"], "at": Vector2(x, row_y(n, i) + float(m["at"][1]))}


# Fame's bar on row i of card n: {under, fill, end}: the two pieces, and the x at which
# the fill is cut for v (0 to 1).
func bar(n: int, i: int, v: float) -> Dictionary:
	var b: Dictionary = _j["cards"]["rows"]["bar"]
	var row := Vector2(card_at(n).x, row_y(n, i))
	var r: Array = b["rect"]
	var inset := float(b["inset"])
	var end := card_at(n).x + float(r[0]) + inset + (float(r[2]) - 2.0 * inset) * clampf(v, 0.0, 1.0)
	return {
		"under": {"file": b["under"]["file"], "at": row + _vec(b["under"]["at"])},
		"fill": {"file": b["fill"]["file"], "at": row + _vec(b["fill"]["at"])},
		"end": end,
	}


func tales() -> Dictionary:
	return _j["tales"]


func tale_fits() -> int:
	return int(_j["tales"]["fits"])


# The y of tale i's row.
func tale_y(i: int) -> float:
	var t: Dictionary = _j["tales"]
	return float(t["first"]) + float(t["step"]) * i


func is_on_close(point: Vector2) -> bool:
	return point.distance_to(_vec(_j["close"]["centre"])) <= float(_j["close"]["radius"])


func text(group: String) -> Variant:
	return _j["text"][group]


func colour(name: String) -> Color:
	return Color.html(_j["text"]["colours"][name])


# A face of the json ("big", "line", ..): {font, px}.
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
	out.append(rule_file())
	var c: Dictionary = _j["cards"]
	for k: String in ["known", "unknown"]:
		out.append(c["card"][k]["file"])
		for town: String in c["towns"]:
			out.append(c["towns"][town][k]["file"])
	var r: Dictionary = c["rows"]
	for name: String in r["signs"]:
		out.append(r["signs"][name]["file"])
	out.append(r["scale"]["file"])
	out.append(r["scale"]["mark"]["file"])
	out.append(r["bar"]["under"]["file"])
	out.append(r["bar"]["fill"]["file"])
	out.append(_j["tales"]["bullet"]["file"])
	return out


static func _place(p: Dictionary) -> Dictionary:
	return {"file": p["file"], "at": _vec(p["at"])}


static func _vec(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
