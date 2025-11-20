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
});

console.log('Preload script loaded - electronAPI exposed');
