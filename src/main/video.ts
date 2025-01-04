import { BrowserWindow, ipcMain, dialog } from 'electron'
import { join, parse } from 'path'
// import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
const rightFfmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
const rightFfprobePath = ffprobePath.replace('app.asar', 'app.asar.unpacked');
ffmpeg.setFfmpegPath(rightFfmpegPath);
ffmpeg.setFfprobePath(rightFfprobePath);

const vidoeType = [
    "wmv",
    "asf",
    "asx",
    "rm",
    "rmvb",
    "mp4",
    "3gp",
    "mov",
    "m4v",
    "avi",
    "dat",
    "mkv",
    "flv",
    "vob",
    "webm",
    "3g2",
    "f4v",
    "ts",
    "div",
    "divx",
    "dv",
    "qt",
    "lavf",
    "cpk",
    "dirac",
    "ram",
    "fli",
    "flc",
    "mod"
]
/**
 * 
 * @param {BrowserWindow} win 
 * @returns {string[]}
 */
async function addFile(win: BrowserWindow): Promise<string[]> {
    const res = await dialog.showOpenDialog(win, {
        title: '选择文件夹',
        properties: ['openFile', 'multiSelections', 'showHiddenFiles']
    })
    if (res.canceled) {
        return [];
    }
    if (!res.filePaths) return [];
    return res.filePaths;
}
/**
 * parse the path
 * @param {string[]} paths 
 * @returns {{path: string,name: string}[]}
 */
function pathParse(paths: string[]): {
    path: string;
    name: string;
}[] {
    let arr = [];
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        let bool = vidoeType.some(type => new RegExp('\.' + type + '$', 'ig').test(path));
        if (bool) {
            const { base: name } = parse(path);
            arr.push({
                path,
                name,
            })
        }
    }
    return arr;
}
async function openVideoFile(win: BrowserWindow) {
    const paths = await addFile(win)
    if (paths.length > 1) {
        return pathParse(paths);
    } else {
        if (paths.length === 0) return paths;
        const dir = parse(paths[0]).dir;
        const dirArr = await readdir(dir);
        const arr = dirArr.map(v => join(dir, v));
        return pathParse(arr);
    }
}
async function getVideoInfor(path: string): Promise<ffmpeg.FfprobeData | any> {
    return await new Promise((res, rej) => {
        ffmpeg(path).ffprobe((err, data) => {
            if (err) {
                rej(err);
            }
            res(data)
        })
    })
}

function mainHanlde(win: BrowserWindow) {
    ipcMain.handle('on-open-file', () => openVideoFile(win));
    ipcMain.handle('on-get-video-infor', (_, path) => getVideoInfor(path));
}

export {
    mainHanlde
}