class_name ServerPlayers
extends RefCounted
# Which character belongs to which player id, and what happens to it when the
# player leaves (D49). A leaver's character stops where it is and stays in the
# world for `linger` seconds; then it leaves the world but is kept here, with its
# id and look, to be put back when the player returns. Kept in memory only: there
# is no saving yet (D182). The same for every character (D4).

var _sim: Sim
var _linger_ticks: int
var _kept: Dictionary = {} # player id -> SimCharacter
var _lingering: Dictionary = {} # player id -> ticks since it left
var _left_at: Dictionary = {} # player id -> tile it left the world from


func _init(sim: Sim) -> void:
	_sim = sim
	_linger_ticks = sim.settings.ticks("linger")


func character(player: String) -> SimCharacter:
	return _kept.get(player)


func keep(player: String, c: SimCharacter) -> void:
	_kept[player] = c
	_lingering.erase(player)
	_left_at.erase(player)


# Players whose character is waiting in the world for them.
func lingering_count() -> int:
	return _lingering.size()


# The tile the player's character left the world from, or null.
func left_at(player: String) -> Variant:
	return _left_at.get(player)


# The player is gone: the character stops and starts its wait. A walk ordered to
# its own tile ends at once, and on a free one (D52).
func leave(player: String) -> void:
	var c: SimCharacter = _kept.get(player)
	if c == null or _sim.world.get_character(c.id) != c:
		return
	_sim.movement.order(c.id, c.pos)
	_lingering[player] = 0


# The player is back: the wait is over.
func returned(player: String) -> void:
	_lingering.erase(player)


# Call after the world stepped `ticks_run` ticks. Takes out of the world every
# character whose wait is up; returns how many.
func step(ticks_run := 1) -> int:
	var gone := 0
	for player: String in _lingering.keys():
		_lingering[player] += ticks_run
		if _lingering[player] < _linger_ticks:
			continue
		var c: SimCharacter = _kept[player]
		_left_at[player] = c.pos
		_sim.world.remove_character(c.id)
		_lingering.erase(player)
		gone += 1
	return gone
