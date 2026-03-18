'use strict';

/**
 * activityAggregator.js
 * ─────────────────────
 * Pure functions for transforming raw activity-log sessions into
 * structured daily summaries.
 *
 * All exports are side-effect-free and stateless.
 *
 * Expected session shape (as produced by ActivityLogger):
 * {
 *   appName  : string,
 *   startTime: string  (ISO-8601),
 *   endTime  : string  (ISO-8601),
 *   duration : number  (seconds, integer ≥ 1),
 *   date     : string  (YYYY-MM-DD, local date of startTime)
 * }
 *
 * Daily-summary shape returned by aggregateDay():
 * {
 *   date          : string,   // YYYY-MM-DD
 *   totalFocusTime: number,   // seconds
 *   sessionCount  : number,
 *   apps          : {
 *     [appName]: {
 *       totalDuration : number,  // seconds
 *       sessionCount  : number,
 *       percentage    : number,  // 0-100, share of totalFocusTime
 *       firstSeen     : string,  // ISO-8601
 *       lastSeen      : string,  // ISO-8601
 *     }
 *   },
 *   topApp        : string | null,   // app with highest totalDuration
 * }
 */

// ─────────────────────────────────────────────────────────────────────────────
// Guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return true if a value looks like a valid session record.
 * Used to filter out corrupt or incomplete log entries without throwing.
 * @param {*} session
 * @returns {boolean}
 */
