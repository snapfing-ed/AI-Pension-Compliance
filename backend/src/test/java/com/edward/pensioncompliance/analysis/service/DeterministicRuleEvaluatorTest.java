package com.edward.pensioncompliance.analysis.service;

import com.edward.pensioncompliance.analysis.dto.FindingDraft;
import com.edward.pensioncompliance.analysis.dto.RuleInputs;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DeterministicRuleEvaluatorTest {

    private final DeterministicRuleEvaluator evaluator = new DeterministicRuleEvaluator();

    private static RuleInputs in(int batches, int returns, boolean reportedUnknown, boolean scopeIncomplete,
                                 String expected, String reported, String paid) {
        return new RuleInputs(1L, 1L, batches, returns, reportedUnknown, scopeIncomplete,
                new BigDecimal(expected), new BigDecimal(reported), new BigDecimal(paid), 0, 0);
    }

    private static RuleInputs inWithDelays(int batches, int returns, String expected, String reported, String paid,
                                           int returnDaysLate, int paymentDaysLate) {
        return new RuleInputs(1L, 1L, batches, returns, false, false,
                new BigDecimal(expected), new BigDecimal(reported), new BigDecimal(paid),
                returnDaysLate, paymentDaysLate);
    }

    private static List<String> codes(List<FindingDraft> drafts) {
        return drafts.stream().map(FindingDraft::findingCode).toList();
    }

    @Test
    void fullyReconciled_producesNoFindings() {
        assertThat(evaluator.evaluate(in(1, 1, false, false, "500.00", "500.00", "500.00"))).isEmpty();
    }

    @Test
    void noPayrollBatch_producesOnlyMissingPayrollFinding() {
        assertThat(codes(evaluator.evaluate(in(0, 0, false, false, "0.00", "0.00", "0.00"))))
                .containsExactly("RULE_MISSING_PAYROLL_BATCH");
    }

    @Test
    void payrollWithoutReturn_producesMissingReturnFinding() {
        assertThat(codes(evaluator.evaluate(in(1, 0, false, false, "500.00", "0.00", "500.00"))))
                .containsExactly("RULE_MISSING_CONTRIBUTION_RETURN");
    }

    @Test
    void reportedBelowExpected_scoreGrowsWithShortfall() {
        List<FindingDraft> r = evaluator.evaluate(in(1, 1, false, false, "500.00", "350.00", "500.00"));
        assertThat(codes(r)).containsExactly("RULE_UNDER_REPORTED_CONTRIBUTION");
        assertThat(r.get(0).category()).isEqualTo("POTENTIALLY_INCOMPLETE");
        assertThat(r.get(0).priorityScore()).isEqualByComparingTo("55.300");
    }

    @Test
    void explicitZeroReported_isUnderReported_notMissing() {
        List<FindingDraft> r = evaluator.evaluate(in(1, 1, false, false, "500.00", "0.00", "500.00"));
        assertThat(codes(r)).containsExactly("RULE_UNDER_REPORTED_CONTRIBUTION");
        assertThat(r.get(0).priorityScore()).isEqualByComparingTo("56.000");
    }

    @Test
    void unknownReportedTotal_isNotTreatedAsZero() {
        List<FindingDraft> r = evaluator.evaluate(in(1, 1, true, false, "500.00", "0.00", "500.00"));
        assertThat(codes(r)).containsExactly("RULE_RETURN_AMOUNT_MISSING");
        assertThat(codes(r)).doesNotContain("RULE_UNDER_REPORTED_CONTRIBUTION");
    }

    @Test
    void paymentsBelowExpected_producesShortfallFinding() {
        List<FindingDraft> r = evaluator.evaluate(in(1, 1, false, false, "500.00", "500.00", "200.00"));
        assertThat(codes(r)).containsExactly("RULE_UNREMITTED_CONTRIBUTION_SHORTFALL");
        assertThat(r.get(0).category()).isEqualTo("POTENTIALLY_DELAYED");
        assertThat(r.get(0).priorityScore()).isEqualByComparingTo("60.600");
    }

    @Test
    void lateReturnAndLatePayment_producePotentiallyDelayedFindings() {
        List<FindingDraft> r = evaluator.evaluate(inWithDelays(1, 1, "500.00", "500.00", "500.00", 4, 10));
        assertThat(codes(r)).containsExactly("RULE_LATE_RETURN_SUBMISSION", "RULE_LATE_PAYMENT");
        assertThat(r.get(0).category()).isEqualTo("POTENTIALLY_DELAYED");
        assertThat(r.get(0).priorityScore()).isEqualByComparingTo("61.000"); // 55 + 4 * 1.5
        assertThat(r.get(1).category()).isEqualTo("POTENTIALLY_DELAYED");
        assertThat(r.get(1).priorityScore()).isEqualByComparingTo("70.000"); // 55 + 10 * 1.5
    }

    @Test
    void lateScoreIsCappedAtOneHundred() {
        List<FindingDraft> r = evaluator.evaluate(inWithDelays(1, 1, "500.00", "500.00", "500.00", 45, 0));
        assertThat(r.get(0).priorityScore()).isEqualByComparingTo("100.000");
    }

    @Test
    void priorityScoreIsCappedAtOneHundred() {
        List<FindingDraft> r = evaluator.evaluate(in(1, 1, false, false, "100000.00", "0.00", "100000.00"));
        assertThat(r.get(0).priorityScore()).isEqualByComparingTo("100.000");
    }

    @Test
    void paidAboveExpected_producesUnusualPatternFinding() {
        List<FindingDraft> r = evaluator.evaluate(in(1, 1, false, false, "500.00", "500.00", "650.00"));
        assertThat(codes(r)).containsExactly("RULE_POSITIVE_CONTRIBUTION_VARIANCE");
        assertThat(r.get(0).category()).isEqualTo("UNUSUAL_PATTERN");
    }

    @Test
    void incompleteScopeEvidence_producesIncompleteScopeFinding() {
        assertThat(codes(evaluator.evaluate(in(1, 1, false, true, "500.00", "500.00", "500.00"))))
                .containsExactly("RULE_INCOMPLETE_SCOPE_EVIDENCE");
    }

    @Test
    void everyFinding_isLabelledRuleMethod() {
        List<FindingDraft> r = evaluator.evaluate(in(0, 0, false, true, "0.00", "0.00", "0.00"));
        assertThat(r).isNotEmpty().allMatch(d -> d.detectionMethod().equals("RULE"));
    }
}