package com.edward.pensioncompliance.contribution;

/** Thrown when zero or several rules apply: a configuration fault, never silently ignored. */
public class RuleSelectionException extends RuntimeException {
    public RuleSelectionException(String message) { super(message); }
}