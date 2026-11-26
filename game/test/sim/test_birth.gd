extends GutTest
# Tests sim/birth.gd (SIM-015).

var birth: SimBirth


func before_each() -> void:
	birth = SimBirth.load_file("res://data/birth.json")


func _rng(seed_value: int) -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = seed_value
	return r


func _born(race: String, seed_value: int) -> SimCharacter:
	var c := SimCharacter.new(1)
	assert_true(birth.give_birth(c, race, _rng(seed_value)))
	return c


func test_a_rolled_stat_is_between_3_and_18_and_averages_about_12() -> void:
	var r := _rng(7)
	var total := 0
	for i in 10000:
		var v := birth.roll_stat(r)
		assert_between(v, 3, 18)
		total += v
	var avg := float(total) / 10000.0
	assert_between(avg, 12.0, 12.5)


func test_orc_gets_2_strength_and_goblin_2_intellect() -> void:
	for seed_value in 20:
		# Strength is rolled first, intellect last, from the same stream.
		var plain := _rng(seed_value)
		var rolls := {}
		for s in birth.stat_names():
			rolls[s] = birth.roll_stat(plain)
		assert_eq(_born("orc", seed_value).stats["strength"], mini(rolls["strength"] + 2, 20))
		assert_eq(_born("goblin", seed_value).stats["intellect"], mini(rolls["intellect"] + 2, 20))
		assert_eq(_born("orc", seed_value).stats["agility"], rolls["agility"])


func test_human_gets_plus_1_on_two_different_stats() -> void:
	var picked := {}
	for seed_value in 1000:
		var plain := _rng(seed_value)
		var rolls := {}
		for s in birth.stat_names():
			rolls[s] = birth.roll_stat(plain)
		var c := _born("human", seed_value)
		var raised := []
		for s in birth.stat_names():
			var diff: int = c.stats[s] - rolls[s]
			if diff == 1 or (diff == 0 and rolls[s] == 20):
				if diff == 1:
					raised.append(s)
			else:
				assert_eq(diff, 0, "only plus 1 or nothing")
		assert_eq(raised.size(), 2, "two stats raised, seed %d" % seed_value)
		for s in raised:
			picked[s] = true
	assert_eq(picked.size(), 4, "each stat picked at least once")


func test_no_stat_is_above_20() -> void:
	for race in ["human", "orc", "goblin"]:
		for seed_value in 500:
			for v in _born(race, seed_value).stats.values():
				assert_lte(v, 20)


func test_cap_applies_to_a_boosted_roll() -> void:
	var d := {
		"stats": ["strength"], "dice": {"count": 4, "sides": 6, "keep": 3}, "stat_cap": 20,
		"bonus": {"base": 10, "step": 2},
		"races": {"orc": {"fixed": {"strength": 50}}},
		"skills": ["Swords"],
		"backgrounds": [{"name": "A", "skills": ["Swords"], "start": 30, "weight": 1, "coins": 0, "gear": []}],
	}
	var b := SimBirth.from_dict(d)
	var c := SimCharacter.new(1)
	b.give_birth(c, "orc", _rng(1))
	assert_eq(c.stats["strength"], 20)


func test_stat_bonus() -> void:
	assert_eq(birth.bonus(6), -2)
	assert_eq(birth.bonus(10), 0)
	assert_eq(birth.bonus(12), 1)
	assert_eq(birth.bonus(18), 4)
	assert_eq(birth.bonus(20), 5)


func test_same_seed_gives_the_same_stats() -> void:
	var a := _rng(42)
	var b := _rng(42)
	for i in 10:
		var ca := SimCharacter.new(i)
		var cb := SimCharacter.new(i)
		var race: String = ["human", "orc", "goblin"][i % 3]
		birth.give_birth(ca, race, a)
		birth.give_birth(cb, race, b)
		assert_eq(ca.stats, cb.stats)


func test_a_newborn_has_no_talents() -> void:
	var c := _born("human", 3)
	assert_eq(c.talents, [])
	assert_eq(c.stats.size(), 4)


func _data() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string("res://data/birth.json"))


func test_birth_json_holds_7_backgrounds_and_8_skills() -> void:
	var d := _data()
	assert_eq(d["skills"], ["Swords", "Axes", "Maces", "Spears", "Bows", "Unarmed", "Shield", "Dodge"])
	var names := []
	for row in d["backgrounds"]:
		names.append(row["name"])
		for key in ["name", "skills", "weight", "coins", "gear"]:
			assert_true(row.has(key), key)
		assert_eq(row["gear"], [])
		assert_eq(row["coins"], 0)
	assert_eq(names, ["Soldier", "Hunter", "Woodcutter", "Herder", "Labourer", "Brawler", "Well-woken"])


func test_10000_births_follow_the_weights() -> void:
	var r := _rng(11)
	var counts := {}
	for i in 10000:
		var c := SimCharacter.new(i)
		birth.give_birth(c, "human", r)
		counts[c.background] = counts.get(c.background, 0) + 1
	var want := {"Soldier": 8, "Hunter": 20, "Woodcutter": 20, "Herder": 20,
			"Labourer": 20, "Brawler": 8, "Well-woken": 4}
	for n in want:
		assert_almost_eq(counts.get(n, 0) / 100.0, float(want[n]), 1.5, n)


func test_each_background_sets_its_own_skills_to_30_and_the_rest_to_0() -> void:
	var rows := {}
	for row in _data()["backgrounds"]:
		rows[row["name"]] = row["skills"]
	var seen := {}
	for seed_value in 400:
		var c := _born("orc", seed_value)
		seen[c.background] = true
		assert_eq(c.skills.size(), 8)
		for s in c.skills:
			assert_eq(c.skills[s], 30 if s in rows[c.background] else 0, "%s %s" % [c.background, s])
	assert_eq(seen.size(), 7)
	var soldier := {}
	for row in _data()["backgrounds"]:
		if row["name"] == "Soldier":
			soldier = row
	assert_eq(soldier["skills"], ["Swords", "Shield"])


func test_a_background_naming_an_unknown_skill_fails_the_load() -> void:
	var d := _data()
	d["backgrounds"][0]["skills"] = ["Swords", "Juggling"]
	assert_null(SimBirth.from_dict(d))
	assert_push_error("Juggling")


func test_a_finished_birth_has_background_skills_and_stats() -> void:
	var c := _born("goblin", 5)
	assert_true(c.background in birth.background_names())
	assert_eq(c.skills.keys(), birth.skill_names())
	assert_eq(c.stats.size(), 4)
