extends Node
## Draws a character's layer pictures through doll.gdshader (and their ground shadows through shadow.gdshader) and
## compares the result, pixel for pixel, with the picture scripts/art/paperdoll.mjs made of the same layers.
##
## Two ways to run it:
##  - by `node scripts/art/paperdoll.mjs godot`: the jobs file comes after "--"; it prints the result and quits.
##  - on its own (a folder made by `paperdoll.mjs pack`, with its pictures in data/): it reads res://data/jobs.json,
##    prints the result, and shows the outfits side by side, moving, with the result written under each. It stays open
##    until the window is closed ("-- --once" quits after the check).
## Jobs: {"jobs": [{"outfit": text, "name": text, "layers": [paths], "shadows": [paths], "colours": [[r,g,b] x256],
## "outline": [r,g,b] (left out or null: the character is drawn with no outline), "lined": the part lines' layers as bits
## (bit k: layer k; left out: none), "line_gap": in depth steps,
## "want": path, "want_shadow": path}]}. One job is one frame of one outfit.

const HERE := "res://data/jobs.json"
const ZOOM := 3
const SHOWN := Rect2(84, 100, 96, 124)   # the part of a 256 px frame that holds the figure
const GRASS := Color8(88, 108, 70)

var _doll: Shader = load("res://doll.gdshader")
var _shadow: Shader = load("res://shadow.gdshader")
var _shows: Array = []   # per outfit: {"frames": [[doll material, shadow material]], "doll": ColorRect, "shadow": ColorRect}
var _clock := 0.0

func _file(path: String) -> String:
	return ProjectSettings.globalize_path(path) if path.begins_with("res://") else path

func _material(shader: Shader, prefix: String, files: Array, colours: Array, outline: Variant = null, lined: int = 0, line_gap: float = 4.0, tucks: Array = [], tuck_gap: float = 400.0) -> ShaderMaterial:
	var mat := ShaderMaterial.new()
	mat.shader = shader
	mat.set_shader_parameter("worn", files.size())
	for k in files.size():
		mat.set_shader_parameter("%s%d" % [prefix, k], ImageTexture.create_from_image(Image.load_from_file(_file(files[k]))))
	if not colours.is_empty():
		var list := PackedVector3Array()
		for c in colours:
			list.append(Vector3(c[0] / 255.0, c[1] / 255.0, c[2] / 255.0))
		mat.set_shader_parameter("colours", list)
		mat.set_shader_parameter("outlined", outline != null)
		if outline != null:
			mat.set_shader_parameter("outline_colour", Vector3(outline[0] / 255.0, outline[1] / 255.0, outline[2] / 255.0))
		mat.set_shader_parameter("lined", lined)
		mat.set_shader_parameter("line_gap", line_gap)
		var masks := PackedInt32Array()
		for k in 10:
			masks.append(int(tucks[k]) if k < tucks.size() else 0)
		mat.set_shader_parameter("tucks", masks)
		mat.set_shader_parameter("tuck_gap", tuck_gap)
	return mat

func _draw_through(mat: ShaderMaterial, size: Vector2i) -> Image:
	var vp := SubViewport.new()
	vp.size = size
	vp.transparent_bg = true
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(vp)
	var rect := ColorRect.new()
	rect.size = Vector2(size)
	rect.material = mat
	vp.add_child(rect)
	await RenderingServer.frame_post_draw
	await RenderingServer.frame_post_draw
	var got := vp.get_texture().get_image()
	got.convert(Image.FORMAT_RGBA8)
	vp.queue_free()
	return got

