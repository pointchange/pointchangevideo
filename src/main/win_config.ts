import { BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { is } from "@electron-toolkit/utils";
import { join } from "path";
import icon from '../../resources/icon.png?asset'

// Create the browser window.
// let mainWindow: BrowserWindow;
function createWindow(): BrowserWindow {
    const mainWindow = new BrowserWindow({
        // frame: false,
        width: 1300,
        height: 700,
        show: false,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#222',
            height: 30
        },
        // titleBarStyle: ('default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover');
        // ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
        autoHideMenuBar: true,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.mjs'),
            sandbox: false
        }
    })

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
    ipcMain.handle('on-close-win', () => {
        win.close();
    })
    ipcMain.handle('on-fullScreen-win', (_e, bool) => {
        if (bool) {
            win.maximize()
        } else {
            win.unmaximize();
        }
    })
    ipcMain.handle('on-minimizable-win', () => {
        win.minimize();
    })
    ipcMain.on('dark-mode:toggle', (_e, v) => {
        nativeTheme.themeSource = v
        if (v === 'dark') {
            win.setTitleBarOverlay({
                color: '#222',
                symbolColor: '#bbb'
            })
        } else {
            win.setBackgroundColor('#ffffff')
            win.setTitleBarOverlay({
                color: '#dddddd',
                symbolColor: '#000'
            })
        }
    })
}




export { createWindow, mainWinHandle }