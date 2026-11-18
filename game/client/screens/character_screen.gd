class_name CharacterScreen
extends Control
# The character screen (D239 to D241): the character on a lit stage, what it wears
# in a row on a strap, its pack as a satchel, its stats down the right. Drawn from
# the pieces and character_screen.json that scripts/art/ui/character_screen.mjs
# writes, in the json's own pixels and in its order; text in Alegreya.
#
# It shows one sheet, a plain dictionary (what the client knows of its own
# character, D125, D126; what the server sends for it is not settled, D176):
#   race      "human": the looks.json race the body is drawn as (D121)
#   parts     what it wears, as in a view: [{slot, part, colour}] (net/messages.gd)
#   heading   the line at the top, e.g. "Human"
#   list      {"Background": .., "Name": .., "Health": .., "Run": ..}: the json's labels
#   stats     {"Strength": 14, ..}
#   worn      {"Main hand": item, ..}, by the json's gear slot names
#   pack      [item or null, ..], one per pack slot, left to right then down
#   pack_slots how many slots the pack has (12, 20 with a backpack, D124)
#   coins     the coins it carries (D123)
#   bandages  how many bandages (D169)
# An item is {picture: pack picture name, material: a slot material, count: a stack's
# size, only for stacks}.

const SETTINGS := "res://data/client.json"

var layout: CharacterScreenLayout = null
var sheet: Dictionary = {}

var _paths: Dictionary = {}
var _look: CharacterLook = null
var _textures := {} # path -> Texture2D
var _fonts := {} # name -> Font
var _back := Control.new() # everything before "character" in the json's order
var _stand := Node2D.new() # the character, at its feet
var _front := Control.new() # everything after
var _view: CharacterView = null


func _ready() -> void:
	if layout == null:
		setup_files(SETTINGS)


# Reads the layout, the art folders and the character's drawing tables.
func setup_files(settings_path: String) -> void:
	var settings: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	if not settings is Dictionary or not settings.get("screens") is Dictionary:
		push_error("character screen: %s has no screens group" % settings_path)
		return
	_paths = settings["screens"]
	setup(CharacterScreenLayout.load_file(_paths["character_layout"]), CharacterLook.load_files(settings_path, "res://data/looks.json"))


func setup(screen_layout: CharacterScreenLayout, look: CharacterLook) -> void:
	layout = screen_layout
	_look = look
	if layout == null:
		return
	custom_minimum_size = layout.size()
	size = layout.size()
	for part: Control in [_back, _front]:
		if part.get_parent() == null:
			part.mouse_filter = Control.MOUSE_FILTER_IGNORE
			part.size = layout.size()
			add_child(part)
	if _stand.get_parent() == null:
		add_child(_stand)
		move_child(_stand, 1)
		_stand.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST # hard pixels (the json)
	if not _back.draw.is_connected(_draw_back):
		_back.draw.connect(_draw_back)
		_front.draw.connect(_draw_front)
	for name: String in layout.font_names():
		_fonts[name] = _load(_paths["fonts"].path_join(name + ".woff"))


# Shows a sheet (see the top of this file).
func show_sheet(new_sheet: Dictionary) -> void:
	sheet = new_sheet
	_show_character()
	_back.queue_redraw()
	_front.queue_redraw()


func character_view() -> CharacterView:
	return _view


# How full the pack is: "used / slots".
func pack_text() -> String:
	var used := 0
	for item: Variant in sheet.get("pack", []):
		if item is Dictionary:
			used += 1
	return "%d / %d" % [used, int(sheet.get("pack_slots", layout.pack_size()))]


# The item a slot holds, or null when it is empty.
func item_in(slot: Dictionary) -> Variant:
	if slot["bandage"]:
		var n := int(sheet.get("bandages", 0))
		return {"picture": "Bandage", "material": "Cloth", "count": n} if n > 0 else null
	if slot["gear"] != "":
		return sheet.get("worn", {}).get(slot["gear"])
	var pack: Array = sheet.get("pack", [])
	return pack[slot["pack"]] if slot["pack"] < pack.size() else null


