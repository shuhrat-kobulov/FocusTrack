/**
 * Dark Mode Theme Toggle
 * Handles switching between light and dark themes
 */

const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const htmlElement = document.documentElement;

// Load saved theme preference or default to light
const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);

// Toggle button click handler
themeToggle.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
});

/**
 * Apply theme to document and update icon
 * @param {string} theme - 'light' or 'dark'
 */
function applyTheme(theme) {
    if (theme === 'dark') {
        htmlElement.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
        themeToggle.setAttribute('aria-label', 'Switch to light mode');
    } else {
        htmlElement.removeAttribute('data-theme');
        themeIcon.textContent = '🌙';
        themeToggle.setAttribute('aria-label', 'Switch to dark mode');
    }
}
