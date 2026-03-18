'use strict';

const { ipcMain } = require('electron');
const WindowTracker = require('../utils/windowTracker');
const ActivityLogger = require('../utils/activityLogger');

// Initialize window tracker
const windowTracker = new WindowTracker();
let isLoaded = true; // PowerShell-based tracker is always available

// Singleton activity logger shared across IPC calls
const activityLogger = new ActivityLogger();

console.log(
    'Window tracker module initialized successfully (PowerShell-based)'
);

/**
 * Register IPC handlers for window tracking and activity logging.
 */
function registerWindowTrackerHandlers() {
    // ── Window tracker handlers ────────────────────────────────────────────

    // Handle IPC call from renderer to check if window tracker is ready
    ipcMain.handle('is-window-tracker-ready', async () => {
        return isLoaded;
    });

    // Handle IPC call from renderer to get active window
    ipcMain.handle('get-active-window', async () => {
        if (!isLoaded) {
            throw new Error(
                'Window tracker not loaded yet. Please wait a moment and try again.'
            );
        }

        try {
            const result = await windowTracker.getActiveWindow();
            return result;
        } catch (error) {
            console.error('Error getting active window:', error);

            // Platform-specific error handling
            const platform = process.platform;

            if (platform === 'darwin') {
                // macOS-specific permission errors
                if (
                    error.message &&
                    (error.message.includes('screen recording') ||
                        error.message.includes('Screen Recording'))
                ) {
                    throw new Error(
                        'Screen Recording permission required. Please grant permission in System Settings › Privacy & Security › Screen Recording'
                    );
                }
            } else if (platform === 'win32') {
                // Windows-specific error handling
                if (error.message && error.message.includes('PowerShell')) {
                    throw new Error(
                        'PowerShell execution failed. Please ensure PowerShell is available and execution policy allows script execution.'
                    );
                }
            }

            throw error;
        }
    });

    // ── Activity logger handlers ───────────────────────────────────────────

    /**
     * Start (or continue) a session for the given app.
     * Idempotent: calling with the same appName while it's already active
     * is a no-op inside ActivityLogger.
     */
    ipcMain.handle('activity:start-session', (_event, appName) => {
        try {
            activityLogger.startSession(appName);
            return { ok: true };
        } catch (err) {
            console.error('[IPC] activity:start-session error:', err);
            return { ok: false, error: err.message };
        }
    });

    /**
     * End the currently active session and persist it to disk.
     */
    ipcMain.handle('activity:end-session', () => {
        try {
            activityLogger.endSession();
            return { ok: true };
        } catch (err) {
            console.error('[IPC] activity:end-session error:', err);
            return { ok: false, error: err.message };
        }
    });

    /**
     * Return all persisted sessions for the requested date (YYYY-MM-DD).
     * Defaults to today if no date is provided.
     */
    ipcMain.handle('activity:get-sessions', (_event, date) => {
        try {
            const sessions = activityLogger.getSessions(date);
            return { ok: true, sessions };
        } catch (err) {
            console.error('[IPC] activity:get-sessions error:', err);
            return { ok: false, error: err.message, sessions: [] };
        }
    });

    console.log('Window tracker IPC handlers registered');
    console.log('Activity logger IPC handlers registered');
}

module.exports = {
    registerWindowTrackerHandlers,
};
