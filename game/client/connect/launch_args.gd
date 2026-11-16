class_name LaunchArgs
extends RefCounted
# What the game was started with: --address=IP, --port=N, --connect (connect with no
# click) and --player=NAME (see PlayerId). Only what was given is in the result,
# except "connect", which is always there.


static func parse(args: PackedStringArray) -> Dictionary:
	var launch := {"connect": false}
	for arg in args:
		if arg.begins_with("--address="):
			launch["address"] = arg.trim_prefix("--address=")
		elif arg.begins_with("--port="):
			launch["port"] = int(arg.trim_prefix("--port="))
		elif arg == "--connect":
			launch["connect"] = true
	return launch


# The engine's own arguments and the ones after "--".
static func from_command_line() -> PackedStringArray:
	var args := OS.get_cmdline_args()
	args.append_array(OS.get_cmdline_user_args())
	return args
