package com.edward.pensioncompliance.analysis.service;

import com.edward.pensioncompliance.analysis.dto.AnalysisVarianceResult;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class ComplianceAnalysisServiceTest {

    private final ComplianceAnalysisService service = new ComplianceAnalysisService();

    @Test
    void exactMatch_returnsNoIssueDetectedAndZeroVariance() {
        AnalysisVarianceResult r = service.analyzeContribution(
                new BigDecimal("500.00"), new BigDecimal("500.00"));
        assertThat(r.status()).isEqualTo("NO_ISSUE_DETECTED");
        assertThat(r.variance()).isEqualByComparingTo("0.00");
        assertThat(r.explanationCode()).isEqualTo("EXACT_MATCH");
    }

    @Test
    void withinTolerance_returnsNoIssueDetected() {
        AnalysisVarianceResult r = service.analyzeContribution(
                new BigDecimal("500.00"), new BigDecimal("499.98"), new BigDecimal("0.05"));
        assertThat(r.status()).isEqualTo("NO_ISSUE_DETECTED");
        assertThat(r.variance()).isEqualByComparingTo("0.02");
        assertThat(r.explanationCode()).isEqualTo("WITHIN_TOLERANCE");
    }

    @Test
    void lowerReported_returnsPotentiallyIncompleteAndPositiveVariance() {
        AnalysisVarianceResult r = service.analyzeContribution(
                new BigDecimal("500.00"), new BigDecimal("350.00"));
        assertThat(r.status()).isEqualTo("POTENTIALLY_INCOMPLETE");
        assertThat(r.variance()).isEqualByComparingTo("150.00");
        assertThat(r.explanationCode()).isEqualTo("REPORTED_AMOUNT_BELOW_EXPECTED");
    }

    @Test
    void overReported_returnsRequiresReviewAndNegativeVariance() {
        AnalysisVarianceResult r = service.analyzeContribution(
                new BigDecimal("500.00"), new BigDecimal("650.00"));
        assertThat(r.status()).isEqualTo("REQUIRES_REVIEW");
        assertThat(r.variance()).isEqualByComparingTo("-150.00");
        assertThat(r.explanationCode()).isEqualTo("REPORTED_AMOUNT_ABOVE_EXPECTED");
    }

    @Test
    void zeroReported_returnsPotentiallyMissing() {
        AnalysisVarianceResult r = service.analyzeContribution(
                new BigDecimal("500.00"), BigDecimal.ZERO);
        assertThat(r.status()).isEqualTo("POTENTIALLY_MISSING");
        assertThat(r.variance()).isEqualByComparingTo("500.00");
        assertThat(r.explanationCode()).isEqualTo("NO_REPORTED_CONTRIBUTION");
    }

    @Test
    void nullExpected_returnsDataIncomplete() {
        AnalysisVarianceResult r = service.analyzeContribution(null, new BigDecimal("200.00"));
        assertThat(r.status()).isEqualTo("DATA_INCOMPLETE");
        assertThat(r.variance()).isNull();
        assertThat(r.explanationCode()).isEqualTo("MISSING_EXPECTED_DATA");
    }
}