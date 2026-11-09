package com.edward.pensioncompliance.period.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Entity
@Table(name = "contribution_period")
public class ContributionPeriod {

    private static final DateTimeFormatter LABEL_FORMAT =
            DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "period_id")
    private Long periodId;

    @Column(name = "period_year", nullable = false)
    private Short periodYear;

    @Column(name = "period_month", nullable = false)
    private Short periodMonth;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(name = "period_label", nullable = false, length = 20)
    private String periodLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ContributionPeriodStatus status = ContributionPeriodStatus.OPEN;

    protected ContributionPeriod() {
        // Required by JPA
    }

    public ContributionPeriod(int year, int month) {
        if (year < 2000 || year > 2200) {
            throw new IllegalArgumentException("Period year must be between 2000 and 2200.");
        }
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("Period month must be between 1 and 12.");
        }
        YearMonth ym = YearMonth.of(year, month);
        this.periodYear = (short) year;
        this.periodMonth = (short) month;
        this.periodStart = ym.atDay(1);
        this.periodEnd = ym.atEndOfMonth();
        this.periodLabel = ym.format(LABEL_FORMAT);
        this.status = ContributionPeriodStatus.OPEN;
    }

    public boolean canTransitionTo(ContributionPeriodStatus target) {
        if (target == null) {
            return false;
        }
        return switch (this.status) {
            case OPEN -> target == ContributionPeriodStatus.CLOSED;
            case CLOSED -> target == ContributionPeriodStatus.ARCHIVED;
            case ARCHIVED -> false;
        };
    }

    public void transitionTo(ContributionPeriodStatus target) {
        if (!canTransitionTo(target)) {
            throw new IllegalStateException(
                    "Invalid period status transition from " + this.status + " to " + target + ".");
        }
        this.status = target;
    }

    public Long getPeriodId() { return periodId; }
    public Short getPeriodYear() { return periodYear; }
    public Short getPeriodMonth() { return periodMonth; }
    public LocalDate getPeriodStart() { return periodStart; }
    public LocalDate getPeriodEnd() { return periodEnd; }
    public String getPeriodLabel() { return periodLabel; }
    public ContributionPeriodStatus getStatus() { return status; }
}