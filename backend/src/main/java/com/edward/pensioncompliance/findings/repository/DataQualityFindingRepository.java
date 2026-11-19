package com.edward.pensioncompliance.findings.repository;

import com.edward.pensioncompliance.findings.entity.DataQualityFinding;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DataQualityFindingRepository extends JpaRepository<DataQualityFinding, Long> {
    List<DataQualityFinding> findBySnapshotIdOrderByDetectedAtDesc(Long snapshotId);
    List<DataQualityFinding> findAllByOrderByDetectedAtDesc();
}