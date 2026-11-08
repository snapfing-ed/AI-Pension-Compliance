package com.edward.pensioncompliance.contribution.service;

import com.edward.pensioncompliance.contribution.ContributionRuleParameters;
import com.edward.pensioncompliance.contribution.RuleSelector;
import com.edward.pensioncompliance.contribution.RuleVersion;
import com.edward.pensioncompliance.contribution.entity.ContributionRuleVersion;
import com.edward.pensioncompliance.contribution.repository.ContributionRuleVersionRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class ContributionRuleService {

    private final ContributionRuleVersionRepository repository;
    private final RuleSelector selector = new RuleSelector();

    public ContributionRuleService(ContributionRuleVersionRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public RuleVersion findApplicableRule(String ruleCode, LocalDate date) {
        List<RuleVersion> versions = repository.findByRuleCodeOrderByVersionNoAsc(ruleCode).stream()
                .map(this::toRuleVersion)
                .toList();
        return selector.select(versions, date);
    }

    private RuleVersion toRuleVersion(ContributionRuleVersion e) {
        return new RuleVersion(
                e.getRuleCode(),
                e.getVersionNo(),
                e.getEffectiveFrom(),
                e.getEffectiveTo(),
                e.getVerificationStatus(),
                new ContributionRuleParameters(
                        e.getEmployeeRate(), e.getEmployerRate(), e.getCeilingAmount()));
    }
}