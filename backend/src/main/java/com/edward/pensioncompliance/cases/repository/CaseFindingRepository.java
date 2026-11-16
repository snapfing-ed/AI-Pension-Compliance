package com.edward.pensioncompliance.cases.repository;

import com.edward.pensioncompliance.cases.entity.CaseFinding;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CaseFindingRepository extends JpaRepository<CaseFinding, Long> {
    List<CaseFinding> findByCaseIdOrderByLinkedAtDesc(Long caseId);
    boolean existsByCaseIdAndFindingId(Long caseId, Long findingId);
}