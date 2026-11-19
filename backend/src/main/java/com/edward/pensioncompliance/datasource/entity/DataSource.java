package com.edward.pensioncompliance.datasource.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "data_source")
public class DataSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "source_code", nullable = false, length = 60, unique = true)
    private String sourceCode;

    @Column(name = "source_name", nullable = false, length = 150)
    private String sourceName;

    @Column(name = "source_type", nullable = false, length = 40)
    private String sourceType;

    @Column(name = "owner_name", length = 150)
    private String ownerName;

    @Column(name = "authority_reference", length = 150)
    private String authorityReference;

    @Column(name = "permitted_purpose", nullable = false)
    private String permittedPurpose;

    @Column(name = "received_at", nullable = false)
    private OffsetDateTime receivedAt;

    @Column(name = "coverage_notes")
    private String coverageNotes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DataSourceStatus status = DataSourceStatus.ACTIVE;

    protected DataSource() {
        // Required by JPA
    }

    public DataSource(
            String sourceCode,
            String sourceName,
            String sourceType,
            String ownerName,
            String authorityReference,
            String permittedPurpose,
            OffsetDateTime receivedAt,
            String coverageNotes) {
        this.sourceCode = sourceCode;
        this.sourceName = sourceName;
        this.sourceType = sourceType;
        this.ownerName = ownerName;
        this.authorityReference = authorityReference;
        this.permittedPurpose = permittedPurpose;
        this.receivedAt = (receivedAt != null) ? receivedAt : OffsetDateTime.now(ZoneOffset.UTC);
        this.coverageNotes = coverageNotes;
        this.status = DataSourceStatus.ACTIVE;
    }

    public DataSource(
            String sourceName,
            String sourceType,
            String ownerName,
            String authorityReference,
            String permittedPurpose,
            OffsetDateTime receivedAt,
            String coverageNotes) {
        this("LEGACY-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12),
                sourceName, sourceType, ownerName, authorityReference,
                permittedPurpose, receivedAt, coverageNotes);
    }

    public Long getSourceId() { return sourceId; }
    public String getSourceCode() { return sourceCode; }
    public String getSourceName() { return sourceName; }
    public String getSourceType() { return sourceType; }
    public String getOwnerName() { return ownerName; }
    public String getAuthorityReference() { return authorityReference; }
    public String getPermittedPurpose() { return permittedPurpose; }
    public OffsetDateTime getReceivedAt() { return receivedAt; }
    public String getCoverageNotes() { return coverageNotes; }
    public DataSourceStatus getStatus() { return status; }
}
