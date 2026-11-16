package com.edward.pensioncompliance.cases.repository;

import com.edward.pensioncompliance.cases.entity.CaseAssignmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CaseAssignmentHistoryRepository extends JpaRepository<CaseAssignmentHistory, Long> {
    List<CaseAssignmentHistory> findByCaseIdOrderByAssignedAtDesc(Long caseId);
    Optional<CaseAssignmentHistory> findTopByCaseIdAndUnassignedAtIsNullOrderByAssignedAtDesc(Long caseId);
}