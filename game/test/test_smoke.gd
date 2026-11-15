extends GutTest
# Proves the test runner itself runs. Later tests live in folders that
# mirror the code (test/sim/test_world.gd tests sim/world.gd).


func test_runner_runs_a_test() -> void:
	assert_eq(1 + 1, 2, "arithmetic still works")
