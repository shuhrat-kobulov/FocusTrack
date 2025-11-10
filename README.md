# FocusTrack

> A minimalist time tracking application that monitors your application usage and helps you understand where your time goes.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-27.0.0-47848F?logo=electron)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/Platform-macOS-blue)](https://www.apple.com/macos/)

## 📖 About

FocusTrack is a desktop application built with Electron that automatically tracks which applications you use throughout your day. It provides detailed insights into your productivity patterns through an intuitive dashboard and beautiful data visualizations.

**Academic Context:** This project was developed as a minor project for NTCC (University), demonstrating practical application of modern web technologies in desktop application development.

## ✨ Features

### Core Functionality

-   **Automatic Tracking**: Monitors active applications in real-time
-   **Time Analytics**: Detailed breakdown of time spent on each application
-   **Visual Dashboard**: Beautiful pie chart visualizations of your usage patterns
-   **Session Management**: Start, stop, and reset tracking sessions easily

### User Experience

-   **🌙 Dark Mode**: Easy-on-the-eyes dark theme with smooth transitions
-   **⌨️ Keyboard Shortcuts**: Quick access to all major functions
    -   `Space`: Start/Stop tracking
    -   `R`: Reset timer
    -   `T`: Switch between Dashboard and Analytics tabs
-   **🎨 App Icons**: Visual identification with colorful fallback icons
-   **📊 Live Updates**: Real-time display of active window information

### Design

-   **Minimalist Interface**: Clean, distraction-free design
-   **Responsive Layout**: Adapts to different window sizes
-   **Smooth Animations**: Polished transitions and interactions

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   macOS (for window tracking functionality)

### Installation

1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/focustrack.git
cd focustrack
```

2. Install dependencies

```bash
npm install
```

3. Grant Screen Recording Permission

-   Open **System Settings** → **Privacy & Security** → **Screen Recording**
-   Add and enable Electron (or the app) to allow window tracking

### Running the Application

```bash
npm start
```

### Building for Distribution

Create distributable installers:

```bash
# macOS (DMG + ZIP for Intel and Apple Silicon)
npm run build:mac

# Windows (requires Windows machine or CI/CD)
npm run build:win

# Linux (AppImage + DEB)
npm run build:linux
```

Built files will be in the `dist/` folder.

## 🛠️ Technology Stack

### Core Technologies

-   **Electron 27.0.0**: Cross-platform desktop application framework
-   **Node.js**: JavaScript runtime
-   **get-windows**: Native module for active window detection (macOS)

### Frontend

-   **HTML5/CSS3**: Semantic markup and modern styling
-   **Vanilla JavaScript**: No framework dependencies for lightweight performance
-   **D3.js v4**: Data visualization for pie charts
-   **Bootstrap**: CSS framework (minimal usage)

### Build Tools

-   **electron-builder**: Application packaging and distribution
-   **npm scripts**: Development and build automation

## 📁 Project Structure

```
FocusTrack/
├── src/
│   ├── main/
│   │   ├── index.js              # Main Electron process
│   │   ├── createMainWindow.js   # Window configuration
│   │   └── ipc/
│   │       └── windowTracker.js  # IPC handlers for window tracking
│   └── renderer/
│       ├── index.html            # Main UI
│       ├── css/
│       │   └── style.css         # Styles with theming support
│       └── js/
│           ├── ui/               # UI-related modules
│           │   ├── tabs.js       # Tab switching
│           │   ├── theme-toggle.js    # Dark mode
│           │   ├── keyboard-shortcuts.js
│           │   └── app-icons.js  # Icon generation
│           ├── tracker/          # Tracking modules
│           │   ├── script.js     # Main tracking logic
│           │   └── timer.js      # Timer utilities
│           └── charts/
│               └── piechart.js   # D3.js visualizations
├── build/                        # Build resources (icons)
├── dist/                         # Distribution files (generated)
├── package.json                  # Project dependencies
├── BUILD.md                      # Detailed build instructions
├── DISTRIBUTION.md               # Distribution guide
└── FEATURES.md                   # Feature documentation
```

## 🎯 Key Features Explained

### Automatic Window Tracking

Uses the `get-windows` native module to detect the currently active application every 2 seconds. Tracks:

-   Application name
-   Window title
-   Active time duration
-   Number of times opened

### Data Visualization

-   Interactive pie chart using D3.js
-   Color-coded by application
-   Legend with percentages
-   Real-time updates

### Theme System

-   CSS variables for easy theming
-   Light and dark color schemes
-   Persists preference to localStorage
-   Smooth transitions between themes

### Keyboard Shortcuts

-   Global event listeners with smart context detection
-   Prevents conflicts with text input fields
-   Visual hints displayed in the UI

## 🔒 Privacy & Permissions

FocusTrack requires **Screen Recording** permission on macOS to detect active windows. This is a system-level security feature.

**Data Privacy:**

-   All data stays on your local machine
-   No cloud sync or external servers
-   No analytics or tracking
-   No internet connection required

## 📊 Academic Project Details

### Course Information

-   **Institution**: NTCC University
-   **Project Type**: Minor Project
-   **Focus Area**: Desktop Application Development with Web Technologies

### Learning Objectives Demonstrated

1. **Cross-platform Development**: Using Electron to build native desktop apps with web technologies
2. **Process Communication**: IPC (Inter-Process Communication) between main and renderer processes
3. **Native Modules**: Integration of Node.js native addons for system-level access
4. **Data Visualization**: Creating interactive charts with D3.js
5. **UI/UX Design**: Implementing modern design patterns and accessibility features
6. **State Management**: Handling application state and data persistence
7. **Security**: Understanding context isolation and secure IPC patterns

### Technical Challenges Solved

-   Native module integration and compatibility across architectures
-   Secure communication between Electron processes
-   Real-time data updates and visualization
-   Cross-platform build configuration
-   macOS permission handling

## 🐛 Known Limitations

-   **macOS Only**: Window tracking currently only works on macOS
-   **Windows Version**: Would require different native module (e.g., `active-win`)
-   **Code Signing**: Unsigned builds show security warnings on macOS
-   **Wine on Apple Silicon**: Cannot build Windows installers from M1/M2/M3 Macs

## 🔮 Future Enhancements

-   [ ] Windows and Linux support with platform-specific window trackers
-   [ ] Export data to CSV/JSON
-   [ ] Custom time range filtering
-   [ ] Productivity goals and alerts
-   [ ] Application categorization (Work, Entertainment, etc.)
-   [ ] Weekly/monthly reports
-   [ ] Menu bar mode for minimal UI
-   [ ] Auto-start on system boot
-   [ ] Idle time detection

## 🤝 Contributing

This is an academic project, but contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Shuhrat Kobulov**

-   GitHub: [@shuhrat-kobulov](https://github.com/shuhrat-kobulov)
-   University: NTCC

## 🙏 Acknowledgments

-   Electron team for the excellent framework
-   D3.js community for visualization tools
-   `get-windows` package maintainers
-   Bootstrap for CSS utilities
-   NTCC University for project support

## 📚 Documentation

-   [Build Instructions](BUILD.md) - Detailed guide for building installers
-   [Distribution Guide](DISTRIBUTION.md) - Quick start for sharing the app
-   [Features Documentation](FEATURES.md) - Complete feature list and usage

## 📧 Support

For issues or questions related to this project:

-   Open an issue on GitHub
-   Contact: [your-email@university.edu]

---

**Note**: This application requires macOS Screen Recording permission. First-time users should grant this permission in System Settings for full functionality.

Made with ❤️ for NTCC University Minor Project
