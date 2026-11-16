package com.edward.pensioncompliance.analysis.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "snapshot_completeness_assessment")
public class SnapshotCompletenessAssessment {

    @EmbeddedId
    private SnapshotCompletenessAssessmentId id;

    protected SnapshotCompletenessAssessment() {}

    public SnapshotCompletenessAssessment(Long snapshotId, Long assessmentId) {
        this.id = new SnapshotCompletenessAssessmentId(snapshotId, assessmentId);
    }

    public SnapshotCompletenessAssessmentId getId() { return id; }
}