// 全局变量
let currentMode = "dlna"; // 'dlna' 或 'airplay'
let isSearching = false;
let devices = [];
let dlnaSocket = null;
let multicastLock = null;
let receiveLoopTimeout = null;
let discoveredDevices = new Set();
let nsdManager = null;
let discoveryListeners = {};
let airPlayDiscoveredDevices = new Set();

// DOM元素
const scanBtn = document.getElementById("scanBtn");
const stopBtn = document.getElementById("stopBtn");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const devicesList = document.getElementById("devicesList");
const modeTabs = document.querySelectorAll(".mode-tab");
const modeDescription = document.getElementById("mode-description");

// 更新状态显示
function updateStatus(text, isScanning) {
  statusText.textContent = text;
  statusIndicator.className = "status-indicator " + (isScanning ? "scanning" : "idle");
  scanBtn.disabled = isScanning;
  stopBtn.disabled = !isScanning;
}

// 切换扫描模式
function setScanMode(mode) {
  if (isSearching) {
    stopDiscovery();
  }

  currentMode = mode;

  // 更新选项卡状态
  modeTabs.forEach((tab) => {
    if (tab.dataset.mode === mode) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // 更新描述文本
  if (mode === "dlna") {
    modeDescription.textContent =
      "点击下方按钮开始扫描网络中的DLNA设备。扫描可能需要几秒钟时间，请耐心等待。";
  } else {
    modeDescription.textContent =
      "点击下方按钮开始扫描网络中的AirPlay设备。扫描可能需要几秒钟时间，请耐心等待。";
  }

  // 清空设备列表
  devicesList.innerHTML = "";
  const deviceCard = document.createElement("div");
  deviceCard.className = "device-card";
  deviceCard.innerHTML = `
                    <div class="device-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <div class="device-info">
                        <div class="device-name">等待扫描结果</div>
                        <div class="device-ip">点击"开始扫描"按钮发现网络设备</div>
                        <div class="device-type">状态: 就绪</div>
                    </div>
                `;
  devicesList.appendChild(deviceCard);
  devices = [];
  discoveredDevices.clear();
  airPlayDiscoveredDevices.clear();

  updateStatus("就绪 - 点击开始扫描按钮", false);
}

// 开始设备发现
function startDiscovery() {
  if (isSearching) return;

  isSearching = true;
  discoveredDevices.clear();
  airPlayDiscoveredDevices.clear();
  devices = [];

  // 清空设备列表
  while (devicesList.children.length > 0) {
    devicesList.removeChild(devicesList.lastChild);
  }

  // 根据当前模式调用相应的扫描函数
  if (currentMode === "dlna") {
    updateStatus("正在初始化DLNA设备扫描...", true);
    setTimeout(discoverDLNADevices, 500);
  } else {
    updateStatus("正在初始化AirPlay设备扫描...", true);
    setTimeout(discoverAirPlayDevices, 500);
  }
}

// 发现DLNA设备
function discoverDLNADevices() {
  if (!isSearching) return;

  try {
    // 导入必要的Java类
    const Context = plus.android.importClass("android.content.Context");
    const InetAddress = plus.android.importClass("java.net.InetAddress");
    const DatagramSocket = plus.android.importClass("java.net.DatagramSocket");
    const DatagramPacket = plus.android.importClass("java.net.DatagramPacket");
    const String = plus.android.importClass("java.lang.String");

    // 创建UDP套接字
    dlnaSocket = new DatagramSocket(null);
    plus.android.importClass(dlnaSocket);
    dlnaSocket.setBroadcast(true);

    // 设置组播地址
    const group = InetAddress.getByName("239.255.255.250");

    // 发送SSDP搜索请求
    const searchMessage =
      "M-SEARCH * HTTP/1.1\r\n" +
      "HOST: 239.255.255.250:1900\r\n" +
      'MAN: "ssdp:discover"\r\n' +
      "MX: 3\r\n" +
      "ST: ssdp:all\r\n" +
      "\r\n";

    const sendData = new String(searchMessage).getBytes();
    const sendPacket = new DatagramPacket(sendData, sendData.length, group, 1900);

    // 发送搜索请求
    dlnaSocket.send(sendPacket);

    // 设置超时
    dlnaSocket.setSoTimeout(600);

    // 准备接收缓冲区
    const Byte = plus.android.importClass("java.lang.Byte");
    const Array = plus.android.importClass("java.lang.reflect.Array");
    const buffer = Array.newInstance(Byte.TYPE, 4096);
    const receivePacket = new DatagramPacket(buffer, buffer.length);

    // 记录开始时间
    const startTime = Date.now();

    // 更新状态
    updateStatus("正在扫描网络中的DLNA设备...", true);

    // 持续接收响应
    const receiveLoop = () => {
      if (!isSearching || Date.now() - startTime >= 10000) {
        completeDiscovery();
        return;
      }

      try {
        dlnaSocket.receive(receivePacket);
        const response = new String(receivePacket.getData(), "UTF-8");
        const address = receivePacket.getAddress();
        plus.android.importClass(address);
        parseDLNAResponse(response, address.getHostAddress(), address.getHostName());
        receiveLoopTimeout = setTimeout(receiveLoop, 100);
      } catch (error) {
        console.log(error);
        completeDiscovery();
      }
    };

    receiveLoopTimeout = setTimeout(receiveLoop, 0);
  } catch (error) {
    console.error("SSDP错误: ", error);
    updateStatus("SSDP错误: " + error.message, false);
    completeDiscovery();
  }
}

// 解析DLNA SSDP响应
function parseDLNAResponse(response, ip, host) {
  const lines = response.split("\r\n");
  const device = {
    ip,
    host,
    headers: {},
  };

  lines.forEach(function (line) {
    const index = line.indexOf(":");
    if (index > 0) {
      const key = line.substring(0, index).trim().toUpperCase();
      const value = line.substring(index + 1).trim();
      device.headers[key] = value;
    }
  });

  // 检查是否有效设备
  if (device.headers["ST"] || device.headers["USN"]) {
    const usn = device.headers["USN"];

    // 检查是否是新设备
    if (!discoveredDevices.has(usn)) {
      discoveredDevices.add(usn);

      // 提取设备信息
      const deviceInfo = {
        ip: ip,
        host: host,
        usn: usn,
        location: device.headers["LOCATION"] || "",
        server: device.headers["SERVER"] || "",
        type: determineDLNADeviceType(device.headers["SERVER"]),
        name: extractDLNADeviceName(device.headers["SERVER"]),
        model: extractDLNADeviceModel(device.headers["SERVER"]),
        manufacturer: extractDLNAManufacturer(device.headers["SERVER"]),
        protocol: "DLNA",
      };

      if (devices.find((info) => info.location === deviceInfo.location)) return;

      // 添加到设备列表
      devices.push(deviceInfo);
      fetchDLNADeviceDetails(deviceInfo);
    }
  }
}

// 获取DLNA设备详细信息
function fetchDLNADeviceDetails(deviceInfo) {
  if (!deviceInfo.location) {
    addDeviceToList(deviceInfo);
    return;
  }

  // 使用plus.net.XMLHttpRequest获取设备描述文档
  const xhr = new plus.net.XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          // 解析XML响应
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xhr.responseText, "text/xml");

          // 提取设备信息
          const deviceElement = xmlDoc.getElementsByTagName("device")[0];
          if (deviceElement) {
            deviceInfo.name = getXmlValue(deviceElement, "friendlyName") || deviceInfo.name;
            deviceInfo.manufacturer =
              getXmlValue(deviceElement, "manufacturer") || deviceInfo.manufacturer;
            deviceInfo.model = getXmlValue(deviceElement, "modelName") || deviceInfo.model;
          }
        } catch (error) {
          console.error("解析设备描述失败: ", error);
        }
      }

      // 添加到设备列表
      addDeviceToList(deviceInfo);
    }
  };

  try {
    xhr.open("GET", deviceInfo.location);
    xhr.send();
  } catch (error) {
    console.error("获取设备描述失败: ", error);
    addDeviceToList(deviceInfo);
  }
}