# The slot picture a slot shows: its item's material, or Empty.
func slot_file(slot: Dictionary) -> String:
	var item: Variant = item_in(slot)
	if item == null:
		return layout.slot_file(slot["kind"], "Empty")
	if not layout.has_material(item["material"]):
		push_error("character screen: no slot picture for the material %s" % item["material"])
		return layout.slot_file(slot["kind"], "Empty")
	return layout.slot_file(slot["kind"], item["material"])


func _show_character() -> void:
	if _view != null:
		_stand.remove_child(_view)
		_view.queue_free()
		_view = null
	if sheet.get("race", "") == "" or _look == null:
		return
	_view = CharacterView.new()
	_stand.add_child(_view)
	_view.setup(_look, 1.0)
	_view.show_entry(NetMessages.seen_character(0, [0, 0], [], sheet["race"], sheet.get("parts", [])))
	var shadow := _view.sprite_for("shadow")
	if shadow != null:
		shadow.visible = false # the stage is lit from behind; the draft has none
	_stand.scale = Vector2.ONE * layout.character_scale() / _look.number("sprite_scale")
	# The json puts the bottom middle of what is drawn at its feet, measured on the
	# first frame so the character doesn't shift as it breathes.
	var drawn := drawn_rect()
	var bottom_middle := Vector2(drawn.get_center().x, drawn.end.y)
	_stand.position = layout.character_feet() - bottom_middle * _stand.scale


# What the character's first frame covers, shadow left out, in the character's own
# pixels at its race's size (before the screen's scale).
func drawn_rect() -> Rect2:
	var out := Rect2()
	var first := true
	for sprite: Sprite2D in _view.stack.get_children():
		if not sprite.visible or sprite.texture == null:
			continue
		var cell := Vector2i(sprite.texture.get_width() / sprite.hframes, sprite.texture.get_height() / sprite.vframes)
		var at := Vector2i(sprite.frame % sprite.hframes, sprite.frame / sprite.hframes) * cell
		var used := sprite.texture.get_image().get_region(Rect2i(at, cell)).get_used_rect()
		if used.size == Vector2i.ZERO:
			continue
		var r := Rect2(Vector2(used.position) + sprite.position, Vector2(used.size))
		out = r if first else out.merge(r)
		first = false
	return Rect2(out.position * _view.stack.scale, out.size * _view.stack.scale)


func _draw_back() -> void:
	_draw_layers(_back, layout.order().slice(0, layout.order().find("character")))


func _draw_front() -> void:
	_draw_layers(_front, layout.order().slice(layout.order().find("character") + 1))


func _draw_layers(on: CanvasItem, layers: Array) -> void:
	if layout == null:
		return
	for layer: String in layers:
		if layout.is_piece(layer):
			_put(on, layout.piece_file(layer), layout.piece_at(layer))
		elif layer == "medallions":
			for m: Dictionary in layout.medallions():
				_put(on, m["file"], m["at"])
		elif layer == "slots":
			for slot: Dictionary in layout.slots():
				_put(on, slot_file(slot), slot["at"])
		elif layer == "pictures":
			_draw_pictures(on)
		elif layer == "text":
			_draw_text(on)
		else:
			push_error("character screen: unknown layer %s" % layer)


# Each item's picture in the middle of its slot, a stack's count over it, an empty
# worn slot's name.
func _draw_pictures(on: CanvasItem) -> void:
	var count: Dictionary = layout.text("count")
	var slot_name: Dictionary = layout.text("slot_name")
	for slot: Dictionary in layout.slots():
		var item: Variant = item_in(slot)
		if item != null:
			var tex := _texture(_paths["item_pictures"].path_join(item["picture"] + ".png"))
			if tex != null:
				on.draw_texture_rect_region(tex, layout.picture_rect(slot), layout.picture_from())
			if item.has("count"):
				var corner: Vector2 = slot["at"] + slot["size"] + _v(count["from_bottom_right"])
				_say(on, str(item["count"]), count, corner, "count", HORIZONTAL_ALIGNMENT_LEFT, int(count["outline"]))
		elif slot["name"] != "":
			var w := _width(slot["name"], slot_name)
			var top: Vector2 = slot["at"] + Vector2((slot["size"].x - w) / 2.0, slot["size"].y / 2.0 - float(slot_name["above_middle"]))
			_say(on, slot["name"], slot_name, top, "slot_name")


