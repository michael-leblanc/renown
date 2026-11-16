class_name PlayerId
extends RefCounted
# The id this game sends in its hello (D216). By default a random one, written on
# the first start to a file under user:// and read back on every later start, so
# the server gives the same character back. --player=NAME replaces it and writes
# nothing, so two games can run on one machine.

const FILE := "user://player_id.txt"
const BYTES := 8


static func resolve(args: PackedStringArray, path := FILE) -> String:
	for arg in args:
		if arg.begins_with("--player="):
			return arg.trim_prefix("--player=")
	if FileAccess.file_exists(path):
		var stored := FileAccess.get_file_as_string(path).strip_edges()
		if not stored.is_empty():
			return stored
	var id := Crypto.new().generate_random_bytes(BYTES).hex_encode()
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		push_error("cannot write the player id to %s" % path)
		return id
	file.store_string(id)
	return id
