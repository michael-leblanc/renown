extends Control
# A page for the shot tool (D201): the HUD with the draft's made-up state, over the
# game's grass laid the way the draft lays it, at 1x in the 1152 x 648 window, so the
# picture can be laid over the draft's.
#
# scripts/godot.sh --path game res://client/screens/hud_shot.tscn --shot hud.png
# Oldscar's landmark and an orc: add -- --town Oldscar.

const GRASS := "res://client/art/tiles/Ground A2_S.png"
const BACKGROUND := Color(30 / 255.0, 32 / 255.0, 36 / 255.0)
const ORIGIN := Vector2(576, 350) # tile 0, 0 on the screen, as in the draft's camp
const TILE_HALF := Vector2(64, 32)
const SPRITE_FOOT := Vector2(128, 208) # where a 256 x 256 tile sprite's middle is


static func sample(town: String) -> Dictionary:
	var orc := town == "Oldscar"
	return {
		"town": town,
		"heading": "Orc" if orc else "Human",
		"background": "Brawler" if orc else "Well-woken",
		"health": [32, 44],
		"run": 0.55,
		"running": true,
		"protected": 161,
		"main_hand": {"picture": "Long Sword Iron", "material": "Iron"},
		"off_hand": {"picture": "Round Shield", "material": "Wood"},
		"bandages": 3,
		"bandaging": 0.6,
		"pack": [13, 20],
		"coins": 37,
		"target": {"name": "Guard", "detail": "Human · name not known"},
		"risen": {"skill": "Swords", "value": 41},
		"speech": [["Guard", "Keep moving, stranger."], ["You", "What do people say here?"], ["Townswoman", "Some say the stones were here first."]],
	}


func _ready() -> void:
	var ground := TextureRect.new()
	ground.texture = ImageTexture.create_from_image(grass_picture())
	add_child(ground)
	var hud := Hud.new()
	add_child(hud)
	hud.show_state(sample(_arg("--town", "Dawndoor")))


# The grass, put together in one picture, tile 0, 0 at `origin`: drawn tile by tile, a
# virtual display's software renderer showed only white.
static func grass_picture(origin := ORIGIN) -> Image:
	var out := Image.create_empty(1152, 648, false, Image.FORMAT_RGBA8)
	out.fill(BACKGROUND)
	var grass := Image.load_from_file(ProjectSettings.globalize_path(GRASS))
	grass.convert(Image.FORMAT_RGBA8)
	for j in range(-14, 16):
		for i in range(-14, 16):
			var at := origin + Vector2(i - j, i + j) * TILE_HALF
			if at.x > -200 and at.x < 1352 and at.y > -100 and at.y < 908:
				out.blend_rect(grass, Rect2i(Vector2i.ZERO, grass.get_size()), Vector2i(at - SPRITE_FOOT))
	return out


func _arg(flag: String, fallback: String) -> String:
	var args := OS.get_cmdline_user_args()
	var i := args.find(flag)
	return args[i + 1] if i != -1 and i + 1 < args.size() else fallback
