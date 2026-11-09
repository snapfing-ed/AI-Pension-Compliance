package com.edward.pensioncompliance.contribution.repository;

import com.edward.pensioncompliance.contribution.entity.ContributionRuleVersion;

import org.springframework.data.repository.Repository;

import java.util.List;

/** Deliberately read-only: extends Repository, not JpaRepository, so save and delete are not exposed. */
public interface ContributionRuleVersionRepository
        extends Repository<ContributionRuleVersion, Long> {

    List<ContributionRuleVersion> findAllByOrderByRuleCodeAscVersionNoAsc();

    List<ContributionRuleVersion> findByRuleCodeOrderByVersionNoAsc(String ruleCode);
}