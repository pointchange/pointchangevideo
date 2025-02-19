import { BrowserWindow, ipcMain, protocol } from 'electron'
import { stat } from 'node:fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
import { createReadStream } from 'node:fs';

import { getVideoInfor, videoInfo, videoPath } from './video';


const rightFfmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
const rightFfprobePath = ffprobePath.replace('app.asar', 'app.asar.unpacked');
ffmpeg.setFfmpegPath(rightFfmpegPath);
ffmpeg.setFfprobePath(rightFfprobePath);


//Restricted format
const CODEC = [
    {
        video_codec: "H264",
        audio_codec: "AAC"
    },
    {
        video_codec: "H265",
        audio_codec: "AAC"
    },
    {
        video_codec: "H264",
        audio_codec: "mp3"
    },
    {
        video_codec: "VP8",
        audio_codec: "Vorbis"
    },
    {
        video_codec: "Theora",
        audio_codec: "Vorbis"
    },
    {
        video_codec: "HEVC",
        audio_codec: "AAC"
    }
];

//audio codec
const AUDIOCODEC = ['AIFF', 'AIFF-C', 'AAC', 'APE', 'ASF', 'BWF', 'DSDIFF', 'DSF', 'FLAC', 'MP2', 'Matroska', 'MP3', 'MPC', 'MPEG 4', 'Ogg', 'Opus', 'Speex', 'Theora', 'Vorbis', 'WAV', 'WebM', 'WV', 'WMA', 'm4a', 'm4b']

//software/hardware decoding
let isVideoHardwareDecode = false;

function protocolHandler() {
    return protocol.registerSchemesAsPrivileged([
        {
            scheme: 'local-video',
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                stream: true,
                bypassCSP: true,
            }
        },
        {
            scheme: 'local-audio',
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                stream: true,
                bypassCSP: true,
            }
        },
        {
            scheme: 'local-video-info',
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                stream: true,
                bypassCSP: true,
            }
        },
        {
            scheme: 'local-subtitle',
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                stream: true,
                bypassCSP: true,
            }
        },
    ])
}

// let videoInfo: never[] = []

let savePath = videoPath;
let saveVideoInfo = videoInfo;
let size = 0;
// let url = '';

interface Video {
    stream: ffmpeg.FfprobeStream | undefined
    canPlayCodec: {
        video_codec: string;
        audio_codec: string;
    } | undefined
}

interface Audio {
    stream: ffmpeg.FfprobeStream | undefined
    canPlayCodec: string | undefined
    streamIndex: number
    streamNumber: number

}

let video: Video = {
    stream: undefined,
    canPlayCodec: undefined,
}

let audio: Audio = {
    stream: undefined,
    canPlayCodec: undefined,
    streamIndex: -1,
    streamNumber: 0,
}

let isAudioHardwareDecode = false;

//正常状态 mkv 本质是H.264压缩标准; h.264能播 但进度条卡顿超1s， 视频无声音
//MP4 = MPEG 4文件使用 H264 视频编解码器和AAC音频编解码器
//WebM = WebM 文件使用 VP8 视频编解码器和 Vorbis 音频编解码器
//Ogg = Ogg 文件使用 Theora 视频编解码器和 Vorbis音频编解码器

// videoCodec = 'copy' -filter 不能一起用
// `-filter:v minterpolate='mi_mode=mci:mc_mode=aobmc:me_mode=bidir:mb_size=8:search_param=16:scd_threshold=5:vsbmc=1:fps=48'`
//-preset 参数来调整转换速度，-preset 有 ultrafast、superfast、fast、medium、slow、veryslow 等选项。速度越快，压缩效率越低，文件会更大；相反，速度越慢，压缩效率越高，文件会更小。
// const outputOptionsArr = [
//     // '-an',
//     isCopy ? '-c:v copy' : '-c:v libx264',

//     // `-map 0:v`,
//     // `-map 0:a:1`,
//     // '-map 0:1',
//     // '-c:a aac',
//     // isCopy ? '-c:a acc' : '',
//     isCopy ? "-preset veryslow" : '-preset ultrafast',
//     isCopy ? "" : '-crf 0',
//     isCopy ? "" : '-tune zerolatency',
//     '-hide_banner',
//     '-movflags frag_keyframe+empty_moov+default_base_moof',
//     // '-movflags dash',
//     // '-g 1',
//     // '-profile:v baseline',
//     `-g ${res.r_frame_rate}`,

