const { ipcMain } = require('electron');
const WindowTracker = require('../utils/windowTracker');

// Initialize window tracker
const windowTracker = new WindowTracker();
let isLoaded = true; // PowerShell-based tracker is always available

console.log(
    'Window tracker module initialized successfully (PowerShell-based)'
);

/**
 * Register IPC handlers for window tracking
 */
function registerWindowTrackerHandlers() {
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

    console.log('Window tracker IPC handlers registered');
}

module.exports = {
    registerWindowTrackerHandlers,
};
