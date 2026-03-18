'use strict';

/**
 * focusScoreCalculator.js
 * ───────────────────────
 * Pure, deterministic focus score calculator.
 *
 * Produces a single integer score in [0, 100] from raw activity-log
 * sessions, plus a structured explanation of how the score was derived.
 *
 * ── Scoring model ────────────────────────────────────────────────────────────
 *
 * The final score is a weighted sum of three independent sub-scores,
 * each normalised to [0, 100] via a sigmoid-like clamped linear scale:
 *
 *   Component               Weight   What it measures
 *   ──────────────────────  ──────   ──────────────────────────────────────────
 *   Total focus time          40 %   Absolute productive time in the session
 *   App-switch frequency      35 %   Context-switching cost (lower = better)
 *   Average session length    25 %   Depth of focus per continuous block
 *
 * All thresholds / weights are exported in SCORE_PARAMS so callers can
 * override them deterministically and verify behaviour in tests.
 *
 * ── Result shape ─────────────────────────────────────────────────────────────
 * {
 *   score        : number,   // integer 0-100
 *   grade        : string,   // 'Excellent' | 'Good' | 'Fair' | 'Poor'
 *   components   : {
 *     focusTime     : { raw: number, subScore: number, weight: number },
 *     switchRate    : { raw: number, subScore: number, weight: number },
 *     avgSession    : { raw: number, subScore: number, weight: number },
 *   },
 *   explanation  : string,   // human-readable paragraph
 *   sessionCount : number,
 * }
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tuneable parameters (all exported – change here to affect everything)
// ─────────────────────────────────────────────────────────────────────────────

const SCORE_PARAMS = {
    // ── Weights (must sum to 1.0) ──────────────────────────────────────────
    WEIGHT_FOCUS_TIME:  0.40,
    WEIGHT_SWITCH_RATE: 0.35,
    WEIGHT_AVG_SESSION: 0.25,

    // ── Focus-time scale (seconds) ─────────────────────────────────────────
    // Score of 0 at or below MIN, 100 at or above MAX (linear in between)
    FOCUS_TIME_MIN_SEC: 0,
    FOCUS_TIME_MAX_SEC: 4 * 3600,   // 4 hours of tracked time = perfect

    // ── Switch-rate scale (switches per hour) ──────────────────────────────
    // Score of 100 at or below MIN (very few switches), 0 at or above MAX
    SWITCH_RATE_MIN_PH: 0,
    SWITCH_RATE_MAX_PH: 60,         // 60 switches/hr (1/min) = worst case

    // ── Average session length scale (seconds) ─────────────────────────────
    // Score of 0 at or below MIN, 100 at or above MAX
    AVG_SESSION_MIN_SEC: 0,
    AVG_SESSION_MAX_SEC: 25 * 60,   // 25 min = Pomodoro unit = perfect

    // ── Grade boundaries ───────────────────────────────────────────────────
    GRADE_EXCELLENT: 80,
    GRADE_GOOD:      60,
    GRADE_FAIR:      40,
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return true when a session has the minimum fields required for scoring.
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
 * Linearly interpolate `value` from [lo, hi] → [0, 100], clamped.
 * When `invert` is true the mapping is reversed (high value → low score).
 *
 * @param {number} value
 * @param {number} lo
 * @param {number} hi
 * @param {boolean} [invert=false]
 * @returns {number} 0–100 (floating point)
 */
function _linearScale(value, lo, hi, invert = false) {
    if (hi <= lo) return invert ? 0 : 100; // degenerate range guard
    const ratio = (value - lo) / (hi - lo);
    const clamped = Math.max(0, Math.min(1, ratio));
    return invert ? (1 - clamped) * 100 : clamped * 100;
}

/**
 * Count app-switch events in a pre-sorted session array.
 * A switch is every transition where appName changes from the previous
 * session.
 * @param {Array<Object>} sorted
 * @returns {number}
 */
function _countSwitches(sorted) {
    let switches = 0;
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].appName !== sorted[i - 1].appName) switches++;
    }
    return switches;
}

/**
 * Total tracked duration in seconds for a usable sorted session array.
 * @param {Array<Object>} sorted
 * @returns {number}
 */
