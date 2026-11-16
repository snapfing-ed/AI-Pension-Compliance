package com.edward.pensioncompliance.completeness.repository;

import com.edward.pensioncompliance.completeness.entity.CompletenessAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CompletenessAssessmentRepository extends JpaRepository<CompletenessAssessment, Long> {
    List<CompletenessAssessment> findByEmployerIdAndPeriodId(Long employerId, Long periodId);
}