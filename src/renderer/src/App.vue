<script setup lang="ts">
    import { NConfigProvider, NButton, NLayout, NLayoutContent, NLayoutHeader, NLayoutSider, NLayoutFooter, NPageHeader, NIcon, NList, NListItem, NEllipsis, NSlider, NFlex, NRadioGroup, NRadioButton, darkTheme, NInput, NTabs, NTabPane, NDescriptions, NDescriptionsItem, NSpace, NRadio, NSelect, NPopconfirm, NPopover } from 'naive-ui';
    import { Subtract16Regular, AppsList20Regular, SquareMultiple16Regular, Dismiss20Regular, Square20Regular, Speaker228Regular, SpeakerMute28Regular, Play16Filled, Previous20Filled, Next20Filled, Settings16Filled, DocumentAdd16Filled, Pause16Filled, FullScreenMaximize20Regular, Replay20Filled, FullScreenMinimize24Regular } from '@vicons/fluent'
    import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
    import { useVideoStore } from './stores/video';
    import { useThemeStore } from './stores/theme';
    import subtitleSetting from './components/SubtitleSetting.vue';
    const videoStore = useVideoStore();

    let isPlaying = ref(false);
    const videoRef = ref<HTMLVideoElement | null>(null);
    const audioRef = ref<HTMLAudioElement | null>(null);

    let isVideoHardwareDecode = ref(false);
    let isVSync = ref(false);
    let isASync = ref(false);
    async function canplayHandle(e: Event) {
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
            if (videoStore.save.readSave) {
                videoStore.save.readSave = false;
                progressChange(videoStore.save.video_info.currentTime);
            }
        }
    })
    let subtitleTextRow = ref(['']);
    function cuechangeHandle(e: Event) {
        let cues = (e.target as HTMLTrackElement).track.activeCues;
        if (cues && cues.hasOwnProperty('0')) {
            subtitleTextRow.value = (cues['0'] as VTTCue).text.split('\n')
        } else {
            subtitleTextRow.value = [''];
        }
    }
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

    let progress = ref(0);
    function timeupdate(e: Event) {
        if (isVideoHardwareDecode.value) {
            progress.value = (e.target as HTMLVideoElement).currentTime;
        } else {
            progress.value = videoStore.video_info.currentTime + (e.target as HTMLVideoElement).currentTime
        }
        videoStore.changeCurrentTime(progress.value);
    }

    let isShowList = ref(true);
    function openList() {
        isShowList.value = true;
        themeStore.isOpenSetting = false;
        themeStore.isOpenList = !themeStore.isOpenList;

    }
    function openSetting() {
        isShowList.value = false;
        themeStore.isOpenList = false;
        themeStore.isOpenSetting = !themeStore.isOpenSetting;
    }

    function videoClick() {
        themeStore.isOpenSetting = themeStore.isOpenList = false;
    }

    let isMuted = ref(false);
    let volume = ref(100);
    function volumeChange(v: number) {
        if (volume.value > 0) {
            isMuted.value = false;
            if (audioRef.value) {
                audioRef.value.volume = v;
            }
        } else {
            isMuted.value = true;
        }
    }
    async function openFile() {
        const res = await window.electron.ipcRenderer.invoke('on-open-file');
        if (Array.isArray(res)) {
            if (res.length > 0) {
                videoStore.list = res.map(v => {
                    v.isPlaying = false;
                    return v;
                })
            }
        }
    }
    const trackRef = ref<HTMLTrackElement | null>(null);
    let isSwitch = ref(false);
    function playCurrentVideo(path: string, name: string) {
        subtitleTextRow.value = [''];
        isSwitch.value = !isSwitch.value
        isASync.value = isVSync.value = false;
        videoStore.playCurrentVideo(path, name);
        videoStore.video_info.currentTime = 0;
    }
    function progressChange(v: number) {
        isASync.value = isVSync.value = false;
        if (videoRef.value) {
            if (isVideoHardwareDecode.value) {
                videoRef.value.currentTime = v;
            } else {
                videoStore.video_info.src = videoStore.videoProtocol + videoStore.video_info.path + `?type=video&&start=${v}`;
                videoStore.video_info.currentTime = v;
            }
        }
        if (audioRef.value) {
            if (isAudioHardwareDecode.value) {
                audioRef.value.currentTime = v;
            } else {
                videoStore.audio_info.src = videoStore.videoProtocol + videoStore.video_info.path + `?type=audio&&start=${v}&&index=${videoStore.audio_info.index}&&streamIndex=${videoStore.audio_info.streamIndex}`;
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

    function preHandle() {
        subtitleTextRow.value = [''];
        isASync.value = isVSync.value = false;
        videoStore.pre();
    }
    function nextHandle() {
        subtitleTextRow.value = [''];
        isASync.value = isVSync.value = false;
        videoStore.next();
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
    //setting
    let keyword = ref('');
    const theme = [
        {
            value: 'dark',
            label: '黑夜'
        },
        {
            value: 'light',
            label: '白天'
        },
    ]
    const themeStore = useThemeStore();
    function changeAudioStream(v: string | number | boolean) {
        isASync.value = false;
        play();
        if (videoRef.value) {
            videoStore.changeAudioStream(Number(v), videoRef.value.currentTime);
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
    function openFilePath(path: string) {
        window.electron.ipcRenderer.send('on-open-file-path', path);
    }
    function keyupHandler(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === 'Escape') {
            fullVideoHandle()
        }
        if (e.key.trim() === '' && videoStore.video_info.src !== '') {
            play()
        }
        // if (e.key === 'ArrowUp') {

        // }
        // if (e.key === 'ArrowDown') {

        // }
        if (e.key === 'ArrowLeft') {
            backSecondHandle()
        }
        if (e.key === 'ArrowRight') {
            forwardSecondHandle()
        }
    }

    function update(event: MouseEvent) {
        if (isFullVideo.value) {
            if (event.pageY < 30 || event.pageY > window.innerHeight - 82 || event.pageX > window.innerWidth - 272) {
                isHidden.value = false;
                themeStore.isOpenList = themeStore.isOpenSetting = !isHidden.value;

            } else {
                isHidden.value = true;
                themeStore.isOpenList = themeStore.isOpenSetting = !isHidden.value;

            }
        }
    }

    onUnmounted(() => {
        window.removeEventListener('keyup', keyupHandler);
        window.removeEventListener('mousemove', update)
    })

    onMounted(() => {
        window.addEventListener('keyup', keyupHandler);
        window.addEventListener('mousemove', update)
        window.electron.ipcRenderer.on('on-sava-current-video', (_e, bool) => {
            if (bool) {
                videoStore.saveHandle();
                videoStore.save.video_info.currentTime = videoRef.value?.currentTime;
            }
        })

    })
    //header-win

    function closeAppHandler() {
        window.electron.ipcRenderer.send('on-close-win');
    }
    let isFullWinScreen = ref(false);
    function fullScreenHandler() {
        isFullWinScreen.value = !isFullWinScreen.value;
        window.electron.ipcRenderer.send('on-fullScreen-win', isFullWinScreen.value);
    }

    function minimizableHandler() {
        window.electron.ipcRenderer.send('on-minimizable-win');
    }
    let isFullVideo = ref(false);
    let isHidden = ref(false);
    const layoutTopAndBottom = computed(() => isHidden.value ? { top: 0, bottom: 0 } : { top: '30px', bottom: '82px' });
    const videoHeight = computed(() => isHidden.value ? { height: '100%' } : { height: 'calc(100% - 12px)' });
    function fullVideoHandle() {
        isFullVideo.value = !isFullVideo.value;
        isHidden.value = isFullVideo.value;
        themeStore.isOpenList = themeStore.isOpenSetting = !isHidden.value;
        window.electron.ipcRenderer.send('on-fullScreen-win-bar', isFullVideo.value);
    }

    let fontFamily = ref('');
    const fontFamilyOptions = [
        {
            label: 'inherit',
            value: 'inherit'
        },
        {
            label: 'serif',
            value: 'serif'
        },
        {
            label: 'sans-serif',
            value: 'sans-serif'
        },
        {
            label: 'monospace',
            value: 'monospace'
        },
        {
            label: 'fantasy',
            value: 'fantasy'
        },
        {
            label: 'system-ui',
            value: 'system-ui'
        },
        {
            label: 'cursive',
            value: 'cursive'
        },
        {
            label: 'emoji',
            value: 'emoji'
        },
        {
            label: 'math',
            value: 'math'
        },
        {
            label: 'fangsong',
            value: 'fangsong'
        },
    ];

    const subtitleSlider = [
        {
            label: '字号',
            min: 16,
            max: 60,
            step: 1,
            value: 'fontSize'
        },
        {
            label: '字粗',
            min: 100,
            max: 1000,
            step: 100,
            value: 'fontWeight'
        },
        {
            label: '透明度',
            min: 0,
            max: 1,
            step: .1,
            value: 'opacity'
        },
        {
            label: '距离下边',
            min: 0,
            max: 100,
            step: 1,
            value: 'bottom'
        },
        {
            label: '距离左边',
            min: 0,
            max: 100,
            step: 1,
            value: 'left'
        },
    ];
    function audioError(_e) {
        // console.log(e);
    }
    function videoError(_e) {
        // console.log('video', e);
    }
    function replayHandle() {
        videoStore.readSave();
    }
    function recoverAll() {
        videoStore.$reset();
        themeStore.$reset();
        subtitleTextRow.value = [''];
        progress.value = 0;
    }

</script>
<template>
    <n-config-provider style="height: 100%" :theme="themeStore.theme === 'dark' ? darkTheme : null">
        <n-layout style="height: 100%">
            <n-layout-header v-show="!isHidden" bordered class="layout_header">
                <n-page-header :subtitle="videoStore.video_info.title">
                    <template #avatar>
                        <img src="../public/favicon.ico" alt="pointchangevideo">
                    </template>
                    <template #extra class="no_darg">
                        <div class="no_darg">
                            <n-popover trigger="hover" :show-arrow="false">
                                <template #trigger>
                                    <n-button quaternary size="small" @click="fullVideoHandle">
                                        <template #icon>
                                            <n-icon>
                                                <FullScreenMaximize20Regular v-show="!isFullVideo" />
                                                <FullScreenMinimize24Regular v-show="isFullVideo" />
                                            </n-icon>
                                        </template>
                                    </n-button>
                                </template>
                                <span>{{ !isFullVideo ? '全屏' : '退出全屏' }}</span>
                            </n-popover>
                            <n-popover trigger="hover" :show-arrow="false">
                                <template #trigger>
                                    <n-button quaternary size="small" @click="minimizableHandler">
                                        <template #icon>
                                            <n-icon>
                                                <Subtract16Regular />
                                            </n-icon>
                                        </template>
                                    </n-button>
                                </template>
                                <span>最小化</span>
                            </n-popover>
                            <n-popover trigger="hover" :show-arrow="false">
                                <template #trigger>
                                    <n-button quaternary size="small" @click="fullScreenHandler">
                                        <template #icon>
                                            <n-icon>
                                                <Square20Regular v-show="!isFullWinScreen" />
                                                <SquareMultiple16Regular v-show="isFullWinScreen" />
                                            </n-icon>
                                        </template>
                                    </n-button>
                                </template>
                                <span>{{ !isFullWinScreen ? '最大化' : '恢复' }}</span>
                            </n-popover>
                            <n-popover trigger="hover" :show-arrow="false">
                                <template #trigger>
                                    <n-button quaternary size="small" @click="closeAppHandler">
                                        <template #icon>
                                            <n-icon>
                                                <Dismiss20Regular />
                                            </n-icon>
                                        </template>
                                    </n-button>
                                </template>
                                <span>关闭</span>
                            </n-popover>
                        </div>
                    </template>
                </n-page-header>
            </n-layout-header>
            <n-layout position="absolute" :style="layoutTopAndBottom" has-sider sider-placement="right">
                <n-layout-content>
                    <audio ref="audioRef" :src="videoStore.audio_info.src" @canplay="audioLoadedmetadata"
                        :muted="isMuted" @error="audioError"></audio>
                    <div class="video_container" :style="videoHeight">
                        <video style="display: block;" crossorigin="anonymous" ref="videoRef"
                            :src="videoStore.video_info.src" @canplay="canplayHandle" @timeupdate="timeupdate"
                            @click.stop="videoClick" @play="playHandle" @pause="pauseHandle" muted @dblclick="play"
                            @ended="() => videoStore.next()" @error="videoError">
                            <track ref="trackRef" default :src="videoStore.subtitle_info.src"
                                @cuechange="cuechangeHandle" />
                        </video>

                        <div class="subtitle" :style="{
                            fontFamily,
                            fontSize: themeStore.fontSize + 'px',
                            fontWeight: themeStore.fontWeight,
                            opacity: themeStore.opacity,
                            left: themeStore.left + '%',
                            bottom: themeStore.bottom + '%',
                        }">
                            <div v-for="item in subtitleTextRow"> {{ item }} </div>
                        </div>
                    </div>
                </n-layout-content>
                <n-layout-sider bordered v-show="isShowList" collapse-mode="transform"
                    :collapsed="!themeStore.isOpenList" :collapsed-width="0" :native-scrollbar="false">
                    <n-list hoverable clickable>
                        <template #header>
                            <n-input v-model:value="keyword" type="text" placeholder="搜 索" clearable />
                        </template>
                        <n-list-item v-for="item in videoStore.getList(keyword)" :style="{
                            'background-color': item.isPlaying ? 'var(--n-merged-color-hover)' : ''
                        }" :key="item.path" @dblclick="playCurrentVideo(item.path, item.name)">
                            <n-ellipsis style="max-width: 240px"> {{ item.name }} </n-ellipsis>
                        </n-list-item>
                    </n-list>
                </n-layout-sider>
                <n-layout-sider bordered v-show="!isShowList" collapse-mode="transform"
                    :collapsed="!themeStore.isOpenSetting" :collapsed-width="0" :native-scrollbar="false">
                    <n-flex justify="space-between">
                        <span>设置</span>
                        <n-button quaternary size="tiny" @click="() => themeStore.isOpenSetting = false">
                            <template #icon>
                                <n-icon>
                                    <Dismiss20Regular />
                                </n-icon>
                            </template>
                        </n-button>
                    </n-flex>
                    <n-tabs type="line" animated size="small">
                        <n-tab-pane name="theme" tab="主题">
                            <n-space vertical>
                                <n-radio-group v-model:value="themeStore.theme" name="theme">
                                    <n-radio-button v-for="item in theme" :key="item.value" :value="item.value"
                                        :label="item.label" />
                                </n-radio-group>
                                <n-popconfirm @positive-click="recoverAll">
                                    <template #trigger>
                                        <n-button>恢复所有配置</n-button>
                                    </template>
                                    一切都将恢复，请谨慎操作。
                                </n-popconfirm>
                            </n-space>

                        </n-tab-pane>
                        <n-tab-pane name="video" tab="视频">
                            <template v-if="videoStore.video_info.currentStream">
                                <n-descriptions label-placement="left" :column="1">
                                    <n-descriptions-item label="格式">
                                        <div style="width: 80%; white-space: normal;">
                                            {{ videoStore.video_info.currentStream.codec_long_name
                                            }}
                                        </div>
                                    </n-descriptions-item>
                                    <n-descriptions-item label="尺寸">
                                        {{ videoStore.video_info.currentStream.coded_width }} x {{
                                            videoStore.video_info.currentStream.coded_height }}
                                    </n-descriptions-item>
                                    <n-descriptions-item label="大小">
                                        {{ videoStore.video_raw.format.size
                                        }}
                                    </n-descriptions-item>
                                    <n-descriptions-item label="位置">
                                        <!-- <div class="file_btn"
                                            @click="openFilePath(videoStore.video_raw.format.filename)">
                                            {{ videoStore.video_raw.format.filename
                                            }}
                                        </div> -->
                                        <n-button @click="openFilePath(videoStore.video_raw.format.filename)">
                                            打开文件位置
                                        </n-button>
                                    </n-descriptions-item>
                                </n-descriptions>
                            </template>
                            <template v-else>
                                暂无视频信息
                            </template>
                        </n-tab-pane>
                        <n-tab-pane name="audio" tab="音频">
                            <n-space vertical>
                                <template v-if="videoStore.getStream('audio').length > 0">
                                    <n-radio-group v-model:value="videoStore.audio_info.index" name="audioGroup"
                                        @update:value="changeAudioStream">
                                        <n-space vertical>
                                            <n-radio v-for="(song, index) in videoStore.getStream('audio')"
                                                :key="song.index" :value="index">
                                                {{
                                                    `stream${index + 1}: ` + audioStreamStr(song)
                                                }}
                                            </n-radio>
                                        </n-space>
                                    </n-radio-group>
                                    <n-descriptions label-placement="left" bordered :column="1">
                                        <n-descriptions-item label="编码">
                                            <div style="text-wrap: wrap;">
                                                {{
                                                    videoStore.audio_info.currentStream.codec_long_name
                                                }}
                                            </div>
                                        </n-descriptions-item>
                                        <n-descriptions-item label="采样率">
                                            <div style="text-wrap: wrap;">
                                                {{
                                                    videoStore.audio_info.currentStream.sample_rate
                                                }}
                                            </div>
                                        </n-descriptions-item>
                                        <n-descriptions-item label="比特率">
                                            <div style="text-wrap: wrap;">
                                                {{
                                                    videoStore.audio_info.currentStream.bit_rate
                                                }}
                                            </div>
                                        </n-descriptions-item>
                                    </n-descriptions>
                                </template>
                                <label v-else>暂无操作</label>
                            </n-space>
                        </n-tab-pane>
                        <n-tab-pane name="subtitle" tab="字幕">
                            <template v-if="videoStore.getStream('subtitle').length > 0">
                                <n-space vertical>
                                    <n-radio-group v-model:value="videoStore.subtitle_info.index" name="subtitleGroup"
                                        @update:value="videoStore.changeSubtitleStream">
                                        <n-space vertical>
                                            <n-radio v-for="(subtitle, index) in videoStore.getStream('subtitle')"
                                                :key="subtitle.index" :value="index">
                                                {{
                                                    `stream${index + 1}: ` + audioStreamStr(subtitle)
                                                }}
                                            </n-radio>
                                        </n-space>
                                    </n-radio-group>
                                    <n-select placeholder="选择字体" v-model:value="fontFamily"
                                        :options="fontFamilyOptions" />
                                    <subtitleSetting v-for="item in subtitleSlider" v-bind="item" :key='item.value' />
                                    <n-button @click="() => themeStore.$reset()">恢复主题配置</n-button>
                                </n-space>
                            </template>
                            <label v-else>暂无操作</label>
                        </n-tab-pane>
                    </n-tabs>
                </n-layout-sider>
            </n-layout>
            <n-layout-footer v-show="!isHidden" bordered position="absolute" style="bottom: 0;left: 0;">
                <n-page-header>
                    <template #header>
                        <div class="footer_top">
                            <div class="progress df_center">
                                <div class="timer">{{ videoStore.video_info.currentTimeStr }}</div>
                                <n-slider :tooltip="false" v-model:value="progress" :min="0"
                                    :max="videoStore.video_info.duration" @update:value="progressChange" />
                                <div class="timer">{{ videoStore.video_info.durationStr }}</div>
                            </div>

                            <div class="volumn df_center">
                                <n-icon class="volumn_icon" @click="isMuted = !isMuted">
                                    <Speaker228Regular v-show="!isMuted" />
                                    <SpeakerMute28Regular v-show="isMuted" />
                                </n-icon>
                                <n-slider v-model:value="volume"
                                    :format-tooltip="(value: number) => parseInt(String(value * 100)) + '%'" :min="0"
                                    :max="1" :step="0.05" @update:value="volumeChange" />
                            </div>
                        </div>
                    </template>
                    <template #title>
                        <n-popover trigger="hover" :show-arrow="false">
                            <template #trigger>
                                <n-button quaternary :disabled="videoStore.video_info.path === ''" @click="play">
                                    <template #icon>
                                        <n-icon>
                                            <Play16Filled v-show="!isPlaying" />
                                            <Pause16Filled v-show="isPlaying" />
                                        </n-icon>
                                    </template>
                                </n-button>
                            </template>
                            <span>{{ !isPlaying ? '播放' : '暂停' }}</span>
                        </n-popover>
                        <n-popover trigger="hover" :show-arrow="false">
                            <template #trigger>
                                <n-button quaternary :disabled="videoStore.video_info.path === ''"
                                    @click.left="backSecondHandle" @click.right="preHandle">
                                    <template #icon>
                                        <n-icon>
                                            <Previous20Filled />
                                        </n-icon>
                                    </template>
                                </n-button>
                            </template>
                            <span>L:后退 / R:上一个</span>
                        </n-popover>
                        <n-popover trigger="hover" :show-arrow="false">
                            <template #trigger>
                                <n-button quaternary :disabled="videoStore.video_info.path === ''"
                                    @click.left="forwardSecondHandle" @click.right="nextHandle">
                                    <template #icon>
                                        <n-icon>
                                            <Next20Filled />
                                        </n-icon>
                                    </template>
                                </n-button>
                            </template>
                            <span>L:快进 / R:下一个</span>
                        </n-popover>
                        <n-popover trigger="hover" :show-arrow="false">
                            <template #trigger>
                                <n-button text style="font-size: 24px;" :disabled="videoStore.video_info.path !== ''"
                                    @click="replayHandle">
                                    <template #icon>
                                        <n-icon>
                                            <Replay20Filled />
                                        </n-icon>
                                    </template>
                                </n-button>
                            </template>
                            <span>记录</span>
                        </n-popover>
                    </template>
                    <template #extra>
                        <n-popover trigger="hover" :show-arrow="false">
                            <template #trigger>
                                <n-button quaternary @click="openFile">
                                    <template #icon>
                                        <n-icon>
                                            <DocumentAdd16Filled />
                                        </n-icon>
                                    </template>
                                </n-button>
                            </template>
                            <span>打开文件</span>
                        </n-popover>

                        <n-popover trigger="hover" :show-arrow="false">
                            <template #trigger>
                                <n-button quaternary class="no_darg" @click="openList">
                                    <template #icon>
                                        <n-icon>
                                            <AppsList20Regular />
                                        </n-icon>
                                    </template>
                                </n-button>
                            </template>
                            <span>列表</span>
                        </n-popover>
                        <n-popover trigger="hover" :show-arrow="false">
                            <template #trigger>
                                <n-button quaternary @click="openSetting">
                                    <template #icon>
                                        <n-icon>
                                            <Settings16Filled />
                                        </n-icon>
                                    </template>
                                </n-button>
                            </template>
                            <span>设置</span>
                        </n-popover>


                    </template>
                </n-page-header>
            </n-layout-footer>
        </n-layout>
    </n-config-provider>
</template>
<style>
    .layout_header {
        -webkit-app-region: drag;
    }

    .no_darg {
        -webkit-app-region: no-drag;
    }

    .n-layout-content .n-layout-scroll-container {
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: #000 !important;
    }

    /* .main, */
    .video_container {
        /* height: calc(100% - 6rem); */
        /* height: v-bind(videoHeight); */

    }

    .video_container {
        position: relative;
    }

    video {
        width: 100%;
        height: 100%;
    }

    video::cue {
        visibility: hidden;
    }

    .subtitle {
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-size: 1.4rem;
        font-weight: bolder;
        color: #fff;
    }


    .footer_top {
        display: flex;
        align-items: center;
        box-sizing: border-box;
    }

    .progress {
        flex: 1;
    }

    .progress .timer {
        margin: 0 1rem;
    }

    .volumn {
        margin-right: 1rem;
        width: 200px;
    }

    .volumn .volumn_icon {
        margin-right: .4rem;
        cursor: pointer;
    }

    .n-page-header-header {
        margin: 0;
        padding: .8rem 0;
    }

    .file_btn {
        width: 80%;
        white-space: normal;
    }

    .file_btn:hover {
        text-decoration: underline;
        cursor: pointer;
    }

</style>