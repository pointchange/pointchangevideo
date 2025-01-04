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
            title: '',
            src: '',
            currentPlaying: '',
            duration: 0,
            currentTime: 0,
            currentTimeStr: '00:00:00',
            durationStr: '00:00:00',
            path: ''
        },
        videoProtocol: 'local-video://',
        audioProtocol: 'local-audio://',
        audio_info: {
            src: '',
            index: 0,
        },
        subtitle_info: {
            src: '',
            index: 0,
        },
        subtitleStyle: {
            color: '#ffffff',
            fontSize: '32px',
            fontFamily: 'inherit',
            fontWeight: 'normal',
            textShadow: '',
            backgroundColor: 'rgba(0,0,0,.5)',
            visibility: 'visible',
            opacity: 1,
        },
        list: [
            {
                name: '',
                path: '',
                isPlaying: false,
            }
        ],
        width: 256,
        // searchHistoryList: ['']
    }),
    getters: {
        video_raw_handle(state) {
            return (str: string) => {
                if (state.video_raw) {
                    switch (str) {
                        case 'codec_long_name':
                            return state.video_raw.streams[0].codec_long_name;
                        case 'size':
                            return state.video_raw.format.size; case 'coded_height':
                            return state.video_raw.streams[0].coded_height;
                        case 'coded_width':
                            return state.video_raw.streams[0].coded_width;
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
        getFontSize(state) {
            return state.subtitleStyle.fontSize.split('px')[0];
        }
    },
    actions: {
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
            // console.log(this.video_info.durationStr)
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
            console.log(src);
            return src;
        },
        async playCurrentVideo(path: string, name: string) {
            //
            this.audio_info.index = 0;

            this.audio_info.src = this.audioProtocol + path;
            this.video_info.src = this.videoProtocol + path;


            this.video_raw = await window.electron.ipcRenderer.invoke('on-get-video-infor', path);
            console.log(this.video_raw);
            this.video_info.duration = this.video_raw.format.duration;

            this.changeDuration()
            this.video_info.path = path;
            this.video_info.title = name;

            this.list.forEach(v => {
                if (v.path === path) {
                    v.isPlaying = true;
                } else {
                    v.isPlaying = false;
                }

            })

            fetch('local-subtitle://' + path).then((res) => {
                if (res.status === 404) {
                    this.subtitle_info.src = ''
                }
                return res.blob();

            }).then(res => {
                this.subtitle_info.src = URL.createObjectURL(res);
            }).catch(e => {
                console.log('error: ', e);
            })
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
        changeAudioStream(v: number, currentTime: number) {
            this.audio_info.src = this.audioProtocol + this.video_info.path + `?start=${currentTime}&&index=${v}`;
            console.log(this.audio_info.src)
        },
        async changeSubtitleStream(v: string) {
            console.log(v);
            const res = await fetch('local-subtitle://' + this.video_info.path + `?index=${v}`);

            this.subtitle_info.src = URL.createObjectURL(await res.blob());
        },
        changeSubtitleStyle(v: any, property: string) {
            switch (property) {
                case 'fontSize':
                    this.subtitleStyle[property] = v + 'px';
                    break;
                case 'visibility':
                    this.subtitleStyle[property] = v ? 'visibility' : 'hidden';
                    break;
                default:
                    this.subtitleStyle[property] = v;
                    break;
            }

        },
        // changeSubtitleFontSize(v: string) {
        //     this.subtitleStyle.fontSize = v + 'px';
        // },
        // changeSubtitleColor(v: string) {
        //     this.subtitleStyle.color = v;
        // }

    },
    persist: {
        pick: ['list'],
    }
})