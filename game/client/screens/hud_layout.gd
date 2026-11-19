class_name HudLayout
extends RefCounted
# Where everything in the HUD goes (D244 to D246), read from hud.json, which
# scripts/art/ui/hud.mjs --pieces writes beside the pieces. Plain data: no nodes, so
# tests read it headless. Every place and size comes from the json (D175).

var _j: Dictionary = {}


static func load_file(path: String) -> HudLayout:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("hud: %s is not a JSON object" % path)
		return null
	return from_dict(parsed)


static func from_dict(j: Dictionary) -> HudLayout:
	for key in ["size", "order", "pieces", "bars", "emblem", "bandage_ring", "slots", "map", "buttons", "target", "toast", "text"]:
		if not j.has(key):
			push_error("hud: the layout has no %s" % key)
			return null
	var layout := HudLayout.new()
	layout._j = j
	return layout


func size() -> Vector2:
	return _vec(_j["size"])


# What is drawn, back to front: a piece's name, or one of "bars", "emblem",
# "bandage ring", "slots", "pictures", "map land", "buttons", "rules", "text".
func order() -> Array:
	return _j["order"]


func is_piece(name: String) -> bool:
	return _j["pieces"].has(name)


# {file, at} of a piece in the "pieces" group.
func piece(name: String) -> Dictionary:
	return _place(_j["pieces"][name])


# A bar, "health" or "run": {under: {file, at}, fill: {file, at}, track: Rect2}.
func bar(name: String) -> Dictionary:
	var b: Dictionary = _j["bars"][name]
	var t: Array = b["track"]
	return {"under": _place(b["under"]), "fill": _place(b["fill"]), "track": Rect2(t[0], t[1], t[2], t[3])}


# Where a bar's liquid ends at a value from 0 to 1 (the json's note).
func fill_end(name: String, value: float) -> float:
	var track: Rect2 = bar(name)["track"]
	var inset := float(_j["bars"]["inset"])
	return track.position.x + inset + (track.size.x - 2.0 * inset) * clampf(value, 0.0, 1.0)


func emblem_file(town: String) -> String:
	var files: Dictionary = _j["emblem"]["files"]
	if not files.has(town):
		push_error("hud: no emblem for the town %s" % town)
		return ""
	return files[town]


func emblem_at() -> Vector2:
	return _vec(_j["emblem"]["at"])


# The bandage's ring: {under: {file, at}, fill: {file, at}, centre}.
func ring() -> Dictionary:
	var r: Dictionary = _j["bandage_ring"]
	return {"under": _place(r["under"]), "fill": _place(r["fill"]), "centre": _vec(r["centre"])}


# A slot, "main_hand", "off_hand" or "bandage": {kind, at, size}.
func slot(name: String) -> Dictionary:
	var s: Dictionary = _j["slots"][name]
	return {"kind": s["kind"], "at": _vec(s["at"]), "size": _vec(_j["slots"]["kinds"][s["kind"]])}


func slot_names() -> Array:
	return ["main_hand", "off_hand", "bandage"]


# The picture file of a slot: "Slot <kind> <material>.png".
func slot_file(kind: String, material: String) -> String:
	return str(_j["slots"]["file"]).replace("<kind>", kind).replace("<material>", material)


func has_material(kind: String, material: String) -> bool:
	return _j["slots"]["materials"][kind].has(material)


# The part of an item's 256 x 256 pack picture that is drawn (D237).
func picture_from() -> Rect2:
	var f: Array = _j["slots"]["picture"]["from"]
	return Rect2(f[0], f[1], f[2], f[3])


func picture_rect(s: Dictionary) -> Rect2:
	var p: Dictionary = _j["slots"]["picture"]
	var px := float(p["px"][s["kind"]])
	return Rect2(s["at"] + Vector2.ONE * float(p["inset"]), Vector2(px, px))


func map_centre() -> Vector2:
	return _vec(_j["map"]["centre"])


func map_radius() -> float:
	return float(_j["map"]["radius"])


func map_unseen() -> Color:
	return Color.html(_j["map"]["unseen"])


# Each round button: {name, key, centre, on: {file, at}, off: {file, at}}.
func buttons() -> Array:
	var out: Array = []
	for b: Dictionary in _j["buttons"]:
		out.append({"name": b["name"], "key": b["key"], "centre": _vec(b["centre"]), "on": _place(b["on"]), "off": _place(b["off"])})
	return out


# The plate of who you clicked on: the json's target.plate as it is.
func target_plate() -> Dictionary:
	return _j["target"]["plate"]


# Where the target's plate goes for a text this wide, and how wide it is drawn,
# shadow and all: the json's note.
func target_rect(text_width: float, texture_width: float, texture_height: float) -> Rect2:
	var p := target_plate()
	var w := roundf(text_width + float(p["pad"]))
	var x := roundf(float(p["centre_x"]) - (text_width + float(p["pad"])) / 2.0) - float(p["shadow_left"])
	return Rect2(x, float(p["top"]), w + texture_width - float(p["drawn"]), texture_height)


func toast() -> Dictionary:
	return _j["toast"]


func text(group: String) -> Variant:
	return _j["text"][group]


func colour(name: String) -> Color:
	return Color.html(_j["text"]["colours"][name])


# A face of the json ("title", "small", ..): {font, px}.
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
	for b: String in ["health", "run"]:
		out.append(bar(b)["under"]["file"])
		out.append(bar(b)["fill"]["file"])
	out.append_array(_j["emblem"]["files"].values())
	out.append(ring()["under"]["file"])
	out.append(ring()["fill"]["file"])
	for b: Dictionary in buttons():
		out.append(b["on"]["file"])
		out.append(b["off"]["file"])
	for kind: String in _j["slots"]["materials"]:
		for m: String in _j["slots"]["materials"][kind]:
			out.append(slot_file(kind, m))
	out.append(target_plate()["file"])
	out.append(_j["toast"]["rule_left"]["file"])
	out.append(_j["toast"]["rule_right"]["file"])
	return out


static func _place(p: Dictionary) -> Dictionary:
	return {"file": p["file"], "at": _vec(p["at"])}


static func _vec(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
