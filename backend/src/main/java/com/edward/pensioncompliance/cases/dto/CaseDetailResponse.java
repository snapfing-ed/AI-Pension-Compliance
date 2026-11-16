package com.edward.pensioncompliance.cases.dto;

import com.edward.pensioncompliance.cases.entity.CaseAssignmentHistory;
import com.edward.pensioncompliance.cases.entity.CaseFinding;
import com.edward.pensioncompliance.cases.entity.InvestigationCase;
import java.time.OffsetDateTime;
import java.util.List;

public record CaseDetailResponse(
        Long caseId,
        String caseRef,
        String title,
        String description,
        String caseStatus,
        String priority,
        OffsetDateTime openedAt,
        OffsetDateTime closedAt,
        Long createdByUserId,
        Long currentAssignedUserId,
        List<CaseFinding> linkedFindings,
        List<CaseAssignmentHistory> assignmentHistory
) {
    public static CaseDetailResponse of(
            InvestigationCase c,
            List<CaseFinding> findings,
            List<CaseAssignmentHistory> history) {
        Long currentAssignee = history.stream()
                .filter(h -> h.getUnassignedAt() == null)
                .map(CaseAssignmentHistory::getAssignedUserId)
                .findFirst()
                .orElse(null);
        return new CaseDetailResponse(
                c.getCaseId(), c.getCaseRef(), c.getTitle(), c.getDescription(),
                c.getCaseStatus(), c.getPriority(), c.getOpenedAt(), c.getClosedAt(),
                c.getCreatedByUserId(), currentAssignee, findings, history
        );
    }
}