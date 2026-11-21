class_name ShopWindow
extends Control
# The shop window (D64, D143 to D145, D248): what the shopkeeper sells, over your pack,
# the shopkeeper's face and line above, a note on the item under the pointer and a
# right-click menu. Drawn from the pieces and shop.json that
# scripts/art/ui/shop_window.mjs --pieces writes, in the json's own pixels
# (1152 x 648, the window) and in its order; text in Alegreya. Not wired to the game
# yet: no shopkeeper exists.
#
# It shows one state, a plain dictionary the server's answer fills (what the server
# sends for it is not settled, D176). It only shows it: every price, count and refusal
# is the server's (D143 to D145), and a click changes nothing on screen until a new
# state is shown. Every key may be left out:
#   face      Texture2D: the shopkeeper's face, cut by cut_face() from their character
#   name      what the window is called (the json's "Shop")
#   says      a line the shopkeeper says
#   shop_coins  the shop's own coins
#   shop      {slots, items: [item or null, ..]}: its stock, 30 slots at most
#   pack      {slots, items: [item or null, ..]}: 12 slots, 20 with a backpack (D124)
#   coins     how many coins you carry (D123)
#   pointed   the shop slot under the pointer at first, -1 for none; then the mouse
#             moves it (pointed_group, pointed_slot)
#   refusal   why the server said no: "short" (short of coins) or "not_buying"
#   fresh     the pack slot that just got something: Slot New flashes round it
#   pop       the coins that changed hands as text ("-90"): Coin Pop at your purse
# An item is {picture: pack picture name, material: a slot material, name, worn: where
# it is worn, price (shop: what you pay; pack: what the shop pays, left out when it is
# not buying), left (shop: how many; 0 is sold out), count (pack: coins, arrows, ..),
# id (what is sent; the picture when left out)}.
# A click on a shop item sends bought(item, 1); the right-click menu on a shop item
# sends bought(item, n), on a pack item sold(item, n), on coins it only has Value; X asks
# for a number to type (Enter sends it). Close (or Esc) sends closed; Esc first shuts an
# open menu or question.

signal bought(item: String, count: int)
signal sold(item: String, count: int)
signal closed

const SETTINGS := "res://data/client.json"
const COINS := "Coins" # the picture of coins: never sold
const TYPED_MOST := 9 # digits kept when a number is typed, so it fits an int (a guard, not a rule)

var layout: ShopLayout = null
var state: Dictionary = {}
var pointed_group := "shop"
var pointed_slot := -1
var menu_lit := -1 # the menu line under the pointer
var typed := "" # the number being typed after X
var animate := true # the flash and the coins fade; the shot page holds them still

var _paths: Dictionary = {}
var _textures := {} # path -> Texture2D
var _fonts := {} # name -> Font
var _menu_open := false
var _menu_group := ""
var _menu_slot := -1
var _asking := ""
var _age := 0.0


func _ready() -> void:
	if layout == null:
		setup_files(SETTINGS)
	mouse_exited.connect(_point.bind("shop", -1))


func setup_files(settings_path: String) -> void:
	var settings: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	if not settings is Dictionary or not settings.get("screens") is Dictionary:
		push_error("shop window: %s has no screens group" % settings_path)
		return
	_paths = settings["screens"]
	setup(ShopLayout.load_file(_paths["shop_layout"]))


func setup(shop_layout: ShopLayout) -> void:
	layout = shop_layout
	if layout == null:
		return
	mouse_filter = Control.MOUSE_FILTER_STOP
	custom_minimum_size = layout.size()
	size = layout.size()
	for name: String in layout.font_names():
		_fonts[name] = _load(_paths["fonts"].path_join(name + ".woff"))


func show_state(new_state: Dictionary) -> void:
	state = new_state
	pointed_group = "shop"
	pointed_slot = int(state.get("pointed", -1))
	_age = 0.0
	_close_menu()
	queue_redraw()


