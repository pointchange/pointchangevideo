import { ipcMain, protocol } from 'electron'
import { stat } from 'node:fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
import { createReadStream } from 'node:fs';
const rightFfmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
const rightFfprobePath = ffprobePath.replace('app.asar', 'app.asar.unpacked');
ffmpeg.setFfmpegPath(rightFfmpegPath);
ffmpeg.setFfprobePath(rightFfprobePath);

interface Codec {
    video_codec: string,
    audio_codec: string,
    r_frame_rate?: string | undefined,

};
interface AudioInfo {
    audio_codec: string,
    audioStream: number,
    sample_rate: number,
    bit_rate: number,
}

//Restricted format
const CODEC = [
    {
        video_codec: "H264",
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

//正常状态 mkv 本质是H.264压缩标准; h.264能播 但进度条卡顿超1s， 视频无声音
//MP4 = MPEG 4文件使用 H264 视频编解码器和AAC音频编解码器
//WebM = WebM 文件使用 VP8 视频编解码器和 Vorbis 音频编解码器
//Ogg = Ogg 文件使用 Theora 视频编解码器和 Vorbis音频编解码器
function videoProtocol() {
    return protocol.handle('local-video', async (request) => {
        //get video address
        const url = new URL(request.url);
        let path = decodeURI(url.host + ':' + url.pathname);
        //test video can play 
        const res: Codec = await new Promise((res, rej) => {
            ffmpeg(path).ffprobe((err: any, data: { streams: any; }) => {
                if (err) rej(err);
                const { streams } = data;
                // console.log(streams);
                let video_codec = '',
                    audio_codec = '',
                    r_frame_rate = '';
                for (let i = 0; i < streams.length; i++) {
                    switch (streams[i].codec_type) {
                        case 'video':
                            // r_frame_rate = new Function(`return ${streams[i].r_frame_rate}`)().toFixed(3).toString();
                            if (!video_codec) {
                                r_frame_rate = streams[i].r_frame_rate;
                                video_codec = streams[i].codec_name;
                            }
                            break;
                        case 'audio':
                            audio_codec = streams[i].codec_name;
                            break;
                        default:
                            break;
                    }
                }
                res({
                    video_codec,
                    audio_codec,
                    r_frame_rate,
                });
            })
        })
        if (!res) return res;
        //double test codec
        const findCanPlayCodec = CODEC.find(obj => obj.video_codec.toLowerCase() === res.video_codec.toLowerCase());

        //public handle
        const info = await stat(path);
        let end = info.size - 1;
        let start = 0;

        if (findCanPlayCodec) {
            isVideoHardwareDecode = true;
            start = Number(request.headers.get('Range')?.split('=')[1].split('-')[0]) || 0;
            const rs: any = createReadStream(path, { start, end });
            const response = new Response(rs, {
                headers: {
                    "Connection": 'keep-alive',
                    "Accept-Ranges": "bytes"
                }
            });
            if (start === 0) {
                response.headers.set("Content-Length", `${info.size}`);
            } else {
                response.headers.set("Content-Length", `${end - start + 1}`);
            }
            response.headers.set("Content-Range", `${start}-${end}/${info.size}`);
            return response;
        } else {
            isVideoHardwareDecode = false;
            start = Number(url.searchParams.get('start'));

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
            const outputOptionsArr = [
                '-an',
                '-preset ultrafast',
                '-crf 0',
                '-tune zerolatency',
                '-hide_banner',
                '-movflags frag_keyframe+empty_moov+default_base_moof',
                `-g ${res.r_frame_rate}`,
            ];

            const f: ffmpeg.FfmpegCommand = ffmpeg(path)
                .format('mp4')
                .seekInput(start)
                .on('error', function (_err: { message: string; }, _stdout: any, _stderr: any) {
                    // console.log('Cannot process video: ' + _err.message);
                    // f.kill('SIGKILL');
                })
                .on('codecData', function (_data) {
                    // console.log('Input is ' + data.audio + ' audio ' +'with ' + data.video + ' video');
                })
                .outputOptions(outputOptionsArr)
            const response = new Response(f.pipe() as any, {
                headers: {
                    "Connection": 'keep-alive',
                    "Content-Type": "video/mp4",
                    "Access-Control-Allow-Credentials": "true",
                    "Accept-Ranges": "bytes"
                }
            });
            response.headers.set("Content-Range", `${start}-${end}/${info.size}`);
            return response;
        }



    })
}

let isAudioHardwareDecode = false;
function audioProtocol() {
    return protocol.handle('local-audio', async (request) => {
        const url = new URL(request.url);
        let path = decodeURI(url.host + ':' + url.pathname);
        const info = await stat(path);
        let end = info.size - 1;

        let indexAudio = 1;
        const res: AudioInfo = await new Promise((res, rej) => {
            ffmpeg(path).ffprobe((err: any, data: { streams: any; }) => {
                if (err) rej(err);
                const { streams } = data;
                let sample_rate = 0,
                    audio_codec = '',
                    bit_rate = 0,
                    audioStream = 0;
                for (let i = 0; i < streams.length; i++) {
                    if (streams[i].codec_type === 'audio') {
                        audioStream++;
                        if (!audio_codec) {
                            audio_codec = streams[i].codec_name;
                        }
                        if (streams[i].index === indexAudio) {
                            sample_rate = streams[i].sample_rate;
                            bit_rate = streams[i].bit_rate;
                        }
                    }
                }
                res({
                    audio_codec,
                    audioStream,
                    sample_rate,
                    bit_rate
                });
            })
        })
        const findCanPlayCodec = AUDIOCODEC.find(item => item.toLowerCase() === res.audio_codec.toLowerCase());

        // condition1: an audio
        if (findCanPlayCodec && res.audioStream === 1) {
            isAudioHardwareDecode = true;
            let start = Number(request.headers.get('Range')?.split('=')[1].split('-')[0]) || 0;
            const rs: any = createReadStream(path, { start, end });
            const response = new Response(rs, {
                headers: {
                    "Connection": 'keep-alive',
                    "Accept-Ranges": "bytes"
                }
            });
            if (start === 0) {
                response.headers.set("Content-Length", `${info.size}`);
            } else {
                response.headers.set("Content-Length", `${end - start + 1}`);
            }
            response.headers.set("Content-Range", `${start}-${end}/${info.size}`);
            return response;
        } else {
            isAudioHardwareDecode = false;
            let start = Number(url.searchParams.get('start'));
            let index = Number(url.searchParams.get('index'));
            const outputOptionsArr = [
                '-vn',
                '-sn',
                `-map 0:a:${index}`,
                '-preset ultrafast',
                '-tune zerolatency',
                '-hide_banner',
                '-movflags frag_keyframe+empty_moov+default_base_moof',
            ].filter(Boolean);
            const f = ffmpeg(path)
                .seekInput(start)
                .audioBitrate(res.bit_rate)
                .audioFrequency(res.sample_rate)
                .audioCodec('libmp3lame')
                .format('mp3')
                .outputOptions(outputOptionsArr)
                .on('error', function (_err: { message: string; }, _stdout: any, _stderr: any) {
                    // console.log('---Cannot process audio: ' + _err.message);
                })
                .on('codecData', function (_data) {
                    // console.log('---Input is ' + data.audio + ' audio ' +'with ' + data.video + ' video');
                })
            const response = new Response(f.pipe() as any, {
                headers: {
                    "Connection": 'keep-alive',
                    "Content-Type": "audio/mp3",
                    "Access-Control-Allow-Credentials": "true",
                    "Accept-Ranges": "bytes"
                }
            });
            response.headers.set("Content-Range", `${start}-${end}/${info.size}`);
            return response;
        }

    })
}
function videoSubtitleProtocol() {
    return protocol.handle('local-subtitle', async (request) => {
        const url = new URL(request.url);
        let path = decodeURI(url.host + ':' + url.pathname);
        const subtitleNum: number = await new Promise((res, rej) => {
            ffmpeg(path).ffprobe((err: any, data: { streams: any; }) => {
                if (err) rej(err);
                const { streams } = data;
                let subtitleNum = 0;
                for (let i = 0; i < streams.length; i++) {
                    if (streams[i].codec_type === 'subtitle') {
                        subtitleNum++;
                    }
                }
                res(subtitleNum);
            })
        })
        if (subtitleNum === 0) return new Response('', {
            status: 404
        });
        let index = Number(url.searchParams.get('index'));
        const outputOptionsArr = [
            `-map 0:s:${index}`,
        ].filter(Boolean);
        const f = ffmpeg(path)
            .format('webvtt')
            .outputOptions(outputOptionsArr)
            .on('error', function (_err: { message: string; }, _stdout: any, _stderr: any) {
                // console.log('-_____--Cannot process audio: ' + _err.message);
            })
            .on('codecData', function (_data) {
                // console.log('--**-Input is ' + data.audio + ' audio ' +'with ' + data.video + ' video');
            })
            .on('end', () => {
                // console.log('end----');
            });
        let data = ''
        await new Promise((res, rej) => {
            f.pipe().on('data', chunk => {
                data += chunk;
            }).on('end', () => {
                res(true);
            }).on('error', (e) => {
                rej(e)
            })
        })
        return new Response(data);
    })

}


function mainVideoHandle() {
    ipcMain.handle('on-change-video-decode', () => isVideoHardwareDecode);
    ipcMain.handle('on-change-audio-decode', () => isAudioHardwareDecode);
}

export { protocolHandler, videoProtocol, mainVideoHandle, audioProtocol, videoSubtitleProtocol }