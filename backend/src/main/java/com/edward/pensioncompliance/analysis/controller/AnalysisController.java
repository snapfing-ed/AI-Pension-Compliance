package com.edward.pensioncompliance.analysis.controller;

import com.edward.pensioncompliance.analysis.dto.ExecuteAnalysisRequest;
import com.edward.pensioncompliance.analysis.dto.SnapshotDetailResponse;
import com.edward.pensioncompliance.analysis.entity.AnalysisSnapshot;
import com.edward.pensioncompliance.analysis.entity.EmployerMonthAnalysis;
import com.edward.pensioncompliance.analysis.service.AnalysisExecutionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/analyses")
public class AnalysisController {

    private final AnalysisExecutionService service;

    public AnalysisController(AnalysisExecutionService service) {
        this.service = service;
    }

    @PostMapping("/execute")
    @ResponseStatus(HttpStatus.CREATED)
    public SnapshotDetailResponse execute(@Valid @RequestBody ExecuteAnalysisRequest request, Authentication auth) {
        return service.execute(request, auth);
    }

    @GetMapping
    public List<EmployerMonthAnalysis> listAnalyses() {
        return service.listAnalyses();
    }

    @GetMapping("/{analysisId}/snapshots")
    public List<AnalysisSnapshot> listSnapshots(@PathVariable Long analysisId) {
        return service.listSnapshots(analysisId);
    }

    @GetMapping("/snapshots/{snapshotId}")
    public SnapshotDetailResponse getSnapshot(@PathVariable Long snapshotId) {
        return service.getSnapshot(snapshotId);
    }
}