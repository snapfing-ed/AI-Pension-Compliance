package com.edward.pensioncompliance.analysis.repository;

import com.edward.pensioncompliance.analysis.entity.SnapshotReturnVersion;
import com.edward.pensioncompliance.analysis.entity.SnapshotReturnVersionId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SnapshotReturnVersionRepository
        extends JpaRepository<SnapshotReturnVersion, SnapshotReturnVersionId> {

    List<SnapshotReturnVersion> findByIdSnapshotId(Long snapshotId);
}