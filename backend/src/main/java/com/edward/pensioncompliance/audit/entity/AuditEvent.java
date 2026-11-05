package com.edward.pensioncompliance.audit.entity;

import com.edward.pensioncompliance.user.entity.AppUser;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "audit_event")
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_event_id")
    private Long auditEventId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private AppUser actorUser;

    @Column(name = "event_type", nullable = false, length = 80)
    private String eventType;

    @Column(name = "entity_type", nullable = false, length = 80)
    private String entityType;

    @Column(name = "entity_id", length = 100)
    private String entityId;

    @Column(name = "action_summary", nullable = false)
    private String actionSummary;

    @Column(name = "event_timestamp", nullable = false)
    private OffsetDateTime eventTimestamp;

    protected AuditEvent() {
        // Required by JPA
    }

    public AuditEvent(
            AppUser actorUser,
            String eventType,
            String entityType,
            String entityId,
            String actionSummary
    ) {
        this.actorUser = actorUser;
        this.eventType = eventType;
        this.entityType = entityType;
        this.entityId = entityId;
        this.actionSummary = actionSummary;
        this.eventTimestamp = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public Long getAuditEventId() {
        return auditEventId;
    }

    public AppUser getActorUser() {
        return actorUser;
    }

    public String getEventType() {
        return eventType;
    }

    public String getEntityType() {
        return entityType;
    }

    public String getEntityId() {
        return entityId;
    }

    public String getActionSummary() {
        return actionSummary;
    }

    public OffsetDateTime getEventTimestamp() {
        return eventTimestamp;
    }
}