package com.edward.pensioncompliance.analysis.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "snapshot_payment_allocation")
public class SnapshotPaymentAllocation {

    @EmbeddedId
    private SnapshotPaymentAllocationId id;

    protected SnapshotPaymentAllocation() {}

    public SnapshotPaymentAllocation(Long snapshotId, Long allocationId) {
        this.id = new SnapshotPaymentAllocationId(snapshotId, allocationId);
    }

    public SnapshotPaymentAllocationId getId() { return id; }
}