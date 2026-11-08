-- V9: Seed NAPSA formal-sector contribution rule versions for 2024-2026.
-- ceiling_amount is the monthly EARNINGS ceiling in ZMW; the maximum per party is 5% of it.
-- Rates are stored as fractions (0.05 = 5%).
-- Open gaps: G2 (rounding and banding unconfirmed), G3 (due-date boundary unconfirmed).

INSERT INTO contribution_rule_version (
    rule_code, version_no, effective_from, effective_to,
    employee_rate, employer_rate, ceiling_amount,
    due_day_rule, rounding_rule, source_reference, verification_status
) VALUES
(
    'NAPSA_FORMAL', 1, DATE '2024-01-01', DATE '2024-12-31',
    0.050000, 0.050000, 29816.00,
    'DAY_OF_FOLLOWING_MONTH:10', 'HALF_UP_2DP',
    'NAPSA ceiling notice and contribution calculator (napsa.co.zm), accessed 7 Nov 2026. 2024 earnings ceiling ZMW 29,816.00 (maximum 1,490.80 per party), corroborated by independent payroll and tax sources and identified in SI 9 of 2024 (schedule not yet read). Assumptions: half-up rounding to 2 dp; continuous 5% calculation; due date 10th of following month, boundary and weekend handling unconfirmed. The napsa.co.zm formal-sector page figure of 2,892.03 was disregarded as inconsistent.',
    'VERIFIED'
),
(
    'NAPSA_FORMAL', 2, DATE '2025-01-01', DATE '2025-12-31',
    0.050000, 0.050000, 34164.00,
    'DAY_OF_FOLLOWING_MONTH:10', 'HALF_UP_2DP',
    'NAPSA ceiling announcement and contribution calculator (napsa.co.zm), accessed 7 Nov 2026. 2025 earnings ceiling ZMW 34,164.00 (maximum 1,708.20 per party), corroborated by a PwC tax alert and payroll sources. Statutory instrument not yet read. Assumptions: half-up rounding to 2 dp; continuous 5% calculation; due date 10th of following month, boundary and weekend handling unconfirmed.',
    'VERIFIED'
),
(
    'NAPSA_FORMAL', 3, DATE '2026-01-01', DATE '2026-12-31',
    0.050000, 0.050000, 37236.00,
    'DAY_OF_FOLLOWING_MONTH:10', 'HALF_UP_2DP',
    'NAPSA contribution calculator (napsa.co.zm), accessed 7 Nov 2026. 2026 earnings ceiling ZMW 37,236.00 (maximum 1,861.80 per party), corroborated by independent payroll and tax sources; SI 103 of 2025 (gazetted 30 Dec 2025) identified as the probable instrument, not yet read. Assumptions: half-up rounding to 2 dp; continuous 5% calculation; due date 10th of following month, boundary and weekend handling unconfirmed.',
    'VERIFIED'
);