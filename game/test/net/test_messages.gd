extends GutTest
# Tests net/messages.gd (NET-001).


func test_given_any_welcome_view_order_or_refusal_when_read_then_every_key_is_listed_and_every_value_plain() -> void:
	var all := [
		NetMessages.hello(),
		NetMessages.welcome(1, 10, 0.3, 2, 1, [0, 0], [0, 1], [[0, 0, 1, 0, "wall"]]),
		NetMessages.view(5, [NetMessages.seen_character(1, [0, 0], [], "human", [{"slot": "head", "part": "cap", "colour": "red"}])],
			[NetMessages.seen_door([0, 0], [0, 1], "open")]),
		NetMessages.order_walk([3, 4]),
		NetMessages.order_door([0, 0], [0, 1]),
		NetMessages.refusal(NetMessages.REASON_NO_PATH),
	]
	for m in all:
		assert_true(NetMessages.is_plain(m), str(m))
	assert_false(NetMessages.is_plain({"nope": 1}))
	assert_false(NetMessages.is_plain({"type": RefCounted.new()}))
	assert_false(NetMessages.is_plain({"type": true}))


func test_given_a_welcome_and_a_view_when_turned_to_bytes_and_back_then_each_equals_the_original() -> void:
	var w := NetMessages.welcome(7, 10, 0.3, 2, 1, [0, 1], [0, 2], [[0, 0, 1, 0, "door"]])
	var v := NetMessages.view(3, [NetMessages.seen_character(7, [1, 0], [0, 0], "elf", [])], [])
	assert_eq(bytes_to_var(var_to_bytes(w)), w)
	assert_eq(bytes_to_var(var_to_bytes(v)), v)


func test_given_game_net_messages_when_read_then_it_names_all_five_messages_and_no_class_from_sim() -> void:
	var text := FileAccess.get_file_as_string("res://net/messages.gd")
	for name in ["hello", "welcome", "view", "order", "refusal"]:
		assert_true(text.contains("static func %s(" % name) or text.contains("static func %s_" % name), name)
	for sim_class in ["Sim", "SimWorld", "SimCharacter", "SimLooks", "SimSight", "SimMovement"]:
		var found := RegEx.create_from_string("\\b%s\\b" % sim_class).search(text)
		assert_null(found, sim_class)
	assert_false(text.contains("res://sim/"))
