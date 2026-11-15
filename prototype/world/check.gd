extends SceneTree
## Headless checks for PRO-002 (no GUT in the test game, D201):
##   scripts/godot.sh --headless --path prototype --script res://world/check.gd
## Prints one line per acceptance and exits 1 if any failed.
## The pictures themselves are checked by shots, see the end of this file.

var failures := 0


func ok(cond: bool, what: String) -> void:
	if cond:
		print("ok   ", what)
	else:
		print("FAIL ", what)
		failures += 1


func _init() -> void:
	var scene: PackedScene = load("res://world/world.tscn")
	if scene == null:
		print("FAIL world scene missing")
		quit(1)
		return
	_patch_and_building()
	await _determinism(scene)
	await _depth(scene)
	await _door(scene)
	_tile_flags()
	print("")
	print("FAILED: %d" % failures if failures > 0 else "ALL OK")
	quit(1 if failures > 0 else 0)


func _make(scene: PackedScene, seed_in: int, markers := false) -> World:
	var w: World = scene.instantiate()
	w.seed_override = seed_in
	root.add_child(w)
	await process_frame
	return w


func _patch_and_building() -> void:
	var g := WorldGen.new(1)
	ok(g.size == 30 and g.tiles.size() == 900, "seed 1: the patch is 30 by 30 tiles")
	var kinds := {}
	for c in g.tiles:
		kinds[g.tiles[c].ground] = true
	ok(kinds.size() >= 3, "seed 1: mixed ground (%d kinds)" % kinds.size())
	ok(g.trees.size() >= 20, "seed 1: scattered trees (%d)" % g.trees.size())
	ok(g.rocks.size() >= 5, "seed 1: scattered rocks (%d)" % g.rocks.size())
	var inside: Array[Vector2i] = []
	var doors := 0
	var walls := 0
	for c in g.tiles:
		var t: WorldTile = g.tiles[c]
		if t.inside:
			inside.append(c)
		if t.kind == "door":
			doors += 1
		if t.kind == "wall" or t.kind == "window":
			walls += 1
	var rect := Rect2i(inside[0], Vector2i.ONE)
	for c in inside:
		rect = rect.expand(c).expand(c + Vector2i.ONE)
	ok(inside.size() == 20 and rect.size == Vector2i(5, 4), "seed 1: one building of 5 by 4 tiles")
	ok(doors == 1, "seed 1: one door")
	ok(walls == 13, "seed 1: walled all round (13 wall pieces + the door = the 14 tiles of the ring)")
	var kinds_seen := {}
	for c in g.tiles:
		kinds_seen[g.tiles[c].kind] = true
	ok(not kinds_seen.has("roof"), "seed 1: no roof")


func _signature(w: World) -> String:
	var parts := PackedStringArray()
	for layer in ["Ground", "Shadows", "Objects"]:
		for s in w.get_node(layer).get_children():
			var art: Sprite2D = s if s is Sprite2D else s.get_node("Sprite")
			parts.append("%s %s %s" % [layer, art.texture.resource_path, s.position])
	return "\n".join(parts).sha256_text()


func _determinism(scene: PackedScene) -> void:
	var a := await _make(scene, 1)
	var sa := _signature(a)
	var fa := a.gen.fingerprint()
	a.queue_free()
	await process_frame
	var b := await _make(scene, 1)
	ok(_signature(b) == sa and b.gen.fingerprint() == fa, "seed 1 twice: same tiles and same drawn pieces")
	b.queue_free()
	await process_frame
	var c := await _make(scene, 2)
	ok(_signature(c) != sa and c.gen.fingerprint() != fa, "seed 2: a different patch")
	c.queue_free()
	await process_frame


## Godot sorts a node by its own y.
func _key(h: Node2D) -> float:
	return h.position.y


## The drawn (non-transparent) rectangle of a piece, in world pixels.
func _drawn(h: Node2D) -> Rect2:
	var s: Sprite2D = h.get_node("Sprite")
	var used := Rect2(s.texture.get_image().get_used_rect())
	return Rect2(used.position + s.offset + s.position + h.position, used.size)