// 从XML节点获取值
function getXmlValue(parent, tagName) {
  const elements = parent.getElementsByTagName(tagName);
  if (elements.length > 0) {
    return elements[0].textContent;
  }
  return null;
}

// 确定DLNA设备类型
function determineDLNADeviceType(serverHeader) {
  if (!serverHeader) return "其他";

  if (
    serverHeader.includes("TV") ||
    serverHeader.includes("Television") ||
    serverHeader.includes("SmartTV")
  ) {
    return "智能电视";
  }

  if (
    serverHeader.includes("Media Server") ||
    serverHeader.includes("DLNAServer") ||
    serverHeader.includes("UPnP")
  ) {
    return "媒体服务器";
  }

  if (
    serverHeader.includes("Speaker") ||
    serverHeader.includes("SoundBar") ||
    serverHeader.includes("Audio")
  ) {
    return "智能音箱";
  }

  if (serverHeader.includes("PlayStation") || serverHeader.includes("Xbox")) {
    return "游戏主机";
  }

  return "其他";
}

// 提取DLNA设备名称
function extractDLNADeviceName(serverHeader) {
  if (!serverHeader) return "未知设备";

  // 尝试提取更友好的名称
  const match = serverHeader.match(/([a-zA-Z0-9\s\-]+)\/[0-9\.]+/);
  if (match && match[1]) {
    return match[1].trim();
  }

  return serverHeader.split("/")[0] || "DLNA设备";
}

