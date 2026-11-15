extends SceneTree
## Headless checks for PRO-006 (no GUT in the test game, D201):
##   scripts/godot.sh --headless --path prototype --script res://fight/check.gd
## Prints one line per acceptance and exits 1 if any failed. The pictures are
## checked by shots, see fight/README.md.

const DT := 1.0 / 60.0
const DATA_PATH := "res://fight/fight_data.json"

var failures := 0


func ok(cond: bool, what: String) -> void:
	if cond:
		print("ok   ", what)
	else:
		print("FAIL ", what)
		failures += 1


func _init() -> void:
	var scene: PackedScene = load("res://play/play.tscn")
	if scene == null or load("res://fight/fight.gd") == null or not FileAccess.file_exists(DATA_PATH):
		print("FAIL fight files missing")
		quit(1)
		return
	await _clicking_the_dummy(scene)
	await _hits_and_misses(scene)
	_twenty_fights()
	_one_data_file(scene)
	await _live_keys(scene)
	await _reset(scene)
	await _idle_not_forced(scene)
	await _corner_rule_default(scene)
	print("")
	print("FAILED: %d" % failures if failures > 0 else "ALL OK")
	quit(1 if failures > 0 else 0)


func _make(scene: PackedScene, seed_in := 1) -> Node2D:
	var p: Node2D = scene.instantiate()
	p.seed_override = seed_in
	root.add_child(p)
	await process_frame
	p.set_process(false)
	return p


func _drop(p: Node) -> void:
	root.remove_child(p)
	p.free()


func _key(p: Node2D, keycode: int) -> void:
	var ev := InputEventKey.new()
	ev.keycode = keycode
	ev.pressed = true
	p._unhandled_input(ev)


func _adjacent(a: Vector2i, b: Vector2i) -> bool:
	return a != b and maxi(absi(a.x - b.x), absi(a.y - b.y)) == 1


## Runs the play scene until `cond` is true or `cap` seconds pass. Returns the seconds.
func _until(p: Node2D, cond: Callable, cap := 120.0) -> float:
	var t := 0.0
	while not cond.call() and t < cap:
		p.tick(DT)
		t += DT
	return t


func _fight_data() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(DATA_PATH))


# --- acceptance 1: click the dummy, walk next to it, both swing every 2 s -----

func _clicking_the_dummy(scene: PackedScene) -> void:
	var p := await _make(scene, 1)
	ok(p.dummy != null and p.dummy.race == "orc", "dummy: an orc stands in the patch")
	ok(p.pathfinder.area_of(p.dummy_cell) == p.pathfinder.area_of(p.cell) and p.dummy_cell != p.cell, "dummy: on a free tile the human can reach, not the human's own")
	ok(p.dummy.get_parent() == p.world.objects and p.dummy.position == p.world.cell_to_world(Vector2(p.dummy_cell)), "dummy: drawn on its tile in the world's y-sorted layer")
	var swings := {"human": [], "dummy": []}
	p.fight_event.connect(func(ev: Dictionary) -> void:
		if ev["type"] == "swing":
			swings[ev["who"]].append(snappedf(ev["time"], 0.001)))
	# A click on the dummy's body (above its feet), not on its tile.
	var above: Vector2 = p.dummy.position + Vector2(0, -100)
	ok(p.world.world_to_cell(above) != p.dummy_cell and p.dummy_hit(above), "dummy: a click above its feet (not on its tile) is on the dummy")
	p.click_world(above)
	ok(p.attack_pending and not p.path.is_empty(), "click on the dummy: the human starts walking (%d steps)" % p.path.size())
	var last_tile: Vector2i = p.path[p.path.size() - 1]
	ok(_adjacent(last_tile, p.dummy_cell), "click on the dummy: the walk ends next to the dummy, never on its tile (%s)" % str(last_tile))
	_until(p, func(): return p.fight.active)
	ok(p.fight.active and not p.moving and _adjacent(p.cell, p.dummy_cell), "click on the dummy: the fight starts once the human stands next to it")
	ok(p.human.direction == p._direction_of(p.dummy_cell - p.cell) and p.dummy.direction == p._direction_of(p.cell - p.dummy_cell), "the two face each other")
	var swing_s: float = p.fight_data["swing_seconds"]
	_until(p, func(): return p.fight.over or p.fight.t >= 6.5 * swing_s)
	var h: Array = swings["human"]
	var d: Array = swings["dummy"]
	var even := h.size() >= 4 and d.size() >= 3
	for i in range(1, h.size()):
		even = even and absf(h[i] - h[i - 1] - swing_s) < 0.002
	for i in range(1, d.size()):
		even = even and absf(d[i] - d[i - 1] - swing_s) < 0.002
	ok(even and absf(h[0]) < 0.002, "fight: both swing every %.1f s (human at %s, dummy at %s)" % [swing_s, str(h.slice(0, 4)), str(d.slice(0, 4))])
	_until(p, func(): return p.fight.over)
	ok(p.fight.over and (not p.fight.fighters["human"]["alive"] or not p.fight.fighters["dummy"]["alive"]), "fight: it goes on until one of the two dies")
	ok(not (not p.fight.fighters["human"]["alive"] and not p.fight.fighters["dummy"]["alive"]), "fight: never both dead")
	_drop(p)
	# Already next to the dummy: the click starts the fight at once.
	var q := await _make(scene, 1)
	var next_to: Vector2i = q.stand_cells_next_to_dummy()[0]
	q.cell = next_to
	q.human.position = q.world.cell_to_world(Vector2(next_to))
	q.click_dummy()
	q.tick(DT)
	ok(q.fight.active and q.path.is_empty(), "click on the dummy while next to it: the fight starts with no walk")
	_drop(q)


