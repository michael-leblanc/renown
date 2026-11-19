extends Control
# A page for the shot tool (D201): the main menu with the draft's made-up Host values,
# its painting held at one moment, at 1x in the 1152 x 648 window, so the picture can
# be laid over the draft's (node scripts/art/ui/main_menu.mjs [--at 0.5]).
#
# scripts/godot.sh --path game res://client/screens/main_menu_shot.tscn --shot menu.png
# Another moment of the loop (0 to 1): add -- --at 0.5. No Host panel: add -- --plain.


static func sample() -> Dictionary:
	return {
		"panel": "host",
		"values": {"World": "Home", "Seed": "48213", "Players": "10", "Port": "7777"},
		"address": "192.168.1.20 : 7777",
	}


static func at_from(args: PackedStringArray) -> float:
	var i := args.find("--at")
	return float(args[i + 1]) if i >= 0 and i + 1 < args.size() else 0.0


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var menu := MainMenu.new()
	add_child(menu)
	var state := sample()
	if args.has("--plain"):
		state["panel"] = ""
	menu.show_state(state)
	menu.hold(at_from(args))
