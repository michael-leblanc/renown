class_name BodyLoot
extends LootWindow
# The body's loot window (D128, D248): the loot window opened on someone lying where
# they fell. It is the loot window (loot_window.gd) with the chest's boards replaced by
# the body's: the title "Loot" and "Free to take" (a corpse's gear is free world loot,
# D3), what it wore in the character screen's gear order, what it carried, "Take all"
# and your pack. Drawn from the pieces and body.json that scripts/art/ui/body_loot.mjs
# --pieces writes, in the json's own pixels (1152 x 648); text in Alegreya.
#
# It shows one state, a plain dictionary (what the server sends for it is not settled,
# D176). Every key may be left out:
#   worn      [item or null, ..]: what the body wore, one per gear name, in the gear order
#   carried   {slots, items: [item or null, ..]}: what it carried; 12 slots, 20 if it
#             wore a backpack (D124)
#   pack      {slots, items}: yours, as in the loot window
#   coins     how many coins you carry (D123)
#   pointed   the body slot under the pointer at first, -1 for none; then the mouse moves
#             it (pointed_slot)
# A body slot is numbered from 0: the worn ones, then the carried ones. An item is as in
# the loot window; a slot shows only what is visible on the body (D131), and a carried
# item only once the window is open on it.
# A click on a slot that holds something sends took(slot), and changes nothing on screen:
# the server decides what is taken, and a new state shows it. Space (or the button) sends
# took_all, Esc (or the round button) closed.

var body: BodyLootLayout = null


func _ready() -> void:
	if body == null:
		setup_files(SETTINGS)
	mouse_exited.connect(_point.bind(-1))


func setup_files(settings_path: String) -> void:
	var settings: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	if not settings is Dictionary or not settings.get("screens") is Dictionary:
		push_error("body loot: %s has no screens group" % settings_path)
		return
	_paths = settings["screens"]
	_paths["loot_pieces"] = _paths["body_pieces"]
	setup_body(BodyLootLayout.load_body(_paths["body_layout"]))


func setup_body(body_layout: BodyLootLayout) -> void:
	body = body_layout
	setup(body_layout)


func worn_items() -> Array:
	var given: Array = state.get("worn", [])
	var out: Array = []
	for i in body.worn_count():
		out.append(given[i] if i < given.size() and given[i] is Dictionary else null)
	return out


func carried_items() -> Array:
	return _items("carried", mini(int(state.get("carried", {}).get("slots", 0)), body.carried_most()))


# What the body shows, slot by slot: the worn ones, then the carried ones.
func body_items() -> Array:
	return worn_items() + carried_items()


# The body slot under a point, or -1.
func body_slot_at(point: Vector2) -> int:
	for i in body_items().size():
		if body.body_rect(i).has_point(point):
			return i
	return -1


# The body slot pointed at that holds something, or -1: it is lit and has the note.
func pointed() -> int:
	var i := pointed_slot
	var items := body_items()
	return i if i >= 0 and i < items.size() and items[i] != null else -1


# "mid" for the title, or the smaller one when it does not fit beside the free line.
func title_face() -> String:
	var t: Dictionary = body.text("name")
	var f: Dictionary = body.text("free")
	return t["face"] if _width(t["text"], t["face"]) + _width(f["text"], f["face"]) <= float(t["fits"]) else t["smaller"]


# Over the panel, the buttons or the satchel: the rest of the window is the game's.
func _has_point(point: Vector2) -> bool:
	if body == null:
		return false
	for name: String in ["Panel", "Satchel", "Button Take All", "Button Close"]:
		var p := body.piece(name)
		var tex := _piece(p["file"])
		if tex != null and Rect2(p["at"], tex.get_size()).has_point(point):
			return true
	return false


func _gui_input(event: InputEvent) -> void:
	if body == null:
		return
	if event is InputEventMouseMotion:
		_point(body_slot_at(event.position))
		return
	var click := event as InputEventMouseButton
	if click == null or not click.pressed or click.button_index != MOUSE_BUTTON_LEFT:
		return
	var i := body_slot_at(click.position)
	if i != -1 and body_items()[i] != null:
		took.emit(i)
	elif body.take_all_rect().has_point(click.position):
		took_all.emit()
	elif body.is_on_close(click.position):
		closed.emit()
	else:
		return
	accept_event()


