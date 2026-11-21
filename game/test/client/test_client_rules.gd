extends GutTest
# Tests the connect screen's first state, the player id, the launch arguments, the
# rule that client code never names the server's classes, and the shot tool
# (CLI-001).

const SCREEN := "res://client/connect/connect.tscn"

var _files: Array[String] = []


func after_each() -> void:
	for path in _files:
		DirAccess.remove_absolute(path)
	_files.clear()


func _temp_file() -> String:
	var path := "user://test_player_id_%d.txt" % randi()
	_files.append(path)
	return path


func _screen(args: PackedStringArray) -> ConnectScreen:
	var holder := Node.new()
	holder.name = "Holder%d" % randi()
	add_child_autofree(holder)
	get_tree().set_multiplayer(MultiplayerAPI.create_default_interface(), holder.get_path())
	var screen: ConnectScreen = load(SCREEN).instantiate()
	screen.args = args
	screen.link_parent = holder
	screen.player_file = _temp_file()
	holder.add_child(screen)
	return screen


func _scripts_under(dir: String) -> Array[String]:
	var found: Array[String] = []
	for file in DirAccess.get_files_at(dir):
		if file.ends_with(".gd"):
			found.append(dir.path_join(file))
	for sub in DirAccess.get_directories_at(dir):
		found.append_array(_scripts_under(dir.path_join(sub)))
	return found


func test_given_the_game_started_with_no_arguments_when_its_first_screen_shows_then_it_has_an_address_field_filled_with_127_0_0_1_a_port_field_filled_with_the_default_port_and_a_connect_button() -> void:
	var screen := _screen(PackedStringArray())
	var settings := SimSettings.load_file("res://data/settings.json")
	assert_eq(screen.get_node("%Address").text, "127.0.0.1")
	assert_eq(screen.get_node("%Port").text, str(int(settings.value("net_port"))))
	var button: Button = screen.get_node("%Connect")
	assert_eq(button.text, "Connect")
	assert_false(button.disabled)
	assert_false(screen.is_connecting())
	assert_true(screen.get_node("%Form").visible)


func test_given_a_first_start_when_the_game_opens_then_it_writes_a_random_player_id_under_user_and_a_later_start_reads_the_same_one() -> void:
	var path := _temp_file()
	assert_false(FileAccess.file_exists(path))
	var first := PlayerId.resolve(PackedStringArray(), path)
	assert_ne(first, "")
	assert_true(FileAccess.file_exists(path))
	assert_eq(PlayerId.resolve(PackedStringArray(), path), first)
	var other_path := _temp_file()
	assert_ne(PlayerId.resolve(PackedStringArray(), other_path), first, "a new file gets a new random id")


func test_given_a_screen_started_for_the_first_time_when_it_opens_then_it_has_written_its_player_id() -> void:
	var screen := _screen(PackedStringArray())
	assert_true(FileAccess.file_exists(screen.player_file))
	assert_eq(screen.player, FileAccess.get_file_as_string(screen.player_file).strip_edges())


func test_given_player_name_when_the_game_starts_then_name_is_the_player_id_and_nothing_is_written() -> void:
	var path := _temp_file()
	assert_eq(PlayerId.resolve(PackedStringArray(["--player=bob"]), path), "bob")
	assert_false(FileAccess.file_exists(path))
	var screen := _screen(PackedStringArray(["--player=ann"]))
	assert_eq(screen.player, "ann")
	assert_false(FileAccess.file_exists(screen.player_file))


func test_given_address_port_and_connect_when_the_game_starts_then_it_connects_with_no_click() -> void:
	var launch := LaunchArgs.parse(PackedStringArray(["--address=10.0.0.5", "--port=24999", "--connect"]))
	assert_eq(launch["address"], "10.0.0.5")
	assert_eq(launch["port"], 24999)
	assert_true(launch["connect"])
	assert_false(LaunchArgs.parse(PackedStringArray(["--port=1"]))["connect"])
	assert_eq(LaunchArgs.parse(PackedStringArray()).get("address", ""), "")
	# Nowhere to connect to, so it stays connecting until the timeout.
	var screen := _screen(PackedStringArray(["--address=127.0.0.1", "--port=24999", "--connect"]))
	await wait_frames(2)
	assert_eq(screen.get_node("%Address").text, "127.0.0.1")
	assert_eq(screen.get_node("%Port").text, "24999")
	assert_true(screen.is_connecting())
	assert_true(screen.get_node("%Connect").disabled)


func test_given_every_script_under_game_client_when_the_test_reads_them_then_none_names_a_class_from_game_sim_or_game_server() -> void:
	var forbidden: Array[String] = []
	for dir in ["res://sim", "res://server"]:
		for path in _scripts_under(dir):
			var match := RegEx.create_from_string("(?m)^class_name\\s+(\\w+)").search(FileAccess.get_file_as_string(path))
			if match != null:
				forbidden.append(match.get_string(1))
	assert_gt(forbidden.size(), 5, "found the classes to look for")
	var scripts := _scripts_under("res://client")
	assert_gt(scripts.size(), 3, "found the client scripts")
	for path in scripts:
		var source := FileAccess.get_file_as_string(path)
		assert_false(source.contains("res://sim") or source.contains("res://server"), "%s loads a sim or server file" % path)
		for class_name_in_use in forbidden:
			var word := RegEx.create_from_string("\\b%s\\b" % class_name_in_use)
			assert_null(word.search(source), "%s names %s" % [path, class_name_in_use])


func test_given_the_client_settings_when_they_are_read_then_the_connect_timeout_and_shot_frames_are_numbers_from_the_data_folder() -> void:
	var settings := ClientSettings.load_file("res://data/client.json")
	assert_not_null(settings)
	assert_gt(settings.number("connect_timeout"), 0.0)
	assert_gt(settings.number("shot_frames"), 0.0)
	assert_eq(settings.text("default_address"), "127.0.0.1")


func test_given_a_scene_path_with_shot_file_when_the_shot_tool_reads_the_arguments_then_it_gives_the_file_and_the_frames_to_wait() -> void:
	var shot: Node = load("res://tools/shot.gd").new()
	add_child_autofree(shot)
	assert_eq(shot.file_from(PackedStringArray(["res://client/connect/connect.tscn", "--shot", "a.png"])), "a.png")
	assert_eq(shot.file_from(PackedStringArray(["res://client/connect/connect.tscn"])), "")
	assert_eq(shot.file_from(PackedStringArray(["--shot"])), "")
	assert_true(shot.missing_name)
	assert_eq(shot.frames_to_wait(), int(ClientSettings.load_file("res://data/client.json").number("shot_frames")))
	assert_true(shot.save_path("a.png").ends_with("/shots/a.png"))
	assert_eq(shot.save_path("/x/y.png"), "/x/y.png")


func test_given_the_project_when_it_is_read_then_the_main_menu_app_is_the_main_scene_and_the_shot_tool_is_registered() -> void:
	assert_eq(ProjectSettings.get_setting("application/run/main_scene"), "res://client/connect/app.tscn")
	assert_true(str(ProjectSettings.get_setting("autoload/Shot", "")).ends_with("res://tools/shot.gd"))