# The keeper's character, cut to the face: the figure (the Creator character facing S,
# standing, in its own pixels) drawn "scale" times, its top "above" px over the highest
# pixel, centred on the figure, and cut to a circle of "radius" (the json's face).
static func cut_face(figure: Image, spec: Dictionary) -> Image:
	var r := int(spec["radius"])
	var s := float(spec["scale"])
	var x0 := figure.get_width()
	var x1 := 0
	var y0 := figure.get_height()
	for y in figure.get_height():
		for x in figure.get_width():
			if figure.get_pixel(x, y).a > 40.0 / 255.0:
				x0 = mini(x0, x)
				x1 = maxi(x1, x)
				y0 = mini(y0, y)
	var cx := (x0 + x1 + 1) / 2.0
	var top := float(y0) - float(spec["above"])
	var out := Image.create_empty(2 * r, 2 * r, false, Image.FORMAT_RGBA8)
	for j in 2 * r:
		for i in 2 * r:
			if Vector2(i + 0.5 - r, j + 0.5 - r).length() > r - 0.5:
				continue
			var sx := int(floorf(cx - r / s + i / s))
			var sy := int(floorf(top + j / s))
			if sx < 0 or sy < 0 or sx >= figure.get_width() or sy >= figure.get_height():
				continue
			out.set_pixel(i, j, figure.get_pixel(sx, sy))
	return out


func says_text() -> String:
	return str(state.get("says", ""))


func shop_items() -> Array:
	return _items("shop", mini(int(state.get("shop", {}).get("slots", layout.most("shop"))), layout.most("shop")))


func pack_items() -> Array:
	return _items("pack", mini(int(state.get("pack", {}).get("slots", 0)), layout.most("pack")))


func pack_text() -> String:
	var items := pack_items()
	return "%d / %d" % [items.size() - items.count(null), items.size()]


func items_of(group: String) -> Array:
	return shop_items() if group == "shop" else pack_items()


# The slot of a group under a point, or -1.
func slot_at(group: String, point: Vector2) -> int:
	for i in items_of(group).size():
		if layout.slot_rect(group, i).has_point(point):
			return i
	return -1


# The slot pointed at that holds something, or -1: it is lit and has the note.
func pointed() -> int:
	var items := items_of(pointed_group)
	var i := pointed_slot
	return i if i >= 0 and i < items.size() and items[i] != null else -1


# A shop slot that holds something and has none left: greyed, with 0.
func is_out(i: int) -> bool:
	var items := shop_items()
	return i >= 0 and i < items.size() and items[i] != null and int(items[i].get("left", 0)) <= 0


func new_slot() -> int:
	var i := int(state.get("fresh", -1))
	return i if i >= 0 and i < pack_items().size() else -1


func pop_amount() -> String:
	return str(state.get("pop", ""))


func refusal_text() -> String:
	return ShopLayout.REFUSALS.get(str(state.get("refusal", "")), "")


# How solid the flash round a new item is, and the coins' pop: 1 when shown, 0 after
# their time (settings in the json).
func flash_alpha() -> float:
	return 0.0 if new_slot() == -1 else clampf(1.0 - _age / layout.new_fade(), 0.0, 1.0)


func pop_alpha() -> float:
	return 0.0 if pop_amount() == "" else clampf(1.0 - _age / float(layout.pop_spec()["time"]), 0.0, 1.0)


func advance(seconds: float) -> void:
	_age += seconds
	queue_redraw()


func _process(delta: float) -> void:
	if animate and layout != null and (flash_alpha() > 0.0 or pop_alpha() > 0.0):
		advance(delta)


# ---- the right-click menu

func open_menu(group: String, i: int) -> void:
	_close_menu()
	var items := items_of(group)
	if i < 0 or i >= items.size() or items[i] == null:
		return
	_menu_open = true
	_menu_group = group
	_menu_slot = i
	queue_redraw()


func menu_open() -> bool:
	return _menu_open


func is_asking() -> bool:
	return _asking != ""