func _draw() -> void:
	if body == null:
		return
	for layer: String in body.order():
		if body.is_piece(layer):
			_put(body.piece(layer))
		elif layer == "worn slots":
			_draw_body_slots(0, worn_items())
		elif layer == "Slot Lit":
			if pointed() != -1 and pointed() < body.worn_count():
				_put(body.lit(pointed()))
		elif layer == "worn pictures":
			_draw_body_pictures(0, worn_items())
		elif layer == "carried slots":
			_draw_body_slots(body.worn_count(), carried_items())
			if pointed() >= body.worn_count():
				_put(body.lit(pointed()))
		elif layer == "carried pictures":
			_draw_body_pictures(body.worn_count(), carried_items())
		elif layer == "Plate Note":
			if pointed() != -1:
				_put(body.note(pointed()))
		elif layer == "pack slots":
			_draw_slots("pack", pack_items())
		elif layer == "pack pictures":
			_draw_pictures("pack", pack_items())
		elif layer == "text":
			_draw_body_text()
		else:
			push_error("body loot: unknown layer %s" % layer)


func _draw_body_slots(first: int, items: Array) -> void:
	for i in items.size():
		var material := "" if items[i] == null else str(items[i].get("material", ""))
		_put({"file": body.slot_file(material), "at": body.body_at(first + i)})


func _draw_body_pictures(first: int, items: Array) -> void:
	for i in items.size():
		if items[i] == null:
			continue
		var tex := _texture(_paths["item_pictures"].path_join(str(items[i].get("picture", "")) + ".png"))
		if tex != null:
			draw_texture_rect_region(tex, body.picture_rect(body.body_at(first + i)), body.picture_from())


func _draw_body_text() -> void:
	var count := body.count_spec()
	var items := body_items()
	for i in items.size():
		if items[i] != null and items[i].has("count"):
			_say(str(items[i]["count"]), count["face"], body.body_at(i) + _v(count["right"]), count["colour"], HORIZONTAL_ALIGNMENT_RIGHT, int(count["outline"]))
	var wn: Dictionary = body.worn_name_spec()
	var worn := worn_items()
	for i in worn.size():
		if worn[i] == null:
			_say(body.worn_names()[i], wn["face"], body.worn_name_at(i), wn["colour"], HORIZONTAL_ALIGNMENT_CENTER)
	var title: Dictionary = body.text("name")
	_say(title["text"], title_face(), _v(title["at"]), title["colour"], HORIZONTAL_ALIGNMENT_LEFT, int(title["outline"]))
	var free: Dictionary = body.text("free")
	_say(free["text"], free["face"], _v(free["right"]), free["colour"], HORIZONTAL_ALIGNMENT_RIGHT, int(free["outline"]))
	var carried: Dictionary = body.text("carried")
	_say(carried["text"], carried["face"], _v(carried["centre"]), carried["colour"], HORIZONTAL_ALIGNMENT_CENTER, int(carried["outline"]))
	var p := pointed()
	if p != -1:
		var item: Dictionary = items[p]
		var n := body.note_spec()
		var corner: Vector2 = body.note(p)["corner"]
		_say(str(item.get("name", "")), n["name"]["face"], corner + _v(n["name"]["at"]), n["name"]["colour"])
		var lines: Array = item.get("note", [])
		var l: Dictionary = n["lines"]
		for i in lines.size():
			var dy := Vector2(0, float(l["step"]) * i)
			_say(str(lines[i][0]), l["face"], corner + _v(l["label_at"]) + dy, l["label"])
			_say(str(lines[i][1]), l["face"], corner + _v(l["value_right"]) + dy, l["value"], HORIZONTAL_ALIGNMENT_RIGHT)
		_say(n["hint"]["text"], n["hint"]["face"], corner + _v(n["hint"]["at"]), n["hint"]["colour"])
	for key: String in ["take_all", "take_key", "close_key"]:
		var t: Dictionary = body.text(key)
		var align := HORIZONTAL_ALIGNMENT_CENTER if t.has("centre") else HORIZONTAL_ALIGNMENT_RIGHT if t.has("right") else HORIZONTAL_ALIGNMENT_LEFT
		_say(t["text"], t["face"], _v(t.get("centre", t.get("right", t.get("at")))), t["colour"], align, int(t["outline"]))
	var pk: Dictionary = body.text("pack")
	var o := int(pk["outline"])
	var at := _v(pk["label_at"])
	_say(pk["words"][0], pk["face"], at, pk["label"], HORIZONTAL_ALIGNMENT_LEFT, o)
	_say(pack_text(), pk["face"], at + Vector2(_width(pk["words"][0], pk["face"]) + float(pk["gap"]), 0), pk["value"], HORIZONTAL_ALIGNMENT_LEFT, o)
	var coins := str(state.get("coins", 0))
	var right := _v(pk["right"])
	_say(coins, pk["face"], right, pk["value"], HORIZONTAL_ALIGNMENT_RIGHT, o)
	_say(pk["words"][1], pk["face"], right - Vector2(_width(coins, pk["face"]) + float(pk["gap"]), 0), pk["label"], HORIZONTAL_ALIGNMENT_RIGHT, o)
