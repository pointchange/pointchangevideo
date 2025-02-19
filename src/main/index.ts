import { app, BrowserWindow } from 'electron'

// import { electronApp, optimizer } from '@electron-toolkit/utils'
import { electronApp } from '@electron-toolkit/utils'

import { createWindow, mainWinHandle } from './win_config';

import { mainVideoHandle, protocolHandler, videoProtocol } from './protocol';
import { mainHanlde } from './video';


protocolHandler();

let mainWindow: BrowserWindow;

// getSubtitle();

app.whenReady().then(() => {

  // audioProtocol();
  mainVideoHandle();
  // videoInfoProtocol();
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  // app.on('browser-window-created', (_, window) => {
  //   optimizer.watchWindowShortcuts(window)
  // })

  mainWindow = createWindow()
  mainWinHandle(mainWindow)
  mainHanlde(mainWindow)

  videoProtocol(mainWindow);


  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
process.on('uncaughtException', err => {
  console.error('有一个未捕获的错误', err)
  // process.exit(1) //强制性的（根据 Node.js 文档）
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
