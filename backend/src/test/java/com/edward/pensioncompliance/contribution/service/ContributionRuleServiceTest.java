package com.edward.pensioncompliance.contribution.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.edward.pensioncompliance.contribution.RuleSelectionException;
import com.edward.pensioncompliance.contribution.RuleVersion;
import com.edward.pensioncompliance.contribution.VerificationStatus;
import com.edward.pensioncompliance.contribution.entity.ContributionRuleVersion;
import com.edward.pensioncompliance.contribution.repository.ContributionRuleVersionRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

class ContributionRuleServiceTest {

    private static final String CODE = "NAPSA_FORMAL";

    private final ContributionRuleVersionRepository repository =
            mock(ContributionRuleVersionRepository.class);
    private final ContributionRuleService service = new ContributionRuleService(repository);

    /** The entity has no public constructor or setters, so tests build it reflectively. */
    private static ContributionRuleVersion entity(
            int versionNo, String from, String to, VerificationStatus status, String ceiling) {
        ContributionRuleVersion e = BeanUtils.instantiateClass(ContributionRuleVersion.class);
        ReflectionTestUtils.setField(e, "ruleCode", CODE);
        ReflectionTestUtils.setField(e, "versionNo", versionNo);
        ReflectionTestUtils.setField(e, "effectiveFrom", LocalDate.parse(from));
        ReflectionTestUtils.setField(e, "effectiveTo", LocalDate.parse(to));
        ReflectionTestUtils.setField(e, "employeeRate", new BigDecimal("0.050000"));
        ReflectionTestUtils.setField(e, "employerRate", new BigDecimal("0.050000"));
        ReflectionTestUtils.setField(e, "ceilingAmount", new BigDecimal(ceiling));
        ReflectionTestUtils.setField(e, "verificationStatus", status);
        return e;
    }

    private void givenRules(ContributionRuleVersion... rules) {
        when(repository.findByRuleCodeOrderByVersionNoAsc(CODE)).thenReturn(List.of(rules));
    }

    private ContributionRuleVersion e2025() {
        return entity(2, "2025-01-01", "2025-12-31", VerificationStatus.VERIFIED, "34164.00");
    }

    private ContributionRuleVersion e2026() {
        return entity(3, "2026-01-01", "2026-12-31", VerificationStatus.VERIFIED, "37236.00");
    }

    @Test
    void mapsRatesAndCeilingFromTheMatchingRule() {
        givenRules(e2025(), e2026());
        RuleVersion r = service.findApplicableRule(CODE, LocalDate.parse("2026-03-01"));
        assertThat(r.versionNo()).isEqualTo(3);
        assertThat(r.parameters().ceilingAmount()).isEqualByComparingTo("37236.00");
        assertThat(r.parameters().employeeRate()).isEqualByComparingTo("0.05");
    }

    @Test
    void yearBoundary_picksThe2025Rule() {
        givenRules(e2025(), e2026());
        assertThat(service.findApplicableRule(CODE, LocalDate.parse("2025-12-31")).versionNo())
                .isEqualTo(2);
    }

    @Test
    void dateWithNoRule_throws() {
        givenRules(e2025(), e2026());
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
}