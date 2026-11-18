class_name CharacterScreenLayout
extends RefCounted
# Where everything on the character screen goes (D239 to D241), read from
# character_screen.json, which scripts/art/ui/character_screen.mjs writes beside
# the pieces. Plain data: no nodes, so tests read it headless. Every place and
# size comes from the json (D175); nothing here is a number of its own.

var _j: Dictionary = {}


static func load_file(path: String) -> CharacterScreenLayout:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("character screen: %s is not a JSON object" % path)
		return null
	return from_dict(parsed)


static func from_dict(j: Dictionary) -> CharacterScreenLayout:
	for key in ["size", "order", "pieces", "medallions", "slots", "character", "text"]:
		if not j.has(key):
			push_error("character screen: the layout has no %s" % key)
			return null
	var layout := CharacterScreenLayout.new()
	layout._j = j
	return layout


func size() -> Vector2:
	return _vec(_j["size"])


# What is drawn, back to front: a piece's name, or "medallions", "slots",
# "pictures", "character", "text".
func order() -> Array:
	return _j["order"]


func is_piece(name: String) -> bool:
	return _j["pieces"].has(name)


func piece_file(name: String) -> String:
	return _j["pieces"][name]["file"]


func piece_at(name: String) -> Vector2:
	return _vec(_j["pieces"][name]["at"])


# Each medallion: {stat, file, at}.
func medallions() -> Array:
	var out: Array = []
	for m: Dictionary in _j["medallions"]:
		out.append({"stat": m["stat"], "file": m["file"], "at": _vec(m["at"])})
	return out


# Every slot, the order they are drawn in: the worn gear, then the pack, then the
# bandage. Each is {kind, at, size, name ("" in the pack), gear (worn slot name or
# ""), pack (index or -1), bandage (bool)}.
func slots() -> Array:
	var s: Dictionary = _j["slots"]
	var out: Array = []
	for g: Dictionary in s["gear"]:
		out.append(_slot(g["kind"], g["at"], g["name"], g["name"], -1, false))
	var p: Dictionary = s["pack"]
	for i in int(p["columns"]) * int(p["rows"]):
		var at := [p["first"][0] + (i % int(p["columns"])) * p["step"][0], p["first"][1] + (i / int(p["columns"])) * p["step"][1]]
		out.append(_slot(p["kind"], at, "", "", i, false))
	out.append(_slot(s["bandage"]["kind"], s["bandage"]["at"], "", "", -1, true))
	return out


func pack_size() -> int:
	var p: Dictionary = _j["slots"]["pack"]
	return int(p["columns"]) * int(p["rows"])


# The picture file of a slot: "Slot <kind> <material>.png".
func slot_file(kind: String, material: String) -> String:
	return str(_j["slots"]["file"]).replace("<kind>", kind).replace("<material>", material)


func has_material(material: String) -> bool:
	return _j["slots"]["materials"].has(material)


# The part of an item's 256 x 256 pack picture that is drawn (D237).
func picture_from() -> Rect2:
	var f: Array = _j["slots"]["picture"]["from"]
	return Rect2(f[0], f[1], f[2], f[3])


# Where an item's picture goes in a slot: its middle, whole pixels, the way the draft did.
func picture_rect(slot: Dictionary) -> Rect2:
	var px := float(_j["slots"]["picture"]["px"][slot["kind"]])
	var at: Vector2 = slot["at"] + slot["size"] / 2.0 - Vector2(px, px) / 2.0
	return Rect2(Vector2(int(at.x), int(at.y)), Vector2(px, px))


func character_feet() -> Vector2:
	return _vec(_j["character"]["feet"])


func character_scale() -> float:
	return float(_j["character"]["scale"])


# A text group of the json ("race", "list", "stats", "pack", "count", "slot_name").
func text(group: String) -> Variant:
	return _j["text"][group]


func colour(name: String) -> Color:
	return Color.html(_j["text"]["colours"][name])


# The fonts the layout names, each once.
func font_names() -> Array:
	var names: Array = []
	var t: Dictionary = _j["text"]
	for group: Variant in [t["race"], t["list"], t["pack"], t["count"], t["slot_name"]]:
		_add_font(names, group)
	for s: Dictionary in t["stats"]:
		_add_font(names, s["label"])
		_add_font(names, s["value"])
	return names


func _add_font(names: Array, group: Dictionary) -> void:
	if not names.has(group["font"]):
		names.append(group["font"])


func _slot(kind: String, at: Array, name: String, gear: String, pack: int, bandage: bool) -> Dictionary:
	return {"kind": kind, "at": _vec(at), "size": _vec(_j["slots"]["kinds"][kind]), "name": name, "gear": gear, "pack": pack, "bandage": bandage}


static func _vec(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
