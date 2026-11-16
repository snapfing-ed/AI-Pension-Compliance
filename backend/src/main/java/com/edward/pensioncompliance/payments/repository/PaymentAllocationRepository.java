package com.edward.pensioncompliance.payments.repository;

import com.edward.pensioncompliance.payments.entity.PaymentAllocation;
import com.edward.pensioncompliance.payments.entity.PaymentAllocationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentAllocationRepository
        extends JpaRepository<PaymentAllocation, Long>, JpaSpecificationExecutor<PaymentAllocation> {

    List<PaymentAllocation> findByAnalysisIdOrderByAllocatedAtDesc(Long analysisId);

    List<PaymentAllocation> findByAnalysisIdAndAllocationStatusOrderByAllocatedAtDesc(
            Long analysisId, PaymentAllocationStatus allocationStatus);

    List<PaymentAllocation> findByPaymentIdOrderByAllocatedAtDesc(Long paymentId);

    @Query("""
        SELECT SUM(a.allocatedAmount)
        FROM PaymentAllocation a
        WHERE a.paymentId = :paymentId
          AND a.allocationStatus = com.edward.pensioncompliance.payments.entity.PaymentAllocationStatus.ACTIVE
        """)
    BigDecimal sumActiveAllocatedAmountByPaymentId(@Param("paymentId") Long paymentId);
}