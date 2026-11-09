package com.edward.pensioncompliance.payroll.repository;

import com.edward.pensioncompliance.payroll.entity.PayrollBatch;
import com.edward.pensioncompliance.payroll.entity.PayrollBatchStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PayrollBatchRepository
        extends JpaRepository<PayrollBatch, Long>, JpaSpecificationExecutor<PayrollBatch> {

    boolean existsBySourceSourceIdAndBatchRef(Long sourceId, String batchRef);

    boolean existsBySupersedesBatchPayrollBatchId(Long supersedesBatchId);

    Optional<PayrollBatch> findTopBySourceSourceIdAndBatchRefOrderByVersionNoDesc(Long sourceId, String batchRef);

    List<PayrollBatch> findBySupersedesBatchPayrollBatchIdIn(Collection<Long> batchIds);

    @Query("""
        SELECT b FROM PayrollBatch b
        WHERE b.source.sourceId = :sourceId
          AND b.batchRef = :batchRef
          AND b.status IN :statuses
        """)
    List<PayrollBatch> findBySourceAndBatchRefWithStatusIn(
            @Param("sourceId") Long sourceId,
            @Param("batchRef") String batchRef,
            @Param("statuses") Collection<PayrollBatchStatus> statuses);

    @Query("""
        SELECT b FROM PayrollBatch b
        WHERE b.employer.employerId = :employerId
          AND b.period.periodId = :periodId
          AND b.status NOT IN (
              com.edward.pensioncompliance.payroll.entity.PayrollBatchStatus.SUPERSEDED,
              com.edward.pensioncompliance.payroll.entity.PayrollBatchStatus.REJECTED
          )
        ORDER BY b.receivedAt DESC, b.versionNo DESC, b.payrollBatchId DESC
        """)
    List<PayrollBatch> findCurrentCandidates(
            @Param("employerId") Long employerId,
            @Param("periodId") Long periodId,
            Pageable pageable);
}