# What the menu is over: "shop", "pack" or "coins" (Value only: coins are not sold).
func menu_kind() -> String:
	if _menu_group == "shop":
		return "shop"
	var item: Dictionary = pack_items()[_menu_slot]
	return "coins" if str(item.get("picture", "")) == COINS else "pack"


# The lines of the menu shown now: none when it is shut or asks for a number.
func menu_lines() -> Array:
	return layout.menu_lines(menu_kind()) if _menu_open and _asking == "" else []


func menu_item() -> Dictionary:
	return items_of(_menu_group)[_menu_slot]


func menu_place() -> Dictionary:
	var m := layout.menu_spec()
	return layout.menu_place(_menu_group, _menu_slot, _piece_size(m["file"]), _piece_size(m["lit"]["file"]))


func menu_line_rect(i: int) -> Rect2:
	var m := layout.menu_spec()
	var at: Vector2 = menu_place()["lit"] + Vector2(0, float(m["lines"]["step"]) * i)
	return Rect2(at, _piece_size(m["lit"]["file"]))


func menu_rect() -> Rect2:
	return Rect2(menu_place()["at"], _piece_size(layout.menu_spec()["file"]))


func menu_line_at(point: Vector2) -> int:
	for i in menu_lines().size():
		if menu_line_rect(i).has_point(point):
			return i
	return -1


func _pick(line: int) -> void:
	var words: String = menu_lines()[line]
	var item := menu_item()
	var id := str(item.get("id", item.get("picture", "")))
	var buying := _menu_group == "shop"
	if words == "Value":
		_close_menu()
		return
	if words.ends_with("X"):
		_asking = "buy" if buying else "sell"
		typed = ""
		queue_redraw()
		return
	_close_menu()
	_send(buying, id, int(words.split(" ")[1]))


func _send(buying: bool, id: String, count: int) -> void:
	if buying:
		bought.emit(id, count)
	else:
		sold.emit(id, count)


func _close_menu() -> void:
	_menu_open = false
	_asking = ""
	typed = ""
	menu_lit = -1
	queue_redraw()


# ---- the mouse and the keys

func _has_point(point: Vector2) -> bool:
	if layout == null:
		return false
	for name: String in ["Panel", "Satchel", "Button Close"]:
		var p := layout.piece(name)
		var tex := _piece(p["file"])
		if tex != null and Rect2(p["at"], tex.get_size()).has_point(point):
			return true
	return _menu_open and menu_rect().has_point(point)


func _gui_input(event: InputEvent) -> void:
	if layout == null:
		return
	if event is InputEventMouseMotion:
		var lit := menu_line_at(event.position)
		if menu_lit != lit:
			menu_lit = lit
			queue_redraw()
		for group: String in ["shop", "pack"]:
			var i := slot_at(group, event.position)
			if i != -1:
				_point(group, i)
				return
		_point("shop", -1)
		return
	var click := event as InputEventMouseButton
	if click == null or not click.pressed:
		return
	if click.button_index == MOUSE_BUTTON_RIGHT:
		for group: String in ["shop", "pack"]:
			var i := slot_at(group, click.position)
			if i != -1:
				open_menu(group, i)
				accept_event()
				return
		_close_menu()
		return
	if click.button_index != MOUSE_BUTTON_LEFT:
		return
	if _menu_open:
		var line := menu_line_at(click.position)
		if line != -1:
			_pick(line)
		elif not menu_rect().has_point(click.position):
			_close_menu()
		accept_event()
		return
	var i := slot_at("shop", click.position)
	if i != -1 and shop_items()[i] != null:
		var item: Dictionary = shop_items()[i]
		bought.emit(str(item.get("id", item.get("picture", ""))), 1)
	elif layout.is_on_close(click.position):
		closed.emit()
	elif slot_at("pack", click.position) == -1:
		return
	accept_event()


