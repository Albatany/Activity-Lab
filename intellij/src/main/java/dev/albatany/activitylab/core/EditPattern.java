package dev.albatany.activitylab.core;

public enum EditPattern {
    BALANCED("Balanced 1:1", 4, 4), MORE("Additions Favored 4:1", 4, 1), HEAVY("Strongly Favored 8:1", 8, 1);
    public final int additions, deletions;
    private final String label;
    EditPattern(String label, int additions, int deletions) {
        this.label = label; this.additions = additions; this.deletions = deletions;
    }
    @Override public String toString() { return label; }
}
