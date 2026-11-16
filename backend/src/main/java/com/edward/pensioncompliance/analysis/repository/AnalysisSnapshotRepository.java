package com.edward.pensioncompliance.analysis.repository;

import com.edward.pensioncompliance.analysis.entity.AnalysisSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AnalysisSnapshotRepository extends JpaRepository<AnalysisSnapshot, Long> {
    List<AnalysisSnapshot> findByAnalysisIdOrderByRunNumberDesc(Long analysisId);
    Optional<AnalysisSnapshot> findTopByAnalysisIdOrderByRunNumberDesc(Long analysisId);
}