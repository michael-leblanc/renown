extends Control
# A page for the shot tool (D201): the character screen with the draft's made-up
# sheet, at 1x, where the draft puts it (30, 20 in a 680 x 800 picture), so the two
# pictures can be laid over each other.
#
# scripts/godot.sh --path game --resolution 680x800 res://client/screens/character_screen_shot.tscn --shot character-screen.png
# Another race: add -- --race orc (or goblin). Smaller or bigger: -- --scale 0.85.

const AT := Vector2(30, 20)
const BACKGROUND := Color(30 / 255.0, 32 / 255.0, 36 / 255.0)


static func sample(race: String) -> Dictionary:
	var outfit: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/looks.json"))["outfits"]["starting"]
	var parts: Array = []
	for slot: String in outfit:
		if outfit[slot] != null:
			parts.append({"slot": slot, "part": outfit[slot]["part"], "colour": outfit[slot]["colour"]})
	var pack: Array = []
	pack.resize(20)
	pack[0] = {"picture": "Coins", "material": "Gold", "count": 37}
	pack[1] = {"picture": "Arrows", "material": "Wood", "count": 24}
	pack[2] = {"picture": "Short Bow", "material": "Wood"}
	pack[3] = {"picture": "Leather Tunic", "material": "Leather"}
	pack[4] = {"picture": "Hood Green", "material": "Cloth"}
	pack[5] = {"picture": "Helmet Steel", "material": "Steel"}
	pack[6] = {"picture": "Axe Bronze", "material": "Bronze"}
	pack[12] = {"picture": "Trousers Red", "material": "Cloth"}
	return {
		"race": race,
		"parts": parts,
		"heading": race.capitalize(),
		"list": {"Background": "Well-woken", "Name": "Unknown", "Health": "32 / 44", "Run": "55%"},
		"stats": {"Strength": 14, "Agility": 11, "Endurance": 12, "Intellect": 9},
		"worn": {
			"Chest": {"picture": "Tunic Blue", "material": "Cloth"},
			"Legs": {"picture": "Trousers Undyed", "material": "Cloth"},
			"Feet": {"picture": "Shoes", "material": "Leather"},
			"Belt": {"picture": "Belt", "material": "Leather"},
			"Main hand": {"picture": "Long Sword Iron", "material": "Iron"},
			"Off hand": {"picture": "Round Shield", "material": "Wood"},
		},
		"pack": pack,
		"pack_slots": 20,
		"coins": 37,
		"bandages": 3,
	}


func _ready() -> void:
	var back := ColorRect.new()
	back.color = BACKGROUND
	back.size = Vector2(4000, 4000)
	add_child(back)
	var screen := CharacterScreen.new()
	add_child(screen)
	screen.position = AT
	screen.scale = Vector2.ONE * float(_arg("--scale", "1"))
	screen.show_sheet(sample(_arg("--race", "human")))


func _arg(flag: String, fallback: String) -> String:
	var args := OS.get_cmdline_user_args()
	var i := args.find(flag)
	return args[i + 1] if i != -1 and i + 1 < args.size() else fallback
