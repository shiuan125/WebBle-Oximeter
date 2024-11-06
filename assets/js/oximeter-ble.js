var spo2Dataset = [];
var piDataset = [];
var bpmDataset = [];
var countdownTimer = null;
var heartIcon = document.getElementById('heart-icon');
var countdownElement = document.getElementById('countdown-timer');
var resultOxiElement = document.getElementById('oximeter-result');
var device = null;
var oxy500serviceUuid = "cdeacb80-5235-4c07-8846-93a37ee6b86d";
var oxy500notifyCharacteristicUUID = "cdeacb81-5235-4c07-8846-93a37ee6b86d";
var b4btServiceUUID = "0000fff0-0000-1000-8000-00805f9b34fb";
var b4btNotifyCharacteristicUUID = "0000fff1-0000-1000-8000-00805f9b34fb";
var b4btWriteCharacteristicUUID = "0000fff2-0000-1000-8000-00805f9b34fb";

var isMonitor = true;

const ChromeSamples = {
  log: function () {
    var line = Array.prototype.slice.call(arguments).map(function (argument) {
      return typeof argument === 'string' ? argument : JSON.stringify(argument);
    }).join(' ');

    document.querySelector('#log').textContent += line + '\n';
  },

  clearLog: function () {
    document.querySelector('#log').textContent = '';
  },

  setStatus: function (status) {
    document.querySelector('#status').textContent = status;
  },

  setContent: function (newContent) {
    var content = document.querySelector('#content');
    while (content.hasChildNodes()) {
      content.removeChild(content.lastChild);
    }
    content.appendChild(newContent);
  }
};
const log = ChromeSamples.log;

