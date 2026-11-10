class AsyncLock {
  constructor() {
    ((this.locked = !1), (this.queue = []));
  }
  acquire() {
    return new Promise((resolve) => {
      this.locked
        ? this.queue.push(resolve)
        : ((this.locked = !0), resolve(this.release.bind(this)));
    });
  }
  release() {
    this.queue.length > 0 ? this.queue.shift()(this.release.bind(this)) : (this.locked = !1);
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
        document.getElementById("deviceSelect").addEventListener("change", (event) => {
          if (!event.target.value) return;
          this.isConnected = !1;
          const value = event.target.value;
          value &&
            (this.printConsole(`已选择设备: ${value}`, "info"),
            isNetworkDevice(value) &&
              (document.getElementById("ipAddress").value.length ||
                (document.getElementById("ipAddress").value = value)),
            this.connectionCheck(value, (value2, value3) => {
              value2
                ? this.printConsole("切换设备成功", "info")
                : this.printConsole(`切换设备失败: ${value3}`, "error");
            }));
        }),
        document.querySelectorAll(".tab").forEach((element) => {
          "connectionTabContainer" === element.parentNode.id
            ? ("usb" === element.getAttribute("data-tab") && (element.style.display = "none"),
              element.addEventListener("click", (event) => {
                (event.target.parentNode
                  .querySelectorAll(".active")
                  .forEach((element2) => element2.classList.remove("active")),
                  event.target.classList.add("active"),
                  (this.connectionType = event.target.getAttribute("data-tab")),
                  (document.getElementById("wifiSettings").style.display =
                    "wifi" === this.connectionType ? "block" : "none"));
              }),
              element.getAttribute("data-tab") == this.connectionType && element.click())
            : element.addEventListener("click", (event) => {
                if (!this.isConnected && "console" != event.target.getAttribute("data-tab"))
                  return this.printConsole("请先连接设备", "error");
                (event.target.parentNode
                  .querySelectorAll(".tab")
                  .forEach((element2) => element2.classList.remove("active")),
                  event.target.classList.add("active"),
                  document
                    .querySelectorAll(".tab-content")
                    .forEach((element2) => element2.classList.remove("active")),
                  document
                    .getElementById(element.getAttribute("data-tab") + "Tab")
                    .classList.add("active"));
              });
        }));
      const consoleInputElement = document.getElementById("consoleInput");
      let timeoutId;
      (consoleInputElement.addEventListener("keydown", (event) => {
        if ("Enter" === event.key) {
          event.preventDefault();
          const text = consoleInputElement.value.trim();
          if (text)
            return (
              this.isInShellMode ? this.executeShellCommand(text) : this.executeCommand(text),
              (consoleInputElement.value = ""),
              !1
            );
        } else {
          if ("ArrowUp" === event.key)
            return (event.preventDefault(), this.navigateHistory(-1), !1);
          if ("ArrowDown" === event.key)
            return (event.preventDefault(), this.navigateHistory(1), !1);
        }
      }),
        document.getElementById("clearConsoleBtn").addEventListener("click", () => {
          ((document.getElementById("consoleOutput").innerHTML = ""),
            this.printConsole("控制台已清空", "info"));
        }),
        document.getElementById("connectBtn").addEventListener("click", () => {
          this.connect();
        }),
        document.getElementById("disconnectBtn").addEventListener("click", () => {
          this.disconnect();
        }),
        document.getElementById("refreshDevicesBtn").addEventListener("click", (event) => {
          this.discoverDevices();
        }),
        document.getElementById("rebootDeviceBtn").addEventListener("click", () => {
          this.rebootDevice();
        }),
        document.getElementById("refreshDeviceInfoBtn").addEventListener("click", () => {
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
          .addEventListener("click", () => this.listFiles(this.currentDirectory)),
        document
          .getElementById("createFolderBtn")
          .addEventListener("click", () => this.createFolder()),
        document.getElementById("homeBtn").addEventListener("click", () => this.goHomeDirectory()),
        document.getElementById("installFileAppBtn").addEventListener("click", () => {
          if (this.selectedFile) {
            const dataPath = this.selectedFile.getAttribute("data-path");
            (this.printConsole("正在检查应用安装权限...", "info"),
              this.showProgress("file", "正在检查应用安装权限...", -1),
              this.executeAdbCommand(
                "shell settings get secure install_non_market_apps",
                (value, value2) => {
                  "1" != value
                    ? this.executeAdbCommand(
                        "shell settings put secure install_non_market_apps 1",
                        (value3, value4) => {
                          this.installAppWithProgress(dataPath, 1);
                        },
                      )
                    : this.installAppWithProgress(dataPath, 1);
                },
              ),
              this.closeFileActionModal());
          }
        }),
        document.getElementById("uploadFileBtn").addEventListener("click", () => this.uploadFile()),
        document.getElementById("downloadFileBtn").addEventListener("click", () => {
          this.selectedFile && (this.downloadFile(), this.closeFileActionModal());
        }),
        document.getElementById("deleteFileBtn").addEventListener("click", () => {
          this.selectedFile && (this.deleteFile(), this.closeFileActionModal());
        }),
        document.getElementById("ReNameFileBtn").addEventListener("click", () => {
          this.selectedFile && (this.reNameFile(), this.closeFileActionModal());
        }),
        document.getElementById("SetFilePermissionBtn").addEventListener("click", () => {
          this.selectedFile && (this.setFilePermission(), this.closeFileActionModal());
        }),
        document.getElementById("refreshAppsBtn").addEventListener("click", () => {
          ((document.getElementById("appSearch").value = ""), this.listApps("", !0));
        }),
        document.getElementById("installAppBtn").addEventListener("click", () => this.installApp()),
        document
          .getElementById("appSearch")
          .addEventListener("input", (event) => this.filterApps(event.target.value)),
        document.getElementById("enableAppBtn").addEventListener("click", () => {
          this.selectedApp &&
            (this.enableApp(this.selectedApp.packageName, this.selectedApp.appName),
            this.closeAppActionModal());
        }),
        document.getElementById("disabledAppBtn").addEventListener("click", () => {
          this.selectedApp &&
            (this.disabledApp(this.selectedApp.packageName, this.selectedApp.appName),
            this.closeAppActionModal());
        }),
        document.getElementById("unHideAppBtn").addEventListener("click", () => {
          this.selectedApp &&
            (this.unHideApp(this.selectedApp.packageName, this.selectedApp.appName),
            this.closeAppActionModal());
        }),
        document.getElementById("hideAppBtn").addEventListener("click", () => {
          this.selectedApp &&
            (this.hideApp(this.selectedApp.packageName, this.selectedApp.appName),
            this.closeAppActionModal());
        }),
        document.getElementById("clearAppBtn").addEventListener("click", () => {
          this.selectedApp &&
            (this.clearApp(this.selectedApp.packageName, this.selectedApp.appName),
            this.closeAppActionModal());
        }),
        document.getElementById("uninstallAppBtn").addEventListener("click", () => {
          this.selectedApp &&
            (this.uninstallApp(this.selectedApp.packageName, this.selectedApp.appName),
            this.closeAppActionModal());
        }),
        document.querySelectorAll(".close").forEach((item) => {
          "fileActionClose" === item.id
            ? item.addEventListener("click", () => this.closeFileActionModal())
            : "appActionClose" === item.id &&
              item.addEventListener("click", () => this.closeAppActionModal());
        }),
        window.addEventListener("click", (event) => {
          "fileActionModal" === event.target.id
            ? this.closeFileActionModal()
            : "appActionModal" === event.target.id && this.closeAppActionModal();
        }),
        document.getElementById("fileBrowser").addEventListener("click", (event) => {
          const element = event.target.closest(".file-item");
          if (element) {
            const dataPath = element.getAttribute("data-path");
            if ("true" === element.getAttribute("data-dir"))
              ((this.currentDirectory = dataPath),
                (document.getElementById("currentPath").value = dataPath),
                this.listFiles(dataPath));
            else {
              this.selectedFile = element;
              const text = this.selectedFile
                .getAttribute("data-path")
                .split("/")
                .filter((item) => item)
                .pop();
              (text.toLowerCase().endsWith(".apk") || text.toLowerCase().endsWith(".apk.1")
                ? (document.getElementById("installFileAppBtn").style.display = "")
                : (document.getElementById("installFileAppBtn").style.display = "none"),
                this.showFileActionModal());
            }
          }
        }),
        document.getElementById("fileBrowser").addEventListener("touchstart", (event) => {
          timeoutId = setTimeout(() => {
            const toucheItem = event.touches[0],
              value = document.elementFromPoint(toucheItem.clientX, toucheItem.clientY),
              parentNode = value
                ? "file-item" !== value.className
                  ? value.parentNode
                  : value
                : null;
            parentNode &&
              (parentNode.getAttribute("data-path"),
              parentNode.getAttribute("data-dir"),
              (this.selectedFile = parentNode),
              this.showFileActionModal());
          }, 500);
        }),
        document
          .getElementById("fileBrowser")
          .addEventListener("touchend", () => clearTimeout(timeoutId)),
        document
          .getElementById("fileBrowser")
          .addEventListener("touchmove", () => clearTimeout(timeoutId)),
        document.getElementById("currentPath").addEventListener("keydown", (event) => {
          "Enter" === event.key &&
            ((this.currentDirectory = event.target.value), this.listFiles(this.currentDirectory));
        }),
        document.getElementById("appList").addEventListener("click", (event) => {
          const value = event.target.closest(".app-item");
          if (value) {
            const textContent = value.querySelector(".app-package").textContent,
              textContent2 = value.querySelector(".app-name").textContent,
              textContent3 = value.querySelector(".app-path").textContent,
              status = value.querySelector(".app-icon").getAttribute("status");
            ((this.selectedApp = {
              packageName: textContent,
              appName: textContent2,
              appPath: textContent3,
              status: status,
            }),
              this.showAppActionModal(this.selectedApp, value));
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
            (value) => {
              (this.printConsole("正在初始化ADB...", "info"),
                this.updateStatus("正在初始化ADB", "disconnected"),
                this.setupAdb());
              const storedCurrentDevice = plus.storage.getItem("currentDevice");
              storedCurrentDevice &&
                isNetworkDevice(storedCurrentDevice) &&
                (document.getElementById("ipAddress").value = storedCurrentDevice);
            },
            (value) => {
              this.printConsole("错误：权限被拒绝", "error");
            },
          ))
        : this.printConsole("错误: 此功能仅支持Android平台", "error");
    },
    setupAdb: function () {
      closeWebview = (value3) => {
        if (!confirm("确定要返回首页吗？")) return;
        const callback5 = () => {
          setTimeout(() => {
            plus.webview.currentWebview().close();
          }, 500);
        };
        this.isConnected ? this.disconnect(callback5) : callback5();
      };
      const buildClass = plus.android.importClass("android.os.Build");
      (this.printConsole(
        "兼容性检查：" +
          (buildClass.SUPPORTED_32_BIT_ABIS.length
            ? `32[${buildClass.SUPPORTED_32_BIT_ABIS}]`
            : `64[${buildClass.SUPPORTED_64_BIT_ABIS}]`),
        "info",
      ),
        (this.adbUrl = adbUrls[buildClass.SUPPORTED_32_BIT_ABIS.length ? 0 : 1]));
      const value = plus.android.runtimeMainActivity(),
        cacheDir = value.getCacheDir();
      plus.android.importClass(cacheDir);
      const value2 = cacheDir.getAbsolutePath() + "/adb-cache",
        filesDir = value.getFilesDir();
      plus.android.importClass(filesDir);
      const absolutePath = filesDir.getAbsolutePath(),
        callback = (value3, value4) => {
          0 !== value4
            ? (this.printConsole(`ADB初始化失败: ${value3}`, "error"),
              this.updateStatus("ADB初始化失败", "error"))
            : this.executeCommandWithoutAdb("mkdir /sdcard/adb-tmp", (value5) => {
                ((this.adb = absolutePath + "/adb"),
                  this.executeCommandWithoutAdb("ls -l", (value6) => {}),
                  this.executeCommandWithoutAdb(`rm -rf ${value2}`, (value6) => {
                    this.executeCommandWithoutAdb(`mkdir ${value2}`, (value7) => {
                      this.executeCommandWithoutAdb(`chmod -R 777 ${value2}`, (value8) => {
                        ((this.adbCache = value2),
                          this.executeAdbCommand("start-server", (value9, value10) => {
                            0 !== value10
                              ? (this.printConsole(`ADB初始化失败: ${value9}`, "error"),
                                this.updateStatus("ADB初始化失败", "error"))
                              : ((this.adbCache = value2),
                                this.printConsole("ADB初始化完成", "success"),
                                this.updateStatus("未连接", "disconnected"),
                                ["connectBtn", "disconnectBtn"].forEach((item) => {
                                  ((document.getElementById(item).disabled = !1),
                                    (document.getElementById(item).style.display = ""));
                                }),
                                this.discoverDevices());
                          }));
                      });
                    });
                  }));
              });
        },
        callback2 = () => {
          plus.io.resolveLocalFileSystemURL(
            this.adbPath,
            (value3) => {
              this.executeCommandWithoutAdb(
                `cp -rf ${value3.fullPath} ${absolutePath}`,
                (value4, value5) => {
                  0 !== value5
                    ? callback(value4, value5)
                    : this.executeCommandWithoutAdb(
                        `chmod -R 777 ${absolutePath}`,
                        (value6, value7) => {
                          callback(value6, value7);
                        },
                      );
                },
              );
            },
            (value3) => {
              (this.printConsole("找不到ADB文件: " + (value3.message || value3), "error"),
                this.updateStatus("ADB初始化失败", "error"));
            },
          );
        },
        callback3 = (value3, value4) => {
          const callback5 = () => {
            plus.zip.decompress(
              value3,
              this.adbPath,
              () => {
                value4 && value4(!0);
              },
              (value5) => {
                value4 && value4(!1);
              },
            );
          };
          plus.io.resolveLocalFileSystemURL(
            this.adbPath,
            (value5) => {
              value5.removeRecursively(callback5, callback5);
            },
            callback5,
          );
        },
        callback4 = () => {
          plus.downloader
            .createDownload(
              this.adbUrl,
              {
                filename: `_doc/${this.adbUrl
                  .split("/")
                  .filter((item) => item)
                  .pop()}`,
              },
              (value3, value4) => {
                if (200 === value4)
                  plus.io.resolveLocalFileSystemURL(
                    value3.filename,
                    (value5) => {
                      (this.printConsole("ADB包下载成功，开始解压...", "info"),
                        callback3(value5.fullPath, (value6) => {
                          if (value6)
                            (this.printConsole("ADB包解压成功，开始初始化...", "info"),
                              callback2());
                          else {
                            this.printConsole("ADB包解压失败，稍后重新下载...", "error");
                            try {
                              value5.remove();
                            } catch {}
                            setTimeout(callback4, 1e3);
                          }
                        }));
                    },
                    () => {
                      (this.printConsole("ADB包下载失败，稍后重新下载...", "error"),
                        setTimeout(callback4, 1e3));
                    },
                  );
                else {
                  this.printConsole("ADB包下载失败，稍后重新下载...", "error");
                  try {
                    entry.remove();
                  } catch {}
                  setTimeout(callback4, 1e3);
                }
              },
            )
            .start();
        };
      plus.io.resolveLocalFileSystemURL("_doc", (value3) => {
        value3.getFile(
          this.adbUrl
            .split("/")
            .filter((item) => item)
            .pop(),
          { create: !1 },
          (value4) => {
            callback3(value4.fullPath, (value5) => {
              if (value5) callback2();
              else {
                this.printConsole("ADB包解压失败，稍后重新下载...", "error");
                try {
                  value4.remove();
                } catch {}
                setTimeout(callback4, 1e3);
              }
            });
          },
          () => {
            (this.printConsole("ADB包不存在，开始下载...", "info"),
              value3.createReader().readEntries(
                (value4) => {
                  (value4.forEach((item) => {
                    if (/^adb/.test(item.name))
                      try {
                        item.isDirectory ? item.removeRecursively() : item.remove();
                      } catch {}
                  }),
                    callback4());
                },
                (value4) => {
                  callback4();
                },
              ));
          },
        );
      });
    },
    discoverDevices: function (value = !0, value2) {
      ((this.devices = []),
        value && this.printConsole("正在扫描已连接设备...", "info"),
        value && this.updateStatus("扫描设备中...", "connecting"),
        this.executeAdbCommand("devices", (text, value3) => {
          if (0 !== value3)
            return (
              value2 && value2(text, value3),
              value && this.printConsole(`扫描设备失败: ${text}`, "error"),
              void (value && this.updateStatus("扫描失败", "error"))
            );
          const items = text.split("\n");
          this.devices = [];
          for (let index = 1; index < items.length; index++) {
            const text2 = items[index].trim();
            if (text2 && !text2.startsWith("*")) {
              const items2 = text2.split("\t");
              if (items2.length >= 2) {
                const items2Item = items2[0],
                  items2Item2 = items2[1];
                this.devices.push({ id: items2Item, name: items2Item, type: items2Item2 });
              }
            }
          }
          (this.updateDeviceList(),
            value && this.printConsole(`发现 ${this.devices.length} 台设备`, "success"),
            value && this.updateStatus("扫描完成", "connected"),
            value2 && value2(text, value3));
        }));
    },
    updateDeviceList: function () {
      const deviceSelectElement = document.getElementById("deviceSelect");
      if (((deviceSelectElement.innerHTML = ""), 0 === this.devices.length)) {
        const option = document.createElement("option");
        return (
          (option.value = ""),
          (option.textContent = "-- 未找到设备 --"),
          deviceSelectElement.appendChild(option),
          void (document.getElementById("deviceListGroup").style.display = "none")
        );
      }
      ((deviceSelectElement.innerHTML = '<option value="">-- 请选择设备 --</option>'),
        this.devices.forEach((item) => {
          const option = document.createElement("option");
          ((option.value = item.id),
            (option.textContent = item.id),
            deviceSelectElement.appendChild(option));
        }),
        (deviceSelectElement.value = ""),
        (document.getElementById("deviceListGroup").style.display = "block"));
    },
    connect: function () {
      if (((this.isConnected = !1), "wifi" === this.connectionType)) {
        const value = document.getElementById("ipAddress").value;
        if (!value)
          return (
            this.printConsole("请输入IP地址", "error"),
            void this.updateStatus("需要IP地址", "error")
          );
        this.connectWifi(value);
      } else this.connectUsb();
    },
    connectUsb: function () {
      (this.printConsole("正在连接USB设备...", "info"),
        this.updateStatus("正在连接...", "connecting"),
        this.discoverDevices(!1, (text, value) => {
          if (0 !== value)
            return (
              this.printConsole(`连接失败: ${text}`, "error"),
              void this.updateStatus("连接失败", "error")
            );
          const items = text.split("\n");
          let isEnabled = !1,
            text2 = "";
          for (let index = 1; index < items.length; index++) {
            const text3 = items[index].trim();
            if (text3 && text3.includes("device")) {
              const itemItem = text3.split("\t")[0];
              if (itemItem) {
                ((isEnabled = !0), (text2 = itemItem));
                break;
              }
            }
          }
          isEnabled
            ? (this.printConsole(`找到 ${this.devices.length} 个设备`),
              this.printConsole(`已自动选择设备: ${text2}`),
              this.connectionCheck(text2))
            : (this.printConsole("未找到已连接的设备", "error"),
              this.updateStatus("设备未找到", "error"));
        }));
    },
    connectWifi: function (value) {
      (this.printConsole(`正在连接WiFi设备 ${value}...`, "info"),
        this.updateStatus("正在连接...", "connecting"),
        this.executeAdbCommand(`connect ${value}`, (value2, value3) => {
          0 === value3 && value2.includes("connected")
            ? this.connectionCheck(value)
            : (this.printConsole(`连接失败: ${value2}`, "error"),
              this.updateStatus("连接失败", "error"));
        }));
    },
    connectionCheck: function (value, value2 = null) {
      (this.exitShellMode(),
        this.discoverDevices(!1, (value3, value4) => {
          if (!this.devices.length && isNetworkDevice(value))
            return void this.executeAdbCommand(`connect ${value}`, (value5, value6) => {
              this.connectionCheck(value, value2);
            });
          const options = this.devices.find((item) => item.id.includes(value)) || {};
          if (0 === value4 && this.devices.length && "device" == options.type)
            (this.onConnectSuccess(options.id), value2 && value2(!0, "连接成功", options));
          else {
            switch (options.type) {
              case "unauthorized":
                return (
                  this.printConsole("连接失败: 设备未授权", "info"),
                  this.updateStatus("未授权", "error"),
                  void (value2 && value2(!1, "设备未授权", options))
                );
              case "offline":
                return (
                  this.printConsole(
                    `连接失败: ${options.type || value3}, 正在尝试重新连接...`,
                    "error",
                  ),
                  void this.executeAdbCommand(["-s", options.id, "reconnect"], (value5, value6) => {
                    0 !== value6
                      ? (this.printConsole(`重新连接失败: ${value5}`, "error"),
                        this.updateStatus("连接失败", "error"),
                        value2 && value2(!1, `${value5}`, options))
                      : (this.onConnectSuccess(options.id),
                        value2 && value2(!0, "连接成功", options));
                  })
                );
            }
            (this.printConsole(`连接失败: ${options.type || value3}`, "error"),
              this.updateStatus("连接失败", "error"),
              value2 && value2(!1, `${options.type || value3}`, options));
          }
        }));
    },
    onConnectSuccess: function (value) {
      ((this.isConnected = !0),
        (this.currentDevice = value),
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
    reconnectDevice: async function (value) {
      if (this.currentDevice) {
        const locked = this.reconnectDeviceLock.locked,
          value2 = await this.reconnectDeviceLock.acquire();
        if (locked) return (value(), value2());
        (this.printConsole("检测到设备断开，尝试重连...", "info"),
          isNetworkDevice(this.currentDevice)
            ? this.executeAdbCommand(["connect", this.currentDevice], (value3) => {
                (this.printConsole(`设备重新连接结果: ${value3}`, "info"), value(), value2());
              })
            : this.executeAdbCommand(["devices"], () => {
                (value(), value2());
              }));
      }
    },
    disconnect: function (options = null) {
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
          options && options());
      });
    },
    rebootDevice: function () {
      confirm("确定要重启设备吗？") &&
        (this.printConsole("正在重启设备", "info"),
        this.showProgress("device", "正在重启设备...", -1),
        this.executeAdbCommand(["shell", "reboot"], (value, value2) => {
          0 !== value2
            ? (this.printConsole(`重启设备失败: ${value}`, "error"),
              this.showProgress("device", "重启设备失败", 0))
            : (this.printConsole("已重启设备", "success"),
              this.showProgress("device", "已重启设备", 100));
        }));
    },
    getDeviceInfo: function () {
      this.isConnected &&
        (this.executeAdbCommand("shell getprop net.hostname", (value) => {
          document.getElementById("deviceName").textContent = value || "未知";
        }),
        this.executeAdbCommand("shell ifconfig wlan0", (value) => {
          const value2 = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.exec(value);
          document.getElementById("deviceIP").textContent = (value2 && value2[0]) || "未知";
        }),
        this.executeAdbCommand("shell getprop ro.serialno", (value) => {
          document.getElementById("deviceSN").textContent = value || "未知";
        }),
        this.executeAdbCommand("shell getprop ro.build.version.incremental", (value) => {
          document.getElementById("firmwareVersion").textContent = value || "未知";
        }),
        this.executeAdbCommand("shell getprop ro.build.version.release", (value) => {
          document.getElementById("androidVersion").textContent = value || "未知";
        }),
        this.executeAdbCommand("shell dumpsys meminfo | grep RAM:", (value) => {
          document.getElementById("memoryInfo").textContent = value;
          const sizeText = this.formatSize(
              1024 * parseInt(/Total RAM: (\S+)(\s)?(k|K)/g.exec(value)[1].replace(/\,/g, "")),
            ),
            sizeText2 = this.formatSize(
              1024 *
                (parseInt(/Free RAM: (\S+)(\s)?(k|K)/g.exec(value)[1].replace(/\,/g, "")) - 15e3),
            );
          document.getElementById("memoryInfo").textContent = `${sizeText2} / ${sizeText}`;
        }),
        (document.getElementById("storageInfo").parentNode.style.display = "none"),
        this.executeAdbCommand("shell dumpsys battery", (value) => {
          const value2 = value.match(/level: (\d+)/),
            value3 = value.match(/status: (\d+)/);
          let text = "未知";
          if ((value2 && (text = `电量: ${value2[1]}%`), value3)) {
            const numericValue = parseInt(value3[1]);
            text += ` (${2 === numericValue ? "充电中" : 3 === numericValue ? "放电中" : 5 === numericValue ? "满电" : "未知"})`;
          }
          document.getElementById("batteryStatus").textContent = text;
        }));
    },
    enterShellMode: function () {
      this.isInShellMode ||
        this.executeAdbCommand(
          "shell",
          (value, value2) => {
            0 !== value2 &&
              value.includes("error: closed") &&
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
        (document.getElementById("consoleInput").placeholder = "输入Shell命令，按Enter执行"),
        this.printConsole('已进入Shell模式，输入"exit"退出', "info"));
    },
    exitShellMode: function () {
      if (!this.isInShellMode) return;
      const stringClass = plus.android.importClass("java.lang.String");
      try {
        const outputStream = this.currentProcess.getOutputStream();
        (outputStream.write(3),
          outputStream.flush(),
          outputStream.write(new stringClass("exit\n").getBytes("UTF-8")),
          outputStream.flush(),
          outputStream.write(3),
          outputStream.flush());
      } catch {
        this._exitShellMode();
      }
    },
    _exitShellMode: function () {
      this.isInShellMode &&
        ((this.isInShellMode = !1),
        (document.getElementById("shellBtn").innerHTML =
          '<i class="fas fa-terminal"></i> 进入Shell'),
        (document.getElementById("consoleInput").placeholder = "输入ADB命令，按Enter执行"),
        this.printConsole("已退出Shell模式", "info"));
    },
    executeShellCommand: function (text) {
      if (!this.isConnected) return void this.printConsole("错误: 未连接设备", "error");
      if ("exit" === text.trim()) return void this.exitShellMode();
      const command = parseCommand(text),
        stringClass = plus.android.importClass("java.lang.String");
      try {
        const outputStream = this.currentProcess.getOutputStream();
        (outputStream.write(
          new stringClass(`${command.join(" ").replace(/(?<!\\)"/g, '\\"')}\n`).getBytes("UTF-8"),
        ),
          outputStream.flush());
      } catch {
        this._exitShellMode();
      }
    },
    executeCommand: function (value) {
      this.isConnected
        ? (this.commandHistory.push(value),
          (this.historyIndex = this.commandHistory.length),
          this.printConsole(`$ ${value}`, "command"),
          this.executeAdbCommand(
            value,
            (value2, value3) => {
              this.printConsole(value2, 0 !== value3 ? "error" : "info");
            },
            null,
            0,
          ))
        : this.printConsole("错误: 未连接设备", "error");
    },
    executeAdbCommand: function (value, value2, value3, value4 = -1, value5 = 0) {
      const value6 = Array.isArray(value) ? value : parseCommand(value),
        items = ["./adb"];
      ("adb" === value6[0] && value6.shift(),
        this.currentDevice && !value6[0].startsWith("-s") && items.push("-s", this.currentDevice),
        value6[0].startsWith("-s") && items.push(value6.shift(), value6.shift()),
        items.push(...value6));
      let value7 = ["shell", "pull", "push"].find((item) => value6[0].includes(item))
          ? null
          : this.printConsole("", "", !1),
        numericValue = 0,
        value8 = null;
      const callback = (value9, value10) => {
        (value7 && value7.remove(),
          !value8 && value2 && value2(value9, value10),
          value8 && this._exitShellMode());
      };
      this.executeCommandWithoutAdb(
        items,
        (value9, value10) => {
          const isMatch =
            /(no devices\/emulators found|device \S+ not found|device offline|device unauthorized)/i.test(
              value9,
            );
          ["push", "pull", "shell"].find((item) => item.includes(value6[0])) &&
          isMatch &&
          value5 < 2
            ? this.reconnectDevice(() => {
                setTimeout(() => {
                  this.executeAdbCommand(value, value2, value3, (value4 = -1), value5 + 1);
                }, 1e3);
              })
            : callback(value9, value10);
        },
        (text, value9, value10) => {
          if ((value3 && value3(text, value9, value10), !value9)) {
            if (/^\S+\:\/(\S+)? (\$|\#)$/g.test(text))
              return (
                value7 && value7.remove(),
                this._enterShellMode(),
                void (value8 = this.printConsole(text.trim() + " ", "info", !1))
              );
            if (value7) {
              let messageElement2 = value7.querySelector("#message");
              const container2 = document.createElement("div");
              if (
                ((container2.innerText = text),
                messageElement2.appendChild(container2),
                Date.now() - numericValue >= 100)
              ) {
                numericValue = Date.now();
                const consoleOutputElement = document.getElementById("consoleOutput");
                consoleOutputElement.scrollTop = consoleOutputElement.scrollHeight;
              }
            }
            if (!value8) return;
            document.body.contains(value8) || (value8 = this.printConsole("", "info", !1));
            const messageElement = value8.querySelector("#message"),
              divElement = messageElement.querySelectorAll("div");
            if (
              divElement.length &&
              divElement.length < 3 &&
              divElement[divElement.length - 1].innerText === text
            )
              return;
            const container = document.createElement("div");
            if (
              (1 === divElement.length && (container.style.display = "inline-block"),
              (container.innerText = text),
              messageElement.appendChild(container),
              Date.now() - numericValue >= 100)
            ) {
              numericValue = Date.now();
              const consoleOutputElement = document.getElementById("consoleOutput");
              consoleOutputElement.scrollTop = consoleOutputElement.scrollHeight;
            }
          }
        },
        value4,
      );
    },
    executeCommandWithoutAdb: function (value, value2, value3, value4 = -1) {
      Array.isArray(value) || (value = parseCommand(value));
      const callback = (value5, value6, value7) => {
        const value8 = Date.now(),
          fileClass = plus.android.importClass("java.io.File"),
          randomAccessFileClass = plus.android.importClass("java.io.RandomAccessFile"),
          fileClassInstance = new fileClass(value5);
        let numericValue = 0,
          isEnabled = !1,
          index = 0;
        const numericValue2 = 1e3;
        if (fileClassInstance.exists())
          try {
            const randomAccessFileClassInstance = new randomAccessFileClass(fileClassInstance, "r");
            let isEnabled2 = !1;
            const callback2 = () => {
              if (!isEnabled)
                try {
                  const value9 = fileClassInstance.length();
                  if (
                    (value9 < numericValue &&
                      ((numericValue = 0),
                      (isEnabled2 = !1),
                      randomAccessFileClassInstance.seek(0)),
                    value9 > numericValue)
                  ) {
                    let value10;
                    randomAccessFileClassInstance.seek(numericValue);
                    let isEnabled3 = !1;
                    for (; null !== (value10 = randomAccessFileClassInstance.readLine());) {
                      const text = decodeURIComponent(escape(String(value10))).trim();
                      if (
                        ((numericValue = randomAccessFileClassInstance.getFilePointer()),
                        (index = 0),
                        text.startsWith("exec_start:"))
                      )
                        isEnabled2 = !0;
                      else if (isEnabled2) {
                        if (/^(\^C)?exit_code: -?(\d+)/.test(text) || text.startsWith("exec_end")) {
                          ((isEnabled2 = !1), (isEnabled3 = !0));
                          const value11 = /exit_code: (\S+)/.exec(text),
                            numericValue3 = value11 ? parseInt(value11[1]) : -1;
                          try {
                            value6(text, !0, numericValue3);
                          } catch (error) {}
                          try {
                            randomAccessFileClassInstance.close();
                          } catch (error) {}
                          isEnabled = !0;
                          try {
                            value7 && value7(!0, numericValue3);
                          } catch (error) {}
                          return;
                        }
                        if (text.trim())
                          try {
                            value6(text, !1);
                          } catch (error) {}
                      }
                    }
                  }
                  if (
                    (index++ > numericValue2 && -1 === value4) ||
                    (value4 > 0 && Date.now() - value8 >= value4)
                  )
                    return (
                      randomAccessFileClassInstance.close(),
                      (isEnabled = !0),
                      void (value7 && value7(!1, -1))
                    );
                  setTimeout(callback2, 50);
                } catch (error) {
                  if (!isEnabled && index++ < numericValue2) setTimeout(callback2, 50);
                  else {
                    try {
                      randomAccessFileClassInstance.close();
                    } catch (error2) {}
                    ((isEnabled = !0), value7 && value7(!1, -1));
                  }
                }
            };
            callback2();
          } catch (error) {
            !isEnabled && index++ < numericValue2
              ? setTimeout(() => callback(value5, value6, value7), 100)
              : ((isEnabled = !0), value7 && value7(!1, -1));
          }
        else setTimeout(() => callback(value5, value6, value7), 10);
      };
      (() => {
        let value5 = -2;
        const itemCount = value[0].startsWith("./adb") && this.adbCache.length;
        value[0].startsWith("./adb") && (value[0] = value[0].replace("./adb", "./bin/adb"));
        try {
          const processBuilderClass = plus.android.importClass("java.lang.ProcessBuilder"),
            value6 =
              (plus.android.importClass("java.util.Map"),
              plus.android.importClass("java.util.ArrayList")),
            fileClass = plus.android.importClass("java.io.File"),
            value6Instance = new value6();
          let value7 = null,
            value8 = null;
          if (
            (itemCount &&
              ((value8 = `${Date.now()}_${((numericValue = 1e5), Math.floor(899999 * Math.random()) + numericValue)}`),
              (value7 = `${this.adbCache}/${value8}.log`)),
            itemCount && value.includes("shell"))
          ) {
            let value10 = value.findIndex((item) => "shell" === item);
            const value11 = value.splice(value10 + 1);
            (value.forEach((item) => value6Instance.add(item)),
              value11.length &&
                value6Instance.add(
                  `"${value11.join(" ").replace(/(?<!\\)"/g, '\\"')} && echo exit_code: $? || echo exit_code: -1"`,
                ));
          } else value.forEach((item) => value6Instance.add(item));
          JSON.stringify(value6Instance.toArray());
          const value6Instance2 = new value6();
          ["./bin/busybox", "script", "-fq", value7].forEach((item) => value6Instance2.add(item));
          const processBuilderClassInstance = new processBuilderClass(
              itemCount ? value6Instance2 : value6Instance,
            ),
            value9 = processBuilderClassInstance.environment();
          if (
            (processBuilderClassInstance.redirectErrorStream(!0),
            this.adb.length &&
              (processBuilderClassInstance.directory(new fileClass(this.adb)),
              value9.put("PS1", "exec$ "),
              value9.put("PATH", `${value9.get("PATH")}:./bin`),
              value9.put("LD_LIBRARY_PATH", "./lib"),
              itemCount &&
                (value9.put("HOME", "../"), value9.put("TMPDIR", "../../cache/adb-cache"))),
            (this.currentProcess = processBuilderClassInstance.start()),
            plus.android.importClass(this.currentProcess),
            itemCount)
          ) {
            (plus.android.invoke(this.currentProcess.getInputStream(), "close"),
              plus.android.invoke(this.currentProcess.getErrorStream(), "close"),
              plus.android.importClass("java.io.OutputStream"));
            const outputStream = this.currentProcess.getOutputStream(),
              stringClass = plus.android.importClass("java.lang.String");
            (outputStream.write(
              new stringClass(`export PS1="${value9.get("PS1")}"\n`).getBytes("UTF-8"),
            ),
              outputStream.flush(),
              outputStream.write(new stringClass("sh ./exec ").getBytes("UTF-8")),
              outputStream.write(
                new stringClass(value6Instance.toArray().join(" ")).getBytes("UTF-8"),
              ),
              outputStream.write(
                new stringClass(' && echo "exit_code: $?" || echo "exit_code: -1"').getBytes(
                  "UTF-8",
                ),
              ),
              outputStream.write(new stringClass("\n").getBytes("UTF-8")),
              outputStream.flush());
            let text = "",
              isEnabled = !1;
            callback(
              value7,
              (value10, value11, value12) => {
                (null != value10 && value3 && value3(value10, value11, value12),
                  value11 ? ((value5 = value12), (isEnabled = !0)) : (text += value10 + "\n"));
              },
              (value10, value11) => {
                isEnabled || (value5 = value11);
                try {
                  const instance = new (plus.android.importClass("java.io.File"))(value7);
                  instance.exists() && instance.delete();
                } catch (error) {}
                value2(text.trim(), value5);
                try {
                  (outputStream.write(new stringClass("exit\n").getBytes("UTF-8")),
                    outputStream.flush());
                } catch (error) {}
              },
            );
          } else {
            const value10 = ((value11) => {
              plus.android.importClass("java.io.InputStream");
              const inputStreamReaderClass = plus.android.importClass("java.io.InputStreamReader"),
                bufferedReaderClass = plus.android.importClass("java.io.BufferedReader"),
                stringBuilderClass = plus.android.importClass("java.lang.StringBuilder"),
                bufferedReaderClassInstance = new bufferedReaderClass(
                  new inputStreamReaderClass(value11),
                ),
                stringBuilderClassInstance = new stringBuilderClass();
              let text,
                isEnabled = !1;
              for (; null !== (text = bufferedReaderClassInstance.readLine());) {
                if (isEnabled) continue;
                const text2 = text.trim();
                if (/^(\^C)?exit_code: -?(\d+)/.test(text2) || text2.startsWith("exec_end")) {
                  isEnabled = !0;
                  const value12 = /exit_code: (\S+)/.exec(text2);
                  value5 = value12 ? parseInt(value12[1]) : -1;
                }
                stringBuilderClassInstance.append(text).append("\n");
              }
              return (
                bufferedReaderClassInstance.close(),
                stringBuilderClassInstance.toString().trim()
              );
            })(this.currentProcess.getInputStream());
            ((value5 = -2 === value5 ? this.currentProcess.waitFor() : value5),
              value2(value10, value5));
          }
        } catch (error) {
          value2(error, value5);
        }
        var numericValue;
      })();
    },
    listFiles: function (text, value = !0) {
      (text.endsWith("/") || (text += "/"),
        value && this.showProgress("file", "正在加载文件列表...", -1),
        this.executeAdbCommand(["shell", "ls", "-l", `${text}`], (text2, value2) => {
          const fileBrowserElement = document.getElementById("fileBrowser");
          ((fileBrowserElement.scrollTop = 0), (fileBrowserElement.innerHTML = ""));
          const callback = () => {
            if ("/" !== text) {
              const text3 = text.replace(/\/[^\/]+\/?$/, "") || "/",
                container = document.createElement("div");
              ((container.className = "file-item"),
                container.setAttribute("data-path", text3),
                container.setAttribute("data-dir", "true"),
                (container.innerHTML =
                  '\n                    <i class="fas fa-level-up-alt file-icon"></i>\n                    <div class="file-name">返回上一级</div>\n                '),
                fileBrowserElement.appendChild(container));
            }
          };
          if (0 !== value2 || !text2)
            return (
              callback(),
              this.printConsole(`无法列出文件: ${text2}`, "error"),
              void (value && this.showProgress("file", "加载文件失败", 0))
            );
          const items = text2.split("\n"),
            items2 = [],
            items3 = [];
          (items.forEach((text3) => {
            if (!text3.trim() || text3.startsWith("total")) return;
            const items4 = text3.trim().split(/\s+/);
            if (items4.length < 6) return;
            const items4Item = items4[0],
              value3 = "d" === items4Item[0] || "l" === items4Item[0];
            let numericValue = 0,
              value4 = -1,
              text4 = "0";
            for (let index = 0; index < items4.length; index++)
              if (/^\d{4}-\d{2}-\d{2}$/.test(items4[index])) {
                ((numericValue = index + 2), value3 || (value4 = index - 1));
                break;
              }
            if ((-1 != value4 && (text4 = items4[value4]), numericValue >= items4.length)) return;
            let text5 = items4.slice(numericValue).join(" ");
            const value5 = /(.*?) \->/.exec(text5);
            value5 && (text5 = value5[1]);
            const text6 = value3 ? "" : this.formatSize(parseInt(text4)),
              container = document.createElement("div");
            ((container.className = "file-item"),
              container.setAttribute(
                "data-path",
                text + (text.endsWith("/") ? "" : "/") + text5 + (value3 ? "/" : ""),
              ),
              container.setAttribute("data-dir", value3),
              container.setAttribute("data-perm", permToNumber(items4Item)),
              (container.innerHTML = `\n                    <i class="fas ${value3 ? "fa-folder" : "fa-file"} file-icon"></i>\n                    <div class="file-name">${text5}</div>\n                    <div class="file-size">${text6}</div>\n                `),
              value3 ? items2.push(container) : items3.push(container));
          }),
            callback(),
            items2.forEach((item) => fileBrowserElement.appendChild(item)),
            items3.forEach((item) => fileBrowserElement.appendChild(item)),
            (document.getElementById("currentPath").value = text),
            value && this.showProgress("file", "加载文件列表完成", 100));
        }));
    },
    showFileActionModal: function () {
      const value = this.selectedFile
        .getAttribute("data-path")
        .split("/")
        .filter((item) => item)
        .pop();
      value &&
        ((document.getElementById("fileActionTitle").textContent = value),
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
      ((this.currentDirectory = "/sdcard/"), this.listFiles(this.currentDirectory));
    },
    createFolder: function () {
      const value = prompt("请输入文件夹名称:");
      if (!value) return;
      const value2 =
        this.currentDirectory + (this.currentDirectory.endsWith("/") ? "" : "/") + value;
      this.executeAdbCommand(["shell", "mkdir", `"${value2}"`], (value3, value4) => {
        0 !== value4
          ? (this.printConsole(`创建文件夹失败: ${value3}`, "error"),
            this.showProgress("file", "创建文件夹失败", 0))
          : (this.printConsole(`文件夹创建成功: ${value2}`, "success"),
            this.showProgress("file", "文件夹创建成功", 100),
            this.listFiles(this.currentDirectory, !1));
      });
    },
    uploadFile: function () {
      alert("文件选择提示：\n✔ 请在「设备目录」中选择文件\n✖ 不要在「最近/下载内容」中选择文件");
      var isEnabled = !1;
      this.chooseFile(
        { title: "请选择文件", multiple: !1, mime: "*/*", path: "/" },
        (value) => {
          if (isEnabled) return;
          ((isEnabled = !0),
            this.printConsole("选择了文件：" + JSON.stringify(value.files), "info"));
          const fileItem = value.files[0];
          if (!fileItem || !fileItem.startsWith("/"))
            return void alert("不支持的目录，请在「设备目录」中选择！");
          const value2 = fileItem
              .split("/")
              .filter((item) => item)
              .pop(),
            value3 =
              this.currentDirectory + (this.currentDirectory.endsWith("/") ? "" : "/") + value2;
          this.uploadFileWithProgress(fileItem, value3);
        },
        (value) => {
          this.printConsole(`选择文件失败: ${value.message || value}`, "error");
        },
      );
    },
    uploadFileWithProgress: function (text, value) {
      text = text.startsWith("file://") ? text.substring(7) : text;
      let value2 = -1;
      (this.printConsole(`正在上传文件: ${text} -> ${value}`, "info"),
        this.showProgress("file", "开始上传文件...", -1),
        this.executeAdbCommand(
          ["push", "-p", `"${text}"`, `"${value}"`],
          (value3, value4) => {
            0 !== value4
              ? (this.printConsole(`上传文件失败: ${value3}`, "error"),
                this.showProgress("file", "上传文件失败", 0))
              : (this.printConsole(`上传文件成功: ${value}`, "success"),
                this.showProgress("file", `上传文件成功: ${value}`, 100),
                this.listFiles(this.currentDirectory, !1));
          },
          (value3, value4, value5) => {
            const value6 = /(\d+)\%\]/.exec(value3);
            if (value6) {
              let numericValue = parseInt(value6[1]);
              value2 != numericValue &&
                ((value2 = numericValue),
                100 !== value2 && this.setProgress("file", "上传文件", value2));
            }
          },
        ));
    },
    downloadFile: function () {
      if (!this.selectedFile) return void this.printConsole("请先选择要下载的文件", "error");
      let items = this.selectedFile
        .getAttribute("data-path")
        .split("/")
        .filter((item) => item);
      const value = items.pop();
      if (((items = items.join("/")), !confirm(`确定要下载 ${items}/${value} 吗？`))) return;
      const text = `/sdcard/Download/${value}`;
      this.downloadFileWithProgress(this.selectedFile.getAttribute("data-path"), text);
    },
    downloadFileWithProgress: function (value, text) {
      text = text.startsWith("file://") ? text.substring(7) : text;
      let value2 = -1;
      (this.printConsole(`正在下载文件: ${value} -> ${text}`, "info"),
        this.showProgress("file", "开始下载文件...", -1),
        this.executeAdbCommand(
          ["pull", "-p", `"${value}"`, `"${text}"`],
          (value3, value4) => {
            0 !== value4
              ? (this.printConsole(`下载文件失败: ${value3}`, "error"),
                this.showProgress("file", "下载文件失败", 0))
              : (this.showProgress("file", `下载文件成功: ${text}`, 100),
                this.printConsole(`下载文件成功: ${text}`, "success"));
          },
          (value3, value4, value5) => {
            const value6 = /(\d+)\%\]/.exec(value3);
            if (value6) {
              let numericValue = parseInt(value6[1]);
              value2 != numericValue &&
                ((value2 = numericValue), this.setProgress("file", "下载文件", value2));
            }
          },
        ));
    },
    deleteFile: function () {
      if (!this.selectedFile) return void this.printConsole("请先选择要删除的文件", "error");
      let items = this.selectedFile
        .getAttribute("data-path")
        .split("/")
        .filter((item) => item);
      const value = items.pop();
      ((items = items.join("/")),
        confirm(`确定要删除 ${items}/${value} 吗？`) &&
          this.executeAdbCommand(["shell", "rm", "-r", `"${items}/${value}"`], (value2, value3) => {
            0 !== value3
              ? (this.printConsole(`删除文件失败: ${value2}`, "error"),
                this.showProgress("file", "删除文件失败", 0))
              : (this.printConsole(`删除文件成功: ${items}/${value}`, "success"),
                this.showProgress("file", `删除文件成功: ${items}/${value}`, 100),
                this.listFiles(this.currentDirectory, !1));
          }));
    },
    reNameFile: function () {
      let items = this.selectedFile
        .getAttribute("data-path")
        .split("/")
        .filter((item) => item);
      const value = items.pop();
      items = items.join("/");
      const value2 = prompt("请输入新的文件名称:", value);
      value2 &&
        value2 !== value &&
        this.executeAdbCommand(
          ["shell", "mv", `"${items}/${value}"`, `"${items}/${value2}"`],
          (value3, value4) => {
            0 !== value4
              ? (this.printConsole(`重命名文件失败: ${value3}`, "error"),
                this.showProgress("file", "重命名文件失败", 0))
              : (this.printConsole(
                  `重命名文件成功: ${items}/${value} -> ${items}/${value2}`,
                  "success",
                ),
                this.showProgress("file", `重命名文件成功: ${items}/${value2}`, 100),
                this.listFiles(this.currentDirectory, !1));
          },
        );
    },
    setFilePermission: function () {
      const value = prompt(
        "请输入要设置的权限值:\n例如: 777",
        this.selectedFile.getAttribute("data-perm"),
      );
      if (!value) return;
      let items = this.selectedFile
        .getAttribute("data-path")
        .split("/")
        .filter((item) => item);
      const value2 = items.pop();
      ((items = items.join("/")),
        this.executeAdbCommand(
          ["shell", "chmod", "-R", value, `"${items}/${value2}"`],
          (value3, value4) => {
            0 !== value4
              ? (this.printConsole(`设置文件权限失败: ${value3}`, "error"),
                this.showProgress("file", "设置文件权限失败", 0))
              : (this.printConsole(`设置文件权限成功: ${items}/${value2} ${value}`, "success"),
                this.showProgress("file", `设置文件权限成功: ${items}/${value2} ${value}`, 100),
                this.listFiles(this.currentDirectory, !1));
          },
        ));
    },
    listApps: function (text = "", value = !1) {
      const appListElement = document.getElementById("appList");
      ((appListElement.scrollTop = 0), (appListElement.innerHTML = ""));
      const options = value ? { all: [], enable: [], disabled: [] } : this.apps,
        isEnabled = !!options.all.length || !!text;
      isEnabled || this.showProgress("app", "正在加载应用列表...", -1);
      const callback = () => {
        (options.all.forEach((item) => {
          const { packageName: item2, path: item3 } = item;
          if (text && !item2.toLowerCase().includes(text.toLowerCase())) return;
          const text2 = options.enable.includes(item2)
              ? "enable"
              : options.disabled.includes(item2)
                ? "disabled"
                : "hide",
            container = document.createElement("div");
          ((container.className = "app-item"),
            (container.innerHTML = `\n                        <div class="app-icon" status="${text2}">\n                            <i class="fas fa-mobile-alt"></i>\n                        </div>\n                        <div class="app-info">\n                            <div class="app-name">${item2}</div>\n                            <div class="app-package">${item2}</div>\n                            <div class="app-path">${item3}</div>\n                        </div>\n                    `),
            appListElement.appendChild(container));
        }),
          isEnabled || this.hideProgress("app"));
      };
      if (isEnabled) return callback();
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
          (text2, value2) => {
            if (0 !== value2)
              return (
                this.printConsole(`无法获取应用列表: ${text2}`, "error"),
                void this.showProgress("app", "无法获取应用列表", 0)
              );
            let all = options.all;
            (text2.split("\n").forEach((text3) => {
              if (!text3.trim()) return;
              if (text3.trim().startsWith("all_packages")) return void (all = options.all);
              if (text3.trim().startsWith("enable_packages")) return void (all = options.enable);
              if (text3.trim().startsWith("disable_packages")) return void (all = options.disabled);
              const value3 = /package:((.*?)\=)?(\S+)/g.exec(text3);
              if (!value3) return;
              const value3Item = value3[2],
                value3Item2 = value3[3];
              all.push(
                all === options.all ? { packageName: value3Item2, path: value3Item } : value3Item2,
              );
            }),
              (this.apps = options),
              callback());
          },
        );
      })();
    },
    getAppName: function (value, value2) {
      value2(null);
    },
    filterApps: function (value) {
      this.listApps(value);
    },
    showAppActionModal: function (value) {
      const { appName: value2, appPath: value3, packageName: value4, status: value5 } = value;
      switch (
        ((document.getElementById("appActionTitle").textContent = value2),
        (document.getElementById("appActionPackage").textContent = value4),
        (document.getElementById("appActionPath").textContent = value3),
        document
          .getElementById("appActionModal")
          .querySelectorAll("button")
          .forEach((item) => {
            item.disabled = !0;
          }),
        value5)
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
    launchApp: function (value) {
      this.executeAdbCommand(`shell am start -n ${value}/.MainActivity`, (value2, value3) => {
        0 !== value3
          ? this.printConsole(`启动应用失败: ${value2}`, "error")
          : this.printConsole(`已启动应用: ${value}`, "success");
      });
    },
    enableApp: function (value, value2) {
      confirm(`确定要启用应用 "${value2}" 吗？`) &&
        (this.printConsole(`启用应用: ${value2}`, "info"),
        this.showProgress("app", "正在启用应用...", -1),
        this.executeAdbCommand(
          ["shell", "/system/bin/pm", "enable", "--user", "0", value],
          (value3, value4) => {
            if (0 !== value4)
              (this.printConsole(`启用应用失败: ${value3}`, "error"),
                this.showProgress("app", "启用应用失败", 0));
            else {
              (this.printConsole(`已启用应用: ${value2}`, "success"),
                this.showProgress("app", `已启用应用: ${value2}`, 100));
              const value5 = this.apps.disabled.findIndex((item) => item === value);
              (-1 !== value5 && this.apps.disabled.splice(value5, 1),
                this.apps.enable.push(value),
                this.listApps(document.getElementById("appSearch").value));
            }
          },
        ));
    },
    disabledApp: function (value, value2) {
      confirm(`确定要停用应用 "${value2}" 吗？`) &&
        (this.printConsole(`停用应用: ${value2}`, "info"),
        this.showProgress("app", "正在停用应用...", -1),
        this.executeAdbCommand(
          ["shell", "/system/bin/pm", "disable-user", "--user", "0", value],
          (value3, value4) => {
            if (0 !== value4)
              (this.printConsole(`停用应用失败: ${value3}`, "error"),
                this.showProgress("app", "停用应用失败", 0));
            else {
              (this.printConsole(`已停用应用: ${value2}`, "success"),
                this.showProgress("app", `已停用应用: ${value2}`, 100));
              const value5 = this.apps.enable.findIndex((item) => item === value);
              (-1 !== value5 && this.apps.enable.splice(value5, 1),
                this.apps.disabled.push(value),
                this.listApps(document.getElementById("appSearch").value));
            }
          },
        ));
    },
    unHideApp: function (value, value2) {
      confirm(`确定要显示应用 "${value2}" 吗？`) &&
        (this.printConsole(`显示应用: ${value2}`, "info"),
        this.showProgress("app", "正在显示应用...", -1),
        this.executeAdbCommand(["shell", "/system/bin/pm", "unhide", value], (value3, value4) => {
          0 !== value4
            ? (this.printConsole(`显示应用失败: ${value3}`, "error"),
              this.showProgress("app", "显示应用失败", 0))
            : (this.printConsole(`已显示应用: ${value2}`, "success"),
              this.showProgress("app", `已显示应用: ${value2}`, 100),
              this.apps.enable.push(value),
              this.listApps(document.getElementById("appSearch").value));
        }));
    },
    hideApp: function (value, value2) {
      confirm(`确定要隐藏应用 "${value2}" 吗？`) &&
        (this.printConsole(`隐藏应用: ${value2}`, "info"),
        this.showProgress("app", "正在隐藏应用...", -1),
        this.executeAdbCommand(["shell", "/system/bin/pm", "hide", value], (value3, value4) => {
          if (0 !== value4)
            (this.printConsole(`隐藏应用失败: ${value3}`, "error"),
              this.showProgress("app", "隐藏应用失败", 0));
          else {
            (this.printConsole(`已隐藏应用: ${value2}`, "success"),
              this.showProgress("app", `已隐藏应用: ${value2}`, 100));
            const value5 = this.apps.enable.findIndex((item) => item === value);
            (-1 !== value5 && this.apps.enable.splice(value5, 1),
              this.listApps(document.getElementById("appSearch").value));
          }
        }));
    },
    clearApp: function (value, value2) {
      confirm(`确定要清除应用数据 "${value2}" 吗？`) &&
        (this.printConsole(`清除应用数据: ${value2}`, "info"),
        this.showProgress("app", "正在清除应用数据...", -1),
        this.executeAdbCommand(`shell /system/bin/pm clear ${value}`, (value3, value4) => {
          0 !== value4
            ? (this.printConsole(`清除应用数据失败: ${value3}`, "error"),
              this.showProgress("app", "清除应用数据失败", 0))
            : (this.printConsole(`已清除应用数据: ${value2}`, "success"),
              this.showProgress("app", `已清除应用数据: ${value2}`, 100));
        }));
    },
    uninstallApp: function (value, value2) {
      confirm(`确定要卸载应用 "${value2}" 吗？`) &&
        (this.printConsole(`卸载应用: ${value2}`, "info"),
        this.showProgress("app", "正在卸载应用...", -1),
        this.executeAdbCommand(`shell /system/bin/pm uninstall ${value}`, (value3, value4) => {
          0 !== value4
            ? (this.printConsole(`卸载应用失败: ${value3}`, "error"),
              this.showProgress("app", "卸载应用失败", 0))
            : (this.printConsole(`已卸载应用: ${value2}`, "success"),
              this.showProgress("app", `已卸载应用: ${value2}`, 100),
              setTimeout(() => {
                this.listApps(document.getElementById("appSearch").value, !0);
              }, 500));
        }));
    },
    installApp: function () {
      alert("应用选择提示：\n✔ 请在「设备目录」中选择应用\n✖ 不要在「最近/下载内容」中选择应用");
      var isEnabled = !1;
      this.chooseFile(
        { title: "请选择应用", multiple: !1, mime: "*/*", path: "/" },
        (value) => {
          if (isEnabled) return;
          ((isEnabled = !0),
            this.printConsole("选择了文件：" + JSON.stringify(value.files), "info"));
          const fileItem = value.files[0];
          fileItem && fileItem.startsWith("/")
            ? (this.printConsole("正在检查应用安装权限...", "info"),
              this.showProgress("app", "正在检查应用安装权限...", -1),
              this.executeAdbCommand(
                "shell settings get secure install_non_market_apps",
                (value2, value3) => {
                  "1" != value2
                    ? this.executeAdbCommand(
                        "shell settings put secure install_non_market_apps 1",
                        (value4, value5) => {
                          this.installAppWithProgress(fileItem);
                        },
                      )
                    : this.installAppWithProgress(fileItem);
                },
              ))
            : alert("不支持的目录，请在「设备目录」中选择！");
        },
        (value) => {
          this.printConsole(`选择应用失败: ${value.message || value}`, "error");
        },
      );
    },
    installAppWithProgress: function (text, value = 0) {
      const callback = (text4, value3) => {
        (this.printConsole(
          `正在安装应用: ${text4
            .split("/")
            .filter((item) => item)
            .pop()}`,
          "success",
        ),
          this.showProgress(0 === value ? "app" : "file", "正在安装应用...", -1),
          this.executeAdbCommand(
            `shell /system/bin/pm install -r ${value3}`,
            (value4, value5) => {
              (0 === value5 && /(success|Success)/g.test(value4)
                ? (this.printConsole(
                    `安装应用成功: ${text4
                      .split("/")
                      .filter((item) => item)
                      .pop()}`,
                    "success",
                  ),
                  this.showProgress(0 === value ? "app" : "file", "安装应用成功", 100),
                  setTimeout(() => {
                    this.listApps(document.getElementById("appSearch").value, !0);
                  }, 500))
                : (this.printConsole(`安装应用失败: ${value4}`, "error"),
                  this.showProgress(0 === value ? "app" : "file", "安装应用失败", 0)),
                text4 != value3 &&
                  this.executeAdbCommand(`shell rm -f ${value3}`, (value6, value7) => {}));
            },
            null,
            0,
          ));
      };
      if (((text = text.startsWith("file://") ? text.substring(7) : text), 1 === value))
        return callback(text, text);
      const text2 = text,
        text3 = "/data/local/tmp/tmp.apk";
      let value2 = -1;
      (this.printConsole(
        `正在上传应用: ${text2
          .split("/")
          .filter((item) => item)
          .pop()}`,
        "info",
      ),
        this.showProgress("app", "开始上传应用...", -1),
        this.executeAdbCommand(
          ["push", "-p", `"${text2}"`, `"${text3}"`],
          (value3, value4) => {
            0 !== value4
              ? (this.printConsole(`上传应用失败: ${value3}`, "error"),
                this.showProgress("app", "上传应用失败", 0))
              : (-1 === value2 && this.showProgress("app", "上传应用成功，等待安装...", -1),
                this.printConsole(
                  `上传应用成功: ${text2
                    .split("/")
                    .filter((item) => item)
                    .pop()}`,
                  "success",
                ),
                callback(text2, text3));
          },
          (value3, value4, value5) => {
            const value6 = /(\d+)\%\]/.exec(value3);
            if (value6) {
              let numericValue = parseInt(value6[1]);
              value2 != numericValue &&
                ((value2 = numericValue),
                100 === value2
                  ? this.showProgress("app", "上传应用成功，等待安装...", -1)
                  : this.setProgress("app", "上传应用", value2));
            }
          },
        ));
    },
    printConsole: function (text, value = "output", value2 = !0) {
      const consoleOutputElement = document.getElementById("consoleOutput"),
        container = document.createElement("div");
      container.className = "console-line" + (value ? ` ${value}-output` : "");
      const text2 = new Date().toTimeString().substr(0, 8),
        label = document.createElement("span");
      ((label.className = "timestamp"),
        (label.innerText = `[${text2}]`),
        value2 && container.appendChild(label));
      const label2 = document.createElement("span");
      if (((label2.id = "message"), container.appendChild(label2), text)) {
        let container2 = document.createElement("div");
        container2.style.display = "inline-block";
        for (let item of text.split("\n"))
          ((container2.innerHTML = item),
            label2.appendChild(container2),
            (container2 = document.createElement("div")));
      }
      return (
        consoleOutputElement.appendChild(container),
        (consoleOutputElement.scrollTop = consoleOutputElement.scrollHeight),
        container
      );
    },
    updateStatus: function (value, value2) {
      const statusIndicatorElement = document.getElementById("statusIndicator");
      switch (
        ((document.getElementById("statusText").textContent = `设备状态: ${value}`),
        (statusIndicatorElement.className = "status-indicator "),
        value2)
      ) {
        case "connected":
          statusIndicatorElement.classList.add("status-connected");
          break;
        case "error":
        default:
          statusIndicatorElement.classList.add("status-disconnected");
          break;
        case "connecting":
          statusIndicatorElement.style.background = "orange";
      }
    },
    navigateHistory: function (value) {
      0 !== this.commandHistory.length &&
        ((this.historyIndex = Math.max(
          0,
          Math.min(this.commandHistory.length - 1, this.historyIndex + value),
        )),
        (document.getElementById("consoleInput").value =
          this.commandHistory[this.historyIndex] || ""));
    },
    formatSize: function (value) {
      return value
        ? value < 1024
          ? value + " B"
          : value < 1048576
            ? (value / 1024).toFixed(1) + " KB"
            : value < 1073741824
              ? (value / 1048576).toFixed(1) + " MB"
              : (value / 1073741824).toFixed(1) + " GB"
        : "0 B";
    },
    showProgress: function (value, value2, value3) {
      clearTimeout(this.hideProgressTimer);
      const progressBarElement = document
        .getElementById(`${value}Progress`)
        .querySelector(".progress-bar");
      (-1 === value3
        ? (progressBarElement.classList.add("indeterminate"),
          (progressBarElement.style.width = "100%"))
        : (progressBarElement.classList.remove("indeterminate"),
          (progressBarElement.style.width = `${value3}%`)),
        100 === value3 &&
          (this.hideProgressTimer = setTimeout(() => {
            this.hideProgress(value);
          }, 2e3)),
        (document.getElementById(`${value}ProgressText`).textContent = value2),
        (document.getElementById(`${value}ProgressText`).style.display = "block"),
        (document.getElementById(`${value}Progress`).style.display = "block"));
    },
    setProgress: function (value, value2, value3) {
      clearTimeout(this.hideProgressTimer);
      const progressBarElement = document
          .getElementById(`${value}Progress`)
          .querySelector(".progress-bar"),
        elementById = document.getElementById(`${value}ProgressText`);
      (() => {
        (-1 === value3
          ? (progressBarElement.classList.add("indeterminate"),
            (progressBarElement.style.width = "100%"))
          : (progressBarElement.classList.remove("indeterminate"),
            (progressBarElement.style.width = `${value3}%`)),
          value2 &&
            (elementById.textContent = `${value2}中` + (-1 !== value3 ? `: ${value3}%` : "")),
          100 === value3 &&
            (value2 && (elementById.textContent = `${value2}完成`),
            (this.hideProgressTimer = setTimeout(() => {
              this.hideProgress(value);
            }, 2e3))));
      })();
    },
    simulateProgress: function (value, value2, value3) {
      let value4 = Date.now();
      const progressBarElement = document
          .getElementById(`${value}Progress`)
          .querySelector(".progress-bar"),
        elementById = document.getElementById(`${value}ProgressText`),
        callback = () => {
          const value5 = Date.now() - value4,
            value6 = Math.min(100, Math.floor((value5 / value3) * 100));
          ((progressBarElement.style.width = `${value6}%`),
            (elementById.textContent = `${value2}中: ${value6}%`),
            value6 < 100
              ? setTimeout(callback, 50)
              : ((elementById.textContent = `${value2}完成`),
                setTimeout(() => {
                  this.hideProgress(value);
                }, 2e3)));
        };
      callback();
    },
    hideProgress: function (value) {
      ((document.getElementById(`${value}ProgressText`).style.display = "none"),
        (document.getElementById(`${value}Progress`).style.display = "none"));
    },
    chooseFile: function (value, value2, value3) {
      let value4 = (99999 * Math.random()) >> 1;
      const value5 = plus.android.runtimeMainActivity(),
        buildClass = plus.android.importClass("android.os.Build"),
        intentClass = plus.android.importClass("android.content.Intent"),
        value6 =
          (plus.android.importClass("android.database.Cursor"),
          plus.android.importClass("java.io.File"),
          plus.android.importClass("android.net.Uri")),
        value7 =
          (plus.android.importClass("android.content.ContentResolver"),
          plus.android.importClass("android.provider.DocumentsContract")),
        environmentClass = plus.android.importClass("android.os.Environment"),
        intentClassInstance = new intentClass(intentClass.ACTION_GET_CONTENT);
      if (
        (intentClassInstance.addCategory(intentClass.CATEGORY_OPENABLE),
        intentClassInstance.setType(value.mime || "*/*"),
        value.path)
      ) {
        let text = `:${value.path}`;
        (text.endsWith("/") && text.substring(0, text.length - 1),
          intentClassInstance.putExtra(
            value7.EXTRA_INITIAL_URI,
            value6.parse(
              `content://com.android.externalstorage.documents/document/primary${encodeURIComponent(text)}`,
            ),
          ));
      }
      (value.multiple && intentClassInstance.putExtra(intentClass.EXTRA_ALLOW_MULTIPLE, !0),
        (value5.onActivityResult = (value8, value9, value10) => {
          if (value8 !== value4) return;
          if (((value4 = -123), (value5.onActivityResult = () => {}), value9 !== value5.RESULT_OK))
            return void (value3 && value3(value9));
          const clipData = value10.getClipData(),
            items = [];
          if (clipData && clipData.getItemCount() > 0)
            for (let index = 0; index < clipData.getItemCount(); index++)
              items.push(clipData.getItemAt(index).getUri());
          else value10.getData() && items.push(value10.getData());
          value2 &&
            value2({
              files: items.map((item) =>
                ((value11) => {
                  const scheme = value11.getScheme();
                  if ("file" === scheme.toLowerCase()) return value11.getPath();
                  if ("content" === scheme.toLowerCase()) {
                    const path = value11.getPath();
                    if (path.startsWith("/external_files")) return "/sdcard" + path.substring(15);
                  }
                  if (value7.isDocumentUri(value5, value11)) {
                    const items2 = value7.getDocumentId(value11).split(":"),
                      items2Item = items2[0];
                    if ("primary" === items2Item.toLowerCase())
                      return (
                        environmentClass.getExternalStorageDirectory().toString() + "/" + items2[1]
                      );
                    if ("home" === items2Item.toLowerCase())
                      return (
                        environmentClass.getExternalStorageDirectory().toString() +
                        "/Documents/" +
                        items2[1]
                      );
                  }
                  return buildClass.VERSION.SDK_INT >= 29
                    ? value11.toString()
                    : buildClass.VERSION.SDK_INT >= 19 && "content" === scheme.toLowerCase()
                      ? ((value12, value13 = null, value14 = null) => {
                          let value15 = null;
                          const text = "_data",
                            items2 = [text];
                          try {
                            if (
                              ((value15 = value5
                                .getContentResolver()
                                .query(value12, items2, value13, value14, null)),
                              null != value15 && value15.moveToFirst())
                            ) {
                              const columnIndexOrThrow = value15.getColumnIndexOrThrow(text);
                              return value15.getString(columnIndexOrThrow);
                            }
                          } catch (error) {
                          } finally {
                            null != value15 && value15.close();
                          }
                          return null;
                        })(value11)
                      : null;
                })(item),
              ),
            });
        }),
        value5.startActivityForResult(
          intentClass.createChooser(intentClassInstance, value.title || "请选择文件"),
          value4,
        ));
    },
  },
  parseCommand = (value) => (value || "").match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [],
  isNetworkDevice = (value) => /^(\S+:\d+)|(\S+\._tcp\.)^/.test(value);
function permToNumber(value) {
  const items = value.slice(1);
  let text = "";
  const value2 = [
    "s" === items[2] || "S" === items[2] ? 4 : 0,
    "s" === items[5] || "S" === items[5] ? 2 : 0,
    "t" === items[8] || "T" === items[8] ? 1 : 0,
  ].reduce((accumulator, item) => accumulator + item, 0);
  for (let numericValue = 0; numericValue < 9; numericValue += 3) {
    const items2 = items.slice(numericValue, numericValue + 3);
    text +=
      ("r" === items2[0] ? 4 : 0) +
      ("w" === items2[1] ? 2 : 0) +
      (items2[2].match(/[xsStT]/) ? 1 : 0);
  }
  return value2 > 0 ? value2 + text : text;
}
ADBConsole.init();
