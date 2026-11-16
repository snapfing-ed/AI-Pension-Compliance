package com.edward.pensioncompliance.analysis.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "snapshot_payroll_batch")
public class SnapshotPayrollBatch {

    @EmbeddedId
    private SnapshotPayrollBatchId id;

    protected SnapshotPayrollBatch() {}

    public SnapshotPayrollBatch(Long snapshotId, Long payrollBatchId) {
        this.id = new SnapshotPayrollBatchId(snapshotId, payrollBatchId);
    }

    public SnapshotPayrollBatchId getId() { return id; }
}