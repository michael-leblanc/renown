class_name SimLooks
extends RefCounted
# What a character looks like, as data (D214): a race and a part with a colour
# for each slot worn (D122). A race or outfit not in the data is an error with
# its name, never a silent default.

var _races: Dictionary = {}
var _outfits: Dictionary = {}


static func from_dict(data: Dictionary) -> SimLooks:
	var l := SimLooks.new()
	l._races = data.get("races", {})
	l._outfits = data.get("outfits", {})
	return l


static func load_file(path: String) -> SimLooks:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("looks file unreadable: %s" % path)
		return null
	return from_dict(parsed)


func race_names() -> Array:
	return _races.keys()


func odds(race: String) -> int:
	return int(_race(race).get("odds", 0))


func size(race: String) -> Vector2:
	var s: Array = _race(race).get("size", [1.0, 1.0])
	return Vector2(s[0], s[1])


func skin(race: String) -> String:
	return _race(race).get("skin", "")


# A copy of the outfit: slot -> {part, colour}, or null for an empty slot.
func outfit(outfit_name: String) -> Dictionary:
	if not _outfits.has(outfit_name):
		push_error("outfit not in looks data: %s" % outfit_name)
		return {}
	return _outfits[outfit_name].duplicate(true)


# A race drawn by odds, using only the generator handed in.
func roll_race(rng: RandomNumberGenerator) -> String:
	var total := 0
	for r in _races:
		total += odds(r)
	var pick := rng.randi_range(0, total - 1)
	for r in _races:
		pick -= odds(r)
		if pick < 0:
			return r
	return ""


# Sets the character's look. Works the same with or without a brain (D4).
# Returns false, and leaves the character alone, if the race or outfit is unknown.
func give_look(character: SimCharacter, race: String, outfit_name: String) -> bool:
	if not _races.has(race):
		push_error("race not in looks data: %s" % race)
		return false
	if not _outfits.has(outfit_name):
		push_error("outfit not in looks data: %s" % outfit_name)
		return false
	character.look = {"race": race, "slots": outfit(outfit_name)}
	return true


func _race(race: String) -> Dictionary:
	if not _races.has(race):
		push_error("race not in looks data: %s" % race)
		return {}
	return _races[race]
