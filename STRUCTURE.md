# FocusTrack - Project Structure

## 📁 New Folder Structure

```
FocusTrack/
├── src/
│   ├── main/                      # Main process (Electron backend)
│   │   ├── index.js              # Main entry point
│   │   ├── createMainWindow.js   # Window creation logic
│   │   └── ipc/                  # IPC handlers
│   │       └── windowTracker.js  # Window tracking IPC
│   └── renderer/                  # Renderer process (Frontend)
│       ├── index.html            # Main HTML
│       ├── preload.js            # Secure IPC bridge
│       ├── css/                  # Stylesheets
│       │   ├── bootstrap.min.css
│       │   └── style.css
│       └── js/                   # JavaScript modules
│           ├── tracker/          # Tracking logic
│           │   ├── script.js     # Main tracking
│           │   └── timer.js      # Timer utilities
│           ├── ui/               # UI components
│           │   └── tabs.js       # Tab navigation
│           └── charts/           # Data visualization
│               └── piechart.js   # D3 pie charts
├── assets/                        # Application assets
│   └── icons/                    # App icons (to be added)
├── build/                        # Build configuration (future)
├── node_modules/                 # Dependencies
├── .gitignore                    # Git ignore rules
├── package.json                  # Project config
├── package-lock.json             # Lock file
└── README.md                     # Documentation
```

## ✅ What Changed

### Security Improvements

-   ✅ **Context Isolation** - Renderer process isolated from Node.js
-   ✅ **Preload Script** - Secure bridge using `contextBridge`
-   ✅ **No nodeIntegration** - Renderer can't access Node.js directly

### Code Organization

-   ✅ **Separated Concerns** - Main and renderer processes clearly separated
-   ✅ **Modular Structure** - Related code grouped together
-   ✅ **IPC Handlers** - Organized in dedicated modules
-   ✅ **Feature-based folders** - tracker/, ui/, charts/

### Best Practices

-   ✅ **Single Responsibility** - Each module has one purpose
-   ✅ **Easy to Extend** - Add features without cluttering
-   ✅ **Professional Structure** - Industry-standard layout
-   ✅ **Development Mode** - Run with `npm run dev` to open DevTools

## 🚀 How to Run

```bash
# Normal mode
npm start

# Development mode (with DevTools)
npm run dev
```

## 📝 Old Files

The following old files can be safely deleted:

-   `main.js` (moved to `src/main/index.js`)
-   `html/` folder (moved to `src/renderer/`)
-   `css/` folder (moved to `src/renderer/css/`)
-   `js/` folder (moved to `src/renderer/js/`)

## 🔮 Future Enhancements

Ready to add:

-   App icons in `assets/icons/`
-   Build configuration in `build/`
-   Tests in `tests/`
-   Shared utilities in `src/shared/`
-   Multiple windows support
-   Settings/preferences
-   Data persistence
