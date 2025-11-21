// DOM Elements
const navbarToggle = document.getElementById('navbarToggle');
const navbarMenu = document.getElementById('navbarMenu');
const backToTop = document.getElementById('backToTop');
const modal = document.getElementById('downloadModal');
const modalClose = document.getElementById('modalClose');
const faqQuestions = document.querySelectorAll('.faq-question');

// Navigation Toggle
navbarToggle?.addEventListener('click', () => {
    navbarToggle.classList.toggle('active');
    navbarMenu.classList.toggle('active');
    document.body.classList.toggle('nav-open');
});

// Close navigation when clicking on a link
document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
        navbarToggle.classList.remove('active');
        navbarMenu.classList.remove('active');
        document.body.classList.remove('nav-open');
    });
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }
    });
});

// Back to Top Button
function toggleBackToTop() {
    if (window.scrollY > 300) {
        backToTop?.classList.add('visible');
    } else {
        backToTop?.classList.remove('visible');
    }
}

window.addEventListener('scroll', toggleBackToTop);

backToTop?.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });
});

// Header scroll effect
function handleHeaderScroll() {
    const header = document.querySelector('.header');
    if (window.scrollY > 50) {
        header?.classList.add('scrolled');
    } else {
        header?.classList.remove('scrolled');
    }
}

window.addEventListener('scroll', handleHeaderScroll);

// Download functionality
const downloadLinks = {
    windows: {
        url: 'https://github.com/shuhrat-kobulov/FocusTrack/releases/download/v1.0.0/FocusTrack.Setup.1.0.0.exe',
        filename: 'FocusTrack-Setup-1.0.0.exe',
        size: '~140 MB',
        fallbackUrl: '../dist/FocusTrack Setup 1.0.0.exe', // Local fallback
    },
    mac: {
        url: 'https://github.com/shuhrat-kobulov/FocusTrack/releases/download/v1.0.0/FocusTrack-1.0.0.dmg',
        filename: 'FocusTrack-1.0.0.dmg',
        size: '~45 MB',
        fallbackUrl: '../dist/FocusTrack-1.0.0.dmg',
    },
    linux: {
        url: 'https://github.com/shuhrat-kobulov/FocusTrack/releases/download/v1.0.0npm /FocusTrack-1.0.0.AppImage',
        filename: 'FocusTrack-1.0.0.AppImage',
        size: '~48 MB',
        fallbackUrl: '../dist/FocusTrack-1.0.0.AppImage',
    },
};

// Handle download button clicks
function handleDownload(platform) {
    const downloadInfo = downloadLinks[platform];

    if (!downloadInfo) {
        console.error('Download info not found for platform:', platform);
        showErrorMessage('Download not available for this platform.');
        return;
    }

    // Update modal content
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const downloadLink = document.getElementById('downloadLink');

    if (fileName) fileName.textContent = downloadInfo.filename;
    if (fileSize) fileSize.textContent = downloadInfo.size;
    if (downloadLink) downloadLink.href = downloadInfo.url;

    // Show modal
    showModal();

    // Try to download from primary URL, fallback to local if needed
    downloadFile(
        downloadInfo.url,
        downloadInfo.fallbackUrl,
        downloadInfo.filename
    );

    // Track download
    trackDownload(platform);
}

// Enhanced download function with error handling
function downloadFile(primaryUrl, fallbackUrl, filename) {
    // First, try to check if the primary URL is accessible
    fetch(primaryUrl, { method: 'HEAD' })
        .then((response) => {
            if (response.ok) {
                // Primary URL is accessible, start download
                initiateDownload(primaryUrl, filename);
            } else {
                // Try fallback URL
                console.warn(
                    'Primary download URL not accessible, trying fallback...'
                );
                initiateDownload(fallbackUrl, filename);
            }
        })
        .catch((error) => {
            console.warn(
                'Error checking primary URL, trying fallback...',
                error
            );
            initiateDownload(fallbackUrl, filename);
        });
}

// Function to actually start the download
function initiateDownload(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';

    // Add the link to the DOM temporarily
    document.body.appendChild(link);

    // Trigger the download
    link.click();

    // Clean up
    document.body.removeChild(link);

    // Update modal with success message
    updateModalWithSuccess();
}

// Function to update modal with success message
function updateModalWithSuccess() {
    setTimeout(() => {
        const modalTitle = document.querySelector('.modal-title');
        const modalDescription = document.querySelector('.modal-description');

        if (modalTitle) modalTitle.textContent = 'Download Started!';
        if (modalDescription) {
            modalDescription.innerHTML = `
                <i class="fas fa-check-circle" style="color: #27ca3f; margin-right: 8px;"></i>
                Your download should start automatically. Check your Downloads folder.
            `;
        }
    }, 500);
}

// Function to show error message
function showErrorMessage(message) {
    const modal = document.getElementById('downloadModal');
    const modalContent = modal?.querySelector('.modal-content');

    if (modalContent) {
        modalContent.innerHTML = `
            <button class="modal-close" onclick="hideModal()">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-header">
                <i class="fas fa-exclamation-triangle modal-icon" style="color: #ff6b6b;"></i>
                <h3 class="modal-title">Download Error</h3>
            </div>
            <div class="modal-body">
                <p class="modal-description">${message}</p>
                <div style="text-align: center; margin-top: 20px;">
                    <a href="https://github.com/shuhrat-kobulov/FocusTrack/releases" 
                       target="_blank" 
                       class="btn btn-primary">
                        <i class="fab fa-github"></i>
                        View All Releases
                    </a>
                </div>
            </div>
        `;
    }
    showModal();
}

