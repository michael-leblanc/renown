class_name WorldTile
extends RefCounted
## What one tile holds (D188), for the test game's later tasks (PRO-005) to read.
## Throwaway code (D201): follows none of game/sim/'s rules.

## Ground kind: "grass", "dark_grass", "dirt" or "pebbles".
var ground: String = "grass"
## Blocks walking and blocks sight are two separate flags (D188, D190).
var blocks_walk: bool = false
var blocks_sight: bool = false
## True for every tile of the building, wall tiles and the door included.
## (D188 says "a place, or none"; the test game has one building, so a bool.)
var inside: bool = false
## What stands on the tile: "", "wall", "window", "door", "tree", "rock_small",
## "rock_big". The look (which tileset piece, which rotation) is in `piece`.
var kind: String = ""
var piece: String = ""


func signature() -> String:
	return "%s|%d|%d|%d|%s|%s" % [ground, int(blocks_walk), int(blocks_sight), int(inside), kind, piece]