// 提取DLNA设备型号
function extractDLNADeviceModel(serverHeader) {
  if (!serverHeader) return "未知";

  const parts = serverHeader.split(" ");
  if (parts.length > 1) {
    return parts[1];
  }

  return serverHeader;
}

// 提取DLNA制造商
function extractDLNAManufacturer(serverHeader) {
  if (!serverHeader) return "未知";

  if (serverHeader.includes("Samsung")) return "三星";
  if (serverHeader.includes("Sony")) return "索尼";
  if (serverHeader.includes("LG")) return "LG";
  if (serverHeader.includes("Panasonic")) return "松下";
  if (serverHeader.includes("Xiaomi")) return "小米";
  if (serverHeader.includes("Philips")) return "飞利浦";

  return serverHeader.split(" ")[0] || "未知";
}

// 发现AirPlay设备
function discoverAirPlayDevices() {
  if (!isSearching) return;

  // 清空设备列表
  devicesList.innerHTML = "";

  try {
    const Context = plus.android.importClass("android.content.Context");
    const NsdManager = plus.android.importClass("android.net.nsd.NsdManager");

    const main = plus.android.runtimeMainActivity();
    const context = main.getApplicationContext();

    nsdManager = context.getSystemService(Context.NSD_SERVICE);

    if (nsdManager === null) {
      updateStatus("错误: 无法获取NSD服务", false);
      return false;
    }

    // AirPlay服务类型
    const serviceTypes = ["_airplay._tcp.", "_raop._tcp."];

    // 为每种服务类型创建监听器
    serviceTypes.forEach((type) => {
      if (!discoveryListeners[type]) {
        discoveryListeners[type] = createDiscoveryListener(type);
      }
    });

    try {
      const NsdManager = plus.android.importClass("android.net.nsd.NsdManager");

      // 启动所有服务类型的发现
      serviceTypes.forEach((type) => {
        nsdManager.discoverServices(type, NsdManager.PROTOCOL_DNS_SD, discoveryListeners[type]);
      });

      updateStatus("正在扫描网络中的AirPlay设备...", true);
    } catch (error) {
      console.error("发现服务失败: " + (error.message || error));
      updateStatus("发现服务失败: " + (error.message || error), false);
    }
  } catch (error) {
    console.error("初始化NSD失败: " + (error.message || error));
    updateStatus("初始化失败: " + (error.message || error), false);
  }
}