// Modal functionality
function showModal() {
    modal?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideModal() {
    modal?.classList.remove('active');
    document.body.style.overflow = '';
}

modalClose?.addEventListener('click', hideModal);

// Close modal when clicking outside
modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
        hideModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
        hideModal();
    }
});

// FAQ Accordion
faqQuestions.forEach((question) => {
    question.addEventListener('click', () => {
        const answer = question.nextElementSibling;
        const isExpanded = question.getAttribute('aria-expanded') === 'true';

        // Close all other FAQs
        faqQuestions.forEach((otherQuestion) => {
            if (otherQuestion !== question) {
                otherQuestion.setAttribute('aria-expanded', 'false');
                otherQuestion.nextElementSibling.classList.remove('active');
            }
        });

        // Toggle current FAQ
        question.setAttribute('aria-expanded', !isExpanded);
        answer.classList.toggle('active');
    });
});

// Detect user's platform and highlight appropriate download button
function detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    let platform = 'windows'; // default

    if (userAgent.includes('mac')) {
        platform = 'mac';
    } else if (userAgent.includes('linux')) {
        platform = 'linux';
    }

    // Highlight the detected platform's download card
    const detectedCard = document
        .querySelector(`[data-platform="${platform}"]`)
        ?.closest('.download-card');
    if (detectedCard && !detectedCard.classList.contains('featured')) {
        detectedCard.style.border = '2px solid #667eea';
        detectedCard.style.boxShadow = '0 5px 20px rgba(102, 126, 234, 0.2)';

        // Add a small indicator
        const indicator = document.createElement('div');
        indicator.className = 'platform-indicator';
        indicator.innerHTML = '<i class="fas fa-desktop"></i> Your Platform';
        indicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: #667eea;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 600;
        `;
        detectedCard.style.position = 'relative';
        detectedCard.appendChild(indicator);
    }

    return platform;
}

// Initialize platform detection
document.addEventListener('DOMContentLoaded', () => {
    const detectedPlatform = detectPlatform();
    console.log('Detected platform:', detectedPlatform);
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll(
        '.feature-card, .screenshot-item, .download-card'
    );
    animatedElements.forEach((el) => observer.observe(el));
});

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    .feature-card, .screenshot-item, .download-card {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }
    
    .animate-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    .header.scrolled {
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
    }
    
    .platform-indicator {
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
`;
document.head.appendChild(style);

// Analytics function (placeholder)
function trackDownload(platform) {
    // This is where you would implement analytics tracking
    console.log(`Download started for ${platform}`);

    // Example: Google Analytics event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'download', {
            event_category: 'engagement',
            event_label: platform,
            value: 1,
        });
    }

    // Example: Custom analytics
    if (typeof analytics !== 'undefined') {
        analytics.track('Download Started', {
            platform: platform,
            version: '1.0.0',
            timestamp: new Date().toISOString(),
        });
    }
}

// Error handling for missing elements
function handleMissingElements() {
    const requiredElements = {
        navbarToggle: navbarToggle,
        navbarMenu: navbarMenu,
        backToTop: backToTop,
        modal: modal,
        modalClose: modalClose,
    };

    Object.entries(requiredElements).forEach(([name, element]) => {
        if (!element) {
            console.warn(`Element ${name} not found`);
        }
    });
}

// Form validation for newsletter signup (if implemented)
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Newsletter subscription (placeholder)
function subscribeToNewsletter(email) {
    if (!validateEmail(email)) {
        alert('Please enter a valid email address.');
        return false;
    }

    // This is where you would implement newsletter subscription
    console.log('Newsletter subscription for:', email);

    // Show success message
    const successMessage = document.createElement('div');
    successMessage.textContent =
        "Thank you for subscribing! You'll receive updates about FocusTrack.";
    successMessage.style.cssText = `
        background: #4CAF50;
        color: white;
        padding: 1rem;
        border-radius: 4px;
        margin-top: 1rem;
        text-align: center;
    `;

    return true;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: Focus search (if implemented)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Focus search input if available
    }

    // Alt + D: Go to download section
    if (e.altKey && e.key === 'd') {
        e.preventDefault();
        document
            .getElementById('download')
            ?.scrollIntoView({ behavior: 'smooth' });
    }

    // Alt + F: Go to features section
    if (e.altKey && e.key === 'f') {
        e.preventDefault();
        document
            .getElementById('features')
            ?.scrollIntoView({ behavior: 'smooth' });
    }
});

// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
    // Close any open modals or menus
    hideModal();
    navbarToggle?.classList.remove('active');
    navbarMenu?.classList.remove('active');
    document.body.classList.remove('nav-open');
});

// Performance monitoring
function logPerformance() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.timing;
                const loadTime =
                    perfData.loadEventEnd - perfData.navigationStart;
                console.log(`Page load time: ${loadTime}ms`);

                // Track performance metrics (if analytics is implemented)
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'timing_complete', {
                        name: 'load',
                        value: loadTime,
                    });
                }
            }, 0);
        });
    }
}

// Initialize performance monitoring
logPerformance();

// Handle missing elements gracefully
handleMissingElements();

// Service Worker registration (if you want offline support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export functions for testing (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleDownload,
        validateEmail,
        detectPlatform,
        trackDownload,
    };
}
