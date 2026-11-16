package com.edward.pensioncompliance.cases.repository;

import com.edward.pensioncompliance.cases.entity.InvestigationCase;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InvestigationCaseRepository extends JpaRepository<InvestigationCase, Long> {
    List<InvestigationCase> findAllByOrderByOpenedAtDesc();
    List<InvestigationCase> findByCaseStatusOrderByOpenedAtDesc(String caseStatus);
}