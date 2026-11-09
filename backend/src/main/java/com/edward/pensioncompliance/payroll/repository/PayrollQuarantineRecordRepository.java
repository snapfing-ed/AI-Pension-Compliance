package com.edward.pensioncompliance.payroll.repository;

import com.edward.pensioncompliance.payroll.entity.PayrollQuarantineRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PayrollQuarantineRecordRepository
        extends JpaRepository<PayrollQuarantineRecord, Long>, JpaSpecificationExecutor<PayrollQuarantineRecord> {

    @Query("""
        SELECT q.payrollBatch.payrollBatchId, COUNT(q)
        FROM PayrollQuarantineRecord q
        WHERE q.payrollBatch.payrollBatchId IN :batchIds
        GROUP BY q.payrollBatch.payrollBatchId
        """)
    List<Object[]> countByBatchIds(@Param("batchIds") Collection<Long> batchIds);
}