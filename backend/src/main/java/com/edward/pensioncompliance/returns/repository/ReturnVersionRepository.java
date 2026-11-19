package com.edward.pensioncompliance.returns.repository;

import com.edward.pensioncompliance.returns.entity.ReturnVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReturnVersionRepository extends JpaRepository<ReturnVersion, Long> {
    List<ReturnVersion> findByReturnIdOrderByVersionNoDesc(Long returnId);
    Optional<ReturnVersion> findTopByReturnIdOrderByVersionNoDesc(Long returnId);
}