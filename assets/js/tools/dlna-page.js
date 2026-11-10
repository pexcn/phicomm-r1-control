function mdns() {
  try {
    document.getElementById("stopBtn").click();
  } catch {}
  location.href = R1Config.assetUrl("pages/mdns/") + "?" + Date.now();
}
// 全局变量
let isSearching = false;
let devices = [];
let socket = null;
let multicastLock = null;
let receiveLoopTimeout = null;
let discoveredDevices = new Set();
let chart = null;

// DOM元素
const scanBtn = document.getElementById("scanBtn");
const stopBtn = document.getElementById("stopBtn");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const devicesList = document.getElementById("devicesList");
const tvCount = document.getElementById("tvCount");
const serverCount = document.getElementById("serverCount");
const speakerCount = document.getElementById("speakerCount");
const gameCount = document.getElementById("gameCount");

// 更新状态显示
function updateStatus(text, isScanning) {
  statusText.textContent = text;
  statusIndicator.className = "status-indicator " + (isScanning ? "scanning" : "idle");
  scanBtn.disabled = isScanning;
  stopBtn.disabled = !isScanning;
}

// 初始化图表
function initChart() {
  const chartDom = document.getElementById("chart");
  chart = echarts.init(chartDom);

  const option = {
    tooltip: {
      trigger: "item",
      formatter: "{a} <br/>{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      right: 10,
      top: "center",
      textStyle: {
        color: "rgba(255, 255, 255, 0.8)",
      },
    },
    series: [
      {
        name: "设备类型",
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: "#1a2a6c",
          borderWidth: 2,
        },
        label: {
          show: false,
          position: "center",
        },
        emphasis: {
          label: {
            show: true,
            fontSize: "18",
            fontWeight: "bold",
            color: "#fff",
          },
        },
        labelLine: {
          show: false,
        },
        data: [],
      },
    ],
  };

  chart.setOption(option);

  // 处理窗口大小变化
  window.addEventListener("resize", function () {
    chart.resize();
  });
}

// 开始设备发现
function startDiscovery() {
  if (isSearching) return;

  isSearching = true;
  discoveredDevices.clear();
  devices = [];
  updateStatus("正在初始化设备扫描...", true);

  // 清空设备列表
  while (devicesList.children.length > 0) {
    devicesList.removeChild(devicesList.lastChild);
  }

  // 更新设备计数
  updateDeviceCount();

  // 确保在plus环境中
  if (!window.plus) {
    updateStatus("错误：当前环境不支持HTML5+", false);
    isSearching = false;
    return;
  }

  // 开始扫描
  setTimeout(discoverDevices, 500);
}

// 发现DLNA设备
function discoverDevices() {
  if (!isSearching) return;

  try {
    // 导入必要的Java类
    const Context = plus.android.importClass("android.content.Context");
    const InetAddress = plus.android.importClass("java.net.InetAddress");
    const DatagramSocket = plus.android.importClass("java.net.DatagramSocket");
    const DatagramPacket = plus.android.importClass("java.net.DatagramPacket");
    const String = plus.android.importClass("java.lang.String");

    // 创建UDP套接字
    socket = new DatagramSocket(null);
    plus.android.importClass(socket);
    socket.setBroadcast(true);

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
    socket.send(sendPacket);

    // 设置超时
    socket.setSoTimeout(600);

    // 准备接收缓冲区
    const Byte = plus.android.importClass("java.lang.Byte");
    const Array = plus.android.importClass("java.lang.reflect.Array");
    const buffer = Array.newInstance(Byte.TYPE, 4096);
    const receivePacket = new DatagramPacket(buffer, buffer.length);

    // 记录开始时间
    const startTime = Date.now();

    // 更新状态
    updateStatus("正在扫描网络中的设备...", true);

    // 持续接收响应
    const receiveLoop = () => {
      if (!isSearching || Date.now() - startTime >= 10000) {
        // 10秒超时
        completeDiscovery();
        return;
      }

      try {
        socket.receive(receivePacket);
        const response = new String(receivePacket.getData(), "UTF-8");
        const address = receivePacket.getAddress();
        plus.android.importClass(address);
        parseResponse(response, address.getHostAddress(), address.getHostName());
        receiveLoopTimeout = setTimeout(receiveLoop, 100);
      } catch (error) {
        console.log(error);
        completeDiscovery();
        // 超时或错误时继续监听
        //receiveLoopTimeout = setTimeout(receiveLoop, 600);
      }
    };

    receiveLoopTimeout = setTimeout(receiveLoop, 0);
  } catch (error) {
    console.error("SSDP错误: ", error);
    updateStatus("SSDP错误: " + error.message, false);
    completeDiscovery();
  }
}

// 解析SSDP响应
function parseResponse(response, ip, host) {
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
        type: determineDeviceType(device.headers["SERVER"]),
        name: extractDeviceName(device.headers["SERVER"]),
        model: extractDeviceModel(device.headers["SERVER"]),
        manufacturer: extractManufacturer(device.headers["SERVER"]),
      };

      if (devices.find((info) => info.location === deviceInfo.location)) return;

      // 添加到设备列表
      devices.push(deviceInfo);

      // 更新设备计数
      updateDeviceCount();
      fetchDeviceDetails(deviceInfo);
    }
  }
}

