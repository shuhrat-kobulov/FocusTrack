let getActiveWindow;
let activeWinLoaded = false;

/**
 * Extract application name from owner object (cross-platform)
 * @param {Object} owner - Window owner object with path and name
 * @returns {string} - Clean application name
 */
function extractAppName(owner) {
    // Use the name property if available (preferred)
    if (owner.name) {
        return owner.name.replace(/\s+/g, ''); // Remove spaces for consistency
    }

    // Fallback: extract from path
    const path = owner.path;
    if (!path) return 'Unknown';

    // Get filename without extension
    const filename = path.split(/[/\\]/).pop(); // Handle both / and \ separators
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, ''); // Remove extension

    return nameWithoutExt;
}

// Request active window from main process
async function getActiveWindowWrapper() {
    try {
        return await window.electronAPI.getActiveWindow();
    } catch (error) {
        console.error('Error:', error.message);
        if (
            error.message.includes('Screen Recording') ||
            error.message.includes('screen recording')
        ) {
            // macOS-specific permission error
            alert(
                '🔐 PERMISSION REQUIRED\n\n' +
                    error.message +
                    '\n\n📝 Steps to fix:\n1. Open System Settings\n2. Go to Privacy & Security › Screen Recording\n3. Find and enable this app (Electron)\n4. Restart the application\n\nThe app needs this permission to track active windows.'
            );
            throw new Error('Screen Recording permission required');
        } else if (error.message.includes('administrator')) {
            // Windows-specific permission error
            alert(
                '🔐 PERMISSION REQUIRED\n\n' +
                    error.message +
                    '\n\n📝 Steps to fix:\n1. Right-click on the application\n2. Select "Run as administrator"\n3. Restart the application\n\nThe app may need elevated permissions on Windows.'
            );
            throw new Error('Administrator permission may be required');
        }
        throw error;
    }
}

getActiveWindow = getActiveWindowWrapper;
getActiveWindow = getActiveWindowWrapper;
activeWinLoaded = true;

// Timer functions are now loaded from timer.js globally

let iter = 0,
    displayFuncID,
    addTimerID,
    mainTimerWatch,
    history = [],
    outputHTML = '';

const startBtn = document.getElementById('start-btn'),
    stopBtn = document.getElementById('stop-btn'),
    resetBtn = document.getElementById('reset-btn'),
    ulElem = document.getElementById('list');

stopBtn.disabled = true;
resetBtn.disabled = true;

startBtn.addEventListener('click', () => {
    if (!activeWinLoaded) {
        alert('Please wait, loading active window tracker...');
        return;
    }
    startBtn.disabled = true;
    stopBtn.disabled = false;
    resetBtn.disabled = false;
    if (ulElem.innerHTML === '') {
        displayActiveWin();
    } else {
        resume();
    }
});

function resume() {
    let call = async () => {
        let winDetails = await getActiveWindow();

        let appWinTitle = winDetails.title;
        let appName = extractAppName(winDetails.owner);

        if (!history.includes(appName)) {
            clearInterval(addTimerID);
            addTimerID = setInterval(() => addTimer(`${appName}`), 1000);
            history.push(appName);
        } else {
            clearInterval(addTimerID);
            addTimerID = setInterval(() => addTimer(`${appName}`), 1000);
            history.push(appName);
        }
    };
    displayFuncID = setInterval(call, 1000);
    setTimeout(() => {
        mainTimerWatch = setInterval(() => addTimer('main-timer'), 1000);
    }, 1000);
}

function funcClearInterval() {
    clearInterval(displayFuncID);
    clearInterval(mainTimerWatch);
    clearInterval(addTimerID);
}

stopBtn.addEventListener('click', () => {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    funcClearInterval();
});

resetBtn.addEventListener('click', () => {
    resetBtn.disabled = true;
    stopBtn.disabled = true;
    startBtn.disabled = false;
    funcClearInterval();
    clearTimer('main-timer');
    ulElem.innerHTML = '';
    iter = 0;
    history = [];
});

function displayActiveWin() {
    let call = async () => {
        let winDetails = await getActiveWindow();

        let appWinTitle = winDetails.title;
        let appName = extractAppName(winDetails.owner);
        let appPath = winDetails.owner.path;

        if (iter === 0) {
            mainTimerWatch = setInterval(() => addTimer('main-timer'), 1000);

            // Create list items with icons
            const icon = window.appIconUtils.createAppIcon(appName, appPath);
            const iconHTML = icon.outerHTML;

            outputHTML = `<li class="list-group-item list-group-item-info" data-app="${appName}">
                    ${iconHTML}
                    <div class="app-info">
                        <div><strong>Window Title:</strong> ${appWinTitle}</div>
                        <div><strong>Application:</strong> ${appName}</div>
                        <div><strong>Time:</strong> <span id="${appName}">00:00:00</span></div>
                        <h6>Times Opened <span id="span-${appName}" class="badge">${1}</span></h6>
                    </div>
                    </li>
                    <br>`;

            ulElem.innerHTML = outputHTML;

            addTimerID = setInterval(() => addTimer(`${appName}`), 1000);
            history.push(appName);
        } else if (!history.includes(appName)) {
            clearInterval(addTimerID);

            const icon = window.appIconUtils.createAppIcon(appName, appPath);
            const iconHTML = icon.outerHTML;

            outputHTML = `<li class="list-group-item list-group-item-info" data-app="${appName}">
                    ${iconHTML}
                    <div class="app-info">
                        <div><strong>Window Title:</strong> ${appWinTitle}</div>
                        <div><strong>Application:</strong> ${appName}</div>
                        <div><strong>Time:</strong> <span id="${appName}">00:00:00</span></div>
                        <h6>Times Opened <span id="span-${appName}" class="badge">${1}</span></h6>
                    </div>
                    </li>
                    <br>`;

            ulElem.innerHTML += outputHTML;
            addTimerID = setInterval(() => addTimer(`${appName}`), 1000);
            history.push(appName);
        } else if (
            history.includes(appName) &&
            appName != history[history.length - 1]
        ) {
            clearInterval(addTimerID);
            addTimerID = setInterval(() => addTimer(`${appName}`), 1000);
            history.push(appName);
            let badge = document.getElementById(`span-${appName}`);
            let badgeNum = Number(badge.innerHTML);
            badge.innerHTML = badgeNum + 1;
        }
        iter++;
    };

    displayFuncID = setInterval(call, 2000);
}
