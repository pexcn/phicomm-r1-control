<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import AppIcon from "../components/AppIcon.vue";
import EmptyState from "../components/EmptyState.vue";
import { connected, notify, send, state, volume } from "../lib/speaker";
import { load, save } from "../lib/storage";

type Preset = { name: string; bands: { id: number; level: number }[] };
const raw = load<unknown>("eq-presets", []);
const saved = ref<Preset[]>(
  Array.isArray(raw)
    ? raw.filter((row) => row && typeof row.name === "string" && Array.isArray(row.bands))
    : [],
);
const presetName = ref("");
const saving = ref(false);
let timer: ReturnType<typeof setTimeout>;
const configured = computed(() => connected.value && state.eq.available);
function command(message: { type: string; [key: string]: unknown }) {
  if (!send(message)) return;
  clearTimeout(timer);
  const session = state.session;
  timer = setTimeout(() => {
    if (session === state.session && connected.value) send({ type: "get_eq_config" });
  }, 400);
}
function enable(event: Event) {
  const control = event.target as HTMLElement & { selected: boolean };
  const next = control.selected;
  control.selected = state.eq.enabled;
  command({ type: "set_eq_enable", enable: next });
}
function savePreset() {
  const name = presetName.value.trim();
  if (!name || !state.eq.bands.length) return;
  const preset = { name, bands: state.eq.bands.map(({ id, level }) => ({ id, level })) };
  const next = [...saved.value.filter((row) => row.name !== name), preset];
  if (!save("eq-presets", next)) {
    notify("浏览器无法保存 EQ，请检查存储权限。");
    return;
  }
  saved.value = next;
  presetName.value = "";
  saving.value = false;
  notify("已保存到本浏览器。");
}
function apply(preset: Preset) {
  const bands = state.eq.bands;
  if (
    preset.bands.length !== bands.length ||
    !preset.bands.every((band) => bands.some((item) => item.id === band.id))
  ) {
    notify("此预设的频段与当前设备不匹配。");
    return;
  }
  if (
    preset.bands.some(
      (band) =>
        !Number.isFinite(band.level) || band.level < state.eq.min || band.level > state.eq.max,
    )
  ) {
    notify("此预设超出当前设备的增益范围。");
    return;
  }
  for (const band of preset.bands)
    command({ type: "set_eq_bandlevel", band: band.id, level: band.level });
}
function remove(name: string) {
  saved.value = saved.value.filter((row) => row.name !== name);
  save("eq-presets", saved.value);
}
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <section class="page sound-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">找到你的声音</p>
        <h1>音效</h1>
        <p class="muted">音量与均衡器，按自己的喜好调整。</p>
      </div>
      <md-outlined-button v-if="connected" @click="send({ type: 'get_eq_config' })"
        ><AppIcon slot="icon" name="refresh" :size="18" />刷新配置</md-outlined-button
      >
    </div>
    <EmptyState v-if="!connected" icon="equalizer" />
    <template v-else
      ><article class="card sound-volume">
        <div>
          <h2>播放音量</h2>
          <p class="hint">设备音量 {{ state.music.volume }} / {{ state.music.maxVolume }}</p>
        </div>
        <div class="volume-row">
          <AppIcon name="volume" /><md-slider
            aria-label="播放音量"
            :min="0"
            :max="state.music.maxVolume"
            :value="state.music.volume"
            @change="volume(Number(($event.target as HTMLInputElement).value))"
          /><strong>{{ Math.round((state.music.volume / state.music.maxVolume) * 100) }}%</strong>
        </div>
      </article>
      <div class="sound-grid">
        <article class="card">
          <div class="section-heading">
            <div>
              <h2>均衡器</h2>
              <p class="hint">设备频段与增益范围实时读取。</p>
            </div>
            <md-switch
              aria-label="启用均衡器"
              :disabled="!configured"
              :selected="state.eq.enabled"
              @change="enable"
            />
          </div>
          <div v-if="!state.eq.available" class="small-empty">
            <AppIcon name="equalizer" :size="36" />
            <p>等待设备返回均衡器配置</p>
            <md-text-button @click="send({ type: 'get_eq_config' })">重新读取</md-text-button>
          </div>
          <template v-else
            ><div v-if="state.eq.presets.length" class="preset-buttons">
              <md-outlined-button
                v-for="preset in state.eq.presets"
                :key="preset.id"
                :disabled="!state.eq.enabled"
                :class="{ active: state.eq.current === preset.id }"
                @click="command({ type: 'set_eq_preset', preset: preset.id })"
                >{{ preset.name }}</md-outlined-button
              >
            </div>
            <div class="eq-bands">
              <div v-for="band in state.eq.bands" :key="band.id" class="eq-band">
                <label>{{
                  band.frequency >= 1000000
                    ? (band.frequency / 1000000).toFixed(1) + " kHz"
                    : Math.round(band.frequency / 1000) + " Hz"
                }}</label
                ><md-slider
                  :id="`eq-band-${band.id}`"
                  :aria-label="`EQ 频段 ${band.id}`"
                  :min="state.eq.min"
                  :max="state.eq.max"
                  :value="band.level"
                  :step="1"
                  :disabled="!state.eq.enabled"
                  @change="
                    command({
                      type: 'set_eq_bandlevel',
                      band: band.id,
                      level: Number(($event.target as HTMLInputElement).value),
                    })
                  "
                /><span>{{ (band.level / 100).toFixed(1) }} dB</span>
              </div>
            </div>
            <div class="card-footer">
              <md-text-button
                :disabled="!state.eq.enabled || !state.eq.bands.length"
                @click="
                  state.eq.bands.forEach((band) =>
                    command({ type: 'set_eq_bandlevel', band: band.id, level: 0 }),
                  )
                "
                >全部归零</md-text-button
              ><md-filled-tonal-button :disabled="!state.eq.bands.length" @click="saving = true"
                ><AppIcon slot="icon" name="plus" :size="18" />保存为预设</md-filled-tonal-button
              >
            </div></template
          >
        </article>
        <article class="card">
          <div class="section-heading">
            <h2>我的预设</h2>
            <AppIcon name="equalizer" />
          </div>
          <div v-if="!saved.length" class="small-empty">
            <p>留住喜欢的声音</p>
            <p class="hint">调整均衡器后，将设置保存到浏览器。</p>
          </div>
          <ul class="simple-list">
            <li v-for="preset in saved" :key="preset.name">
              <div class="track-text">
                <strong>{{ preset.name }}</strong
                ><small>{{ preset.bands.length }} 个频段</small>
              </div>
              <md-text-button :disabled="!configured || !state.eq.enabled" @click="apply(preset)"
                >应用</md-text-button
              ><md-icon-button :aria-label="`删除预设 ${preset.name}`" @click="remove(preset.name)"
                ><AppIcon name="trash" :size="18"
              /></md-icon-button>
            </li>
          </ul>
          <p class="hint">仅应用频段结构与增益范围匹配的预设。</p>
        </article>
      </div>
    </template>
  </section>
  <md-dialog id="eq-preset-dialog" :open="saving" @closed="saving = false" aria-label="保存 EQ 预设"
    ><div slot="headline">保存 EQ 预设</div>
    <div slot="content" class="dialog-content">
      <md-outlined-text-field
        label="预设名称"
        :value="presetName"
        @input="presetName = ($event.target as HTMLInputElement).value"
        @keydown.enter.prevent="savePreset"
        maxlength="40"
      />
      <p class="hint">只保存当前设备返回的已确认增益；同名预设会更新。</p>
    </div>
    <div slot="actions">
      <md-text-button @click="saving = false">取消</md-text-button
      ><md-filled-button :disabled="!presetName.trim()" @click="savePreset">保存</md-filled-button>
    </div></md-dialog
  >
</template>
