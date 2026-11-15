class_name ClockLoop
extends RefCounted
# Runs a Sim by the clock (D175). The caller says what time it is, in
# microseconds; this runs every tick that is due. A slow tick makes the next
# call run the late ones, so none is dropped.

var sim: Sim
var _tick_rate: int
var _start_usec: int
var _ran: int = 0


func _init(sim_to_run: Sim, now_usec: int) -> void:
	sim = sim_to_run
	_tick_rate = sim.settings.tick_rate
	_start_usec = now_usec


# Runs the ticks due at now_usec, at most max_ticks of them when it is 0 or
# more. Returns how many ran. Due ticks are counted from the start time, so a
# rate that doesn't divide a second doesn't drift.
func pump(now_usec: int, max_ticks: int = -1) -> int:
	var due := (now_usec - _start_usec) * _tick_rate / 1000000
	var n := maxi(0, due - _ran)
	if max_ticks >= 0:
		n = mini(n, max_ticks)
	for i in n:
		sim.step()
	_ran += n
	return n
