extends GutTest
# Tests sim/looks.gd: a look is a race and what each slot wears (D122, D214).

const Looks := preload("res://sim/looks.gd")
const Character := preload("res://sim/character.gd")

const SLOTS := ["head", "chest", "legs", "shoes", "hands", "belt", "back", "main_hand", "off_hand"]


func _looks() -> Looks:
	return Looks.load_file("res://data/looks.json")


func test_data_holds_three_races_with_odds_sizes_and_skin() -> void:
	var l := _looks()
	assert_not_null(l)
	assert_eq(l.race_names(), ["human", "orc", "goblin"])
	assert_eq(l.odds("human"), 50)
	assert_eq(l.odds("orc"), 25)
	assert_eq(l.odds("goblin"), 25)
	assert_eq(l.size("human"), Vector2(1.0, 1.0))
	assert_eq(l.size("orc"), Vector2(1.4, 1.2))
	assert_eq(l.size("goblin"), Vector2(0.75, 0.75))
	for r in l.race_names():
		assert_true(l.skin(r).begins_with("#"), "skin of %s" % r)
	var outfit := l.outfit("starting")
	for slot in outfit:
		if outfit[slot] != null:
			assert_true(outfit[slot]["part"] is String and outfit[slot]["part"] != "")
			assert_true(outfit[slot]["colour"].begins_with("#"))


func test_starting_outfit_slots_are_the_d122_slots_and_back_is_empty() -> void:
	var outfit := _looks().outfit("starting")
	for slot in outfit:
		assert_true(SLOTS.has(slot), "slot %s" % slot)
	assert_true(outfit.has("back"))
	assert_null(outfit["back"])


func test_1000_rolls_follow_the_odds_and_repeat_with_the_seed() -> void:
	var l := _looks()
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	var first: Array = []
	for i in 1000:
		first.append(l.roll_race(rng))
	var humans := first.count("human")
	var orcs := first.count("orc")
	assert_between(humans, 450, 550)
	assert_between(orcs, 200, 300)
	var rng2 := RandomNumberGenerator.new()
	rng2.seed = 42
	var second: Array = []
	for i in 1000:
		second.append(l.roll_race(rng2))
	assert_eq(first, second)


func test_a_new_character_gets_a_race_and_parts_with_colours() -> void:
	var c := Character.new(1)
	assert_true(_looks().give_look(c, "orc", "starting"))
	assert_eq(c.look["race"], "orc")
	var slots: Dictionary = c.look["slots"]
	assert_eq(slots["head"]["part"], "Head1")
	assert_eq(slots["head"]["colour"], "#6b4a2b")
	assert_null(slots["back"])


func test_unknown_race_or_outfit_fails_with_its_name() -> void:
	var c := Character.new(1)
	var l := _looks()
	assert_false(l.give_look(c, "elf", "starting"))
	assert_push_error("elf")
	assert_false(l.give_look(c, "human", "tuxedo"))
	assert_push_error("tuxedo")
	assert_true(c.look.is_empty(), "nothing was set")


func test_a_character_with_a_brain_and_one_without_get_looks_the_same_way() -> void:
	var l := _looks()
	var plain := Character.new(1)
	var with_brain := Character.new(2)
	with_brain.set_meta("brain", true) # stands in for an attached brain
	assert_true(l.give_look(plain, "goblin", "starting"))
	assert_true(l.give_look(with_brain, "goblin", "starting"))
	assert_eq(plain.look, with_brain.look)


# A good copy of the data, for the tests below to break one thing at a time.
func _data() -> Dictionary:
	return {
		"races": {"human": {"odds": 50, "size": [1.0, 1.0], "skin": "#e8b48c"}},
		"outfits": {"starting": {
			"head": {"part": "Head1", "colour": "#6b4a2b"},
			"back": null,
		}},
	}


func test_good_data_loads() -> void:
	assert_not_null(Looks.from_dict(_data()))


func test_a_race_with_odds_of_zero_fails_with_its_name() -> void:
	var d := _data()
	d["races"]["human"]["odds"] = 0
	assert_null(Looks.from_dict(d))
	assert_push_error("race human: odds")


func test_a_race_with_a_size_not_two_numbers_fails_with_its_name() -> void:
	var d := _data()
	d["races"]["human"]["size"] = [1.0, "tall"]
	assert_null(Looks.from_dict(d))
	assert_push_error("race human: size")


func test_a_race_without_a_skin_fails_with_its_name() -> void:
	var d := _data()
	d["races"]["human"].erase("skin")
	assert_null(Looks.from_dict(d))
	assert_push_error("race human: skin")


func test_an_outfit_slot_not_in_d122_fails_with_its_name() -> void:
	var d := _data()
	d["outfits"]["starting"]["tail"] = null
	assert_null(Looks.from_dict(d))
	assert_push_error("outfit starting, slot tail")


func test_a_slot_not_null_or_part_and_colour_fails_with_its_name() -> void:
	var d := _data()
	d["outfits"]["starting"]["head"] = {"part": "Head1"}
	assert_null(Looks.from_dict(d))
	assert_push_error("outfit starting, slot head")