// 创建AirPlay发现监听器
function createDiscoveryListener(serviceType) {
  return plus.android.implements("android.net.nsd.NsdManager$DiscoveryListener", {
    onDiscoveryStarted: function (regType) {
      console.log("发现服务已启动: " + regType);
    },
    onServiceFound: function (service) {
      plus.android.importClass(service);
      const serviceName = service.getServiceName();
      const serviceType = service.getServiceType();
      console.log("发现[" + serviceType + "]服务: " + serviceName);

      // 解析服务
      try {
        nsdManager.resolveService(
          service,
          plus.android.implements("android.net.nsd.NsdManager$ResolveListener", {
            onServiceResolved: function (resolvedService) {
              plus.android.importClass(resolvedService);
              const host = resolvedService.getHost();
              const port = resolvedService.getPort();
              const attributes = resolvedService.getAttributes();

              plus.android.importClass(host);
              const hostAddress = host.getHostAddress();

              console.log("服务解析成功: " + serviceName + " - " + hostAddress);

              // 生成设备唯一标识（IP+服务类型）
              const deviceId = `${hostAddress}-${serviceType}`;

              // 检查是否已发现此设备
              if (!airPlayDiscoveredDevices.has(deviceId)) {
                airPlayDiscoveredDevices.add(deviceId);

                // 添加到设备列表
                addDeviceToList({
                  name: cleanAirPlayDeviceName(serviceName),
                  ip: hostAddress,
                  type: determineAirPlayDeviceType(serviceType),
                  port: port,
                  protocol: "AirPlay",
                  serviceType: serviceType,
                });
              }
            },
            onResolveFailed: function (service, errorCode) {
              console.log("解析服务失败: " + service.getServiceName() + ", 错误码: " + errorCode);
            },
          }),
        );
      } catch (error) {
        console.error("解析服务异常: " + (error.message || error));
      }
    },
    onServiceLost: function (service) {
      console.log("服务丢失: " + service.getServiceName());
    },
    onDiscoveryStopped: function (serviceType) {
      console.log("发现服务已停止: " + serviceType);
    },
    onStartDiscoveryFailed: function (serviceType, errorCode) {
      console.log("启动发现失败: " + serviceType + ", 错误码: " + errorCode);
      if (discoveryListeners[serviceType]) delete discoveryListeners[serviceType];
    },
    onStopDiscoveryFailed: function (serviceType, errorCode) {
      console.log("停止发现失败: " + serviceType + ", 错误码: " + errorCode);
    },
  });
}

// 清理AirPlay设备名称（去除mac@前缀）
function cleanAirPlayDeviceName(name) {
  if (!name) return "未知设备";

  // 去除mac@前缀
  if (name.includes("@")) {
    return name.split("@").pop();
  }

  return name;
}

// 确定AirPlay设备类型
function determineAirPlayDeviceType(serviceType) {
  if (serviceType.includes("airplay")) return "AirPlay设备";
  if (serviceType.includes("raop")) return "AirPlay音频设备";
  return "网络设备";
}

