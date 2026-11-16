package com.edward.pensioncompliance.analysis.repository;

import com.edward.pensioncompliance.analysis.entity.SnapshotPaymentAllocation;
import com.edward.pensioncompliance.analysis.entity.SnapshotPaymentAllocationId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SnapshotPaymentAllocationRepository
        extends JpaRepository<SnapshotPaymentAllocation, SnapshotPaymentAllocationId> {

    List<SnapshotPaymentAllocation> findByIdSnapshotId(Long snapshotId);
}