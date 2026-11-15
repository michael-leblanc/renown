extends SceneTree
## Headless checks for PRO-005 (no GUT in the test game, D201):
##   scripts/godot.sh --headless --path prototype --script res://play/check.gd
## Prints one line per acceptance and exits 1 if any failed. The pictures are
## checked by shots, see play/README.md.

const DT := 1.0 / 60.0

var failures := 0


func ok(cond: bool, what: String) -> void:
	if cond:
		print("ok   ", what)
	else:
		print("FAIL ", what)
		failures += 1


func _init() -> void:
	var scene: PackedScene = load("res://play/play.tscn")
	if scene == null:
		print("FAIL play scene missing")
		quit(1)
		return
	await _stands_and_camera(scene)
	await _shortest_and_facing(scene)
	await _corners(scene)
	await _door(scene)
	await _speed(scene)
	await _unreachable(scene)
	print("")
	print("FAILED: %d" % failures if failures > 0 else "ALL OK")
	quit(1 if failures > 0 else 0)


## A fresh play scene on a seed, with its own process switched off so the checks
## decide how much time passes.
func _make(scene: PackedScene, seed_in := 1) -> Node2D:
	var p: Node2D = scene.instantiate()
	p.seed_override = seed_in
	root.add_child(p)
	await process_frame
	p.set_process(false)
	# These checks are about the strict corner rule (see _corners); the shipped
	# default is D185's own (fight/check.gd checks that one).
	p.pathfinder.strict_corners = true
	p.pathfinder.relabel()
	return p


func _drop(p: Node) -> void:
	root.remove_child(p)
	p.free()


## Run the walk until the human stands still. Returns the seconds it took.
func _walk_out(p: Node2D, cap := 120.0) -> float:
	var t := 0.0
	while (p.moving or not p.path.is_empty()) and t < cap:
		p.tick(DT)
		t += DT
	return t


## Independent shortest step count: plain breadth first search, written here
## from the rule (not from pathfinder.gd). -1 when there is no way.
func _bfs_steps(gen: WorldGen, from: Vector2i, to: Vector2i, strict: bool) -> int:
	var dist := {from: 0}
	var queue: Array[Vector2i] = [from]
	var head := 0
	while head < queue.size():
		var c := queue[head]
		head += 1
		if c == to:
			return dist[c]
		for dx in range(-1, 2):
			for dy in range(-1, 2):
				if dx == 0 and dy == 0:
					continue
				var n := c + Vector2i(dx, dy)
				if dist.has(n) or not _free(gen, n):
					continue
				if dx != 0 and dy != 0:
					var a := _free(gen, c + Vector2i(dx, 0))
					var b := _free(gen, c + Vector2i(0, dy))
					if (strict and not (a and b)) or (not strict and not (a or b)):
						continue
				dist[n] = dist[c] + 1
				queue.append(n)
	return -1


func _free(gen: WorldGen, c: Vector2i) -> bool:
	var t := gen.tile(c)
	return t != null and not t.blocks_walk


func _free_cells(gen: WorldGen) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	for y in gen.size:
		for x in gen.size:
			if _free(gen, Vector2i(x, y)):
				out.append(Vector2i(x, y))
	return out


# --- acceptance 1: stands in the seeded patch, camera follows ----------------

func _stands_and_camera(scene: PackedScene) -> void:
	var p := await _make(scene, 1)
	var gen: WorldGen = p.world.gen
	var again := WorldGen.new(1)
	ok(gen.fingerprint() == again.fingerprint(), "play scene: the patch is the seeded patch of PRO-002 (seed 1)")
	ok(_free(gen, p.cell) and not gen.tile(p.cell).inside, "play scene: the human stands on a free tile outside the building")
	ok(p.human.get_parent() == p.world.objects, "play scene: the human is in the world's y-sorted layer")
	ok(p.human.position == p.world.cell_to_world(Vector2(p.cell)), "play scene: the human is drawn on its tile")
	ok(not p.world.is_processing() and not p.world.is_processing_unhandled_input(), "play scene: the world's own input and panning are off")
	ok(p.get_viewport().get_camera_2d() == p.camera, "play scene: the play camera is the current camera")
	var before: Vector2 = p.camera.position
	var start_cell: Vector2i = p.cell
	var target := Vector2i(-1, -1)
	for c in _free_cells(gen):
		if maxi(absi(c.x - start_cell.x), absi(c.y - start_cell.y)) == 5 and p.pathfinder.area_of(c) == p.pathfinder.area_of(start_cell):
			target = c
			break
	p.click_cell(target)
	p.tick(1.0)
	var off: Array = p.settings["camera_offset"]
	ok(p.camera.position != before and p.camera.position.is_equal_approx(p.human.position + Vector2(off[0], off[1])), "play scene: the camera follows the human as it walks")
	var p2 := await _make(scene, 1)
	ok(p2.cell == start_cell, "play scene: same seed, same start tile")
	_drop(p2)
	_drop(p)


