package com.edward.pensioncompliance.analysis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class SnapshotPaymentAllocationId implements Serializable {

    @Column(name = "snapshot_id", nullable = false)
    private Long snapshotId;

    @Column(name = "allocation_id", nullable = false)
    private Long allocationId;

    protected SnapshotPaymentAllocationId() {}

    public SnapshotPaymentAllocationId(Long snapshotId, Long allocationId) {
        this.snapshotId = snapshotId;
        this.allocationId = allocationId;
    }

    public Long getSnapshotId() { return snapshotId; }
    public Long getAllocationId() { return allocationId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SnapshotPaymentAllocationId that)) return false;
        return Objects.equals(snapshotId, that.snapshotId)
                && Objects.equals(allocationId, that.allocationId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(snapshotId, allocationId);
    }
}