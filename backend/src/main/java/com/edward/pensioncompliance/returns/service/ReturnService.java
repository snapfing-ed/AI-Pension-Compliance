package com.edward.pensioncompliance.returns.service;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.common.dto.PageResponse;
import com.edward.pensioncompliance.datasource.repository.DataSourceRepository;
import com.edward.pensioncompliance.employer.repository.EmployerRepository;
import com.edward.pensioncompliance.period.repository.ContributionPeriodRepository;
import com.edward.pensioncompliance.returns.dto.ReturnVersionResponse;
import com.edward.pensioncompliance.returns.dto.SubmitReturnRequest;
import com.edward.pensioncompliance.returns.dto.SubmittedReturnSummaryResponse;
import com.edward.pensioncompliance.returns.entity.*;
import com.edward.pensioncompliance.returns.repository.ReturnLineRepository;
import com.edward.pensioncompliance.returns.repository.ReturnVersionRepository;
import com.edward.pensioncompliance.returns.repository.SubmittedReturnRepository;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
public class ReturnService {

    private static final int MAX_PAGE_SIZE = 100;

    private final SubmittedReturnRepository returns;
    private final ReturnVersionRepository versions;
    private final ReturnLineRepository lines;
    private final EmployerRepository employers;
    private final ContributionPeriodRepository periods;
    private final DataSourceRepository sources;
    private final AppUserRepository users;
    private final AuditService audit;

    public ReturnService(
            SubmittedReturnRepository returns, ReturnVersionRepository versions, ReturnLineRepository lines,
            EmployerRepository employers, ContributionPeriodRepository periods, DataSourceRepository sources,
            AppUserRepository users, AuditService audit) {
        this.returns = returns;
        this.versions = versions;
        this.lines = lines;
        this.employers = employers;
        this.periods = periods;
        this.sources = sources;
        this.users = users;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageResponse<SubmittedReturnSummaryResponse> listReturns(
            Long employerId, Long periodId, int page, int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("returnId")));

        Page<SubmittedReturn> result;
        if (employerId != null && periodId != null) {
            result = returns.findByEmployerIdAndPeriodId(employerId, periodId, pageable);
        } else if (employerId != null) {
            result = returns.findByEmployerId(employerId, pageable);
        } else if (periodId != null) {
            result = returns.findByPeriodId(periodId, pageable);
        } else {
            result = returns.findAll(pageable);
        }

        return PageResponse.of(result.map(sr -> {
            ReturnVersion latest = versions.findTopByReturnIdOrderByVersionNoDesc(sr.getReturnId())
                    .orElse(null);
            return SubmittedReturnSummaryResponse.from(sr, latest);
        }));
    }

    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    @Transactional
    public ReturnVersionResponse submit(SubmitReturnRequest request, Authentication auth) {
        if (!employers.existsById(request.employerId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Employer not found.");
        }
        if (!periods.existsById(request.periodId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Contribution period not found.");
        }
        if (!sources.existsById(request.sourceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Data source not found.");
        }

        ReturnType rType = parseEnum(ReturnType.class, request.returnType(), "Unknown return type.");
        CompletenessStatus compStatus = (request.completenessStatus() == null || request.completenessStatus().isBlank())
                ? CompletenessStatus.UNKNOWN
                : parseEnum(CompletenessStatus.class, request.completenessStatus(), "Unknown completeness status.");

        SubmittedReturn sr;
        int nextVersionNo = 1;
        Long supersedesVersionId = null;

        if (request.supersedesReturnId() != null) {
            sr = returns.findById(request.supersedesReturnId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Logical return not found."));
            ReturnVersion latest = versions.findTopByReturnIdOrderByVersionNoDesc(sr.getReturnId())
                    .orElse(null);
            if (latest != null) {
                nextVersionNo = latest.getVersionNo() + 1;
                supersedesVersionId = latest.getReturnVersionId();
            }
        } else {
            sr = returns.save(new SubmittedReturn(request.employerId(), request.periodId(), rType, request.returnRef()));
        }

        ReturnVersion savedVersion = versions.save(new ReturnVersion(
                sr.getReturnId(), request.sourceId(), nextVersionNo,
                request.submittedAt(), request.receivedAt(),
                request.reportedEmployeeAmount(), request.reportedEmployerAmount(), request.reportedTotalAmount(),
                compStatus, supersedesVersionId, request.sourceDocumentRef()
        ));

        if (request.lines() != null) {
            for (SubmitReturnRequest.ReturnLineRequest lr : request.lines()) {
                ReturnLineStatus ls = (lr.lineStatus() == null || lr.lineStatus().isBlank())
                        ? ReturnLineStatus.UNVERIFIED
                        : parseEnum(ReturnLineStatus.class, lr.lineStatus(), "Unknown return line status.");
                lines.save(new ReturnLine(
                        savedVersion.getReturnVersionId(), lr.memberId(), lr.lineRef(),
                        lr.reportedPay(), lr.reportedEmployeeAmount(),
                        lr.reportedEmployerAmount(), lr.reportedTotalAmount(), ls
                ));
            }
        }

        AppUser actor = users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Actor not found."));
        audit.record(actor, "RETURN_VERSION_SUBMITTED", "RETURN_VERSION",
                savedVersion.getReturnVersionId().toString(),
                "Submitted returnId=" + sr.getReturnId() + " v" + nextVersionNo + " for employerId=" + request.employerId());

        return ReturnVersionResponse.from(savedVersion);
    }

    @Transactional(readOnly = true)
    public List<ReturnVersionResponse> listVersions(Long returnId) {
        return versions.findByReturnIdOrderByVersionNoDesc(returnId).stream()
                .map(ReturnVersionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReturnLine> listLines(Long returnVersionId) {
        return lines.findByReturnVersionId(returnVersionId);
    }

    private static <E extends Enum<E>> E parseEnum(Class<E> type, String val, String msg) {
        try {
            return Enum.valueOf(type, val.trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
        }
    }
}