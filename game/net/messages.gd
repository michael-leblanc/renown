class_name NetMessages
extends RefCounted
# The shapes of the five messages between a client and the server (D215): hello,
# welcome, view, order and refusal. Shared by both sides, so it holds only names
# and plain dictionaries: numbers, strings, arrays and dictionaries, never an
# object and never a class from sim/. A tile is [x, y]. Building a view reads the
# world, so that lives in server/view.gd.

const PROTOCOL_VERSION := 1

# Every key a message may hold, at any depth.
const KEYS := [
	"type", "version", "you", "tick_rate", "walk_time", "width", "height",
	"ground", "props", "edges", "tick", "characters", "doors",
	"id", "tile", "stepping", "race", "parts", "slot", "part", "colour",
	"a", "b", "state", "order", "to", "reason",
]

const HELLO := "hello"
const WELCOME := "welcome"
const VIEW := "view"
const ORDER := "order"
const REFUSAL := "refusal"

const ORDER_WALK := "walk"
const ORDER_DOOR := "door"

const EDGE_WALL := "wall"
const EDGE_DOOR := "door"

const DOOR_OPEN := "open"
const DOOR_CLOSED := "closed"

const REASON_VERSION := "wrong version"
const REASON_NO_PATH := "no path"
const REASON_NO_DOOR := "no door"
const REASON_BAD_ORDER := "bad order"


# hello: a client asks to join.
static func hello() -> Dictionary:
	return {"type": HELLO, "version": PROTOCOL_VERSION}


# welcome: sent once. `ground` and `props` hold one number per tile, row by row.
# `edges` holds [ax, ay, bx, by, kind] for every wall and door; `walk_time` is
# seconds per tile.
static func welcome(you: int, tick_rate: int, walk_time: float, width: int, height: int,
		ground: Array, props: Array, edges: Array) -> Dictionary:
	return {
		"type": WELCOME, "version": PROTOCOL_VERSION, "you": you,
		"tick_rate": tick_rate, "walk_time": walk_time,
		"width": width, "height": height,
		"ground": ground, "props": props, "edges": edges,
	}


# One character of a view. `stepping` is [x, y], or [] when it is not stepping.
# `parts` is an array of {slot, part, colour}.
static func seen_character(id: int, tile: Array, stepping: Array, race: String, parts: Array) -> Dictionary:
	return {"id": id, "tile": tile, "stepping": stepping, "race": race, "parts": parts}


# One door of a view, on the edge a-b: state is "open" or "closed".
static func seen_door(a: Array, b: Array, state: String) -> Dictionary:
	return {"a": a, "b": b, "state": state}


# view: sent every tick, only what the viewer's character has in sight.
static func view(tick: int, characters: Array, doors: Array) -> Dictionary:
	return {"type": VIEW, "tick": tick, "characters": characters, "doors": doors}


static func order_walk(to: Array) -> Dictionary:
	return {"type": ORDER, "order": ORDER_WALK, "to": to}


static func order_door(a: Array, b: Array) -> Dictionary:
	return {"type": ORDER, "order": ORDER_DOOR, "a": a, "b": b}


static func refusal(reason: String) -> Dictionary:
	return {"type": REFUSAL, "reason": reason}


# True when every key, at any depth, is in KEYS and every value is a number, a
# string, an array or a dictionary.
static func is_plain(message: Variant) -> bool:
	match typeof(message):
		TYPE_INT, TYPE_FLOAT, TYPE_STRING:
			return true
		TYPE_ARRAY:
			for item in message:
				if not is_plain(item):
					return false
			return true
		TYPE_DICTIONARY:
			for key in message:
				if not key is String or not KEYS.has(key) or not is_plain(message[key]):
					return false
			return true
	return false