# --- acceptance 2: hit = TakeDamage, miss = chosen block candidate, bars + timer

func _hits_and_misses(scene: PackedScene) -> void:
	# A lambda gets a copy of a number, so the counters live in one dictionary.
	var c := {"bad_hit": 0, "bad_miss": 0, "hits": 0, "misses": 0}
	var by_key := {}
	var shown_bars := false
	var timer_text := false
	for pick in [KEY_1, KEY_2, KEY_3, KEY_4, KEY_5]:
		var p := await _make(scene, 1)
		_key(p, pick)
		var block_i: int = pick - KEY_1
		ok(p.block_index == block_i, "key %d chooses block candidate %d" % [block_i + 1, block_i + 1])
		var spec: Dictionary = p.block_data["candidates"][block_i]
		p.fight_event.connect(func(ev: Dictionary) -> void:
			var target: Node2D = p.human if ev.get("target", "") == "human" else p.dummy
			if ev["type"] == "hit":
				c["hits"] += 1
				var want: String = "Die" if ev["killed"] else "TakeDamage"
				if target.anim != want:
					c["bad_hit"] += 1
			elif ev["type"] == "miss":
				c["misses"] += 1
				var helper = target.get_node_or_null("BlockPlayer")
				var good: bool = helper != null and helper.index == block_i and target.anim == spec["anim"]
				if not good:
					c["bad_miss"] += 1
				by_key[pick] = by_key.get(pick, 0) + 1)
		p.click_dummy()
		_until(p, func(): return p.fight.active)
		var n := 0
		while not p.fight.over and n < 60 * 120:
			p.tick(DT)
			n += 1
			if n == 60 * 3:
				p._update_hud()
				timer_text = p._hud.text.contains("Fight timer: 3.")
				shown_bars = p.fight_data["bars"]["show"] and p.human_bar_text().contains("/") and p.dummy_bar_text().contains("/")
		_drop(p)
	ok(c["hits"] > 10 and c["bad_hit"] == 0, "hit: TakeDamage plays on the target (Die on the killing blow) (%d hits)" % c["hits"])
	ok(c["misses"] > 10 and c["bad_miss"] == 0 and by_key.size() == 5, "miss: the chosen block candidate plays on the target, for each of keys 1 to 5 (%d misses)" % c["misses"])
	ok(timer_text, "screen: a fight timer prints while the fight runs")
	ok(shown_bars, "screen: both health bars print current/max health")


# --- acceptance 3: 20 fights, no window, average 25 to 35 s -------------------

