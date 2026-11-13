// A synthetic device for browser regression; never opens a real connection.
window.mockVersion = 1873;
window.mockSockets = [];
window.WebSocket = class {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;
  readyState = 0;
  sent = [];
  dspEnabled = false;
  audio = {
    bass: { sound_effects_bass_enable: true, Current_Strength: 300 },
    loudness: { sound_effects_loudness_enable: true, Current_Gain: 0 },
    Mixer: { "DAC Digital Volume L": 231, "DAC Digital Volume R": 231 },
  };
  restart = { Auto_restart_device_open: false, Auto_restart_device_time: [3, 0] };
  light = {
    music_light_enable: true,
    music_light_mode: 0,
    music_light_luma: 100,
    music_light_chroma: 4,
    music_light_color: 0x336699,
  };
  preferences = {
    PlayerType: 2,
    Current_PlayerType: 2,
    ExoPlayer_Quality: 1,
    Support_Flac: true,
    music_source: "qq",
    miplay_open: true,
    bluetooth_open: true,
    device_state: 0,
  };
  miPlay = {
    channel: 0,
    queue_target_ms: 800,
    sync_delay_ms: 0,
    running: true,
    diag_valid: true,
    diag_age_ms: 12,
  };
  remoteMiPlay = { channel: 2, queue_target_ms: 900, sync_delay_ms: 20, running: true };
  constructor(url) {
    this.url = url;
    mockSockets.push(this);
    setTimeout(() => {
      if (this.readyState !== 0) return;
      this.readyState = 1;
      this.onopen?.();
    }, 0);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  reply(message) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  send(raw) {
    const message = JSON.parse(raw);
    this.sent.push(message);
    if (message.type === "switch_player" || message.type === "switch_quality") {
      const key = message.type === "switch_player" ? "player" : "quality";
      if (!window.mockPlaybackReject)
        this.preferences[key === "player" ? "PlayerType" : "ExoPlayer_Quality"] = message[key];
      this.reply({
        type: message.type,
        type_id: message.type_id,
        code: window.mockPlaybackReject ? 500 : 200,
        data: { [key]: message[key] },
      });
      return;
    }
    if (message.type === "send_message" && message.what === 65536 && message.arg2 === 4) {
      if (!window.mockSourceUnchanged) this.preferences.music_source = message.obj;
      this.reply({ type: message.type, type_id: message.type_id, code: 200 });
      return;
    }
    if (
      [
        "Set_MiPlay_Open",
        "Set_Bluetooth_Open",
        "Set_DLNA_Open",
        "Set_AirPlay_Open",
        "Set_Service_Normally_Open",
      ].includes(message.type)
    ) {
      const key = {
        Set_MiPlay_Open: "miplay_open",
        Set_Bluetooth_Open: "bluetooth_open",
        Set_DLNA_Open: "dlna_open",
        Set_AirPlay_Open: "airplay_open",
        Set_Service_Normally_Open: "Service_Normally_Open",
      }[message.type];
      this.preferences[key] = message.open;
      this.reply({
        type: message.type,
        type_id: message.type_id,
        code: 200,
        data: { [message.type]: message.open },
      });
      return;
    }
    if (message.type === "send_message" && message.what === 64)
      this.preferences.device_state = message.arg1 === 1 ? 3 : 0;
    if (/^(Get|Set)_MiPlay_(Remote_)?(Diag|Channel|Tuning|Sync_Delay)$/.test(message.type)) {
      const remote = message.type.includes("Remote_");
      const diag = remote ? this.remoteMiPlay : this.miPlay;
      if (message.type.startsWith("Set_") && !window.mockMiPlayUnchanged) {
        const key = message.type.endsWith("Channel")
          ? "channel"
          : message.type.endsWith("Tuning")
            ? "queue_target_ms"
            : "sync_delay_ms";
        diag[key] = key === "channel" ? message.mode : message[key];
      }
      if (window.mockHoldMiPlay && message.type.startsWith("Set_")) return;
      const value = { ...diag };
      if (window.mockMiPlayMissingSync) delete value.sync_delay_ms;
      this.reply({
        type: message.type,
        type_id: message.type_id,
        code: 200,
        data: message.type.startsWith("Get_")
          ? remote
            ? { ip: message.ip, diag: JSON.stringify({ code: 200, data: value }) }
            : value
          : {},
      });
      return;
    }
    if (message.type === "set_bass_enable")
      this.audio.bass.sound_effects_bass_enable = message.enable;
    if (message.type === "set_loudness_enable")
      this.audio.loudness.sound_effects_loudness_enable = message.enable;
    if (message.type === "set_bass_strength") this.audio.bass.Current_Strength = message.strength;
    if (message.type === "set_loudness_gain") this.audio.loudness.Current_Gain = message.gain;
    if (message.type === "setMixerValue" && mockVersion >= 1876)
      this.audio.Mixer[message.controlName] = message.value;
    if (message.type === "send_message" && message.what === 16384 && message.arg1 === 100)
      this.dspEnabled = !!message.obj;
    if (message.type === "Auto_restart_device") {
      this.reply({
        type: message.type,
        type_id: message.type_id,
        code: 200,
        data: window.mockRestartInvalid ? {} : this.restart,
      });
      return;
    }
    if (["set_Auto_restart_device_open", "set_Auto_restart_device_time"].includes(message.type)) {
      const success = !window.mockRestartReject;
      if (success) {
        if (message.type === "set_Auto_restart_device_open")
          this.restart.Auto_restart_device_open = message.open;
        else this.restart.Auto_restart_device_time = JSON.parse(message.times);
      }
      if (window.mockHoldRestart) return;
      this.reply({
        type: message.type,
        type_id: message.type_id,
        code: 200,
        data: { [message.type]: success },
      });
      return;
    }
    if (message.type === "send_message" && message.what === 4) {
      const key = {
        64: "music_light_enable",
        65: "music_light_luma",
        66: "music_light_chroma",
        68: "music_light_mode",
        70: "music_light_color",
      }[message.arg1];
      if (key) this.light[key] = message.arg1 === 64 ? !!message.arg2 : message.arg2;
    }
    const data = {
      get_info: {
        ver: mockVersion,
        u_ver: 1856,
        Unisound: true,
        device_name: "客厅音箱",
        vol: 10,
        play_state: true,
        play_mode: 2,
        dlna_open: true,
        airplay_open: false,
        Service_Normally_Open: true,
        Current_PlayerType: 2,
        ...this.preferences,
        ...(mockVersion < 1887 ? { miplay_open: undefined, bluetooth_open: undefined } : {}),
        ...this.light,
        music_info: {
          id: "mock:track-1",
          title: "夜航",
          artist: "示例歌手",
          album: "城市夜色",
          position: 92000,
          duration: 248000,
        },
      },
      max_vol: 30,
      list: {
        playIndex: 0,
        playList: [
          { id: "track-1", title: "夜航", artist: "示例歌手", duration: 248000 },
          { id: "track-2", title: "晚风", artist: "示例歌手", duration: 236000 },
          { id: "track-3", title: "林间光", artist: "示例歌手", duration: 262000 },
        ],
      },
      get_device_info: {
        nameValuePairs: {
          incremental: "3448",
          elapsedRealtime: 14040000,
          cpuinfo: [0, 0, 0, 22],
          meminfo: "MemTotal: 501760 kB\r\nMemFree: 120000 kB\r\nCached: 60224 kB",
        },
      },
      get_eq_config: {
        ...(window.mockNoEffects ? {} : this.audio),
        Mixer: mockVersion >= 1876 ? this.audio.Mixer : {},
        eq: {
          sound_effects_eq_enable: true,
          Current_Preset: 0,
          Preset_list: [
            { Preset: 0, Name: "Normal" },
            { Preset: 1, Name: "Rock" },
          ],
          Bands: {
            minBandLevel: -1500,
            maxBandLevel: 1500,
            list: [
              { Band: 0, Frequency: 60000, BandLevel: 0 },
              { Band: 1, Frequency: 230000, BandLevel: 200 },
              { Band: 2, Frequency: 910000, BandLevel: 0 },
              { Band: 3, Frequency: 3600000, BandLevel: -100 },
              { Band: 4, Frequency: 14000000, BandLevel: 100 },
            ],
          },
        },
      },
      BT_Device: {
        Enabled: true,
        Scanning: false,
        Bonded_Devices: [{ Name: "书房音箱", Address: "AA:BB:CC:DD:EE:01" }],
        Scan_Devices: [{ Name: "无线耳机", Address: "AA:BB:CC:DD:EE:02" }],
        A2dp_ConnectedDevices: [],
        A2dpSink_ConnectedDevices: [],
      },
    };
    if (message.type in data) {
      setTimeout(
        () =>
          this.reply({
            type: message.type,
            type_id: message.type_id,
            code: 200,
            data: data[message.type],
          }),
        0,
      );
    }
    if (message.type === "shell") {
      if (message.shell.startsWith("setprop persist.route0feture "))
        this.dspEnabled = message.shell.endsWith(" 1");
      if (message.shell.startsWith("echo route0feture:")) {
        this.reply({
          type: "shell",
          type_id: message.type_id,
          code: 200,
          data: window.mockNoDsp
            ? "route0feture: \r\npram:"
            : `route0feture: ${this.dspEnabled ? 1 : 0}\r\npram: >data${this.dspEnabled ? 3 : 2}`,
        });
        return;
      }
      if (message.shell === "stop adbd && start adbd && echo __R1_ADBD_OK__") {
        this.reply({ type: "shell", type_id: message.type_id, code: 200, data: "__R1_ADBD_OK__" });
        return;
      }
      if (message.shell.includes("__R1_LOCAL_BEGIN__")) {
        if (window.mockHoldLocal) return;
        this.reply({
          type: "shell",
          type_id: message.type_id,
          code: 200,
          data:
            "__R1_LOCAL_BEGIN__\r\n" +
            (
              window.mockLocalFiles || [
                "/sdcard/Music/夜航.mp3",
                "/sdcard/Music/子目录/晚风.flac",
                "/sdcard/Music/notes.txt",
              ]
            ).join("\r\n") +
            "\r\n__R1_LOCAL_END__",
        });
        return;
      }
      const shell = {
        "web-system": "3448\r\nPhicomm_R1_12CF\r\n14040.00 30000.00",
        "web-temperature": "60",
        "web-size": "Physical size: 720x480",
      };
      this.reply({
        type: "shell",
        type_id: message.type_id,
        code: 200,
        data: shell[message.type_id] || "",
      });
    }
    if (message.type === "start_screencap" || message.type === "screencap") {
      this.reply({ type: "screencap", code: 200, data: window.mockScreen });
    }
  }
};
