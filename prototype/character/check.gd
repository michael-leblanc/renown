extends SceneTree
## Headless proof of PRO-003's acceptance (no GUT in the test game, D201):
##   scripts/godot.sh --headless --path prototype -s res://character/check.gd
## Prints one line per check and exits 1 if any fails.

const DIRS_UNIT := [Vector2(1, 0), Vector2(0.894, 0.447), Vector2(0, 1), Vector2(-0.894, 0.447), Vector2(-1, 0), Vector2(-0.894, -0.447), Vector2(0, -1), Vector2(0.894, -0.447)]
var failures := 0


func _init() -> void:
	var scene: Node2D = load("res://character/character.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	var d: Dictionary = scene.data

	# 1. Three characters in a row, same parts, same code, sizes and green tints.
	var c: Array = scene.chars
	check("three characters in a row", c.size() == 3 and is_equal_approx(c[0].position.y, c[1].position.y) and is_equal_approx(c[1].position.y, c[2].position.y))
	check("all three run the same script", c[0].get_script() == c[1].get_script() and c[1].get_script() == c[2].get_script())
	var names0: Array = c[0]._sprites.keys()
	check("all three have the same stacked parts", names0 == c[1]._sprites.keys() and names0 == c[2]._sprites.keys() and names0.size() == 10)
	check("sizes: human 100%, orc 140% by 120%, goblin 75%", c[0].size_scale == Vector2(1, 1) and c[1].size_scale == Vector2(1.4, 1.2) and c[2].size_scale == Vector2(0.75, 0.75))
	var orc_body: Color = c[1]._sprites["NakedBody"].modulate
	var gob_body: Color = c[2]._sprites["NakedBody"].modulate
	var hum_body: Color = c[0]._sprites["NakedBody"].modulate
	check("orc and goblin bodies are tinted green, the human's is not", orc_body.g > orc_body.r and orc_body.g > orc_body.b and gob_body.g > gob_body.r and gob_body.g > gob_body.b and hum_body.r > hum_body.g)

	# 2. Each part has its own tint, all colours in the one data file.
	var tints: Dictionary = d["races"]["human"]["tints"]
	var seen := {}
	for p in tints:
		seen[tints[p]] = true
	check("each human part has its own tint (%d distinct for %d coloured parts)" % [seen.size(), tints.size()], seen.size() == tints.size() and tints.size() == 9)
	var every_race_has_all := true
	for r in d["races"]:
		for p in d["parts"]:
			if p != "Shadow" and not d["races"][r]["tints"].has(p):
				every_race_has_all = false
	check("every race has a tint for every part in character_data.json", every_race_has_all)
	var all_sprites_tinted := true
	for p in c[0]._sprites:
		if p != "Shadow" and c[0]._sprites[p].modulate == Color.WHITE:
			all_sprites_tinted = false
	check("no drawn part is left grey", all_sprites_tinted)

	# 3. Right key: the three step through all 8 directions, walking; layers per direction.
	var walked: Array[int] = []
	for i in 8:
		press(scene, KEY_RIGHT)
		await process_frame
		walked.append(c[0].direction)
		var same: bool = c[0].direction == c[1].direction and c[1].direction == c[2].direction
		var is_walk: bool = c[0].anim == "Walk" and c[1].anim == "Walk" and c[2].anim == "Walk"
		if not (same and is_walk):
			check("turn %d: all three face the same way and walk" % i, false)
	check("Right x8 visits all 8 directions: %s" % str(walked), walked.size() == 8 and walked.duplicate().size() == 8 and _unique(walked) == 8)
	var layers_ok := true
	for dir in 8:
		var order: Array = d["layer_order"][d["directions"][dir]]
		var sorted: Array = order.duplicate()
		sorted.sort()
		var expect: Array = d["parts"].duplicate()
		expect.sort()
		if sorted != expect:
			layers_ok = false
		c[0].set_direction(dir)
		for i in order.size():
			if c[0]._body.get_child(i).name != order[i]:
				layers_ok = false
	check("each direction stacks every part once, in its own back-to-front order", layers_ok)
	var behind_ok := true
	for dir in [3, 4, 5, 6]:   # the sword is in the far hand: behind the body
		var o: Array = d["layer_order"][d["directions"][dir]]
		behind_ok = behind_ok and o.find("Melee2") < o.find("NakedBody")
	for dir in [0, 1, 6, 7]:   # the shield is on the far arm: behind the body
		var o: Array = d["layer_order"][d["directions"][dir]]
		behind_ok = behind_ok and o.find("Shield1") < o.find("NakedBody")
	for dir in [2, 3, 4, 5]:   # the shield is on the near side: in front of it
		var o: Array = d["layer_order"][d["directions"][dir]]
		behind_ok = behind_ok and o.find("Shield1") > o.find("NakedBody")
	check("far-side weapon behind the body, near-side in front, in the data", behind_ok)

	# 4. O toggles the orc's size, G the goblin's; printed on screen.
	var orc_seen: Array[String] = []
	for i in 4:
		orc_seen.append(scene._pct(c[1].size_scale))
		press(scene, KEY_O)
	check("O cycles the orc 140%% by 120%%, 150%% by 115%%, 125%% and back: %s" % str(orc_seen), orc_seen == ["140% wide by 120% tall", "150% wide by 115% tall", "125%", "140% wide by 120% tall"])
	var gob_seen: Array[String] = []
	for i in 3:
		gob_seen.append(scene._pct(c[2].size_scale))
		press(scene, KEY_G)
	check("G cycles the goblin 75%% and 82%%: %s" % str(gob_seen), gob_seen == ["75%", "82%", "75%"])
	press(scene, KEY_O)
	await process_frame
	var text: String = scene._hud.text
	check("the size is printed on screen", text.contains("Orc size: 125%   Goblin") and text.contains("Goblin size: 82%"))
	check("the frame rate setting is printed on screen", text.contains("Walk frame rate (setting): %.0f fps" % d["walk_fps"]))

	# 5. Feet against the ground at 3.3 tiles a second (D185), from the real sheets.
	var shoes := Image.load_from_file(ProjectSettings.globalize_path("res://art/creator/Shoes1/Walk.png"))
	var worst := 0.0
	var line := ""
	for dir in 8:
		var measured := foot_speed(shoes, dir)
		var set_px: float = d["foot_px_per_frame"][dir]
		if absf(measured / set_px - 1.0) > 0.15:
			check("foot_px_per_frame[%d] %.1f matches the sheet (%.2f)" % [dir, set_px, measured], false)
		var h = c[0]
		h.set_direction(dir)
		h.set_anim("Walk")
		h._process(0.0)
		var ratio_set: float = h.slide_ratio()
		# Same ratio, but with the foot speed measured from the sheet instead of the data.
		var ratio_measured := ratio_set * measured / set_px
		worst = maxf(worst, absf(ratio_measured - 1.0))
		line += " %s %.2f" % [d["directions"][dir], ratio_measured]
		print("     %s: sheet foot %.2f px/frame, data %.1f" % [d["directions"][dir], measured, set_px])
	check("human foot speed / ground speed within 15%%:%s" % line, worst < 0.15)
	var tiles_per_s := 1.0 / float(d["tile_seconds"])
	check("walk speed is %.2f tiles/s (3.3)" % tiles_per_s, absf(tiles_per_s - 3.3) < 0.1)
	var orc_ok := true
	for dir in 8:
		for who in [0, 1, 2]:
			c[who].set_direction(dir)
			c[who].set_anim("Walk")
			c[who]._process(0.0)
		orc_ok = orc_ok and absf(c[1].slide_ratio() - c[0].slide_ratio()) < 0.001 and absf(c[2].slide_ratio() - c[0].slide_ratio()) < 0.001
	check("the orc's legs turn slower so its larger stride does not slide either", orc_ok)

	print("check: %s" % ("PASS" if failures == 0 else "FAIL (%d)" % failures))
	quit(1 if failures > 0 else 0)


func press(scene: Node, key: Key) -> void:
	var e := InputEventKey.new()
	e.keycode = key
	e.pressed = true
	scene._unhandled_key_input(e)


func check(what: String, ok: bool) -> void:
	print(("ok   " if ok else "FAIL ") + what)
	if not ok:
		failures += 1


func _unique(a: Array) -> int:
	var s := {}
	for v in a:
		s[v] = true
	return s.size()


## Planted-foot speed in sheet pixels a frame: the lowest few pixels of the shoes,
## frame to frame, along the walking direction (median of the stance steps).
func foot_speed(img: Image, row: int) -> float:
	var cs: Array[Vector2] = []
	for f in 15:
		var maxy := -1
		for y in 128:
			for x in 128:
				if img.get_pixel(f * 128 + x, row * 128 + y).a > 0.1:
					maxy = maxi(maxy, y)
		var sx := 0.0
		var sy := 0.0
		var n := 0
		for y in range(maxy - 2, maxy + 1):
			for x in 128:
				if img.get_pixel(f * 128 + x, row * 128 + y).a > 0.1:
					sx += x
					sy += y
					n += 1
		cs.append(Vector2(sx / n, sy / n))
	var steps: Array[float] = []
	for f in 15:
		var v: float = (cs[(f + 1) % 15] - cs[f]).dot(-DIRS_UNIT[row])
		if v > 1.5 and v < 4.5:
			steps.append(v)
	steps.sort()
	return steps[steps.size() / 2]