// 添加设备到列表
function addDeviceToList(deviceInfo) {
  // 根据设备类型选择图标
  let iconClass = "fas fa-laptop";
  let deviceType = deviceInfo.type || "网络设备";

  if (deviceInfo.type && deviceInfo.type.includes("电视")) {
    iconClass = "fas fa-tv";
  } else if (deviceInfo.type && deviceInfo.type.includes("服务器")) {
    iconClass = "fas fa-server";
  } else if (deviceInfo.type && deviceInfo.type.includes("音箱")) {
    iconClass = "fas fa-server";
  } else if (deviceInfo.type && deviceInfo.type.includes("游戏")) {
    iconClass = "fas fa-gamepad";
  } else if (deviceInfo.protocol === "AirPlay") {
    iconClass = "fas fa-server";
  }
  // 处理长名称
  const deviceName = deviceInfo.name || deviceInfo.model || "未知设备";

  let deviceCard = document.getElementById(deviceInfo.ip);
  if (deviceCard) {
    deviceCard.className = "device-card new";
    deviceCard
      .querySelector(".device-details")
      .insertAdjacentHTML("beforebegin", `<div class="device-type">类型: ${deviceType}</div>`);
    deviceCard.querySelector(".device-details").insertAdjacentHTML(
      "beforeend",
      `<hr/>${
        deviceInfo.manufacturer ? `<p><strong>厂商:</strong> ${deviceInfo.manufacturer}</p>` : ""
      }
                        ${
                          deviceInfo.model
                            ? `<p><strong>型号:</strong> ${deviceInfo.model}</p>`
                            : ""
                        }
                        ${deviceInfo.usn ? `<p><strong>标识:</strong> ${deviceInfo.usn}</p>` : ""}
                        ${
                          deviceInfo.location
                            ? `<p><strong>URL:</strong> ${deviceInfo.location}</p>`
                            : ""
                        }
                        ${deviceInfo.port ? `<p><strong>端口:</strong> ${deviceInfo.port}</p>` : ""}
                        ${
                          deviceInfo.serviceType
                            ? `<p><strong>服务:</strong> ${deviceInfo.serviceType}</p>`
                            : ""
                        }
            `,
    );
    // 移除new类动画
    setTimeout(() => {
      deviceCard.classList.remove("new");
    }, 1000);
    return;
  }
  deviceCard = document.createElement("div");
  deviceCard.className = "device-card new";
  deviceCard.id = deviceInfo.ip;

  deviceCard.innerHTML = `
                <div class="device-icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="device-info">
                    <div class="device-name" title="${deviceName}">${deviceName}</div>
                    <div class="device-ip">IP: ${deviceInfo.ip}</div>
                    <div class="device-type">类型: ${deviceType}</div>
                    <!--<div class="device-protocol">协议: ${deviceInfo.protocol}</div>-->
                    <div class="device-details">
                        ${
                          deviceInfo.manufacturer
                            ? `<p><strong>厂商:</strong> ${deviceInfo.manufacturer}</p>`
                            : ""
                        }
                        ${
                          deviceInfo.model
                            ? `<p><strong>型号:</strong> ${deviceInfo.model}</p>`
                            : ""
                        }
                        ${deviceInfo.usn ? `<p><strong>标识:</strong> ${deviceInfo.usn}</p>` : ""}
                        ${
                          deviceInfo.location
                            ? `<p><strong>URL:</strong> ${deviceInfo.location}</p>`
                            : ""
                        }
                        ${deviceInfo.port ? `<p><strong>端口:</strong> ${deviceInfo.port}</p>` : ""}
                        ${
                          deviceInfo.serviceType
                            ? `<p><strong>服务:</strong> ${deviceInfo.serviceType}</p>`
                            : ""
                        }
                    </div>
                </div>
            `;

  // 添加点击事件
  deviceCard.addEventListener("click", function () {
    const details = this.querySelector(".device-details");

    // 移除其他设备的active类
    document.querySelectorAll(".device-card").forEach((card) => {
      if (card == this) return;
      card.classList.remove("active");
      const details = card.querySelector(".device-details");
      if (details && details.style) details.style.display = "none";
    });

    // 切换当前设备的active状态
    if (this.classList.contains("active")) {
      this.classList.remove("active");
      details.style.display = "none";
    } else {
      this.classList.toggle("active");
      details.style.display = "block";
    }
  });

  // 添加到列表顶部
  devicesList.insertBefore(deviceCard, devicesList.firstChild);

  // 移除new类动画
  setTimeout(() => {
    deviceCard.classList.remove("new");
  }, 1000);
}

