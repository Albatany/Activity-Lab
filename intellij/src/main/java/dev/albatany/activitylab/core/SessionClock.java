package dev.albatany.activitylab.core;

/** Uses both elapsed and wall time so sleep or clock corrections cannot extend a session. */
public final class SessionClock {
    private final long startedNanos, startedMillis, durationNanos;
    public SessionClock(int minutes, long now) {
        this(minutes, now, System.currentTimeMillis());
    }
    public SessionClock(int minutes, long now, long wallMillis) {
        if (minutes < 0 || minutes > 480) throw new IllegalArgumentException("Invalid duration.");
        startedNanos = now; startedMillis = wallMillis;
        durationNanos = minutes == 0 ? Long.MAX_VALUE : minutes * 60_000_000_000L;
    }
    private long elapsedMillis(long now, long wallMillis) { return Math.max(0, Math.max((now - startedNanos) / 1_000_000L, wallMillis - startedMillis)); }
    public boolean expired(long now) { return expired(now, System.currentTimeMillis()); }
    public boolean expired(long now, long wallMillis) { return durationNanos != Long.MAX_VALUE && elapsedMillis(now, wallMillis) >= durationNanos / 1_000_000L; }
    public long elapsedSeconds(long now) { return elapsedMillis(now, System.currentTimeMillis()) / 1000; }
    public long remainingSeconds(long now) { return remainingSeconds(now, System.currentTimeMillis()); }
    public long remainingSeconds(long now, long wallMillis) { return durationNanos == Long.MAX_VALUE ? -1 : Math.max(0, durationNanos / 1_000_000_000L - elapsedMillis(now, wallMillis) / 1000); }
}