func _twenty_fights() -> void:
	var data := _fight_data()
	var c: Dictionary = data["check"]
	var total := 0.0
	var lengths: Array[String] = []
	var human_wins := 0
	for i in int(c["fights"]):
		var f := Fight.new(data, int(c["first_seed"]) + i)
		var len := f.run_to_end(DT)
		total += len
		lengths.append("%.1f" % len)
		if f.fighters["human"]["alive"]:
			human_wins += 1
	var avg: float = total / float(c["fights"])
	print("fights: ", ", ".join(lengths))
	print("average fight length over %d fights: %.1f s (human won %d)" % [int(c["fights"]), avg, human_wins])
	ok(avg >= float(c["min_average_seconds"]) and avg <= float(c["max_average_seconds"]), "20 fights, no window: the average length %.1f s is between 25 and 35" % avg)
	# More fights on other seeds, to see whether the 20 are a lucky draw (the true mean).
	var big := 0.0
	for i in 1000:
		big += Fight.new(data, 1000 + i).run_to_end(DT)
	print("average over 1000 other fights: %.1f s" % (big / 1000.0))
	ok(big / 1000.0 >= 24.0 and big / 1000.0 <= 36.0, "1000 other fights: the average %.1f s is close to the 25 to 35 band" % (big / 1000.0))


# --- acceptance 4: one data file, changed live with keys, printed -------------

func _one_data_file(scene: PackedScene) -> void:
	var data := _fight_data()
	for k in ["health", "damage", "hit_chance", "swing_seconds"]:
		ok(data.has(k), "data: fight_data.json has %s" % k)
	ok(int(data["health"]) == 40 and int(data["damage"]) == 5 and is_equal_approx(float(data["hit_chance"]), 0.5) and is_equal_approx(float(data["swing_seconds"]), 2.0), "data: the starting numbers are D165's (40 health, 5 damage, 50%, every 2 s)")
	# The file drives the sim: one sure hit of 40 ends the fight at the first impact.
	var d2 := data.duplicate(true)
	d2["hit_chance"] = 1.0
	d2["damage"] = 40
	var f := Fight.new(d2, 1)
	var len := f.run_to_end(DT)
	ok(absf(len - float(d2["impact_seconds"])) < 0.03 and f.fighters["dummy"]["alive"] == false, "data: with 100%% to hit and 40 damage the human kills at the first impact (%.2f s)" % len)
	var d3 := data.duplicate(true)
	d3["hit_chance"] = 0.0
	var g := Fight.new(d3, 1)
	for i in 60 * 60:
		g.tick(DT)
	ok(not g.over and g.fighters["human"]["health"] == 40 and g.fighters["dummy"]["health"] == 40, "data: with 0%% to hit nobody is ever hurt")


func _live_keys(scene: PackedScene) -> void:
	var p := await _make(scene, 1)
	var keys: Array = p.fight_data["keys"]
	var seen := {}
	for k in keys:
		seen[k["setting"]] = true
		var before: float = p.fight_data[k["setting"]]
		_key(p, OS.find_keycode_from_string(k["up"]))
		var up: float = p.fight_data[k["setting"]]
		_key(p, OS.find_keycode_from_string(k["down"]))
		_key(p, OS.find_keycode_from_string(k["down"]))
		var down: float = p.fight_data[k["setting"]]
		p._update_hud()
		ok(up > before and down < before and p._hud.text.contains(k["label"]), "keys: %s/%s change %s live (%s, %s, %s) and it is printed" % [k["up"], k["down"], k["setting"], str(before), str(up), str(down)])
		_key(p, OS.find_keycode_from_string(k["up"]))
	for need in ["health", "damage", "hit_chance", "swing_seconds"]:
		ok(seen.has(need), "keys: %s has a key pair" % need)
	# A change mid-fight takes effect at once: swing time 2.0 -> 1.0 by data, the next swing follows it.
	p.fight_data["swing_seconds"] = 2.0
	p.click_dummy()
	_until(p, func(): return p.fight.active)
	var swings: Array[float] = []
	p.fight_event.connect(func(ev: Dictionary) -> void:
		if ev["type"] == "swing" and ev["who"] == "human":
			swings.append(ev["time"]))
	_until(p, func(): return swings.size() >= 1)
	_key(p, OS.find_keycode_from_string("K"))   # swing_seconds down
	var s_now: float = p.fight_data["swing_seconds"]
	_until(p, func(): return swings.size() >= 2 or p.fight.over)
	ok(swings.size() >= 2 and absf(swings[1] - swings[0] - s_now) < 0.002, "keys: a swing time changed mid-fight is used by the next swing (%.2f s)" % (swings[1] - swings[0] if swings.size() >= 2 else -1.0))
	_drop(p)
	# Health: the live change keeps the fight going and moves the bar's maximum.
	var q := await _make(scene, 1)
	var hp: int = q.fight_data["health"]
	_key(q, OS.find_keycode_from_string("X"))
	ok(int(q.fight_data["health"]) > hp and q.fight.fighters["human"]["max"] == int(q.fight_data["health"]) and q.fight.fighters["dummy"]["health"] == int(q.fight_data["health"]), "keys: more health raises the maximum and the current health of both")
	_drop(q)


