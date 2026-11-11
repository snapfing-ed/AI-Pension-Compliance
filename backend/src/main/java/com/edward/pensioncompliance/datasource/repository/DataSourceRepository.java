package com.edward.pensioncompliance.datasource.repository;

import com.edward.pensioncompliance.datasource.entity.DataSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DataSourceRepository
        extends JpaRepository<DataSource, Long>, JpaSpecificationExecutor<DataSource> {
    boolean existsBySourceCodeIgnoreCase(String sourceCode);
}