// 完成发现
function completeDiscovery() {
  isSearching = false;

  // 更新状态
  if (devices.length > 0) {
    updateStatus(`扫描完成，共发现 ${devices.length} 个设备`, false);
  } else {
    updateStatus("扫描完成，未发现设备", false);
  }

  // 清理资源
  if (dlnaSocket) {
    try {
      dlnaSocket.close();
    } catch (error) {}
    dlnaSocket = null;
  }

  if (multicastLock) {
    try {
      multicastLock.release();
    } catch (error) {}
    multicastLock = null;
  }

  // 清除接收循环
  if (receiveLoopTimeout) {
    clearTimeout(receiveLoopTimeout);
    receiveLoopTimeout = null;
  }
}

// 停止设备发现
function stopDiscovery() {
  isSearching = false;

  // 更新状态
  updateStatus("扫描已停止", false);

  // 清理DLNA资源
  if (dlnaSocket) {
    try {
      plus.android.invoke(dlnaSocket, "close");
    } catch (error) {}
    dlnaSocket = null;
  }

  if (multicastLock) {
    try {
      multicastLock.release();
    } catch (error) {}
    multicastLock = null;
  }

  if (receiveLoopTimeout) {
    clearTimeout(receiveLoopTimeout);
    receiveLoopTimeout = null;
  }

  // 清理AirPlay资源
  if (nsdManager) {
    try {
      // 停止所有服务类型的发现
      Object.keys(discoveryListeners).forEach((type) => {
        if (discoveryListeners[type]) {
          nsdManager.stopServiceDiscovery(discoveryListeners[type]);
        }
      });
    } catch (error) {
      console.error("停止发现失败: " + (error.message || error));
    }
    discoveryListeners = {};
  }
}

// 初始化
function init() {
  // 设置模式切换事件
  modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setScanMode(tab.dataset.mode);
    });
  });

  // 在plus ready后请求权限
  document.addEventListener("plusready", function () {
    plus.android.requestPermissions(
      [
        "android.permission.INTERNET",
        "android.permission.ACCESS_WIFI_STATE",
        "android.permission.CHANGE_WIFI_MULTICAST_STATE",
      ],
      function () {
        console.log("权限已获取");
        initNetwork();
      },
      function (value) {
        console.error("权限被拒绝: ", value);
        updateStatus("错误：权限被拒绝，无法扫描设备", false);
      },
    );
  });

  // 事件绑定
  scanBtn.addEventListener("click", startDiscovery);
  stopBtn.addEventListener("click", stopDiscovery);
  document.getElementById("backHomeBtn").addEventListener("click", (event) => {
    if (!confirm(`确定要返回首页吗？`)) return;
    if (isSearching) {
      stopDiscovery();
    }
    location.pathname = "";
  });
}

function initNetwork() {
  try {
    // 导入必要的Java类
    const Context = plus.android.importClass("android.content.Context");
    const WifiManager = plus.android.importClass("android.net.wifi.WifiManager");
    const StrictMode = plus.android.importClass("android.os.StrictMode");
    const ThreadPolicy = plus.android.importClass("android.os.StrictMode$ThreadPolicy");

    // 获取WifiManager
    const wifiManager = plus.android.runtimeMainActivity().getSystemService(Context.WIFI_SERVICE);

    // 创建多播锁
    try {
      multicastLock = wifiManager.createMulticastLock("NetworkDiscovery");
      plus.android.importClass(multicastLock);
      multicastLock.acquire();
    } catch (error) {}

    // 放宽线程策略
    const policy = new ThreadPolicy.Builder().permitAll().build();
    StrictMode.setThreadPolicy(policy);

    updateStatus("就绪 - 点击开始扫描按钮", false);

    const deviceCard = document.createElement("div");
    deviceCard.className = "device-card";
    deviceCard.innerHTML = `
                    <div class="device-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <div class="device-info">
                        <div class="device-name">等待扫描结果</div>
                        <div class="device-ip">点击"开始扫描"按钮发现网络设备</div>
                        <div class="device-type">状态: 就绪</div>
                    </div>
                `;
    devicesList.appendChild(deviceCard);

    return true;
  } catch (error) {
    console.error("初始化错误: ", error);
    updateStatus("初始化错误: " + error.message, false);
  }
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", init);
