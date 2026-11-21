extends Control
# A page for the shot tool (D201): the shop window with the draft's made-up shop and
# pack, over the game's grass laid the way the draft lays it, at 1x in the 1152 x 648
# window, so the picture can be laid over the draft's (scripts/art/ui/shop_window.mjs).
# The flash and the coins are held at their first instant, and the draft's menu is open.
#
# scripts/godot.sh --path game res://client/screens/shop_shot.tscn --shot shop.png
# Another shop slot pointed at: -- --point n (-1 for none). No menu: -- --menu -1.

const HUD_SHOT := preload("res://client/screens/hud_shot.gd")
const ORIGIN := Vector2(150, 250) # tile 0, 0 on the screen, as in the draft's camp
const LOOKS := "res://data/looks.json"
const KEEPER_COLOURS := {"chest": "#8a4a3a", "head": "#3a2a1a", "legs": "#6a5a3a"} # the camp's man in red

# Made up: [picture, material, price, how many the shop has left].
const STOCK := {
	0: ["Long Sword Iron", "Iron", 110, 3], 1: ["Long Sword Steel", "Steel", 140, 1], 2: ["Axe Iron", "Iron", 60, 3],
	3: ["Mace Iron", "Iron", 55, 2], 4: ["Spear Iron", "Iron", 50, 0], 5: ["Short Bow", "Wood", 40, 2],
	6: ["Helmet Steel", "Steel", 90, 0], 7: ["Platebody Iron", "Iron", 120, 1], 8: ["Gauntlets Iron", "Iron", 40, 2],
	9: ["Metal Boots Iron", "Iron", 45, 1], 10: ["Round Shield", "Wood", 30, 4], 11: ["Plank Shield", "Wood", 25, 0],
	12: ["Leather Tunic", "Leather", 35, 2], 13: ["Leather Trousers", "Leather", 30, 2], 14: ["Shoes", "Leather", 12, 5],
	15: ["Hood Blue", "Cloth", 12, 3], 16: ["Tunic Green", "Cloth", 14, 3], 17: ["Trousers Undyed", "Cloth", 10, 4],
	18: ["Backpack", "Leather", 25, 1], 19: ["Belt", "Leather", 8, 6], 20: ["Arrows", "Wood", 1, 250],
	21: ["Quiver", "Leather", 15, 2], 22: ["Bandage", "Cloth", 4, 40],
}
const WORN := {"Sword": "Hand", "Axe": "Hand", "Mace": "Hand", "Spear": "Hand", "Bow": "Hands", "Helmet": "Head", "Hood": "Head",
	"Platebody": "Chest", "Gauntlets": "Hands", "Boots": "Feet", "Shield": "Off hand", "Tunic": "Chest", "Trousers": "Legs",
	"Shoes": "Feet", "Backpack": "Back", "Belt": "Belt", "Quiver": "Back"}


static func _name(picture: String) -> String:
	var words := picture.split(" ")
	if words.size() > 1 and ["Iron", "Steel", "Bronze", "Blue", "Green", "Red", "Undyed"].has(words[-1]):
		words.remove_at(words.size() - 1)
	return " ".join(words)


static func _worn(picture: String) -> String:
	for word: String in picture.split(" "):
		if WORN.has(word):
			return WORN[word]
	return "-"


static func _item(picture: String, material: String, price := -1, left := -1, count := -1) -> Dictionary:
	var item := {"picture": picture, "material": material, "name": _name(picture), "worn": _worn(picture)}
	if price >= 0:
		item["price"] = price
	if left >= 0:
		item["left"] = left
	if count >= 0:
		item["count"] = count
	return item