function _totalDuration(sorted) {
    let total = 0;
    for (const s of sorted) total += s.duration;
    return total;
}

/**
 * Derive a letter grade string from a numeric score using params.
 * @param {number} score
 * @param {Object} params
 * @returns {string}
 */
function _grade(score, params) {
    if (score >= params.GRADE_EXCELLENT) return 'Excellent';
    if (score >= params.GRADE_GOOD)      return 'Good';
    if (score >= params.GRADE_FAIR)      return 'Fair';
    return 'Poor';
}

/**
 * Format seconds as a compact human string ("2h 15m", "45s", etc.)
 * @param {number} sec
 * @returns {string}
 */
function _fmtDuration(sec) {
    const s = Math.round(sec);
    if (s < 60)   return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`.replace(/ 0s$/, '');
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-score calculators (pure, exported for isolated unit testing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sub-score for total focus time.
 * @param {number} totalSec   – total tracked seconds
 * @param {Object} [params]
 * @returns {number} 0–100
 */
function subScoreFocusTime(totalSec, params = SCORE_PARAMS) {
    return _linearScale(
        totalSec,
        params.FOCUS_TIME_MIN_SEC,
        params.FOCUS_TIME_MAX_SEC
    );
}

/**
 * Sub-score for app-switching frequency.
 * @param {number} switches    – total switch count
 * @param {number} totalSec    – total tracked seconds (used to derive rate)
 * @param {Object} [params]
 * @returns {number} 0–100  (higher = fewer switches = better)
 */
function subScoreSwitchRate(switches, totalSec, params = SCORE_PARAMS) {
    if (totalSec <= 0) return 100; // no data → no penalty
    const switchesPerHour = (switches / totalSec) * 3600;
    return _linearScale(
        switchesPerHour,
        params.SWITCH_RATE_MIN_PH,
        params.SWITCH_RATE_MAX_PH,
        true // invert: more switches = lower score
    );
}

/**
 * Sub-score for average session length.
 * @param {number} avgSec  – mean session duration in seconds
 * @param {Object} [params]
 * @returns {number} 0–100
 */
function subScoreAvgSession(avgSec, params = SCORE_PARAMS) {
    return _linearScale(
        avgSec,
        params.AVG_SESSION_MIN_SEC,
        params.AVG_SESSION_MAX_SEC
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the focus score for an array of raw activity-log sessions.
 *
 * @param {Array<Object>} sessions – raw sessions (any order, corrupt entries
 *                                   are silently skipped)
 * @param {Object}        [params] – override any SCORE_PARAMS key
 * @returns {Object} FocusScoreResult
 */
function calculateFocusScore(sessions, params = SCORE_PARAMS) {
    if (!Array.isArray(sessions)) {
        throw new TypeError('calculateFocusScore: sessions must be an array');
    }

    // Merge caller overrides with defaults
    const p = { ...SCORE_PARAMS, ...params };

    // ── 1. Filter and sort ──────────────────────────────────────────────────
    const usable = sessions
        .filter(_isUsable)
        .sort(
            (a, b) =>
                new Date(a.startTime).getTime() -
                new Date(b.startTime).getTime()
        );

    const sessionCount = usable.length;

    // Short-circuit: no valid sessions → score 0
    if (sessionCount === 0) {
        return {
            score: 0,
            grade: 'Poor',
            components: {
                focusTime:  { raw: 0, subScore: 0, weight: p.WEIGHT_FOCUS_TIME },
                switchRate: { raw: 0, subScore: 0, weight: p.WEIGHT_SWITCH_RATE },
                avgSession: { raw: 0, subScore: 0, weight: p.WEIGHT_AVG_SESSION },
            },
            explanation: 'No valid sessions recorded – unable to calculate a focus score.',
            sessionCount: 0,
        };
    }

    // ── 2. Compute raw metrics ──────────────────────────────────────────────
    const totalSec     = _totalDuration(usable);
    const switches     = _countSwitches(usable);
    const avgSec       = sessionCount > 0 ? totalSec / sessionCount : 0;
    const switchesPerHour =
        totalSec > 0 ? (switches / totalSec) * 3600 : 0;

    // ── 3. Sub-scores ───────────────────────────────────────────────────────
    const ftSubScore  = subScoreFocusTime(totalSec, p);
    const srSubScore  = subScoreSwitchRate(switches, totalSec, p);
    const asSubScore  = subScoreAvgSession(avgSec, p);

    // ── 4. Weighted sum → round to integer ──────────────────────────────────
    const rawScore =
        ftSubScore  * p.WEIGHT_FOCUS_TIME +
        srSubScore  * p.WEIGHT_SWITCH_RATE +
        asSubScore  * p.WEIGHT_AVG_SESSION;

    const score = Math.min(100, Math.max(0, Math.round(rawScore)));
    const grade = _grade(score, p);

    // ── 5. Structured explanation ───────────────────────────────────────────
    const explanation = _buildExplanation({
        score, grade, sessionCount,
        totalSec, switches, switchesPerHour, avgSec,
        ftSubScore, srSubScore, asSubScore, p,
    });

    return {
        score,
        grade,
        components: {
            focusTime: {
                raw:      totalSec,
                subScore: parseFloat(ftSubScore.toFixed(1)),
                weight:   p.WEIGHT_FOCUS_TIME,
            },
            switchRate: {
                raw:      parseFloat(switchesPerHour.toFixed(2)),  // per hour
                subScore: parseFloat(srSubScore.toFixed(1)),
                weight:   p.WEIGHT_SWITCH_RATE,
            },
            avgSession: {
                raw:      parseFloat(avgSec.toFixed(1)),
                subScore: parseFloat(asSubScore.toFixed(1)),
                weight:   p.WEIGHT_AVG_SESSION,
            },
        },
        explanation,
        sessionCount,
    };
}

/**
 * Build the human-readable explanation string.
 * Pure function – all inputs passed explicitly.
 * @param {Object} ctx
 * @returns {string}
 */
function _buildExplanation(ctx) {
    const {
        score, grade, sessionCount,
        totalSec, switches, switchesPerHour, avgSec,
        ftSubScore, srSubScore, asSubScore,
    } = ctx;

    if (sessionCount === 0) {
        return 'No valid sessions recorded – unable to calculate a focus score.';
    }

    const parts = [
        `Focus score: ${score}/100 (${grade}).`,
        `Based on ${sessionCount} session${sessionCount !== 1 ? 's' : ''} totalling ${_fmtDuration(totalSec)} of tracked time.`,
    ];

    // Focus-time commentary
    if (ftSubScore >= 75) {
        parts.push(`Excellent total focus time (${_fmtDuration(totalSec)}).`);
    } else if (ftSubScore >= 40) {
        parts.push(`Moderate total focus time (${_fmtDuration(totalSec)}); aim for more continuous tracking.`);
    } else {
        parts.push(`Low total focus time (${_fmtDuration(totalSec)}); consider longer tracking sessions.`);
    }

    // Switch-rate commentary
    const srLabel = `${switches} app switch${switches !== 1 ? 'es' : ''}` +
                    ` (${switchesPerHour.toFixed(1)}/hr)`;
    if (srSubScore >= 75) {
        parts.push(`Low context-switching – ${srLabel} indicates strong focus.`);
    } else if (srSubScore >= 40) {
        parts.push(`Moderate context-switching – ${srLabel}; try grouping similar tasks.`);
    } else {
        parts.push(`High context-switching – ${srLabel}; frequent app changes reduce deep work.`);
    }

    // Avg-session commentary
    const asLabel = _fmtDuration(avgSec);
    if (asSubScore >= 75) {
        parts.push(`Strong average session length (${asLabel}) – sustained focus blocks detected.`);
    } else if (asSubScore >= 40) {
        parts.push(`Average session length of ${asLabel} is acceptable but could be longer.`);
    } else {
        parts.push(`Short average session length (${asLabel}) – consider time-blocking techniques.`);
    }

    return parts.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    // Main entry point
    calculateFocusScore,

    // Sub-score calculators – exported for unit testing
    subScoreFocusTime,
    subScoreSwitchRate,
    subScoreAvgSession,

    // Default parameters
    SCORE_PARAMS,
};
