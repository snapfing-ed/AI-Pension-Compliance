package com.edward.pensioncompliance.contribution;

import java.math.BigDecimal;

/** The numbers the calculator needs from a rule version. ceilingAmount may be null (no cap). */
public record ContributionRuleParameters(
        BigDecimal employeeRate,
        BigDecimal employerRate,
        BigDecimal ceilingAmount) { }