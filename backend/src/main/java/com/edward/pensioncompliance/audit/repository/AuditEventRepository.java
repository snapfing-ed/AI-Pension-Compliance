package com.edward.pensioncompliance.audit.repository;

import com.edward.pensioncompliance.audit.entity.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditEventRepository
        extends JpaRepository<AuditEvent, Long> {

    List<AuditEvent> findByActorUser_UserIdOrderByEventTimestampDesc(
            Long userId
    );

    List<AuditEvent> findAllByOrderByEventTimestampDesc();
}