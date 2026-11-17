extends Node2D
# A page for the shot tool (D201): a human, an orc and a goblin each stepping in all
# 8 directions, drawn by the same layer the game uses. Held mid-step: the walk time
# below is long, so the shot catches every one sliding.
#
# scripts/godot.sh --path game res://client/character/character_shot.tscn --shot characters.png

const WALK_TIME := 30.0
const RACES := ["human", "orc", "goblin"]
const STEPS := [[1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]]

var layer := CharacterLayer.new()


func _ready() -> void:
	var look := CharacterLook.load_files("res://data/client.json", "res://data/looks.json")
	layer.setup(look)
	add_child(layer)
	var outfit: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/looks.json"))["outfits"]["starting"]
	var worn: Array = []
	for slot: String in outfit:
		if outfit[slot] != null:
			worn.append({"slot": slot, "part": outfit[slot]["part"], "colour": outfit[slot]["colour"]})
	var seen: Array = []
	for r in RACES.size():
		for d in 8:
			var total := 6 + 6 * r
			var diff := 2 * d - 6
			var tile := [(total + diff) >> 1, (total - diff) >> 1]
			var to := [tile[0] + STEPS[d][0], tile[1] + STEPS[d][1]]
			seen.append(NetMessages.seen_character(r * 8 + d + 1, tile, to, RACES[r], worn))
	var state := ClientState.new()
	state.apply_welcome(NetMessages.welcome(1, 10, WALK_TIME, 1, 1, [0], [0], []))
	state.apply_view(NetMessages.view(1, seen, []))
	layer.sync(state)
	layer.position = get_viewport_rect().size / 2.0 - Vector2(64, 384)
