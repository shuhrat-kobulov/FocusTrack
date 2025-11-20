const { ipcMain } = require('electron');

// Import get-windows dynamically (ES module)
let getActiveWindow;
let isLoaded = false;

(async () => {
    try {
        const module = await import('get-windows');
        getActiveWindow = module.activeWindow;
        isLoaded = true;
        console.log('Window tracker module loaded successfully');
    } catch (error) {
        console.error('Failed to load get-windows:', error);
    }
})();

/**
 * Register IPC handlers for window tracking
 */
function registerWindowTrackerHandlers() {
    // Handle IPC call from renderer to get active window
    ipcMain.handle('get-active-window', async () => {
        if (!isLoaded || !getActiveWindow) {
            throw new Error(
                'Window tracker not loaded yet. Please wait a moment and try again.'
            );
        }

        try {
            const result = await getActiveWindow();
            return result;
        } catch (error) {
            console.error('Error getting active window:', error);

            // Platform-specific error handling
            const platform = process.platform;

            if (platform === 'darwin') {
                // macOS-specific permission errors
                if (
                    error.message &&
                    error.message.includes('screen recording')
                ) {
                    throw new Error(
                        'Screen Recording permission required. Please grant permission in System Settings › Privacy & Security › Screen Recording'
                    );
                }

                if (error.stdout && error.stdout.includes('screen recording')) {
                    throw new Error(
                        'Screen Recording permission required. Please enable it in:\nSystem Settings › Privacy & Security › Screen Recording'
                    );
                }
            } else if (platform === 'win32') {
                // Windows-specific error handling
                if (error.message && error.message.includes('access')) {
                    throw new Error(
                        'Windows access permissions required. Please run the application as administrator if issues persist.'
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
