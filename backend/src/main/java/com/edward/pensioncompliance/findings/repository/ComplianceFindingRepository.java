package com.edward.pensioncompliance.findings.repository;

import com.edward.pensioncompliance.findings.entity.ComplianceFinding;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComplianceFindingRepository extends JpaRepository<ComplianceFinding, Long> {
    List<ComplianceFinding> findBySnapshotIdOrderByPriorityScoreDesc(Long snapshotId);
    List<ComplianceFinding> findAllByOrderByDetectedAtDesc();
    List<ComplianceFinding> findByStatusOrderByPriorityScoreDesc(String status);
}