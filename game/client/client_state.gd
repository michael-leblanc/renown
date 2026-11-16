class_name ClientState
extends RefCounted
# What the client holds of what the server sent (D176, D215): from the welcome,
# the land and its own character id; from the views, for every character in sight
# the newest view and the one before, so drawing can slide from tile to tile
# between two ticks. A character that is not in the newest view is gone, and one
# that comes back starts again with nothing before. Plain dictionaries only.

var you: int = -1
var tick_rate: int = 0
var walk_time: float = 0.0
var land: Dictionary = {} # width, height, ground, props, edges, as welcomed
var tick: int = -1 # of the newest view, -1 before the first
var doors: Array = [] # of the newest view

var _newest: Dictionary = {} # character id -> its entry in the newest view
var _before: Dictionary = {} # character id -> its entry in the view before


func apply_welcome(message: Dictionary) -> void:
	you = int(message["you"])
	tick_rate = int(message["tick_rate"])
	walk_time = float(message["walk_time"])
	land = {
		"width": message["width"], "height": message["height"],
		"ground": message["ground"], "props": message["props"], "edges": message["edges"],
	}
	tick = -1
	doors = []
	_newest.clear()
	_before.clear()


func apply_view(message: Dictionary) -> void:
	var now: Dictionary = {}
	for seen: Dictionary in message["characters"]:
		now[int(seen["id"])] = seen
	_before.clear()
	for id: int in now:
		if _newest.has(id):
			_before[id] = _newest[id]
	_newest = now
	tick = int(message["tick"])
	doors = message["doors"]


# Ids of the characters in the newest view, lowest first.
func ids() -> Array:
	var found := _newest.keys()
	found.sort()
	return found


func is_in_sight(id: int) -> bool:
	return _newest.has(id)


# The character as the newest view has it, {} when it is not in sight.
func newest(id: int) -> Dictionary:
	return _newest.get(id, {})


# The character as the view before had it, {} when there was none.
func before(id: int) -> Dictionary:
	return _before.get(id, {})


func has_before(id: int) -> bool:
	return _before.has(id)
