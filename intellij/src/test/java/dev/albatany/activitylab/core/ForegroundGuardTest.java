package dev.albatany.activitylab.core;

import org.junit.jupiter.api.Test;
import java.util.List;
import static dev.albatany.activitylab.core.ForegroundGuard.State.*;
import static org.junit.jupiter.api.Assertions.*;

class ForegroundGuardTest {
    private static final long SECOND = 1_000_000_000L;

    @Test void newSessionsWaitInBackgroundByDefaultAndResumeWithoutCatchup() {
        SessionOptions options = new SessionOptions(Catalog.resolve(List.of("Java")), "Single",
            5, 15, EditPattern.BALANCED, true);
        assertTrue(options.foregroundOnly());
        ForegroundGuard guard = new ForegroundGuard(options.foregroundOnly());
        assertEquals(RUNNING, guard.update(false, false, true, 0));
        assertEquals(WAITING_FOR_IDE, guard.update(false, false, false, 15 * SECOND));
        assertEquals(WAITING_FOR_IDE, guard.update(false, false, false, 45 * SECOND));
        assertEquals(45, guard.waitingSeconds(60 * SECOND));
        assertEquals(RUNNING, guard.update(false, false, true, 60 * SECOND));
        assertEquals(45, guard.waitingSeconds(90 * SECOND));
    }
    @Test void foregroundReturnDoesNotUndoAnExplicitPause() {
        ForegroundGuard guard = new ForegroundGuard(true);
        guard.update(false, false, false, 0);
        assertEquals(PAUSED, guard.update(true, false, false, 10 * SECOND));
        assertEquals(PAUSED, guard.update(true, false, true, 20 * SECOND));
        assertEquals(10, guard.waitingSeconds(20 * SECOND));
        assertEquals(RUNNING, guard.update(false, false, true, 30 * SECOND));
    }
    @Test void durationStillExpiresDuringWaitingOrManualPause() {
        SessionClock clock = new SessionClock(1, 0, 1000);
        ForegroundGuard guard = new ForegroundGuard(true);
        guard.update(false, false, false, 0);
        long end = 60 * SECOND;
        assertEquals(EXPIRED, guard.update(true, clock.expired(end, 61000), false, end));
        assertEquals(60, guard.waitingSeconds(end));
    }
    @Test void backgroundSimulationRemainsAnExplicitOption() {
        ForegroundGuard guard = new ForegroundGuard(false);
        assertEquals(RUNNING, guard.update(false, false, false, 0));
        assertEquals(RUNNING, guard.update(false, false, false, 30 * SECOND));
        assertEquals(0, guard.waitingSeconds(30 * SECOND));
        assertEquals(PAUSED, guard.update(true, false, false, 40 * SECOND));
        assertEquals(EXPIRED, guard.update(false, true, false, 50 * SECOND));
    }
    @Test void focusLossDuringFilePreparationDefersThePendingEdit() {
        ForegroundGuard guard = new ForegroundGuard(true);
        assertEquals(RUNNING, guard.update(false, false, true, 0));
        // The runtime makes this second check after opening the text editor and
        // immediately before submitting a write command.
        assertEquals(WAITING_FOR_IDE, guard.update(false, false, false, SECOND));
        assertEquals(RUNNING, guard.update(false, false, true, 2 * SECOND));
        assertEquals(1, guard.waitingSeconds(3 * SECOND));
    }

    @Test void longBackgroundWaitIsNotDisplayedAsRunningTime() {
        ForegroundGuard guard = new ForegroundGuard(true);
        guard.update(false, false, true, 0);
        guard.update(false, false, false, 15 * 60 * SECOND);
        long now = (320 * 60 + 14) * SECOND;
        assertEquals(15 * 60, guard.runningSeconds(now));
        assertEquals(305 * 60 + 14, guard.waitingSeconds(now));
        assertEquals(0, guard.pausedSeconds(now));
        // Querying the dashboard twice must not double-count time.
        assertEquals(305 * 60 + 14, guard.waitingSeconds(now));
    }

    @Test void changingBackgroundModeMidSessionKeepsPreviousTimeAndExplicitPause() {
        ForegroundGuard guard = new ForegroundGuard(true);
        guard.update(false, false, false, 0);
        assertEquals(RUNNING, guard.setForegroundOnly(false, false, false, false, 60 * SECOND));
        assertFalse(guard.foregroundOnly());
        assertEquals(60, guard.waitingSeconds(90 * SECOND));
        assertEquals(30, guard.runningSeconds(90 * SECOND));
        guard.update(true, false, false, 90 * SECOND);
        assertEquals(PAUSED, guard.setForegroundOnly(true, true, false, false, 100 * SECOND));
        assertEquals(PAUSED, guard.setForegroundOnly(false, true, false, false, 110 * SECOND));
        assertEquals(20, guard.pausedSeconds(110 * SECOND));
        assertEquals(RUNNING, guard.update(false, false, false, 120 * SECOND));
        guard.finish(150 * SECOND);
        assertEquals(60, guard.runningSeconds(300 * SECOND));
        assertEquals(60, guard.waitingSeconds(300 * SECOND));
        assertEquals(30, guard.pausedSeconds(300 * SECOND));
        assertEquals(STOPPED, guard.update(false, false, true, 400 * SECOND));
    }

    @Test void enablingBackgroundNeverRevivesAnExpiredSession() {
        ForegroundGuard guard = new ForegroundGuard(true);
        guard.update(false, false, false, 0);
        assertEquals(EXPIRED, guard.setForegroundOnly(false, false, true, false, 60 * SECOND));
        assertEquals(EXPIRED, guard.update(false, false, true, 80 * SECOND));
        assertEquals(60, guard.waitingSeconds(80 * SECOND));
        assertEquals(0, guard.runningSeconds(80 * SECOND));
    }
}
