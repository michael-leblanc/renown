class_name Fight
extends RefCounted
## The fight between the human and the dummy (PRO-006, test game D201), as plain
## data and a clock: no node, no window, so it also runs headless. Throwaway: it
## follows none of game/sim/'s rules (the D4 character model is not used here).
##
## Both swing every `swing_seconds` (the dummy `dummy_swing_offset_seconds` later);
## a blow lands `impact_seconds` after its swing starts and is rolled then: it
## hits with `hit_chance` for `damage`, or it misses (the defender blocks). A
## character that died before its blow lands never lands it. Every number is read
## from the settings dictionary each time it is used, so a key that changes
## the dictionary changes the fight at once (the same dictionary as fight_data.json).
##
## tick() returns what happened, in order, as dictionaries:
##   {type "swing", who, time}   {type "hit", who, target, damage, killed, time}
##   {type "miss", who, target, time}   {type "die", who, time}
## `who` is the attacker, except on "die" where it is the one who died.

const WHO := ["human", "dummy"]

var s: Dictionary
var rng := RandomNumberGenerator.new()
var fighters := {}
var t := 0.0              # the fight timer: seconds since the fight began (stops at the end)
var active := false       # running
var over := false         # one of them died
var winner := ""
var length := 0.0         # seconds from the start to the killing blow
var _impacts: Array[Dictionary] = []
var _origin := 0.0        # the timer when the swings last started from the beginning


func _init(settings: Dictionary, seed_in: int) -> void:
	s = settings
	rng.seed = seed_in
	reset()


## Both back at full health, no fight running.
func reset() -> void:
	fighters = {"human": _new_fighter(), "dummy": _new_fighter()}
	t = 0.0
	_origin = 0.0
	active = false
	over = false
	winner = ""
	length = 0.0
	_impacts.clear()


func _new_fighter() -> Dictionary:
	return {"health": int(s["health"]), "max": int(s["health"]), "alive": true, "last_swing": -1.0}


## Start the fight, or take it up again after walking away. The timer keeps what
## it had (only reset() sets it to 0), so a fight's length counts every second
## fought; the swings start again from now (the dummy's after its offset).
func begin() -> void:
	if over or not fighters["human"]["alive"] or not fighters["dummy"]["alive"]:
		return
	_origin = t
	active = true
	_impacts.clear()
	for who in WHO:
		fighters[who]["last_swing"] = -1.0


## Stop without a winner (the human walked away). Health stays as it is.
func stop() -> void:
	active = false


## The health setting changed while things are going on: the maximum moves, and so
## does what is left of a living character's health (at least 1).
func change_health(new_max: int) -> void:
	for who in WHO:
		var f: Dictionary = fighters[who]
		var delta := new_max - int(f["max"])
		f["max"] = new_max
		if f["alive"]:
			f["health"] = clampi(int(f["health"]) + delta, 1, new_max)


func other(who: String) -> String:
	return "dummy" if who == "human" else "human"


func _next_swing(who: String) -> float:
	var last: float = fighters[who]["last_swing"]
	if last < 0.0:
		return _origin + (float(s["dummy_swing_offset_seconds"]) if who == "dummy" else 0.0)
	return last + float(s["swing_seconds"])


## The next thing to happen: {time, kind: "swing"|"impact", who, index}, or {} if nothing.
## A tie in time goes to either by the seeded roll (it only happens at an offset of 0).
func _earliest() -> Dictionary:
	var found: Array[Dictionary] = []
	for who in WHO:
		if fighters[who]["alive"]:
			found.append({"time": _next_swing(who), "kind": "swing", "who": who, "index": -1})
	for i in _impacts.size():
		found.append({"time": _impacts[i]["time"], "kind": "impact", "who": _impacts[i]["who"], "index": i})
	if found.is_empty():
		return {}
	var best := found[0].duplicate()
	var ties: Array[Dictionary] = []
	for c in found:
		if c["time"] < best["time"] - 1e-9:
			best = c
	for c in found:
		if absf(c["time"] - best["time"]) <= 1e-9:
			ties.append(c)
	if ties.size() > 1:
		best = ties[rng.randi_range(0, ties.size() - 1)]
	return best


func tick(delta: float) -> Array[Dictionary]:
	var events: Array[Dictionary] = []
	if not active or over:
		return events
	var target := t + delta
	var now := t
	while not over:
		var e := _earliest()
		if e.is_empty() or e["time"] > target:
			break
		var et := maxf(float(e["time"]), now)
		now = et
		var who: String = e["who"]
		if e["kind"] == "swing":
			fighters[who]["last_swing"] = et
			_impacts.append({"time": et + float(s["impact_seconds"]), "who": who})
			events.append({"type": "swing", "who": who, "time": et})
		else:
			_impacts.remove_at(int(e["index"]))
			_land(who, et, events)
	t = length if over else target
	return events


func _land(who: String, et: float, events: Array[Dictionary]) -> void:
	var target := other(who)
	if not fighters[who]["alive"] or not fighters[target]["alive"]:
		return
	if rng.randf() < float(s["hit_chance"]):
		var dmg := int(s["damage"])
		var f: Dictionary = fighters[target]
		f["health"] = maxi(0, int(f["health"]) - dmg)
		var killed: bool = f["health"] <= 0
		events.append({"type": "hit", "who": who, "target": target, "damage": dmg, "killed": killed, "time": et})
		if killed:
			f["alive"] = false
			over = true
			active = false
			winner = who
			length = et
			events.append({"type": "die", "who": target, "time": et})
	else:
		events.append({"type": "miss", "who": who, "target": target, "time": et})


## Run a whole fight from the start with no window. Returns the seconds it lasted.
func run_to_end(dt: float) -> float:
	reset()
	begin()
	var cap: float = s.get("check", {}).get("cap_seconds", 600.0)
	while not over and t < cap:
		tick(dt)
	return length if over else t
