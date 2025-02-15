import { defineStore } from 'pinia'
interface Myurl {
    params: {
        type: string;
        start?: number;
    };
    protocol: string;
}

export const useVideoStore = defineStore('video', {
    state: () => ({
        video_raw: null as any,
        video_info: {
            currentStream: null as any,
            title: 'PCV',
            src: '',
            currentPlaying: '',
            duration: 0,
            currentTime: 0,
            currentTimeStr: '00:00:00',
            durationStr: '00:00:00',
            path: '',
        },
        videoProtocol: 'local-video://',
        audioProtocol: 'local-audio://',
        audio_info: {
            currentStream: null as any,
            src: '',
            index: 0,
            streamIndex: 0
        },
        subtitle_info: {
            currentStream: null as any,
            src: '',
            index: 0,
            streamIndex: 0
        },
        list: [
            {
                name: '',
                path: '',
                isPlaying: false,
            }
        ],
        width: 256,
        timeId: 0,
        srt: '',
        save: {
            video_info: null as any,
            audio_info: null as any,
            subtitle_info: null as any,
            readSave: false,
        }
    }),
    getters: {
        video_raw_handle(state) {
            return (str: string) => {
                if (state.video_raw) {

                    let arr = state.video_raw.streams.filter((v: { codec_type: string; }) => v.codec_type === 'video');

                    switch (str) {
                        case 'codec_long_name':
                            return arr[0].codec_long_name;
                        case 'size':
                            return state.video_raw.format.size;
                        case 'coded_height':
                            return arr[0].coded_height;
                        case 'coded_width':
                            return arr[0].coded_width;
                        default:
                            return 'unknown'
                    }
                } else {
                    return '未知'
                }
            }
        },
        getStream(state) {
            return (codec_type: string) => {
                if (state.video_raw) {
                    return state.video_raw.streams.filter((v: { codec_type: string; }) => v.codec_type === codec_type);
                } else {
                    return [];
                }
            }
        },
        getList(state) {
            return (str: string) => {
                if (str) {
                    return state.list.filter(v => new RegExp(str, 'ig').test(v.name))
                } else {
                    return state.list;
                }
            }
        }
    },
    actions: {
        init() {

        },
        filterList(keyword: string) {
            if (keyword === '') {
                return this.list;
            } else {
                return this.list.filter(v => v.name.includes(keyword));
            }
        },
        countTime(time: number) {
            function isUnitsDigit(n: number) {
                let str = '';
                if (n < 10) {
                    str = '0' + n;
                }
                return str === '' ? n : str;
            }

            let hour = isUnitsDigit(Math.floor(time / 3600));
            let min = isUnitsDigit(Math.floor(time / 60) % 60);
            let second = isUnitsDigit(Math.floor(time % 60));
            return (Number(hour) > 0 ? `${hour}:` : '00:') + `${min}:${second}`;
        },
        changeDuration() {
            this.video_info.durationStr = this.countTime(this.video_info.duration);
        },
        changeCurrentTime(time: number) {
            this.video_info.currentTimeStr = this.countTime(time);
        },
        changeSrc(playerInfo: Myurl, path: string) {
            let src = playerInfo.protocol + path + '?';
            Object.keys(playerInfo.params).forEach(key => {
                if (src.indexOf('=') === -1) {
                    src += `${key}=${playerInfo.params[key]}`
                } else {
                    src += `&&${key}=${playerInfo.params[key]}`
                }

            })
            return src;
        },
        async playCurrentVideo(path: string, name: string) {
            this.video_raw = await window.electron.ipcRenderer.invoke('on-get-video-infor', path);
            this.video_info.duration = this.video_raw.format.duration;
            this.video_info.currentStream = this.video_raw.streams.filter((v: { codec_type: string; }) => v.codec_type === 'video')[0];

            this.changeDuration()
            this.video_info.path = path;
            this.video_info.title = name;

            if (!this.save.readSave) {
                this.audio_info.index = 0;
                this.audio_info.streamIndex = this.getAudioStreamIndex('audio');
            }

            this.audio_info.src = this.videoProtocol + path + `?type=audio&&streamIndex=${this.audio_info.streamIndex}`;
            this.video_info.src = this.videoProtocol + path + `?type=video`;

            this.list.forEach(v => {
                if (v.path === path) {
                    v.isPlaying = true;
                } else {
                    v.isPlaying = false;
                }
            })
            const hasSubtitle = this.video_raw.streams.find(v => v.codec_type === 'subtitle');
            if (hasSubtitle) {
                fetch(this.videoProtocol + path + `?type=subtitle&&index=${this.subtitle_info.index}&&streamIndex=${this.subtitle_info.streamIndex}`).then((res) => res.blob()).then((blob) => {
                    if (!this.save.readSave) {
                        this.subtitle_info.index = 0;
                        this.subtitle_info.streamIndex = this.getAudioStreamIndex('subtitle');
                    }
                    this.subtitle_info.src = URL.createObjectURL(blob);
                })

            } else {
                this.subtitle_info.src = ''
            }

        },
        pre() {
            let index = this.list.findIndex(v => v.path === this.video_info.path)
            if (index === 0) {
                index = this.list.length - 1;
                this.playCurrentVideo(this.list[index].path, this.list[index].name);
            } else {
                this.playCurrentVideo(this.list[index - 1].path, this.list[index - 1].name);
            }
        },
        next() {
            let index = this.list.findIndex(v => v.path === this.video_info.path)
            if (index === this.list.length - 1) {
                index = 0
                this.playCurrentVideo(this.list[index].path, this.list[index].name);
            } else {
                this.playCurrentVideo(this.list[index + 1].path, this.list[index + 1].name);
            }
        },
        getAudioStreamIndex(type: string) {
            const arr = this.getStream(type)
            let streamIndex = 0;
            if (arr.length > 0) {
                this.audio_info.currentStream = arr[this.audio_info.index];
                streamIndex = this.audio_info.currentStream.index
            }
            return streamIndex;
        },
        changeAudioStream(v: number, currentTime: number) {
            this.audio_info.streamIndex = this.getAudioStreamIndex('audio');
            this.audio_info.src = this.videoProtocol + this.video_info.path + `?type=audio&&start=${currentTime}&&index=${v}&&streamIndex=${this.audio_info.streamIndex}`;
        },
        async changeSubtitleStream(v: string) {
            this.subtitle_info.streamIndex = this.getAudioStreamIndex('subtitle');
            const res = await fetch('local-subtitle://' + this.video_info.path + `?index=${v}&&streamIndex=${this.subtitle_info.streamIndex}`);

            this.subtitle_info.src = URL.createObjectURL(await res.blob());
        },
        saveHandle() {
            this.save.video_info = this.video_info;
            this.save.audio_info = this.audio_info;
            this.save.subtitle_info = this.subtitle_info;
            this.save.readSave = true;
        },
        readSave() {
            this.audio_info = this.save.audio_info
            this.subtitle_info = this.save.subtitle_info
            this.playCurrentVideo(this.save.video_info.path, this.save.video_info.title)
        }
    },
    persist: {
        pick: ['list', 'save'],
    }
})