func _unhandled_key_input(event: InputEvent) -> void:
	if not visible:
		return
	if event.is_action_pressed("ui_cancel"):
		if _menu_open:
			_close_menu()
		else:
			closed.emit()
		get_viewport().set_input_as_handled()
		return
	var key := event as InputEventKey
	if key == null or not key.pressed or key.echo or _asking == "":
		return
	var digit := _digit(key.keycode)
	if digit != "":
		if typed.length() < TYPED_MOST:
			typed += digit
	elif key.keycode == KEY_BACKSPACE:
		typed = typed.left(-1)
	elif key.keycode == KEY_ENTER or key.keycode == KEY_KP_ENTER:
		var n := typed.to_int()
		if n > 0:
			var item := menu_item()
			var buying := _asking == "buy"
			_close_menu()
			_send(buying, str(item.get("id", item.get("picture", ""))), n)
	else:
		return
	queue_redraw()
	get_viewport().set_input_as_handled()


static func _digit(keycode: Key) -> String:
	if keycode >= KEY_0 and keycode <= KEY_9:
		return str(keycode - KEY_0)
	if keycode >= KEY_KP_0 and keycode <= KEY_KP_9:
		return str(keycode - KEY_KP_0)
	return ""


func _point(group: String, i: int) -> void:
	if pointed_slot != i or pointed_group != group:
		pointed_group = group
		pointed_slot = i
		queue_redraw()


func _items(group: String, slots: int) -> Array:
	var given: Array = state.get(group, {}).get("items", [])
	var out: Array = []
	for i in slots:
		out.append(given[i] if i < given.size() and given[i] is Dictionary else null)
	return out


# ---- drawing

func _draw() -> void:
	if layout == null:
		return
	for layer: String in layout.order():
		if layout.is_piece(layer):
			if layer != "Coin Pop":
				_put(layout.piece(layer))
			elif pop_alpha() > 0.0:
				var p := layout.piece(layer)
				p["at"] += _pop_lift()
				_put(p, pop_alpha())
		elif layer == "the face":
			var face: Variant = state.get("face")
			if face is Texture2D:
				draw_texture(face, layout.face_rect().position)
		elif layer == "shop slots":
			_draw_slots("shop", shop_items())
		elif layer == "shop pictures":
			_draw_pictures("shop", shop_items())
		elif layer == "Slot Out":
			for i in shop_items().size():
				if is_out(i):
					_put_over("shop", i, "out")
		elif layer == "Slot Lit":
			if pointed() != -1:
				_put_over(pointed_group, pointed(), "lit")
		elif layer == "Plate Note":
			if pointed() != -1:
				_put(layout.note(pointed_group, pointed()))
		elif layer == "pack slots":
			_draw_slots("pack", pack_items())
		elif layer == "pack pictures":
			_draw_pictures("pack", pack_items())
		elif layer == "Slot New":
			if flash_alpha() > 0.0:
				_put_over("pack", new_slot(), "new", flash_alpha())
		elif layer == "text":
			_draw_text()
		elif layer == "Plate Menu":
			if _menu_open:
				_put({"file": layout.menu_spec()["file"], "at": menu_place()["at"]})
		elif layer == "Menu Lit":
			if menu_lit != -1 and menu_lit < menu_lines().size():
				_put({"file": layout.menu_spec()["lit"]["file"], "at": menu_line_rect(menu_lit).position})
		elif layer == "menu text":
			if _menu_open:
				_draw_menu_text()
		else:
			push_error("shop window: unknown layer %s" % layer)


func _pop_lift() -> Vector2:
	var pop := layout.pop_spec()
	return Vector2(0, -float(pop["rise"]) * minf(_age / float(pop["time"]), 1.0))


