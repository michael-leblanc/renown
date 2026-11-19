class_name LootWindow
extends Control
# The loot window (D142, D248): what you opened as its own boards (a chest's), over
# your pack's satchel, "Take all" and Close between them, and a note on the item under
# the pointer. Drawn from the pieces and loot.json that
# scripts/art/ui/loot_window.mjs --pieces writes, in the json's own pixels
# (1152 x 648, the window) and in its order; text in Alegreya.
#
# It shows one state, a plain dictionary (what the server sends for it is not
# settled, D176; the note's lines and the owner line's words are not decided). Every
# key may be left out:
#   chest       {name, owner, slots, items: [item or null, ..]}: what you opened; owner
#               is who owns what is inside, which makes taking it a theft (D35)
#   pack        {slots, items: [item or null, ..]}: 12 slots, 20 with a backpack (D124)
#   coins       how many coins you carry (D123)
#   pointed     the chest slot under the pointer at first, -1 for none; then the mouse
#               moves it (pointed_slot)
# An item is {picture: pack picture name, material: a slot material, count (shown when
# given: coins, arrows, bandages), name, note: [[label, value], ..]}.
# It catches the mouse only over the boards, the buttons and the satchel: the game
# keeps the rest. A click on a chest slot that holds something sends took(slot), on
# Take all (or Space) took_all (D142: at once in the slice), on Close (or Esc) closed.

signal took(slot: int)
signal took_all
signal closed

const SETTINGS := "res://data/client.json"

var layout: LootLayout = null
var state: Dictionary = {}
var pointed_slot := -1

var _paths: Dictionary = {}
var _textures := {} # path -> Texture2D
var _fonts := {} # name -> Font


func _ready() -> void:
	if layout == null:
		setup_files(SETTINGS)
	mouse_exited.connect(_point.bind(-1))


func setup_files(settings_path: String) -> void:
	var settings: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	if not settings is Dictionary or not settings.get("screens") is Dictionary:
		push_error("loot window: %s has no screens group" % settings_path)
		return
	_paths = settings["screens"]
	setup(LootLayout.load_file(_paths["loot_layout"]))


func setup(loot_layout: LootLayout) -> void:
	layout = loot_layout
	if layout == null:
		return
	mouse_filter = Control.MOUSE_FILTER_STOP
	custom_minimum_size = layout.size()
	size = layout.size()
	for name: String in layout.font_names():
		_fonts[name] = _load(_paths["fonts"].path_join(name + ".woff"))


func show_state(new_state: Dictionary) -> void:
	state = new_state
	pointed_slot = int(state.get("pointed", -1))
	queue_redraw()


func chest_items() -> Array:
	return _items("chest", int(state.get("chest", {}).get("slots", 0)))


func pack_items() -> Array:
	return _items("pack", mini(int(state.get("pack", {}).get("slots", 0)), layout.pack_most()))


# The chest slot under a point, or -1.
func chest_slot_at(point: Vector2) -> int:
	for i in chest_items().size():
		if layout.slot_rect("chest", i).has_point(point):
			return i
	return -1


# The chest slot pointed at that holds something, or -1: it is lit and has the note.
func pointed() -> int:
	var i := pointed_slot
	var items := chest_items()
	return i if i >= 0 and i < items.size() and items[i] != null else -1


func pack_text() -> String:
	var items := pack_items()
	return "%d / %d" % [items.size() - items.count(null), items.size()]


# Over the boards, the buttons or the satchel: the rest of the window is the game's.
func _has_point(point: Vector2) -> bool:
	if layout == null:
		return false
	for name: String in ["Boards", "Satchel", "Button Take All", "Button Close"]:
		var p := layout.piece(name)
		var tex := _piece(p["file"])
		if tex != null and Rect2(p["at"], tex.get_size()).has_point(point):
			return true
	return false


