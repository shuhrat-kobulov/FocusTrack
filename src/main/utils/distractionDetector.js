'use strict';

/**
 * distractionDetector.js
 * ──────────────────────
 * Pure functions for detecting distraction patterns in raw activity logs.
 *
 * All exports are side-effect-free and stateless – no I/O, no globals,
 * fully unit-testable in isolation.
 *
 * ── Rule catalogue ────────────────────────────────────────────────────────
 *
 *  ID                     Trigger                                  Severity
 *  ─────────────────────  ──────────────────────────────────────── ────────
 *  HIGH_SWITCH_RATE       > SWITCH_THRESHOLD switches in any       high
 *                         rolling WINDOW_MINUTES window
 *  LOW_FOCUS_AVG          avg session duration < MIN_AVG_DURATION  medium
 *  (any custom rule)      provided via `rules` option              varies
 *
 * ── Insight shape ─────────────────────────────────────────────────────────
 * {
 *   ruleId  : string,   // stable machine-readable identifier
 *   severity: 'high' | 'medium' | 'low' | 'info',
 *   label   : string,   // short human display string, e.g. "High distraction"
 *   detail  : string,   // explanation with concrete numbers
 *   meta    : Object,   // raw numbers that triggered the rule (for UI / tests)
 * }
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants (exported so callers can reference them in tests)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
    /** App switches that constitute "high distraction" within the window */
    SWITCH_THRESHOLD: 15,
    /** Rolling time window in minutes for the switch-rate rule */
    WINDOW_MINUTES: 10,
    /** Average session duration below which focus is deemed "low" (seconds) */
    MIN_AVG_DURATION: 120, // 2 minutes
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guard: return true when a session has the minimum required fields for
 * distraction analysis.
 * @param {*} s
 * @returns {boolean}
 */
function _isUsable(s) {
    return (
        s !== null &&
        typeof s === 'object' &&
        typeof s.appName === 'string' &&
        s.appName.length > 0 &&
        typeof s.duration === 'number' &&
        Number.isFinite(s.duration) &&
        s.duration >= 1 &&
        typeof s.startTime === 'string' &&
        s.startTime.length > 0
    );
}

/**
 * Count the maximum number of app switches (consecutive different-app
 * transitions) that occur within any rolling `windowMs` window.
 *
 * Algorithm: sliding-window with two pointers → O(n).
 *
 * A "switch" is every transition where the current app differs from the
 * immediately preceding app.  Sessions must be pre-sorted by startTime.
 *
 * @param {Array<Object>} sorted  – sessions sorted ascending by startTime
 * @param {number}        windowMs
 * @returns {{ maxSwitches: number, windowStart: string, windowEnd: string }}
 */
