const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Secure bridge between main and renderer processes
 * This exposes only specific, safe APIs to the renderer
 */

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * Check if the window tracker is ready
     * @returns {Promise<boolean>} True if window tracker is loaded and ready
     */
    isWindowTrackerReady: () => ipcRenderer.invoke('is-window-tracker-ready'),

    /**
     * Get the currently active window information
     * @returns {Promise<Object>} Active window details
     */
    getActiveWindow: () => ipcRenderer.invoke('get-active-window'),

    // ── Activity Logger API ────────────────────────────────────────────────

    /**
     * Signal the start of a new app session.
     * Safe to call repeatedly with the same appName – it's idempotent.
     * @param {string} appName
     * @returns {Promise<{ok:boolean}>}
     */
    startActivitySession: (appName) =>
        ipcRenderer.invoke('activity:start-session', appName),

    /**
     * Finalise the currently active session and persist it.
     * @returns {Promise<{ok:boolean}>}
     */
    endActivitySession: () => ipcRenderer.invoke('activity:end-session'),

    /**
     * Retrieve all logged sessions for a given date.
     * @param {string} [date] – YYYY-MM-DD (defaults to today in main process)
     * @returns {Promise<{ok:boolean, sessions:Array}>}
     */
    getActivitySessions: (date) =>
        ipcRenderer.invoke('activity:get-sessions', date),
});

console.log('Preload script loaded - electronAPI exposed');