func _gui_input(event: InputEvent) -> void:
	if layout == null:
		return
	if event is InputEventMouseMotion:
		_point(chest_slot_at(event.position))
		return
	var click := event as InputEventMouseButton
	if click == null or not click.pressed or click.button_index != MOUSE_BUTTON_LEFT:
		return
	var i := chest_slot_at(click.position)
	if i != -1 and chest_items()[i] != null:
		took.emit(i)
	elif layout.take_all_rect().has_point(click.position):
		took_all.emit()
	elif layout.is_on_close(click.position):
		closed.emit()
	else:
		return
	accept_event()


func _unhandled_key_input(event: InputEvent) -> void:
	if not visible:
		return
	var key := event as InputEventKey
	if key != null and key.pressed and not key.echo and key.keycode == KEY_SPACE:
		took_all.emit()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_cancel"):
		closed.emit()
		get_viewport().set_input_as_handled()


func _point(i: int) -> void:
	if pointed_slot != i:
		pointed_slot = i
		queue_redraw()


func _items(group: String, slots: int) -> Array:
	var given: Array = state.get(group, {}).get("items", [])
	var out: Array = []
	for i in slots:
		out.append(given[i] if i < given.size() and given[i] is Dictionary else null)
	return out


func _draw() -> void:
	if layout == null:
		return
	for layer: String in layout.order():
		if layout.is_piece(layer):
			_put(layout.piece(layer))
		elif layer == "chest slots":
			_draw_slots("chest", chest_items())
		elif layer == "Slot Lit":
			if pointed() != -1:
				_put(layout.lit(pointed()))
		elif layer == "chest pictures":
			_draw_pictures("chest", chest_items())
		elif layer == "Plate Note":
			if pointed() != -1:
				_put(layout.note(pointed()))
		elif layer == "pack slots":
			_draw_slots("pack", pack_items())
		elif layer == "pack pictures":
			_draw_pictures("pack", pack_items())
		elif layer == "text":
			_draw_text()
		else:
			push_error("loot window: unknown layer %s" % layer)


func _draw_slots(group: String, items: Array) -> void:
	for i in items.size():
		var material := "" if items[i] == null else str(items[i].get("material", ""))
		_put({"file": layout.slot_file(material), "at": layout.slot_at(group, i)})


func _draw_pictures(group: String, items: Array) -> void:
	for i in items.size():
		if items[i] == null:
			continue
		var tex := _texture(_paths["item_pictures"].path_join(str(items[i].get("picture", "")) + ".png"))
		if tex != null:
			draw_texture_rect_region(tex, layout.picture_rect(layout.slot_at(group, i)), layout.picture_from())


