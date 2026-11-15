extends Node
## Screenshot runner for the test game (D201), registered as the autoload "Shot".
##
## scripts/godot.sh --path prototype res://some_scene.tscn --shot out.png
##
## With --shot <file>: waits SHOT_FRAMES frames, saves the window as a PNG in
## prototype/shots/ and quits with code 0. Quits with 1 instead if anything
## printed a script or parse error, or the scene did not load. Without --shot
## it does nothing, so the game runs normally.
## Throwaway code: it follows none of game/sim/'s rules.

const SHOT_FRAMES := 10  # frames to wait before the picture, so the scene has drawn
const SHOT_DIR := "res://shots"

var _errors := 0
var _missing_name := false  # --shot was the last argument
var _logger: Logger = null


class ErrorCounter extends Logger:
	var owner_node: Node

	# Called from any thread for each error Godot prints (parse errors included).
	func _log_error(function: String, file: String, line: int, code: String, rationale: String, editor_notify: bool, error_type: int, script_backtraces: Array[ScriptBacktrace]) -> void:
		if error_type == Logger.ERROR_TYPE_WARNING:
			return
		owner_node._errors += 1


func _init() -> void:
	# _init runs before the main scene loads, so a parse error in it is counted.
	if _shot_file().is_empty():
		return
	_logger = ErrorCounter.new()
	_logger.owner_node = self
	OS.add_logger(_logger)


func _ready() -> void:
	var file := _shot_file()
	if _missing_name:
		printerr("shot: --shot needs a file name")
		get_tree().quit(1)
		return
	if file.is_empty():
		return
	_run(file)


func _run(file: String) -> void:
	for i in SHOT_FRAMES:
		await get_tree().process_frame
	# force_draw: a window nobody can see (another workspace, a locked screen)
	# gets no frame callbacks, so the normal loop stops drawing and a wait for
	# frame_post_draw would never end.
	RenderingServer.force_draw()
	if get_tree().current_scene == null:
		printerr("shot: the scene did not load")
		_quit(1)
		return
	if _errors > 0:
		printerr("shot: %d error(s) were printed, no picture saved" % _errors)
		_quit(1)
		return
	var image := get_viewport().get_texture().get_image()
	if image == null or image.is_empty():
		printerr("shot: no picture (headless has no window to save)")
		_quit(1)
		return
	var path := _save_path(file)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	var err := image.save_png(path)
	if err != OK:
		printerr("shot: could not save %s (error %d)" % [path, err])
		_quit(1)
		return
	print("shot: saved ", path)
	_quit(0)


func _quit(code: int) -> void:
	get_tree().quit(code)


## The value after --shot, from the engine arguments or the user arguments.
func _shot_file() -> String:
	var args := OS.get_cmdline_args()
	args.append_array(OS.get_cmdline_user_args())
	var i := args.find("--shot")
	if i == -1:
		return ""
	if i + 1 >= args.size():
		_missing_name = true
		return ""
	return args[i + 1]


## A bare name goes to prototype/shots/; a res:// or absolute path is used as given.
func _save_path(file: String) -> String:
	if file.begins_with("res://") or file.is_absolute_path():
		return ProjectSettings.globalize_path(file)
	return ProjectSettings.globalize_path(SHOT_DIR.path_join(file))
