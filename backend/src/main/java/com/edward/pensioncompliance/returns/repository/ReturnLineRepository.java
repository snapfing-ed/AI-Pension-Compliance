package com.edward.pensioncompliance.returns.repository;

import com.edward.pensioncompliance.returns.entity.ReturnLine;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReturnLineRepository extends JpaRepository<ReturnLine, Long> {
    List<ReturnLine> findByReturnVersionId(Long returnVersionId);
}