package com.edward.pensioncompliance.member.repository;

import com.edward.pensioncompliance.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MemberRepository
        extends JpaRepository<Member, Long>, JpaSpecificationExecutor<Member> {

    boolean existsByMemberRef(String memberRef);

    Optional<Member> findByMemberRef(String memberRef);

    List<Member> findByMemberRefIn(Collection<String> memberRefs);
}