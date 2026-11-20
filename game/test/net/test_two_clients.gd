extends GutTest
# Two clients on one server see each other only while in sight (NET-005, D176, D179, D211).

const WAIT := 5.0

var _settings: SimSettings
var _looks: SimLooks
var _stand_in: SimStandInWorld
var _view: ServerView
var _server_branch: NetRig.Branch
var _server: NetServer
var _port: int
var _clients: Array[NetRig.Branch] = []
var _states: Array[ClientState] = []
var _ids: Array[int] = []


func before_each() -> void:
	_settings = SimSettings.load_file("res://data/settings.json")
	_looks = SimLooks.load_file("res://data/looks.json")
	_stand_in = SimStandInWorld.build(1, _settings, _looks)
	_view = ServerView.new(_stand_in.sim, _settings)
	_server_branch = NetRig.branch(self, "Server")
	_server = NetServer.new(_stand_in.sim, _view, _looks, _server_branch.link, _server_branch.api, _stand_in.waking_spot)
	_server.bind_ip = "127.0.0.1"
	_port = NetRig.free_port(26700 + randi() % 2000)
	assert_eq(_server.listen(_port), OK)


func after_each() -> void:
	for b in _clients:
		b.api.multiplayer_peer = null
	_clients.clear()
	_states.clear()
	_ids.clear()
	_server_branch.api.multiplayer_peer = null


# Two welcomed clients, each with a ClientState filled by its welcome.
func _join_two() -> void:
	for player in ["ann", "ben"]:
		var b := NetRig.branch(self, "Client%d" % _clients.size())
		_clients.append(b)
		assert_eq(NetRig.connect_client(b, _port), OK)
		await wait_until(b.connected, WAIT, "client connects")
		b.link.send_hello(player, NetMessages.hello())
		await wait_until(func() -> bool: return b.welcomes.size() == 1, WAIT, "welcome arrives")
		var state := ClientState.new()
		state.apply_welcome(b.welcomes[0])
		_states.append(state)
		_ids.append(state.you)


# One tick of the world, then waits until both clients got their view and holds it.
func _tick() -> void:
	var seen := [_clients[0].views.size(), _clients[1].views.size()]
	_stand_in.sim.step()
	_server.after_tick()
	await wait_until(func() -> bool: return _clients[0].views.size() > seen[0] and _clients[1].views.size() > seen[1], WAIT, "views arrive")
	for i in 2:
		_states[i].apply_view(_clients[i].views[-1])


func _pos(i: int) -> Vector2i:
	return _stand_in.sim.world.get_character(_ids[i]).pos


# Puts both characters in the open, 5 tiles apart on one row south of the building.
func _stand_apart() -> void:
	var world := _stand_in.sim.world
	var y := _stand_in.door_outside.y + 4
	for x in range(_stand_in.door_outside.x - 8, _stand_in.door_outside.x):
		var a := Vector2i(x, y)
		var b := a + Vector2i(5, 0)
		if world.is_free(a) and world.is_free(b):
			assert_true(world.move_character(_ids[0], a))
			assert_true(world.move_character(_ids[1], b))
			_view.invalidate()
			return
	fail_test("no two free tiles 5 apart")


# A free tile on the north side of the building, with the building between it and the south.
func _behind() -> Vector2i:
	var world := _stand_in.sim.world
	var y := _stand_in.building.position.y - 3
	for dx in range(0, 6):
		for x in [_stand_in.door_outside.x - dx, _stand_in.door_outside.x + dx]:
			if world.is_free(Vector2i(x, y)):
				return Vector2i(x, y)
	return Vector2i(-1, -1)


func _order_walk(i: int, to: Vector2i) -> void:
	_clients[i].link.send_order(NetMessages.order_walk([to.x, to.y]))
	await wait_frames(10)


# Ticks until client 1's character stands on `to`; false when it never does.
func _walk_ben_to(to: Vector2i) -> bool:
	for i in 400:
		await _tick()
		if _pos(1) == to and _stand_in.sim.movement.stepping_onto(_ids[1]) == null:
			return true
	return false


func test_given_a_server_and_two_clients_when_both_are_welcomed_and_stand_5_tiles_apart_in_the_open_then_each_clients_state_holds_the_other() -> void:
	await _join_two()
	_stand_apart()
	assert_eq(_pos(1) - _pos(0), Vector2i(5, 0))
	await _tick()
	assert_true(_states[0].is_in_sight(_ids[1]), "ann holds ben")
	assert_true(_states[1].is_in_sight(_ids[0]), "ben holds ann")
	assert_eq(_states[0].newest(_ids[1])["tile"], [_pos(1).x, _pos(1).y])
	assert_eq(_states[1].newest(_ids[0])["tile"], [_pos(0).x, _pos(0).y])


func test_given_one_ordered_to_walk_behind_the_building_when_it_gets_there_then_it_is_gone_from_the_other_clients_state_and_when_it_walks_back_out_it_is_there_again() -> void:
	await _join_two()
	_stand_apart()
	await _tick()
	var start := _pos(1)
	var behind := _behind()
	assert_ne(behind, Vector2i(-1, -1), "a free tile behind the building")
	await _order_walk(1, behind)
	assert_true(await _walk_ben_to(behind), "ben got behind the building")
	assert_false(_states[0].is_in_sight(_ids[1]), "ann no longer holds ben")
	assert_false(_states[1].is_in_sight(_ids[0]), "ben no longer holds ann")
	await _order_walk(1, start)
	assert_true(await _walk_ben_to(start), "ben walked back out")
	assert_true(_states[0].is_in_sight(_ids[1]), "ann holds ben again")
	assert_true(_states[1].is_in_sight(_ids[0]), "ben holds ann again")


func test_given_60_seconds_of_ticks_with_32_npcs_wandering_when_every_ticks_client_states_are_checked_against_the_servers_world_then_no_client_ever_held_a_character_farther_than_the_sight_distance_or_with_a_wall_between() -> void:
	await _join_two()
	assert_eq(_stand_in.npc_ids.size(), 32)
	_stand_apart()
	var sim := _stand_in.sim
	var reach := int(_settings.value("sight_distance"))
	var held := 0
	var ticks := _settings.tick_rate * 60
	var bad := 0
	for t in ticks:
		await _tick()
		for i in 2:
			for id: int in _states[i].ids():
				held += 1
				var other := sim.world.get_character(id)
				var me := sim.world.get_character(_ids[i])
				if other == null or (other.pos - me.pos).length_squared() > reach * reach or not sim.sight.sees(me.pos, other.pos):
					bad += 1
	assert_eq(bad, 0, "characters held out of sight")
	assert_gt(held, ticks, "clients held something besides themselves")
