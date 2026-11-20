extends Control
# A page for the shot tool (D201): the body's loot window with the draft's made-up body
# and pack, over the game's grass laid the way the draft lays it, at 1x in the 1152 x 648
# window, so the picture can be laid over the draft's (scripts/art/ui/body_loot.mjs).
#
# scripts/godot.sh --path game res://client/screens/body_loot_shot.tscn --shot body.png
# Another body slot pointed at: -- --point n (0 to 8 worn, then carried; -1 for none).

const HUD_SHOT := preload("res://client/screens/hud_shot.gd")
const ORIGIN := Vector2(150, 250) # tile 0, 0 on the screen, as in the draft's camp


static func _item(picture: String, material: String, name: String, count := -1, note: Array = []) -> Dictionary:
	var item := {"picture": picture, "material": material, "name": name, "note": note}
	if count >= 0:
		item["count"] = count
	return item


static func sample() -> Dictionary:
	var worn: Array = []
	worn.resize(9)
	worn[0] = _item("Axe Iron", "Iron", "Axe")
	worn[1] = _item("Helmet Iron", "Iron", "Helmet")
	worn[2] = _item("Platebody Iron", "Iron", "Platebody", -1, [["Material", "Iron"], ["Worn on", "Chest"], ["Value", "120"]])
	worn[3] = _item("Gauntlets Iron", "Iron", "Gauntlets")
	worn[4] = _item("Backpack", "Leather", "Backpack")
	worn[5] = _item("Belt", "Leather", "Belt")
	worn[6] = _item("Leather Trousers", "Leather", "Leather Trousers")
	worn[7] = _item("Metal Boots Iron", "Iron", "Metal Boots")
	var carried: Array = []
	carried.resize(20)
	carried[0] = _item("Coins", "Gold", "Coins", 61)
	carried[1] = _item("Bandage", "Cloth", "Bandage", 3)
	carried[2] = _item("Mace Bronze", "Bronze", "Mace")
	carried[3] = _item("Hood Red", "Cloth", "Hood")
	carried[4] = _item("Spear Steel", "Steel", "Spear")
	carried[10] = _item("Arrows", "Wood", "Arrows", 9)
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
		"worn": worn,
		"carried": {"slots": 20, "items": carried},
		"pack": {"slots": 20, "items": pack},
		"coins": 37,
		"pointed": 2,
	}


func _ready() -> void:
	var ground := TextureRect.new()
	ground.texture = ImageTexture.create_from_image(HUD_SHOT.grass_picture(ORIGIN))
	add_child(ground)
	var window := BodyLoot.new()
	add_child(window)
	var state := sample()
	state["pointed"] = int(_arg("--point", "2"))
	window.show_state(state)


func _arg(flag: String, fallback: String) -> String:
	var args := OS.get_cmdline_user_args()
	var i := args.find(flag)
	return args[i + 1] if i != -1 and i + 1 < args.size() else fallback
