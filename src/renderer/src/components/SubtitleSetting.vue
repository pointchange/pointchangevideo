<script setup lang="ts">
    import { useThemeStore } from '@renderer/stores/theme';
    import { NSlider } from 'naive-ui';


    defineProps(['label', 'min', 'max', 'step', 'value']);
    const themeStore = useThemeStore();

</script>
<template>
    <div class="font">
        <span>{{ label }} ：</span>
        <n-slider v-model:value="themeStore[value]" :step="step" :min="min" :max="max" />
    </div>
</template>
<style scoped>
    .font {
        display: flex;
        align-items: center;
    }

    .font .n-slider {
        flex: 1;
    }
</style>