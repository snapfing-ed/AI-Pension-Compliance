package com.edward.pensioncompliance.analysis.repository;

import com.edward.pensioncompliance.analysis.entity.ContributionCalculationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ContributionCalculationRepository extends JpaRepository<ContributionCalculationEntity, Long> {
    List<ContributionCalculationEntity> findBySnapshotId(Long snapshotId);
}