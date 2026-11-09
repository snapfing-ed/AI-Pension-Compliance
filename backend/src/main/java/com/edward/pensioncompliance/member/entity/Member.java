package com.edward.pensioncompliance.member.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "member")
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "member_ref", nullable = false, length = 50, updatable = false)
    private String memberRef;

    @Column(name = "source_member_ref", length = 100)
    private String sourceMemberRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MemberStatus status = MemberStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Member() {
        // Required by JPA
    }

    public Member(String memberRef, String sourceMemberRef, MemberStatus status) {
        this.memberRef = memberRef;
        this.sourceMemberRef = sourceMemberRef;
        this.status = (status != null) ? status : MemberStatus.ACTIVE;
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public Long getMemberId() { return memberId; }
    public String getMemberRef() { return memberRef; }
    public String getSourceMemberRef() { return sourceMemberRef; }
    public MemberStatus getStatus() { return status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}