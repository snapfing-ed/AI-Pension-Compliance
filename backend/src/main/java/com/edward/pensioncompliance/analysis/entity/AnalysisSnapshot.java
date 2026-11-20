package com.edward.pensioncompliance.analysis.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "analysis_snapshot")
public class AnalysisSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "snapshot_id")
    private Long snapshotId;

    @Column(name = "analysis_id", nullable = false)
    private Long analysisId;

    @Column(name = "run_number", nullable = false)
    private Integer runNumber;

    @Column(name = "run_started_at", nullable = false)
    private OffsetDateTime runStartedAt;

    @Column(name = "run_completed_at")
    private OffsetDateTime runCompletedAt;

    @Column(name = "rule_version_id", nullable = false)
    private Long ruleVersionId;

    @Column(name = "model_name", length = 100)
    private String modelName;

    @Column(name = "model_version", length = 50)
    private String modelVersion;

    @Column(name = "detection_logic_version", nullable = false, length = 50)
    private String detectionLogicVersion;

    @Column(name = "input_fingerprint", nullable = false, length = 128)
    private String inputFingerprint;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_result", nullable = false, length = 30)
    private SnapshotResult overallResult;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    protected AnalysisSnapshot() {}

    public AnalysisSnapshot(
            Long analysisId, Integer runNumber, OffsetDateTime runStartedAt,
            Long ruleVersionId, String detectionLogicVersion, String inputFingerprint,
            SnapshotResult overallResult, Long createdByUserId) {
        this.analysisId = analysisId;
        this.runNumber = runNumber;
        this.runStartedAt = runStartedAt;
        this.runCompletedAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.ruleVersionId = ruleVersionId;
        this.detectionLogicVersion = detectionLogicVersion;
        this.inputFingerprint = inputFingerprint;
        this.overallResult = overallResult;
        this.createdByUserId = createdByUserId;
    }

    public void setModelInfo(String modelName, String modelVersion) {
        this.modelName = modelName;
        this.modelVersion = modelVersion;
    }

    public void updateOverallResult(SnapshotResult overallResult) {
        this.overallResult = overallResult;
    }

    public Long getSnapshotId() { return snapshotId; }
    public Long getAnalysisId() { return analysisId; }
    public Integer getRunNumber() { return runNumber; }
    public OffsetDateTime getRunStartedAt() { return runStartedAt; }
    public OffsetDateTime getRunCompletedAt() { return runCompletedAt; }
    public Long getRuleVersionId() { return ruleVersionId; }
    public String getModelName() { return modelName; }
    public String getModelVersion() { return modelVersion; }
    public String getDetectionLogicVersion() { return detectionLogicVersion; }
    public String getInputFingerprint() { return inputFingerprint; }
    public SnapshotResult getOverallResult() { return overallResult; }
    public Long getCreatedByUserId() { return createdByUserId; }
}