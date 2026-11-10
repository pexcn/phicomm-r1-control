function dlna() {
  try {
    document.getElementById("stopBtn").click();
  } catch {}
  location.href = R1Config.assetUrl("pages/dlna/") + "?" + Date.now();
}

document.addEventListener("plusready", function () {
  // 确保在plus环境准备好后执行
  if (!window.plus) {
    console.error("HTML5+环境未加载");
    updateStatus("错误: HTML5+环境未加载", false);
    return;
  }

  plus.android.requestPermissions(
    [
      "android.permission.INTERNET",
      "android.permission.ACCESS_WIFI_STATE",
      "android.permission.CHANGE_WIFI_MULTICAST_STATE",
    ],
    function (e) {
      console.log("权限已获取");
      initNsd();
    },
    function (e) {
      console.error("权限被拒绝: ", e);
      updateStatus("错误：权限被拒绝，无法扫描设备", false);
    },
  );

  // 获取DOM元素
  const scanBtn = document.getElementById("scanBtn");
  const stopBtn = document.getElementById("stopBtn");
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");
  const devicesList = document.getElementById("devicesList");

  // 更新状态显示
  function updateStatus(text, isScanning) {
    statusText.textContent = text;
    statusIndicator.className = "status-indicator " + (isScanning ? "scanning" : "idle");
    scanBtn.disabled = isScanning;
    stopBtn.disabled = !isScanning;
  }

  // 初始化NSD
  let nsdManager = null;
  let discoveryListeners = {};
  const serviceTypes = [
    /*"_http._tcp.",
          "_https._tcp.",
          "_printer._tcp.",
          "_ftp._tcp.",
          "_smb._tcp.",
          "_ssh._tcp.",
          "_nfs._tcp.",
          "_afpovertcp._tcp.",*/
    //"_googlecast._tcp.",
    "_airplay._tcp.",
    "_raop._tcp.",
    //"_adb._tcp.",
  ]; // 要发现的服务类型

  function initNsd() {
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

      // 添加到列表顶部
      devicesList.appendChild(deviceCard);

      return true;
    } catch (e) {
      console.error("初始化NSD失败: " + (e.message || e));
      updateStatus("初始化失败: " + (e.message || e), false);
      return false;
    }
  }

  // 创建发现监听器
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

                // 添加到设备列表
                addDeviceToList(serviceName, hostAddress, serviceType, port, attributes);
              },
              onResolveFailed: function (service, errorCode) {
                console.log("解析服务失败: " + service.getServiceName() + ", 错误码: " + errorCode);
              },
            }),
          );
        } catch (e) {
          console.error("解析服务异常: " + (e.message || e));
        }
      },
      onServiceLost: function (service) {
        console.log("服务丢失: " + service.getServiceName());
        removeDeviceFromList(service.getServiceName());
      },
      onDiscoveryStopped: function (serviceType) {
        console.log("发现服务已停止: " + serviceType);
      },
      onStartDiscoveryFailed: function (serviceType, errorCode) {
        console.log("启动发现失败: " + serviceType + ", 错误码: " + errorCode);
        if (discoveryListeners[serviceType]) delete discoveryListeners[serviceType];
        updateStatus("启动发现失败: " + serviceType + ", 错误码: " + errorCode, false);
      },
      onStopDiscoveryFailed: function (serviceType, errorCode) {
        console.log("停止发现失败: " + serviceType + ", 错误码: " + errorCode);
      },
    });
  }

  // 开始扫描
  function startDiscovery() {
    if (!nsdManager) {
      return;
    }

    // 清空设备列表
    devicesList.innerHTML = "";

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

      if (!Object.values(discoveryListeners).length) {
        throw new Error("");
      }

      updateStatus("正在扫描网络中的设备...", true);
    } catch (e) {
      console.error("发现服务失败: " + (e.message || e));
      updateStatus("发现服务失败: " + (e.message || e), false);
    }
  }

  // 停止扫描
  function stopDiscovery() {
    if (nsdManager) {
      try {
        // 停止所有服务类型的发现
        serviceTypes.forEach((type) => {
          if (discoveryListeners[type]) {
            nsdManager.stopServiceDiscovery(discoveryListeners[type]);
          }
        });

        updateStatus("扫描已停止", false);
      } catch (e) {
        console.error("停止发现失败: " + (e.message || e));
        updateStatus("停止发现失败: " + e, false);
      }
    }
  }

  // 添加设备到列表
  function addDeviceToList(name, ip, type, port, attributes) {
    // 检查是否已存在相同IP的设备
    const existingDevice = Array.from(devicesList.querySelectorAll(".device-card")).find((card) =>
      card.querySelector(".device-ip").textContent.includes(ip),
    );

    if (existingDevice) {
      // 更新现有设备
      const serviceList = existingDevice.querySelector(".device-services");
      const newService = document.createElement("div");
      newService.textContent = `服务: ${type.replace(/\./g, "")} (端口: ${port})`;
      serviceList.appendChild(newService);

      const device_name = existingDevice.querySelector(".device-name")[0];
      if (device_name) device_name.innerHTML = name;
      return;
    }

    const deviceCard = document.createElement("div");
    deviceCard.className = "device-card";
    deviceCard.dataset.name = name;
    deviceCard.dataset.ip = ip;

    // 根据设备类型选择图标
    let iconClass = "fas fa-laptop";
    let deviceType = "未知设备";

    if (type.includes("http") || type.includes("www")) {
      iconClass = "fas fa-server";
      deviceType = "Web服务";
    } else if (type.includes("printer") || type.includes("print")) {
      iconClass = "fas fa-print";
      deviceType = "打印机";
    } else if (["android", "mobile", "adb"].find((name) => type.includes(name))) {
      iconClass = "fas fa-mobile-alt";
      deviceType = "移动设备";
    } else if (["smb", "nfs", "ftp", "file", "afpovertcp"].find((name) => type.includes(name))) {
      iconClass = "fas fa-folder";
      deviceType = "文件共享";
    } else if (["airplay", "googlecast", "raop"].find((name) => type.includes(name))) {
      iconClass = "fas fa-tv";
      deviceType = "投屏设备";
    } else if (type.includes("ssh")) {
      iconClass = "fas fa-terminal";
      deviceType = "SSH服务";
    }

    deviceCard.innerHTML = `
                    <div class="device-icon">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="device-info">
                        <div class="device-name">${name}</div>
                        <div class="device-ip">IP地址: ${ip}</div>
                        <div class="device-type">类型: ${deviceType}</div>
                        <div class="device-services">
                            <div>服务: ${type.replace(/\./g, "")} (端口: ${port})</div>
                        </div>
                    </div>
                `;

    // 添加到列表顶部
    devicesList.insertBefore(deviceCard, devicesList.firstChild);

    // 更新图表
    updateChart();
  }

  // 从列表中移除设备
  function removeDeviceFromList(name) {
    const deviceCard = Array.from(devicesList.querySelectorAll(".device-card")).find(
      (card) => card.dataset.name === name,
    );

    if (deviceCard) {
      deviceCard.remove();
      updateChart();
    }
  }

  // 更新设备分布图表
  function updateChart() {
    const deviceTypes = {};
    const deviceCards = devicesList.querySelectorAll(".device-card");

    deviceCards.forEach((card) => {
      const typeElement = card.querySelector(".device-type");
      if (typeElement) {
        const type = typeElement.textContent.replace("类型: ", "");
        deviceTypes[type] = (deviceTypes[type] || 0) + 1;
      }
    });

    if (!chart) return;

    const chartData = Object.entries(deviceTypes).map(([name, value]) => ({
      value: value,
      name: name,
    }));

    chart.setOption({
      series: [
        {
          data: chartData,
        },
      ],
    });
  }

  // 事件绑定
  scanBtn.addEventListener("click", startDiscovery);
  stopBtn.addEventListener("click", stopDiscovery);

  // 初始化图表
  /*const chartDom = document.getElementById("chart");
        const chart = echarts.init(chartDom);

        const chartOption = {
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

        chart.setOption(chartOption);

        // 处理窗口大小变化
        window.addEventListener("resize", function () {
          chart.resize();
        });*/
});
/*var script = document.createElement("script");
      script.type = "text/javascript";
      script.src =
        location.protocol + "//unpkg.com/vconsole@latest/dist/vconsole.min.js";
      script.onload = function () {
        window.mVConsole = new window.VConsole();
      };
      document.body.appendChild(script);*/
