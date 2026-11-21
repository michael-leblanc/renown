extends Node
## Draws each job's layers through doll.gdshader (and their shadows through shadow.gdshader) and compares the result, pixel
## for pixel, with the picture scripts/art/paperdoll.mjs made of the same layers. Run by `paperdoll.mjs godot`.
## Arguments after "--": one JSON file: {"jobs": [{"name": text, "layers": [paths], "shadows": [paths], "colours": [[r,g,b] x96],
## "want": path, "want_shadow": path}]}.

func _draw_through(shader: Shader, prefix: String, files: Array, colours: Array) -> Image:
	var first := Image.load_from_file(files[0])
	var vp := SubViewport.new()
	vp.size = first.get_size()
	vp.transparent_bg = true
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(vp)
	var rect := ColorRect.new()
	rect.size = Vector2(first.get_size())
	var mat := ShaderMaterial.new()
	mat.shader = shader
	mat.set_shader_parameter("worn", files.size())
	for k in files.size():
		mat.set_shader_parameter("%s%d" % [prefix, k], ImageTexture.create_from_image(Image.load_from_file(files[k])))
	if not colours.is_empty():
		var list := PackedVector3Array()
		for c in colours:
			list.append(Vector3(c[0] / 255.0, c[1] / 255.0, c[2] / 255.0))
		mat.set_shader_parameter("colours", list)
	rect.material = mat
	vp.add_child(rect)
	await RenderingServer.frame_post_draw
	await RenderingServer.frame_post_draw
	var got := vp.get_texture().get_image()
	got.convert(Image.FORMAT_RGBA8)
	vp.queue_free()
	return got

func _differ(got: Image, want_path: String) -> Array:
	var want := Image.load_from_file(want_path)
	want.convert(Image.FORMAT_RGBA8)
	var a := got.get_data()
	var b := want.get_data()
	var differ := 0
	var drawn := 0
	for i in range(0, b.size(), 4):
		if b[i + 3] == 0 and a[i + 3] == 0:
			continue
		drawn += 1
		# a shadow is black with an alpha: where one is clear the colour under it says nothing
		if a[i + 3] != b[i + 3] or a[i] != b[i] or a[i + 1] != b[i + 1] or a[i + 2] != b[i + 2]:
			differ += 1
	return [differ, drawn]

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	if args.is_empty():
		print("Usage: godot --path <this folder> -- <jobs.json>")
		get_tree().quit(1)
		return
	print("renderer: %s on %s" % [RenderingServer.get_current_rendering_method(), RenderingServer.get_video_adapter_name()])
	var jobs: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(args[0]))
	var doll: Shader = load("res://doll.gdshader")
	var shadow: Shader = load("res://shadow.gdshader")
	var bad := 0
	for job in jobs["jobs"]:
		var d := _differ(await _draw_through(doll, "layer", job["layers"], job["colours"]), job["want"])
		var s := _differ(await _draw_through(shadow, "shadow", job["shadows"], []), job["want_shadow"])
		print("%s: %d of %d drawn pixels differ; shadow: %d of %d" % [job["name"], d[0], d[1], s[0], s[1]])
		if d[0] > 0 or d[1] == 0 or s[0] > 0:
			bad += 1
	print("PASS" if bad == 0 else "FAIL: %d pictures" % bad)
	get_tree().quit(0 if bad == 0 else 1)
