class_name ClockLoop
extends RefCounted
# Runs a Sim by the clock (D175). The caller says what time it is, in
# microseconds; this runs every tick that is due. A slow tick makes the next
# call run the late ones, so none is dropped.

var sim: Sim
var _tick_usec: int
var _start_usec: int
var _ran: int = 0


func _init(sim_to_run: Sim, now_usec: int) -> void:
	sim = sim_to_run
	_tick_usec = 1000000 / sim.settings.tick_rate
	_start_usec = now_usec


# Runs the ticks due at now_usec. Returns how many ran.
func pump(now_usec: int) -> int:
	var due := (now_usec - _start_usec) / _tick_usec
	var n := maxi(0, due - _ran)
	for i in n:
		sim.step()
	_ran += n
	return n