func _draw_text() -> void:
	var count := layout.count_spec()
	for group: String in ["chest", "pack"]:
		var items := chest_items() if group == "chest" else pack_items()
		for i in items.size():
			if items[i] != null and items[i].has("count"):
				_say(str(items[i]["count"]), count["face"], layout.slot_at(group, i) + _v(count["right"]), count["colour"], HORIZONTAL_ALIGNMENT_RIGHT, int(count["outline"]))
	var chest: Dictionary = state.get("chest", {})
	var cn: Dictionary = layout.text("chest_name")
	_say(str(chest.get("name", "")), cn["face"], _v(cn["at"]), cn["colour"], HORIZONTAL_ALIGNMENT_LEFT, int(cn["outline"]))
	var ow: Dictionary = layout.text("owner")
	_say(str(chest.get("owner", "")), ow["face"], _v(ow["right"]), ow["colour"], HORIZONTAL_ALIGNMENT_RIGHT, int(ow["outline"]))
	var p := pointed()
	if p != -1:
		var item: Dictionary = chest_items()[p]
		var n := layout.note_spec()
		var corner: Vector2 = layout.note(p)["corner"]
		_say(str(item.get("name", "")), n["name"]["face"], corner + _v(n["name"]["at"]), n["name"]["colour"])
		var lines: Array = item.get("note", [])
		var l: Dictionary = n["lines"]
		for i in lines.size():
			var dy := Vector2(0, float(l["step"]) * i)
			_say(str(lines[i][0]), l["face"], corner + _v(l["label_at"]) + dy, l["label"])
			_say(str(lines[i][1]), l["face"], corner + _v(l["value_right"]) + dy, l["value"], HORIZONTAL_ALIGNMENT_RIGHT)
		_say(n["hint"]["text"], n["hint"]["face"], corner + _v(n["hint"]["at"]), n["hint"]["colour"])
	var ta: Dictionary = layout.text("take_all")
	_say(ta["text"], ta["face"], _v(ta["centre"]), ta["colour"], HORIZONTAL_ALIGNMENT_CENTER, int(ta["outline"]))
	var tk: Dictionary = layout.text("take_key")
	_say(tk["text"], tk["face"], _v(tk["right"]), tk["colour"], HORIZONTAL_ALIGNMENT_RIGHT, int(tk["outline"]))
	var ck: Dictionary = layout.text("close_key")
	_say(ck["text"], ck["face"], _v(ck["at"]), ck["colour"], HORIZONTAL_ALIGNMENT_LEFT, int(ck["outline"]))
	var pk: Dictionary = layout.text("pack")
	var o := int(pk["outline"])
	var at := _v(pk["label_at"])
	_say(pk["words"][0], pk["face"], at, pk["label"], HORIZONTAL_ALIGNMENT_LEFT, o)
	_say(pack_text(), pk["face"], at + Vector2(_width(pk["words"][0], pk["face"]) + float(pk["gap"]), 0), pk["value"], HORIZONTAL_ALIGNMENT_LEFT, o)
	var coins := str(state.get("coins", 0))
	var right := _v(pk["right"])
	_say(coins, pk["face"], right, pk["value"], HORIZONTAL_ALIGNMENT_RIGHT, o)
	_say(pk["words"][1], pk["face"], right - Vector2(_width(coins, pk["face"]) + float(pk["gap"]), 0), pk["label"], HORIZONTAL_ALIGNMENT_RIGHT, o)


# A line of text. `at` is its top left, top right or top middle by `align`; the top
# is the font's ascent line (the json's note). The baseline is kept on a whole pixel.
func _say(line: String, face_name: String, at: Vector2, colour: String, align := HORIZONTAL_ALIGNMENT_LEFT, outline := 0) -> void:
	if line == "":
		return
	var face := layout.face(face_name)
	var f: Font = _fonts.get(face["font"])
	if f == null:
		return
	var px := int(face["px"])
	var w := _width(line, face_name)
	var x := at.x - (w if align == HORIZONTAL_ALIGNMENT_RIGHT else w / 2.0 if align == HORIZONTAL_ALIGNMENT_CENTER else 0.0)
	var base := Vector2(x, roundf(at.y + f.get_ascent(px)))
	if outline > 0:
		# The json's outline is how far it reaches out from the letters; Godot's size
		# is its whole width, half of it outside.
		draw_string_outline(f, base, line, HORIZONTAL_ALIGNMENT_LEFT, -1, px, outline * 2, layout.colour("outline"))
	draw_string(f, base, line, HORIZONTAL_ALIGNMENT_LEFT, -1, px, layout.colour(colour))


func _width(line: String, face_name: String) -> float:
	var face := layout.face(face_name)
	var f: Font = _fonts.get(face["font"])
	if f == null:
		return 0.0
	return f.get_string_size(line, HORIZONTAL_ALIGNMENT_LEFT, -1, int(face["px"])).x


func _put(p: Dictionary) -> void:
	var tex := _piece(p["file"])
	if tex != null:
		draw_texture(tex, p["at"])


func _piece(file: String) -> Texture2D:
	return _texture(_paths["loot_pieces"].path_join(file))


func _texture(path: String) -> Texture2D:
	if not _textures.has(path):
		_textures[path] = _load(path)
	return _textures[path]


func _load(path: String) -> Resource:
	if not ResourceLoader.exists(path):
		push_error("loot window: missing %s" % path)
		return null
	return load(path)


static func _v(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
