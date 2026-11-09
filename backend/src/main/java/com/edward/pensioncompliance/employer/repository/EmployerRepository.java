package com.edward.pensioncompliance.employer.repository;

import com.edward.pensioncompliance.employer.entity.Employer;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EmployerRepository
        extends JpaRepository<Employer, Long>, JpaSpecificationExecutor<Employer> {

    boolean existsByEmployerRef(String employerRef);
}