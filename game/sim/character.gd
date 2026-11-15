class_name SimCharacter
extends RefCounted
# One character: a player's and an NPC's are the same data (D4). A brain, when
# there is one, is attached from outside; nothing here depends on it.

var id: int
var pos: Vector2i = Vector2i.ZERO
# What is drawn: {race, slots} once given (sim/looks.gd), empty before.
var look: Dictionary = {}


func _init(character_id: int) -> void:
	id = character_id