# --- acceptance 5: R brings both back at full health where they started -------

func _reset(scene: PackedScene) -> void:
	var p := await _make(scene, 1)
	var start: Vector2i = p.cell
	var dcell: Vector2i = p.dummy_cell
	p.click_dummy()
	_until(p, func(): return p.fight.over)
	var dead_one: String = "human" if not p.fight.fighters["human"]["alive"] else "dummy"
	var dead_char: Node2D = p.human if dead_one == "human" else p.dummy
	ok(dead_char.anim == "Die" and p.cell != start, "reset: after the fight one is dead (%s) and the human has moved" % dead_one)
	_key(p, KEY_R)
	var f: Dictionary = p.fight.fighters
	ok(f["human"]["health"] == int(p.fight_data["health"]) and f["dummy"]["health"] == int(p.fight_data["health"]) and f["human"]["alive"] and f["dummy"]["alive"], "reset: R puts both back at full health")
	ok(p.cell == start and p.human.position == p.world.cell_to_world(Vector2(start)) and p.dummy_cell == dcell and p.dummy.position == p.world.cell_to_world(Vector2(dcell)), "reset: both are back where they started")
	ok(not p.fight.active and not p.fight.over and p.fight.t == 0.0 and p.human.anim == "Idle" and p.dummy.anim == "Idle", "reset: no fight running, timer at 0, both standing")
	# And a second fight works.
	p.click_dummy()
	_until(p, func(): return p.fight.active)
	ok(p.fight.active, "reset: the dummy can be fought again")
	# R in the middle of a fight too.
	p.tick(5.0)
	_key(p, KEY_R)
	ok(not p.fight.active and p.cell == start and p.fight.fighters["human"]["health"] == int(p.fight_data["health"]), "reset: R in the middle of a fight stops it")
	# A dead human: clicks do nothing until R.
	p.fight.fighters["human"]["alive"] = false
	p.fight.fighters["human"]["health"] = 0
	p.human.play("Die", false)
	p.click_dummy()
	ok(not p.attack_pending and p.path.is_empty(), "dead human: a click on the dummy does nothing")
	_drop(p)


# --- PRO-005 review: the idle animation is not forced every frame -------------

func _idle_not_forced(scene: PackedScene) -> void:
	var p := await _make(scene, 1)
	p.click_dummy()
	_until(p, func(): return p.fight.active)
	var swung := [false]
	p.fight_event.connect(func(ev: Dictionary) -> void:
		if ev["type"] == "swing" and ev["who"] == "human":
			swung[0] = true)
	_until(p, func(): return swung[0])
	p.tick(DT * 5.0)
	ok(p.human.anim == "Attack1", "the standing human keeps its swing: play does not force Idle each frame (anim %s)" % p.human.anim)
	# A walk that ends sets Idle once.
	var q := await _make(scene, 1)
	var target: Vector2i = q.cell + Vector2i(0, 2)
	if q.click_cell(target) != "ok":
		target = q.cell + Vector2i(2, 0)
		q.click_cell(target)
	_until(q, func(): return not q.moving and q.path.is_empty())
	ok(q.human.anim == "Idle" and q.cell == target, "a walk that ends sets Idle once")
	_drop(q)
	_drop(p)


# --- PRO-005 review: corner rule default and the key that switches it --------

func _corner_rule_default(scene: PackedScene) -> void:
	var data: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://play/play_data.json"))
	ok(data["diagonal_needs_both_sides_free"] == false, "corners: the default follows D185 (no step between two blocked tiles only)")
	var p := await _make(scene, 1)
	ok(not p.pathfinder.strict_corners, "corners: the play scene starts with the D185 rule")
	_key(p, KEY_G)
	ok(p.pathfinder.strict_corners, "corners: G switches to the stricter rule (both tiles beside a diagonal step free)")
	p._update_hud()
	ok(p._hud.text.contains("strict"), "corners: the screen prints which rule is on")
	_key(p, KEY_G)
	ok(not p.pathfinder.strict_corners, "corners: G switches back")
	_drop(p)
