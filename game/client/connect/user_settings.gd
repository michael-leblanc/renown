class_name UserSettings
extends RefCounted
# What the player chose in Settings, and the last address joined (D250). Kept in a file
# under user:// (never in game/data/, D175); its defaults are "user_defaults" in
# game/data/client.json. Changing a value applies it at once and writes the file.
# Master, Music and Effects are audio bus volumes (0 to 1), Window is "Windowed" or
# "Full screen", Motion is "Full" or "Reduced" (the Skills screen reads `reduced`).

const FILE := "user://settings.json"
const BUSES := ["Master", "Music", "Effects"]
const SILENT_DB := -80.0

# True while the player chose Reduced motion: screens that animate read it as they open.
static var reduced := false

var values: Dictionary = {} # Master, Music, Effects, Window, Motion
var last_address := ""
var last_port := ""

var _path := FILE


static func load_file(path: String, defaults: Dictionary) -> UserSettings:
	var s := UserSettings.new()
	s._path = path
	var stored: Dictionary = {}
	if FileAccess.file_exists(path):
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
		if parsed is Dictionary:
			stored = parsed
	for key: String in defaults:
		if key.begins_with("_"):
			continue
		var value: Variant = stored.get(key, defaults[key])
		if defaults[key] is float or defaults[key] is int:
			value = clampf(float(value) if (value is float or value is int) else float(defaults[key]), 0.0, 1.0)
		else:
			value = str(value)
		s.values[key] = value
	s.last_address = str(stored.get("last_address", ""))
	s.last_port = str(stored.get("last_port", ""))
	return s


# "address : port", or "" when nothing was joined yet.
func last() -> String:
	return "%s : %s" % [last_address, last_port] if last_address != "" else ""


func set_value(name: String, value: Variant) -> void:
	values[name] = value
	apply(name)
	save()


func remember(address: String, port: String) -> void:
	last_address = address
	last_port = port
	save()


func apply_all() -> void:
	for name: String in values:
		apply(name)


func apply(name: String) -> void:
	var value: Variant = values.get(name)
	if BUSES.has(name):
		var bus := _bus(name)
		AudioServer.set_bus_volume_db(bus, maxf(linear_to_db(float(value)), SILENT_DB))
	elif name == "Window":
		if DisplayServer.get_name() != "headless":
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if value == "Full screen" else DisplayServer.WINDOW_MODE_WINDOWED)
	elif name == "Motion":
		reduced = value == "Reduced"


func save() -> bool:
	var data := values.duplicate()
	data["last_address"] = last_address
	data["last_port"] = last_port
	var file := FileAccess.open(_path, FileAccess.WRITE)
	if file == null:
		push_error("cannot write the settings to %s" % _path)
		return false
	file.store_string(JSON.stringify(data, "\t"))
	return true


static func _bus(name: String) -> int:
	var i := AudioServer.get_bus_index(name)
	if i < 0:
		AudioServer.add_bus()
		i = AudioServer.bus_count - 1
		AudioServer.set_bus_name(i, name)
		AudioServer.set_bus_send(i, "Master")
	return i
