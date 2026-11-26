class_name SimBirth
extends RefCounted
# How a character is born: four stats, each rolled with dice and dropping the
# lowest, plus its race's bonus (D154, D155), a background rolled by weight that
# sets its starting skills (D157, D166), and a place for talents that stays
# empty (D153). Every roll comes from the generator handed in.

var _stats: Array = []
var _dice_count: int = 0
var _dice_sides: int = 0
var _dice_keep: int = 0
var _cap: int = 0
var _bonus_base: int = 0
var _bonus_step: int = 1
var _races: Dictionary = {}
var _skills: Array = []
var _backgrounds: Array = []
var _weight_total: int = 0


static func from_dict(data: Dictionary) -> SimBirth:
	for key in ["stats", "dice", "stat_cap", "bonus", "races", "skills", "backgrounds"]:
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
	b._skills = data["skills"]
	b._backgrounds = data["backgrounds"]
	for row in b._backgrounds:
		for skill in row.get("skills", []):
			if not skill in b._skills:
				push_error("birth data: background %s names a skill not in the skill list: %s" % [row.get("name", "?"), skill])
				return null
		b._weight_total += int(row.get("weight", 0))
	if b._backgrounds.is_empty() or b._weight_total < 1:
		push_error("birth data: backgrounds need at least one weight")
		return null
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


func skill_names() -> Array:
	return _skills.duplicate()


func background_names() -> Array:
	var names: Array = []
	for row in _backgrounds:
		names.append(row["name"])
	return names


# One background, picked by weight.
func roll_background(rng: RandomNumberGenerator) -> Dictionary:
	var at := rng.randi_range(1, _weight_total)
	for row in _backgrounds:
		at -= int(row["weight"])
		if at <= 0:
			return row
	return _backgrounds[_backgrounds.size() - 1]


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
	var row := roll_background(rng)
	character.background = row["name"]
	var skills := {}
	for skill in _skills:
		skills[skill] = int(row["start"]) if skill in row["skills"] else 0
	character.skills = skills
	return true


# The one birth for every character, a player's or an NPC's (D4): a race rolled by
# the looks' odds (D156), then stats, background and skills, then the look.
# Returns false, with an error, when the race or outfit is unknown.
func born(character: SimCharacter, looks: SimLooks, outfit_name: String, rng: RandomNumberGenerator) -> bool:
	var race := looks.roll_race(rng)
	if not give_birth(character, race, rng):
		return false
	return looks.give_look(character, race, outfit_name)
