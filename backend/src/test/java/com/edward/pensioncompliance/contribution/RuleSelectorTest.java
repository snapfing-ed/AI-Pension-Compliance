package com.edward.pensioncompliance.contribution;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class RuleSelectorTest {

    private final RuleSelector selector = new RuleSelector();

    private static final VerificationStatus OK = VerificationStatus.VERIFIED;

    private static ContributionRuleParameters params() {
        return new ContributionRuleParameters(
                new BigDecimal("0.05"), new BigDecimal("0.05"), new BigDecimal("37236.00"));
    }

    private static RuleVersion rule(int versionNo, String from, String to, VerificationStatus status) {
        return new RuleVersion("NAPSA_FORMAL", versionNo, LocalDate.parse(from),
                to == null ? null : LocalDate.parse(to), status, params());
    }

    private static LocalDate d(String iso) { return LocalDate.parse(iso); }

    private final RuleVersion r2025 = rule(2, "2025-01-01", "2025-12-31", OK);
    private final RuleVersion r2026 = rule(3, "2026-01-01", "2026-12-31", OK);

    @Test
    void dateInsideRange_returnsThatRule() {
        assertThat(selector.select(List.of(r2025, r2026), d("2026-06-15"))).isEqualTo(r2026);
    }

    @Test
    void yearBoundary_selectsCorrectYear() {
        assertThat(selector.select(List.of(r2025, r2026), d("2025-12-31")).versionNo()).isEqualTo(2);
        assertThat(selector.select(List.of(r2025, r2026), d("2026-01-01")).versionNo()).isEqualTo(3);
    }

    @Test
    void openEndedRule_appliesToLaterDates() {
        RuleVersion open = rule(4, "2027-01-01", null, OK);
        assertThat(selector.select(List.of(r2026, open), d("2030-03-01"))).isEqualTo(open);
    }

    @Test
    void verifiedRuleWinsOverUnverifiedDraft() {
        RuleVersion draft = rule(9, "2026-01-01", "2026-12-31", VerificationStatus.UNVERIFIED);
        assertThat(selector.select(List.of(r2026, draft), d("2026-05-01"))).isEqualTo(r2026);
    }

    @Test
    void dateBeforeAllRules_throwsNamingTheDate() {
        assertThatThrownBy(() -> selector.select(List.of(r2025, r2026), d("2024-12-31")))
                .isInstanceOf(RuleSelectionException.class)
                .hasMessageContaining("2024-12-31");
    }

    @Test
    void dateAfterAllRules_throwsNamingTheDate() {
        assertThatThrownBy(() -> selector.select(List.of(r2025, r2026), d("2027-01-01")))
                .isInstanceOf(RuleSelectionException.class)
                .hasMessageContaining("2027-01-01");
    }

    @Test
    void overlappingVerifiedRules_throws() {
        RuleVersion overlap = rule(5, "2026-06-01", "2027-06-30", OK);
        assertThatThrownBy(() -> selector.select(List.of(r2026, overlap), d("2026-07-01")))
                .isInstanceOf(RuleSelectionException.class)
                .hasMessageContaining("more than one");
    }

    @Test
    void onlyUnverifiedRule_throws() {
        RuleVersion draft = rule(9, "2026-01-01", "2026-12-31", VerificationStatus.UNVERIFIED);
        assertThatThrownBy(() -> selector.select(List.of(draft), d("2026-05-01")))
                .isInstanceOf(RuleSelectionException.class);
    }

    @Test
    void rejectedRuleIsIgnored_throws() {
        RuleVersion rejected = rule(9, "2026-01-01", "2026-12-31", VerificationStatus.REJECTED);
        assertThatThrownBy(() -> selector.select(List.of(rejected), d("2026-05-01")))
                .isInstanceOf(RuleSelectionException.class);
    }

    @Test
    void emptyList_throws() {
        assertThatThrownBy(() -> selector.select(List.of(), d("2026-05-01")))
                .isInstanceOf(RuleSelectionException.class);
    }
}