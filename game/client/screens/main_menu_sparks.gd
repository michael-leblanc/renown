class_name MainMenuSparks
extends Control
# The stars and the dust over the main menu's painting (D250), added to it (blend: add):
# stars blink where no cloud is in the way, dust drifts up through the light of the
# doorway. A port of the stars and motes of doorFrames in scripts/art/ui/scenes.mjs
# (change one, change the other); the json's "sparks" note says how each is drawn.

var t := 0.0

var _stars: Array = []
var _dust: Array = []
var _door: Dictionary = {}
var _drift := 96.0
var _grid := PackedFloat32Array() # the noise grid, 512 x 512
var _light: PackedByteArray = PackedByteArray() # the Light piece, RGBA8
var _light_w := 0
var _light_h := 0


func setup(layout: MenuLayout, noise: Image, light: Image) -> void:
	_stars = layout.stars()
	_dust = layout.dust()
	_door = layout.door()
	_drift = layout.drift()
	var n := noise.duplicate() as Image
	n.convert(Image.FORMAT_RGBA8)
	var bytes := n.get_data()
	_grid.resize(512 * 512)
	for k in 512 * 512:
		_grid[k] = (bytes[k * 4] * 256 + bytes[k * 4 + 1]) / 65535.0
	var l := light.duplicate() as Image
	l.convert(Image.FORMAT_RGBA8)
	_light = l.get_data()
	_light_w = l.get_width()
	_light_h = l.get_height()
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var mat := CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	material = mat


func set_time(at: float) -> void:
	t = at
	queue_redraw()


# kit.mjs's vnoise.
func vnoise(x: float, y: float) -> float:
	var x0 := floori(x)
	var y0 := floori(y)
	var fx := x - x0
	var fy := y - y0
	fx = fx * fx * (3.0 - 2.0 * fx)
	fy = fy * fy * (3.0 - 2.0 * fy)
	var xa := x0 & 511
	var xb := (x0 + 1) & 511
	var ya := (y0 & 511) << 9
	var yb := ((y0 + 1) & 511) << 9
	return (_grid[ya + xa] * (1.0 - fx) + _grid[ya + xb] * fx) * (1.0 - fy) + (_grid[yb + xa] * (1.0 - fx) + _grid[yb + xb] * fx) * fy


func cloud(x: float, y: float, at: float) -> float:
	return _loop(_fbm(x + _drift * at, y), _fbm(x + _drift * (at - 1.0), y), at)


# Whether (x, y) is inside the doorway's opening, seen from its middle at eye height
# (scenes.mjs reach: Q under 1).
func in_opening(x: float, y: float) -> bool:
	var sx := float(_door["sx"])
	var hy := float(_door["hy"])
	var half := float(_door["half"])
	var spring := float(_door["spring"])
	var dx := x - sx
	var dy := y - hy
	var d := sqrt(dx * dx + dy * dy)
	if d < 1e-6:
		return true
	var ux := dx / d
	var uy := dy / d
	var ax := absf(ux)
	var reach := 1.0
	if uy > 0.0:
		var tb := (float(_door["base"]) - hy) / uy
		reach = tb if ax * tb <= half else half / ax
	else:
		var ts := half / ax if ax > 1e-9 else 1e9
		if hy + uy * ts >= spring:
			reach = ts
		else:
			var uc := (spring - hy) * uy
			reach = uc + sqrt(maxf(0.0, uc * uc - ((hy - spring) * (hy - spring) - half * half)))
	return d / reach < 1.0


func _draw() -> void:
	for s: Array in _stars:
		var a := float(s[4]) * (0.55 + 0.45 * sin(TAU * (float(s[5]) * t + float(s[6])))) * (1.0 - _smooth(0.5, 0.66, cloud(float(s[2]), float(s[3]), t)))
		var at := Vector2(s[0], s[1])
		_dot(at, _rgb(a, a * 0.98, a * 0.93))
		var side := _rgb(a * 0.28, a * 0.27, a * 0.26)
		for o: Vector2 in [Vector2.LEFT, Vector2.RIGHT, Vector2.UP, Vector2.DOWN]:
			_dot(at + o, side)
	for m: Array in _dust:
		var ph := fmod(float(m[2]) * t + float(m[3]), 1.0)
		var mx := float(m[0]) + 9.0 * sin(TAU * (ph + float(m[4])))
		var my := float(m[1]) - 46.0 * ph
		var i := roundi(mx)
		var j := roundi(my)
		if i < 2 or j < 2 or i >= _light_w - 2 or j >= _light_h - 2:
			continue
		var k := (j * _light_w + i) * 4
		var glow := _light[k] / 255.0 / 2.0
		var pool := _light[k + 1] / 255.0
		var dark := _light[k + 2] / 255.0
		var a := pow(sin(PI * ph), 2.0) * (0.6 if in_opening(mx, my) else minf(1.0, maxf(0.22, maxf(glow * 1.9, pool)))) * dark * 235.0
		if a < 2.0:
			continue
		for v in range(-2, 3):
			for u in range(-2, 3):
				var f := exp(-(u * u + v * v) / 1.3)
				_dot(Vector2(i + u, j + v), _rgb(a * f, a * 0.92 * f, a * 0.7 * f))


# A colour from 0 to 255 values, solid (dividing a Color would divide its alpha too).
static func _rgb(r: float, g: float, b: float) -> Color:
	return Color(r / 255.0, g / 255.0, b / 255.0, 1.0)


func _dot(at: Vector2, c: Color) -> void:
	draw_rect(Rect2(at, Vector2.ONE), c)


func _fbm(x: float, y: float) -> float:
	return vnoise(x / 170.0 + 3.0, y / 34.0 + 7.0) * 0.58 + vnoise(x / 58.0 + 9.0, y / 13.0 + 2.0) * 0.3 + vnoise(x / 20.0, y / 5.5) * 0.12


static func _loop(a: float, b: float, at: float) -> float:
	return 0.5 + ((a - 0.5) * (1.0 - at) + (b - 0.5) * at) / sqrt((1.0 - at) * (1.0 - at) + at * at)


static func _smooth(a: float, b: float, v: float) -> float:
	var k := clampf((v - a) / (b - a), 0.0, 1.0)
	return k * k * (3.0 - 2.0 * k)
