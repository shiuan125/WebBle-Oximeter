var spo2Dataset = [];
var piDataset = [];
var bpmDataset = [];
var countdownTimer = null;
var heartIcon = document.getElementById('heart-icon');
var countdownElement = document.getElementById('countdown-timer');
var resultOxiElement = document.getElementById('oximeter-result');
var device = null;
var serviceUuid = "cdeacb80-5235-4c07-8846-93a37ee6b86d";
var notifyCharacteristicUUID = "cdeacb81-5235-4c07-8846-93a37ee6b86d";
var isMonitor = true;

function isWebBluetoothEnabled() {
  if (!navigator.bluetooth) {
    console.log('Web Bluetooth API is not available in this browser!')
    return false
  }
  return true
}

async function toggleConnection() {
  try {
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    } else {
      await connect();
    }
    return !!device?.gatt?.connected;
  } catch (err) {
    console.error(err);
  }
}

async function connect() {
  console.log('connecting...');
  let options = {
    filters: [
      { name: "OXY500 BT" },
      { name: "JPO" },
      { name: "My Oximeter" },
      { name: "Medical Device" },
      { name: "Medical" },
      { name: "OXY550 BT" },
    ],
    optionalServices: [
      'cdeacb80-5235-4c07-8846-93a37ee6b86d', // Primary service UUID
      'cdeacb81-5235-4c07-8846-93a37ee6b86d', // Notify UUID
      'cdeacb82-5235-4c07-8846-93a37ee6b86d'  // Write UUID
    ]
  };
  device = await navigator.bluetooth.requestDevice(options);
  device.addEventListener('gattserverdisconnected', onDisconnected);
  console.log(`connected to ${device.name}`);
  connectAndQueryData();
}

async function connectAndQueryData() {
  try {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(serviceUuid);
    const characteristic = await service.getCharacteristic(notifyCharacteristicUUID);
    characteristic.addEventListener('characteristicvaluechanged', handleData);
    characteristic.startNotifications();
    onConnected();
  } catch (error) {
    console.error('在連接或查詢資料時發生錯誤:', error);
    if (error.name === 'NotFoundError') {
      console.error('找不到指定的服務 UUID 或特徵值 UUID。請檢查 UUID 是否正確。');
    } else if (error.name === 'BluetoothError') {
      console.error('藍牙操作失敗，請確保設備已開啟且在範圍內。');
    } else {
      console.error('未知錯誤:', error);
    }
  }

  //#region 找出notify 
  //const characteristics = await service.getCharacteristics();
  //
  //for (const characteristic of characteristics) {
  //  if (characteristic.properties.notify) {
  //    characteristic.addEventListener('characteristicvaluechanged', handleData);
  //    characteristic.startNotifications();
  //  }
  //}
  //#endregion
}

function handleData(e) {
  const t = e.target;
  const { value } = t; // ArrayBuffer
  let data = [];
  for (let i = 0; i < value.byteLength; i++) {
    data.push(value.getUint8(i));
  }
  if (data.length > 0) {
    const [b1] = data;
    if (b1 === 129 && isMonitor) {
      console.log(`血氧數值${data}`);
      let spo2 = document.getElementById('spo2-value');
      let bpm = document.getElementById('bpm-value');
      let pi = document.getElementById('pi-value');

      const spo2Value = data[2] == 127 ? "--" : data[2];
      const bpmValue = data[1] == 255 ? "--" : data[1];
      const piValue = data[3] == 0 ? "--" : (data[3] * 0.1).toFixed(1);

      spo2.innerHTML = `<p>${spo2Value}</p>`;
      bpm.innerHTML = `<p>${bpmValue}</p>`;
      pi.innerHTML = `<p>${piValue}</p>`;

      heartIcon.classList.toggle('active', data[1] != 255);

      if (countdownTimer === null) {
        startCollectingData();  // 開始倒數和收集數據
      }

      // 收集數據
      if (spo2Value !== "--") spo2Dataset.push(parseInt(spo2Value));
      if (bpmValue !== "--") bpmDataset.push(parseInt(bpmValue));
      if (piValue !== "--") piDataset.push(parseFloat(piValue));
    }
    else if (b1 === 130) {
      console.log(`血氧飽和度和脈率報警限${data}`);
    }
    else if (b1 === 128) {
      data.shift();
      console.log(data);
      pushToDataQueue(data);
    }
    else {
      console.log(data);
    }
  }
}

function startCollectingData() {
  // 清空先前的數據
  spo2Dataset = [];
  piDataset = [];
  bpmDataset = [];

  // 開始倒數 30 秒
  let countdown = 30;
  countdownElement.innerText = `倒數：${countdown}`;

  countdownTimer = setInterval(() => {
    countdown--;
    countdownElement.innerText = `倒數：${countdown}`;
    if (countdown <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      countdownElement.innerText = `倒數：0`;
      calculateAverages();
    }
  }, 1000);
}

function calculateAverages() {
  const avgSpo2 = spo2Dataset.length > 0 ? (spo2Dataset.reduce((a, b) => a + b) / spo2Dataset.length).toFixed(1) : '--';
  const avgPi = piDataset.length > 0 ? (piDataset.reduce((a, b) => a + b) / piDataset.length).toFixed(1) : '--';
  const avgBpm = bpmDataset.length > 0 ? (bpmDataset.reduce((a, b) => a + b) / bpmDataset.length).toFixed(1) : '--';

  console.log(`30 秒數據收集結束。平均值： SPO2: ${avgSpo2}, PI: ${avgPi}, Pulse: ${avgBpm}`);
  isMonitor = false;
  resultOxiElement.innerText = `30 秒數據收集結束。平均值： SPO2: ${avgSpo2}, PI: ${avgPi}, Pulse: ${avgBpm}`;
}

function onConnected() {
  var bl = document.getElementById("bl-icon");
  bl.hidden = false;
}

function onDisconnected() {
  console.log('> Bluetooth Device disconnected');
  var bl = document.getElementById("bl-icon");
  bl.hidden = true;
}

function onConnectButtonClick() {
  if (isWebBluetoothEnabled()) {
    toggleConnection();
  }
  else {
    alert('It is recommended to use chrome.');
  }
}

function onDisconnectButtonClick() {
  if (!device) {
    return;
  }
  console.log('Disconnecting from Bluetooth Device...');
  if (device.gatt.connected) {
    device.gatt.disconnect();
  } else {
    console.log('> Bluetooth Device is already disconnected');
  }
}

function onReconnectButtonClick() {
  if (!device) {
    return;
  }
  if (device.gatt.connected) {
    console.log('> Bluetooth Device is already connected');
    return;
  }
  else {
    connectAndQueryData();
  }
}