# --- acceptance 2: shortest path, 8 directions -------------------------------

func _shortest_and_facing(scene: PackedScene) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var bad_len := 0
	var bad_face := 0
	var bad_end := 0
	var bad_cell := 0
	var walks := 0
	var dirs_seen := {}
	for seed_in in [1, 2, 3]:
		var p := await _make(scene, seed_in)
		var gen: WorldGen = p.world.gen
		var cells := _free_cells(gen)
		for k in 12:
			var from: Vector2i = p.cell
			var target: Vector2i = cells[rng.randi_range(0, cells.size() - 1)]
			var want := _bfs_steps(gen, from, target, true)
			var res: String = p.click_cell(target)
			if want <= 0:
				continue   # same tile or no way: other checks cover it
			walks += 1
			if res != "ok" or p.path.size() != want:
				bad_len += 1
				continue
			var prev := from
			var walked: Array[Vector2i] = []
			# Step through the walk one tile at a time and look at the facing.
			while p.moving or not p.path.is_empty():
				p.tick(DT)
				if p.moving:
					var step: Vector2i = p.step_to - p.step_from
					var d: int = p.human.direction
					var table: Array = p.char_data["direction_grid_step"]
					dirs_seen[d] = true
					if int(table[d][0]) != step.x or int(table[d][1]) != step.y or p.human.anim != "Walk":
						bad_face += 1
					if walked.is_empty() or walked[walked.size() - 1] != p.step_to:
						walked.append(p.step_to)
						if not _free(gen, p.step_to) or maxi(absi(p.step_to.x - prev.x), absi(p.step_to.y - prev.y)) != 1:
							bad_cell += 1
						prev = p.step_to
			if p.cell != target or p.human.anim != "Idle":
				bad_end += 1
		_drop(p)
	ok(walks >= 20 and bad_len == 0, "click on a free tile: the path is the shortest (%d walks, same step count as an independent search)" % walks)
	ok(bad_cell == 0, "click on a free tile: every step is onto a free tile, one tile away (so walls, trees and rocks are walked around)")
	ok(bad_face == 0 and dirs_seen.size() == 8, "click on a free tile: the human faces the way it moves (%d of 8 directions seen)" % dirs_seen.size())
	ok(bad_end == 0, "click on a free tile: the human arrives on the tile and stands")


# --- acceptance 3: no corner cutting -----------------------------------------