func _differ(got: Image, want_path: String) -> Array:
	var want := Image.load_from_file(_file(want_path))
	want.convert(Image.FORMAT_RGBA8)
	var a := got.get_data()
	var b := want.get_data()
	var differ := 0
	var drawn := 0
	for i in range(0, b.size(), 4):
		if b[i + 3] == 0 and a[i + 3] == 0:
			continue
		drawn += 1
		if a[i + 3] != b[i + 3] or a[i] != b[i] or a[i + 1] != b[i + 1] or a[i + 2] != b[i + 2]:
			differ += 1
	return [differ, drawn]

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var given := ""
	for a in args:
		if not a.begins_with("--"):
			given = a
	var alone := given == ""
	var source := HERE if alone else given
	if alone and not FileAccess.file_exists(HERE):
		print("No jobs: run it through `node scripts/art/paperdoll.mjs godot`, or make a folder with `paperdoll.mjs pack`.")
		get_tree().quit(1)
		return
	var renderer := "renderer: %s, driver %s, on %s (Godot %s)" % [RenderingServer.get_current_rendering_method(),
		RenderingServer.get_current_rendering_driver_name(), RenderingServer.get_video_adapter_name(), Engine.get_version_info()["string"]]
	print(renderer)
	var jobs: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(source))
	var sums := {}    # outfit -> [differ, drawn, shadow differ, shadow drawn, frames]
	var order: Array = []
	var bad := 0
	for job in jobs["jobs"]:
		var outfit: String = job.get("outfit", "")
		if not sums.has(outfit):
			sums[outfit] = [0, 0, 0, 0, 0]
			order.append(outfit)
			_shows.append({"outfit": outfit, "frames": []})
		var size := Image.load_from_file(_file(job["layers"][0])).get_size()
		var doll_mat := _material(_doll, "layer", job["layers"], job["colours"], job.get("outline"), int(job.get("lined", 0)), float(job.get("line_gap", 4.0)), job.get("tucks", []), float(job.get("tuck_gap", 400.0)))
		var shadow_mat := _material(_shadow, "shadow", job["shadows"], [])
		_shows[order.find(outfit)]["frames"].append([doll_mat, shadow_mat])
		var d := _differ(await _draw_through(doll_mat, size), job["want"])
		var s := _differ(await _draw_through(shadow_mat, size), job["want_shadow"])
		print("%s: %d of %d drawn pixels differ; shadow: %d of %d" % [job["name"], d[0], d[1], s[0], s[1]])
		var sum: Array = sums[outfit]
		sums[outfit] = [sum[0] + d[0], sum[1] + d[1], sum[2] + s[0], sum[3] + s[1], sum[4] + 1]
		if d[0] > 0 or d[1] == 0 or s[0] > 0:
			bad += 1
	var lines := {}
	for outfit in order:
		var sum: Array = sums[outfit]
		lines[outfit] = "%d frames: %d of %d pixels differ, shadow %d of %d" % [sum[4], sum[0], sum[1], sum[2], sum[3]]
		if outfit != "":
			print("%s. %s" % [outfit, lines[outfit]])
	var verdict := "PASS" if bad == 0 else "FAIL: %d pictures" % bad
	print(verdict)
	if not alone or args.has("--once"):
		get_tree().quit(0 if bad == 0 else 1)
		return
	_show(renderer, verdict, bad == 0, lines)

func _text(text: String, at: Vector2, size: int, colour := Color(0.91, 0.93, 0.87)) -> void:
	var label := Label.new()
	label.text = text
	label.position = at
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", colour)
	add_child(label)

func _show(renderer: String, verdict: String, good: bool, lines: Dictionary) -> void:
	RenderingServer.set_default_clear_color(Color8(31, 42, 28))
	var tone := Color(0.55, 0.9, 0.5) if good else Color(1.0, 0.45, 0.4)
	_text("Layered characters drawn by the depth shader: %s" % verdict, Vector2(24, 16), 24, tone)
	_text(renderer, Vector2(24, 52), 14)
	_text("Each figure is drawn here from its layer pictures (the nearer pixel wins, colours filled in), 3 times its size. The check compares every frame at its real size with the picture made outside Godot.", Vector2(24, 76), 12, Color(0.67, 0.71, 0.63))
	var x := 24.0
	for show in _shows:
		var frame := Control.new()
		frame.position = Vector2(x, 112)
		frame.size = SHOWN.size * ZOOM
		frame.clip_contents = true
		add_child(frame)
		var ground := ColorRect.new()
		ground.color = GRASS
		ground.size = frame.size
		frame.add_child(ground)
		for kind in ["shadow", "doll"]:
			var rect := ColorRect.new()
			rect.size = Vector2(256, 256)
			rect.scale = Vector2(ZOOM, ZOOM)
			rect.position = -SHOWN.position * ZOOM
			frame.add_child(rect)
			show[kind] = rect
		var name_at := Vector2(x, 112 + frame.size.y + 8)
		_text(show["outfit"], name_at, 14)
		_text(lines[show["outfit"]], name_at + Vector2(0, 22), 12, tone)
		x += frame.size.x + 72
	_step(0)

func _step(k: int) -> void:
	for show in _shows:
		var pair: Array = show["frames"][k % show["frames"].size()]
		show["doll"].material = pair[0]
		show["shadow"].material = pair[1]

func _process(delta: float) -> void:
	if _shows.is_empty() or not _shows[0].has("doll"):
		return
	_clock += delta
	_step(int(_clock * 8.0))   # 8 pictures a second, the game's idle
