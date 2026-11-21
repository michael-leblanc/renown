class_name ShopLayout
extends RefCounted
# Where everything in the shop window goes (D64, D143 to D145), read from shop.json,
# which scripts/art/ui/shop_window.mjs --pieces writes beside the pieces. Plain data:
# no nodes, so tests read it headless. Every place, size and timing comes from the
# json (D175). The words of a refusal and of the "how many" question are not in the
# json and not decided: they are here for now.

const REFUSALS := {
	"short": "You are short of coins",
	"not_buying": "The shop is not buying that now",
}
const HOW_MANY := "How many?"

var _j: Dictionary = {}


static func load_file(path: String) -> ShopLayout:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("shop window: %s is not a JSON object" % path)
		return null
	return from_dict(parsed)


static func from_dict(j: Dictionary) -> ShopLayout:
	for key in ["size", "order", "pieces", "face", "slots", "shop", "pack", "note", "menu", "pop", "close", "text"]:
		if not j.has(key):
			push_error("shop window: the layout has no %s" % key)
			return null
	var layout := ShopLayout.new()
	layout._j = j
	return layout


func size() -> Vector2:
	return _vec(_j["size"])


# What is drawn, back to front: a piece's name, or one of "the face", "shop slots",
# "shop pictures", "Slot Out", "Slot Lit", "Plate Note", "pack slots", "pack pictures",
# "Slot New", "text", "Plate Menu", "Menu Lit", "menu text".
func order() -> Array:
	return _j["order"]


func is_piece(name: String) -> bool:
	return _j["pieces"].has(name)


func piece(name: String) -> Dictionary:
	var p: Dictionary = _j["pieces"][name]
	return {"file": p["file"], "at": _vec(p["at"])}


func face_spec() -> Dictionary:
	return _j["face"]


func face_rect() -> Rect2:
	var f: Dictionary = _j["face"]
	var r := float(f["radius"])
	return Rect2(_vec(f["centre"]) - Vector2(r, r), Vector2(r, r) * 2.0)


# Group "shop" or "pack": its first slot's corner, step, columns and most slots.
func most(group: String) -> int:
	return int(_j[group]["most"])


func slot_at(group: String, i: int) -> Vector2:
	var g: Dictionary = _j[group]
	var columns := int(g["columns"])
	return _vec(g["first"]) + Vector2(float(i % columns) * float(g["step"][0]), float(i / columns) * float(g["step"][1]))


func slot_size() -> Vector2:
	return _vec(_j["slots"]["size"])


func slot_rect(group: String, i: int) -> Rect2:
	return Rect2(slot_at(group, i), slot_size())


func slot_file(material: String) -> String:
	if material == "":
		material = "Empty"
	if not _j["slots"]["materials"].has(material):
		push_error("shop window: no slot for the material %s" % material)
		material = "Empty"
	return str(_j["slots"]["file"]).replace("<material>", material)


# An overlay of a slot (lit, out, new): {file, dx, dy}; its corner is the slot's plus dx, dy.
func overlay(name: String) -> Dictionary:
	return _j["slots"][name]


func new_fade() -> float:
	return float(_j["slots"]["new_fade"])


func picture_from() -> Rect2:
	var f: Array = _j["slots"]["picture"]["from"]
	return Rect2(f[0], f[1], f[2], f[3])


func picture_rect(at: Vector2) -> Rect2:
	var p: Dictionary = _j["slots"]["picture"]
	var px := float(p["px"])
	return Rect2(at + Vector2(float(p["dx"]), float(p["dy"])), Vector2(px, px))


func count_spec() -> Dictionary:
	return _j["slots"]["count"]


func shop_spec() -> Dictionary:
	return _j["shop"]


# The note on the pointed slot i of a group: {file, at, corner}; it goes down with the
# slot's top, from the shop's first row.
func note(group: String, i: int) -> Dictionary:
	var n: Dictionary = _j["note"]
	var down := Vector2(0, slot_at(group, i).y - float(n["row_top"]))
	return {"file": n["file"], "at": _vec(n["at"]) + down, "corner": _vec(n["corner"]) + down}


func note_spec() -> Dictionary:
	return _j["note"]


func menu_spec() -> Dictionary:
	return _j["menu"]


# The menu's lines for what is under it: "shop", "pack" or "coins" (Value and no Sell).
func menu_lines(kind: String) -> Array:
	var m: Dictionary = _j["menu"]
	if kind == "shop":
		return m["shop_lines"]
	if kind == "pack":
		return m["pack_lines"]
	return m["pack_lines"].slice(0, 1)


# Where the menu plate, its corner and its lit line go for slot i of a group, when the
# plate is `plate` wide: to the right of the slot, or to its left near the window's edge.
# {at, corner, lit, shift}
func menu_place(group: String, i: int, plate: Vector2, lit_size: Vector2) -> Dictionary:
	var m: Dictionary = _j["menu"]
	var shift := slot_at(group, i) - _vec(m["slot0"])
	var gap := float(m["at"][0]) - (float(m["slot0"][0]) + slot_size().x)
	if float(m["at"][0]) + shift.x + plate.x > size().x:
		shift.x = slot_at(group, i).x - gap - plate.x - float(m["at"][0])
	return {
		"at": _vec(m["at"]) + shift,
		"corner": _vec(m["corner"]) + shift,
		"lit": _vec(m["lit"]["at"]) + shift,
		"shift": shift,
	}


func pop_spec() -> Dictionary:
	return _j["pop"]


func is_on_close(point: Vector2) -> bool:
	return point.distance_to(_vec(_j["close"]["centre"])) <= float(_j["close"]["radius"])


func text(group: String) -> Variant:
	return _j["text"][group]


func colour(name: String) -> Color:
	return Color.html(_j["text"]["colours"][name])


func face(name: String) -> Dictionary:
	return _j["text"]["faces"][name]


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
	for o: String in ["lit", "out", "new"]:
		out.append(_j["slots"][o]["file"])
	out.append(_j["note"]["file"])
	out.append(_j["menu"]["file"])
	out.append(_j["menu"]["lit"]["file"])
	return out


static func _vec(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
