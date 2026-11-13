<script setup lang="ts">
import MaterialState from "../components/MaterialState.vue";
import { computed, ref } from "vue";
import AppIcon from "../components/AppIcon.vue";
import EmptyState from "../components/EmptyState.vue";
import AutoRestartCard from "../components/AutoRestartCard.vue";
import { action, endpoint, flag, formatVersion } from "../lib/protocol";
import {
  connected,
  connectionLabel,
  deviceName,
  disconnect,
  notify,
  requestDevice,
  refresh,
  send,
  state,
} from "../lib/speaker";

const newName = ref("");
const restartingAdbd = ref(false);
async function rebootAdbd() {
  const session = state.session;
  if (
    restartingAdbd.value ||
    !confirm("确定重启 adbd？正在使用的 ADB 连接将短暂中断。") ||
    session !== state.session ||
    !connected.value
  )
    return;
  restartingAdbd.value = true;
  try {
    const reply = await requestDevice({
      type: "shell",
      shell: "stop adbd && start adbd && echo __R1_ADBD_OK__",
    });
    if (session !== state.session) return;
    notify(
      String(reply.data || "")
        .split(/\r?\n/)
        .includes("__R1_ADBD_OK__")
        ? "设备已确认重启 adbd。"
        : "设备未确认 adbd 重启，请检查服务状态。",
    );
  } catch (cause) {
    if (session === state.session) notify((cause as Error).message);
  } finally {
    restartingAdbd.value = false;
  }
}
const tools = [
  { name: "配网向导", path: "upstream/config_wifi/", icon: "wifi" },
  { name: "ADB 控制台", path: "upstream/adb/", icon: "terminal" },
  { name: "设备扫描", path: "upstream/device_scan.html", icon: "search" },
  { name: "原作者经典版", path: "upstream/", icon: "external" },
];
const serviceOptions = [
  { label: "DLNA", key: "dlna_open", type: "Set_DLNA_Open", description: "从局域网设备投放媒体" },
  {
    label: "AirPlay",
    key: "airplay_open",
    type: "Set_AirPlay_Open",
    description: "接收兼容设备的音频投放",
  },
  {
    label: "服务常开",
    key: "Service_Normally_Open",
    type: "Set_Service_Normally_Open",
    description: "保持投放服务在后台运行",
  },
];
const addressLabel = computed(() => {
  try {
    const url = endpoint(state.address);
    return url.host + (url.pathname === "/" ? "" : url.pathname);
  } catch {
    return state.address || "—";
  }
});
function resource(path: string) {
  return new URL(path, document.baseURI).href;
}
function service(event: Event, key: string, type: string) {
  const control = event.target as HTMLElement & { selected: boolean };
  const next = control.selected;
  control.selected = flag(state.info[key]);
  if (send({ type, open: next, type_id: type })) {
    send({ type: "get_info", type_id: "web-info" });
  }
}
function rename() {
  const value = newName.value.trim();
  if (value && send(action(2, 0, 0, value))) {
    newName.value = "";
    notify("已发送名称修改指令。");
    send({ type: "get_info", type_id: "web-info" });
  }
}
function reboot(serviceOnly: boolean) {
  const session = state.session;
  const label = serviceOnly ? "EchoService" : "音箱";
  if (
    confirm(`确定重启${label}？当前连接会中断。`) &&
    session === state.session &&
    connected.value
  ) {
    send(action(1, serviceOnly ? 2 : 1, -1));
    notify(`已发送重启${label}指令。`);
  }
}
</script>

