/**
 * Keyboard Shortcuts
 * Global keyboard shortcuts for quick access to app functions
 */

// Available shortcuts
const SHORTCUTS = {
    TOGGLE_TIMER: ' ', // Space bar
    RESET: 'r', // R key
    SWITCH_TAB: 't', // T key
};

// Keyboard event listener
document.addEventListener('keydown', (event) => {
    // Ignore shortcuts if user is typing in an input field
    if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA'
    ) {
        return;
    }

    const key = event.key.toLowerCase();

    switch (key) {
        case SHORTCUTS.TOGGLE_TIMER:
            event.preventDefault();
            toggleTimer();
            break;

        case SHORTCUTS.RESET:
            event.preventDefault();
            resetTimer();
            break;

        case SHORTCUTS.SWITCH_TAB:
            event.preventDefault();
            switchTab();
            break;
    }
});

/**
 * Toggle timer start/stop
 */
function toggleTimer() {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');

    // If start button is enabled, click it (start tracking)
    // If start button is disabled, timer is running, so click stop
    if (startBtn && !startBtn.disabled) {
        startBtn.click();
    } else if (stopBtn && !stopBtn.disabled) {
        stopBtn.click();
    }
}

/**
 * Reset timer
 */
function resetTimer() {
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.click();
    }
}

/**
 * Switch between Dashboard and Analytics tabs
 */
function switchTab() {
    // Get all tab buttons
    const allTabs = document.querySelectorAll('.tablinks');

    // Find which tab is currently active
    let activeIndex = -1;
    allTabs.forEach((tab, index) => {
        if (tab.classList.contains('active')) {
            activeIndex = index;
        }
    });

    // Switch to the other tab
    const nextIndex = (activeIndex + 1) % allTabs.length;
    if (allTabs[nextIndex]) {
        allTabs[nextIndex].click();
    }
}

/**
 * Display keyboard shortcuts help
 */
function showShortcutsHelp() {
    console.log('Keyboard Shortcuts:');
    console.log('  Space - Start/Stop timer');
    console.log('  R - Reset timer');
    console.log('  T - Switch tabs');
}

// Log shortcuts on load
console.log('⌨️  Keyboard shortcuts enabled');
console.log('   Space: Start/Stop | R: Reset | T: Switch tab');
