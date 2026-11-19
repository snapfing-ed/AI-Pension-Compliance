package com.edward.pensioncompliance.analysis.service;

import com.edward.pensioncompliance.analysis.dto.FindingDraft;
import com.edward.pensioncompliance.analysis.dto.RuleInputs;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/** Pure deterministic compliance rules. No database access, so it is unit-testable. */
public class DeterministicRuleEvaluator {

    public List<FindingDraft> evaluate(RuleInputs in) {
        List<FindingDraft> out = new ArrayList<>();
        boolean hasPayroll = in.activeBatchCount() > 0;
        boolean hasReturn = in.latestReturnCount() > 0;
        BigDecimal expected = in.totalExpected();
        BigDecimal reported = in.totalReported();
        BigDecimal paid = in.totalPaid();

        if (!hasPayroll) {
            out.add(new FindingDraft(
                    "RULE_MISSING_PAYROLL_BATCH", "POTENTIALLY_MISSING",
                    "No validated payroll batch found for employer #" + in.employerId() + " in period #" + in.periodId() + ".",
                    new BigDecimal("85.000"), new BigDecimal("0.98000"), "RULE",
                    "Deterministic rule check detected zero VALIDATED payroll batches in scope."));
        }

        if (!hasReturn && hasPayroll) {
            out.add(new FindingDraft(
                    "RULE_MISSING_CONTRIBUTION_RETURN", "POTENTIALLY_MISSING",
                    "Validated payroll exists (" + expected + " ZMW expected) but no contribution return was submitted.",
                    new BigDecimal("90.000"), new BigDecimal("0.99000"), "RULE",
                    "Expected statutory contribution is " + expected + " ZMW with 0 submitted return versions."));
        }

        if (in.scopeEvidenceIncomplete()) {
            out.add(new FindingDraft(
                    "RULE_INCOMPLETE_SCOPE_EVIDENCE", "POTENTIALLY_INCOMPLETE",
                    "One or more completeness assessments in scope are marked INCOMPLETE or UNKNOWN.",
                    new BigDecimal("72.500"), new BigDecimal("0.95000"), "RULE",
                    "Scope evidence completeness check flagged non-COMPLETE assessment records."));
        }

        if (hasPayroll && hasReturn && !in.reportedUnknown() && reported.compareTo(expected) < 0) {
            BigDecimal shortfall = expected.subtract(reported);
            BigDecimal score = BigDecimal.valueOf(55.0)
                    .add(shortfall.divide(BigDecimal.valueOf(500), 3, RoundingMode.HALF_UP))
                    .min(new BigDecimal("100.000"));
            out.add(new FindingDraft(
                    "RULE_UNDER_REPORTED_CONTRIBUTION", "POTENTIALLY_INCOMPLETE",
                    "Reported contribution (" + reported + " ZMW) is below statutory expected (" + expected + " ZMW) by " + shortfall + " ZMW.",
                    score, new BigDecimal("0.99000"), "RULE",
                    "Expected=" + expected + " ZMW vs Reported=" + reported + " ZMW (variance=" + shortfall + " ZMW)."));
        }

        if (in.reportedUnknown()) {
            out.add(new FindingDraft(
                    "RULE_RETURN_AMOUNT_MISSING", "POTENTIALLY_INCOMPLETE",
                    "A submitted return version has no reported total amount, so reported contribution cannot be compared with expected.",
                    new BigDecimal("70.000"), new BigDecimal("0.95000"), "RULE",
                    "Reported total is NULL (not reported); it is treated as unknown, not zero."));
        }

        if (hasPayroll && paid.compareTo(expected) < 0) {
            BigDecimal unpaid = expected.subtract(paid);
            BigDecimal score = BigDecimal.valueOf(60.0)
                    .add(unpaid.divide(BigDecimal.valueOf(500), 3, RoundingMode.HALF_UP))
                    .min(new BigDecimal("100.000"));
            out.add(new FindingDraft(
                    "RULE_UNREMITTED_CONTRIBUTION_SHORTFALL", "POTENTIALLY_DELAYED",
                    "Allocated confirmed payments (" + paid + " ZMW) fall short of expected (" + expected + " ZMW) by " + unpaid + " ZMW.",
                    score, new BigDecimal("0.99000"), "RULE",
                    "Expected=" + expected + " ZMW vs Allocated Payments=" + paid + " ZMW (shortfall=" + unpaid + " ZMW)."));
        }

        if (in.maxReturnDaysLate() > 0) {
            BigDecimal score = BigDecimal.valueOf(55.0)
                    .add(BigDecimal.valueOf(in.maxReturnDaysLate() * 1.5))
                    .setScale(3, RoundingMode.HALF_UP)
                    .min(new BigDecimal("100.000"));
            out.add(new FindingDraft(
                    "RULE_LATE_RETURN_SUBMISSION", "POTENTIALLY_DELAYED",
                    "Contribution return was submitted " + in.maxReturnDaysLate() + " day(s) after the statutory due date.",
                    score, new BigDecimal("0.99000"), "RULE",
                    "Return submitted_at local date (Africa/Lusaka) exceeded period due date by " + in.maxReturnDaysLate() + " day(s)."));
        }

        if (in.maxPaymentDaysLate() > 0) {
            BigDecimal score = BigDecimal.valueOf(55.0)
                    .add(BigDecimal.valueOf(in.maxPaymentDaysLate() * 1.5))
                    .setScale(3, RoundingMode.HALF_UP)
                    .min(new BigDecimal("100.000"));
            out.add(new FindingDraft(
                    "RULE_LATE_PAYMENT", "POTENTIALLY_DELAYED",
                    "Allocated contribution payment was settled " + in.maxPaymentDaysLate() + " day(s) after the statutory due date.",
                    score, new BigDecimal("0.99000"), "RULE",
                    "Payment paid_at local date (Africa/Lusaka) exceeded period due date by " + in.maxPaymentDaysLate() + " day(s)."));
        }

        if (hasPayroll && (reported.compareTo(expected) > 0 || paid.compareTo(expected) > 0)) {
            out.add(new FindingDraft(
                    "RULE_POSITIVE_CONTRIBUTION_VARIANCE", "UNUSUAL_PATTERN",
                    "Reported (" + reported + " ZMW) or paid (" + paid + " ZMW) exceeds statutory expected (" + expected + " ZMW).",
                    new BigDecimal("50.000"), new BigDecimal("0.92000"), "RULE",
                    "Positive variance detected between expected (" + expected + "), reported (" + reported + "), and paid (" + paid + ")."));
        }
        return out;
    }
}