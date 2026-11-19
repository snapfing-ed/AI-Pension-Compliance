package com.edward.pensioncompliance.analysis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class SnapshotReturnVersionId implements Serializable {

    @Column(name = "snapshot_id", nullable = false)
    private Long snapshotId;

    @Column(name = "return_version_id", nullable = false)
    private Long returnVersionId;

    protected SnapshotReturnVersionId() {}

    public SnapshotReturnVersionId(Long snapshotId, Long returnVersionId) {
        this.snapshotId = snapshotId;
        this.returnVersionId = returnVersionId;
    }

    public Long getSnapshotId() { return snapshotId; }
    public Long getReturnVersionId() { return returnVersionId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SnapshotReturnVersionId that)) return false;
        return Objects.equals(snapshotId, that.snapshotId)
                && Objects.equals(returnVersionId, that.returnVersionId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(snapshotId, returnVersionId);
    }
}