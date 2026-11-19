package com.edward.pensioncompliance.payments.repository;

import com.edward.pensioncompliance.payments.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface PaymentTransactionRepository
        extends JpaRepository<PaymentTransaction, Long>, JpaSpecificationExecutor<PaymentTransaction> {

    Optional<PaymentTransaction> findBySourceIdAndExternalTransactionRef(Long sourceId, String externalTransactionRef);
}