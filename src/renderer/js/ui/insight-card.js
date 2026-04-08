/**
 * insight-card.js
 * ───────────────
 * Reusable Insight Card component for the FocusTrack dashboard.
 *
 * Reads today's persisted activity sessions via electronAPI, derives a set
 * of human-readable insights, and renders them into a target container.
 *
 * Public API (attached to window.InsightCard):
 *   InsightCard.init(containerId)   – first mount; sets up auto-refresh
 *   InsightCard.refresh()           – manual re-render
 */

(function (global) {
    'use strict';

    // ─── Config ──────────────────────────────────────────────────────────────
    const AUTO_REFRESH_MS = 30_000; // re-fetch every 30 s while tracking

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /** Format seconds → "2h 15m", "45m", "30s" */
    function fmtDuration(sec) {
        const s = Math.round(sec || 0);
        if (s < 60)   return `${s}s`;
        if (s < 3600) return `${Math.floor(s / 60)}m`;
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return m === 0 ? `${h}h` : `${h}h ${m}m`;
    }

    /** Count app-switch events in a sorted session array */
    function countSwitches(sorted) {
        let sw = 0;
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].appName !== sorted[i - 1].appName) sw++;
        }
        return sw;
    }

    /** Aggregate total seconds per app → sorted desc */
    function topApps(sessions) {
        const map = {};
        for (const s of sessions) {
            map[s.appName] = (map[s.appName] || 0) + s.duration;
        }
        return Object.entries(map)
            .map(([name, sec]) => ({ name, sec }))
            .sort((a, b) => b.sec - a.sec);
    }

    /**
     * Derive insights from a raw sessions array.
     * Returns an array of { icon, label, value, detail? } objects.
     */
    function deriveInsights(sessions) {
        if (!sessions || sessions.length === 0) return [];

        const usable = sessions
            .filter(
                (s) =>
                    s &&
                    typeof s.appName === 'string' &&
                    s.appName.length > 0 &&
                    typeof s.duration === 'number' &&
                    s.duration >= 1
            )
            .sort(
                (a, b) =>
                    new Date(a.startTime).getTime() -
                    new Date(b.startTime).getTime()
            );

        if (usable.length === 0) return [];

        const totalSec   = usable.reduce((t, s) => t + s.duration, 0);
        const switches   = countSwitches(usable);
        const switchesPerHour =
            totalSec > 0 ? (switches / totalSec) * 3600 : 0;
        const avgSec     = totalSec / usable.length;
        const ranked     = topApps(usable);
        const topApp     = ranked[0];

        // ── Focus grade (mirrors focusScoreCalculator thresholds) ──────────
        const ftScore  = Math.min(1, totalSec / (4 * 3600));
        const srScore  = Math.max(0, 1 - switchesPerHour / 60);
        const asScore  = Math.min(1, avgSec / (25 * 60));
        const rawScore = (ftScore * 0.4 + srScore * 0.35 + asScore * 0.25) * 100;
        const score    = Math.round(Math.max(0, Math.min(100, rawScore)));

        let grade, gradeClass;
        if (score >= 80) { grade = 'Excellent'; gradeClass = 'insight-grade--excellent'; }
        else if (score >= 60) { grade = 'Good';      gradeClass = 'insight-grade--good'; }
        else if (score >= 40) { grade = 'Fair';      gradeClass = 'insight-grade--fair'; }
        else                  { grade = 'Poor';      gradeClass = 'insight-grade--poor'; }

        // ── Switch-rate label ──────────────────────────────────────────────
        let switchLabel, switchClass;
        if (switchesPerHour <= 10) { switchLabel = 'Low';      switchClass = 'insight-pill--green'; }
        else if (switchesPerHour <= 30) { switchLabel = 'Moderate'; switchClass = 'insight-pill--yellow'; }
        else                            { switchLabel = 'High';     switchClass = 'insight-pill--red'; }

        const insights = [
            {
                icon:  '🏆',
                label: 'Focus score',
                value: `${score}/100`,
                detail: grade,
                detailClass: gradeClass,
            },
            {
                icon:  '⏱',
                label: 'Total tracked',
                value: fmtDuration(totalSec),
                detail: `${usable.length} session${usable.length !== 1 ? 's' : ''}`,
            },
            {
                icon:  '🔀',
                label: 'App switches',
                value: `${switches}`,
                detail: `${switchLabel} (${switchesPerHour.toFixed(1)}/hr)`,
                detailClass: switchClass,
            },
            {
                icon:  '🎯',
                label: 'Avg session',
                value: fmtDuration(avgSec),
                detail: avgSec >= 25 * 60 ? 'Pomodoro+ 🎉' : 'per app block',
            },
        ];

        if (topApp) {
            const pct = ((topApp.sec / totalSec) * 100).toFixed(0);
            insights.push({
                icon:  '📌',
                label: 'Most used',
                value: topApp.name,
                detail: `${fmtDuration(topApp.sec)} · ${pct}%`,
            });
        }

        // Distraction nudge: appears only when relevant
        if (switchesPerHour > 30) {
            insights.push({
                icon:  '💡',
                label: 'Tip',
                value: 'Reduce context switching',
                detail: 'Try grouping similar tasks together.',
                highlight: true,
            });
        } else if (avgSec < 5 * 60 && usable.length >= 3) {
            insights.push({
                icon:  '💡',
                label: 'Tip',
                value: 'Lengthen focus blocks',
                detail: 'Aim for 25-min Pomodoro sessions.',
                highlight: true,
            });
        }

        return insights;
    }

    // ─── Renderer ────────────────────────────────────────────────────────────

    function renderEmpty(container) {
        container.innerHTML = `
            <div class="insight-card">
                <div class="insight-card__header">
                    <span class="insight-card__title">Today's Insights</span>
                    <span class="insight-card__badge">–</span>
                </div>
                <p class="insight-card__empty">
                    Start tracking to see your focus insights.
                </p>
            </div>`;
    }

    function renderInsights(container, insights) {
        const items = insights
            .map((ins) => {
                const detailTag = ins.detail
                    ? `<span class="insight-item__detail ${ins.detailClass || ''}">${ins.detail}</span>`
                    : '';

                return `
                <li class="insight-item ${ins.highlight ? 'insight-item--highlight' : ''}">
                    <span class="insight-item__icon" aria-hidden="true">${ins.icon}</span>
                    <div class="insight-item__body">
                        <span class="insight-item__label">${ins.label}</span>
                        <span class="insight-item__value">${ins.value}</span>
                    </div>
                    ${detailTag}
                </li>`;
            })
            .join('');

        const ts = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });

        container.innerHTML = `
            <div class="insight-card">
                <div class="insight-card__header">
                    <span class="insight-card__title">Today's Insights</span>
                    <span class="insight-card__badge">${insights.length}</span>
                </div>
                <ul class="insight-list">${items}</ul>
                <p class="insight-card__footer">Updated ${ts}</p>
            </div>`;
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    let _containerId = null;
    let _refreshTimer = null;

    async function refresh() {
        if (!_containerId) return;

        const container = document.getElementById(_containerId);
        if (!container) return;

        try {
            const result = await window.electronAPI.getActivitySessions();
            const sessions = result?.sessions || [];
            const insights = deriveInsights(sessions);

            if (insights.length === 0) {
                renderEmpty(container);
            } else {
                renderInsights(container, insights);
            }
        } catch (err) {
            console.warn('[InsightCard] Failed to fetch sessions:', err.message);
            renderEmpty(container);
        }
    }

    function init(containerId) {
        _containerId = containerId;

        // Initial render
        refresh();

        // Auto-refresh
        if (_refreshTimer) clearInterval(_refreshTimer);
        _refreshTimer = setInterval(refresh, AUTO_REFRESH_MS);
    }

    // Expose on global
    global.InsightCard = { init, refresh };
})(window);