static func sample() -> Dictionary:
	var stock: Array = []
	stock.resize(30)
	for i: int in STOCK:
		var s: Array = STOCK[i]
		stock[i] = _item(s[0], s[1], s[2], s[3])
	var pack: Array = []
	pack.resize(20)
	pack[0] = _item("Coins", "Gold", -1, -1, 72)
	pack[1] = _item("Arrows", "Wood", -1, -1, 24)
	pack[2] = _item("Short Bow", "Wood", 20)
	pack[3] = _item("Leather Tunic", "Leather", 17)
	pack[4] = _item("Hood Green", "Cloth", 6)
	pack[5] = _item("Helmet Iron", "Iron", 15)
	pack[6] = _item("Axe Bronze", "Bronze", 20)
	pack[7] = _item("Helmet Steel", "Steel", 45)
	pack[12] = _item("Trousers Red", "Cloth", 5)
	var look := CharacterLook.load_files("res://data/client.json", LOOKS)
	var layout := ShopLayout.load_file(JSON.parse_string(FileAccess.get_file_as_string("res://data/client.json"))["screens"]["shop_layout"])
	return {
		"face": ImageTexture.create_from_image(ShopWindow.cut_face(keeper_figure(look), layout.face_spec())),
		"says": "\"Good iron, fair prices. Mostly fair.\"",
		"shop_coins": 502,
		"shop": {"slots": 30, "items": stock},
		"pack": {"slots": 20, "items": pack},
		"coins": 72,
		"pointed": 7,
		"fresh": 7,
		"pop": "-90",
	}


# The keeper drawn the Creator's way (D121): the human facing S, standing, each part
# tinted by the colour it is given, laid one over the next in the character's own pixels.
static func keeper_figure(look: CharacterLook = null) -> Image:
	if look == null:
		look = CharacterLook.load_files("res://data/client.json", LOOKS)
	var outfit: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(LOOKS))["outfits"]["starting"]
	var parts: Array = []
	for slot: String in ["head", "chest", "legs", "shoes", "hands", "belt"]:
		var colour: String = KEEPER_COLOURS.get(slot, outfit[slot]["colour"])
		parts.append({"slot": slot, "part": outfit[slot]["part"], "colour": colour})
	var view := CharacterView.new()
	view.setup(look, 1.0)
	view.show_entry(NetMessages.seen_character(0, [0, 0], [], "human", parts))
	var figure: Image = null
	for sprite: Sprite2D in view.stack.get_children():
		if sprite.name == "shadow" or sprite.texture == null:
			continue
		var cell := Vector2i(sprite.texture.get_width() / sprite.hframes, sprite.texture.get_height() / sprite.vframes)
		var at := Vector2i(sprite.frame % sprite.hframes, sprite.frame / sprite.hframes) * cell
		var image := sprite.texture.get_image()
		if image.is_compressed():
			image.decompress()
		image.convert(Image.FORMAT_RGBA8)
		var piece := image.get_region(Rect2i(at, cell))
		for y in cell.y:
			for x in cell.x:
				var p := piece.get_pixel(x, y)
				if p.a > 0.0:
					piece.set_pixel(x, y, Color(p.r * sprite.modulate.r, p.g * sprite.modulate.g, p.b * sprite.modulate.b, p.a))
		if figure == null:
			figure = Image.create_empty(cell.x, cell.y, false, Image.FORMAT_RGBA8)
		figure.blend_rect(piece, Rect2i(Vector2i.ZERO, cell), Vector2i.ZERO)
	view.free()
	return figure


func _ready() -> void:
	var ground := TextureRect.new()
	ground.texture = ImageTexture.create_from_image(HUD_SHOT.grass_picture(ORIGIN))
	add_child(ground)
	var window := ShopWindow.new()
	window.animate = false
	add_child(window)
	var state := sample()
	state["pointed"] = int(_arg("--point", "7"))
	window.show_state(state)
	var menu := int(_arg("--menu", "7"))
	if menu >= 0:
		window.open_menu("shop", menu)
		window.menu_lit = 2


func _arg(flag: String, fallback: String) -> String:
	var args := OS.get_cmdline_user_args()
	var i := args.find(flag)
	return args[i + 1] if i != -1 and i + 1 < args.size() else fallback
