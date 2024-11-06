
function detectBrowser() {
    var userAgent = navigator.userAgent;
    var browserName, browserVersion;

    if (userAgent.match(/chrome|chromium|crios/i)) {
        browserName = "Chrome";
    } else if (userAgent.match(/firefox|fxios/i)) {
        browserName = "Firefox";
    } else if (userAgent.match(/safari/i)) {
        browserName = "Safari";
    } else if (userAgent.match(/opr\//i)) {
        browserName = "Opera";
    } else if (userAgent.match(/edg/i)) {
        browserName = "Edge";
    } else if (userAgent.match(/trident/i)) {
        browserName = "Internet Explorer";
    } else if (userAgent.match(/SamsungBrowser/i)) {
        browserName = "Samsung Internet";
    } else {
        browserName = "Unknown";
    }

    // 獲取版本號
    var matches = userAgent.match(/(SamsungBrowser|opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(matches[1])) {
        browserVersion = /\brv[ :]+(\d+)/g.exec(userAgent) || [];
        browserVersion = browserVersion[1] || "";
    } else if (browserName === "Samsung Internet") {
        browserVersion = userAgent.match(/SamsungBrowser\/(\d+\.\d+)/i)[1] || "Unknown";
    } else {
        browserVersion = matches[2] ? matches[2] : "Unknown";
    }

    return {
        name: browserName,
        version: browserVersion
    };
}

function getDeviceInfo() {
    const userAgent = navigator.userAgent || window.opera;
    let deviceType = "Unknown";
    let operatingSystem = "Unknown";

    // 判斷是否為行動裝置 (手機/平板)
    if (/android/i.test(userAgent)) {
        deviceType = "Mobile";
        operatingSystem = "Android";
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        deviceType = "Mobile";
        operatingSystem = "iOS";
    } else if (/Windows Phone/i.test(userAgent)) {
        deviceType = "Mobile";
        operatingSystem = "Windows Phone";
    }
    // 判斷桌上型電腦作業系統
    else if (/Win/i.test(userAgent)) {
        deviceType = "Desktop";
        operatingSystem = "Windows";
    } else if (/Mac/i.test(userAgent)) {
        deviceType = "Desktop";
        operatingSystem = "MacOS";
    } else if (/Linux/i.test(userAgent)) {
        deviceType = "Desktop";
        operatingSystem = "Linux";
    }

    // 判斷是否為平板
    if (/iPad|Android/.test(userAgent) && !/Mobile/.test(userAgent)) {
        deviceType = "Tablet";
    }

    return {
        deviceType: deviceType,
        operatingSystem: operatingSystem
    };
}

function isIosBluefy() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isBluefy = userAgent.includes('bluefy');

    return isBluefy;
}

const browser = detectBrowser();
const deviceInfo = getDeviceInfo();
if (deviceInfo.operatingSystem == "iOS") {
    if (!isBluefy) {
        log("It is recommended to use bluefy APP to open.");
    }
}
else if (deviceInfo.operatingSystem == "Android") {
    if (browser.name != "Chrome" && browser.name != "Samsung Internet") {
        log("It is recommended to use Chrome APP to open.");
    }
}
else if(deviceInfo.deviceType=="Desktop"){
    if (browser.name != "Chrome" && browser.name != "Opera" && browser.name != "Edge") {
        log("It is recommended to use Chrome APP to open.");
    }
}


window.onload = function() {
    var browser = detectBrowser();
    document.getElementById('browser-info').textContent =`Browser: ${browser.name} ${browser.version} device: ${deviceInfo.deviceType} Browser: ${deviceInfo.operatingSystem}`;
}
