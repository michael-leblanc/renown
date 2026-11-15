class_name SimSettings
extends RefCounted
# Every number the rules use, read from data (D175). Timings are written in
# seconds and turned into ticks here. A missing setting is an error with its
# name, never a silent default.

var tick_rate: int = 0
var _timings: Dictionary = {}
var _values: Dictionary = {}


static func from_dict(data: Dictionary) -> SimSettings:
	var s := SimSettings.new()
	if not data.has("tick_rate"):
		push_error("setting missing: tick_rate")
		return s
	s.tick_rate = int(data["tick_rate"])
	s._timings = data.get("timings", {})
	s._values = data.get("values", {})
	return s


static func load_file(path: String) -> SimSettings:
	var text := FileAccess.get_file_as_string(path)
	var parsed: Variant = JSON.parse_string(text)
	if not parsed is Dictionary:
		push_error("settings file unreadable: %s" % path)
		return null
	return from_dict(parsed)


# A timing in ticks: seconds times the tick rate, rounded, at least 1.
func ticks(setting_name: String) -> int:
	if not _timings.has(setting_name):
		push_error("setting missing: %s" % setting_name)
		return 0
	return maxi(1, roundi(float(_timings[setting_name]) * tick_rate))


# A plain number or other value, as written in the data.
func value(setting_name: String) -> Variant:
	if not _values.has(setting_name):
		push_error("setting missing: %s" % setting_name)
		return null
	return _values[setting_name]
