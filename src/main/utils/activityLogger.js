'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * ActivityLogger – Persists app-usage sessions to a JSON file.
 *
 * Data model (per date file):
 *   sessions: Array<{
 *     appName  : string,
 *     startTime: string (ISO-8601),
 *     endTime  : string (ISO-8601),
 *     duration : number (seconds),
 *     date     : string (YYYY-MM-DD)
 *   }>
 *
 * Design decisions:
 *  - One JSON file per calendar day → keeps files small & queries fast.
 *  - In-memory `currentSession` tracks the running session; the file is
 *    written only when a session ends (or on flush / app quit), so there
 *    is at most one write per app-switch instead of one write per second.
 *  - `_pendingWrite` debounces back-to-back end+start transitions that
 *    might otherwise produce two consecutive writes within milliseconds.
 *  - Overlap guard: if startSession() is called for the same appName
 *    that is already running, it is a no-op.
 */
class ActivityLogger {
    constructor() {
        /** @type {{ appName:string, startTime:Date }|null} */
        this._currentSession = null;

        /** Debounce timer reference */
        this._writeTimer = null;

        /** Milliseconds to coalesce writes */
        this._WRITE_DEBOUNCE_MS = 300;

        /** Resolved once the storage directory is guaranteed to exist */
        this._storageDir = null;

        this._ensureStorageDir();
        this._registerAppQuitHandler();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Begin a new tracking session.
     * If the same app is already the active session this is a no-op.
     * If a *different* app was active its session is ended first.
     *
     * @param {string} appName
     * @returns {void}
     */
    startSession(appName) {
        if (!appName || appName === 'Unknown') return;

        // No-op: same app still active
        if (this._currentSession && this._currentSession.appName === appName) {
            return;
        }

        // End previous session (but don't flush yet – wait for debounce)
        if (this._currentSession) {
            this._finalizeSession(this._currentSession);
        }

        this._currentSession = {
            appName,
            startTime: new Date(),
        };

        console.log(`[ActivityLogger] Session started: ${appName}`);
    }

    /**
     * End the currently active session and persist it.
     *
     * @returns {void}
     */
    endSession() {
        if (!this._currentSession) return;

        this._finalizeSession(this._currentSession);
        this._currentSession = null;
    }

    /**
     * Return all sessions for a given date (defaults to today).
     *
     * @param {string} [date] – YYYY-MM-DD, defaults to today
     * @returns {Array<Object>}
     */
    getSessions(date) {
        const target = date || this._todayString();
        const filePath = this._filePathForDate(target);

        try {
            if (!fs.existsSync(filePath)) return [];
            const raw = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(raw);
            return Array.isArray(data.sessions) ? data.sessions : [];
        } catch (err) {
            console.error('[ActivityLogger] Failed to read sessions:', err);
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Convert a running session into a completed record and queue a write.
     * @param {{ appName:string, startTime:Date }} session
     */
    _finalizeSession(session) {
        const endTime = new Date();
        const startTime = session.startTime;
        const duration = Math.round((endTime - startTime) / 1000);

        // Skip sessions shorter than 1 second (noise)
        if (duration < 1) return;

        const date = this._dateString(startTime);

        const record = {
            appName: session.appName,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration,
            date,
        };

        this._queueWrite(date, record);
        console.log(
            `[ActivityLogger] Session ended: ${session.appName} (${duration}s)`
        );
    }

    /**
     * Debounced write: collects multiple records within the debounce window
     * and writes them in a single I/O operation.
     *
     * @param {string} date
     * @param {Object} record
     */
    _queueWrite(date, record) {
        // Accumulate pending records keyed by date
        if (!this._pending) this._pending = {};
        if (!this._pending[date]) this._pending[date] = [];
        this._pending[date].push(record);

        clearTimeout(this._writeTimer);
        this._writeTimer = setTimeout(() => {
            this._flushPending();
        }, this._WRITE_DEBOUNCE_MS);
    }

    /**
     * Write all pending records to their respective date files.
     */
    _flushPending() {
        if (!this._pending) return;

        const pending = this._pending;
        this._pending = null;

        for (const [date, records] of Object.entries(pending)) {
            this._appendSessionsToFile(date, records);
        }
    }

    /**
     * Append `records` to the JSON file for `date`, deduplicating by
     * startTime to guard against any edge-case double-writes.
     *
     * @param {string} date
     * @param {Array<Object>} records
     */
    _appendSessionsToFile(date, records) {
        const filePath = this._filePathForDate(date);
        let data = { sessions: [] };

        try {
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf-8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.sessions)) {
                    data.sessions = parsed.sessions;
                }
            }
        } catch (err) {
            console.warn(
                '[ActivityLogger] Could not read existing file, starting fresh:',
                err.message
            );
        }

        // Deduplication: collect existing startTimes as a Set
        const existingStartTimes = new Set(
            data.sessions.map((s) => s.startTime)
        );

        // Overlap guard: reject records whose interval overlaps the last session
        // for the same appName (protects against rapid stop+start)
        let appended = 0;
        for (const record of records) {
            if (existingStartTimes.has(record.startTime)) continue;

            // Check for overlap with any existing session for the same app
            const hasOverlap = data.sessions.some(
                (s) =>
                    s.appName === record.appName &&
                    new Date(s.endTime) > new Date(record.startTime)
            );

            if (hasOverlap) {
                console.warn(
                    `[ActivityLogger] Skipping overlapping session for ${record.appName}`
                );
                continue;
            }

            data.sessions.push(record);
            existingStartTimes.add(record.startTime);
            appended++;
        }

        if (appended === 0) return; // Nothing new to write

        // Sort by startTime for easier querying
        data.sessions.sort(
            (a, b) => new Date(a.startTime) - new Date(b.startTime)
        );

        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (err) {
            console.error('[ActivityLogger] Failed to write sessions file:', err);
        }
    }

    /**
     * Ensure the storage directory exists.
     */
    _ensureStorageDir() {
        try {
            const userDataPath = app.getPath('userData');
            this._storageDir = path.join(userDataPath, 'activity-logs');
            if (!fs.existsSync(this._storageDir)) {
                fs.mkdirSync(this._storageDir, { recursive: true });
            }
        } catch (err) {
            // app might not be ready yet; defer
            app.on('ready', () => this._ensureStorageDir());
        }
    }

    /**
     * Flush any in-progress session when the app quits so data is not lost.
     */
    _registerAppQuitHandler() {
        app.on('before-quit', () => {
            clearTimeout(this._writeTimer);
            if (this._currentSession) {
                this._finalizeSession(this._currentSession);
                this._currentSession = null;
            }
            // Synchronous flush on quit
            if (this._pending) {
                const pending = this._pending;
                this._pending = null;
                for (const [date, records] of Object.entries(pending)) {
                    this._appendSessionsToFile(date, records);
                }
            }
        });
    }

    /**
     * Full path for the JSON file that stores sessions for `date`.
     * @param {string} date YYYY-MM-DD
     * @returns {string}
     */
    _filePathForDate(date) {
        const dir = this._storageDir || path.join(app.getPath('userData'), 'activity-logs');
        return path.join(dir, `${date}.json`);
    }

    /** @returns {string} YYYY-MM-DD for today (local time) */
    _todayString() {
        return this._dateString(new Date());
    }

    /** @param {Date} d @returns {string} YYYY-MM-DD */
    _dateString(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
}

module.exports = ActivityLogger;
