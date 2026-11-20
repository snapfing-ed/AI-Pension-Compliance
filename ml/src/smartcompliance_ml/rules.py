"""Exact Python mirror of DeterministicRuleEvaluator.java for baseline benchmarking."""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import List


@dataclass(frozen=True)
class RuleInputs:
    employer_id: int
    period_id: int
    active_batch_count: int
    latest_return_count: int
    reported_unknown: bool
    scope_evidence_incomplete: bool
    total_expected: Decimal
    total_reported: Decimal
    total_paid: Decimal
    max_return_days_late: int = 0
    max_payment_days_late: int = 0


@dataclass(frozen=True)
class FindingDraft:
    finding_code: str
    category: str
    priority_score: Decimal
    confidence_score: Decimal
    detection_method: str = "RULE"


def _q3(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)


def evaluate_rules(inp: RuleInputs) -> List[FindingDraft]:
    out: List[FindingDraft] = []
    has_payroll = inp.active_batch_count > 0
    has_return = inp.latest_return_count > 0
    expected = Decimal(inp.total_expected)
    reported = Decimal(inp.total_reported)
    paid = Decimal(inp.total_paid)

    if not has_payroll:
        out.append(FindingDraft("RULE_MISSING_PAYROLL_BATCH", "POTENTIALLY_MISSING", Decimal("85.000"), Decimal("0.98000")))

    if not has_return and has_payroll:
        out.append(FindingDraft("RULE_MISSING_CONTRIBUTION_RETURN", "POTENTIALLY_MISSING", Decimal("90.000"), Decimal("0.99000")))

    if inp.scope_evidence_incomplete:
        out.append(FindingDraft("RULE_INCOMPLETE_SCOPE_EVIDENCE", "POTENTIALLY_INCOMPLETE", Decimal("72.500"), Decimal("0.95000")))

    if has_payroll and has_return and not inp.reported_unknown and reported < expected:
        shortfall = expected - reported
        score = min(Decimal("100.000"), _q3(Decimal("55.0") + (shortfall / Decimal("500"))))
        out.append(FindingDraft("RULE_UNDER_REPORTED_CONTRIBUTION", "POTENTIALLY_INCOMPLETE", score, Decimal("0.99000")))

    if inp.reported_unknown:
        out.append(FindingDraft("RULE_RETURN_AMOUNT_MISSING", "POTENTIALLY_INCOMPLETE", Decimal("70.000"), Decimal("0.95000")))

    if has_payroll and paid < expected:
        unpaid = expected - paid
        score = min(Decimal("100.000"), _q3(Decimal("60.0") + (unpaid / Decimal("500"))))
        out.append(FindingDraft("RULE_UNREMITTED_CONTRIBUTION_SHORTFALL", "POTENTIALLY_DELAYED", score, Decimal("0.99000")))

    if inp.max_return_days_late > 0:
        score = min(Decimal("100.000"), _q3(Decimal("55.0") + Decimal(str(inp.max_return_days_late * 1.5))))
        out.append(FindingDraft("RULE_LATE_RETURN_SUBMISSION", "POTENTIALLY_DELAYED", score, Decimal("0.99000")))

    if inp.max_payment_days_late > 0:
        score = min(Decimal("100.000"), _q3(Decimal("55.0") + Decimal(str(inp.max_payment_days_late * 1.5))))
        out.append(FindingDraft("RULE_LATE_PAYMENT", "POTENTIALLY_DELAYED", score, Decimal("0.99000")))

    if has_payroll and (reported > expected or paid > expected):
        out.append(FindingDraft("RULE_POSITIVE_CONTRIBUTION_VARIANCE", "UNUSUAL_PATTERN", Decimal("50.000"), Decimal("0.92000")))

    return out