class_name ClientSettings
extends RefCounted
# The client's own settings (D175), read from game/data/client.json. A missing
# setting is an error, never a silent default. The port to offer is the server's
# net_port, read from game/data/settings.json as plain JSON.

const PORT_FILE := "res://data/settings.json"

var _data: Dictionary = {}


static func load_file(path: String) -> ClientSettings:
	var data := _read(path)
	if data.is_empty():
		return null
	var settings := ClientSettings.new()
	settings._data = data
	return settings


# A number from "timings" (seconds) or "values".
func number(key: String) -> float:
	for group in ["timings", "values"]:
		if _data.get(group, {}).has(key):
			return float(_data[group][key])
	push_error("client setting missing: %s" % key)
	return 0.0


func text(key: String) -> String:
	if _data.get("texts", {}).has(key):
		return str(_data["texts"][key])
	push_error("client setting missing: %s" % key)
	return ""


# The port the server listens on unless told otherwise.
static func default_port() -> int:
	var port: Variant = _read(PORT_FILE).get("values", {}).get("net_port")
	if port == null:
		push_error("setting missing: net_port")
		return 0
	return int(port)


static func _read(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		push_error("cannot read %s" % path)
		return {}
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("%s is not a JSON object" % path)
		return {}
	return parsed
