extends SceneTree
## Headless proof of PRO-004's acceptance (no GUT in the test game, D201):
##   scripts/godot.sh --headless --path prototype -s res://block/check.gd
## Prints one line per check, then "check: PASS" or "check: FAIL" (exit 1).

var failures := 0
var scene: Node2D
var seen_anims := {}       # candidate index -> {anim name: true}
var seen_flash := {}       # candidate index -> true once the white flash showed
var seen_ranges := {}      # candidate index -> highest last frame played


func _init() -> void:
	var packed = load("res://block/block.tscn")
	check("the block scene loads", packed != null)
	if packed == null:
		_finish()
		return
	scene = packed.instantiate()
	root.add_child(scene)
	await process_frame
	var cands: Array = scene.cands

	# 1. Five armed humans in a row, each labelled.
	check("five candidates", cands.size() == 5)
	var same_y := true
	var labelled := true
	var armed := true
	var texts := {}
	for s in cands:
		same_y = same_y and is_equal_approx(s["char"].position.y, cands[0]["char"].position.y)
		labelled = labelled and s["label"] != null and not s["label"].text.is_empty()
		armed = armed and s["char"]._sprites.has("Melee2") and s["char"]._sprites.has("Shield1")
		if s["label"] != null:
			texts[s["label"].text] = true
	check("they stand in a row", same_y)
	check("each has its own label (%d distinct)" % texts.size(), labelled and texts.size() == 5)
	check("each carries a sword and a shield, and is a human", armed and cands.all(func(s): return s["char"].race == "human"))
	var xs: Array = cands.map(func(s): return s["char"].position.x)
	var sorted_xs := xs.duplicate()
	sorted_xs.sort()
	check("left to right in order, not on top of each other", xs == sorted_xs and _unique_floats(xs) == 5)

	# Watch about 5 seconds: what each plays and when the flash shows.
	var elapsed := 0.0
	var last := Time.get_ticks_msec()
	while elapsed < 5.0:
		await process_frame
		var now := Time.get_ticks_msec()
		elapsed += (now - last) / 1000.0
		last = now
		for s in cands:
			var i: int = s["index"]
			var c: Node2D = s["char"]
			if not seen_anims.has(i):
				seen_anims[i] = {}
				seen_ranges[i] = 0
			seen_anims[i][c.anim] = true
			seen_ranges[i] = maxi(seen_ranges[i], c.frame)
			var m: ShaderMaterial = s["material"]
			var f = m.get_shader_parameter("flash")
			if f != null and float(f) > 0.5:
				seen_flash[i] = true
	var want := ["CrouchIdle", "TakeDamage", "Idle", "Special1", "Taunt"]
	for i in 5:
		check("candidate %d plays %s" % [i + 1, want[i]], seen_anims[i].keys() == [want[i]])
	check("candidate 1 plays the whole CrouchIdle", seen_ranges[0] >= 10)
	check("candidate 2 plays only the first frames of TakeDamage (up to frame %d of 14)" % seen_ranges[1], seen_ranges[1] <= 6 and seen_ranges[1] >= 3)
	check("candidate 3 shows a white flash", seen_flash.has(2))
	check("only candidate 3 flashes", seen_flash.size() == 1)
	var frozen: bool = cands[2]["char"].frozen
	var frame_a: int = cands[2]["char"].frame
	await process_frame
	await process_frame
	check("candidate 3 holds one Idle frame, not moving (frame %d)" % frame_a, frozen and cands[2]["char"].frame == frame_a and not cands[0]["char"].frozen)
	check("each candidate went round again (looped): %s" % str(cands.map(func(s): return s["cycles"])), cands.all(func(s): return s["cycles"] >= 2))

	# 2. Right x8: all five turn together through all 8 directions.
	var visited: Array = []
	var together := true
	for k in 8:
		_press(KEY_RIGHT)
		await process_frame
		var d: int = cands[0]["char"].direction
		visited.append(d)
		for s in cands:
			together = together and s["char"].direction == d
	check("Right x8: all five always face the same way", together)
	check("Right x8 visits all 8 directions: %s" % str(visited), _unique_ints(visited) == 8)
	_press(KEY_LEFT)
	await process_frame
	check("Left turns them back", cands[0]["char"].direction == posmod(visited[7] - 1, 8))

	# 3. A short sound with every candidate.
	for s in cands:
		var i: int = s["index"]
		var p: AudioStreamPlayer = s["player"]
		var wav := p.stream as AudioStreamWAV
		var loud := false
		if wav != null:
			for k in range(0, wav.data.size() - 1, 2):
				if absi(wav.data.decode_s16(k)) > 1000:
					loud = true
					break
		check("candidate %d has a sound of %.2f s that is not silent, played %d times" % [i + 1, wav.get_length() if wav else 0.0, s["sounds"]],
			wav != null and wav.get_length() > 0.05 and wav.get_length() < 1.0 and loud and s["sounds"] >= 2)
	var started := [0, 0, 0, 0, 0]
	scene.candidate_started.connect(func(i): started[i] += 1)
	for k in 5:
		_press(KEY_1 + k)
	check("keys 1 to 5 each replay their candidate and its sound: %s" % str(started), started == [1, 1, 1, 1, 1])

	_finish()


func _press(keycode: int) -> void:
	var e := InputEventKey.new()
	e.keycode = keycode
	e.pressed = true
	scene._unhandled_key_input(e)


func _unique_ints(a: Array) -> int:
	var seen := {}
	for v in a:
		seen[v] = true
	return seen.size()


func _unique_floats(a: Array) -> int:
	return _unique_ints(a.map(func(v): return roundi(v)))


func check(what: String, ok: bool) -> void:
	print(("ok    " if ok else "FAIL  ") + what)
	if not ok:
		failures += 1


func _finish() -> void:
	print("check: PASS" if failures == 0 else "check: FAIL")
	quit(0 if failures == 0 else 1)
