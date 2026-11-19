package com.edward.pensioncompliance.analysis.repository;

import com.edward.pensioncompliance.analysis.entity.SnapshotPayrollBatch;
import com.edward.pensioncompliance.analysis.entity.SnapshotPayrollBatchId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SnapshotPayrollBatchRepository
        extends JpaRepository<SnapshotPayrollBatch, SnapshotPayrollBatchId> {

    List<SnapshotPayrollBatch> findByIdSnapshotId(Long snapshotId);
}