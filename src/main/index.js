const { app } = require('electron');
const { createMainWindow } = require('./createMainWindow');
const { registerWindowTrackerHandlers } = require('./ipc/windowTracker');

// Keep a global reference of the window object
let mainWindow;

/**
 * Initialize the application
 */
function initialize() {
    // Register all IPC handlers
    registerWindowTrackerHandlers();

    // Create window when app is ready
    app.on('ready', () => {
        mainWindow = createMainWindow();

        mainWindow.on('closed', () => {
            mainWindow = null;
        });
    });

    // Quit when all windows are closed
    app.on('window-all-closed', () => {
        // On macOS it is common for applications to stay active until Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', () => {
        // On macOS re-create a window when dock icon is clicked
        if (mainWindow === null) {
            mainWindow = createMainWindow();
        }
    });
}

// Start the application
initialize();
