package com.edward.pensioncompliance.period.repository;

import com.edward.pensioncompliance.period.entity.ContributionPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface ContributionPeriodRepository
        extends JpaRepository<ContributionPeriod, Long>, JpaSpecificationExecutor<ContributionPeriod> {

    boolean existsByPeriodYearAndPeriodMonth(Short periodYear, Short periodMonth);

    Optional<ContributionPeriod> findByPeriodYearAndPeriodMonth(Short periodYear, Short periodMonth);
}