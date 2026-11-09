package com.edward.pensioncompliance.contribution.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.edward.pensioncompliance.contribution.RuleSelectionException;
import com.edward.pensioncompliance.contribution.RuleVersion;
import com.edward.pensioncompliance.contribution.VerificationStatus;
import com.edward.pensioncompliance.contribution.dto.ContributionCalculationPreviewRequest;
import com.edward.pensioncompliance.contribution.dto.ContributionCalculationPreviewResponse;
import com.edward.pensioncompliance.contribution.entity.ContributionRuleVersion;
import com.edward.pensioncompliance.contribution.repository.ContributionRuleVersionRepository;
import com.edward.pensioncompliance.period.entity.ContributionPeriod;
import com.edward.pensioncompliance.period.repository.ContributionPeriodRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class ContributionRuleServiceTest {

    private static final String CODE = "NAPSA_FORMAL";

    private final ContributionRuleVersionRepository repository =
            mock(ContributionRuleVersionRepository.class);
    private final ContributionPeriodRepository periods =
            mock(ContributionPeriodRepository.class);
    private final ContributionRuleService service =
            new ContributionRuleService(repository, periods);

    private static ContributionRuleVersion entity(
            int versionNo, String from, String to, VerificationStatus status, String ceiling) {
        ContributionRuleVersion e = BeanUtils.instantiateClass(ContributionRuleVersion.class);
        ReflectionTestUtils.setField(e, "ruleVersionId", (long) versionNo);
        ReflectionTestUtils.setField(e, "ruleCode", CODE);
        ReflectionTestUtils.setField(e, "versionNo", versionNo);
        ReflectionTestUtils.setField(e, "effectiveFrom", LocalDate.parse(from));
        ReflectionTestUtils.setField(e, "effectiveTo", LocalDate.parse(to));
        ReflectionTestUtils.setField(e, "employeeRate", new BigDecimal("0.050000"));
        ReflectionTestUtils.setField(e, "employerRate", new BigDecimal("0.050000"));
        ReflectionTestUtils.setField(e, "ceilingAmount", new BigDecimal(ceiling));
        ReflectionTestUtils.setField(e, "dueDayRule", "DAY_OF_FOLLOWING_MONTH:10");
        ReflectionTestUtils.setField(e, "roundingRule", "HALF_UP_2DP");
        ReflectionTestUtils.setField(e, "sourceReference", "NAPSA");
        ReflectionTestUtils.setField(e, "verificationStatus", status);
        return e;
    }

    private void givenRules(ContributionRuleVersion... rules) {
        when(repository.findByRuleCodeOrderByVersionNoAsc(CODE)).thenReturn(List.of(rules));
    }

    private ContributionRuleVersion e2024() {
        return entity(1, "2024-01-01", "2024-12-31", VerificationStatus.VERIFIED, "29816.00");
    }

    private ContributionRuleVersion e2025() {
        return entity(2, "2025-01-01", "2025-12-31", VerificationStatus.VERIFIED, "34164.00");
    }

    private ContributionRuleVersion e2026() {
        return entity(3, "2026-01-01", "2026-12-31", VerificationStatus.VERIFIED, "37236.00");
    }

    @Test
    void mapsRatesAndCeilingFromTheMatchingRule() {
        givenRules(e2024(), e2025(), e2026());
        RuleVersion r = service.findApplicableRule(CODE, LocalDate.parse("2026-03-01"));
        assertThat(r.versionNo()).isEqualTo(3);
        assertThat(r.parameters().ceilingAmount()).isEqualByComparingTo("37236.00");
        assertThat(r.parameters().employeeRate()).isEqualByComparingTo("0.05");
    }

    @Test
    void yearBoundaries_pick2024And2025Rules() {
        givenRules(e2024(), e2025(), e2026());
        RuleVersion r2024Start = service.findApplicableRule(CODE, LocalDate.parse("2024-01-01"));
        assertThat(r2024Start.versionNo()).isEqualTo(1);
        assertThat(r2024Start.parameters().ceilingAmount()).isEqualByComparingTo("29816.00");

        assertThat(service.findApplicableRule(CODE, LocalDate.parse("2024-12-31")).versionNo())
                .isEqualTo(1);
        assertThat(service.findApplicableRule(CODE, LocalDate.parse("2025-12-31")).versionNo())
                .isEqualTo(2);
    }

    @Test
    void dateWithNoRule_throws() {
        givenRules(e2024(), e2025(), e2026());
        assertThatThrownBy(() -> service.findApplicableRule(CODE, LocalDate.parse("2023-06-01")))
                .isInstanceOf(RuleSelectionException.class);
    }

    @Test
    void unverifiedRuleIsNeverUsed() {
        givenRules(entity(9, "2026-01-01", "2026-12-31", VerificationStatus.UNVERIFIED, "37236.00"));
        assertThatThrownBy(() -> service.findApplicableRule(CODE, LocalDate.parse("2026-05-01")))
                .isInstanceOf(RuleSelectionException.class);
    }

    @Test
    void queriesTheRepositoryForTheRequestedRuleCode() {
        givenRules(e2026());
        service.findApplicableRule(CODE, LocalDate.parse("2026-05-01"));
        verify(repository).findByRuleCodeOrderByVersionNoAsc(CODE);
    }

    @Test
    void previewCalculation_resolvesPeriodAndApplies2024Ceiling() {
        givenRules(e2024(), e2025(), e2026());
        ContributionPeriod p2024 = new ContributionPeriod(2024, 6);
        ReflectionTestUtils.setField(p2024, "periodId", 10L);
        when(periods.findById(10L)).thenReturn(Optional.of(p2024));

        ContributionCalculationPreviewResponse res = service.previewCalculation(
                new ContributionCalculationPreviewRequest(new BigDecimal("40000.00"), 10L, null, null));

        assertThat(res.ruleVersionNo()).isEqualTo(1);
        assertThat(res.calculationStatus()).isEqualTo("CALCULATED");
        assertThat(res.pensionableEarnings()).isEqualByComparingTo("29816.00");
        assertThat(res.employeeAmount()).isEqualByComparingTo("1490.80");
        assertThat(res.employerAmount()).isEqualByComparingTo("1490.80");
        assertThat(res.totalAmount()).isEqualByComparingTo("2981.60");
    }

    @Test
    void previewCalculation_missingPayReturnsExcluded_andNoRuleReturnsConflict() {
        givenRules(e2026());
        ContributionCalculationPreviewResponse missing = service.previewCalculation(
                new ContributionCalculationPreviewRequest(null, null, LocalDate.parse("2026-05-01"), null));
        assertThat(missing.calculationStatus()).isEqualTo("EXCLUDED");
        assertThat(missing.explanationCode()).isEqualTo("MISSING_PAY");
        assertThat(missing.totalAmount()).isNull();

        assertThatThrownBy(() -> service.previewCalculation(
                new ContributionCalculationPreviewRequest(
                        new BigDecimal("1000"), null, LocalDate.parse("2023-05-01"), null)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatusCode().value()).isEqualTo(HttpStatus.CONFLICT.value()));
    }
}