package com.edward.pensioncompliance.employer.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "employer")
public class Employer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "employer_id")
    private Long employerId;

    @Column(name = "employer_ref", nullable = false, length = 50, updatable = false)
    private String employerRef;

    @Column(name = "legal_name", nullable = false, length = 200)
    private String legalName;

    @Column(name = "trading_name", length = 200)
    private String tradingName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private EmployerStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Employer() {
        // Required by JPA
    }

    public Employer(String employerRef, String legalName, String tradingName) {
        this.employerRef = employerRef;
        this.legalName = legalName;
        this.tradingName = tradingName;
        this.status = EmployerStatus.ACTIVE;
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.updatedAt = this.createdAt;
    }

    public void changeLegalName(String legalName) { this.legalName = legalName; touch(); }
    public void changeTradingName(String tradingName) { this.tradingName = tradingName; touch(); }
    public void changeStatus(EmployerStatus status) { this.status = status; touch(); }

    // The table has no update trigger, so the application maintains updated_at.
    private void touch() { this.updatedAt = OffsetDateTime.now(ZoneOffset.UTC); }

    public Long getEmployerId() { return employerId; }
    public String getEmployerRef() { return employerRef; }
    public String getLegalName() { return legalName; }
    public String getTradingName() { return tradingName; }
    public EmployerStatus getStatus() { return status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}