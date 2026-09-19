const { app, BrowserWindow, ipcMain, Tray, Menu, powerSaveBlocker, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const log = require('electron-log');

// ─── EARLY LOGGING ─────────────────────────────────────────────────────────
// Fix for Program Files read-only: Explicitly set log path to AppData
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs/main.log');
log.transports.file.level = 'info';
log.info('--- Application Startup ---');
log.info('App Path:', app.getAppPath());
log.info('User Data Path:', app.getPath('userData'));
log.info('Resources Path:', process.resourcesPath);
log.info('Platform:', process.platform);

process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
});

const isDev = !app.isPackaged;
const { setupAutoUpdater } = require('./updater');

let serverProcess = null;
let Store;

function startBackendServer() {
    const serverDir = isDev
        ? path.join(__dirname, '../server')
        : path.join(process.resourcesPath, 'server');

    log.info('Attempting to start backend server from:', serverDir);

    const fs = require('fs');
    if (!fs.existsSync(serverDir)) {
        log.error('CRITICAL: Server directory does not exist!', serverDir);
        return;
    }

    // In production, node_modules are now pre-bundled.
    // No more runtime npm install to avoid administrator permission requirements.

    // Spawn the server using the system 'node' binary
    const nodeCmd = process.platform === 'win32' ? 'node.exe' : 'node';
    log.info('Spawning server with command:', nodeCmd, 'in', serverDir);

    serverProcess = spawn(nodeCmd, ['index.js'], {
        cwd: serverDir,
        env: { ...process.env, PORT: '5000' },
        stdio: 'pipe',
        shell: true,
    });

    serverProcess.stdout.on('data', (data) => {
        log.info('[Server]', data.toString().trim());
    });

    serverProcess.stderr.on('data', (data) => {
        log.warn('[Server Error]', data.toString().trim());
    });

    serverProcess.on('close', (code) => {
        log.info(`Backend server exited with code ${code}`);
        serverProcess = null;
    });

    serverProcess.on('error', (err) => {
        log.error('Failed to start backend server child process:', err.message);
    });
}

function stopBackendServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
        log.info('Backend server stopped.');
    }
}

// Store initialization
(async () => {
    try {
        const { default: store } = await import('electron-store');
        Store = new store();
        log.info('Store initialized');
    } catch (e) {
        log.error('Store initialization failed:', e.message);
    }
})();

let mainWindow;
let tray = null;
let blockerId;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        minWidth: 1280,
        minHeight: 720,
        fullscreen: true,
        fullscreenable: true,
        kiosk: true,
        alwaysOnTop: true,
        autoHideMenuBar: true,
        frame: false,
        icon: path.join(__dirname, '../public/Kurmatiklogo_256.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true, // Güvenlik Kuralı
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    const startUrl = isDev
        ? 'http://localhost:5173'
        : `file://${path.join(__dirname, '../dist/index.html')}`;

    mainWindow.loadURL(startUrl);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.webContents.on('did-finish-load', () => {
        log.info('Main window loaded successfully');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        log.error(`Main window failed to load: ${errorCode} - ${errorDescription} at ${validatedURL}`);
    });

    // ─── LOCAL Keyboard Shortcuts ───────────────────────────────────────────────
    // These only fire when this window is focused (NOT global / system-wide)
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (!mainWindow) return;

        // F11 → Toggle Fullscreen
        if (input.type === 'keyDown' && input.key === 'F11') {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
            event.preventDefault();
        }

        // Escape → Exit Fullscreen
        if (input.type === 'keyDown' && input.key === 'Escape') {
            if (mainWindow.isFullScreen()) {
                mainWindow.setFullScreen(false);
                event.preventDefault();
            }
        }

        // Ctrl+R → Reload
        if (input.type === 'keyDown' && (input.control || input.meta) && input.key === 'r') {
            mainWindow.reload();
            event.preventDefault();
        }

        // Ctrl+Q → Quit
        if (input.type === 'keyDown' && (input.control || input.meta) && input.key === 'q') {
            app.quit();
            event.preventDefault();
        }

        // Ctrl+Shift+I → DevTools (dev only)
        if (isDev && input.type === 'keyDown' && (input.control || input.meta) && input.shift && input.key === 'I') {
            mainWindow.webContents.toggleDevTools();
            event.preventDefault();
        }
    });
    // ────────────────────────────────────────────────────────────────────────────

    mainWindow.on('closed', () => {
        mainWindow = null;
        // Stop power save blocker when window closes
        if (blockerId !== undefined && powerSaveBlocker.isStarted(blockerId)) {
            powerSaveBlocker.stop(blockerId);
            log.info('Power save blocker stopped on window close.');
        }
    });

    // Power save blocker to prevent display sleep
    blockerId = powerSaveBlocker.start('prevent-display-sleep');
    log.info('Power save blocker started:', blockerId);
}

function createTray() {
    const iconPath = path.join(__dirname, '../public/Kurmatiklogo_256.png');
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Göster',
            click: () => {
                if (mainWindow) mainWindow.show();
            }
        },
        {
            label: 'Tam Ekran',
            click: () => {
                if (mainWindow) {
                    const isFullScreen = mainWindow.isFullScreen();
                    mainWindow.setFullScreen(!isFullScreen);
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Çıkış',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Kurmatik Exchange');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        if (mainWindow) mainWindow.show();
    });
}

app.whenReady().then(async () => {
    // ─── Güvenlik Duvarı: Content Security Policy (CSP) ───
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: file: https://* http://localhost:* ws://* wss://*;"
                ]
            }
        });
    });

    // Auto-start backend server (replaces start_app.bat)
    startBackendServer();

    // Give server 1.5s to bind to port 5000 before window loads
    if (!isDev) {
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    createWindow();
    createTray();

    if (!isDev) {
        app.setLoginItemSettings({
            openAtLogin: true,
            path: app.getPath('exe'),
        });
        setupAutoUpdater();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Final safety net: ensure powerSaveBlocker is stopped
    if (blockerId !== undefined && powerSaveBlocker.isStarted(blockerId)) {
        powerSaveBlocker.stop(blockerId);
        log.info('Power save blocker stopped on all windows closed.');
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    // Stop backend server on quit
    stopBackendServer();

    // Final cleanup on quit
    if (blockerId !== undefined && powerSaveBlocker.isStarted(blockerId)) {
        powerSaveBlocker.stop(blockerId);
    }
});

// IPC communication
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('store-get', (event, key) => {
    return Store ? Store.get(key) : null;
});

ipcMain.handle('store-set', (event, key, value) => {
    if (Store) {
        Store.set(key, value);
        return true;
    }
    return false;
});
