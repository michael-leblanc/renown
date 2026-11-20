extends Control
# A page for the shot tool (D201): the main menu with the drafts' made-up values, its
# painting held at one moment, at 1x in the 1152 x 648 window, so the picture can be laid
# over the draft's (node scripts/art/ui/main_menu.mjs [--panel host|join|settings] [--at 0.5]).
#
# scripts/godot.sh --path game res://client/screens/main_menu_shot.tscn --shot menu.png
# Another moment of the loop (0 to 1): add -- --at 0.5. Another panel: -- --panel join
# (or settings). No panel: -- --plain (or --panel none).


static func sample() -> Dictionary:
	return {
		"panel": "host",
		"values": {"World": "Home", "Seed": "48213", "Players": "10", "Port": "7777"},
		"address": "192.168.1.20 : 7777",
		"join": {"Address": "192.168.1.20", "Port": "7777"},
		"last": "192.168.1.20 : 7777",
		"settings": {"Master": 0.8, "Music": 0.6, "Effects": 0.7, "Window": "Windowed", "Motion": "Full"},
	}


static func at_from(args: PackedStringArray) -> float:
	var i := args.find("--at")
	return float(args[i + 1]) if i >= 0 and i + 1 < args.size() else 0.0


static func panel_from(args: PackedStringArray) -> String:
	if args.has("--plain"):
		return ""
	var i := args.find("--panel")
	var p := args[i + 1] if i >= 0 and i + 1 < args.size() else "host"
	return "" if p == "none" else p


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var menu := MainMenu.new()
	add_child(menu)
	var state := sample()
	state["panel"] = panel_from(args)
	menu.show_state(state)
	menu.hold(at_from(args))