//     // '-threads 0'
//     // '-g 150',
//     // '-keyint_min 48',
//     // '-sc_threshold 0',
//     // '-min_seg_duration 5000',
//     // '-max_delay 50'
// ].filter(Boolean);
function videoProtocol(win: BrowserWindow) {
    protocol.handle('local-video', async (request) => {
        //get video address
        const url = new URL(request.url);
        const path = decodeURI(url.host + ':' + url.pathname);
        const type = url.searchParams.get('type');

        // reduce find ffmpeg ffprobe
        if (savePath !== path) {
            saveVideoInfo = await getVideoInfor(path);
            savePath = path;

            size = (await stat(path)).size;

            //find video stream
            if (type === 'video') {
                video.stream = saveVideoInfo.streams.find(v => v.codec_type === 'video');
                if (!video.stream) return new Response('', { status: 404 });
                //get web video type can be play
                video.canPlayCodec = CODEC.find(obj => {
                    if (video.stream && video.stream.codec_name) {
                        return obj.video_codec.toLowerCase() === video.stream.codec_name.toLowerCase()
                    } else {
                        return undefined;
                    }
                });
            }
            if (type === 'audio') {
                audio.streamNumber = 0;
                for (let i = 0; i < saveVideoInfo.streams.length; i++) {
                    const item = saveVideoInfo.streams[i];
                    if (item.codec_type === 'audio') {
                        audio.streamNumber++;
                    }
                }
            }
        }

        const headers = {
            "Connection": 'keep-alive',
            "Accept-Ranges": "bytes",
            "Keep-Alive": "timeout=5, max=500"
        }

        let end = size - 1;
        let start = 0;
        /**
         * normal media handle
         * @returns Response
         */
        function webVideoCanPlayCodecHandle() {

            if (type === 'video') {
                isVideoHardwareDecode = true;
            }
            if (type === 'audio') {
                isAudioHardwareDecode = true;
            }

            const start = Number(request.headers.get('Range')?.split('=')[1].split('-')[0]) || 0;
            const rs: any = createReadStream(path, { start, end });
            const response = new Response(rs, { headers });
            if (start === 0) {
                response.headers.set("Content-Length", `${size}`);
            } else {
                response.headers.set("Content-Length", `${end - start + 1}`);
            }
            response.headers.set("Content-Range", `${start}-${end}/${size}`);
            return response;
        }

        if (type === 'video') {
            //test video can play 

            if (video.canPlayCodec) {
                return webVideoCanPlayCodecHandle();
            } else {
                isVideoHardwareDecode = false;
                start = Number(url.searchParams.get('start'));

                const outputOptionsArr = [
                    '-an',
                    '-preset ultrafast',
                    '-crf 0',
                    '-tune zerolatency',
                    '-hide_banner',
                    '-movflags frag_keyframe+empty_moov+default_base_moof',
                    `-g ${video.stream && video.stream.r_frame_rate}`,
                ];
                const f = ffmpeg(path)
                    .format('mp4')
                    .seekInput(start)
                    .on('error', function (_err: { message: string; }, _stdout: any, _stderr: any) {
                        // console.log('Cannot process video: ' + _err.message);
                        // f.kill('SIGKILL');
                    })
                    .on('codecData', function (_data) {
                        // console.log('Input is ' + _data.audio + ' audio ' + 'with ' + _data.video + ' video');
                    })
                    .outputOptions(outputOptionsArr)
                const response = new Response(f.pipe() as any, { headers });
                response.headers.set("Content-Range", `${start}-${end}/${size}`);
                return response;
            }
        } else if (type === 'audio') {
            audio.streamIndex = -1;
            const index = Number(url.searchParams.get('index'));
            const sIndex = Number(url.searchParams.get('streamIndex'));

            if (index !== audio.streamIndex) {
                audio.streamIndex = index;
                audio.stream = saveVideoInfo.streams[sIndex];
                audio.canPlayCodec = AUDIOCODEC.find(item => {
                    if (audio.stream?.codec_name && item.toLowerCase() === audio.stream?.codec_name.toLowerCase()) {
                        return item;
                    } else {
                        return undefined;
                    }
                });
            }

            // console.log(audio, audio.streamNumber, index, sIndex, audio.streamIndex);

            if (audio.canPlayCodec && audio.streamNumber === 1) {
                // console.log('hard')
                return webVideoCanPlayCodecHandle();
            } else if (audio.streamNumber >= 1) {
                // console.log('soft');
                isAudioHardwareDecode = false;

                let start = Number(url.searchParams.get('start'));
                const outputOptionsArr = [
                    '-vn',
                    '-sn',
                    `-map 0:a:${audio.streamIndex}`,
                    // `-ar ${audio.stream?.sample_rate !== 0 ? audio.stream?.sample_rate : '44100'}`,
                    // `-b:a ${audio.stream?.bit_rate !== 'N/A' ? audio.stream?.bit_rate : '128k'}`,
                    '-preset ultrafast',
                    '-tune zerolatency',
                    '-hide_banner',
                    '-movflags frag_keyframe+empty_moov+default_base_moof',
                ]
                const f = ffmpeg(path)
                    .seekInput(start)
                    .format('mp3')
                    .outputOptions(outputOptionsArr)
                    .on('error', function (_err: { message: string; }, _stdout: any, _stderr: any) {
                        // console.log('---Cannot process audio: ' + _err.message, _stdout, _stderr);
                    })
                    .on('codecData', function (_data) {
                        // console.log('---Input is ' + data.audio + ' audio ' +'with ' + data.video + ' video');
                    })
                const response = new Response(f.pipe() as any, { headers });
                response.headers.set("Content-Range", `${start}-${end}/${size}`);
                return response;
            } else {
                return new Response('', { status: 404 })
            }
        } else if (type === 'subtitle') {
            const index = Number(url.searchParams.get('index'));
            const outputOptionsArr = [
                `-map 0:s:${index}`,
            ];
            let data = '';

            await new Promise((res, _rej) => {
                const f = ffmpeg(path)
                    .outputOptions(outputOptionsArr)
                    .format('webvtt')
                    .on('error', function (_err) {
                        // console.log('An error occurred: ' + err.message);
                    })
                    .on('progress', function (progress) {
                        // console.log('Processing: ' + progress.percent + '% done');
                        win.webContents.send('on-subtitle-loading', progress.percent)
                    })
                let ffstream = f.pipe();
                ffstream.on('data', function (chunk) {
                    data += chunk
                }).on('end', function () {
                    // console.log('Processing finished !');
                    res(true);
                });
            })
            return new Response(data, {
                headers: {
                    "Connection": 'keep-alive',
                    "Access-Control-Allow-Credentials": "true",
                    "Accept-Ranges": "bytes"
                }
            });
        } else {
            return new Response('', { status: 404 })
        }

    })
}

function mainVideoHandle() {
    ipcMain.handle('on-change-video-decode', () => isVideoHardwareDecode);
    ipcMain.handle('on-change-audio-decode', () => isAudioHardwareDecode);
}

export { protocolHandler, videoProtocol, mainVideoHandle }