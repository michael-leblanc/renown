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
