package com.edward.pensioncompliance.member.dto;

import com.edward.pensioncompliance.member.entity.Member;

import java.time.OffsetDateTime;

public record MemberResponse(
        Long memberId,
        String memberRef,
        String sourceMemberRef,
        String status,
        OffsetDateTime createdAt
) {
    public static MemberResponse from(Member m) {
        return new MemberResponse(
                m.getMemberId(),
                m.getMemberRef(),
                m.getSourceMemberRef(),
                m.getStatus().name(),
                m.getCreatedAt()
        );
    }
}