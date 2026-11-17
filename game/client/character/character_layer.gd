class_name CharacterLayer
extends Node2D
# Every character in sight drawn from what the client holds (D176, D215): one
# character scene each, the player's own and the NPCs' alike (D4). One that is no
# longer in the newest view is taken off the screen; one that comes in appears on
# its tile.

const SCENE := preload("res://client/character/character.tscn")

var look: CharacterLook = null

var _drawn := {} # character id -> CharacterView


func setup(tables: CharacterLook) -> void:
	look = tables
	y_sort_enabled = true


# Brings the drawn characters in line with the newest view.
func sync(state: ClientState) -> void:
	for id: int in _drawn.keys():
		if not state.is_in_sight(id):
			var gone: CharacterView = _drawn[id]
			_drawn.erase(id)
			remove_child(gone)
			gone.queue_free()
	for id: int in state.ids():
		if not _drawn.has(id):
			var fresh: CharacterView = SCENE.instantiate()
			add_child(fresh)
			fresh.setup(look, state.walk_time)
			_drawn[id] = fresh
		_drawn[id].walk_time = state.walk_time
		_drawn[id].show_entry(state.newest(id))


func character_of(id: int) -> CharacterView:
	return _drawn.get(id)


# Ids of the characters drawn, lowest first.
func drawn_ids() -> Array:
	var found := _drawn.keys()
	found.sort()
	return found
