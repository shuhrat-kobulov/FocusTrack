const { spawn } = require('child_process');
const path = require('path');

/**
 * Cross-platform window tracker utility
 * Uses PowerShell for Windows, which doesn't require native modules
 */
class WindowTracker {
    constructor() {
        this.platform = process.platform;
    }

    /**
     * Get active window information
     * @returns {Promise<Object>} Active window details
     */
    async getActiveWindow() {
        try {
            switch (this.platform) {
                case 'win32':
                    return await this.getActiveWindowWindows();
                case 'darwin':
                    return await this.getActiveWindowMacOS();
                case 'linux':
                    return await this.getActiveWindowLinux();
                default:
                    throw new Error(`Unsupported platform: ${this.platform}`);
            }
        } catch (error) {
            console.error('Error getting active window:', error);

            // If PowerShell method fails on Windows, try fallback
            if (this.platform === 'win32') {
                try {
                    return await this.getActiveWindowWindowsFallback();
                } catch (fallbackError) {
                    console.error(
                        'Fallback method also failed:',
                        fallbackError
                    );
                    // Return a default window info instead of failing completely
                    return {
                        title: 'Unable to detect window',
                        owner: {
                            name: 'Unknown',
                            path: '',
                        },
                    };
                }
            }

            throw error;
        }
    }

    /**
     * Fallback method for Windows using simpler PowerShell command
     */
    async getActiveWindowWindowsFallback() {
        const script = `
            try {
                $proc = Get-Process | Where-Object {$_.MainWindowTitle -ne ""} | Where-Object {$_.ProcessName -ne "dwm"} | Select-Object -First 1
                if ($proc) {
                    Write-Output "TITLE:$($proc.MainWindowTitle)"
                    Write-Output "PROCESS:$($proc.ProcessName)"
                    Write-Output "PATH:$($proc.Path)"
                } else {
                    Write-Output "TITLE:Desktop"
                    Write-Output "PROCESS:explorer"
                    Write-Output "PATH:"
                }
                Write-Output "SUCCESS"
            } catch {
                Write-Output "ERROR:$($_.Exception.Message)"
            }
        `;

        return new Promise((resolve, reject) => {
            const powershell = spawn('powershell.exe', [
                '-NoProfile',
                '-ExecutionPolicy',
                'Bypass',
                '-Command',
                script,
            ]);

            let stdout = '';
            let stderr = '';

            powershell.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            powershell.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            powershell.on('close', (code) => {
                try {
                    const output = stdout.trim();

                    if (output.includes('ERROR:')) {
                        const errorMsg =
                            output.split('ERROR:')[1] ||
                            'Unknown PowerShell error';
                        reject(
                            new Error(`PowerShell fallback error: ${errorMsg}`)
                        );
                        return;
                    }

                    // Parse simple text output
                    const lines = output
                        .split('\n')
                        .map((line) => line.trim())
                        .filter((line) => line);
                    let title = 'Unknown';
                    let processName = 'Unknown';
                    let processPath = '';

                    lines.forEach((line) => {
                        if (line.startsWith('TITLE:')) {
                            title = line.substring(6) || 'Unknown';
                        } else if (line.startsWith('PROCESS:')) {
                            processName = line.substring(8) || 'Unknown';
                        } else if (line.startsWith('PATH:')) {
                            processPath = line.substring(5) || '';
                        }
                    });

                    const result = {
                        title: title,
                        owner: {
                            name: processName,
                            path: processPath,
                        },
                    };

                    resolve(result);
                } catch (parseError) {
                    reject(
                        new Error(
                            'Failed to parse fallback PowerShell output: ' +
                                parseError.message
                        )
                    );
                }
            });

            powershell.on('error', (error) => {
                reject(
                    new Error(
                        `Failed to execute fallback PowerShell: ${error.message}`
                    )
                );
            });
        });
    }