func _corners(scene: PackedScene) -> void:
	var p := await _make(scene, 1)
	var gen: WorldGen = p.world.gen
	var pf: Pathfinder = p.pathfinder
	# A made-up case on open ground: two blocked tiles touching at a corner.
	var open := Vector2i(-1, -1)
	for c in _free_cells(gen):
		var all_free := true
		for dx in range(-3, 4):
			for dy in range(-3, 4):
				if not _free(gen, c + Vector2i(dx, dy)):
					all_free = false
		if all_free:
			open = c
			break
	ok(open.x >= 0, "corner: found open ground for the made-up case")
	var b1 := open + Vector2i(1, 0)
	var b2 := open + Vector2i(0, 1)
	gen.tile(b1).blocks_walk = true
	gen.tile(b2).blocks_walk = true
	pf.relabel()
	var through := pf.find_path(open, open + Vector2i(1, 1))
	var squeezed := through.size() == 1
	ok(not squeezed and through.size() > 1, "corner: a path never squeezes diagonally between two blocked tiles (%d steps round)" % through.size())
	# Past the corner of ONE blocked tile: strict (default) keeps off it too, the literal D185 reading allows it.
	gen.tile(b2).blocks_walk = false
	pf.relabel()
	var strict_path := pf.find_path(open, open + Vector2i(1, 1))
	ok(strict_path.size() == 2, "corner: strict rule: past one blocked tile's corner the human goes round (2 steps, not 1)")
	pf.strict_corners = false
	var loose_path := pf.find_path(open, open + Vector2i(1, 1))
	ok(loose_path.size() == 1, "corner: with the literal D185 rule only a gap between two blocked tiles is closed")
	pf.strict_corners = true
	gen.tile(b1).blocks_walk = false
	pf.relabel()
	# On every path in the real patches no diagonal step has a blocked tile beside it.
	var rng := RandomNumberGenerator.new()
	rng.seed = 11
	var cut := 0
	var checked_diag := 0
	for seed_in in [1, 2, 3, 4]:
		var q := await _make(scene, seed_in)
		var cells := _free_cells(q.world.gen)
		for k in 25:
			var from: Vector2i = cells[rng.randi_range(0, cells.size() - 1)]
			var to: Vector2i = cells[rng.randi_range(0, cells.size() - 1)]
			var route: Array[Vector2i] = q.pathfinder.find_path(from, to)
			var at := from
			for c in route:
				var d := c - at
				if d.x != 0 and d.y != 0:
					checked_diag += 1
					if not (_free(q.world.gen, at + Vector2i(d.x, 0)) and _free(q.world.gen, at + Vector2i(0, d.y))):
						cut += 1
				at = c
		_drop(q)
	ok(cut == 0 and checked_diag > 50, "corner: no diagonal step in %d walked diagonals has a blocked tile beside it" % checked_diag)
	_drop(p)


# --- acceptance 4: the closed door never blocks, and opens ------------------

func _door(scene: PackedScene) -> void:
	for seed_in in [1, 2, 3, 4]:
		var p := await _make(scene, seed_in)
		var gen: WorldGen = p.world.gen
		var door := gen.door_cell
		var inner := door + (Vector2i(0, -1) if gen.door_side == "S" else Vector2i(-1, 0))
		var label := "seed %d" % seed_in
		ok(not p.world.door_open and not gen.tile(door).blocks_walk, "door (%s): closed at the start, and the tile does not block walking" % label)
		var res: String = p.click_cell(inner)
		ok(res == "ok" and p.path.has(door), "door (%s): the way into the building goes through the closed door (%d steps)" % [label, p.path.size()])
		var opened_early := false
		var opened_when_next := false
		var seen_door := false
		var t := 0.0
		while (p.moving or not p.path.is_empty()) and t < 60.0:
			var was_open: bool = p.world.door_open
			p.tick(DT)
			t += DT
			if p.world.door_open and not was_open:
				opened_when_next = (p.step_to == door and p.moving)
			if not p.world.door_open and p.cell == door:
				opened_early = true
			if p.cell == door or p.step_to == door:
				seen_door = true
		ok(opened_when_next and not opened_early, "door (%s): it opens as the human steps to it, not before" % label)
		ok(seen_door and p.cell == inner and p.world.door_open, "door (%s): the human walks through and stands inside" % label)
		ok(not p.world.door_sprite.visible, "door (%s): an open door is an empty doorway (the piece is hidden)" % label)
		# The mouse clicks the play scene routes itself.
		var door_pos: Vector2 = p.world.cell_to_world(Vector2(door))
		ok(p.toggle_door_at(door_pos) and not p.world.door_open, "door (%s): right click on the door closes it" % label)
		ok(p.toggle_door_at(door_pos) and p.world.door_open, "door (%s): right click on the door opens it" % label)
		ok(not p.toggle_door_at(p.world.cell_to_world(Vector2(door + Vector2i(0, 3)))), "door (%s): right click elsewhere does nothing" % label)
		_drop(p)


# --- acceptance 5: walk time per tile, live ---------------------------------

