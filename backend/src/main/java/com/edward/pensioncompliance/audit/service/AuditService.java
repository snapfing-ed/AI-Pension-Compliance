package com.edward.pensioncompliance.audit.service;

import com.edward.pensioncompliance.audit.entity.AuditEvent;
import com.edward.pensioncompliance.audit.repository.AuditEventRepository;
import com.edward.pensioncompliance.user.entity.AppUser;

import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditEventRepository auditEventRepository;

    public AuditService(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    public void record(
            AppUser actor,
            String eventType,
            String entityType,
            String entityId,
            String summary
    ) {

        AuditEvent event = new AuditEvent(
                actor,
                eventType,
                entityType,
                entityId,
                summary
        );

        auditEventRepository.save(event);
    }
}