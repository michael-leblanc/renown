class_name SimLooks
extends RefCounted
# What a character looks like, as data (D214): a race and a part with a colour
# for each slot worn (D122). A race or outfit not in the data is an error with
# its name, never a silent default.

const SLOTS := ["head", "chest", "legs", "shoes", "hands", "belt", "back", "main_hand", "off_hand"]

var _races: Dictionary = {}
var _outfits: Dictionary = {}


# Checks the data once, here, so the getters can trust it. On a fault: an error
# with the race, outfit or slot name, and null.
static func from_dict(data: Dictionary) -> SimLooks:
	var races: Variant = data.get("races", {})
	var outfits: Variant = data.get("outfits", {})
	if not races is Dictionary or not outfits is Dictionary:
		push_error("looks data: races and outfits must be objects")
		return null
	if races.is_empty():
		push_error("looks data: no race")
		return null
	for r in races:
		var fault := _race_fault(races[r])
		if fault != "":
			push_error("race %s: %s" % [r, fault])
			return null
	for o in outfits:
		if not outfits[o] is Dictionary:
			push_error("outfit %s: must be an object" % o)
			return null
		for slot in outfits[o]:
			var fault := _slot_fault(slot, outfits[o][slot])
			if fault != "":
				push_error("outfit %s, slot %s: %s" % [o, slot, fault])
				return null
	var l := SimLooks.new()
	l._races = races
	l._outfits = outfits
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


static func _race_fault(race: Variant) -> String:
	if not race is Dictionary:
		return "must be an object"
	var o: Variant = race.get("odds")
	if not (o is int or o is float) or o < 1 or o != floor(o):
		return "odds must be a whole number of 1 or more"
	var s: Variant = race.get("size")
	if not s is Array or s.size() != 2 or not s.all(func(n): return n is int or n is float):
		return "size must be two numbers"
	if s[0] <= 0 or s[1] <= 0:
		return "size numbers must be above 0"
	var k: Variant = race.get("skin")
	if not k is String or k == "":
		return "skin missing"
	return ""


static func _slot_fault(slot: String, worn: Variant) -> String:
	if not SLOTS.has(slot):
		return "not one of the D122 slots"
	if worn == null:
		return ""
	if not worn is Dictionary or worn.size() != 2:
		return "must be null or {part, colour}"
	for key in ["part", "colour"]:
		if not worn.get(key) is String or worn[key] == "":
			return "must be null or {part, colour}"
	return ""


func _race(race: String) -> Dictionary:
	if not _races.has(race):
		push_error("race not in looks data: %s" % race)
		return {}
	return _races[race]