    /**
     * Get active window on Windows using PowerShell
     */
    async getActiveWindowWindows() {
        const script = `
            try {
                Add-Type @"
                    using System;
                    using System.Runtime.InteropServices;
                    using System.Text;
                    public class Win32 {
                        [DllImport("user32.dll")]
                        public static extern IntPtr GetForegroundWindow();
                        
                        [DllImport("user32.dll")]
                        public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
                        
                        [DllImport("user32.dll", SetLastError = true)]
                        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
                    }
"@

                $hwnd = [Win32]::GetForegroundWindow()
                $title = New-Object System.Text.StringBuilder 256
                [Win32]::GetWindowText($hwnd, $title, 256) | Out-Null
                
                $processId = 0
                [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
                
                $windowTitle = $title.ToString()
                if ([string]::IsNullOrEmpty($windowTitle)) {
                    $windowTitle = "Unknown Window"
                }
                
                $processName = "Unknown"
                $processPath = ""
                
                try {
                    $process = Get-Process -Id $processId -ErrorAction Stop
                    $processName = $process.ProcessName
                    if ($process.MainModule -and $process.MainModule.FileName) {
                        $processPath = $process.MainModule.FileName
                    }
                } catch {
                    # Process might not be accessible, use fallback
                }
                
                # Output in simple format to avoid JSON parsing issues
                Write-Output "TITLE:$windowTitle"
                Write-Output "PROCESS:$processName"
                Write-Output "PATH:$processPath"
                Write-Output "SUCCESS"
                
            } catch {
                Write-Output "ERROR:$($_.Exception.Message)"
            }
        `;

        return new Promise((resolve, reject) => {
            const powershell = spawn('powershell.exe', [
                '-NoProfile',
                '-ExecutionPolicy',
                'Bypass',
                '-Command',
                script,
            ]);

            let stdout = '';
            let stderr = '';

            powershell.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            powershell.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            powershell.on('close', (code) => {
                try {
                    const output = stdout.trim();

                    if (output.includes('ERROR:')) {
                        const errorMsg =
                            output.split('ERROR:')[1] ||
                            'Unknown PowerShell error';
                        reject(new Error(`PowerShell error: ${errorMsg}`));
                        return;
                    }

                    if (!output.includes('SUCCESS')) {
                        reject(
                            new Error(
                                'PowerShell script did not complete successfully'
                            )
                        );
                        return;
                    }

                    // Parse simple text output
                    const lines = output
                        .split('\n')
                        .map((line) => line.trim())
                        .filter((line) => line);
                    let title = 'Unknown';
                    let processName = 'Unknown';
                    let processPath = '';

                    lines.forEach((line) => {
                        if (line.startsWith('TITLE:')) {
                            title = line.substring(6) || 'Unknown';
                        } else if (line.startsWith('PROCESS:')) {
                            processName = line.substring(8) || 'Unknown';
                        } else if (line.startsWith('PATH:')) {
                            processPath = line.substring(5) || '';
                        }
                    });

                    const result = {
                        title: title,
                        owner: {
                            name: processName,
                            path: processPath,
                        },
                    };

                    console.log('Window tracking result:', result);
                    resolve(result);
                } catch (parseError) {
                    console.error('Failed to parse PowerShell output:', stdout);
                    console.error('Parse error:', parseError);
                    reject(
                        new Error(
                            'Failed to parse window information: ' +
                                parseError.message
                        )
                    );
                }
            });

            powershell.on('error', (error) => {
                reject(
                    new Error(`Failed to execute PowerShell: ${error.message}`)
                );
            });
        });
    }

    /**
     * Get active window on macOS using osascript
     */
    async getActiveWindowMacOS() {
        const script = `
            tell application "System Events"
                set frontApp to name of first application process whose frontmost is true
                set appPath to POSIX path of (path to application frontApp)
            end tell
            
            tell application frontApp
                set windowName to name of front window
            end tell
            
            return "{\"title\":\"" & windowName & "\",\"owner\":{\"name\":\"" & frontApp & "\",\"path\":\"" & appPath & "\"}}"
        `;

        return new Promise((resolve, reject) => {
            const osascript = spawn('osascript', ['-e', script]);

            let stdout = '';
            let stderr = '';

            osascript.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            osascript.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            osascript.on('close', (code) => {
                if (code === 0 && stdout.trim()) {
                    try {
                        const result = JSON.parse(stdout.trim());
                        resolve(result);
                    } catch (parseError) {
                        resolve({
                            title: stdout.trim().replace(/"/g, ''),
                            owner: { name: 'Unknown', path: '' },
                        });
                    }
                } else {
                    reject(
                        new Error(
                            `AppleScript failed: ${
                                stderr ||
                                'Screen recording permission may be required'
                            }`
                        )
                    );
                }
            });
        });
    }

    /**
     * Get active window on Linux using xdotool
     */
    async getActiveWindowLinux() {
        return new Promise((resolve, reject) => {
            // Get window ID
            const getWindowId = spawn('xdotool', ['getactivewindow']);

            let windowId = '';

            getWindowId.stdout.on('data', (data) => {
                windowId += data.toString().trim();
            });

            getWindowId.on('close', (code) => {
                if (code === 0 && windowId) {
                    // Get window name
                    const getWindowName = spawn('xdotool', [
                        'getwindowname',
                        windowId,
                    ]);
                    let windowName = '';

                    getWindowName.stdout.on('data', (data) => {
                        windowName += data.toString().trim();
                    });

                    getWindowName.on('close', (nameCode) => {
                        if (nameCode === 0) {
                            // Get process info
                            const getProcess = spawn('xdotool', [
                                'getwindowpid',
                                windowId,
                            ]);
                            let pid = '';

                            getProcess.stdout.on('data', (data) => {
                                pid += data.toString().trim();
                            });

                            getProcess.on('close', (pidCode) => {
                                if (pidCode === 0 && pid) {
                                    const getProcessName = spawn('ps', [
                                        '-p',
                                        pid,
                                        '-o',
                                        'comm=',
                                    ]);
                                    let processName = '';

                                    getProcessName.stdout.on('data', (data) => {
                                        processName += data.toString().trim();
                                    });

                                    getProcessName.on('close', () => {
                                        resolve({
                                            title: windowName || 'Unknown',
                                            owner: {
                                                name: processName || 'Unknown',
                                                path: '',
                                            },
                                        });
                                    });
                                } else {
                                    resolve({
                                        title: windowName || 'Unknown',
                                        owner: { name: 'Unknown', path: '' },
                                    });
                                }
                            });
                        } else {
                            reject(new Error('Failed to get window name'));
                        }
                    });
                } else {
                    reject(
                        new Error(
                            'Failed to get active window ID. Make sure xdotool is installed.'
                        )
                    );
                }
            });
        });
    }
}

module.exports = WindowTracker;