func _put_over(group: String, i: int, name: String, alpha := 1.0) -> void:
	var o := layout.overlay(name)
	_put({"file": o["file"], "at": layout.slot_at(group, i) + Vector2(float(o["dx"]), float(o["dy"]))}, alpha)


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
	var shop := layout.shop_spec()
	var items := shop_items()
	for i in items.size():
		if items[i] == null:
			continue
		var out := is_out(i)
		var at := layout.slot_at("shop", i)
		var price: Dictionary = shop["price"]
		_say(str(items[i].get("price", "")), price["face"], at + _v(price["centre"]), price["out" if out else "colour"], HORIZONTAL_ALIGNMENT_CENTER, int(price["outline"]))
		var left: Dictionary = shop["left"]
		_say(str(items[i].get("left", 0)), left["face"], at + _v(left["at"]), left["out" if out else "colour"], HORIZONTAL_ALIGNMENT_LEFT, int(left["outline"]))
	var count := layout.count_spec()
	var held := pack_items()
	for i in held.size():
		if held[i] != null and held[i].has("count"):
			_say(str(held[i]["count"]), count["face"], layout.slot_at("pack", i) + _v(count["right"]), count["colour"], HORIZONTAL_ALIGNMENT_RIGHT, int(count["outline"]))
	if pointed() != -1:
		_draw_note()
	var nm: Dictionary = layout.text("name")
	_say(str(state.get("name", nm["text"])), nm["face"], _v(nm["at"]), nm["colour"], HORIZONTAL_ALIGNMENT_LEFT, int(nm["outline"]))
	var sy: Dictionary = layout.text("says")
	_say(says_text(), sy["face"], _v(sy["at"]), sy["colour"], HORIZONTAL_ALIGNMENT_LEFT, int(sy["outline"]))
	var c: Dictionary = layout.text("coins")
	var shop_coins := str(state.get("shop_coins", 0))
	var right := _v(c["right"])
	_say(shop_coins, c["face"], right, c["value"], HORIZONTAL_ALIGNMENT_RIGHT, int(c["outline"]))
	_say(c["word"], c["face"], right - Vector2(_width(shop_coins, c["face"]) + float(c["gap"]), 0), c["label"], HORIZONTAL_ALIGNMENT_RIGHT, int(c["outline"]))
	var how: Dictionary = layout.text("how")
	var o := int(how["outline"])
	if refusal_text() != "":
		var start: float = _v(how["right"]).x - _width(how["words"][0], how["face"])
		_say(refusal_text(), how["face"], Vector2(start, _v(how["right"]).y), "glow", HORIZONTAL_ALIGNMENT_LEFT, o)
	else:
		_say(how["words"][0], how["face"], _v(how["right"]), how["colours"][0], HORIZONTAL_ALIGNMENT_RIGHT, o)
		_say(how["words"][1], how["face"], _v(how["at"]), how["colours"][1], HORIZONTAL_ALIGNMENT_LEFT, o)
	var ck: Dictionary = layout.text("close_key")
	_say(ck["text"], ck["face"], _v(ck["at"]), ck["colour"], HORIZONTAL_ALIGNMENT_LEFT, int(ck["outline"]))
	var pk: Dictionary = layout.text("pack")
	o = int(pk["outline"])
	var at := _v(pk["label_at"])
	_say(pk["words"][0], pk["face"], at, pk["label"], HORIZONTAL_ALIGNMENT_LEFT, o)
	_say(pack_text(), pk["face"], at + Vector2(_width(pk["words"][0], pk["face"]) + float(pk["gap"]), 0), pk["value"], HORIZONTAL_ALIGNMENT_LEFT, o)
	var coins := str(state.get("coins", 0))
	var edge := _v(pk["right"])
	_say(coins, pk["face"], edge, pk["value"], HORIZONTAL_ALIGNMENT_RIGHT, o)
	_say(pk["words"][1], pk["face"], edge - Vector2(_width(coins, pk["face"]) + float(pk["gap"]), 0), pk["label"], HORIZONTAL_ALIGNMENT_RIGHT, o)
	if pop_alpha() > 0.0:
		var pop := layout.pop_spec()
		var t: Dictionary = pop["text"]
		var from := _v(pop["burst"]) + _v(t["right"]) + _pop_lift()
		_say(pop_amount(), t["face"], from, t["colour"], HORIZONTAL_ALIGNMENT_RIGHT, int(t["outline"]), pop_alpha())


