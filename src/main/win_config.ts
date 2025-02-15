import { BrowserWindow, ipcMain, shell } from 'electron'
import { is } from "@electron-toolkit/utils";
import { join } from "path";
import icon from '../../resources/icon.png?asset'

// Create the browser window.
// let mainWindow: BrowserWindow;
function createWindow(): BrowserWindow {
    const mainWindow = new BrowserWindow({
        frame: false,
        width: 1300,
        height: 700,
        show: false,
        autoHideMenuBar: true,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.mjs'),
            sandbox: false
        }
    })
    mainWindow.on('close', _e => {
        mainWindow.webContents.send('on-sava-current-video', true)
    });

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return mainWindow;
}
function mainWinHandle(win: BrowserWindow) {
    ipcMain.on('on-close-win', () => {
        win.close();
    })
    ipcMain.on('on-fullScreen-win', (_e, bool) => {
        if (bool) {
            win.maximize()
        } else {
            win.unmaximize();
        }
    })
    ipcMain.on('on-fullScreen-win-bar', (_e, bool) => {
        win.fullScreen = bool;
    })
    ipcMain.on('on-minimizable-win', () => {
        win.minimize();
    })
    ipcMain.on('on-open-file-path', (_e, path) => {
        shell.showItemInFolder(path);
    })
}




export { createWindow, mainWinHandle }