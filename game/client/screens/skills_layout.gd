class_name SkillsLayout
extends RefCounted
# The Skills screen's tree (D242, D243, D252), read from skills.json, which
# scripts/art/ui/skills_tree.mjs --pieces writes beside the pieces. Plain data: no
# nodes, so tests read it headless. Every place, size and number comes from the json
# (D175).
#
# It also works out what the screen shows for a character: which nodes are taken,
# open, locked or dark, the points left, and the route to a node. The page
# (skills_tree_page.mjs) does the same; change one, change the other. This is what the
# screen shows, never what the server decides (the json's rules note).
#
# A node's id is "<skill>/<key>" ("Swords/eK"); a material bead's key is m0, m1, ..
# A character is {levels: {skill: level}, taken: [id, ..], paid: {bridge id: skill}}.

var _j: Dictionary = {}
var skills: Array = [] # the json's skills, in wheel order
var by_name := {} # skill name -> its dictionary
var by_id := {} # id -> a node or bead dictionary, with "id", "skill" and "bead" added
var adj := {} # id -> [ids beside it], links and cross links both ways


static func load_file(path: String) -> SkillsLayout:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("skills screen: %s is not a JSON object" % path)
		return null
	return from_dict(parsed)


static func from_dict(j: Dictionary) -> SkillsLayout:
	for key in ["size", "view", "look", "scale", "pieces", "tree_pieces", "panel", "signs", "zoom", "timings", "tree", "look_of", "rules", "text", "panels"]:
		if not j.has(key):
			push_error("skills screen: the layout has no %s" % key)
			return null
	var layout := SkillsLayout.new()
	layout._j = j
	layout._index()
	return layout


func _index() -> void:
	skills = _j["tree"]["skills"]
	for s: Dictionary in skills:
		by_name[s["name"]] = s
		if not s.has("nodes"):
			continue
		for b: Dictionary in s["beads"]:
			b["id"] = "%s/%s" % [s["name"], b["key"]]
			b["skill"] = s["name"]
			b["bead"] = true
			by_id[b["id"]] = b
		for n: Dictionary in s["nodes"]:
			n["id"] = "%s/%s" % [s["name"], n["key"]]
			n["skill"] = s["name"]
			n["bead"] = false
			by_id[n["id"]] = n
	for s: Dictionary in skills:
		if not s.has("nodes"):
			continue
		for l: Array in s["links"]:
			_join("%s/%s" % [s["name"], l[0]], "%s/%s" % [s["name"], l[1]])
		for l: Array in s["cross"]:
			_join("%s/%s" % [s["name"], l[0]], str(l[1]))


func _join(a: String, b: String) -> void:
	if not by_id.has(a) or not by_id.has(b):
		push_error("skills screen: a strand to nowhere %s - %s" % [a, b])
		return
	if not adj.has(a):
		adj[a] = []
	if not adj.has(b):
		adj[b] = []
	adj[a].append(b)
	adj[b].append(a)


func j(key: String) -> Variant:
	return _j[key]


func size() -> Vector2:
	return _vec(_j["size"])


func view() -> Rect2:
	var v: Array = _j["view"]
	return Rect2(v[0], v[1], v[2], v[3])


func look() -> Vector2:
	return _vec(_j["look"])


func root() -> Vector2:
	return _vec(_j["tree"]["root"])


func zoom(key: String) -> Variant:
	return _j["zoom"][key]


# How long a movement takes, in seconds (D175): the json's "timings".
func timing(key: String) -> Variant:
	return _j["timings"][key]


func rule(key: String) -> Variant:
	return _j["rules"][key]


func colour(name: String) -> Color:
	return Color.html(_j["text"]["colours"][name])


func side_colour(fam: String) -> Color:
	return Color.html(_j["look_of"]["sides"][fam])


func face(name: String) -> Dictionary:
	return _j["text"]["faces"][name]


func font_names() -> Array:
	var names: Array = []
	for f: Dictionary in _j["text"]["faces"].values():
		if not names.has(f["font"]):
			names.append(f["font"])
	return names


