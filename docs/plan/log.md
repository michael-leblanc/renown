# Log

<!-- Append only. One line per event: YYYY-MM-DD HH:MM | <id> | <event> | <note> -->
2026-11-14 21:53 | OPS-001 | dispatched | prerequisite of the test game
2026-11-14 21:56 | OPS-001 | verify_pass | implementer done, red yes; adds scripts/check_parse.sh outside touches
2026-11-14 22:01 | OPS-001 | qa_fail | 2 issues (verify -d false PASS, download temp left), waiting on reviewer
2026-11-14 22:02 | OPS-001 | review_fail | 4 points (2 shared with QA); fix round 1/3
2026-11-14 22:05 | OPS-001 | verify_pass | fix round 1 done (57a40a0), back to QA and reviewer
2026-11-14 22:07 | OPS-001 | qa_pass | re-check after fix round 1; waiting on reviewer
2026-11-14 22:08 | OPS-001 | review_fail | script error in setup/teardown gives PASS; fix round 2/3
2026-11-14 22:09 | OPS-001 | verify_pass | fix round 2 done (3c1965a), back to reviewer
2026-11-14 22:12 | OPS-001 | review_fail | round-2 fix fails on GUT-handled engine errors; fix round 3/3
2026-11-14 22:14 | OPS-001 | verify_pass | fix round 3 done (3ee3377), back to reviewer
2026-11-14 22:16 | OPS-001 | qa_pass | re-check after fix round 3; waiting on reviewer
2026-11-14 22:18 | OPS-001 | merged | PR #1 squash 716df17 after 3 fix rounds
2026-11-14 22:18 | PRO-001 | dispatched |
2026-11-14 22:28 | PRO-001 | verify_pass | c01d1b3, 112 PNGs 13 MB; to QA + reviewer
2026-11-14 22:29 | PRO-001 | qa_pass | waiting on reviewer
2026-11-14 22:30 | PRO-001 | merged | PR #2 squash 4274ff0
2026-11-14 22:30 | PRO-002 | dispatched |
2026-11-14 22:30 | PRO-003 | dispatched |
2026-11-14 22:36 | PRO-002 | verify_pass | to QA + reviewer
2026-11-14 22:37 | PRO-002 | qa_pass | waiting on reviewer
2026-11-14 22:39 | PRO-003 | verify_pass | to QA + reviewer; Melee2 is a spear; D185 iso speed note
2026-11-14 22:39 | PRO-002 | merged | PR #3 squash 3946f91
2026-11-14 22:40 | PRO-003 | qa_pass | waiting on reviewer
2026-11-14 22:42 | PRO-003 | review_pass | 2 points would hurt PRO-004..006 (walk fps vs speed, animation API); fix round 1/3 before merge
2026-11-14 22:43 | PRO-003 | verify_pass | fix round 1 done (0751c77), back to QA + reviewer
2026-11-14 22:44 | PRO-003 | qa_pass | re-check after fix round 1; waiting on reviewer
2026-11-14 22:45 | PRO-003 | merged | squash 8f67d96
2026-11-14 22:45 | PRO-004 | dispatched |
2026-11-14 22:45 | PRO-005 | dispatched |
2026-11-14 22:50 | PRO-005 | verify_pass | to QA + reviewer
2026-11-14 22:51 | PRO-004 | verify_pass | to QA + reviewer
2026-11-14 22:52 | PRO-005 | qa_pass | waiting on reviewer
2026-11-14 22:52 | PRO-004 | qa_pass | waiting on reviewer
2026-11-14 22:54 | PRO-005 | merged | squash 73c3467
2026-11-14 22:54 | PRO-004 | review_fail | check can hang; candidates not reusable by PRO-006; fix round 1/3
2026-11-14 22:57 | PRO-004 | verify_pass | fix round 1 done, back to QA + reviewer
2026-11-14 22:58 | PRO-004 | qa_pass | re-check after fix round 1; waiting on reviewer
2026-11-14 22:59 | PRO-004 | review_fail | play during flash hold stays frozen; fix round 2/3
2026-11-14 23:00 | PRO-004 | verify_pass | fix round 2 done, check.gd PASS; back to reviewer
2026-11-14 23:02 | PRO-004 | merged | squash 847ecb8 after 2 fix rounds
2026-11-14 23:02 | PRO-006 | dispatched |
2026-11-14 23:11 | PRO-006 | verify_pass | to QA + reviewer; mean fight 26-29 s (D165 lesson)
2026-11-14 23:13 | PRO-006 | review_fail | blocks cut at 0.5 s by next swing; fight timer resets on resume; waiting on QA
2026-11-14 23:14 | PRO-006 | qa_pass | fix round 1/3 sent for the 2 review points
2026-11-14 23:16 | PRO-006 | verify_pass | fix round 1 done (5167b01), back to reviewer
2026-11-14 23:18 | PRO-006 | review_fail | UAT keys for full blocks give 1.5 s, CrouchIdle needs 1.875 s; fix round 2/3
2026-11-14 23:19 | PRO-006 | merged | squash 6507021 after 2 fix rounds; test game built, PRO-007 needs Michael