func _key(p: Node2D, keycode: int) -> void:
	var ev := InputEventKey.new()
	ev.keycode = keycode
	ev.pressed = true
	p._unhandled_input(ev)


## A straight run of free tiles along x, `n` long, with a free row either side so
## nothing is near a corner.
func _corridor(gen: WorldGen, n: int) -> Array[Vector2i]:
	for y in range(1, gen.size - 1):
		for x in range(0, gen.size - n):
			var good := true
			for i in n:
				for dy in range(-1, 2):
					if not _free(gen, Vector2i(x + i, y + dy)):
						good = false
			if good:
				var out: Array[Vector2i] = []
				for i in n:
					out.append(Vector2i(x + i, y))
				return out
	return []


func _timed_walk(scene: PackedScene, tiles: int, key_after: float, keys: Array) -> Array:
	var p := await _make(scene, 1)
	var run := _corridor(p.world.gen, tiles + 1)
	p.cell = run[0]
	p.human.position = p.world.cell_to_world(Vector2(p.cell))
	p.click_cell(run[tiles])
	var t := 0.0
	var pressed := key_after < 0.0
	var speed_mid := 0.0
	while p.moving or not p.path.is_empty():
		if not pressed and t >= key_after:
			for k in keys:
				_key(p, k)
			pressed = true
		p.tick(DT)
		t += DT
		if absf(t - 1.0) < DT / 2.0:
			speed_mid = p.measured_speed
		if t > 60.0:
			break
	var hud: String = p._hud.text
	var arrived: bool = p.cell == run[tiles]
	var secs: float = p.tile_seconds()
	_drop(p)
	return [t, speed_mid, hud, arrived, secs]


func _speed(scene: PackedScene) -> void:
	var data: Dictionary = load("res://character/character_scene.gd").load_data()
	ok(is_equal_approx(float(data["tile_seconds"]), 0.3), "speed: the walk time per tile starts at 0.3 seconds (D185)")
	var r: Array = await _timed_walk(scene, 9, -1.0, [])
	ok(r[3] and absf(r[0] - 9 * 0.3) < 0.05, "speed: 9 tiles take 9 x 0.3 s (took %.2f s)" % r[0])
	ok(absf(r[1] - 1.0 / 0.3) < 0.1, "speed: measured tiles a second is 3.3 (%.2f)" % r[1])
	ok(r[2].contains("0.30 s = 3.3 tiles a second"), "speed: the screen prints 0.30 s = 3.3 tiles a second")
	# One press of ] raises the time by the step: 0.35 s, 2.9 tiles a second.
	r = await _timed_walk(scene, 9, 0.0, [KEY_BRACKETRIGHT])
	ok(r[3] and absf(r[4] - 0.35) < 0.0001 and absf(r[0] - 9 * 0.35) < 0.05, "speed: ] raises the walk time to 0.35 s and 9 tiles take %.2f s" % r[0])
	ok(r[2].contains("0.35 s = 2.9 tiles a second"), "speed: the screen prints 0.35 s = 2.9 tiles a second")
	r = await _timed_walk(scene, 9, 0.0, [KEY_BRACKETLEFT, KEY_MINUS])
	ok(r[3] and absf(r[4] - 0.2) < 0.0001 and absf(r[0] - 9 * 0.2) < 0.05, "speed: [ and - lower it to 0.20 s and 9 tiles take %.2f s" % r[0])
	ok(r[2].contains("0.20 s = 5.0 tiles a second"), "speed: the screen prints 0.20 s = 5.0 tiles a second")
	# Live: 1 s at 0.3 s a tile (3.33 tiles done), then two presses to 0.2 s: the other 5.67 tiles take 1.13 s.
	r = await _timed_walk(scene, 9, 1.0, [KEY_BRACKETLEFT, KEY_BRACKETLEFT])
	var expect := 1.0 + (9.0 - 1.0 / 0.3) * 0.2
	ok(r[3] and absf(r[0] - expect) < 0.06, "speed: changed in the middle of a walk it takes effect at once (took %.2f s, expected %.2f s)" % [r[0], expect])
	# Limits.
	var p := await _make(scene, 1)
	for i in 60:
		_key(p, KEY_BRACKETLEFT)
	ok(p.tile_seconds() >= p.settings["tile_seconds_min"] - 0.0001 and p.tile_seconds() > 0.0, "speed: the walk time stops at the lowest setting")
	for i in 100:
		_key(p, KEY_BRACKETRIGHT)
	ok(p.tile_seconds() <= p.settings["tile_seconds_max"] + 0.0001, "speed: the walk time stops at the highest setting")
	_drop(p)