# Every piece file the layout names, for checks.
func files() -> Array:
	var out: Array = [_j["panel"]["file"]]
	for name: String in _j["pieces"]:
		out.append(_j["pieces"][name]["file"])
	for name: String in _j["tree_pieces"]:
		out.append(_j["tree_pieces"][name]["file"])
	out.append_array(_j["signs"]["files"])
	return out


func is_web(skill: String) -> bool:
	return by_name[skill].has("nodes")


func is_later(skill: String) -> bool:
	return bool(by_name[skill]["later"])


func is_named(n: Dictionary) -> bool:
	return n.get("kind", "") == "node" or n.get("kind", "") == "notable"


func web_names() -> Array:
	var out: Array = []
	for s: Dictionary in skills:
		if s.has("nodes"):
			out.append(s["name"])
	return out


func hub(skill: String) -> Vector2:
	return _vec(by_name[skill]["hub"])


func at(id: String) -> Vector2:
	return _vec(by_id[id]["at"])


# Where a medallion takes the camera, and where "find" flies to.
func into(skill: String) -> Vector2:
	var s: Dictionary = by_name[skill]
	return _vec(s["into"]) if s.has("into") else hub(skill)


# ---------- a character ----------
func level(ch: Dictionary, skill: String) -> int:
	return int(ch.get("levels", {}).get(skill, 0))


func is_taken(ch: Dictionary, id: String) -> bool:
	return ch.get("taken", []).has(id)


# Who paid for a taken node: its own skill, or for a bridge the skill named in "paid".
func payer(ch: Dictionary, id: String) -> String:
	return str(ch.get("paid", {}).get(id, by_id[id]["skill"]))


# A point every "point_every" levels (D252); a later skill has none.
func earned(ch: Dictionary, skill: String) -> int:
	if is_later(skill) or not is_web(skill):
		return 0
	return level(ch, skill) / int(rule("point_every"))


func spent(ch: Dictionary, skill: String) -> int:
	var k := 0
	for id: String in ch.get("taken", []):
		if by_id.has(id) and payer(ch, id) == skill:
			k += 1
	return k


func free_points(ch: Dictionary, skill: String) -> int:
	return earned(ch, skill) - spent(ch, skill)


# Marks reached: one named node each, so 4 at most (D252, v1).
func marks(ch: Dictionary, skill: String) -> int:
	var k := 0
	for m: int in rule("marks"):
		if level(ch, skill) >= m:
			k += 1
	return k


func named_taken(ch: Dictionary, skill: String) -> int:
	var k := 0
	for n: Dictionary in by_name[skill]["nodes"]:
		if is_named(n) and is_taken(ch, n["id"]):
			k += 1
	return k


func total(ch: Dictionary) -> int:
	var t := 0
	for s: Dictionary in skills:
		t += level(ch, s["name"])
	return t


func bead_on(ch: Dictionary, b: Dictionary) -> bool:
	return not b["soon"] and level(ch, b["skill"]) >= int(b["level"])


# Lit for a strand: a bead reached, a node taken.
func is_on(ch: Dictionary, id: String) -> bool:
	var n: Dictionary = by_id[id]
	return bead_on(ch, n) if n["bead"] else is_taken(ch, id)


# A node can be reached when a node beside it is taken; its skill's first bead starts every route.
func reach(ch: Dictionary, id: String) -> bool:
	for a: String in adj.get(id, []):
		if _is_start(ch, a, by_id[id]["skill"]):
			return true
	return false


func _is_start(ch: Dictionary, id: String, skill: String) -> bool:
	return id == skill + "/m0" if by_id[id]["bead"] else is_taken(ch, id)


# Which skill pays for a bridge node: its own first, then the one it opens.
func pay_for(ch: Dictionary, id: String) -> String:
	var n: Dictionary = by_id[id]
	for s: String in [n["skill"], str(n.get("also", ""))]:
		if s != "" and not is_later(s) and level(ch, s) >= int(n["level"]) and free_points(ch, s) > 0:
			return s
	return ""


