package com.edward.pensioncompliance.analysis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class SnapshotPayrollBatchId implements Serializable {

    @Column(name = "snapshot_id", nullable = false)
    private Long snapshotId;

    @Column(name = "payroll_batch_id", nullable = false)
    private Long payrollBatchId;

    protected SnapshotPayrollBatchId() {}

    public SnapshotPayrollBatchId(Long snapshotId, Long payrollBatchId) {
        this.snapshotId = snapshotId;
        this.payrollBatchId = payrollBatchId;
    }

    public Long getSnapshotId() { return snapshotId; }
    public Long getPayrollBatchId() { return payrollBatchId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SnapshotPayrollBatchId that)) return false;
        return Objects.equals(snapshotId, that.snapshotId)
                && Objects.equals(payrollBatchId, that.payrollBatchId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(snapshotId, payrollBatchId);
    }
}