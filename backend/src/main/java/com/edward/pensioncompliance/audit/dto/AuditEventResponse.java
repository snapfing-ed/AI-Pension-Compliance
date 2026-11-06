package com.edward.pensioncompliance.audit.dto;

import java.time.OffsetDateTime;

public record AuditEventResponse(
    Long auditEventId,
    String actorUsername,
    String eventType,
    String entityType,
    String entityId,
    String actionSummary,
    OffsetDateTime eventTimestamp
) {}