func _depth(scene: PackedScene) -> void:
	var w := await _make(scene, 1)
	var m := w.place_test_markers()
	for which in ["wall", "tree"]:
		var piece: Node2D = m[which]
		var behind: Node2D = m[which + "_behind"]
		var front: Node2D = m[which + "_front"]
		ok(piece != null, "%s: found the piece to test" % which)
		if piece == null:
			continue
		ok(_drawn(behind).intersects(_drawn(piece)) and _drawn(front).intersects(_drawn(piece)),
			"%s: both markers overlap the piece on screen" % which)
		ok(_key(behind) < _key(piece), "%s: the marker behind is drawn before it (hidden)" % which)
		ok(_key(front) > _key(piece), "%s: the marker in front is drawn after it (hides it)" % which)
		ok(piece.get_parent() == behind.get_parent() and behind.get_parent().y_sort_enabled,
			"%s: all share one y-sorted layer" % which)
	w.queue_free()
	await process_frame


func _door(scene: PackedScene) -> void:
	var w := await _make(scene, 1)
	var cell := w.gen.door_cell
	var at := w.cell_to_world(Vector2(cell))
	ok(w.door_sprite.visible and not w.door_open and w.gen.tile(cell).blocks_sight, "door starts closed, drawn, blocking sight")
	ok(not w.handle_click(w.cell_to_world(Vector2(0, 0))), "a click away from the door does nothing")
	ok(w.door_sprite.visible, "door still drawn after a click elsewhere")
	# A click on a drawn pixel of the door.
	var dsprite: Sprite2D = w.door_sprite.get_node("Sprite")
	var used := dsprite.texture.get_image().get_used_rect()
	var px := Vector2(used.position) + Vector2(used.size) / 2.0
	var on_door := w.door_sprite.position + dsprite.position - World.ANCHOR + px
	ok(w.handle_click(on_door), "first click on the door piece is taken")
	ok(not w.door_sprite.visible and w.door_open, "first click: the door is open and its piece is no longer drawn")
	ok(not w.gen.tile(cell).blocks_sight and not w.gen.tile(cell).blocks_walk, "open door blocks neither sight nor walking")
	ok(w.handle_click(at), "second click (the empty doorway) is taken")
	ok(w.door_sprite.visible and not w.door_open, "second click: the door is closed and drawn again")
	ok(w.gen.tile(cell).blocks_sight and not w.gen.tile(cell).blocks_walk, "closed door blocks sight, never a walk (D191)")
	w.queue_free()
	await process_frame


func _tile_flags() -> void:
	var g := WorldGen.new(1)
	var walk_only := 0
	var sight_only := 0
	var both := 0
	var bad := 0
	var valid_ground := ["grass", "dark_grass", "dirt", "pebbles"]
	for c in g.tiles:
		var t: WorldTile = g.tiles[c]
		if not valid_ground.has(t.ground):
			bad += 1
		if t.blocks_walk and not t.blocks_sight:
			walk_only += 1
		elif t.blocks_sight and not t.blocks_walk:
			sight_only += 1
		elif t.blocks_walk and t.blocks_sight:
			both += 1
		match t.kind:
			"wall", "window", "tree", "rock_big":
				if not (t.blocks_walk and t.blocks_sight):
					bad += 1
			"rock_small":
				if not (t.blocks_walk and not t.blocks_sight):
					bad += 1
			"door":
				if t.blocks_walk or not t.blocks_sight or not t.inside:
					bad += 1
			"":
				if t.blocks_walk or t.blocks_sight:
					bad += 1
		if t.kind in ["tree", "rock_small", "rock_big"] and t.inside:
			bad += 1
	ok(bad == 0, "every tile has a valid ground kind and flags that match what stands on it")
	ok(both > 0 and walk_only > 0 and sight_only > 0, "walking and sight are separate flags (both %d, walk only %d, sight only %d)" % [both, walk_only, sight_only])

# Pictures (need a window, not headless); look at prototype/shots/. Seed 1 puts the
# door on the south-west wall, the wall markers on the south-east wall at tile 20,19
# and the free tree at tile 24,18 (--center takes tile x,y):
#   R="scripts/godot.sh --path prototype res://world/world.tscn"
#   $R --shot world_overview.png --zoom 0.33          the whole 30 by 30 patch
#   $R --shot world_building.png                      the building close up
#   $R --shot seed2.png --seed 2 --zoom 0.33          a different patch
#   $R --shot seed1_a.png ; $R --shot seed1_b.png     then cmp: same file
#   $R --shot door_open.png --open-door               the empty doorway
#   $R --shot markers_wall.png --markers --center 20,19 --zoom 1.5
#   $R --shot markers_tree.png --markers --center 24,18 --zoom 1.5
#   add --bare to the two marker lines to hide the wall/tree and see both markers
