<script setup lang="ts">
    import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
    import { useVideoStore } from './stores/video';
    import { useThemeStore } from './stores/theme';
    const videoStroe = useVideoStore();
    let isPlaying = ref(false);
    const videoRef = ref<HTMLVideoElement | null>(null);
    const audioRef = ref<HTMLAudioElement | null>(null);

    let isVideoHardwareDecode = ref(false);
    let isVSync = ref(false);
    let isASync = ref(false);
    async function loadedmetadata(e: Event) {
        isVSync.value = true;
        (e.target as HTMLVideoElement).pause();
        isVideoHardwareDecode.value = await window.electron.ipcRenderer.invoke('on-change-video-decode');
    }
    let isAudioHardwareDecode = ref(false);
    async function audioLoadedmetadata(e: Event) {
        isASync.value = true;
        (e.target as HTMLVideoElement).pause();
        isAudioHardwareDecode.value = await window.electron.ipcRenderer.invoke('on-change-audio-decode');
    }
    watch([isVSync, isASync], () => {
        if (isVSync.value && isASync.value) {
            if (videoRef.value) {
                videoRef.value.play();
            }
            if (audioRef.value) {
                audioRef.value.play();
            }
        }
    })

    function play() {
        isPlaying.value = !isPlaying.value;
        if (videoRef.value) {
            if (isPlaying.value) {
                audioRef.value?.play();
                videoRef.value.play();
            } else {
                audioRef.value?.pause();
                videoRef.value.pause();
            }
        }
    }


    let isFullScreen = ref(false);
    const mainRef = ref<HTMLDivElement | null>(null);
    function setFullScreen() {
        isFullScreen.value = !isFullScreen.value;
        if (!document.fullscreenElement && mainRef.value) {
            mainRef.value.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    let progress = ref(0);
    function timeupdate(e: Event) {
        if (isVideoHardwareDecode.value) {
            progress.value = (e.target as HTMLVideoElement).currentTime;
        } else {
            progress.value = videoStroe.video_info.currentTime + (e.target as HTMLVideoElement).currentTime
        }
        videoStroe.changeCurrentTime(progress.value);
    }
    let controlHeight = ref(45);
    let isOpenList = ref(false);
    function openList() {
        isOpenList.value = !isOpenList.value;
        if (isOpenList.value) {
            controlHeight.value = 400;
        } else {
            controlHeight.value = 45;
        }
    }
    function videoClick() {
        controlHeight.value = 45;
        isOpenList.value = false;
    }
    let isMuted = ref(false);
    let volume = ref(100);
    function volumeChange(e: Event) {
        if (volume.value > 0) {
            isMuted.value = false;
            if (audioRef.value) {
                audioRef.value.volume = Number((e.target as HTMLInputElement).value) / 100;
            }
        } else {
            isMuted.value = true;
        }
    }
    async function openFile() {
        const res = await window.electron.ipcRenderer.invoke('on-open-file');
        if (Array.isArray(res)) {
            if (res.length > 0) {
                videoStroe.list = res.map(v => {
                    v.isPlaying = false;
                    return v;
                })
            }
        }
    }
    const trackRef = ref<HTMLTrackElement | null>(null);
    let isSwitch = ref(false);
    function playCurrentVideo(path: string, name: string) {
        // createTrack()
        isSwitch.value = !isSwitch.value
        isASync.value = isVSync.value = false;
        videoStroe.playCurrentVideo(path, name);
        videoStroe.video_info.currentTime = 0;
        // if (trackRef.value) {
        //     trackRef.value.LOADED()
        // }
    }
    function progressChange(v: number) {
        isASync.value = isVSync.value = false;
        if (videoRef.value) {
            if (isVideoHardwareDecode.value) {
                videoRef.value.currentTime = v;
            } else {
                videoStroe.video_info.src = videoStroe.videoProtocol + videoStroe.video_info.path + `?start=${v}`;
                videoStroe.video_info.currentTime = v;
            }
        }
        if (audioRef.value) {
            if (isAudioHardwareDecode.value) {
                audioRef.value.currentTime = v;
            } else {
                videoStroe.audio_info.src = videoStroe.audioProtocol + videoStroe.video_info.path + `?start=${v}`;
            }
        }
    }
    function playHandle() {
        isPlaying.value = true;
        if (audioRef.value) {
            audioRef.value.play();
        }
    }
    function pauseHandle() {
        isPlaying.value = false;
        if (audioRef.value) {
            audioRef.value.pause();
        }
    }
    const dialogRef = ref<HTMLDialogElement | null>(null);
    function openSetting() {
        if (dialogRef.value) {
            dialogRef.value.showModal();
        }
    }
    function closeDialog() {
        if (dialogRef.value) {
            dialogRef.value.close();
        }
    }

    function preHandle() {
        isASync.value = isVSync.value = false;
        videoStroe.pre();
    }
    function nextHandle() {
        isASync.value = isVSync.value = false;
        videoStroe.next();
    }
    function backSecondHandle() {
        if (videoRef.value) {
            progressChange(videoRef.value.currentTime - 5);
        }
    }
    function forwardSecondHandle() {
        if (videoRef.value) {
            progressChange(videoRef.value.currentTime + 5);
        }
    }
    let keyword = ref('');
    let translateY = ref(0);
    let translateX = ref(0);
    function videoOption(e: MouseEvent) {
        translateY.value = e.clientY;
        translateX.value = e.clientX;
    }
    //setting
    const themeStore = useThemeStore();
    function changeAudioStream(e: Event) {
        isASync.value = false;
        play();
        if (videoRef.value) {
            videoStroe.changeAudioStream(Number((e.target as HTMLInputElement).value), videoRef.value.currentTime);
        }
    }
    const audioStreamStr = computed(() => {
        return (item: any) => {
            if (Array.isArray(item)) return '';
            let lan = '';
            let title = '';
            if (item.hasOwnProperty('tags')) {
                if (item.tags.hasOwnProperty('language')) {
                    lan = item.tags.language;
                }
                if (item.tags.hasOwnProperty('title')) {
                    title = item.tags.title;
                }
            }
            let arr = [lan, title].filter(Boolean)
            if (arr.length > 0) {
                return arr.join(' - ')
            } else {
                return arr[0];
            }
        }
    });
    const family = [
        'inherit',
        'serif',
        'sans-serif',
        'monospace',
        'cursive',
        'fantasy',
        'system-ui',
        'ui-serif',
        'monospace',
        'ui-sans-serif',
        ' ui-monospace',
        'ui-rounded',
        'emoji',
        'math',
        'fangsong',
    ]
    function keyupHandler(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            setFullScreen()
        }
        if (e.key.trim() === '') {
            play()
        }
        // if (e.key === 'ArrowUp') {
        //     if (volume.value <= 100 && volume.value > 0) {
        //         volume.value += 5;
        //     }
        // }
        // if (e.key === 'ArrowDown') {
        //     if (volume.value <= 100 && volume.value > 0) {
        //         volume.value -= 5;
        //     }
        // }
        if (e.key === 'ArrowLeft') {
            backSecondHandle()
        }
        if (e.key === 'ArrowRight') {
            forwardSecondHandle()
        }
    }
    onMounted(() => {
        window.removeEventListener('keyup', keyupHandler);
    })
    onUnmounted(() => {
    })

    onMounted(() => {
        themeStore.init();
        window.addEventListener('keyup', keyupHandler);

    })
    let enterControls = ref(false);
    let isShowControls = ref(true);
    let timeId: NodeJS.Timeout;
    function mousemoveHandle() {
        isShowControls.value = true;
        clearTimeout(timeId);
        timeId = setTimeout(() => {
            if (enterControls.value) return;
            isShowControls.value = false;
        }, 1000);
    }

</script>
<template>
    <div class="title_bar">
        <div class="img_container">
            <img src="../public/favicon.ico" alt="">
        </div>

        <div class="title">{{ videoStroe.video_info.title }}</div>
    </div>
    <main ref="mainRef" @click.right.passive="videoOption">
        <audio ref="audioRef" :src="videoStroe.audio_info.src" controls @canplay="audioLoadedmetadata"
            :muted="isMuted"></audio>
        <video crossorigin="anonymous" ref="videoRef" :src="videoStroe.video_info.src" @canplay="loadedmetadata"
            @timeupdate="timeupdate" @click.stop="videoClick" @play="playHandle" @pause="pauseHandle" muted
            @dblclick="play" @mousemove="mousemoveHandle">
            <track v-if="isSwitch" ref="trackRef" default :src="videoStroe.subtitle_info.src" />
            <track v-else ref="trackRef" default :src="videoStroe.subtitle_info.src" />
        </video>
        <div class="video_control" ref="controlRef" :class="{ open_list: true }" :style="{
            height: controlHeight + 'px',
            opacity: isShowControls ? 1 : 0
        }" @mouseenter="enterControls = true" @mouseleave="enterControls = false">
            <ul class="ul">
                <div>
                    <label class="search_container" for="history">
                        <input type="search" id="site-search" name="history" v-model.lazy="keyword" />
                    </label>
                </div>
                <li :class="{ 'li_active': item.isPlaying }" v-for="item in videoStroe.filterList(keyword)"
                    :key="item.path" @click="playCurrentVideo(item.path, item.name)">
                    {{ item.name }}
                </li>
            </ul>
            <div class="controls">
                <div class="top df_s_b">
                    <span>{{ videoStroe.video_info.currentTimeStr }}</span>
                    <input class="progress " type="range" min="0" :max="videoStroe.video_info.duration"
                        v-model="progress"
                        @input="(e: Event) => progressChange(Number((e.target as HTMLInputElement).value))">
                    <span>{{ videoStroe.video_info.durationStr }}</span>
                </div>
                <div class="bottom df_s_b">
                    <div class="left df_s_b">
                        <button @click="play">{{ isPlaying ? '暂停' : '播放' }}</button>
                        <button @click.left="backSecondHandle" @click.right="preHandle">后退 / 上一个</button>
                        <button @click.left="forwardSecondHandle" @click.right="nextHandle">快进 / 下一个</button>
                        <div class="volume">
                            <button :class="{ volume_btn: isMuted }" @click="isMuted = !isMuted">
                                音量
                            </button>
                            <input type="range" v-model="volume" @change="volumeChange">
                        </div>
                    </div>
                    <div class="right ">
                        <button @click="openFile">打开文件</button>
                        <button @click="setFullScreen">{{ isFullScreen ? '缩小' : '放大' }}</button>
                        <button @click="openList">列表</button>
                        <button @click="openSetting">设置</button>
                    </div>
                </div>
            </div>
        </div>

    </main>
    <dialog ref="dialogRef">
        <div class="win">
            <div class="df_s_b">
                <div class="setting_title">设置</div>
                <div class="win_close df_center" @click="closeDialog">X</div>
            </div>
            <div class="win_container">
                <div class="win_left">
                    <a href="#style">外观</a>
                    <a href="#video">视频</a>
                    <a href="#audio">音频</a>
                    <a href="#subtitle">字幕</a>
                    <a href="#about">关于</a>
                </div>
                <div class="win_right">
                    <section id="style">
                        <fieldset>
                            <legend>主题</legend>
                            <label>
                                <input type="radio" name="theme" v-model="themeStore.theme" value="dark"
                                    @change="(e) => themeStore.changeTheme((e.target as HTMLInputElement).value)" />
                                黑夜
                            </label>
                            <label>
                                <input type="radio" name="theme" v-model="themeStore.theme" value="light"
                                    @change="(e) => themeStore.changeTheme((e.target as HTMLInputElement).value)" />
                                白天
                            </label>
                        </fieldset>
                    </section>
                    <section id="video">
                        <fieldset>
                            <legend>视频</legend>
                            <div class="video_info">
                                <div>格式：{{ videoStroe.video_raw_handle('codec_long_name')
                                    }}</div>
                                <div>尺寸：{{ videoStroe.video_raw_handle('coded_width') }} x {{
                                    videoStroe.video_raw_handle('coded_height') }}</div>
                                <div>大小：{{ videoStroe.video_raw_handle('size') }}</div>
                            </div>
                        </fieldset>
                    </section>
                    <section id="audio">
                        <fieldset>
                            <legend>音频</legend>
                            <template v-if="videoStroe.getStream('audio').length > 0">
                                <label v-for="(item, index) in videoStroe.getStream('audio')" :key="item.index">
                                    <input type="radio" name="audio" v-model="videoStroe.audio_info.index"
                                        :value="index" @change="changeAudioStream" />
                                    {{
                                        `stream${index + 1}: ` + audioStreamStr(item)
                                    }}
                                </label>
                            </template>
                            <label v-else>暂无操作</label>
                        </fieldset>
                    </section>
                    <section id="subtitle">
                        <fieldset class="subtitle">
                            <legend>字幕</legend>
                            <div class="subtitle_setting">
                                <template v-if="videoStroe.getStream('subtitle').length > 0">
                                    <label v-for="(item, index) in videoStroe.getStream('subtitle')">
                                        <input type="radio" name="subtitle" :value="index"
                                            v-model="videoStroe.subtitle_info.index"
                                            @change="(e: Event) => videoStroe.changeSubtitleStream((e.target as HTMLInputElement).value)">
                                        {{ `stream${index + 1}: ` + audioStreamStr(item) }}
                                    </label>
                                </template>
                                <label v-else>暂无操作</label>
                                <label>
                                    字体：
                                    <select name="family"
                                        @change="(e: Event) => videoStroe.changeSubtitleStyle((e.target as HTMLSelectElement).value, 'fontFamily')">
                                        <option v-for="item in family" :value="item">{{ item }}</option>

                                    </select>
                                </label>
                                <label>
                                    字号：
                                    <input type="range" min="16" max="60" step="1" :value="videoStroe.getFontSize"
                                        @input="(e: Event) => videoStroe.changeSubtitleStyle((e.target as HTMLInputElement).value, 'fontSize')">
                                    {{ videoStroe.subtitleStyle.fontSize }}
                                </label>

                                <label>
                                    字体颜色：
                                    <input type="color" :value="videoStroe.subtitleStyle.color"
                                        @input="(e: Event) => videoStroe.changeSubtitleStyle((e.target as HTMLInputElement).value, 'color')">
                                    {{ videoStroe.subtitleStyle.color }}
                                </label>

                                <label>
                                    字体粗细：
                                    <input type="range" min="100" max="900" step="100"
                                        :value="videoStroe.subtitleStyle.fontWeight"
                                        @input="(e: Event) => videoStroe.changeSubtitleStyle((e.target as HTMLInputElement).value, 'fontWeight')">
                                    {{ videoStroe.subtitleStyle.fontWeight }}
                                </label>
                                <label>
                                    字体可见度：
                                    <input type="checkbox" :checked="videoStroe.subtitleStyle.visibility === 'visible'"
                                        @input="(e: Event) => videoStroe.changeSubtitleStyle((e.target as HTMLInputElement).checked, 'visibility')">
                                </label>
                                <label>
                                    字体透明度：
                                    <input type="range" min="0" max="1" step="0.1"
                                        @input="(e: Event) => videoStroe.changeSubtitleStyle((e.target as HTMLInputElement).value, 'opacity')">
                                    {{ videoStroe.subtitleStyle.opacity }}
                                </label>
                            </div>
                        </fieldset>
                    </section>
                    <section id="about">
                        <fieldset class="about">
                            <legend>关于</legend>
                            <small>©2025 pointchange <abbr>PCV</abbr> pointchangevideo 仅用于学习与交流</small>
                        </fieldset>
                    </section>
                </div>
            </div>
        </div>
    </dialog>
