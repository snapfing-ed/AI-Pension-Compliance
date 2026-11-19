package com.edward.pensioncompliance.analysis.repository;

import com.edward.pensioncompliance.analysis.entity.EmployerMonthAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EmployerMonthAnalysisRepository extends JpaRepository<EmployerMonthAnalysis, Long> {
    Optional<EmployerMonthAnalysis> findByEmployerIdAndPeriodId(Long employerId, Long periodId);
}