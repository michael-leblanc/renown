extends SceneTree
# Loads every .gd file under res:// (outside addons/ and .godot/) in one process.
# Prints "BAD res://file.gd" for each script that fails to load; exit 1 if any.
# Run by scripts/check_parse.sh. Needed because --import and GUT both exit 0
# on a parse error in a script no test loads.


func _init() -> void:
	var bad := 0
	for path in _gd_files("res://"):
		var s = ResourceLoader.load(path, "", ResourceLoader.CACHE_MODE_IGNORE)
		if s == null or not s.can_instantiate():
			print("BAD ", path)
			bad += 1
	quit(1 if bad > 0 else 0)


func _gd_files(dir_path: String) -> Array[String]:
	var found: Array[String] = []
	var dir := DirAccess.open(dir_path)
	if dir == null:
		return found
	var names := Array(dir.get_files())
	names.sort()
	for n in names:
		if str(n).ends_with(".gd"):
			found.append(dir_path.path_join(n))
	var subs := Array(dir.get_directories())
	subs.sort()
	for d in subs:
		if dir_path == "res://" and (d == "addons" or d == ".godot"):
			continue
		found.append_array(_gd_files(dir_path.path_join(d)))
	return found
