package com.edward.pensioncompliance.analysis.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "snapshot_return_version")
public class SnapshotReturnVersion {

    @EmbeddedId
    private SnapshotReturnVersionId id;

    protected SnapshotReturnVersion() {}

    public SnapshotReturnVersion(Long snapshotId, Long returnVersionId) {
        this.id = new SnapshotReturnVersionId(snapshotId, returnVersionId);
    }

    public SnapshotReturnVersionId getId() { return id; }
}