function isValidSession(session) {
    return (
        session !== null &&
        typeof session === 'object' &&
        typeof session.appName === 'string' &&
        session.appName.length > 0 &&
        typeof session.duration === 'number' &&
        Number.isFinite(session.duration) &&
        session.duration >= 1
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Core aggregation – single pass O(n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate an array of sessions for a single calendar day.
 *
 * Complexity: O(n) time, O(k) space where k = number of distinct apps.
 *
 * @param {Array<Object>} sessions – raw sessions (may be unsorted / corrupt)
 * @param {string} [date]          – YYYY-MM-DD label; inferred from first
 *                                   valid session if omitted
 * @returns {Object} DailySummary
 */
function aggregateDay(sessions, date) {
    if (!Array.isArray(sessions)) {
        throw new TypeError('aggregateDay: sessions must be an array');
    }

    /** @type {Map<string, {totalDuration:number, sessionCount:number, firstSeen:string, lastSeen:string}>} */
    const appMap = new Map();
    let totalFocusTime = 0;
    let sessionCount = 0;
    let resolvedDate = date || null;

    for (const session of sessions) {
        if (!isValidSession(session)) continue;

        const { appName, duration, startTime, endTime, date: sessionDate } = session;

        // Resolve the summary date from the first valid session when not supplied
        if (!resolvedDate && sessionDate) {
            resolvedDate = sessionDate;
        }

        totalFocusTime += duration;
        sessionCount++;

        const existing = appMap.get(appName);

        if (existing) {
            existing.totalDuration += duration;
            existing.sessionCount++;
            // Track first/last seen across all sessions for this app
            if (startTime && startTime < existing.firstSeen) {
                existing.firstSeen = startTime;
            }
            if (endTime && endTime > existing.lastSeen) {
                existing.lastSeen = endTime;
            }
        } else {
            appMap.set(appName, {
                totalDuration: duration,
                sessionCount: 1,
                firstSeen: startTime || '',
                lastSeen: endTime || '',
            });
        }
    }

    // Second pass O(k) – compute percentages and find the top app
    let topApp = null;
    let topDuration = -1;

    /** @type {Record<string, Object>} */
    const apps = {};

    for (const [appName, stats] of appMap) {
        const percentage =
            totalFocusTime > 0
                ? parseFloat(
                      ((stats.totalDuration / totalFocusTime) * 100).toFixed(2)
                  )
                : 0;

        apps[appName] = {
            totalDuration: stats.totalDuration,
            sessionCount: stats.sessionCount,
            percentage,
            firstSeen: stats.firstSeen,
            lastSeen: stats.lastSeen,
        };

        if (stats.totalDuration > topDuration) {
            topDuration = stats.totalDuration;
            topApp = appName;
        }
    }

    return {
        date: resolvedDate || '',
        totalFocusTime,
        sessionCount,
        apps,
        topApp,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-day aggregation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Partition a flat array of sessions by their `date` field and aggregate
 * each group independently.
 *
 * Useful when sessions from multiple days are loaded at once (e.g. for
 * weekly/monthly reports).
 *
 * Complexity: O(n) time, O(n) space.
 *
 * @param {Array<Object>} sessions – raw sessions, any date order
 * @returns {Record<string, Object>} map of YYYY-MM-DD → DailySummary
 */
function aggregateMultipleDays(sessions) {
    if (!Array.isArray(sessions)) {
        throw new TypeError('aggregateMultipleDays: sessions must be an array');
    }

    /** @type {Map<string, Array>} */
    const byDate = new Map();

    for (const session of sessions) {
        if (!isValidSession(session)) continue;
        const key = session.date || 'unknown';
        const group = byDate.get(key);
        if (group) {
            group.push(session);
        } else {
            byDate.set(key, [session]);
        }
    }

    /** @type {Record<string, Object>} */
    const result = {};
    for (const [date, group] of byDate) {
        result[date] = aggregateDay(group, date);
    }

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience transformers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given a DailySummary, return `apps` entries as an array sorted by
 * `totalDuration` descending.
 *
 * Pure — does not mutate the summary.
 *
 * @param {Object} summary – result of aggregateDay()
 * @returns {Array<{appName:string} & Object>}
 */
function sortedAppUsage(summary) {
    if (!summary || typeof summary.apps !== 'object') return [];

    return Object.entries(summary.apps)
        .map(([appName, stats]) => ({ appName, ...stats }))
        .sort((a, b) => b.totalDuration - a.totalDuration);
}

/**
 * Format seconds into a human-readable string: "2h 15m 30s".
 * Zero values are omitted except when the total is 0 ("0s").
 * Pure utility function.
 *
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatDuration(totalSeconds) {
    if (typeof totalSeconds !== 'number' || !Number.isFinite(totalSeconds)) {
        return '0s';
    }

    const s = Math.round(Math.abs(totalSeconds));
    if (s === 0) return '0s';

    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

/**
 * Merge two DailySummary objects for the same date (e.g. after incremental
 * data loads). Does not mutate either input.
 *
 * @param {Object} a – DailySummary
 * @param {Object} b – DailySummary
 * @returns {Object} merged DailySummary
 */
function mergeDailySummaries(a, b) {
    const date = a.date || b.date;
    const mergedSessions = [];

    // Re-aggregate from the original session arrays is not possible here
    // since summaries are already flattened, so we merge the stats directly.
    const apps = { ...a.apps };

    for (const [appName, bStats] of Object.entries(b.apps || {})) {
        if (apps[appName]) {
            const aStats = apps[appName];
            const totalDuration = aStats.totalDuration + bStats.totalDuration;
            const sessionCount = aStats.sessionCount + bStats.sessionCount;
            const firstSeen =
                aStats.firstSeen < bStats.firstSeen
                    ? aStats.firstSeen
                    : bStats.firstSeen;
            const lastSeen =
                aStats.lastSeen > bStats.lastSeen
                    ? aStats.lastSeen
                    : bStats.lastSeen;
            apps[appName] = { totalDuration, sessionCount, firstSeen, lastSeen, percentage: 0 };
        } else {
            apps[appName] = { ...bStats };
        }
    }

    const totalFocusTime = (a.totalFocusTime || 0) + (b.totalFocusTime || 0);
    const sessionCount = (a.sessionCount || 0) + (b.sessionCount || 0);

    // Recompute percentages and topApp in O(k)
    let topApp = null;
    let topDuration = -1;

    for (const [appName, stats] of Object.entries(apps)) {
        stats.percentage =
            totalFocusTime > 0
                ? parseFloat(
                      ((stats.totalDuration / totalFocusTime) * 100).toFixed(2)
                  )
                : 0;
        if (stats.totalDuration > topDuration) {
            topDuration = stats.totalDuration;
            topApp = appName;
        }
    }

    return { date, totalFocusTime, sessionCount, apps, topApp };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    isValidSession,
    aggregateDay,
    aggregateMultipleDays,
    sortedAppUsage,
    formatDuration,
    mergeDailySummaries,
};
