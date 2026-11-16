extends GutTest
# Tests server/orders.gd and its use by server/net_server.gd (NET-003).

const PEER := 7

var _settings: SimSettings
var _sim: Sim
var _orders: ServerOrders
var _me: SimCharacter
var _other: SimCharacter


func before_each() -> void:
	_settings = SimSettings.load_file("res://data/settings.json")
	_sim = Sim.new(1, _settings, SimWorld.new(16, 16))
	_orders = ServerOrders.new(_sim)
	_me = SimCharacter.new(1)
	_other = SimCharacter.new(2)
	_sim.world.add_character(_me, Vector2i(2, 2))
	_sim.world.add_character(_other, Vector2i(10, 10))


func _walk(to: Array, peer := PEER) -> void:
	_orders.handle(peer, _me.id, NetMessages.order_walk(to))


func test_given_a_walk_order_to_a_free_tile_when_ticks_run_then_its_own_character_walks_there_by_the_same_rule() -> void:
	_walk([6, 2])
	_sim.steps(_settings.ticks("walk_step") * 4)
	assert_eq(_me.pos, Vector2i(6, 2))
	assert_eq(_other.pos, Vector2i(10, 10))
	# The same result as an order given straight to the movement rule.
	var twin := Sim.new(1, _settings, SimWorld.new(16, 16))
	var t := SimCharacter.new(1)
	twin.world.add_character(t, Vector2i(2, 2))
	twin.movement.order(1, Vector2i(6, 2))
	twin.steps(_settings.ticks("walk_step") * 4)
	assert_eq(t.pos, _me.pos)


func test_given_a_walk_order_to_a_blocked_tile_or_one_it_cant_reach_when_it_is_handled_then_the_character_stays_and_no_path_search_ran() -> void:
	_sim.world.set_blocked(Vector2i(5, 5), true)
	for x in 16:
		_sim.world.set_blocked(Vector2i(x, 12), true)
	var searches := _sim.pathing.searches
	_walk([5, 5])
	_walk([3, 14])
	_sim.steps(_settings.ticks("walk_step") * 3)
	assert_eq(_me.pos, Vector2i(2, 2))
	assert_eq(_sim.pathing.searches, searches)


func test_given_an_order_to_use_a_door_when_ticks_run_then_the_clients_character_walks_to_the_door_and_the_door_changes() -> void:
	var a := Vector2i(5, 2)
	var b := Vector2i(5, 3)
	_sim.world.set_door(a, b, false)
	_orders.handle(PEER, _me.id, NetMessages.order_door([5, 2], [5, 3]))
	_sim.steps(_settings.ticks("walk_step") * 5)
	assert_eq(_me.pos, a)
	assert_true(_sim.world.door_is_open(a, b))


func test_given_a_new_walk_order_while_the_character_is_walking_when_it_is_handled_then_the_new_one_replaces_the_old_one() -> void:
	_walk([12, 2])
	_sim.steps(_settings.ticks("walk_step") * 2)
	_walk([2, 8])
	_sim.steps(_settings.ticks("walk_step") * 12)
	assert_eq(_me.pos, Vector2i(2, 8))


func test_given_an_order_message_when_its_shape_is_read_then_it_has_no_character_id_so_a_client_can_only_move_its_own_character() -> void:
	for message: Dictionary in [NetMessages.order_walk([1, 1]), NetMessages.order_door([1, 1], [1, 2])]:
		assert_false(message.has("id"))
		assert_false(message.has("you"))
	# A forged id in the message changes nothing: the connection's character moves.
	var forged := NetMessages.order_walk([6, 2])
	forged["id"] = _other.id
	_orders.handle(PEER, _me.id, forged)
	_sim.steps(_settings.ticks("walk_step") * 4)
	assert_eq(_me.pos, Vector2i(6, 2))
	assert_eq(_other.pos, Vector2i(10, 10))


func test_given_an_order_with_a_tile_outside_the_map_a_missing_field_or_a_value_of_the_wrong_kind_when_it_arrives_then_it_is_dropped_and_counted() -> void:
	var bad: Array[Dictionary] = [
		NetMessages.order_walk([99, 2]),
		NetMessages.order_walk([-1, 2]),
		NetMessages.order_walk([1]),
		NetMessages.order_walk(["a", "b"]),
		NetMessages.order_walk([1.5, 2]),
		{"type": NetMessages.ORDER, "order": NetMessages.ORDER_WALK},
		{"type": NetMessages.ORDER, "order": NetMessages.ORDER_DOOR, "a": [1, 1]},
		{"type": NetMessages.ORDER, "order": 5},
		{"type": NetMessages.ORDER},
	]
	for message in bad:
		_orders.handle(PEER, _me.id, message)
	assert_eq(_orders.dropped, bad.size())
	_sim.steps(_settings.ticks("walk_step") * 2)
	assert_eq(_me.pos, Vector2i(2, 2))


func test_given_more_orders_in_one_second_from_one_client_than_the_limit_when_they_arrive_then_the_extra_ones_are_dropped() -> void:
	var limit := int(_settings.value("net_orders_per_second"))
	for i in limit + 3:
		_walk([3, 2])
	assert_eq(_orders.dropped, 3)
	# Another client has its own allowance, and the next second a fresh one.
	_walk([3, 2], PEER + 1)
	assert_eq(_orders.dropped, 3)
	_sim.steps(_settings.tick_rate)
	_walk([3, 2])
	assert_eq(_orders.dropped, 3)


func test_given_an_order_from_a_connection_that_was_never_welcomed_when_it_arrives_then_it_is_dropped() -> void:
	var looks := SimLooks.load_file("res://data/looks.json")
	var view := ServerView.new(_sim, _settings)
	var server := NetServer.new(_sim, view, looks, NetLink.new(), MultiplayerAPI.create_default_interface(), Vector2i(1, 1))
	server._on_order(99, NetMessages.order_walk([6, 2]))
	assert_eq(server.orders.dropped, 1)
	_sim.steps(_settings.ticks("walk_step") * 2)
	assert_eq(_me.pos, Vector2i(2, 2))