<template>
  <section class="page device-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">一切，尽在掌握</p>
        <h1>设备概览</h1>
        <p class="muted">管理连接、设备状态与投放服务。</p>
      </div>
      <md-outlined-button :disabled="!connected" @click="refresh"
        ><AppIcon slot="icon" name="refresh" :size="18" />刷新信息</md-outlined-button
      >
    </div>
    <EmptyState v-if="!connected" icon="speaker" />
    <template v-else
      ><article class="card device-hero">
        <span class="device-avatar"><AppIcon name="speaker" :size="38" /></span>
        <div class="device-identity">
          <h2>{{ deviceName }}</h2>
          <p class="muted">Phicomm R1 · {{ addressLabel }}</p>
        </div>
        <span class="status-badge"><span class="status-dot"></span>{{ connectionLabel }}</span>
        <div class="hero-actions">
          <md-filled-tonal-button @click="state.connectionDialog = true"
            ><AppIcon slot="icon" name="link" :size="18" />切换连接</md-filled-tonal-button
          ><md-outlined-button @click="disconnect"
            ><AppIcon slot="icon" name="unlink" :size="18" />断开连接</md-outlined-button
          >
        </div>
      </article>
      <div class="stat-grid">
        <article class="card stat">
          <span>固件版本</span><strong>{{ state.system.firmware || "—" }}</strong>
        </article>
        <article class="card stat">
          <span>EchoService</span><strong>{{ formatVersion(state.version) }}</strong>
        </article>
        <article class="card stat">
          <span>CPU</span
          ><strong
            >{{ state.system.cpu === null ? "—" : state.system.cpu + "%"
            }}<small v-if="state.system.temperature">
              · {{ state.system.temperature }}</small
            ></strong
          >
        </article>
        <article class="card stat">
          <span>内存使用</span><strong>{{ state.system.memory || "—" }}</strong>
        </article>
      </div>
      <div class="device-grid">
        <article class="card">
          <div class="section-heading">
            <h2>投放服务</h2>
            <AppIcon name="wifi" />
          </div>
          <div class="service-row" v-for="option in serviceOptions" :key="option.key">
            <div>
              <strong>{{ option.label }}</strong>
              <p class="hint">{{ option.description }}</p>
            </div>
            <md-switch
              :aria-label="option.label"
              :disabled="state.info[option.key] === undefined"
              :selected="flag(state.info[option.key])"
              @change="service($event, option.key, option.type)"
            />
          </div>
          <p class="hint">开关状态以设备回报为准；未上报的服务不可操作。</p>
        </article>
        <div class="device-side">
          <article class="card">
            <div class="section-heading">
              <h2>连接信息</h2>
              <md-text-button @click="state.connectionDialog = true">编辑连接</md-text-button>
            </div>
            <dl class="data-list">
              <div>
                <dt>设备地址</dt>
                <dd>{{ addressLabel }}</dd>
              </div>
              <div>
                <dt>主机名</dt>
                <dd>{{ state.system.hostname || "—" }}</dd>
              </div>
              <div>
                <dt>已运行</dt>
                <dd>{{ state.system.uptime || "—" }}</dd>
              </div>
              <div>
                <dt>Unisound</dt>
                <dd>
                  {{
                    state.info.Unisound ? formatVersion(Number(state.info.u_ver) || null) : "未上报"
                  }}
                </dd>
              </div>
            </dl>
          </article>
          <article class="card">
            <div class="section-heading">
              <h2>设备工具</h2>
              <AppIcon name="terminal" />
            </div>
            <div class="tool-grid">
              <a v-for="tool in tools" :key="tool.path" :href="resource(tool.path)"
                ><MaterialState /><AppIcon :name="tool.icon" :size="20" />{{ tool.name
                }}<AppIcon name="external" :size="14"
              /></a>
            </div>
            <p class="hint">工具打开保留的原作者页面；独立 ADB 需 Android HTML5+ 宿主。</p>
          </article>
        </div>
      </div>
      <AutoRestartCard />
      <details class="card advanced">
        <summary>高级操作<AppIcon name="down" /></summary>
        <div class="advanced-content">
          <form class="rename-form" @submit.prevent="rename">
            <md-outlined-text-field
              label="设备显示名称"
              :value="newName"
              @input="newName = ($event.target as HTMLInputElement).value"
              @keydown.enter.prevent="rename"
              maxlength="40"
            /><md-outlined-button :disabled="!newName.trim()" @click="rename"
              >修改名称</md-outlined-button
            >
          </form>
          <div class="danger-row">
            <div>
              <strong>重启 EchoService</strong>
              <p class="hint">重新启动音箱控制服务，当前连接会中断。</p>
            </div>
            <md-outlined-button @click="reboot(true)">重启服务</md-outlined-button>
          </div>
          <div class="danger-row">
            <div>
              <strong>重启 adbd</strong>
              <p class="hint">重新启动 ADB 调试服务，不重启音箱。</p>
            </div>
            <md-outlined-button :disabled="restartingAdbd" @click="rebootAdbd"
              >重启 adbd</md-outlined-button
            >
          </div>
          <div class="danger-row">
            <div>
              <strong>重启音箱</strong>
              <p class="hint">重新启动整台设备，播放会停止。</p>
            </div>
            <md-outlined-button class="danger-button" @click="reboot(false)"
              >重启音箱</md-outlined-button
            >
          </div>
        </div>
      </details>
    </template>
    <p class="page-footnote">
      独立新版 · <a :href="resource('upstream/')"><MaterialState />原作者参考版</a> ·
      <button @click="state.settingsDialog = true"><MaterialState />设置</button>
    </p>
  </section>
</template>
