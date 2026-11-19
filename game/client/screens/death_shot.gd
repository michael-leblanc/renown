extends Control
# A page for the shot tool (D201): the death screen with the draft's made-up life,
# over the game's grass laid the way the draft lays it, at 1x in the 1152 x 648
# window, so the picture can be laid over the draft's.
#
# scripts/godot.sh --path game res://client/screens/death_shot.tscn --shot death.png
# Oldscar's landmark and an orc: add -- --town Oldscar. The deeds scrolled down n lines:
# -- --scroll n.

const HUD_SHOT := preload("res://client/screens/hud_shot.gd")
const ORIGIN := Vector2(684, 652) # tile 0, 0 on the screen, as in the draft's camp


static func sample(town: String) -> Dictionary:
	if town == "Oldscar":
		return {
			"town": "Oldscar",
			"name": "Ulgra",
			"heading": "Orc",
			"background": "Brawler",
			"rows": [["Woke in", "Oldscar"], ["Lived", "5 days"], ["Best skills", "Maces 38, Unarmed 33"], ["Coins at the end", "12"]],
			"deeds": ["Killed a human hunter in the green wood.", "Took an axe from a shop's shelf. Nobody saw.", "Bandaged a goblin at the cliff's foot.", "Killed two humans on the east road.", "Killed a human guard at the ford.", "Killed a human in iron on the east road.",
				"Bandaged an orc after the fight at the ford.", "Killed a human by the standing stone.", "Killed two human guards at the ford.", "Killed a human hunter on the east road."],
			"end": ["Killed by a human in an iron platebody,", "at the ford."],
			"remembers": [
				{"town": "Oldscar", "faction": "The Tally", "says": "They say you killed eight of the Hoarders, three of them guards at their own ford. They knew you as Ulgra."},
				{"town": "Dawndoor", "faction": "The Keeping", "says": "They speak of an orc with a mace who killed three guards at the ford. They never learned your name."},
			],
			"unseen": "The axe is in no tale: nobody saw it taken.",
		}
	return {
		"town": "Dawndoor",
		"name": "Aldric",
		"heading": "Human",
		"background": "Well-woken",
		"rows": [["Woke in", "Dawndoor"], ["Lived", "3 days"], ["Best skills", "Swords 41, Shield 36"], ["Coins at the end", "37"]],
		"deeds": ["Bandaged a hurt man outside the gate.", "Took bread from a baker's shelf. Nobody saw.", "Killed a goblin by the old well.", "Killed two orcs on the west road.", "Killed an orc at the ford.", "Bandaged a guard after the fight at the ford.",
			"Killed a goblin in the north wood.", "Killed an orc in iron on the west road.", "Bandaged a hunter in the north wood.", "Killed two goblins at the ford.", "Killed an orc by the standing stone.", "Killed a goblin on the west road."],
		"end": ["Killed by an orc in steel plate,", "on the west road."],
		"remembers": [
			{"town": "Dawndoor", "faction": "The Keeping", "says": "They say you killed five orcs and four goblins, and that you bandaged three of their own. They knew you as Aldric."},
			{"town": "Oldscar", "faction": "The Tally", "says": "They speak of a human with a round shield who killed nine of theirs. They never learned your name."},
		],
		"unseen": "The bread is in no tale: nobody saw it taken.",
	}


func _ready() -> void:
	var ground := TextureRect.new()
	ground.texture = ImageTexture.create_from_image(HUD_SHOT.grass_picture(ORIGIN))
	add_child(ground)
	var screen := DeathScreen.new()
	add_child(screen)
	screen.show_life(sample(_arg("--town", "Dawndoor")))
	screen.scroll_deeds(int(_arg("--scroll", "0")))


func _arg(flag: String, fallback: String) -> String:
	var args := OS.get_cmdline_user_args()
	var i := args.find(flag)
	return args[i + 1] if i != -1 and i + 1 < args.size() else fallback