# "taken", "dark" (taken, but the skill dropped below its level), "open" or "locked".
func state_of(ch: Dictionary, id: String) -> String:
	var n: Dictionary = by_id[id]
	if n["bead"]:
		return "taken" if bead_on(ch, n) else "locked"
	if n["kind"] == "stub":
		return "locked"
	if is_taken(ch, id):
		return "taken" if level(ch, payer(ch, id)) >= int(n["level"]) else "dark"
	return "open" if why(ch, id) == "" else "locked"


# Why a node can't be taken now, or "".
func why(ch: Dictionary, id: String) -> String:
	var n: Dictionary = by_id[id]
	var s: String = n["skill"]
	var lv := int(n["level"])
	if n["kind"] == "bridge":
		if level(ch, s) < lv and level(ch, str(n["also"])) < lv:
			return "Needs %d in either" % lv
		if not reach(ch, id):
			return "No route to it yet"
		return "" if pay_for(ch, id) != "" else "No point to spend"
	if level(ch, s) < lv:
		return "Needs %s %d" % [s, lv]
	if not reach(ch, id):
		return "No route to it yet"
	if is_named(n) and named_taken(ch, s) >= marks(ch, s):
		return _next_mark(ch, s)
	if free_points(ch, s) <= 0:
		return "No %s point to spend" % s
	return ""


func _next_mark(ch: Dictionary, s: String) -> String:
	var m := marks(ch, s)
	var all: Array = rule("marks")
	return "Next named at %s %d" % [s, int(all[m])] if m < all.size() else "All %d named taken" % all.size()


# The shortest way from what is taken to a node: {path: [ids to take, in order], from,
# cost, ok, why}; {} when it is taken or has no way.
func route_to(ch: Dictionary, id: String) -> Dictionary:
	var n: Dictionary = by_id[id]
	if n["bead"] or n["kind"] == "stub" or is_taken(ch, id):
		return {}
	var s: String = n["skill"]
	var r := _search(ch, id, s, true)
	if r.is_empty():
		r = _search(ch, id, s, false)
	if r.is_empty():
		return {}
	var low := ""
	for x: String in r["path"]:
		var xn: Dictionary = by_id[x]
		var lv := int(xn["level"])
		if level(ch, s) < lv and not (xn["kind"] == "bridge" and level(ch, str(xn["also"])) >= lv):
			low = "Needs %s %d" % [s, lv]
			break
	r["cost"] = r["path"].size()
	if low != "":
		r["why"] = low
	elif is_named(n) and named_taken(ch, s) >= marks(ch, s):
		r["why"] = _next_mark(ch, s)
	elif free_points(ch, s) < int(r["cost"]):
		r["why"] = "Needs %d points, has %d" % [r["cost"], free_points(ch, s)]
	else:
		r["why"] = ""
	r["ok"] = r["why"] == ""
	return r


func _search(ch: Dictionary, id: String, s: String, strict: bool) -> Dictionary:
	var prev := {id: ""}
	var todo: Array = [id]
	while not todo.is_empty():
		var v: String = todo.pop_front()
		for a: String in adj.get(v, []):
			if prev.has(a):
				continue
			if _is_start(ch, a, s):
				var path: Array = []
				var x := v
				while x != "":
					path.append(x)
					x = prev[x]
				return {"from": a, "path": path}
			var an: Dictionary = by_id[a]
			if an["bead"] or is_named(an) or an["kind"] == "stub" or (strict and level(ch, s) < int(an["level"])):
				continue
			prev[a] = v
			todo.append(a)
	return {}


# A character with a node taken (for the screen to show what the server would accept).
func take(ch: Dictionary, id: String) -> Dictionary:
	if state_of(ch, id) != "open":
		return ch
	var out := ch.duplicate(true)
	if not out.has("taken"):
		out["taken"] = []
	out["taken"].append(id)
	if by_id[id]["kind"] == "bridge":
		if not out.has("paid"):
			out["paid"] = {}
		out["paid"][id] = pay_for(ch, id)
	return out


static func _vec(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
