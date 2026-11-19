extends Control
# A page for the shot tool (D201): the loot window with the draft's made-up chest and
# pack, over the game's grass laid the way the draft lays it, at 1x in the 1152 x 648
# window, so the picture can be laid over the draft's.
#
# scripts/godot.sh --path game res://client/screens/loot_shot.tscn --shot loot.png
# Another chest slot pointed at: -- --point n (-1 for none).

const HUD_SHOT := preload("res://client/screens/hud_shot.gd")
const ORIGIN := Vector2(150, 250) # tile 0, 0 on the screen, as in the draft's camp


static func _item(picture: String, material: String, name: String, count := -1, note: Array = []) -> Dictionary:
	var item := {"picture": picture, "material": material, "name": name, "note": note}
	if count >= 0:
		item["count"] = count
	return item


static func sample() -> Dictionary:
	var chest: Array = []
	chest.resize(12)
	chest[0] = _item("Coins", "Gold", "Coins", 23)
	chest[1] = _item("Long Sword Bronze", "Bronze", "Long Sword", -1, [["Material", "Bronze"], ["Held", "One hand"], ["Value", "40"]])
	chest[2] = _item("Leather Trousers", "Leather", "Leather Trousers", -1, [["Material", "Leather"], ["Worn", "Legs"], ["Value", "12"]])
	chest[3] = _item("Arrows", "Wood", "Arrows", 12)
	chest[4] = _item("Bandage", "Cloth", "Bandage", 2)
	chest[6] = _item("Helmet Iron", "Iron", "Helmet", -1, [["Material", "Iron"], ["Worn", "Head"], ["Value", "30"]])
	var pack: Array = []
	pack.resize(20)
	pack[0] = _item("Coins", "Gold", "Coins", 37)
	pack[1] = _item("Arrows", "Wood", "Arrows", 24)
	pack[2] = _item("Short Bow", "Wood", "Short Bow")
	pack[3] = _item("Leather Tunic", "Leather", "Leather Tunic")
	pack[4] = _item("Hood Green", "Cloth", "Hood")
	pack[5] = _item("Helmet Steel", "Steel", "Helmet")
	pack[6] = _item("Axe Bronze", "Bronze", "Axe")
	pack[12] = _item("Trousers Red", "Cloth", "Trousers")
	return {
		"chest": {"name": "Chest", "owner": "It belongs to no one", "slots": 12, "items": chest},
		"pack": {"slots": 20, "items": pack},
		"coins": 37,
		"pointed": 1,
	}


func _ready() -> void:
	var ground := TextureRect.new()
	ground.texture = ImageTexture.create_from_image(HUD_SHOT.grass_picture(ORIGIN))
	add_child(ground)
	var window := LootWindow.new()
	add_child(window)
	var state := sample()
	state["pointed"] = int(_arg("--point", "1"))
	window.show_state(state)


func _arg(flag: String, fallback: String) -> String:
	var args := OS.get_cmdline_user_args()
	var i := args.find(flag)
	return args[i + 1] if i != -1 and i + 1 < args.size() else fallback
