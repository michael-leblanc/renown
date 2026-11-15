extends SceneTree
## Headless proof of PRO-004's acceptance (no GUT in the test game, D201):
##   scripts/godot.sh --headless --path prototype -s res://block/check.gd
## Prints one line per check, then "check: PASS" or "check: FAIL" (exit 1).

var failures := 0
var scene: Node2D
var seen_anims := {}       # candidate index -> {anim name: true}
var seen_flash := {}       # candidate index -> true once the white flash showed
var seen_ranges := {}      # candidate index -> highest last frame played


const WATCHDOG_SECONDS := 25.0   # the whole check takes about 12 s


func _init() -> void:
	# Never hang: a script error inside this coroutine ends only the coroutine, so
	# this timer is what stops a broken run.
	create_timer(WATCHDOG_SECONDS).timeout.connect(func():
		print("FAIL  timeout: the check did not finish in %.0f s" % WATCHDOG_SECONDS)
		print("check: FAIL")
		quit(1))
	var packed = load("res://block/block.tscn")
	check("the block scene loads", packed != null)
	if packed == null:
		_finish()
		return
	scene = packed.instantiate()
	check("the scene has its script (cands)", scene.get_script() != null and "cands" in scene)
	if failures > 0:
		_finish()
		return
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
			var m: ShaderMaterial = s["helper"].material
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
		var p: AudioStreamPlayer = s["helper"].player
		var wav := p.stream as AudioStreamWAV
		var loud := false
		if wav != null:
			for k in range(0, wav.data.size() - 1, 2):
				if absi(wav.data.decode_s16(k)) > 1000:
					loud = true
					break
		check("candidate %d has a sound of %.2f s that is not silent, started %d times" % [i + 1, wav.get_length() if wav else 0.0, s["helper"].sounds],
			wav != null and wav.get_length() > 0.05 and wav.get_length() < 1.0 and loud and s["helper"].sounds >= 2)
	var started := [0, 0, 0, 0, 0]
	scene.candidate_started.connect(func(i): started[i] += 1)
	for k in 5:
		_press(KEY_1 + k)
	check("keys 1 to 5 each replay their candidate and its sound: %s" % str(started), started == [1, 1, 1, 1, 1])


	await _check_helper()
	_finish()


## The reusable helper (PRO-006 calls it on a miss): plays a candidate on any
## character node and leaves it un-frozen and un-flashed.
func _check_helper() -> void:
	var BlockPlayer = load("res://block/block_player.gd")
	var Character = load("res://character/character.gd")
	var d: Dictionary = BlockPlayer.load_data()
	var cd: Dictionary = scene.char_data.duplicate(true)
	var c: Node2D = Character.new()
	c.position = Vector2(50, 50)
	scene.add_child(c)
	c.setup("orc", cd)    # not one of the five: any character works
	var h = BlockPlayer.play_candidate(c, 2)
	check("helper: candidate 3 on a fresh orc plays Idle frozen on frame %d, flashing" % d["candidates"][2]["frame"],
		c.anim == "Idle" and c.frozen and c.frame == int(d["candidates"][2]["frame"]) and h.flash_on and h.sounds == 1)
	check("helper: its parts (not the shadow) carry the flash material", c._sprites["Head1"].material == h.material and c._sprites["Shadow"].material == null)
	await create_timer(float(d["flash_seconds"]) + 0.15).timeout
	check("helper: the flash goes off while the frame is still held", not h.flash_on and c.frozen)
	await create_timer(float(d["flash_hold_seconds"]) + 0.1).timeout
	check("helper: afterwards the character is un-frozen and un-flashed", not c.frozen and not h.flash_on and float(h.material.get_shader_parameter("flash")) == 0.0)
	BlockPlayer.play_candidate(c, 0)
	check("helper: candidate 1 right after the flash one is not frozen and plays CrouchIdle", not c.frozen and c.anim == "CrouchIdle" and c.get_node_or_null("BlockPlayer") == h and h.sounds == 2)
	BlockPlayer.play_candidate(c, 2)
	BlockPlayer.play_candidate(c, 1)
	check("helper: an animation candidate cuts a held flash short (un-frozen, no flash)", not c.frozen and not h.flash_on and c.anim == "TakeDamage" and c.range_to == int(d["candidates"][1]["to"]))
	var n: int = scene.cands.size()
	check("helper: the block scene itself plays through it (%d helpers on its five)" % n, scene.cands.all(func(s): return s["helper"].get_script() == BlockPlayer))
	c.queue_free()


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
