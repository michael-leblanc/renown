class_name LootLayout
extends RefCounted
# Where everything in the loot window goes (D142, D248), read from loot.json, which
# scripts/art/ui/loot_window.mjs --pieces writes beside the pieces. Plain data: no
# nodes, so tests read it headless. Every place and size comes from the json (D175).

var _j: Dictionary = {}


static func load_file(path: String) -> LootLayout:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("loot window: %s is not a JSON object" % path)
		return null
	return from_dict(parsed)


static func from_dict(j: Dictionary) -> LootLayout:
	for key in ["size", "order", "pieces", "slots", "chest", "pack", "note", "take_all", "close", "text"]:
		if not j.has(key):
			push_error("loot window: the layout has no %s" % key)
			return null
	var layout := LootLayout.new()
	layout._j = j
	return layout


func size() -> Vector2:
	return _vec(_j["size"])


# What is drawn, back to front: a piece's name, or one of "chest slots", "Slot Lit",
# "chest pictures", "Plate Note", "pack slots", "pack pictures", "text".
func order() -> Array:
	return _j["order"]


func is_piece(name: String) -> bool:
	return _j["pieces"].has(name)


# {file, at} of a piece in the "pieces" group.
func piece(name: String) -> Dictionary:
	return _place(_j["pieces"][name])


# The top left corner of slot i of "chest" or "pack".
func slot_at(group: String, i: int) -> Vector2:
	var g: Dictionary = _j[group]
	var columns := int(g["columns"])
	return _vec(g["first"]) + Vector2(float(i % columns) * float(g["step"][0]), float(i / columns) * float(g["step"][1]))


func slot_size() -> Vector2:
	return _vec(_j["slots"]["size"])


func slot_rect(group: String, i: int) -> Rect2:
	return Rect2(slot_at(group, i), slot_size())


# The picture file of a slot that holds something of this material, or of an empty one ("").
func slot_file(material: String) -> String:
	if material == "":
		material = "Empty"
	if not _j["slots"]["materials"].has(material):
		push_error("loot window: no slot for the material %s" % material)
		material = "Empty"
	return str(_j["slots"]["file"]).replace("<material>", material)


# The pointed slot's glow, for slot i of the chest: {file, at}.
func lit(i: int) -> Dictionary:
	var l: Dictionary = _j["slots"]["lit"]
	return {"file": l["file"], "at": slot_at("chest", i) + Vector2(float(l["dx"]), float(l["dy"]))}


# The part of an item's 256 x 256 pack picture that is drawn (D237).
func picture_from() -> Rect2:
	var f: Array = _j["slots"]["picture"]["from"]
	return Rect2(f[0], f[1], f[2], f[3])


# Where an item's picture goes in a slot whose corner is at.
func picture_rect(at: Vector2) -> Rect2:
	var p: Dictionary = _j["slots"]["picture"]
	var px := float(p["px"])
	return Rect2(at + Vector2(float(p["dx"]), float(p["dy"])), Vector2(px, px))


func count_spec() -> Dictionary:
	return _j["slots"]["count"]


# The most slots a pack can have (D124).
func pack_most() -> int:
	return int(_j["pack"]["most"])


# The note's plate and the corner its texts are placed from, for the pointed chest
# slot i: {file, at, corner}.
func note(i: int) -> Dictionary:
	var n: Dictionary = _j["note"]
	var down := Vector2(0, float(n["dy"]) * float(i / int(_j["chest"]["columns"])))
	return {"file": n["file"], "at": _vec(n["at"]) + down, "corner": _vec(n["corner"]) + down}


func note_spec() -> Dictionary:
	return _j["note"]


func take_all_rect() -> Rect2:
	var r: Array = _j["take_all"]["rect"]
	return Rect2(r[0], r[1], r[2], r[3])


func is_on_close(point: Vector2) -> bool:
	return point.distance_to(_vec(_j["close"]["centre"])) <= float(_j["close"]["radius"])


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
	for m: String in _j["slots"]["materials"]:
		out.append(slot_file(m))
	out.append(_j["slots"]["lit"]["file"])
	out.append(_j["note"]["file"])
	return out


static func _place(p: Dictionary) -> Dictionary:
	return {"file": p["file"], "at": _vec(p["at"])}


static func _vec(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
