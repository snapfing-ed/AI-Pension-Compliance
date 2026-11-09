package com.edward.pensioncompliance.contribution;

import java.time.LocalDate;
import java.util.List;

/** Chooses the single VERIFIED rule version that applies on a date. Candidates share one rule code. */
public class RuleSelector {

    public RuleVersion select(List<RuleVersion> candidates, LocalDate date) {
        List<RuleVersion> matches = candidates.stream()
                .filter(r -> r.verificationStatus() == VerificationStatus.VERIFIED)
                .filter(r -> !date.isBefore(r.effectiveFrom())
                        && (r.effectiveTo() == null || !date.isAfter(r.effectiveTo())))
                .toList();

        if (matches.isEmpty()) {
            throw new RuleSelectionException("No verified contribution rule applies on " + date);
        }
        if (matches.size() > 1) {
            throw new RuleSelectionException(
                    "Configuration fault: more than one verified rule applies on " + date);
        }
        return matches.get(0);
    }
}