</template>
<style>
    .title_bar {
        display: flex;
        align-items: center;
        width: 100%;
        height: 31px;
        background-color: var(--theme-dark-window);
        color: var(--theme-dark-window-title);
        -webkit-app-region: drag;
    }

    .title_bar .img_container {
        margin: 0 .6rem;
        width: 1rem;
        height: 1rem;
    }

    .img_container img {
        width: 100%;
        height: 100%;
    }

    .video_option {
        position: fixed;
        top: 0;
        left: 0;
    }

    main {
        position: relative;
        width: 100%;
        height: calc(100% - 30px);
    }

    video {
        width: 100%;
        height: 100%;
    }

    video::cue {
        background-color: v-bind('videoStroe.subtitleStyle.backgroundColor');
        color: v-bind('videoStroe.subtitleStyle.color');
        font-size: v-bind('videoStroe.subtitleStyle.fontSize');
        font-family: v-bind('videoStroe.subtitleStyle.fontFamily');
        font-weight: v-bind('videoStroe.subtitleStyle.fontWeight');
        visibility: v-bind('videoStroe.subtitleStyle.visibility');
        opacity: v-bind('videoStroe.subtitleStyle.opacity');
    }

    .video_control {
        position: absolute;
        bottom: 4rem;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--theme-dark-control-bg);
        color: var(--theme-dark-control-fc);
        box-sizing: border-box;
    }

    .open_list {
        display: flex;
        flex-direction: column;
        justify-content: end;
        /* height: 400px !important; */
    }

    .progress {
        flex: 1;
    }

    .volume_btn {
        text-decoration: line-through 2px solid var(--muted-btn-color);
    }

    .ul {
        flex: 1;
        margin: 0;
        padding: 0;
        overflow-y: auto;
    }

    .search_container {
        display: flex;
        align-items: center;
    }

    .ul input {
        flex: 1;
        font-size: 1.2rem;
    }

    .ul li {
        font-size: 0.8rem;
        list-style: none;
        padding: 1rem .4rem;
    }

    .ul li:hover {
        background-color: var(--theme-dark-control-li-h);
    }

    .li_active {
        background-color: var(--theme-dark-control-li-a);
    }

    audio {
        display: none;
    }

    dialog {
        padding-top: 0;
        width: 600px;
        background-color: var(--theme-dark-dialog-bg);
        border: none;
        box-shadow: 0 0 1rem var(--theme-dark-dialog-fc);
        color: var(--theme-dark-dialog-win-fc);
    }

    .win {
        position: relative;
    }

    dialog .win_container {
        display: flex;
        box-sizing: border-box;
    }

    .win_container .win_right {
        margin-left: 20px;
        width: 100%;
        height: 300px;
        overflow-y: scroll;
    }

    .win_left {
        position: sticky;
        top: 0;
        left: 0;
    }

    .win_left a:hover {
        background-color: var(--theme-dark-dialog-win-nav-bg);
        color: var(--theme-dark-dialog-win-nav-fc);
    }

    .win_left a {
        padding: 1rem;
        display: block;
        color: var(--theme-dark-dialog-win-fc);
        text-decoration: none;
    }

    .subtitle_setting {
        display: grid;
        grid-template-columns: repeat(1, 1fr);
    }

    .setting_title {
        padding: 1rem;
    }

    .win_close {
        width: 2rem;
        height: 2rem;
    }

    .win_close:hover {
        background-color: var(--muted-btn-color);
        color: #fff;
    }

    abbr {
        font-style: italic;
        color: var(--theme-color);
    }
</style>