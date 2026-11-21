extends GutTest
# Tests server/world_folder.gd (NET-006).

var _dir: String


func before_each() -> void:
	_dir = "user://test_world_%d" % randi()


func after_each() -> void:
	_remove(_dir)
	_remove(_dir + "_copy")


func _remove(path: String) -> void:
	for f in DirAccess.get_files_at(path):
		DirAccess.remove_absolute(path.path_join(f))
	DirAccess.remove_absolute(path)


func _folder(backups: int = 10) -> WorldFolder:
	return WorldFolder.new(_dir, backups)


func test_empty_folder_gets_two_files_one_for_each() -> void:
	var w := _folder()
	assert_eq(w.write_land("land"), OK)
	assert_eq(w.write_living("alive"), OK)
	assert_eq(DirAccess.get_files_at(_dir).size(), 2)
	assert_eq(w.read_land(), "land")
	assert_eq(w.read_living(), "alive")


func test_new_living_file_is_swapped_in_beside_the_old() -> void:
	var w := _folder()
	w.write_living("one")
	w.write_living("two")
	assert_eq(w.read_living(), "two")
	assert_eq(DirAccess.get_files_at(_dir).size(), 2, "old kept as a backup")
	for f in DirAccess.get_files_at(_dir):
		assert_false(f.ends_with(".tmp"), "no temporary file left")


func test_leftover_temporary_file_is_ignored() -> void:
	var w := _folder()
	w.write_living("whole")
	var f := FileAccess.open(_dir.path_join("living.tmp"), FileAccess.WRITE)
	f.store_string("hal")
	f.close()
	assert_eq(w.read_living(), "whole")
	w.write_living("next")
	assert_eq(w.read_living(), "next")


func test_twelve_writes_keep_newest_and_ten_backups() -> void:
	var w := _folder()
	for i in 12:
		w.write_living("v%d" % i)
	assert_eq(DirAccess.get_files_at(_dir).size(), 11)
	assert_eq(w.read_living(), "v11")
	assert_eq(w.read_living_at(11), "v1")
	assert_eq(w.read_living_at(12), "", "oldest gone")


func test_land_is_written_once() -> void:
	var w := _folder()
	assert_eq(w.write_land("a"), OK)
	assert_ne(w.write_land("b"), OK)
	assert_eq(w.read_land(), "a")


func test_copied_folder_reads_the_same_with_no_path_inside() -> void:
	var w := _folder()
	w.write_land("land")
	w.write_living("alive")
	DirAccess.make_dir_absolute(_dir + "_copy")
	for f in DirAccess.get_files_at(_dir):
		DirAccess.copy_absolute(_dir.path_join(f), (_dir + "_copy").path_join(f))
		assert_false(f.contains("/") or f.contains(_dir))
	var c := WorldFolder.new(_dir + "_copy", 10)
	assert_eq(c.read_land(), "land")
	assert_eq(c.read_living(), "alive")
	assert_false(c.read_living().contains("user:"))
