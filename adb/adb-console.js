class AsyncLock {
  constructor() {
    ((this.locked = !1), (this.queue = []));
  }
  acquire() {
    return new Promise((e) => {
      this.locked
        ? this.queue.push(e)
        : ((this.locked = !0), e(this.release.bind(this)));
    });
  }
  release() {
    this.queue.length > 0
      ? this.queue.shift()(this.release.bind(this))
      : (this.locked = !1);
  }
}
const adbUrls = [
    "http://r1.wxfsq.com/adb/files/adb_32.zip",
    "http://r1.wxfsq.com/adb/files/adb_64.zip",
  ],
  ADBConsole = {
    isConnected: !1,
    adb: "",
    adbUrl: "",
    adbPath: "_doc/adb",
    adbCache: "",
    currentDevice: null,
    devices: [],
    currentDirectory: "/sdcard/",
    selectedFile: null,
    selectedApp: null,
    commandHistory: [],
    historyIndex: -1,
    isInShellMode: !1,
    connectionType: "wifi",
    currentProcess: null,
    reconnectDeviceLock: new AsyncLock(),
    apps: { all: [], enable: [], disabled: [] },
    init: function () {
      (this.updateStatus("等待ADB初始化", "disconnected"),
        document.addEventListener("plusready", this.onPlusReady.bind(this)),
        document
          .getElementById("deviceSelect")
          .addEventListener("change", (e) => {
            if (!e.target.value) return;
            this.isConnected = !1;
            const t = e.target.value;
            t &&
              (this.printConsole(`已选择设备: ${t}`, "info"),
              isNetworkDevice(t) &&
                (document.getElementById("ipAddress").value.length ||
                  (document.getElementById("ipAddress").value = t)),
              this.connectionCheck(t, (e, t) => {
                e
                  ? this.printConsole("切换设备成功", "info")
                  : this.printConsole(`切换设备失败: ${t}`, "error");
              }));
          }),
        document.querySelectorAll(".tab").forEach((e) => {
          "connectionTabContainer" === e.parentNode.id
            ? ("usb" === e.getAttribute("data-tab") &&
                (e.style.display = "none"),
              e.addEventListener("click", (e) => {
                (e.target.parentNode
                  .querySelectorAll(".active")
                  .forEach((e) => e.classList.remove("active")),
                  e.target.classList.add("active"),
                  (this.connectionType = e.target.getAttribute("data-tab")),
                  (document.getElementById("wifiSettings").style.display =
                    "wifi" === this.connectionType ? "block" : "none"));
              }),
              e.getAttribute("data-tab") == this.connectionType && e.click())
            : e.addEventListener("click", (t) => {
                if (
                  !this.isConnected &&
                  "console" != t.target.getAttribute("data-tab")
                )
                  return this.printConsole("请先连接设备", "error");
                (t.target.parentNode
                  .querySelectorAll(".tab")
                  .forEach((e) => e.classList.remove("active")),
                  t.target.classList.add("active"),
                  document
                    .querySelectorAll(".tab-content")
                    .forEach((e) => e.classList.remove("active")),
                  document
                    .getElementById(e.getAttribute("data-tab") + "Tab")
                    .classList.add("active"));
              });
        }));
      const e = document.getElementById("consoleInput");
      let t;
      (e.addEventListener("keydown", (t) => {
        if ("Enter" === t.key) {
          t.preventDefault();
          const s = e.value.trim();
          if (s)
            return (
              this.isInShellMode
                ? this.executeShellCommand(s)
                : this.executeCommand(s),
              (e.value = ""),
              !1
            );
        } else {
          if ("ArrowUp" === t.key)
            return (t.preventDefault(), this.navigateHistory(-1), !1);
          if ("ArrowDown" === t.key)
            return (t.preventDefault(), this.navigateHistory(1), !1);
        }
      }),
        document
          .getElementById("clearConsoleBtn")
          .addEventListener("click", () => {
            ((document.getElementById("consoleOutput").innerHTML = ""),
              this.printConsole("控制台已清空", "info"));
          }),
        document.getElementById("connectBtn").addEventListener("click", () => {
          this.connect();
        }),
        document
          .getElementById("disconnectBtn")
          .addEventListener("click", () => {
            this.disconnect();
          }),
        document
          .getElementById("refreshDevicesBtn")
          .addEventListener("click", (e) => {
            this.discoverDevices();
          }),
        document
          .getElementById("rebootDeviceBtn")
          .addEventListener("click", () => {
            this.rebootDevice();
          }),
        document
          .getElementById("refreshDeviceInfoBtn")
          .addEventListener("click", () => {
            this.getDeviceInfo();
          }),
        document.getElementById("shellBtn").addEventListener("click", () => {
          this.isConnected
            ? this.isInShellMode
              ? this.exitShellMode()
              : this.enterShellMode()
            : this.printConsole("请先连接设备", "error");
        }),
        document
          .getElementById("refreshFilesBtn")
          .addEventListener("click", () =>
            this.listFiles(this.currentDirectory),
          ),
        document
          .getElementById("createFolderBtn")
          .addEventListener("click", () => this.createFolder()),
        document
          .getElementById("homeBtn")
          .addEventListener("click", () => this.goHomeDirectory()),
        document
          .getElementById("installFileAppBtn")
          .addEventListener("click", () => {
            if (this.selectedFile) {
              const e = this.selectedFile.getAttribute("data-path");
              (this.printConsole("正在检查应用安装权限...", "info"),
                this.showProgress("file", "正在检查应用安装权限...", -1),
                this.executeAdbCommand(
                  "shell settings get secure install_non_market_apps",
                  (t, s) => {
                    "1" != t
                      ? this.executeAdbCommand(
                          "shell settings put secure install_non_market_apps 1",
                          (t, s) => {
                            this.installAppWithProgress(e, 1);
                          },
                        )
                      : this.installAppWithProgress(e, 1);
                  },
                ),
                this.closeFileActionModal());
            }
          }),
        document
          .getElementById("uploadFileBtn")
          .addEventListener("click", () => this.uploadFile()),
        document
          .getElementById("downloadFileBtn")
          .addEventListener("click", () => {
            this.selectedFile &&
              (this.downloadFile(), this.closeFileActionModal());
          }),
        document
          .getElementById("deleteFileBtn")
          .addEventListener("click", () => {
            this.selectedFile &&
              (this.deleteFile(), this.closeFileActionModal());
          }),
        document
          .getElementById("ReNameFileBtn")
          .addEventListener("click", () => {
            this.selectedFile &&
              (this.reNameFile(), this.closeFileActionModal());
          }),
        document
          .getElementById("SetFilePermissionBtn")
          .addEventListener("click", () => {
            this.selectedFile &&
              (this.setFilePermission(), this.closeFileActionModal());
          }),
        document
          .getElementById("refreshAppsBtn")
          .addEventListener("click", () => {
            ((document.getElementById("appSearch").value = ""),
              this.listApps("", !0));
          }),
        document
          .getElementById("installAppBtn")
          .addEventListener("click", () => this.installApp()),
        document
          .getElementById("appSearch")
          .addEventListener("input", (e) => this.filterApps(e.target.value)),
        document
          .getElementById("enableAppBtn")
          .addEventListener("click", () => {
            this.selectedApp &&
              (this.enableApp(
                this.selectedApp.packageName,
                this.selectedApp.appName,
              ),
              this.closeAppActionModal());
          }),
        document
          .getElementById("disabledAppBtn")
          .addEventListener("click", () => {
            this.selectedApp &&
              (this.disabledApp(
                this.selectedApp.packageName,
                this.selectedApp.appName,
              ),
              this.closeAppActionModal());
          }),
        document
          .getElementById("unHideAppBtn")
          .addEventListener("click", () => {
            this.selectedApp &&
              (this.unHideApp(
                this.selectedApp.packageName,
                this.selectedApp.appName,
              ),
              this.closeAppActionModal());
          }),
        document.getElementById("hideAppBtn").addEventListener("click", () => {
          this.selectedApp &&
            (this.hideApp(
              this.selectedApp.packageName,
              this.selectedApp.appName,
            ),
            this.closeAppActionModal());
        }),
        document.getElementById("clearAppBtn").addEventListener("click", () => {
          this.selectedApp &&
            (this.clearApp(
              this.selectedApp.packageName,
              this.selectedApp.appName,
            ),
            this.closeAppActionModal());
        }),
        document
          .getElementById("uninstallAppBtn")
          .addEventListener("click", () => {
            this.selectedApp &&
              (this.uninstallApp(
                this.selectedApp.packageName,
                this.selectedApp.appName,
              ),
              this.closeAppActionModal());
          }),
        document.querySelectorAll(".close").forEach((e) => {
          "fileActionClose" === e.id
            ? e.addEventListener("click", () => this.closeFileActionModal())
            : "appActionClose" === e.id &&
              e.addEventListener("click", () => this.closeAppActionModal());
        }),
        window.addEventListener("click", (e) => {
          "fileActionModal" === e.target.id
            ? this.closeFileActionModal()
            : "appActionModal" === e.target.id && this.closeAppActionModal();
        }),
        document
          .getElementById("fileBrowser")
          .addEventListener("click", (e) => {
            const t = e.target.closest(".file-item");
            if (t) {
              const e = t.getAttribute("data-path");
              if ("true" === t.getAttribute("data-dir"))
                ((this.currentDirectory = e),
                  (document.getElementById("currentPath").value = e),
                  this.listFiles(e));
              else {
                this.selectedFile = t;
                const e = this.selectedFile
                  .getAttribute("data-path")
                  .split("/")
                  .filter((e) => e)
                  .pop();
                (e.toLowerCase().endsWith(".apk") ||
                e.toLowerCase().endsWith(".apk.1")
                  ? (document.getElementById(
                      "installFileAppBtn",
                    ).style.display = "")
                  : (document.getElementById(
                      "installFileAppBtn",
                    ).style.display = "none"),
                  this.showFileActionModal());
              }
            }
          }),
        document
          .getElementById("fileBrowser")
          .addEventListener("touchstart", (e) => {
            t = setTimeout(() => {
              const t = e.touches[0],
                s = document.elementFromPoint(t.clientX, t.clientY),
                i = s ? ("file-item" !== s.className ? s.parentNode : s) : null;
              i &&
                (i.getAttribute("data-path"),
                i.getAttribute("data-dir"),
                (this.selectedFile = i),
                this.showFileActionModal());
            }, 500);
          }),
        document
          .getElementById("fileBrowser")
          .addEventListener("touchend", () => clearTimeout(t)),
        document
          .getElementById("fileBrowser")
          .addEventListener("touchmove", () => clearTimeout(t)),
        document
          .getElementById("currentPath")
          .addEventListener("keydown", (e) => {
            "Enter" === e.key &&
              ((this.currentDirectory = e.target.value),
              this.listFiles(this.currentDirectory));
          }),
        document.getElementById("appList").addEventListener("click", (e) => {
          const t = e.target.closest(".app-item");
          if (t) {
            const e = t.querySelector(".app-package").textContent,
              s = t.querySelector(".app-name").textContent,
              i = t.querySelector(".app-path").textContent,
              n = t.querySelector(".app-icon").getAttribute("status");
            ((this.selectedApp = {
              packageName: e,
              appName: s,
              appPath: i,
              status: n,
            }),
              this.showAppActionModal(this.selectedApp, t));
          }
        }));
    },
    onPlusReady: function () {
      "Android" === plus.os.name
        ? (this.printConsole("正在检查权限...", "info"),
          plus.android.requestPermissions(
            [
              "android.permission.WRITE_EXTERNAL_STORAGE",
              "android.permission.READ_EXTERNAL_STORAGE",
            ],
            (e) => {
              (this.printConsole("正在初始化ADB...", "info"),
                this.updateStatus("正在初始化ADB", "disconnected"),
                this.setupAdb());
              const t = plus.storage.getItem("currentDevice");
              t &&
                isNetworkDevice(t) &&
                (document.getElementById("ipAddress").value = t);
            },
            (e) => {
              this.printConsole("错误：权限被拒绝", "error");
            },
          ))
        : this.printConsole("错误: 此功能仅支持Android平台", "error");
    },
    setupAdb: function () {
      closeWebview = (e) => {
        if (!confirm("确定要返回首页吗？")) return;
        const t = () => {
          setTimeout(() => {
            plus.webview.currentWebview().close();
          }, 500);
        };
        this.isConnected ? this.disconnect(t) : t();
      };
      const e = plus.android.importClass("android.os.Build");
      (this.printConsole(
        "兼容性检查：" +
          (e.SUPPORTED_32_BIT_ABIS.length
            ? `32[${e.SUPPORTED_32_BIT_ABIS}]`
            : `64[${e.SUPPORTED_64_BIT_ABIS}]`),
        "info",
      ),
        (this.adbUrl = adbUrls[e.SUPPORTED_32_BIT_ABIS.length ? 0 : 1]));
      const t = plus.android.runtimeMainActivity(),
        s = t.getCacheDir();
      plus.android.importClass(s);
      const i = s.getAbsolutePath() + "/adb-cache",
        n = t.getFilesDir();
      plus.android.importClass(n);
      const o = n.getAbsolutePath(),
        r = (e, t) => {
          0 !== t
            ? (this.printConsole(`ADB初始化失败: ${e}`, "error"),
              this.updateStatus("ADB初始化失败", "error"))
            : this.executeCommandWithoutAdb("mkdir /sdcard/adb-tmp", (e) => {
                ((this.adb = o + "/adb"),
                  this.executeCommandWithoutAdb("ls -l", (e) => {}),
                  this.executeCommandWithoutAdb(`rm -rf ${i}`, (e) => {
                    this.executeCommandWithoutAdb(`mkdir ${i}`, (e) => {
                      this.executeCommandWithoutAdb(
                        `chmod -R 777 ${i}`,
                        (e) => {
                          ((this.adbCache = i),
                            this.executeAdbCommand("start-server", (e, t) => {
                              0 !== t
                                ? (this.printConsole(
                                    `ADB初始化失败: ${e}`,
                                    "error",
                                  ),
                                  this.updateStatus("ADB初始化失败", "error"))
                                : ((this.adbCache = i),
                                  this.printConsole("ADB初始化完成", "success"),
                                  this.updateStatus("未连接", "disconnected"),
                                  ["connectBtn", "disconnectBtn"].forEach(
                                    (e) => {
                                      ((document.getElementById(e).disabled =
                                        !1),
                                        (document.getElementById(
                                          e,
                                        ).style.display = ""));
                                    },
                                  ),
                                  this.discoverDevices());
                            }));
                        },
                      );
                    });
                  }));
              });
        },
        l = () => {
          plus.io.resolveLocalFileSystemURL(
            this.adbPath,
            (e) => {
              this.executeCommandWithoutAdb(
                `cp -rf ${e.fullPath} ${o}`,
                (e, t) => {
                  0 !== t
                    ? r(e, t)
                    : this.executeCommandWithoutAdb(
                        `chmod -R 777 ${o}`,
                        (e, t) => {
                          r(e, t);
                        },
                      );
                },
              );
            },
            (e) => {
              (this.printConsole("找不到ADB文件: " + (e.message || e), "error"),
                this.updateStatus("ADB初始化失败", "error"));
            },
          );
        },
        c = (e, t) => {
          const s = () => {
            plus.zip.decompress(
              e,
              this.adbPath,
              () => {
                t && t(!0);
              },
              (e) => {
                t && t(!1);
              },
            );
          };
          plus.io.resolveLocalFileSystemURL(
            this.adbPath,
            (e) => {
              e.removeRecursively(s, s);
            },
            s,
          );
        },
        d = () => {
          plus.downloader
            .createDownload(
              this.adbUrl,
              {
                filename: `_doc/${this.adbUrl
                  .split("/")
                  .filter((e) => e)
                  .pop()}`,
              },
              (e, t) => {
                if (200 === t)
                  plus.io.resolveLocalFileSystemURL(
                    e.filename,
                    (e) => {
                      (this.printConsole("ADB包下载成功，开始解压...", "info"),
                        c(e.fullPath, (t) => {
                          if (t)
                            (this.printConsole(
                              "ADB包解压成功，开始初始化...",
                              "info",
                            ),
                              l());
                          else {
                            this.printConsole(
                              "ADB包解压失败，稍后重新下载...",
                              "error",
                            );
                            try {
                              e.remove();
                            } catch {}
                            setTimeout(d, 1e3);
                          }
                        }));
                    },
                    () => {
                      (this.printConsole(
                        "ADB包下载失败，稍后重新下载...",
                        "error",
                      ),
                        setTimeout(d, 1e3));
                    },
                  );
                else {
                  this.printConsole("ADB包下载失败，稍后重新下载...", "error");
                  try {
                    entry.remove();
                  } catch {}
                  setTimeout(d, 1e3);
                }
              },
            )
            .start();
        };
      plus.io.resolveLocalFileSystemURL("_doc", (e) => {
        e.getFile(
          this.adbUrl
            .split("/")
            .filter((e) => e)
            .pop(),
          { create: !1 },
          (e) => {
            c(e.fullPath, (t) => {
              if (t) l();
              else {
                this.printConsole("ADB包解压失败，稍后重新下载...", "error");
                try {
                  e.remove();
                } catch {}
                setTimeout(d, 1e3);
              }
            });
          },
          () => {
            (this.printConsole("ADB包不存在，开始下载...", "info"),
              e.createReader().readEntries(
                (e) => {
                  (e.forEach((e) => {
                    if (/^adb/.test(e.name))
                      try {
                        e.isDirectory ? e.removeRecursively() : e.remove();
                      } catch {}
                  }),
                    d());
                },
                (e) => {
                  d();
                },
              ));
          },
        );
      });
    },
    discoverDevices: function (e = !0, t) {
      ((this.devices = []),
        e && this.printConsole("正在扫描已连接设备...", "info"),
        e && this.updateStatus("扫描设备中...", "connecting"),
        this.executeAdbCommand("devices", (s, i) => {
          if (0 !== i)
            return (
              t && t(s, i),
              e && this.printConsole(`扫描设备失败: ${s}`, "error"),
              void (e && this.updateStatus("扫描失败", "error"))
            );
          const n = s.split("\n");
          this.devices = [];
          for (let e = 1; e < n.length; e++) {
            const t = n[e].trim();
            if (t && !t.startsWith("*")) {
              const e = t.split("\t");
              if (e.length >= 2) {
                const t = e[0],
                  s = e[1];
                this.devices.push({ id: t, name: t, type: s });
              }
            }
          }
          (this.updateDeviceList(),
            e &&
              this.printConsole(
                `发现 ${this.devices.length} 台设备`,
                "success",
              ),
            e && this.updateStatus("扫描完成", "connected"),
            t && t(s, i));
        }));
    },
    updateDeviceList: function () {
      const e = document.getElementById("deviceSelect");
      if (((e.innerHTML = ""), 0 === this.devices.length)) {
        const t = document.createElement("option");
        return (
          (t.value = ""),
          (t.textContent = "-- 未找到设备 --"),
          e.appendChild(t),
          void (document.getElementById("deviceListGroup").style.display =
            "none")
        );
      }
      ((e.innerHTML = '<option value="">-- 请选择设备 --</option>'),
        this.devices.forEach((t) => {
          const s = document.createElement("option");
          ((s.value = t.id), (s.textContent = t.id), e.appendChild(s));
        }),
        (e.value = ""),
        (document.getElementById("deviceListGroup").style.display = "block"));
    },
    connect: function () {
      if (((this.isConnected = !1), "wifi" === this.connectionType)) {
        const e = document.getElementById("ipAddress").value;
        if (!e)
          return (
            this.printConsole("请输入IP地址", "error"),
            void this.updateStatus("需要IP地址", "error")
          );
        this.connectWifi(e);
      } else this.connectUsb();
    },
    connectUsb: function () {
      (this.printConsole("正在连接USB设备...", "info"),
        this.updateStatus("正在连接...", "connecting"),
        this.discoverDevices(!1, (e, t) => {
          if (0 !== t)
            return (
              this.printConsole(`连接失败: ${e}`, "error"),
              void this.updateStatus("连接失败", "error")
            );
          const s = e.split("\n");
          let i = !1,
            n = "";
          for (let e = 1; e < s.length; e++) {
            const t = s[e].trim();
            if (t && t.includes("device")) {
              const e = t.split("\t")[0];
              if (e) {
                ((i = !0), (n = e));
                break;
              }
            }
          }
          i
            ? (this.printConsole(`找到 ${this.devices.length} 个设备`),
              this.printConsole(`已自动选择设备: ${n}`),
              this.connectionCheck(n))
            : (this.printConsole("未找到已连接的设备", "error"),
              this.updateStatus("设备未找到", "error"));
        }));
    },
    connectWifi: function (e) {
      (this.printConsole(`正在连接WiFi设备 ${e}...`, "info"),
        this.updateStatus("正在连接...", "connecting"),
        this.executeAdbCommand(`connect ${e}`, (t, s) => {
          0 === s && t.includes("connected")
            ? this.connectionCheck(e)
            : (this.printConsole(`连接失败: ${t}`, "error"),
              this.updateStatus("连接失败", "error"));
        }));
    },
    connectionCheck: function (e, t = null) {
      (this.exitShellMode(),
        this.discoverDevices(!1, (s, i) => {
          if (!this.devices.length && isNetworkDevice(e))
            return void this.executeAdbCommand(`connect ${e}`, (s, i) => {
              this.connectionCheck(e, t);
            });
          const n = this.devices.find((t) => t.id.includes(e)) || {};
          if (0 === i && this.devices.length && "device" == n.type)
            (this.onConnectSuccess(n.id), t && t(!0, "连接成功", n));
          else {
            switch (n.type) {
              case "unauthorized":
                return (
                  this.printConsole("连接失败: 设备未授权", "info"),
                  this.updateStatus("未授权", "error"),
                  void (t && t(!1, "设备未授权", n))
                );
              case "offline":
                return (
                  this.printConsole(
                    `连接失败: ${n.type || s}, 正在尝试重新连接...`,
                    "error",
                  ),
                  void this.executeAdbCommand(
                    ["-s", n.id, "reconnect"],
                    (e, s) => {
                      0 !== s
                        ? (this.printConsole(`重新连接失败: ${e}`, "error"),
                          this.updateStatus("连接失败", "error"),
                          t && t(!1, `${e}`, n))
                        : (this.onConnectSuccess(n.id),
                          t && t(!0, "连接成功", n));
                    },
                  )
                );
            }
            (this.printConsole(`连接失败: ${n.type || s}`, "error"),
              this.updateStatus("连接失败", "error"),
              t && t(!1, `${n.type || s}`, n));
          }
        }));
    },
    onConnectSuccess: function (e) {
      ((this.isConnected = !0),
        (this.currentDevice = e),
        plus.storage.setItem("currentDevice", this.currentDevice),
        (document.getElementById("deviceSelect").value = this.currentDevice),
        this.printConsole(`已连接到设备: ${this.currentDevice}`, "success"),
        this.updateStatus("已连接", "connected"),
        (document.getElementById("consoleInput").disabled = !1),
        (document.getElementById("shellBtn").disabled = !1),
        (document.getElementById("uploadFileBtn").disabled = !1),
        this.getDeviceInfo(),
        this.listFiles(this.currentDirectory),
        this.listApps());
    },
    reconnectDevice: async function (e) {
      if (this.currentDevice) {
        const t = this.reconnectDeviceLock.locked,
          s = await this.reconnectDeviceLock.acquire();
        if (t) return (e(), s());
        (this.printConsole("检测到设备断开，尝试重连...", "info"),
          isNetworkDevice(this.currentDevice)
            ? this.executeAdbCommand(["connect", this.currentDevice], (t) => {
                (this.printConsole(`设备重新连接结果: ${t}`, "info"), e(), s());
              })
            : this.executeAdbCommand(["devices"], () => {
                (e(), s());
              }));
      }
    },
    disconnect: function (e = null) {
      this.executeAdbCommand("kill-server", () => {
        ((this.isConnected = !1),
          (this.currentDevice = null),
          (this.devices = []),
          this.updateDeviceList(),
          this.printConsole("已断开ADB连接", "info"),
          this.updateStatus("已断开", "disconnected"),
          (document.getElementById("consoleInput").disabled = !0),
          (document.getElementById("shellBtn").disabled = !0),
          (document.getElementById("uploadFileBtn").disabled = !0),
          this.exitShellMode(),
          e && e());
      });
    },
    rebootDevice: function () {
      confirm("确定要重启设备吗？") &&
        (this.printConsole("正在重启设备", "info"),
        this.showProgress("device", "正在重启设备...", -1),
        this.executeAdbCommand(["shell", "reboot"], (e, t) => {
          0 !== t
            ? (this.printConsole(`重启设备失败: ${e}`, "error"),
              this.showProgress("device", "重启设备失败", 0))
            : (this.printConsole("已重启设备", "success"),
              this.showProgress("device", "已重启设备", 100));
        }));
    },
    getDeviceInfo: function () {
      this.isConnected &&
        (this.executeAdbCommand("shell getprop net.hostname", (e) => {
          document.getElementById("deviceName").textContent = e || "未知";
        }),
        this.executeAdbCommand("shell ifconfig wlan0", (e) => {
          const t = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.exec(e);
          document.getElementById("deviceIP").textContent =
            (t && t[0]) || "未知";
        }),
        this.executeAdbCommand("shell getprop ro.serialno", (e) => {
          document.getElementById("deviceSN").textContent = e || "未知";
        }),
        this.executeAdbCommand(
          "shell getprop ro.build.version.incremental",
          (e) => {
            document.getElementById("firmwareVersion").textContent =
              e || "未知";
          },
        ),
        this.executeAdbCommand(
          "shell getprop ro.build.version.release",
          (e) => {
            document.getElementById("androidVersion").textContent = e || "未知";
          },
        ),
        this.executeAdbCommand("shell dumpsys meminfo | grep RAM:", (e) => {
          document.getElementById("memoryInfo").textContent = e;
          const t = this.formatSize(
              1024 *
                parseInt(
                  /Total RAM: (\S+)(\s)?(k|K)/g.exec(e)[1].replace(/\,/g, ""),
                ),
            ),
            s = this.formatSize(
              1024 *
                (parseInt(
                  /Free RAM: (\S+)(\s)?(k|K)/g.exec(e)[1].replace(/\,/g, ""),
                ) -
                  15e3),
            );
          document.getElementById("memoryInfo").textContent = `${s} / ${t}`;
        }),
        (document.getElementById("storageInfo").parentNode.style.display =
          "none"),
        this.executeAdbCommand("shell dumpsys battery", (e) => {
          const t = e.match(/level: (\d+)/),
            s = e.match(/status: (\d+)/);
          let i = "未知";
          if ((t && (i = `电量: ${t[1]}%`), s)) {
            const e = parseInt(s[1]);
            i += ` (${2 === e ? "充电中" : 3 === e ? "放电中" : 5 === e ? "满电" : "未知"})`;
          }
          document.getElementById("batteryStatus").textContent = i;
        }));
    },
    enterShellMode: function () {
      this.isInShellMode ||
        this.executeAdbCommand(
          "shell",
          (e, t) => {
            0 !== t &&
              e.includes("error: closed") &&
              this.executeAdbCommand(
                "shell sh",
                () => {},
                () => {},
                0,
              );
          },
          () => {},
          0,
        );
    },
    _enterShellMode: function () {
      this.isInShellMode ||
        ((this.isInShellMode = !0),
        (document.getElementById("shellBtn").innerHTML =
          '<i class="fas fa-sign-out-alt"></i> 退出Shell'),
        (document.getElementById("consoleInput").placeholder =
          "输入Shell命令，按Enter执行"),
        this.printConsole('已进入Shell模式，输入"exit"退出', "info"));
    },
    exitShellMode: function () {
      if (!this.isInShellMode) return;
      const e = plus.android.importClass("java.lang.String");
      try {
        const t = this.currentProcess.getOutputStream();
        (t.write(3),
          t.flush(),
          t.write(new e("exit\n").getBytes("UTF-8")),
          t.flush(),
          t.write(3),
          t.flush());
      } catch {
        this._exitShellMode();
      }
    },
    _exitShellMode: function () {
      this.isInShellMode &&
        ((this.isInShellMode = !1),
        (document.getElementById("shellBtn").innerHTML =
          '<i class="fas fa-terminal"></i> 进入Shell'),
        (document.getElementById("consoleInput").placeholder =
          "输入ADB命令，按Enter执行"),
        this.printConsole("已退出Shell模式", "info"));
    },
    executeShellCommand: function (e) {
      if (!this.isConnected)
        return void this.printConsole("错误: 未连接设备", "error");
      if ("exit" === e.trim()) return void this.exitShellMode();
      const t = parseCommand(e),
        s = plus.android.importClass("java.lang.String");
      try {
        const e = this.currentProcess.getOutputStream();
        (e.write(
          new s(`${t.join(" ").replace(/(?<!\\)"/g, '\\"')}\n`).getBytes(
            "UTF-8",
          ),
        ),
          e.flush());
      } catch {
        this._exitShellMode();
      }
    },
    executeCommand: function (e) {
      this.isConnected
        ? (this.commandHistory.push(e),
          (this.historyIndex = this.commandHistory.length),
          this.printConsole(`$ ${e}`, "command"),
          this.executeAdbCommand(
            e,
            (e, t) => {
              this.printConsole(e, 0 !== t ? "error" : "info");
            },
            null,
            0,
          ))
        : this.printConsole("错误: 未连接设备", "error");
    },
    executeAdbCommand: function (e, t, s, i = -1, n = 0) {
      const o = Array.isArray(e) ? e : parseCommand(e),
        r = ["./adb"];
      ("adb" === o[0] && o.shift(),
        this.currentDevice &&
          !o[0].startsWith("-s") &&
          r.push("-s", this.currentDevice),
        o[0].startsWith("-s") && r.push(o.shift(), o.shift()),
        r.push(...o));
      let l = ["shell", "pull", "push"].find((e) => o[0].includes(e))
          ? null
          : this.printConsole("", "", !1),
        c = 0,
        d = null;
      const a = (e, s) => {
        (l && l.remove(), !d && t && t(e, s), d && this._exitShellMode());
      };
      this.executeCommandWithoutAdb(
        r,
        (r, l) => {
          const c =
            /(no devices\/emulators found|device \S+ not found|device offline|device unauthorized)/i.test(
              r,
            );
          ["push", "pull", "shell"].find((e) => e.includes(o[0])) && c && n < 2
            ? this.reconnectDevice(() => {
                setTimeout(() => {
                  this.executeAdbCommand(e, t, s, (i = -1), n + 1);
                }, 1e3);
              })
            : a(r, l);
        },
        (e, t, i) => {
          if ((s && s(e, t, i), !t)) {
            if (/^\S+\:\/(\S+)? (\$|\#)$/g.test(e))
              return (
                l && l.remove(),
                this._enterShellMode(),
                void (d = this.printConsole(e.trim() + " ", "info", !1))
              );
            if (l) {
              let t = l.querySelector("#message");
              const s = document.createElement("div");
              if (
                ((s.innerText = e), t.appendChild(s), Date.now() - c >= 100)
              ) {
                c = Date.now();
                const e = document.getElementById("consoleOutput");
                e.scrollTop = e.scrollHeight;
              }
            }
            if (!d) return;
            document.body.contains(d) ||
              (d = this.printConsole("", "info", !1));
            const t = d.querySelector("#message"),
              s = t.querySelectorAll("div");
            if (s.length && s.length < 3 && s[s.length - 1].innerText === e)
              return;
            const i = document.createElement("div");
            if (
              (1 === s.length && (i.style.display = "inline-block"),
              (i.innerText = e),
              t.appendChild(i),
              Date.now() - c >= 100)
            ) {
              c = Date.now();
              const e = document.getElementById("consoleOutput");
              e.scrollTop = e.scrollHeight;
            }
          }
        },
        i,
      );
    },
    executeCommandWithoutAdb: function (e, t, s, i = -1) {
      Array.isArray(e) || (e = parseCommand(e));
      const n = (e, t, s) => {
        const o = Date.now(),
          r = plus.android.importClass("java.io.File"),
          l = plus.android.importClass("java.io.RandomAccessFile"),
          c = new r(e);
        let d = 0,
          a = !1,
          h = 0;
        const p = 1e3;
        if (c.exists())
          try {
            const e = new l(c, "r");
            let n = !1;
            const r = () => {
              if (!a)
                try {
                  const l = c.length();
                  if ((l < d && ((d = 0), (n = !1), e.seek(0)), l > d)) {
                    let i;
                    e.seek(d);
                    let o = !1;
                    for (; null !== (i = e.readLine());) {
                      const r = decodeURIComponent(escape(String(i))).trim();
                      if (
                        ((d = e.getFilePointer()),
                        (h = 0),
                        r.startsWith("exec_start:"))
                      )
                        n = !0;
                      else if (n) {
                        if (
                          /^(\^C)?exit_code: -?(\d+)/.test(r) ||
                          r.startsWith("exec_end")
                        ) {
                          ((n = !1), (o = !0));
                          const i = /exit_code: (\S+)/.exec(r),
                            l = i ? parseInt(i[1]) : -1;
                          try {
                            t(r, !0, l);
                          } catch (e) {}
                          try {
                            e.close();
                          } catch (e) {}
                          a = !0;
                          try {
                            s && s(!0, l);
                          } catch (e) {}
                          return;
                        }
                        if (r.trim())
                          try {
                            t(r, !1);
                          } catch (e) {}
                      }
                    }
                  }
                  if ((h++ > p && -1 === i) || (i > 0 && Date.now() - o >= i))
                    return (e.close(), (a = !0), void (s && s(!1, -1)));
                  setTimeout(r, 50);
                } catch (t) {
                  if (!a && h++ < p) setTimeout(r, 50);
                  else {
                    try {
                      e.close();
                    } catch (e) {}
                    ((a = !0), s && s(!1, -1));
                  }
                }
            };
            r();
          } catch (i) {
            !a && h++ < p
              ? setTimeout(() => n(e, t, s), 100)
              : ((a = !0), s && s(!1, -1));
          }
        else setTimeout(() => n(e, t, s), 10);
      };
      (() => {
        let i = -2;
        const o = e[0].startsWith("./adb") && this.adbCache.length;
        e[0].startsWith("./adb") && (e[0] = e[0].replace("./adb", "./bin/adb"));
        try {
          const l = plus.android.importClass("java.lang.ProcessBuilder"),
            c =
              (plus.android.importClass("java.util.Map"),
              plus.android.importClass("java.util.ArrayList")),
            d = plus.android.importClass("java.io.File"),
            a = new c();
          let h = null,
            p = null;
          if (
            (o &&
              ((p = `${Date.now()}_${((r = 1e5), Math.floor(899999 * Math.random()) + r)}`),
              (h = `${this.adbCache}/${p}.log`)),
            o && e.includes("shell"))
          ) {
            let t = e.findIndex((e) => "shell" === e);
            const s = e.splice(t + 1);
            (e.forEach((e) => a.add(e)),
              s.length &&
                a.add(
                  `"${s.join(" ").replace(/(?<!\\)"/g, '\\"')} && echo exit_code: $? || echo exit_code: -1"`,
                ));
          } else e.forEach((e) => a.add(e));
          JSON.stringify(a.toArray());
          const u = new c();
          ["./bin/busybox", "script", "-fq", h].forEach((e) => u.add(e));
          const m = new l(o ? u : a),
            g = m.environment();
          if (
            (m.redirectErrorStream(!0),
            this.adb.length &&
              (m.directory(new d(this.adb)),
              g.put("PS1", "exec$ "),
              g.put("PATH", `${g.get("PATH")}:./bin`),
              g.put("LD_LIBRARY_PATH", "./lib"),
              o &&
                (g.put("HOME", "../"),
                g.put("TMPDIR", "../../cache/adb-cache"))),
            (this.currentProcess = m.start()),
            plus.android.importClass(this.currentProcess),
            o)
          ) {
            (plus.android.invoke(this.currentProcess.getInputStream(), "close"),
              plus.android.invoke(
                this.currentProcess.getErrorStream(),
                "close",
              ),
              plus.android.importClass("java.io.OutputStream"));
            const e = this.currentProcess.getOutputStream(),
              o = plus.android.importClass("java.lang.String");
            (e.write(new o(`export PS1="${g.get("PS1")}"\n`).getBytes("UTF-8")),
              e.flush(),
              e.write(new o("sh ./exec ").getBytes("UTF-8")),
              e.write(new o(a.toArray().join(" ")).getBytes("UTF-8")),
              e.write(
                new o(
                  ' && echo "exit_code: $?" || echo "exit_code: -1"',
                ).getBytes("UTF-8"),
              ),
              e.write(new o("\n").getBytes("UTF-8")),
              e.flush());
            let r = "",
              l = !1;
            n(
              h,
              (e, t, n) => {
                (null != e && s && s(e, t, n),
                  t ? ((i = n), (l = !0)) : (r += e + "\n"));
              },
              (s, n) => {
                l || (i = n);
                try {
                  const e = new (plus.android.importClass("java.io.File"))(h);
                  e.exists() && e.delete();
                } catch (e) {}
                t(r.trim(), i);
                try {
                  (e.write(new o("exit\n").getBytes("UTF-8")), e.flush());
                } catch (e) {}
              },
            );
          } else {
            const e = ((e) => {
              plus.android.importClass("java.io.InputStream");
              const t = plus.android.importClass("java.io.InputStreamReader"),
                s = plus.android.importClass("java.io.BufferedReader"),
                n = plus.android.importClass("java.lang.StringBuilder"),
                o = new s(new t(e)),
                r = new n();
              let l,
                c = !1;
              for (; null !== (l = o.readLine());) {
                if (c) continue;
                const e = l.trim();
                if (
                  /^(\^C)?exit_code: -?(\d+)/.test(e) ||
                  e.startsWith("exec_end")
                ) {
                  c = !0;
                  const t = /exit_code: (\S+)/.exec(e);
                  i = t ? parseInt(t[1]) : -1;
                }
                r.append(l).append("\n");
              }
              return (o.close(), r.toString().trim());
            })(this.currentProcess.getInputStream());
            ((i = -2 === i ? this.currentProcess.waitFor() : i), t(e, i));
          }
        } catch (e) {
          t(e, i);
        }
        var r;
      })();
    },
    listFiles: function (e, t = !0) {
      (e.endsWith("/") || (e += "/"),
        t && this.showProgress("file", "正在加载文件列表...", -1),
        this.executeAdbCommand(["shell", "ls", "-l", `${e}`], (s, i) => {
          const n = document.getElementById("fileBrowser");
          ((n.scrollTop = 0), (n.innerHTML = ""));
          const o = () => {
            if ("/" !== e) {
              const t = e.replace(/\/[^\/]+\/?$/, "") || "/",
                s = document.createElement("div");
              ((s.className = "file-item"),
                s.setAttribute("data-path", t),
                s.setAttribute("data-dir", "true"),
                (s.innerHTML =
                  '\n                    <i class="fas fa-level-up-alt file-icon"></i>\n                    <div class="file-name">返回上一级</div>\n                '),
                n.appendChild(s));
            }
          };
          if (0 !== i || !s)
            return (
              o(),
              this.printConsole(`无法列出文件: ${s}`, "error"),
              void (t && this.showProgress("file", "加载文件失败", 0))
            );
          const r = s.split("\n"),
            l = [],
            c = [];
          (r.forEach((t) => {
            if (!t.trim() || t.startsWith("total")) return;
            const s = t.trim().split(/\s+/);
            if (s.length < 6) return;
            const i = s[0],
              n = "d" === i[0] || "l" === i[0];
            let o = 0,
              r = -1,
              d = "0";
            for (let e = 0; e < s.length; e++)
              if (/^\d{4}-\d{2}-\d{2}$/.test(s[e])) {
                ((o = e + 2), n || (r = e - 1));
                break;
              }
            if ((-1 != r && (d = s[r]), o >= s.length)) return;
            let a = s.slice(o).join(" ");
            const h = /(.*?) \->/.exec(a);
            h && (a = h[1]);
            const p = n ? "" : this.formatSize(parseInt(d)),
              u = document.createElement("div");
            ((u.className = "file-item"),
              u.setAttribute(
                "data-path",
                e + (e.endsWith("/") ? "" : "/") + a + (n ? "/" : ""),
              ),
              u.setAttribute("data-dir", n),
              u.setAttribute("data-perm", permToNumber(i)),
              (u.innerHTML = `\n                    <i class="fas ${n ? "fa-folder" : "fa-file"} file-icon"></i>\n                    <div class="file-name">${a}</div>\n                    <div class="file-size">${p}</div>\n                `),
              n ? l.push(u) : c.push(u));
          }),
            o(),
            l.forEach((e) => n.appendChild(e)),
            c.forEach((e) => n.appendChild(e)),
            (document.getElementById("currentPath").value = e),
            t && this.showProgress("file", "加载文件列表完成", 100));
        }));
    },
    showFileActionModal: function () {
      const e = this.selectedFile
        .getAttribute("data-path")
        .split("/")
        .filter((e) => e)
        .pop();
      e &&
        ((document.getElementById("fileActionTitle").textContent = e),
        (document.getElementById("fileActionPath").textContent =
          this.selectedFile.getAttribute("data-path")),
        (document.getElementById("fileActionPerm").textContent =
          `perm: ${this.selectedFile.getAttribute("data-perm")}`),
        (document.getElementById("fileActionModal").style.display = "block"));
    },
    closeFileActionModal: function () {
      ((document.getElementById("fileActionModal").style.display = "none"),
        (this.selectedFile = null));
    },
    goHomeDirectory: function () {
      ((this.currentDirectory = "/sdcard/"),
        this.listFiles(this.currentDirectory));
    },
    createFolder: function () {
      const e = prompt("请输入文件夹名称:");
      if (!e) return;
      const t =
        this.currentDirectory +
        (this.currentDirectory.endsWith("/") ? "" : "/") +
        e;
      this.executeAdbCommand(["shell", "mkdir", `"${t}"`], (e, s) => {
        0 !== s
          ? (this.printConsole(`创建文件夹失败: ${e}`, "error"),
            this.showProgress("file", "创建文件夹失败", 0))
          : (this.printConsole(`文件夹创建成功: ${t}`, "success"),
            this.showProgress("file", "文件夹创建成功", 100),
            this.listFiles(this.currentDirectory, !1));
      });
    },
    uploadFile: function () {
      alert(
        "文件选择提示：\n✔ 请在「设备目录」中选择文件\n✖ 不要在「最近/下载内容」中选择文件",
      );
      var e = !1;
      this.chooseFile(
        { title: "请选择文件", multiple: !1, mime: "*/*", path: "/" },
        (t) => {
          if (e) return;
          ((e = !0),
            this.printConsole(
              "选择了文件：" + JSON.stringify(t.files),
              "info",
            ));
          const s = t.files[0];
          if (!s || !s.startsWith("/"))
            return void alert("不支持的目录，请在「设备目录」中选择！");
          const i = s
              .split("/")
              .filter((e) => e)
              .pop(),
            n =
              this.currentDirectory +
              (this.currentDirectory.endsWith("/") ? "" : "/") +
              i;
          this.uploadFileWithProgress(s, n);
        },
        (e) => {
          this.printConsole(`选择文件失败: ${e.message || e}`, "error");
        },
      );
    },
    uploadFileWithProgress: function (e, t) {
      e = e.startsWith("file://") ? e.substring(7) : e;
      let s = -1;
      (this.printConsole(`正在上传文件: ${e} -> ${t}`, "info"),
        this.showProgress("file", "开始上传文件...", -1),
        this.executeAdbCommand(
          ["push", "-p", `"${e}"`, `"${t}"`],
          (e, s) => {
            0 !== s
              ? (this.printConsole(`上传文件失败: ${e}`, "error"),
                this.showProgress("file", "上传文件失败", 0))
              : (this.printConsole(`上传文件成功: ${t}`, "success"),
                this.showProgress("file", `上传文件成功: ${t}`, 100),
                this.listFiles(this.currentDirectory, !1));
          },
          (e, t, i) => {
            const n = /(\d+)\%\]/.exec(e);
            if (n) {
              let e = parseInt(n[1]);
              s != e &&
                ((s = e), 100 !== s && this.setProgress("file", "上传文件", s));
            }
          },
        ));
    },
    downloadFile: function () {
      if (!this.selectedFile)
        return void this.printConsole("请先选择要下载的文件", "error");
      let e = this.selectedFile
        .getAttribute("data-path")
        .split("/")
        .filter((e) => e);
      const t = e.pop();
      if (((e = e.join("/")), !confirm(`确定要下载 ${e}/${t} 吗？`))) return;
      const s = `/sdcard/Download/${t}`;
      this.downloadFileWithProgress(
        this.selectedFile.getAttribute("data-path"),
        s,
      );
    },
    downloadFileWithProgress: function (e, t) {
      t = t.startsWith("file://") ? t.substring(7) : t;
      let s = -1;
      (this.printConsole(`正在下载文件: ${e} -> ${t}`, "info"),
        this.showProgress("file", "开始下载文件...", -1),
        this.executeAdbCommand(
          ["pull", "-p", `"${e}"`, `"${t}"`],
          (e, s) => {
            0 !== s
              ? (this.printConsole(`下载文件失败: ${e}`, "error"),
                this.showProgress("file", "下载文件失败", 0))
              : (this.showProgress("file", `下载文件成功: ${t}`, 100),
                this.printConsole(`下载文件成功: ${t}`, "success"));
          },
          (e, t, i) => {
            const n = /(\d+)\%\]/.exec(e);
            if (n) {
              let e = parseInt(n[1]);
              s != e && ((s = e), this.setProgress("file", "下载文件", s));
            }
          },
        ));
    },
    deleteFile: function () {
      if (!this.selectedFile)
        return void this.printConsole("请先选择要删除的文件", "error");
      let e = this.selectedFile
        .getAttribute("data-path")
        .split("/")
        .filter((e) => e);
      const t = e.pop();
      ((e = e.join("/")),
        confirm(`确定要删除 ${e}/${t} 吗？`) &&
          this.executeAdbCommand(
            ["shell", "rm", "-r", `"${e}/${t}"`],
            (s, i) => {
              0 !== i
                ? (this.printConsole(`删除文件失败: ${s}`, "error"),
                  this.showProgress("file", "删除文件失败", 0))
                : (this.printConsole(`删除文件成功: ${e}/${t}`, "success"),
                  this.showProgress("file", `删除文件成功: ${e}/${t}`, 100),
                  this.listFiles(this.currentDirectory, !1));
            },
          ));
    },
    reNameFile: function () {
      let e = this.selectedFile
        .getAttribute("data-path")
        .split("/")
        .filter((e) => e);
      const t = e.pop();
      e = e.join("/");
      const s = prompt("请输入新的文件名称:", t);
      s &&
        s !== t &&
        this.executeAdbCommand(
          ["shell", "mv", `"${e}/${t}"`, `"${e}/${s}"`],
          (i, n) => {
            0 !== n
              ? (this.printConsole(`重命名文件失败: ${i}`, "error"),
                this.showProgress("file", "重命名文件失败", 0))
              : (this.printConsole(
                  `重命名文件成功: ${e}/${t} -> ${e}/${s}`,
                  "success",
                ),
                this.showProgress("file", `重命名文件成功: ${e}/${s}`, 100),
                this.listFiles(this.currentDirectory, !1));
          },
        );
    },
    setFilePermission: function () {
      const e = prompt(
        "请输入要设置的权限值:\n例如: 777",
        this.selectedFile.getAttribute("data-perm"),
      );
      if (!e) return;
      let t = this.selectedFile
        .getAttribute("data-path")
        .split("/")
        .filter((e) => e);
      const s = t.pop();
      ((t = t.join("/")),
        this.executeAdbCommand(
          ["shell", "chmod", "-R", e, `"${t}/${s}"`],
          (i, n) => {
            0 !== n
              ? (this.printConsole(`设置文件权限失败: ${i}`, "error"),
                this.showProgress("file", "设置文件权限失败", 0))
              : (this.printConsole(
                  `设置文件权限成功: ${t}/${s} ${e}`,
                  "success",
                ),
                this.showProgress(
                  "file",
                  `设置文件权限成功: ${t}/${s} ${e}`,
                  100,
                ),
                this.listFiles(this.currentDirectory, !1));
          },
        ));
    },
    listApps: function (e = "", t = !1) {
      const s = document.getElementById("appList");
      ((s.scrollTop = 0), (s.innerHTML = ""));
      const i = t ? { all: [], enable: [], disabled: [] } : this.apps,
        n = !!i.all.length || !!e;
      n || this.showProgress("app", "正在加载应用列表...", -1);
      const o = () => {
        (i.all.forEach((t) => {
          const { packageName: n, path: o } = t;
          if (e && !n.toLowerCase().includes(e.toLowerCase())) return;
          const r = i.enable.includes(n)
              ? "enable"
              : i.disabled.includes(n)
                ? "disabled"
                : "hide",
            l = document.createElement("div");
          ((l.className = "app-item"),
            (l.innerHTML = `\n                        <div class="app-icon" status="${r}">\n                            <i class="fas fa-mobile-alt"></i>\n                        </div>\n                        <div class="app-info">\n                            <div class="app-name">${n}</div>\n                            <div class="app-package">${n}</div>\n                            <div class="app-path">${o}</div>\n                        </div>\n                    `),
            s.appendChild(l));
        }),
          n || this.hideProgress("app"));
      };
      if (n) return o();
      (() => {
        this.executeAdbCommand(
          [
            "shell",
            "echo all_packages:",
            ";",
            "/system/bin/pm list packages -u -f",
            ";",
            "echo enable_packages:",
            ";",
            "/system/bin/pm list packages -e",
            ";",
            "echo disable_packages:",
            ";",
            "/system/bin/pm list packages -d",
          ],
          (e, t) => {
            if (0 !== t)
              return (
                this.printConsole(`无法获取应用列表: ${e}`, "error"),
                void this.showProgress("app", "无法获取应用列表", 0)
              );
            let s = i.all;
            (e.split("\n").forEach((e) => {
              if (!e.trim()) return;
              if (e.trim().startsWith("all_packages")) return void (s = i.all);
              if (e.trim().startsWith("enable_packages"))
                return void (s = i.enable);
              if (e.trim().startsWith("disable_packages"))
                return void (s = i.disabled);
              const t = /package:((.*?)\=)?(\S+)/g.exec(e);
              if (!t) return;
              const n = t[2],
                o = t[3];
              s.push(s === i.all ? { packageName: o, path: n } : o);
            }),
              (this.apps = i),
              o());
          },
        );
      })();
    },
    getAppName: function (e, t) {
      t(null);
    },
    filterApps: function (e) {
      this.listApps(e);
    },
    showAppActionModal: function (e) {
      const { appName: t, appPath: s, packageName: i, status: n } = e;
      switch (
        ((document.getElementById("appActionTitle").textContent = t),
        (document.getElementById("appActionPackage").textContent = i),
        (document.getElementById("appActionPath").textContent = s),
        document
          .getElementById("appActionModal")
          .querySelectorAll("button")
          .forEach((e) => {
            e.disabled = !0;
          }),
        n)
      ) {
        case "enable":
          ((document.getElementById("disabledAppBtn").disabled = !1),
            (document.getElementById("hideAppBtn").disabled = !1));
          break;
        case "disabled":
          document.getElementById("enableAppBtn").disabled = !1;
          break;
        case "hide":
          document.getElementById("unHideAppBtn").disabled = !1;
      }
      ((document.getElementById("clearAppBtn").disabled = !1),
        (document.getElementById("uninstallAppBtn").disabled = !1),
        (document.getElementById("appActionModal").style.display = "block"));
    },
    closeAppActionModal: function () {
      ((document.getElementById("appActionModal").style.display = "none"),
        (this.selectedApp = null));
    },
    launchApp: function (e) {
      this.executeAdbCommand(`shell am start -n ${e}/.MainActivity`, (t, s) => {
        0 !== s
          ? this.printConsole(`启动应用失败: ${t}`, "error")
          : this.printConsole(`已启动应用: ${e}`, "success");
      });
    },
    enableApp: function (e, t) {
      confirm(`确定要启用应用 "${t}" 吗？`) &&
        (this.printConsole(`启用应用: ${t}`, "info"),
        this.showProgress("app", "正在启用应用...", -1),
        this.executeAdbCommand(
          ["shell", "/system/bin/pm", "enable", "--user", "0", e],
          (s, i) => {
            if (0 !== i)
              (this.printConsole(`启用应用失败: ${s}`, "error"),
                this.showProgress("app", "启用应用失败", 0));
            else {
              (this.printConsole(`已启用应用: ${t}`, "success"),
                this.showProgress("app", `已启用应用: ${t}`, 100));
              const s = this.apps.disabled.findIndex((t) => t === e);
              (-1 !== s && this.apps.disabled.splice(s, 1),
                this.apps.enable.push(e),
                this.listApps(document.getElementById("appSearch").value));
            }
          },
        ));
    },
    disabledApp: function (e, t) {
      confirm(`确定要停用应用 "${t}" 吗？`) &&
        (this.printConsole(`停用应用: ${t}`, "info"),
        this.showProgress("app", "正在停用应用...", -1),
        this.executeAdbCommand(
          ["shell", "/system/bin/pm", "disable-user", "--user", "0", e],
          (s, i) => {
            if (0 !== i)
              (this.printConsole(`停用应用失败: ${s}`, "error"),
                this.showProgress("app", "停用应用失败", 0));
            else {
              (this.printConsole(`已停用应用: ${t}`, "success"),
                this.showProgress("app", `已停用应用: ${t}`, 100));
              const s = this.apps.enable.findIndex((t) => t === e);
              (-1 !== s && this.apps.enable.splice(s, 1),
                this.apps.disabled.push(e),
                this.listApps(document.getElementById("appSearch").value));
            }
          },
        ));
    },
    unHideApp: function (e, t) {
      confirm(`确定要显示应用 "${t}" 吗？`) &&
        (this.printConsole(`显示应用: ${t}`, "info"),
        this.showProgress("app", "正在显示应用...", -1),
        this.executeAdbCommand(
          ["shell", "/system/bin/pm", "unhide", e],
          (s, i) => {
            0 !== i
              ? (this.printConsole(`显示应用失败: ${s}`, "error"),
                this.showProgress("app", "显示应用失败", 0))
              : (this.printConsole(`已显示应用: ${t}`, "success"),
                this.showProgress("app", `已显示应用: ${t}`, 100),
                this.apps.enable.push(e),
                this.listApps(document.getElementById("appSearch").value));
          },
        ));
    },
    hideApp: function (e, t) {
      confirm(`确定要隐藏应用 "${t}" 吗？`) &&
        (this.printConsole(`隐藏应用: ${t}`, "info"),
        this.showProgress("app", "正在隐藏应用...", -1),
        this.executeAdbCommand(
          ["shell", "/system/bin/pm", "hide", e],
          (s, i) => {
            if (0 !== i)
              (this.printConsole(`隐藏应用失败: ${s}`, "error"),
                this.showProgress("app", "隐藏应用失败", 0));
            else {
              (this.printConsole(`已隐藏应用: ${t}`, "success"),
                this.showProgress("app", `已隐藏应用: ${t}`, 100));
              const s = this.apps.enable.findIndex((t) => t === e);
              (-1 !== s && this.apps.enable.splice(s, 1),
                this.listApps(document.getElementById("appSearch").value));
            }
          },
        ));
    },
    clearApp: function (e, t) {
      confirm(`确定要清除应用数据 "${t}" 吗？`) &&
        (this.printConsole(`清除应用数据: ${t}`, "info"),
        this.showProgress("app", "正在清除应用数据...", -1),
        this.executeAdbCommand(`shell /system/bin/pm clear ${e}`, (e, s) => {
          0 !== s
            ? (this.printConsole(`清除应用数据失败: ${e}`, "error"),
              this.showProgress("app", "清除应用数据失败", 0))
            : (this.printConsole(`已清除应用数据: ${t}`, "success"),
              this.showProgress("app", `已清除应用数据: ${t}`, 100));
        }));
    },
    uninstallApp: function (e, t) {
      confirm(`确定要卸载应用 "${t}" 吗？`) &&
        (this.printConsole(`卸载应用: ${t}`, "info"),
        this.showProgress("app", "正在卸载应用...", -1),
        this.executeAdbCommand(
          `shell /system/bin/pm uninstall ${e}`,
          (e, s) => {
            0 !== s
              ? (this.printConsole(`卸载应用失败: ${e}`, "error"),
                this.showProgress("app", "卸载应用失败", 0))
              : (this.printConsole(`已卸载应用: ${t}`, "success"),
                this.showProgress("app", `已卸载应用: ${t}`, 100),
                setTimeout(() => {
                  this.listApps(document.getElementById("appSearch").value, !0);
                }, 500));
          },
        ));
    },
    installApp: function () {
      alert(
        "应用选择提示：\n✔ 请在「设备目录」中选择应用\n✖ 不要在「最近/下载内容」中选择应用",
      );
      var e = !1;
      this.chooseFile(
        { title: "请选择应用", multiple: !1, mime: "*/*", path: "/" },
        (t) => {
          if (e) return;
          ((e = !0),
            this.printConsole(
              "选择了文件：" + JSON.stringify(t.files),
              "info",
            ));
          const s = t.files[0];
          s && s.startsWith("/")
            ? (this.printConsole("正在检查应用安装权限...", "info"),
              this.showProgress("app", "正在检查应用安装权限...", -1),
              this.executeAdbCommand(
                "shell settings get secure install_non_market_apps",
                (e, t) => {
                  "1" != e
                    ? this.executeAdbCommand(
                        "shell settings put secure install_non_market_apps 1",
                        (e, t) => {
                          this.installAppWithProgress(s);
                        },
                      )
                    : this.installAppWithProgress(s);
                },
              ))
            : alert("不支持的目录，请在「设备目录」中选择！");
        },
        (e) => {
          this.printConsole(`选择应用失败: ${e.message || e}`, "error");
        },
      );
    },
    installAppWithProgress: function (e, t = 0) {
      const s = (e, s) => {
        (this.printConsole(
          `正在安装应用: ${e
            .split("/")
            .filter((e) => e)
            .pop()}`,
          "success",
        ),
          this.showProgress(0 === t ? "app" : "file", "正在安装应用...", -1),
          this.executeAdbCommand(
            `shell /system/bin/pm install -r ${s}`,
            (i, n) => {
              (0 === n && /(success|Success)/g.test(i)
                ? (this.printConsole(
                    `安装应用成功: ${e
                      .split("/")
                      .filter((e) => e)
                      .pop()}`,
                    "success",
                  ),
                  this.showProgress(
                    0 === t ? "app" : "file",
                    "安装应用成功",
                    100,
                  ),
                  setTimeout(() => {
                    this.listApps(
                      document.getElementById("appSearch").value,
                      !0,
                    );
                  }, 500))
                : (this.printConsole(`安装应用失败: ${i}`, "error"),
                  this.showProgress(
                    0 === t ? "app" : "file",
                    "安装应用失败",
                    0,
                  )),
                e != s &&
                  this.executeAdbCommand(`shell rm -f ${s}`, (e, t) => {}));
            },
            null,
            0,
          ));
      };
      if (((e = e.startsWith("file://") ? e.substring(7) : e), 1 === t))
        return s(e, e);
      const i = e,
        n = "/data/local/tmp/tmp.apk";
      let o = -1;
      (this.printConsole(
        `正在上传应用: ${i
          .split("/")
          .filter((e) => e)
          .pop()}`,
        "info",
      ),
        this.showProgress("app", "开始上传应用...", -1),
        this.executeAdbCommand(
          ["push", "-p", `"${i}"`, `"${n}"`],
          (e, t) => {
            0 !== t
              ? (this.printConsole(`上传应用失败: ${e}`, "error"),
                this.showProgress("app", "上传应用失败", 0))
              : (-1 === o &&
                  this.showProgress("app", "上传应用成功，等待安装...", -1),
                this.printConsole(
                  `上传应用成功: ${i
                    .split("/")
                    .filter((e) => e)
                    .pop()}`,
                  "success",
                ),
                s(i, n));
          },
          (e, t, s) => {
            const i = /(\d+)\%\]/.exec(e);
            if (i) {
              let e = parseInt(i[1]);
              o != e &&
                ((o = e),
                100 === o
                  ? this.showProgress("app", "上传应用成功，等待安装...", -1)
                  : this.setProgress("app", "上传应用", o));
            }
          },
        ));
    },
    printConsole: function (e, t = "output", s = !0) {
      const i = document.getElementById("consoleOutput"),
        n = document.createElement("div");
      n.className = "console-line" + (t ? ` ${t}-output` : "");
      const o = new Date().toTimeString().substr(0, 8),
        r = document.createElement("span");
      ((r.className = "timestamp"),
        (r.innerText = `[${o}]`),
        s && n.appendChild(r));
      const l = document.createElement("span");
      if (((l.id = "message"), n.appendChild(l), e)) {
        let t = document.createElement("div");
        t.style.display = "inline-block";
        for (let s of e.split("\n"))
          ((t.innerHTML = s),
            l.appendChild(t),
            (t = document.createElement("div")));
      }
      return (i.appendChild(n), (i.scrollTop = i.scrollHeight), n);
    },
    updateStatus: function (e, t) {
      const s = document.getElementById("statusIndicator");
      switch (
        ((document.getElementById("statusText").textContent = `设备状态: ${e}`),
        (s.className = "status-indicator "),
        t)
      ) {
        case "connected":
          s.classList.add("status-connected");
          break;
        case "error":
        default:
          s.classList.add("status-disconnected");
          break;
        case "connecting":
          s.style.background = "orange";
      }
    },
    navigateHistory: function (e) {
      0 !== this.commandHistory.length &&
        ((this.historyIndex = Math.max(
          0,
          Math.min(this.commandHistory.length - 1, this.historyIndex + e),
        )),
        (document.getElementById("consoleInput").value =
          this.commandHistory[this.historyIndex] || ""));
    },
    formatSize: function (e) {
      return e
        ? e < 1024
          ? e + " B"
          : e < 1048576
            ? (e / 1024).toFixed(1) + " KB"
            : e < 1073741824
              ? (e / 1048576).toFixed(1) + " MB"
              : (e / 1073741824).toFixed(1) + " GB"
        : "0 B";
    },
    showProgress: function (e, t, s) {
      clearTimeout(this.hideProgressTimer);
      const i = document
        .getElementById(`${e}Progress`)
        .querySelector(".progress-bar");
      (-1 === s
        ? (i.classList.add("indeterminate"), (i.style.width = "100%"))
        : (i.classList.remove("indeterminate"), (i.style.width = `${s}%`)),
        100 === s &&
          (this.hideProgressTimer = setTimeout(() => {
            this.hideProgress(e);
          }, 2e3)),
        (document.getElementById(`${e}ProgressText`).textContent = t),
        (document.getElementById(`${e}ProgressText`).style.display = "block"),
        (document.getElementById(`${e}Progress`).style.display = "block"));
    },
    setProgress: function (e, t, s) {
      clearTimeout(this.hideProgressTimer);
      const i = document
          .getElementById(`${e}Progress`)
          .querySelector(".progress-bar"),
        n = document.getElementById(`${e}ProgressText`);
      (() => {
        (-1 === s
          ? (i.classList.add("indeterminate"), (i.style.width = "100%"))
          : (i.classList.remove("indeterminate"), (i.style.width = `${s}%`)),
          t && (n.textContent = `${t}中` + (-1 !== s ? `: ${s}%` : "")),
          100 === s &&
            (t && (n.textContent = `${t}完成`),
            (this.hideProgressTimer = setTimeout(() => {
              this.hideProgress(e);
            }, 2e3))));
      })();
    },
    simulateProgress: function (e, t, s) {
      let i = Date.now();
      const n = document
          .getElementById(`${e}Progress`)
          .querySelector(".progress-bar"),
        o = document.getElementById(`${e}ProgressText`),
        r = () => {
          const l = Date.now() - i,
            c = Math.min(100, Math.floor((l / s) * 100));
          ((n.style.width = `${c}%`),
            (o.textContent = `${t}中: ${c}%`),
            c < 100
              ? setTimeout(r, 50)
              : ((o.textContent = `${t}完成`),
                setTimeout(() => {
                  this.hideProgress(e);
                }, 2e3)));
        };
      r();
    },
    hideProgress: function (e) {
      ((document.getElementById(`${e}ProgressText`).style.display = "none"),
        (document.getElementById(`${e}Progress`).style.display = "none"));
    },
    chooseFile: function (e, t, s) {
      let i = (99999 * Math.random()) >> 1;
      const n = plus.android.runtimeMainActivity(),
        o = plus.android.importClass("android.os.Build"),
        r = plus.android.importClass("android.content.Intent"),
        l =
          (plus.android.importClass("android.database.Cursor"),
          plus.android.importClass("java.io.File"),
          plus.android.importClass("android.net.Uri")),
        c =
          (plus.android.importClass("android.content.ContentResolver"),
          plus.android.importClass("android.provider.DocumentsContract")),
        d = plus.android.importClass("android.os.Environment"),
        a = new r(r.ACTION_GET_CONTENT);
      if (
        (a.addCategory(r.CATEGORY_OPENABLE), a.setType(e.mime || "*/*"), e.path)
      ) {
        let t = `:${e.path}`;
        (t.endsWith("/") && t.substring(0, t.length - 1),
          a.putExtra(
            c.EXTRA_INITIAL_URI,
            l.parse(
              `content://com.android.externalstorage.documents/document/primary${encodeURIComponent(t)}`,
            ),
          ));
      }
      (e.multiple && a.putExtra(r.EXTRA_ALLOW_MULTIPLE, !0),
        (n.onActivityResult = (e, r, l) => {
          if (e !== i) return;
          if (((i = -123), (n.onActivityResult = () => {}), r !== n.RESULT_OK))
            return void (s && s(r));
          const a = l.getClipData(),
            h = [];
          if (a && a.getItemCount() > 0)
            for (let e = 0; e < a.getItemCount(); e++)
              h.push(a.getItemAt(e).getUri());
          else l.getData() && h.push(l.getData());
          t &&
            t({
              files: h.map((e) =>
                ((e) => {
                  const t = e.getScheme();
                  if ("file" === t.toLowerCase()) return e.getPath();
                  if ("content" === t.toLowerCase()) {
                    const t = e.getPath();
                    if (t.startsWith("/external_files"))
                      return "/sdcard" + t.substring(15);
                  }
                  if (c.isDocumentUri(n, e)) {
                    const t = c.getDocumentId(e).split(":"),
                      s = t[0];
                    if ("primary" === s.toLowerCase())
                      return (
                        d.getExternalStorageDirectory().toString() + "/" + t[1]
                      );
                    if ("home" === s.toLowerCase())
                      return (
                        d.getExternalStorageDirectory().toString() +
                        "/Documents/" +
                        t[1]
                      );
                  }
                  return o.VERSION.SDK_INT >= 29
                    ? e.toString()
                    : o.VERSION.SDK_INT >= 19 && "content" === t.toLowerCase()
                      ? ((e, t = null, s = null) => {
                          let i = null;
                          const o = "_data",
                            r = [o];
                          try {
                            if (
                              ((i = n
                                .getContentResolver()
                                .query(e, r, t, s, null)),
                              null != i && i.moveToFirst())
                            ) {
                              const e = i.getColumnIndexOrThrow(o);
                              return i.getString(e);
                            }
                          } catch (e) {
                          } finally {
                            null != i && i.close();
                          }
                          return null;
                        })(e)
                      : null;
                })(e),
              ),
            });
        }),
        n.startActivityForResult(
          r.createChooser(a, e.title || "请选择文件"),
          i,
        ));
    },
  },
  parseCommand = (e) => (e || "").match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [],
  isNetworkDevice = (e) => /^(\S+:\d+)|(\S+\._tcp\.)^/.test(e);
function permToNumber(e) {
  const t = e.slice(1);
  let s = "";
  const i = [
    "s" === t[2] || "S" === t[2] ? 4 : 0,
    "s" === t[5] || "S" === t[5] ? 2 : 0,
    "t" === t[8] || "T" === t[8] ? 1 : 0,
  ].reduce((e, t) => e + t, 0);
  for (let e = 0; e < 9; e += 3) {
    const i = t.slice(e, e + 3);
    s +=
      ("r" === i[0] ? 4 : 0) +
      ("w" === i[1] ? 2 : 0) +
      (i[2].match(/[xsStT]/) ? 1 : 0);
  }
  return i > 0 ? i + s : s;
}
ADBConsole.init();
