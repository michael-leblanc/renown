extends Node
## Draws each sheet through swap.gdshader and compares the result, pixel for pixel, with the same sheet with the metal painted in.
## Run by scripts/art/swap_check.mjs. Arguments after "--": one JSON file: {"from": [[r,g,b] x6], "jobs": [{"sheet": path, "want": path, "to": [[r,g,b] x6], "name": text}]}.

func _colours(list: Array) -> PackedVector3Array:
	var out := PackedVector3Array()
	for c in list:
		out.append(Vector3(c[0] / 255.0, c[1] / 255.0, c[2] / 255.0))
	return out

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	if args.is_empty():
		print("Usage: godot --path <this folder> -- <jobs.json>")
		get_tree().quit(1)
		return
	var jobs: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(args[0]))
	var shader: Shader = load("res://swap.gdshader")
	var bad := 0
	for job in jobs["jobs"]:
		var sheet := Image.load_from_file(job["sheet"])
		var want := Image.load_from_file(job["want"])
		var vp := SubViewport.new()
		vp.size = sheet.get_size()
		vp.transparent_bg = true
		vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
		add_child(vp)
		var sprite := Sprite2D.new()
		sprite.texture = ImageTexture.create_from_image(sheet)
		sprite.centered = false
		sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		var mat := ShaderMaterial.new()
		mat.shader = shader
		mat.set_shader_parameter("from_colours", _colours(jobs["from"]))
		mat.set_shader_parameter("to_colours", _colours(job["to"]))
		sprite.material = mat
		vp.add_child(sprite)
		await RenderingServer.frame_post_draw
		await RenderingServer.frame_post_draw
		var got := vp.get_texture().get_image()
		got.convert(Image.FORMAT_RGBA8)
		want.convert(Image.FORMAT_RGBA8)
		var a := got.get_data()
		var b := want.get_data()
		var differ := 0
		var drawn := 0
		for i in range(0, b.size(), 4):
			if b[i + 3] == 0 and a[i + 3] == 0:
				continue
			drawn += 1
			if a[i] != b[i] or a[i + 1] != b[i + 1] or a[i + 2] != b[i + 2] or a[i + 3] != b[i + 3]:
				differ += 1
		print("%s: %d of %d drawn pixels differ" % [job["name"], differ, drawn])
		if differ > 0 or drawn == 0:
			bad += 1
		vp.queue_free()
	print("PASS" if bad == 0 else "FAIL: %d sheets" % bad)
	get_tree().quit(0 if bad == 0 else 1)