func _draw_text(on: CanvasItem) -> void:
	var race: Dictionary = layout.text("race")
	_say(on, str(sheet.get("heading", "")), race, _v(race["at"]), race["colour"])
	var list: Dictionary = layout.text("list")
	var values: Dictionary = sheet.get("list", {})
	var labels: Array = list["labels"]
	for i in labels.size():
		var down := Vector2(0, i * float(list["step"]))
		_say(on, labels[i], list, _v(list["label_at"]) + down, "label")
		_say(on, str(values.get(labels[i], "")), list, _v(list["value_at"]) + down, "value")
	var stats: Dictionary = sheet.get("stats", {})
	for s: Dictionary in layout.text("stats"):
		_say(on, s["stat"], s["label"], _v(s["label"]["right"]), "label", HORIZONTAL_ALIGNMENT_RIGHT)
		_say(on, str(stats.get(s["stat"], "")), s["value"], _v(s["value"]["right"]), "value", HORIZONTAL_ALIGNMENT_RIGHT)
	var pack: Dictionary = layout.text("pack")
	var at := _v(pack["label_at"])
	_say(on, "Pack", pack, at, "label")
	_say(on, pack_text(), pack, at + Vector2(_width("Pack", pack) + float(pack["gap"]), 0), "value")
	var coins := str(sheet.get("coins", 0))
	var right := _v(pack["coins_right"])
	_say(on, coins, pack, right, "value", HORIZONTAL_ALIGNMENT_RIGHT)
	_say(on, "Coins", pack, right - Vector2(_width(coins, pack) + float(pack["gap"]), 0), "label", HORIZONTAL_ALIGNMENT_RIGHT)


# A line of text. `at` is its top left, or its top right when aligned right; the top
# is the font's ascent line (the json's note). The baseline is kept on a whole pixel.
func _say(on: CanvasItem, line: String, spec: Dictionary, at: Vector2, colour: String, align := HORIZONTAL_ALIGNMENT_LEFT, outline := 0) -> void:
	var f: Font = _fonts.get(spec["font"])
	if f == null:
		return
	var px := int(spec["px"])
	var x := at.x - (_width(line, spec) if align == HORIZONTAL_ALIGNMENT_RIGHT else 0.0)
	var base := Vector2(x, roundf(at.y + f.get_ascent(px)))
	if outline > 0:
		on.draw_string_outline(f, base, line, HORIZONTAL_ALIGNMENT_LEFT, -1, px, outline, layout.colour("count_outline"))
	on.draw_string(f, base, line, HORIZONTAL_ALIGNMENT_LEFT, -1, px, layout.colour(colour))


func _width(line: String, spec: Dictionary) -> float:
	var f: Font = _fonts.get(spec["font"])
	if f == null:
		return 0.0
	return f.get_string_size(line, HORIZONTAL_ALIGNMENT_LEFT, -1, int(spec["px"])).x


func _put(on: CanvasItem, file: String, at: Vector2) -> void:
	var tex := _texture(_paths["pieces"].path_join(file))
	if tex != null:
		on.draw_texture(tex, at)


func _texture(path: String) -> Texture2D:
	if not _textures.has(path):
		_textures[path] = _load(path)
	return _textures[path]


func _load(path: String) -> Resource:
	if not ResourceLoader.exists(path):
		push_error("character screen: missing %s" % path)
		return null
	return load(path)


static func _v(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