func _draw_note() -> void:
	var item: Dictionary = items_of(pointed_group)[pointed()]
	var n := layout.note_spec()
	var corner: Vector2 = layout.note(pointed_group, pointed())["corner"]
	_say(str(item.get("name", "")), n["name"]["face"], corner + _v(n["name"]["at"]), n["name"]["colour"])
	if str(item.get("picture", "")) == COINS:
		return
	var shop := pointed_group == "shop"
	var labels: Array = n["shop_lines" if shop else "pack_lines"]
	var worn := str(item.get("worn", "-"))
	var values: Array = [str(item.get("material", "")), worn]
	if shop:
		values.append(str(item.get("price", "")))
		values.append(str(item.get("left", 0)))
	else:
		values.append(str(item["price"]) if item.has("price") else str(n["not_buying"]))
	var l: Dictionary = n["lines"]
	for i in mini(labels.size(), values.size()):
		var dy := Vector2(0, float(l["step"]) * i)
		_say(str(labels[i]), l["face"], corner + _v(l["label_at"]) + dy, l["label"])
		_say(values[i], l["face"], corner + _v(l["value_right"]) + dy, l["value"], HORIZONTAL_ALIGNMENT_RIGHT)
	_say(n["shop_hint" if shop else "pack_hint"], n["hint"]["face"], corner + _v(n["hint"]["at"]), n["hint"]["colour"])


func _draw_menu_text() -> void:
	var m := layout.menu_spec()
	var corner: Vector2 = menu_place()["corner"]
	_say(str(menu_item().get("name", "")), m["name"]["face"], corner + _v(m["name"]["at"]), m["name"]["colour"])
	var l: Dictionary = m["lines"]
	var at := corner + _v(l["at"])
	if _asking != "":
		_say("%s %s_" % [ShopLayout.HOW_MANY, typed], l["face"], at, l["lit"])
		return
	var lines := menu_lines()
	for i in lines.size():
		var colour: String = l["lit"] if i == menu_lit else l["colour"] if i > 0 else l["first"]
		_say(str(lines[i]), l["face"], at + Vector2(0, float(l["step"]) * i), colour)


# A line of text. `at` is its top left, top right or top middle by `align`; the top
# is the font's ascent line (the json's note). The baseline is kept on a whole pixel.
func _say(line: String, face_name: String, at: Vector2, colour: String, align := HORIZONTAL_ALIGNMENT_LEFT, outline := 0, alpha := 1.0) -> void:
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
		var edge := layout.colour("outline")
		edge.a = alpha
		draw_string_outline(f, base, line, HORIZONTAL_ALIGNMENT_LEFT, -1, px, outline * 2, edge)
	var ink := layout.colour(colour)
	ink.a = alpha
	draw_string(f, base, line, HORIZONTAL_ALIGNMENT_LEFT, -1, px, ink)


func _width(line: String, face_name: String) -> float:
	var face := layout.face(face_name)
	var f: Font = _fonts.get(face["font"])
	if f == null:
		return 0.0
	return f.get_string_size(line, HORIZONTAL_ALIGNMENT_LEFT, -1, int(face["px"])).x


func _put(p: Dictionary, alpha := 1.0) -> void:
	var tex := _piece(p["file"])
	if tex != null:
		draw_texture(tex, p["at"], Color(1, 1, 1, alpha))


func _piece_size(file: String) -> Vector2:
	var tex := _piece(file)
	return Vector2.ZERO if tex == null else tex.get_size()


func _piece(file: String) -> Texture2D:
	return _texture(_paths["shop_pieces"].path_join(file))


func _texture(path: String) -> Texture2D:
	if not _textures.has(path):
		_textures[path] = _load(path)
	return _textures[path]


func _load(path: String) -> Resource:
	if not ResourceLoader.exists(path):
		push_error("shop window: missing %s" % path)
		return null
	return load(path)


static func _v(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
