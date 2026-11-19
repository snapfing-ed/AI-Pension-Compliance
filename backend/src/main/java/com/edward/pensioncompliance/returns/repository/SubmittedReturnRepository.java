package com.edward.pensioncompliance.returns.repository;

import com.edward.pensioncompliance.returns.entity.SubmittedReturn;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SubmittedReturnRepository extends JpaRepository<SubmittedReturn, Long> {
    List<SubmittedReturn> findByEmployerIdAndPeriodId(Long employerId, Long periodId);
    Page<SubmittedReturn> findByEmployerIdAndPeriodId(Long employerId, Long periodId, Pageable pageable);
    Page<SubmittedReturn> findByEmployerId(Long employerId, Pageable pageable);
    Page<SubmittedReturn> findByPeriodId(Long periodId, Pageable pageable);
}