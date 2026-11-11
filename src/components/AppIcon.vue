<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 24 });
const paths: Record<string, string> = {
  music:
    "M9 18V5l12-2v13M9 8l12-2M9 18a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Zm12-2a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Z",
  screen: "M3 4h18v13H3zM8 21h8m-4-4v4",
  equalizer: "M5 3v5m0 4v9M2 8h6v4H2zm10-9v11m0 4v3m-3-7h6v4H9zM19 3v3m0 4v11m-3-15h6v4h-6z",
  bluetooth: "m7 7 10 10-5 4V3l5 4L7 17",
  speaker: "M6 3h12v18H6zM10 7h4m2 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  settings:
    "m9 3-1 3-3 1-2 3 2 2-1 3 2 3h3l3 3 3-2 2-3 3-1v-4l-2-2V6l-3-1-2-2Zm6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1m-2 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z",
  moon: "M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  search: "m16 16 5 5m-3-11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  play: "m8 5 11 7-11 7Z",
  pause: "M8 5v14M16 5v14",
  prev: "M5 5v14m14-14L8 12l11 7Z",
  next: "M19 5v14M5 5l11 7-11 7Z",
  volume: "M4 9h4l5-4v14l-5-4H4zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
  repeat: "m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3",
  shuffle: "m17 3 4 4-4 4M3 7h3c4 0 8 10 12 10h3m-4-4 4 4-4 4M3 17h3c2 0 3-2 5-5m2-4 2-1h6",
  queue: "M4 5h16M4 10h16M4 15h9m4-1 5 4-5 4Z",
  clock: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  arrow: "m9 6 6 6-6 6",
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  left: "m15 6-6 6 6 6",
  right: "m9 6 6 6-6 6",
  refresh: "M20 7V2l-4 4M4 17v5l4-4M20 7a9 9 0 0 0-16 3m0 7a9 9 0 0 0 16-3",
  link: "m10 13 4-4m-5 6-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 3 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0",
  unlink: "m3 3 18 18M8 16l-1 1a4 4 0 0 1-6-6l3-3m5-3 1-1a4 4 0 0 1 6 6l-3 3",
  external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
  back: "m15 5-7 7 7 7",
  home: "m3 10 9-7 9 7v11h-6v-7H9v7H3z",
  menu: "M4 6h16M4 12h16M4 18h16",
  camera: "M3 6h4l2-3h6l2 3h4v15H3zm13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  send: "m3 3 19 9-19 9 4-9zm4 9h15",
  mic: "M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0zm-3 7v1a6 6 0 0 0 12 0v-1m-6 7v4m-4 0h8",
  wifi: "M2 8a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0m-10 4a4 4 0 0 1 6 0m-3 4h.01",
  terminal: "m4 5 7 7-7 7m9 0h7",
  info: "M12 11v6m0-10h.01m9 5a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  power: "M12 2v10M6 5a9 9 0 1 0 12 0",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  check: "m4 12 5 5L20 6",
  phone: "M7 2h10v20H7zm3 17h4",
  download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
};
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="app-icon"
  >
    <path :d="paths[name] || paths.speaker" />
  </svg>
</template>