// 获取设备详细信息
function fetchDeviceDetails(deviceInfo) {
  if (!deviceInfo.location) {
    // 没有位置信息，直接显示
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

// 确定设备类型
function determineDeviceType(serverHeader) {
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

// 提取设备名称
function extractDeviceName(serverHeader) {
  if (!serverHeader) return "未知设备";

  // 尝试提取更友好的名称
  const match = serverHeader.match(/([a-zA-Z0-9\s\-]+)\/[0-9\.]+/);
  if (match && match[1]) {
    return match[1].trim();
  }

  return serverHeader.split("/")[0] || "DLNA设备";
}

// 提取设备型号
function extractDeviceModel(serverHeader) {
  if (!serverHeader) return "未知";

  const parts = serverHeader.split(" ");
  if (parts.length > 1) {
    return parts[1];
  }

  return serverHeader;
}

// 提取制造商
function extractManufacturer(serverHeader) {
  if (!serverHeader) return "未知";

  if (serverHeader.includes("Samsung")) return "三星";
  if (serverHeader.includes("Sony")) return "索尼";
  if (serverHeader.includes("LG")) return "LG";
  if (serverHeader.includes("Panasonic")) return "松下";
  if (serverHeader.includes("Xiaomi")) return "小米";
  if (serverHeader.includes("Philips")) return "飞利浦";

  return serverHeader.split(" ")[0] || "未知";
}

// 更新设备计数和图表
function updateDeviceCount() {
  const counts = {
    智能电视: 0,
    媒体服务器: 0,
    智能音箱: 0,
    游戏主机: 0,
    其他: 0,
  };

  devices.forEach((device) => {
    if (counts.hasOwnProperty(device.type)) {
      counts[device.type]++;
    } else {
      counts["其他"]++;
    }
  });

  // 更新统计数字
  tvCount.textContent = counts["智能电视"];
  serverCount.textContent = counts["媒体服务器"];
  speakerCount.textContent = counts["智能音箱"];
  gameCount.textContent = counts["游戏主机"];
  if (!chart) return;
  // 更新饼图
  const chartData = [
    { value: counts["智能电视"], name: "智能电视" },
    { value: counts["媒体服务器"], name: "媒体服务器" },
    { value: counts["智能音箱"], name: "智能音箱" },
    { value: counts["游戏主机"], name: "游戏主机" },
    { value: counts["其他"], name: "其他" },
  ];

  chart.setOption({
    series: [
      {
        data: chartData,
      },
    ],
  });
}

// 添加设备到列表
function addDeviceToList(deviceInfo) {
  const deviceCard = document.createElement("div");
  deviceCard.className = "device-card"; //new

  // 根据设备类型选择图标
  let iconClass = "fas fa-laptop";
  let deviceType = "DLNA设备";

  if (deviceInfo.type.includes("电视")) {
    iconClass = "fas fa-tv";
    deviceType = "智能电视";
  } else if (deviceInfo.type.includes("服务器")) {
    iconClass = "fas fa-server";
    deviceType = "媒体服务器";
  } else if (deviceInfo.type.includes("音箱")) {
    iconClass = "fas fa-speaker";
    deviceType = "智能音箱";
  } else if (deviceInfo.type.includes("游戏")) {
    iconClass = "fas fa-gamepad";
    deviceType = "游戏主机";
  }

  // 处理长名称
  const deviceName = deviceInfo.name || deviceInfo.model || "未知设备";

  deviceCard.innerHTML = `
                 <div class="device-icon">
                     <i class="${iconClass}"></i>
                 </div>
                 <div class="device-info">
                     <div class="device-name" >${deviceName}</div>
                     <div class="device-ip">IP: ${deviceInfo.ip}</div>
      <!--<div class="device-host">HOST: ${deviceInfo.host}</div>-->
                     <div class="device-type">类型: ${deviceType}</div>
                     <div class="device-details">
                         <p><strong>厂商:</strong> ${deviceInfo.manufacturer || "未知"}</p>
                         <p><strong>型号:</strong> ${deviceInfo.model || "未知"}</p>
                         <p><strong>标识:</strong> ${deviceInfo.usn}</p>
                         ${
                           deviceInfo.location
                             ? `<p><strong>URL:</strong> ${deviceInfo.location}</p>`
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
  if (socket) {
    try {
      socket.close();
    } catch (error) {}
    socket = null;
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

  // 清理资源
  if (socket) {
    try {
      plus.android.invoke(socket, "close");
    } catch (error) {}
    socket = null;
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
}

// 初始化
function init() {
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
        initSSDP();
      },
      function (value) {
        console.error("权限被拒绝: ", value);
        updateStatus("错误：权限被拒绝，无法扫描设备", false);
      },
    );
  });
}

function initSSDP() {
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
      multicastLock = wifiManager.createMulticastLock("DLNADiscovery");
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

    // 初始化图表
    //initChart();

    // 事件绑定
    scanBtn.addEventListener("click", startDiscovery);
    stopBtn.addEventListener("click", stopDiscovery);

    return true;
  } catch (error) {
    console.error("initSSDP错误: ", error);
    updateStatus("initSSDP错误: " + error.message, false);
  }
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", init);
