package com.edward.pensioncompliance.payroll.repository;

import com.edward.pensioncompliance.payroll.entity.PayrollRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PayrollRecordRepository
        extends JpaRepository<PayrollRecord, Long>, JpaSpecificationExecutor<PayrollRecord> {

    @Query("""
        SELECT r.payrollBatch.payrollBatchId, r.dataQualityStatus, COUNT(r)
        FROM PayrollRecord r
        WHERE r.payrollBatch.payrollBatchId IN :batchIds
        GROUP BY r.payrollBatch.payrollBatchId, r.dataQualityStatus
        """)
    List<Object[]> countByBatchIdsAndQualityStatus(@Param("batchIds") Collection<Long> batchIds);
}