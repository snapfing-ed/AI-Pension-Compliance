package com.edward.pensioncompliance.payments.service;

import com.edward.pensioncompliance.analysis.entity.EmployerMonthAnalysis;
import com.edward.pensioncompliance.analysis.repository.EmployerMonthAnalysisRepository;
import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.datasource.repository.DataSourceRepository;
import com.edward.pensioncompliance.employer.repository.EmployerRepository;
import com.edward.pensioncompliance.payments.dto.AllocatePaymentRequest;
import com.edward.pensioncompliance.payments.dto.RecordPaymentRequest;
import com.edward.pensioncompliance.payments.entity.*;
import com.edward.pensioncompliance.payments.repository.PaymentAllocationRepository;
import com.edward.pensioncompliance.payments.repository.PaymentTransactionRepository;
import com.edward.pensioncompliance.period.repository.ContributionPeriodRepository;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

@Service
public class PaymentService {

    private final PaymentTransactionRepository payments;
    private final PaymentAllocationRepository allocations;
    private final EmployerMonthAnalysisRepository analyses;
    private final DataSourceRepository sources;
    private final EmployerRepository employers;
    private final ContributionPeriodRepository periods;
    private final AppUserRepository users;
    private final AuditService audit;

    public PaymentService(
            PaymentTransactionRepository payments, PaymentAllocationRepository allocations,
            EmployerMonthAnalysisRepository analyses, DataSourceRepository sources,
            EmployerRepository employers, ContributionPeriodRepository periods,
            AppUserRepository users, AuditService audit) {
        this.payments = payments;
        this.allocations = allocations;
        this.analyses = analyses;
        this.sources = sources;
        this.employers = employers;
        this.periods = periods;
        this.users = users;
        this.audit = audit;
    }

    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    @Transactional
    public PaymentTransaction recordPayment(RecordPaymentRequest req, Authentication auth) {
        if (!sources.existsById(req.sourceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Data source not found.");
        }
        PaymentTransactionStatus status = (req.transactionStatus() == null || req.transactionStatus().isBlank())
                ? PaymentTransactionStatus.CONFIRMED
                : PaymentTransactionStatus.valueOf(req.transactionStatus().trim().toUpperCase(Locale.ROOT));

        PaymentTransaction saved = payments.save(new PaymentTransaction(
                req.sourceId(), req.externalTransactionRef(), req.employerRefAsReceived(),
                req.transactionAmount(), req.currencyCode(), req.paidAt(),
                status, req.reversalOfPaymentId(), req.sourceRecordRef()
        ));

        AppUser actor = resolveActor(auth);
        audit.record(actor, "PAYMENT_RECORDED", "PAYMENT_TRANSACTION", saved.getPaymentId().toString(),
                "Recorded payment amount=" + saved.getTransactionAmount() + " " + saved.getCurrencyCode());
        return saved;
    }

    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    @Transactional
    public PaymentAllocation allocatePayment(AllocatePaymentRequest req, Authentication auth) {
        PaymentTransaction tx = payments.findById(req.paymentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment transaction not found."));
        if (!employers.existsById(req.employerId()) || !periods.existsById(req.periodId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Employer or contribution period not found.");
        }

        BigDecimal alreadyAllocated = allocations.sumActiveAllocatedAmountByPaymentId(tx.getPaymentId());
        if (alreadyAllocated == null) {
            alreadyAllocated = BigDecimal.ZERO;
        }

        if (alreadyAllocated.add(req.allocatedAmount()).compareTo(tx.getTransactionAmount()) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Allocation exceeds remaining unallocated payment amount.");
        }

        EmployerMonthAnalysis target = analyses.findByEmployerIdAndPeriodId(req.employerId(), req.periodId())
                .orElseGet(() -> analyses.save(new EmployerMonthAnalysis(req.employerId(), req.periodId())));

        AppUser actor = resolveActor(auth);
        PaymentAllocation saved = allocations.save(new PaymentAllocation(
                tx.getPaymentId(), target.getAnalysisId(), req.allocatedAmount(),
                PaymentAllocationStatus.ACTIVE, actor.getUserId(), null
        ));

        audit.record(actor, "PAYMENT_ALLOCATED", "PAYMENT_ALLOCATION", saved.getAllocationId().toString(),
                "Allocated " + req.allocatedAmount() + " from paymentId=" + tx.getPaymentId()
                        + " to analysisId=" + target.getAnalysisId());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<PaymentTransaction> listPayments() {
        return payments.findAll();
    }

    private AppUser resolveActor(Authentication auth) {
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Actor not found."));
    }
}