function _maxSwitchesInWindow(sorted, windowMs) {
    if (sorted.length < 2) {
        return { maxSwitches: 0, windowStart: '', windowEnd: '' };
    }

    // Build a switches array: each entry is the timestamp of a switch event
    const switchTimes = [];
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].appName !== sorted[i - 1].appName) {
            switchTimes.push(new Date(sorted[i].startTime).getTime());
        }
    }

    if (switchTimes.length === 0) {
        return { maxSwitches: 0, windowStart: '', windowEnd: '' };
    }

    // Sliding window over switchTimes
    let left = 0;
    let maxCount = 0;
    let bestLeft = 0;
    let bestRight = 0;

    for (let right = 0; right < switchTimes.length; right++) {
        while (switchTimes[right] - switchTimes[left] > windowMs) {
            left++;
        }
        const count = right - left + 1;
        if (count > maxCount) {
            maxCount = count;
            bestLeft = left;
            bestRight = right;
        }
    }

    return {
        maxSwitches: maxCount,
        windowStart: new Date(switchTimes[bestLeft]).toISOString(),
        windowEnd: new Date(switchTimes[bestRight]).toISOString(),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in rule functions
// Each rule : (sessions: Session[], opts: Object) → Insight | null
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HIGH_SWITCH_RATE – fires when app switches exceed the threshold within the
 * rolling window.
 * @param {Array<Object>} sorted – usable sessions sorted by startTime (asc)
 * @param {Object} opts
 * @returns {Object|null} Insight or null
 */
function ruleHighSwitchRate(sorted, opts) {
    const threshold = opts.SWITCH_THRESHOLD ?? DEFAULTS.SWITCH_THRESHOLD;
    const windowMs = (opts.WINDOW_MINUTES ?? DEFAULTS.WINDOW_MINUTES) * 60_000;

    const { maxSwitches, windowStart, windowEnd } =
        _maxSwitchesInWindow(sorted, windowMs);

    if (maxSwitches <= threshold) return null;

    return {
        ruleId: 'HIGH_SWITCH_RATE',
        severity: 'high',
        label: 'High distraction',
        detail: `${maxSwitches} app switches detected within a ${opts.WINDOW_MINUTES ?? DEFAULTS.WINDOW_MINUTES}-minute window (threshold: ${threshold}).`,
        meta: {
            maxSwitches,
            threshold,
            windowMinutes: opts.WINDOW_MINUTES ?? DEFAULTS.WINDOW_MINUTES,
            windowStart,
            windowEnd,
        },
    };
}

/**
 * LOW_FOCUS_AVG – fires when the mean session duration falls below the
 * minimum threshold.
 * @param {Array<Object>} sorted
 * @param {Object} opts
 * @returns {Object|null} Insight or null
 */
function ruleLowFocusAvg(sorted, opts) {
    const minAvg = opts.MIN_AVG_DURATION ?? DEFAULTS.MIN_AVG_DURATION;
    if (sorted.length === 0) return null;

    const total = sorted.reduce((sum, s) => sum + s.duration, 0);
    const avg = total / sorted.length;

    if (avg >= minAvg) return null;

    const avgMin = (avg / 60).toFixed(1);
    const minMin = (minAvg / 60).toFixed(0);

    return {
        ruleId: 'LOW_FOCUS_AVG',
        severity: 'medium',
        label: 'Low focus',
        detail: `Average session duration is ${avgMin} min — below the ${minMin}-min focus threshold.`,
        meta: {
            avgDurationSeconds: parseFloat(avg.toFixed(2)),
            minAvgDurationSeconds: minAvg,
            sessionCount: sorted.length,
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyse an array of raw activity-log sessions and return a list of
 * distraction insights.
 *
 * @param {Array<Object>} sessions   – raw session objects (any order, may
 *                                     contain corrupt entries)
 * @param {Object}        [opts={}]  – threshold overrides:
 *   {
 *     SWITCH_THRESHOLD : number,  // default 15
 *     WINDOW_MINUTES   : number,  // default 10
 *     MIN_AVG_DURATION : number,  // default 120 (seconds)
 *     rules            : Array<Function>  // custom rule fns (same signature)
 *   }
 * @returns {Array<Object>} insights – zero or more Insight objects
 */
function detectDistractions(sessions, opts = {}) {
    if (!Array.isArray(sessions)) {
        throw new TypeError('detectDistractions: sessions must be an array');
    }

    // 1. Filter invalid / incomplete records
    const usable = sessions.filter(_isUsable);

    // 2. Sort ascending by startTime once – O(n log n) – shared by all rules
    const sorted = usable
        .slice()
        .sort(
            (a, b) =>
                new Date(a.startTime).getTime() -
                new Date(b.startTime).getTime()
        );

    // 3. Collect the built-in rules + any caller-supplied custom rules
    const ruleSet = [
        ruleHighSwitchRate,
        ruleLowFocusAvg,
        ...(Array.isArray(opts.rules) ? opts.rules : []),
    ];

    // 4. Run each rule; collect non-null insights
    const insights = [];
    for (const rule of ruleSet) {
        const insight = rule(sorted, opts);
        if (insight != null) {
            insights.push(insight);
        }
    }

    return insights;
}

/**
 * Convenience wrapper: run detection over multiple days at once and return
 * a map of date → insights[].
 *
 * Sessions without a `date` field are bucketed under `'unknown'`.
 *
 * @param {Array<Object>} sessions
 * @param {Object}        [opts={}]
 * @returns {Record<string, Array<Object>>}
 */
function detectDistractionsPerDay(sessions, opts = {}) {
    if (!Array.isArray(sessions)) {
        throw new TypeError(
            'detectDistractionsPerDay: sessions must be an array'
        );
    }

    /** @type {Map<string, Array>} */
    const byDate = new Map();

    for (const s of sessions) {
        const key =
            s && typeof s.date === 'string' && s.date ? s.date : 'unknown';
        const bucket = byDate.get(key);
        if (bucket) {
            bucket.push(s);
        } else {
            byDate.set(key, [s]);
        }
    }

    /** @type {Record<string, Array>} */
    const result = {};
    for (const [date, group] of byDate) {
        result[date] = detectDistractions(group, opts);
    }
    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    // Main entry points
    detectDistractions,
    detectDistractionsPerDay,

    // Individual rules – exported for unit testing and for use as custom rules
    ruleHighSwitchRate,
    ruleLowFocusAvg,

    // Constants
    DEFAULTS,
};
