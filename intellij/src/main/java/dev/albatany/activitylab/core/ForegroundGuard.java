package dev.albatany.activitylab.core;

/** Session scheduling only. This does not activate windows or generate input events. */
public final class ForegroundGuard {
    public enum State { RUNNING, PAUSED, WAITING_FOR_IDE, EXPIRED, STOPPED }
    private boolean foregroundOnly;
    private State state = State.RUNNING;
    private long sampledAt, runningNanos, waitingNanos, pausedNanos;
    private boolean sampled;

    public ForegroundGuard(boolean foregroundOnly) { this.foregroundOnly = foregroundOnly; }

    public State update(boolean paused, boolean expired, boolean ideActive, long now) {
        if (state == State.STOPPED || state == State.EXPIRED) return state;
        settle(now);
        state = expired ? State.EXPIRED : paused ? State.PAUSED :
            foregroundOnly && !ideActive ? State.WAITING_FOR_IDE : State.RUNNING;
        return state;
    }
    public State setForegroundOnly(boolean value, boolean paused, boolean expired, boolean ideActive, long now) {
        foregroundOnly = value;
        return update(paused, expired, ideActive, now);
    }
    public boolean foregroundOnly() { return foregroundOnly; }
    public void finish(long now) { settle(now); state = State.STOPPED; }
    private void settle(long now) {
        long delta = currentNanos(now);
        switch (state) {
            case RUNNING -> runningNanos += delta;
            case WAITING_FOR_IDE -> waitingNanos += delta;
            case PAUSED -> pausedNanos += delta;
            default -> { }
        }
        sampledAt = now; sampled = true;
    }
    private long currentNanos(long now) { return sampled ? Math.max(0, now - sampledAt) : 0; }
    public State state() { return state; }
    public long waitingSeconds(long now) {
        long current = state == State.WAITING_FOR_IDE ? currentNanos(now) : 0;
        return (waitingNanos + current) / 1_000_000_000L;
    }
    public long runningSeconds(long now) {
        return (runningNanos + (state == State.RUNNING ? currentNanos(now) : 0)) / 1_000_000_000L;
    }
    public long pausedSeconds(long now) {
        return (pausedNanos + (state == State.PAUSED ? currentNanos(now) : 0)) / 1_000_000_000L;
    }
}
