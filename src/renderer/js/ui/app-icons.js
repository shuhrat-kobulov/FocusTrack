/**
 * App Icon Utilities
 * Handles extracting and displaying application icons across platforms
 */

/**
 * Extract app icon from app path (cross-platform)
 * @param {string} appPath - Full path to the application
 * @returns {string} - Path to icon or null for fallback
 */
function getAppIconPath(appPath) {
    if (!appPath) return null;

    // Platform detection
    const isWindows = appPath.includes('\\') || appPath.match(/^[A-Z]:/);
    const isMacOS = appPath.includes('.app/');

    if (isMacOS) {
        // macOS: AppName.app/Contents/Resources/AppIcon.icns
        // For future enhancement with nativeImage
        return null;
    }

    if (isWindows) {
        // Windows: Extract icon from .exe (future enhancement)
        // For now, use fallback
        return null;
    }

    // Linux and others: use fallback
    return null;
}

/**
 * Get fallback icon (first letter badge) for an app
 * @param {string} appName - Application name
 * @returns {HTMLElement} - Icon element
 */
function createFallbackIcon(appName) {
    const iconEl = document.createElement('div');
    iconEl.className = 'app-icon';

    // Get first letter, uppercase
    const letter = appName.charAt(0).toUpperCase();
    iconEl.textContent = letter;

    // Generate a consistent color based on app name
    iconEl.style.backgroundColor = getColorForApp(appName);

    return iconEl;
}

/**
 * Generate a consistent color for an app name (for fallback icons)
 * @param {string} appName - Application name
 * @returns {string} - HSL color string
 */
function getColorForApp(appName) {
    // Simple hash function to get a number from string
    let hash = 0;
    for (let i = 0; i < appName.length; i++) {
        hash = appName.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert to hue value (0-360)
    const hue = Math.abs(hash % 360);

    // Return HSL color with medium saturation and lightness
    return `hsl(${hue}, 60%, 55%)`;
}

/**
 * Create app icon element (either actual icon or fallback)
 * @param {string} appName - Application name
 * @param {string} appPath - Full path to app bundle
 * @returns {HTMLElement} - Icon element
 */
function createAppIcon(appName, appPath) {
    // For now, always use fallback
    // Future: Try to load actual icon first
    return createFallbackIcon(appName);
}

/**
 * Add icon to list item
 * @param {HTMLElement} listItem - List item element
 * @param {string} appName - Application name
 * @param {string} appPath - Full path to app bundle
 */
function addIconToListItem(listItem, appName, appPath) {
    const icon = createAppIcon(appName, appPath);

    // Insert icon at the beginning of list item
    if (listItem.firstChild) {
        listItem.insertBefore(icon, listItem.firstChild);
    } else {
        listItem.appendChild(icon);
    }
}

// Export for use in other modules
window.appIconUtils = {
    createAppIcon,
    addIconToListItem,
    createFallbackIcon,
    getColorForApp,
};
