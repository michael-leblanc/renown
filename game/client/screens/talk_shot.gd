extends Control
# A page for the shot tool (D201): the talk window with the draft's made-up line, over
# the game's grass laid the way the draft lays it, at 1x in the 1152 x 648 window, so
# the picture can be laid over the draft's (scripts/art/ui/talk_window.mjs).
#
# scripts/godot.sh --path game res://client/screens/talk_shot.tscn --shot talk.png
# Another draft: -- --state npc|you|options|people. The heads are the game's to draw
# (not wired yet): the discs stay empty here.

const HUD_SHOT := preload("res://client/screens/hud_shot.gd")
const ORIGIN := Vector2(150, 250) # tile 0, 0 on the screen, as in the draft's camp


static func sample(state: String) -> Dictionary:
	match state:
		"you":
			return {"line": {"mine": true, "says": "I helped. Ask them yourself."}}
		"options":
			return {"options": ["What do people say about me?", "Tell me more about this person...", "I'd like to trade.", "Any work for me?", "Farewell."], "lit": 1}
		"people":
			return {"people": [
				{"label": "Yourself", "kind": ""},
				{"label": "Brannoc", "kind": "by name"},
				{"label": "The orc in plate you saw at the gate", "kind": "seen"},
				{"label": "Whoever killed the shopkeeper", "kind": "heard of"},
				{"label": "Back", "kind": ""},
			], "lit": 2}
	return {"line": {"name": "Hesk", "seen": "", "says": "Folk talk, newcomer. Some say you helped the guards at the gate. Others say you only watched."}}


func _ready() -> void:
	var ground := TextureRect.new()
	ground.texture = ImageTexture.create_from_image(HUD_SHOT.grass_picture(ORIGIN))
	add_child(ground)
	var window := TalkWindow.new()
	add_child(window)
	window.show_state(sample(_arg("--state", "npc")))


func _arg(flag: String, fallback: String) -> String:
	var args := OS.get_cmdline_user_args()
	var i := args.find(flag)
	return args[i + 1] if i != -1 and i + 1 < args.size() else fallback
