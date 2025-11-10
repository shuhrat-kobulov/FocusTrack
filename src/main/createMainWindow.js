const { BrowserWindow } = require('electron');
const path = require('path');

/**
 * Create the main application window
 * @returns {BrowserWindow}
 */
function createMainWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../renderer/preload.js'),
        },
        title: 'FocusTrack',
    });

    // Load the index.html of the app
    win.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Open the DevTools in development
    if (
        process.env.NODE_ENV === 'development' ||
        process.argv.includes('--dev')
    ) {
        win.webContents.openDevTools();
    }

    return win;
}

module.exports = {
    createMainWindow,
};
