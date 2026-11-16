package com.edward.pensioncompliance.analysis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class SnapshotCompletenessAssessmentId implements Serializable {

    @Column(name = "snapshot_id", nullable = false)
    private Long snapshotId;

    @Column(name = "assessment_id", nullable = false)
    private Long assessmentId;

    protected SnapshotCompletenessAssessmentId() {}

    public SnapshotCompletenessAssessmentId(Long snapshotId, Long assessmentId) {
        this.snapshotId = snapshotId;
        this.assessmentId = assessmentId;
    }

    public Long getSnapshotId() { return snapshotId; }
    public Long getAssessmentId() { return assessmentId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SnapshotCompletenessAssessmentId that)) return false;
        return Objects.equals(snapshotId, that.snapshotId)
                && Objects.equals(assessmentId, that.assessmentId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(snapshotId, assessmentId);
    }
}