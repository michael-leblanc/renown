extends Control
# A page for the shot tool (D201): the Reputation screen with the draft's made-up
# towns and tales, over the game's grass laid the way the draft lays it, at 1x in the
# 1152 x 648 window, so the picture can be laid over the draft's.
#
# scripts/godot.sh --path game res://client/screens/reputation_shot.tscn --shot reputation.png
# A newborn's blank screen (D126): add -- --blank.

const HUD_SHOT := preload("res://client/screens/hud_shot.gd")
const ORIGIN := Vector2(576, 350) # tile 0, 0 on the screen, as in the draft's camp


static func sample() -> Dictionary:
	return {
		"towns": [
			{"town": "Dawndoor", "faction": "The Keeping", "told": "Told by a guard, 2 days ago", "rows": {"Standing": ["Welcome", 0.72], "Morality": ["Decent", 0.63], "Fame": ["Little known", 0.18]}},
			{"town": "Oldscar", "faction": "The Tally", "told": "Nobody there has told you. They are at war with your people."},
		],
		"tales": [
			{"tale": "You killed two orcs on the west road.", "town": "Dawndoor", "heard": "heard 2 days ago"},
			{"tale": "You bandaged a hurt man outside the gate.", "town": "Dawndoor", "heard": "heard 2 days ago"},
		],
	}


# What a newborn knows of itself: nothing yet (D126).
static func blank() -> Dictionary:
	return {
		"towns": [
			{"town": "Dawndoor", "faction": "The Keeping", "told": "Nobody here has told you anything yet."},
			{"town": "Oldscar", "faction": "The Tally", "told": "Nobody there has told you. They are at war with your people."},
		],
	}


func _ready() -> void:
	var ground := TextureRect.new()
	ground.texture = ImageTexture.create_from_image(HUD_SHOT.grass_picture(ORIGIN))
	add_child(ground)
	var screen := ReputationScreen.new()
	add_child(screen)
	screen.show_state(blank() if OS.get_cmdline_user_args().has("--blank") else sample())
