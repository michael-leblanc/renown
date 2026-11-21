class_name WorldFolder
extends RefCounted
# A world folder on disk (D173, D182): the land, written once, and the living
# state, written again and again. Takes and gives text. A living file is
# written to a temporary name and then renamed to a new numbered name, so a
# reader never sees half a file and nothing is overwritten. The newest file
# and `backups` older ones are kept. File names hold no path.

const LAND := "land.txt"
const LIVING_PREFIX := "living-"
const LIVING_SUFFIX := ".txt"
const TEMP := "living.tmp"

var path: String
var backups: int


func _init(folder: String, backups_to_keep: int) -> void:
	path = folder
	backups = backups_to_keep


func write_land(text: String) -> Error:
	if FileAccess.file_exists(path.path_join(LAND)):
		return ERR_ALREADY_EXISTS
	var err := _ensure_dir()
	if err != OK:
		return err
	return _write_swapped(text, LAND)


func write_living(text: String) -> Error:
	var err := _ensure_dir()
	if err != OK:
		return err
	var numbers := _living_numbers()
	var next := 1 if numbers.is_empty() else numbers[-1] + 1
	err = _write_swapped(text, _living_name(next))
	if err != OK:
		return err
	numbers.append(next)
	while numbers.size() > backups + 1:
		DirAccess.remove_absolute(path.path_join(_living_name(numbers.pop_front())))
	return OK


func read_land() -> String:
	return _read(LAND)


# The newest whole living file, "" when there is none.
func read_living() -> String:
	return read_living_at(1)


# The nth newest living file (1 is the newest), "" when there is none.
func read_living_at(nth: int) -> String:
	var numbers := _living_numbers()
	if nth < 1 or nth > numbers.size():
		return ""
	return _read(_living_name(numbers[numbers.size() - nth]))


func _ensure_dir() -> Error:
	if DirAccess.dir_exists_absolute(path):
		return OK
	return DirAccess.make_dir_recursive_absolute(path)


func _write_swapped(text: String, final_name: String) -> Error:
	var temp := path.path_join(TEMP)
	var f := FileAccess.open(temp, FileAccess.WRITE)
	if f == null:
		return FileAccess.get_open_error()
	f.store_string(text)
	f.flush()
	f.close()
	return DirAccess.rename_absolute(temp, path.path_join(final_name))


func _read(file_name: String) -> String:
	var full := path.path_join(file_name)
	if not FileAccess.file_exists(full):
		return ""
	return FileAccess.get_file_as_string(full)


func _living_name(n: int) -> String:
	return "%s%06d%s" % [LIVING_PREFIX, n, LIVING_SUFFIX]


# Numbers of the living files there, oldest first.
func _living_numbers() -> Array[int]:
	var out: Array[int] = []
	for f in DirAccess.get_files_at(path):
		if f.begins_with(LIVING_PREFIX) and f.ends_with(LIVING_SUFFIX):
			var digits := f.trim_prefix(LIVING_PREFIX).trim_suffix(LIVING_SUFFIX)
			if digits.is_valid_int():
				out.append(digits.to_int())
	out.sort()
	return out
