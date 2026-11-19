package com.edward.pensioncompliance.analysis.repository;

import com.edward.pensioncompliance.analysis.entity.SnapshotCompletenessAssessment;
import com.edward.pensioncompliance.analysis.entity.SnapshotCompletenessAssessmentId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SnapshotCompletenessAssessmentRepository
        extends JpaRepository<SnapshotCompletenessAssessment, SnapshotCompletenessAssessmentId> {

    List<SnapshotCompletenessAssessment> findByIdSnapshotId(Long snapshotId);
}