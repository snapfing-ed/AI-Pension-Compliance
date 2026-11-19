package com.edward.pensioncompliance.returns.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "submitted_return")
public class SubmittedReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "return_id")
    private Long returnId;

    @Column(name = "employer_id", nullable = false)
    private Long employerId;

    @Column(name = "period_id", nullable = false)
    private Long periodId;

    @Enumerated(EnumType.STRING)
    @Column(name = "return_type", nullable = false, length = 40)
    private ReturnType returnType;

    @Column(name = "return_ref", length = 100)
    private String returnRef;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected SubmittedReturn() {}

    public SubmittedReturn(Long employerId, Long periodId, ReturnType returnType, String returnRef) {
        this.employerId = employerId;
        this.periodId = periodId;
        this.returnType = returnType;
        this.returnRef = returnRef;
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public Long getReturnId() { return returnId; }
    public Long getEmployerId() { return employerId; }
    public Long getPeriodId() { return periodId; }
    public ReturnType getReturnType() { return returnType; }
    public String getReturnRef() { return returnRef; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}