function isWebBluetoothEnabled() {
  if (!navigator.bluetooth) {
    log('Web Bluetooth API is not available in this browser!');
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
  let options = {
    filters: [
      { name: "OXY500 BT" },
      { name: "JPO" },
      { name: "My Oximeter" },
      { name: "Medical Device" },
      { name: "Medical" },
      { name: "OXY550 BT" },
      { name: "B4 BT" }
    ],
    optionalServices: [
      'cdeacb80-5235-4c07-8846-93a37ee6b86d', 
      //'cdeacb81-5235-4c07-8846-93a37ee6b86d', 
      //'cdeacb82-5235-4c07-8846-93a37ee6b86d', 
      '0000fff0-0000-1000-8000-00805f9b34fb',
      //'0000fff1-0000-1000-8000-00805f9b34fb',
      //'0000fff2-0000-1000-8000-00805f9b34fb'
    ]
  };
  device = await navigator.bluetooth.requestDevice(options);
  device.addEventListener('gattserverdisconnected', onDisconnected);
  console.log(`connected to ${device.name}`);
  connectAndQueryData();
}

async function connectAndQueryData() {
  let serviceUuid;
  let characteristicUUID;
  var b4Notifycharacteristic;

  try {
    if (device.name == "B4 BT") {
      serviceUuid = b4btServiceUUID;
      characteristicUUID = b4btWriteCharacteristicUUID;
    }
    else {
      serviceUuid = oxy500serviceUuid;
      characteristicUUID = oxy500notifyCharacteristicUUID;
    }
    const server = await device.gatt.connect();
    console.log('gatt connect');
    const service = await server.getPrimaryService(serviceUuid);
    console.log('getPrimaryService');
    const characteristic = await service.getCharacteristic(characteristicUUID);
    console.log('getCharacteristic');
    if (device.name == "B4 BT") {
      b4Notifycharacteristic = await service.getCharacteristic(b4btNotifyCharacteristicUUID);
    }
    
    if (device.name == "B4 BT") {
      // 監聽特徵的值以取得回應
      b4Notifycharacteristic.addEventListener('characteristicvaluechanged', b4handleData);
      await b4Notifycharacteristic.startNotifications();

      const readDeviceInfoCMD = new Uint8Array([0x4D, 0xFF, 0x00, 0x02, 0x0B, 0x59]);
      console.log('讀取設備資訊');
      await characteristic.writeValueWithResponse(readDeviceInfoCMD);

      // 要寫入的資料 (這裡是 Uint8Array 格式)
      const readUserIdAndVersionDataCMD = new Uint8Array([0x4D, 0xFF, 0x00, 0x02, 0x05, 0x53]);
      // 使用 writeValue 寫入資料
      console.log('讀取設備版本');
      await characteristic.writeValueWithResponse(readUserIdAndVersionDataCMD);

      const readTimeCMD = new Uint8Array([0x4D, 0xFF, 0x00, 0x02, 0x0C, 0x5A]);  // 查看時間指令
      setTimeout(async () => {
        console.log('查看時間');
        await characteristic.writeValueWithResponse(readTimeCMD);
      }, 1000);

      // 呼叫函數並印出結果
      const hexDateTime = getHexDateTime();
      const bytes = [0x4D, 0xFF, 0x00, 0x08, 0x0D, parseInt(hexDateTime.yearHex, 16), parseInt(hexDateTime.monthHex, 16), parseInt(hexDateTime.dayHex, 16), parseInt(hexDateTime.hourHex, 16), parseInt(hexDateTime.minuteHex, 16), parseInt(hexDateTime.secondHex, 16)];
      // 計算 checksum
      const result = calculateChecksum(bytes);
      const checkSumHex = `0x${result}`;
      //header,device,length_h,length_l,cmd,Year(20xx),Month,Day,Hour,Minute,Second,Checksum
      const setTimeCMD = new Uint8Array([0x4D, 0xFF, 0x00, 0x08, 0x0D, parseInt(hexDateTime.yearHex, 16), parseInt(hexDateTime.monthHex, 16), parseInt(hexDateTime.dayHex, 16), parseInt(hexDateTime.hourHex, 16), parseInt(hexDateTime.minuteHex, 16), parseInt(hexDateTime.secondHex, 16), parseInt(result, 16)]);  // 設定時間指令
      setTimeout(async () => {
        console.log('修改時間');
        await characteristic.writeValueWithResponse(setTimeCMD);
      }, 2000);

      let setGetRecordsArray = [0x4D, 0xFF, 0x00, 0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFD];
      let setGetRecordsCheckSum = calculateChecksum(setGetRecordsArray);
      const setGetRecordsCMD = new Uint8Array([0x4D, 0xFF, 0x00, 0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFD, parseInt(setGetRecordsCheckSum, 16)]);
      setTimeout(async () => {
        console.log('查詢量測記錄');
        await characteristic.writeValueWithResponse(setGetRecordsCMD);
      }, 3000);


      const disconnectCMD = new Uint8Array([0x4D, 0xFF, 0x00, 0x02, 0x04, 0x52]);  // 斷線指令
      setTimeout(async () => {
        console.log('斷線指令');
        characteristic.writeValueWithResponse(disconnectCMD);
      }, 10000);

    } else {
      characteristic.addEventListener('characteristicvaluechanged', handleData);
      characteristic.startNotifications();
    }
    
    showBluetoothIcon();
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

function b4handleData(e) {
  let device = null;
  let cmd = null;
  let bpCount = null;
  let currentMode = null;
  let historyMeasurementTimes = null;
  let userNumber = null;
  let mamVersion = null;
  let macAddress = null;
  let bpDescriptionArray = [];
  const t = e.target;
  const { value } = t; // ArrayBuffer
  let data = [];

  for (let i = 0; i < value.byteLength; i++) {
    data.push(value.getUint8(i));
  }
  if (data.length > 0) {
    const [b1] = data;
    if (b1 === 77) {
      if (data[1] === 58) {
        device = "4G BPM";
      }
      else if (data[1] === 49) {
        device = "3G BPM";
      }
      if (data[4] === 0) {
        cmd = "Send the all history or current data to APP.";
        let length_L = data[3];
        bpCount = (length_L - 39) / 10;
        if (data[5] === 0) {
          if (data[6] == 0) {
            currentMode = "BP_Single_MODE";
          }
          else if (data[6] == 1) {
            currentMode = "BP_Single_MODE + SW Afib ON";
          }
          else if (data[6] == 2) {
            currentMode = "BP_MAM_MODE";
          }
          else if (data[6] == 3) {
            currentMode = "BP_MAM_MODE + SW Afib ON";
          }
          times = data[7];
          if (data[8] == 1) {
            userNumber = "User1";
          }
          else if (data[8] == 2) {
            userNumber = "User2";
          }
          else if (data[8] == 3) {
            userNumber = "Guest";
          }
          if (data[9] == 0) {
            mamVersion = "MAM weight";
          }
          else if (data[9] == 1) {
            mamVersion = "MAM light";
          }
          else if (data[9] == 256) {
            mamVersion = "No MAM function";
          }

        }
        let bpDataNumber = bpCount * 10;
        let bpData = data.slice(5 + 37, 5 + 37 + bpDataNumber);
        let bpDataList = converBpData(bpData);
        for (let i = 0; i < bpDataList.length; i++) {
          let bpSetting = bpDataList[i][8].toString(2).padStart(8, '0').split('');
          let cuffok = bpSetting[0];
          let ihb = bpSetting[1];
          let afib = bpSetting[2];
          let mode = null;
          if (bpSetting[3] == 0 && bpSetting[4] == 0) {
            mode = "BP_Single_MODE";
          }
          else if (bpSetting[3] == 0 && bpSetting[4] == 1) {
            mode = "BP_Single_MODE+ SW AFib ON";
          }
          else if (bpSetting[3] == 1 && bpSetting[4] == 0) {
            mode = "BP_MAM_MODE";
          }
          else if (bpSetting[3] == 1 && bpSetting[4] == 1) {
            mode = "BP_MAM_MODE+SW AFib ON";
          }
          let gSensor = null;
          if (bpSetting[5] == 1 && bpSetting[6] == 0 && bpSetting[7] == 0) {
            gSensor = "G-Sensor normal";
          }
          else if (bpSetting[5] == 1 && bpSetting[6] == 0 && bpSetting[7] == 1) {
            gSensor = "G-Sensor normal";
          }
          else if (bpSetting[5] == 1 && bpSetting[6] == 1 && bpSetting[7] == 0) {
            gSensor = "G-Sensor up";
          }
          else if (bpSetting[5] == 1 && bpSetting[6] == 1 && bpSetting[7] == 1) {
            gSensor = "G-Sensor down";
          }
          else if (bpSetting[5] == 1 && bpSetting[6] == 0 && bpSetting[7] == 0) {
            gSensor = "G-Sensor MAM up & down";
          }
          else if (bpSetting[5] == 0) {
            gSensor = "Without G-Sensor status";
          }
          bpDescriptionArray.push(`Systolic:${bpDataList[i][0]} Diastolic:${bpDataList[i][1]} Pulse:${bpDataList[i][2]} \
20${bpDataList[i][3].toString().padStart(2, '0')}/${bpDataList[i][4].toString().padStart(2, '0')}/${bpDataList[i][5].toString().padStart(2, '0')} \
${bpDataList[i][6].toString().padStart(2, '0')}:${bpDataList[i][7].toString().padStart(2, '0')} \
cuffok:${cuffok} ihb:${ihb} afib:${afib} mode:${mode} g-sensor:${gSensor}`);
        }
      }
      else if (data[4] === 5) {
        cmd = "Send user ID and version data to APP.";
      }
      else if (data[4] === 11) {
        cmd = "Send device ID and info to APP.";
        macAddress = (`${data[6].toString(16).padStart(2, '0')}:${data[7].toString(16).padStart(2, '0')}:${data[8].toString(16).padStart(2, '0')}:${data[9].toString(16).padStart(2, '0')}:${data[10].toString(16).padStart(2, '0')}:${data[11].toString(16).padStart(2, '0')}`);
        macAddress = macAddress.toUpperCase();
        //log(data);
      }
      else if (data[4] === 12) {
        cmd = "Send the device time to APP";

      }
      else if (data[4] === 129) {
        cmd = "BPM reply ACK, the BPM has complete the work.";
      }
      else if (data[4] === 145) {
        cmd = "BPM reply NACK, the BPM has not complete the work.";
      }

      log(`Device:${device} CMD:${cmd} ${macAddress != null ? `Mac Address:${macAddress}` : ""} ${bpCount != null ? `bpCount:${bpCount}` : ""} ${currentMode != null ? `Current Mode:${currentMode}` : ""} \
${historyMeasurementTimes != null ? `History Measurement times:${historyMeasurementTimes}` : ""} ${userNumber != null ? `User Number:${userNumber}` : ""} \
${mamVersion != null ? `MAM Version:${mamVersion}` : ""} `);
      if (bpDescriptionArray.length > 0) {
        bpDescriptionArray.forEach((value, index) => {
          log(`${value}`);
        });
      }
    }
    console.log(data);
  }

}

function converBpData(array) {
  const result = [];
  console.log(array);
  // 每 10 個 byte 為一組
  for (let i = 0; i < array.length; i += 10) {
    const group = array.slice(i, i + 10);

    // 將每組資料加入結果陣列
    result.push(group);
  }
  console.log(result);
  return result;
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

      //if (countdownTimer === null) {
      //  startCollectingData();  // 開始倒數和收集數據
      //}

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

function showBluetoothIcon() {
  var bl = document.getElementById("bl-icon");
  bl.hidden = false;
}

function onDisconnected() {
  console.log('> Bluetooth Device disconnected');
  log('> Bluetooth Device disconnected');
  var bl = document.getElementById("bl-icon");
  bl.hidden = true;
}

function onConnectButtonClick() {
  if (isWebBluetoothEnabled()) {
    ChromeSamples.clearLog();
    toggleConnection();
  }
  else {
    log('Web Bluetooth API is not available in this browser!');
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

function getHexDateTime() {
  const now = new Date();
  console.log(now);
  // 取得年份後兩碼並轉成16進位
  let yearHex = (now.getFullYear() % 100).toString(16).padStart(2, '0');

  // 取得月份 (0-11) + 1 再轉成16進位，補兩位數
  let monthHex = (now.getMonth() + 1).toString(16).padStart(2, '0');

  // 取得日期轉16進位
  let dayHex = now.getDate().toString(16).padStart(2, '0');

  // 時、分、秒都轉成16進位
  let hourHex = now.getHours().toString(16).padStart(2, '0');
  let minuteHex = now.getMinutes().toString(16).padStart(2, '0');
  let secondHex = now.getSeconds().toString(16).padStart(2, '0');

  return {
    yearHex,
    monthHex,
    dayHex,
    hourHex,
    minuteHex,
    secondHex
  };
}

function calculateChecksum(bytes) {
  // 加總所有位元組
  let sum = bytes.reduce((acc, byte) => acc + byte, 0);

  // 取 256 模，確保結果是 8 位元
  let checksum = sum % 256;

  // 回傳十六進位格式的 checksum
  return checksum.toString(16).toUpperCase().padStart(2, '0');
}



