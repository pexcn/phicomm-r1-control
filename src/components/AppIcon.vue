<script setup lang="ts">
import music from "@material-symbols/svg-400/outlined/music_note.svg?raw";
import screen from "@material-symbols/svg-400/outlined/desktop_windows.svg?raw";
import equalizer from "@material-symbols/svg-400/outlined/tune.svg?raw";
import bluetooth from "@material-symbols/svg-400/outlined/bluetooth.svg?raw";
import speaker from "@material-symbols/svg-400/outlined/speaker.svg?raw";
import settings from "@material-symbols/svg-400/outlined/settings.svg?raw";
import sun from "@material-symbols/svg-400/outlined/light_mode.svg?raw";
import moon from "@material-symbols/svg-400/outlined/dark_mode.svg?raw";
import plus from "@material-symbols/svg-400/outlined/add.svg?raw";
import close from "@material-symbols/svg-400/outlined/close.svg?raw";
import search from "@material-symbols/svg-400/outlined/search.svg?raw";
import play from "@material-symbols/svg-400/outlined/play_arrow.svg?raw";
import pause from "@material-symbols/svg-400/outlined/pause.svg?raw";
import prev from "@material-symbols/svg-400/outlined/skip_previous.svg?raw";
import next from "@material-symbols/svg-400/outlined/skip_next.svg?raw";
import volume from "@material-symbols/svg-400/outlined/volume_up.svg?raw";
import repeat from "@material-symbols/svg-400/outlined/repeat.svg?raw";
import shuffle from "@material-symbols/svg-400/outlined/shuffle.svg?raw";
import queue from "@material-symbols/svg-400/outlined/queue_music.svg?raw";
import clock from "@material-symbols/svg-400/outlined/timer.svg?raw";
import arrow from "@material-symbols/svg-400/outlined/chevron_right.svg?raw";
import up from "@material-symbols/svg-400/outlined/keyboard_arrow_up.svg?raw";
import down from "@material-symbols/svg-400/outlined/keyboard_arrow_down.svg?raw";
import left from "@material-symbols/svg-400/outlined/chevron_left.svg?raw";
import right from "@material-symbols/svg-400/outlined/chevron_right.svg?raw";
import refresh from "@material-symbols/svg-400/outlined/refresh.svg?raw";
import link from "@material-symbols/svg-400/outlined/link.svg?raw";
import unlink from "@material-symbols/svg-400/outlined/link_off.svg?raw";
import external from "@material-symbols/svg-400/outlined/open_in_new.svg?raw";
import back from "@material-symbols/svg-400/outlined/arrow_back.svg?raw";
import home from "@material-symbols/svg-400/outlined/home.svg?raw";
import menu from "@material-symbols/svg-400/outlined/menu.svg?raw";
import camera from "@material-symbols/svg-400/outlined/photo_camera.svg?raw";
import send from "@material-symbols/svg-400/outlined/send.svg?raw";
import mic from "@material-symbols/svg-400/outlined/mic.svg?raw";
import wifi from "@material-symbols/svg-400/outlined/wifi.svg?raw";
import terminal from "@material-symbols/svg-400/outlined/terminal.svg?raw";
import info from "@material-symbols/svg-400/outlined/info.svg?raw";
import power from "@material-symbols/svg-400/outlined/power_settings_new.svg?raw";
import trash from "@material-symbols/svg-400/outlined/delete.svg?raw";
import check from "@material-symbols/svg-400/outlined/check.svg?raw";
import phone from "@material-symbols/svg-400/outlined/mobile_2.svg?raw";
import download from "@material-symbols/svg-400/outlined/download.svg?raw";

withDefaults(defineProps<{ name: string; size?: number }>(), { size: 24 });
// Only trusted SVGs imported from Material Symbols enter this map.
const icons: Record<string, string> = Object.fromEntries(
  Object.entries({
    music,
    screen,
    equalizer,
    bluetooth,
    speaker,
    settings,
    sun,
    moon,
    plus,
    close,
    search,
    play,
    pause,
    prev,
    next,
    volume,
    repeat,
    shuffle,
    queue,
    clock,
    arrow,
    up,
    down,
    left,
    right,
    refresh,
    link,
    unlink,
    external,
    back,
    home,
    menu,
    camera,
    send,
    mic,
    wifi,
    terminal,
    info,
    power,
    trash,
    check,
    phone,
    download,
  }).map(([name, svg]) => [name, svg.replace(/<svg\b[^>]*>/, "").replace(/<\/svg>\s*$/, "")]),
);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden="true"
    class="app-icon"
    v-html="icons[name] || icons.speaker"
  />
</template>