# --- acceptance 6: an unreachable click --------------------------------------

func _unreachable(scene: PackedScene) -> void:
	var p := await _make(scene, 1)
	var gen: WorldGen = p.world.gen
	var pf: Pathfinder = p.pathfinder
	# Wall in one free tile with blocked tiles on all 8 sides.
	var spot := Vector2i(-1, -1)
	for c in _free_cells(gen):
		if c.x > 2 and c.y > 2 and c.x < gen.size - 3 and c.y < gen.size - 3 and pf.area_of(c) == pf.area_of(p.cell):
			var clear := true
			for dx in range(-1, 2):
				for dy in range(-1, 2):
					if gen.tile(c + Vector2i(dx, dy)).kind != "" or gen.tile(c + Vector2i(dx, dy)).inside:
						clear = false
			if clear:
				spot = c
				break
	ok(spot.x >= 0, "unreachable: found a free tile to wall in")
	for dx in range(-1, 2):
		for dy in range(-1, 2):
			if dx != 0 or dy != 0:
				gen.tile(spot + Vector2i(dx, dy)).blocks_walk = true
	pf.relabel()
	ok(pf.area_of(spot) != pf.area_of(p.cell), "unreachable: the walled-in tile is in another area (D187)")
	var before_cell: Vector2i = p.cell
	var before_pos: Vector2 = p.human.position
	var msec := Time.get_ticks_msec()
	var res: String = p.click_cell(spot)
	var took := Time.get_ticks_msec() - msec
	ok(res == "unreachable" and pf.last_expanded == 0, "unreachable: a click on it is refused at once with no search (%d tiles searched)" % pf.last_expanded)
	p.tick(2.0)
	ok(p.cell == before_cell and not p.moving and p.path.is_empty() and p.human.position == before_pos, "unreachable: the human does not move")
	ok(took < 200, "unreachable: it did not hang (%d ms)" % took)
	# Blocked tiles and outside the patch.
	var tree: Vector2i = gen.trees[0]
	ok(p.click_cell(tree) == "blocked" and p.path.is_empty(), "unreachable: a click on a tree is refused")
	var wall := gen.building_origin
	ok(p.click_cell(wall) == "blocked" and p.path.is_empty(), "unreachable: a click on a wall is refused")
	ok(p.click_cell(Vector2i(-5, 3)) == "outside" and p.click_cell(Vector2i(40, 40)) == "outside", "unreachable: a click outside the patch is refused")
	ok(p.click_cell(before_cell) == "here", "unreachable: a click on the tile the human stands on does nothing")
	# While walking a refused click leaves the walk as it was.
	var free_target := Vector2i(-1, -1)
	for c in _free_cells(gen):
		if pf.area_of(c) == pf.area_of(p.cell) and maxi(absi(c.x - p.cell.x), absi(c.y - p.cell.y)) >= 6:
			free_target = c
			break
	p.click_cell(free_target)
	p.tick(0.5)
	var left: int = p.path.size()
	p.click_cell(spot)
	ok(p.path.size() == left and p.moving, "unreachable: a refused click while walking leaves the walk as it was")
	_walk_out(p)
	ok(p.cell == free_target, "unreachable: and the human still arrives")
	# A search that does run is quick.
	var q := await _make(scene, 1)
	var cells := _free_cells(q.world.gen)
	var worst := 0
	for k in 40:
		var a: Vector2i = cells[(k * 37) % cells.size()]
		var b: Vector2i = cells[(k * 91 + 5) % cells.size()]
		var t0 := Time.get_ticks_msec()
		q.pathfinder.find_path(a, b)
		worst = maxi(worst, Time.get_ticks_msec() - t0)
	ok(worst < 100, "walks: the slowest of 40 searches took %d ms" % worst)
	_drop(q)
	_drop(p)
