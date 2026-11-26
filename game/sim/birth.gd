class_name SimBirth
extends RefCounted
# How a character is born: four stats, each rolled with dice and dropping the
# lowest, plus its race's bonus (D154, D155), and a place for talents that stays
# empty (D153). Every roll comes from the generator handed in.

var _stats: Array = []
var _dice_count: int = 0
var _dice_sides: int = 0
var _dice_keep: int = 0
var _cap: int = 0
var _bonus_base: int = 0
var _bonus_step: int = 1
var _races: Dictionary = {}


static func from_dict(data: Dictionary) -> SimBirth:
	for key in ["stats", "dice", "stat_cap", "bonus", "races"]:
		if not data.has(key):
			push_error("birth data: missing %s" % key)
			return null
	var b := SimBirth.new()
	b._stats = data["stats"]
	var dice: Dictionary = data["dice"]
	b._dice_count = int(dice.get("count", 0))
	b._dice_sides = int(dice.get("sides", 0))
	b._dice_keep = int(dice.get("keep", 0))
	if b._stats.is_empty() or b._dice_sides < 1 or b._dice_keep < 1 or b._dice_keep > b._dice_count:
		push_error("birth data: stats or dice are not usable")
		return null
	b._cap = int(data["stat_cap"])
	b._bonus_base = int(data["bonus"].get("base", 0))
	b._bonus_step = int(data["bonus"].get("step", 1))
	if b._bonus_step < 1:
		push_error("birth data: bonus step must be at least 1")
		return null
	b._races = data["races"]
	return b


static func load_file(path: String) -> SimBirth:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		push_error("birth file unreadable: %s" % path)
		return null
	return from_dict(parsed)


func stat_names() -> Array:
	return _stats.duplicate()


# One stat: the dice are rolled, the lowest are dropped, the rest are added.
func roll_stat(rng: RandomNumberGenerator) -> int:
	var dice: Array = []
	for i in _dice_count:
		dice.append(rng.randi_range(1, _dice_sides))
	dice.sort()
	var total := 0
	for i in range(_dice_count - _dice_keep, _dice_count):
		total += dice[i]
	return total


# What a stat gives: every step above the base adds 1, below it takes away (D160).
func bonus(value: int) -> int:
	return floori(float(value - _bonus_base) / _bonus_step)


# Fills in the character's stats and leaves its talents empty. Returns false,
# with an error, for a race the data does not know.
func give_birth(character: SimCharacter, race: String, rng: RandomNumberGenerator) -> bool:
	if not _races.has(race):
		push_error("birth: unknown race %s" % race)
		return false
	var stats := {}
	for s in _stats:
		stats[s] = roll_stat(rng)
	var rule: Dictionary = _races[race]
	var fixed: Dictionary = rule.get("fixed", {})
	for s in fixed:
		stats[s] += int(fixed[s])
	var picks := int(rule.get("random_stats", 0))
	var pool: Array = _stats.duplicate()
	for i in mini(picks, pool.size()):
		var at := rng.randi_range(0, pool.size() - 1)
		stats[pool[at]] += int(rule.get("random_amount", 0))
		pool.remove_at(at)
	for s in stats:
		stats[s] = mini(stats[s], _cap)
	character.stats = stats
	character.talents = []
	return true
