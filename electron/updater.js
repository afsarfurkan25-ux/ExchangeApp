const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

function setupAutoUpdater() {
    log.info('Setting up auto-updater...');

    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'info';

    autoUpdater.on('checking-for-update', () => {
        log.info('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
        log.info('Update available.');
    });

    autoUpdater.on('update-not-available', (info) => {
        log.info('Update not available.');
    });

    autoUpdater.on('error', (err) => {
        log.error('Error in auto-updater: ' + err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
        log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
        log.info(log_message);
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded; will install now');
        // You could prompt the user here or just quit and install
        autoUpdater.quitAndInstall();
    });

    // Check for updates
    autoUpdater.checkForUpdatesAndNotify();
}

module.exports = { setupAutoUpdater };
