extends GutTest
# Tests server/players.gd and how net_server.gd uses it (NET-004).

const WAIT := 5.0

var _settings: SimSettings
var _looks: SimLooks
var _stand_in: SimStandInWorld
var _view: ServerView
var _server_branch: NetRig.Branch
var _server: NetServer
var _port: int
var _clients: Array[NetRig.Branch] = []


func before_each() -> void:
	_settings = SimSettings.load_file("res://data/settings.json")
	_looks = SimLooks.load_file("res://data/looks.json")
	_stand_in = SimStandInWorld.build(1, _settings, _looks)
	_view = ServerView.new(_stand_in.sim, _settings)
	_server_branch = NetRig.branch(self, "Server")
	_server = NetServer.new(_stand_in.sim, _view, _looks, _server_branch.link, _server_branch.api, _stand_in.waking_spot)
	_server.bind_ip = "127.0.0.1"
	_port = NetRig.free_port(24700 + randi() % 2000)
	assert_eq(_server.listen(_port), OK)


func after_each() -> void:
	for b in _clients:
		b.api.multiplayer_peer = null
	_clients.clear()
	_server_branch.api.multiplayer_peer = null


func _join(player: String) -> NetRig.Branch:
	var b := NetRig.branch(self, "Client%d" % _clients.size())
	_clients.append(b)
	assert_eq(NetRig.connect_client(b, _port), OK)
	await wait_until(b.connected, WAIT, "client connects")
	b.link.send_hello(player, NetMessages.hello())
	await wait_until(func() -> bool: return b.welcomes.size() == 1, WAIT, "welcome arrives")
	return b


# The client goes away without a goodbye; waits until the server has noticed.
func _leave(b: NetRig.Branch) -> void:
	b.api.multiplayer_peer = null
	await wait_until(func() -> bool: return _server_branch.api.get_peers().is_empty(), WAIT, "server notices")


func _tick(count := 1) -> void:
	for i in count:
		_stand_in.sim.step()
		_server.after_tick()


func _linger_ticks() -> int:
	return _settings.ticks("linger")


func _ids_in_view(id: int) -> Array:
	return _view.view(id)["characters"].map(func(c: Dictionary) -> int: return c["id"])


func test_given_a_welcomed_client_that_disconnects_when_29_seconds_of_ticks_run_then_its_character_is_still_in_the_world_stopped_on_a_free_tile_and_in_the_views_that_see_it() -> void:
	var a := await _join("ann")
	var b := await _join("ben")
	var id_a: int = a.welcomes[0]["you"]
	var id_b: int = b.welcomes[0]["you"]
	var world := _stand_in.sim.world
	# Ann is walking when she goes.
	var start := world.get_character(id_a).pos
	_stand_in.sim.movement.order(id_a, start + Vector2i(4, 0))
	await _leave(a)
	_tick(29 * _settings.tick_rate)
	var c := world.get_character(id_a)
	assert_not_null(c, "still in the world")
	assert_eq(_stand_in.sim.movement.stepping_onto(id_a), null, "stopped")
	assert_eq(world.character_at(c.pos), id_a, "on a tile of its own")
	assert_true(_ids_in_view(id_b).has(id_a), "still seen")


func test_given_the_same_player_id_back_within_30_seconds_when_it_says_hello_then_it_gets_the_same_character_where_it_stands() -> void:
	var a := await _join("ann")
	var id_a: int = a.welcomes[0]["you"]
	var pos := _stand_in.sim.world.get_character(id_a).pos
	await _leave(a)
	_tick(10 * _settings.tick_rate)
	var again := await _join("ann")
	assert_eq(again.welcomes[0]["you"], id_a)
	assert_eq(_stand_in.sim.world.get_character(id_a).pos, pos)
	# Coming back ends the wait: the character is still there after the linger time.
	_tick(_linger_ticks())
	assert_not_null(_stand_in.sim.world.get_character(id_a))


func test_given_30_seconds_of_ticks_after_a_disconnect_when_the_next_tick_runs_then_the_character_is_out_of_the_world_its_tile_is_free_and_it_is_in_no_view() -> void:
	var a := await _join("ann")
	var b := await _join("ben")
	var id_a: int = a.welcomes[0]["you"]
	var id_b: int = b.welcomes[0]["you"]
	var world := _stand_in.sim.world
	var pos := world.get_character(id_a).pos
	await _leave(a)
	_tick(_linger_ticks())
	_tick()
	assert_null(world.get_character(id_a))
	assert_true(world.is_free(pos))
	assert_false(_ids_in_view(id_b).has(id_a))


func test_given_the_same_player_id_back_after_its_character_left_the_world_when_it_says_hello_then_the_same_character_is_back_on_the_free_tile_nearest_where_it_left() -> void:
	var a := await _join("ann")
	var id_a: int = a.welcomes[0]["you"]
	var world := _stand_in.sim.world
	var c := world.get_character(id_a)
	var pos := c.pos
	var look := c.look.duplicate(true)
	await _leave(a)
	_tick(_linger_ticks() + 1)
	assert_null(world.get_character(id_a))
	# Someone else took the tile meanwhile.
	assert_true(world.add_character(SimCharacter.new(901), pos))
	var again := await _join("ann")
	assert_eq(again.welcomes[0]["you"], id_a)
	var back := world.get_character(id_a)
	assert_not_null(back)
	assert_eq(back.look, look)
	var d := (back.pos - pos).abs()
	assert_eq(maxi(d.x, d.y), 1, "next to where it left")


func test_given_a_client_whose_connection_is_lost_without_a_goodbye_when_the_server_notices_then_it_is_treated_the_same_as_leaving() -> void:
	var a := await _join("ann")
	var id_a: int = a.welcomes[0]["you"]
	# Drops the link with no goodbye: the server's own timeout path.
	(a.api.multiplayer_peer as ENetMultiplayerPeer).close()
	await wait_until(func() -> bool: return _server_branch.api.get_peers().is_empty(), 15.0, "server notices")
	assert_not_null(_stand_in.sim.world.get_character(id_a))
	_tick(_linger_ticks())
	assert_null(_stand_in.sim.world.get_character(id_a))


func test_given_a_server_that_is_stopped_and_started_again_when_a_known_player_id_says_hello_then_it_gets_a_new_character_on_a_new_world() -> void:
	var a := await _join("ann")
	var old_world := _stand_in.sim.world
	await _leave(a)
	_server_branch.api.multiplayer_peer = null
	_stand_in = SimStandInWorld.build(2, _settings, _looks)
	_view = ServerView.new(_stand_in.sim, _settings)
	_server_branch = NetRig.branch(self, "Server2")
	_server = NetServer.new(_stand_in.sim, _view, _looks, _server_branch.link, _server_branch.api, _stand_in.waking_spot)
	_server.bind_ip = "127.0.0.1"
	_port = NetRig.free_port(24700 + randi() % 2000)
	assert_eq(_server.listen(_port), OK)
	var again := await _join("ann")
	var id: int = again.welcomes[0]["you"]
	assert_ne(_stand_in.sim.world, old_world)
	assert_not_null(_stand_in.sim.world.get_character(id))


func test_given_the_linger_time_when_it_is_read_then_it_is_a_timing_in_the_settings_in_seconds() -> void:
	var data: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://data/settings.json"))
	assert_eq(float(data["timings"]["linger"]), 30.0)
	assert_eq(_settings.ticks("linger"), 30 * _settings.tick_rate)
