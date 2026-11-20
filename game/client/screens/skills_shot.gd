extends Control
# A page for the shot tool (D201): the Skills screen with the tree page's "seasoned
# fighter", at 1x in the 1152 x 648 window, so the picture can be laid over the page's
# (scripts/art/ui/skills_tree.mjs --check draws the same views from the pieces).
# Take and Take route work: the page takes what the screen sends, as a server would.
#
# scripts/godot.sh --path game res://client/screens/skills_shot.tscn --shot skills.png
# Inside a web at 100%: -- --skill Swords. Another zoom: -- --zoom 0.5. Pick a node: -- --pick Swords/eQ.


static func sample() -> Dictionary:
	return {
		"levels": {"Swords": 78, "Shield": 64, "Dodge": 52, "Axes": 27, "Bows": 12, "Unarmed": 5},
		"taken": ["Swords/ek1", "Swords/ek2", "Swords/eK", "Swords/ex1", "Swords/eb1", "Swords/eb2", "Swords/eB", "Shield/ek1", "Shield/ek2", "Shield/eK"],
		"paid": {},
	}


func _ready() -> void:
	var screen := SkillsScreen.new()
	add_child(screen)
	screen.show_state(sample())
	screen.took.connect(func(ids: Array) -> void:
		var ch := screen.character
		for id: String in ids:
			ch = screen.layout.take(ch, id)
		screen.show_state(ch))
	var skill := _arg("--skill", "")
	if skill != "":
		screen.z = 1.0
		screen.cam = screen.layout.into(skill)
	var zoom := _arg("--zoom", "")
	if zoom != "":
		screen.zoom_to(float(zoom))
	var pick := _arg("--pick", "")
	if pick != "":
		screen.click(pick)
	screen.show_state(screen.character)


func _arg(flag: String, fallback: String) -> String:
	var args := OS.get_cmdline_user_args()
	var i := args.find(flag)
	return args[i + 1] if i != -1 and i + 1 < args.size() else fallback
