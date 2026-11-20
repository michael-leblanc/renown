class_name BodyLootLayout
extends LootLayout
# Where everything in a body's loot window goes (D128, D248), read from body.json, which
# scripts/art/ui/body_loot.mjs --pieces writes beside the pieces. It is the loot
# window's layout with the body's own groups: a row of worn slots in the character
# screen's gear order, then a grid of carried slots. A body slot is numbered from 0:
# the worn ones first (0 to worn_count() - 1), then the carried ones. Plain data: no
# nodes. Every place and size comes from the json (D175).


static func load_body(path: String) -> BodyLootLayout:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("body loot: %s is not a JSON object" % path)
		return null
	return from_body(parsed)


static func from_body(j: Dictionary) -> BodyLootLayout:
	for key in ["size", "order", "pieces", "slots", "worn", "carried", "pack", "note", "take_all", "close", "text"]:
		if not j.has(key):
			push_error("body loot: the layout has no %s" % key)
			return null
	var layout := BodyLootLayout.new()
	layout._j = j
	return layout


func worn_count() -> int:
	return _j["worn"]["names"].size()


# The gear names of the worn row, in the character screen's order.
func worn_names() -> Array:
	return _j["worn"]["names"]


# The most slots a body can have carried (D124).
func carried_most() -> int:
	return int(_j["carried"]["most"])


# The top left corner of a slot of "worn" (i is its gear number), "carried" or "pack" (i from 0).
func group_at(group: String, i: int) -> Vector2:
	if group == "worn":
		return _vec(_j["worn"]["at"][i])
	return super.slot_at(group, i)


# The top left corner of body slot i: worn first, then carried.
func body_at(i: int) -> Vector2:
	var worn := worn_count()
	return group_at("worn", i) if i < worn else group_at("carried", i - worn)


func body_rect(i: int) -> Rect2:
	return Rect2(body_at(i), slot_size())


# The pack's slots use the loot window's rule.
func slot_at(group: String, i: int) -> Vector2:
	return group_at(group, i)


# The pointed slot's glow, for body slot i: {file, at}.
func lit(i: int) -> Dictionary:
	var l: Dictionary = _j["slots"]["lit"]
	return {"file": l["file"], "at": body_at(i) + Vector2(float(l["dx"]), float(l["dy"]))}


# The note's plate and the corner its texts are placed from, for the pointed body slot i:
# {file, at, corner}. It goes down by the slot's top minus the worn row's top.
func note(i: int) -> Dictionary:
	var n: Dictionary = _j["note"]
	var down := Vector2(0, body_at(i).y - float(n["row_top"]))
	return {"file": n["file"], "at": _vec(n["at"]) + down, "corner": _vec(n["corner"]) + down}


# An empty worn slot's gear name goes centred at this point.
func worn_name_at(i: int) -> Vector2:
	return group_at("worn", i) + Vector2(slot_size().x / 2.0, float(_j["worn"]["name"]["dy"]))


func worn_name_spec() -> Dictionary:
	return _j["worn"]["name"]
