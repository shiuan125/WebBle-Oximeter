const dataQueue = [];
function pushToDataQueue(newArray) {
    // 將新陣列推入 dataQueue
    dataQueue.push(newArray);
}


const ctx = document.getElementById('volumeChart').getContext('2d');

let currentArray = [];  // 儲存目前的資料組
let dataIndex = 0;  // 當前資料的索引
let globalIndex = 0;  // 用於時間軸的索引

let data = {
    labels: [], // x軸標籤
    datasets: [{
        label: '體積',
        borderColor: 'rgba(192, 42, 75, 1)',
        backgroundColor: 'rgba(192, 42, 75, 0.2)',
        data: [],
        pointRadius: 0,
        tension: 0.4,
        cubicInterpolationMode: 'monotone'
    }]
};

const config = {
    type: 'line',
    data: data,
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                ticks: {
                    display: false
                }
            },
            y: {
                beginAtZero: true,
                max: 150,
                min: 0,
                ticks: {
                    stepSize: 10
                },
                title: {
                    display: true,
                    text: '體積數值'
                }
            }
        },
        animation: {
            duration: 0 // 禁用動畫，使圖表更新更流暢
        }
    }
};

const volumeChart = new Chart(ctx, config);

// 每20毫秒更新一次資料點
function updateChart() {
    // 如果當前資料組已處理完畢，從 dataQueue 中提取下一組資料
    if (dataIndex >= currentArray.length) {
        if (dataQueue.length > 0) {
            currentArray = dataQueue.shift(); // 取出下一組資料
            dataIndex = 0; // 重置索引
        }
    }

    // 如果還有資料未處理，繼續更新圖表
    if (dataIndex < currentArray.length) {
        // 更新 x 軸標籤 (時間) 和 y 軸資料 (體積數值)
        data.labels.push(globalIndex * 20); // 每20毫秒更新一次，時間軸遞增
        data.datasets[0].data.push(currentArray[dataIndex]); // 插入新資料點

        // 限制圖表顯示的資料點數量，避免資料過多
        if (data.labels.length > 50) {
            data.labels.shift(); // 移除最舊的 x 軸標籤
            data.datasets[0].data.shift(); // 移除最舊的 y 軸資料點
        }

        volumeChart.update(); // 更新圖表
        dataIndex++; // 更新當前資料索引
        globalIndex++; // 更新時間索引
    }
}

// 每20毫秒更新一次圖表
setInterval(updateChart, 20);
