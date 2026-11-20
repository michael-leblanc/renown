extends Node2D
# A page for the shot tool (D201, D241): the screens' small text in Alegreya at 10
# and 12 px, with the font drawn several ways, over the character screen's own
# slate. Each row is one way to draw it; the first is how the game imports it.
#
# scripts/godot.sh --path game res://client/screens/font_check.tscn --shot font-check.png

const FONTS := "res://client/art/fonts/"
const SLATE := Color("#1f2a2b")
const SLOT := Color("#101010")
const LABEL := Color("#c4a062")
const VALUE := Color("#f2ead6")
const SLOT_NAME := Color("#6e685e")
const ROW := 46

# name, hinting, subpixel positioning; each on top of gray antialiasing.
const WAYS := [
	["as imported (light, auto)", -1, -1],
	["no hinting, auto", TextServer.HINTING_NONE, TextServer.SUBPIXEL_POSITIONING_AUTO],
	["light, whole pixels", TextServer.HINTING_LIGHT, TextServer.SUBPIXEL_POSITIONING_DISABLED],
	["normal hinting, whole pixels", TextServer.HINTING_NORMAL, TextServer.SUBPIXEL_POSITIONING_DISABLED],
	["light, quarter pixels", TextServer.HINTING_LIGHT, TextServer.SUBPIXEL_POSITIONING_ONE_QUARTER],
]

var _fonts: Array = [] # per way: [Alegreya-Bold, AlegreyaSC-Bold]


func _ready() -> void:
	for way: Array in WAYS:
		_fonts.append([_font("Alegreya-Bold", way), _font("AlegreyaSC-Bold", way)])
	queue_redraw()


func _font(file: String, way: Array) -> Font:
	var imported: FontFile = load(FONTS + file + ".woff")
	if way[1] == -1:
		return imported
	var f := FontFile.new()
	f.data = FileAccess.get_file_as_bytes(FONTS + file + ".woff")
	f.antialiasing = TextServer.FONT_ANTIALIASING_GRAY
	f.hinting = way[1]
	f.subpixel_positioning = way[2]
	return f


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, get_viewport_rect().size), SLATE)
	var plain := ThemeDB.fallback_font
	for i in WAYS.size():
		var y := 20 + i * ROW
		draw_string(plain, Vector2(12, y + 12), WAYS[i][0], HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(0.6, 0.6, 0.6))
		var bold: Font = _fonts[i][0]
		var sc: Font = _fonts[i][1]
		var x := 210.0
		for px: int in [10, 12]:
			x = _pair(bold, px, x, y, "Background", "Well-woken")
			x = _pair(bold, px, x, y, "Health", "32 / 44")
			x += 8
		draw_rect(Rect2(x, y - 2, 52, 30), SLOT)
		draw_string(bold, Vector2(x + 6, y + 6 + bold.get_ascent(10)), "Main hand", HORIZONTAL_ALIGNMENT_LEFT, -1, 10, SLOT_NAME)
		draw_string_outline(bold, Vector2(x + 30, y + 14 + bold.get_ascent(12)), "37", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, 2, Color("#050505"))
		draw_string(bold, Vector2(x + 30, y + 14 + bold.get_ascent(12)), "37", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("#f0e8d7"))
		x += 64
		draw_string(sc, Vector2(x, y + sc.get_ascent(16)), "Pack", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, LABEL)
		draw_string(sc, Vector2(x + 44, y + sc.get_ascent(16)), "13 / 20", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, VALUE)


# A label and its value on one line at the top y; returns where the next pair starts.
func _pair(f: Font, px: int, x: float, y: float, label: String, value: String) -> float:
	var top := y + f.get_ascent(px)
	draw_string(f, Vector2(x, top), label, HORIZONTAL_ALIGNMENT_LEFT, -1, px, LABEL)
	x += f.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, px).x + 5
	draw_string(f, Vector2(x, top), value, HORIZONTAL_ALIGNMENT_LEFT, -1, px, VALUE)
	return x + f.get_string_size(value, HORIZONTAL_ALIGNMENT_LEFT, -1, px).x + 14
