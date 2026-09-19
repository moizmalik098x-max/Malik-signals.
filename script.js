const signalBtn = document.getElementById("signalBtn");
const signalBox = document.getElementById("signal");
const confidenceBox = document.getElementById("confidence");
const detailsBox = document.getElementById("signalDetails");

const confidenceFill =
  document.getElementById("confidenceFill");

const countdownBox =
  document.getElementById("countdown");

let countdownTimer = null;

const pairSelect = document.getElementById("pair");
const expirySelect = document.getElementById("expiry");
const historyList = document.getElementById("historyList");

const totalSignalsBox = document.getElementById("totalSignals");
const winsBox = document.getElementById("wins");
const lossesBox = document.getElementById("losses");
const winRateBox = document.getElementById("winRate");

const WORKER_URL =
  "https://shrill-mud-c417.malikmoizm647.workers.dev";

let history = [];


// ==========================================
// LOAD SAVED HISTORY
// ==========================================

try {

  const savedHistory =
    localStorage.getItem("malikSignalsHistory");

  if (savedHistory) {
    history = JSON.parse(savedHistory);
  }

} catch (error) {

  console.error("History load error:", error);
  history = [];

}


// ==========================================
// SAVE HISTORY
// ==========================================

function saveHistory() {

  try {

    const cleanHistory =
      history.map(function(item) {

        return {
          pair: item.pair,
          direction: item.direction,
          confidence: item.confidence,
          entryPrice: item.entryPrice,
          expiry: item.expiry,
          result: item.result,
          exitPrice: item.exitPrice || null,
          time: item.time,
          expiresAt: item.expiresAt
        };

      });

    localStorage.setItem(
      "malikSignalsHistory",
      JSON.stringify(cleanHistory)
    );

  } catch (error) {

    console.error(
      "History save error:",
      error
    );

  }

}


// ==========================================
// LOAD HISTORY
// ==========================================

function loadHistory() {

  historyList.innerHTML = "";

  if (!history || history.length === 0) {

    const empty =
      document.createElement("div");

    empty.className =
      "empty-history";

    empty.innerText =
      "No signals yet.";

    historyList.appendChild(empty);

    updateStats();

    return;
  }


  history.forEach(function(trade) {

    renderHistoryItem(trade);

  });


  updateStats();


  history.forEach(function(trade) {

    if (!trade.result) {

      const remaining =
        (trade.expiresAt || Date.now()) -
        Date.now();


      if (remaining <= 0) {

        checkResult(trade);

      } else {

        startCountdown(trade);

      }

    }

  });

}


// ==========================================
// RENDER HISTORY ITEM
// ==========================================

function renderHistoryItem(trade) {

  const item =
    document.createElement("div");

  item.className =
  "history-item " +
  (trade.direction === "CALL ↑"
    ? "call-history"
    : "put-history");
  


  let resultText =
    "⏳ Waiting...";


  if (trade.result === "WIN") {

    resultText =
      "✅ WIN";

  } else if (trade.result === "LOSS") {

    resultText =
      "❌ LOSS";

  } else if (trade.result === "DRAW") {

    resultText =
      "➖ DRAW";

  }


  if (trade.exitPrice) {

    resultText +=
      " • Exit: " +
      Number(trade.exitPrice).toFixed(5);

  }


  item.innerHTML =
    "<strong>" +
    (trade.time || "") +
    "</strong> • " +
    trade.pair +
    " • " +
    trade.direction +
    "<br>Confidence: " +
    trade.confidence +
    "%" +
    " • Entry: " +
    Number(trade.entryPrice).toFixed(5) +
    "<br>Expiry: " +
    trade.expiry +
    " Minute" +
    "<br><b class='trade-result'>" +
    resultText +
    "</b>";


  trade.element =
    item;


  historyList.prepend(item);

}


// ==========================================
// START COUNTDOWN
// ==========================================

function startCountdown(trade) {

  if (!countdownBox) {
    return;
  }


  if (countdownTimer) {

    clearInterval(countdownTimer);

    countdownTimer = null;

  }


  function updateCountdown() {

    const remaining =
      Math.max(
        0,
        trade.expiresAt - Date.now()
      );


    const totalSeconds =
      Math.ceil(
        remaining / 1000
      );


    const minutes =
      Math.floor(
        totalSeconds / 60
      );


    const seconds =
      totalSeconds % 60;


    countdownBox.innerText =
      "⏳ Expiry: " +
      minutes +
      ":" +
      String(seconds).padStart(2, "0");


    if (remaining <= 0) {

      clearInterval(countdownTimer);

      countdownTimer = null;

      countdownBox.innerText =
        "🔄 Checking result...";

      checkResult(trade);

    }

  }


  updateCountdown();


  countdownTimer =
    setInterval(
      updateCountdown,
      1000
    );

}


// ==========================================
// GENERATE SIGNAL
// ==========================================

async function generateSignal() {

  const pair =
    pairSelect.value;


  const expiry =
    Number(
      expirySelect.value
    );


  signalBtn.disabled =
    true;


  signalBtn.innerText =
    "ANALYZING...";


  signalBox.innerText =
    "WAIT";


  signalBox.style.color =
    "#ffffff";


  signalBox.style.textShadow =
    "none";


  confidenceBox.innerText =
    "Analyzing market...";


  if (confidenceFill) {

    confidenceFill.style.width =
      "0%";

  }


  if (countdownBox) {

    countdownBox.innerText =
      "⏳ Waiting for signal";

  }


  detailsBox.innerText =
    "Getting real market data...";


  try {

    const response =
      await fetch(
        WORKER_URL +
        "?symbol=" +
        encodeURIComponent(pair) +
        "&t=" +
        Date.now()
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        "Worker HTTP Error: " +
        response.status
      );

    }


    if (data.status === "error") {

      throw new Error(
        data.message ||
        data.error ||
        "Market data error"
      );

    }


    if (
      !data.values ||
      data.values.length < 21
    ) {

      throw new Error(
        "Not enough market data"
      );

    }


    const candles =
      data.values;


    const closes =
      candles
        .slice()
        .reverse()
        .map(function(candle) {

          return Number(
            candle.close
          );

        });


    const price =
      closes[
        closes.length - 1
      ];
const ema9 =
  calculateEMA(
    closes,
    9
  );

const ema21 =
  calculateEMA(
    closes,
    21
  );

const rsi =
  calculateRSI(
    closes,
    14
  );

let direction;
let signalStrength = "NORMAL";

    



// ======================================
// TREND + RSI ANALYSIS
// ======================================

const emaDifference =
  Math.abs(ema9 - ema21);

const priceAboveEMA =
  price > ema9 && price > ema21;

const priceBelowEMA =
  price < ema9 && price < ema21;


// ======================================
// CALL / PUT DECISION
// ======================================

if (
  ema9 > ema21 &&
  rsi >= 45 &&
  rsi < 70
) {

  direction = "CALL ↑";

} else if (
  ema9 < ema21 &&
  rsi > 30 &&
  rsi <= 55
) {

  direction = "PUT ↓";

} else {

  direction =
    ema9 >= ema21
      ? "CALL ↑"
      : "PUT ↓";

}


// ======================================
// CONFIDENCE CALCULATION
// ======================================

let confidence = 60;


// EMA TREND
if (
  direction === "CALL ↑" &&
  ema9 > ema21
) {

  confidence += 10;

}

if (
  direction === "PUT ↓" &&
  ema9 < ema21
) {

  confidence += 10;

}


// PRICE CONFIRMATION
if (
  direction === "CALL ↑" &&
  priceAboveEMA
) {

  confidence += 10;

}

if (
  direction === "PUT ↓" &&
  priceBelowEMA
) {

  confidence += 10;

}


// RSI CONFIRMATION
if (
  direction === "CALL ↑" &&
  rsi >= 45 &&
  rsi <= 65
) {

  confidence += 10;

}

if (
  direction === "PUT ↓" &&
  rsi >= 35 &&
  rsi <= 55
) {

  confidence += 10;

}


// ======================================
// SIGNAL STRENGTH
// ======================================

if (confidence >= 80) {

  signalStrength = "STRONG";

} else if (confidence >= 70) {

  signalStrength = "NORMAL";

} else {

  signalStrength = "WEAK";

}


confidence =
  Math.min(
    confidence,
    90
  );

    


    


    // ======================================
    // SIGNAL COLOR
    // ======================================

    signalBox.innerText =
      direction;


    if (
      direction.includes("CALL")
    ) {

      signalBox.style.color =
        "#00d084";

      signalBox.style.textShadow =
        "0 0 18px rgba(0, 208, 132, 0.35)";

    } else {

      signalBox.style.color =
        "#ff5c5c";

      signalBox.style.textShadow =
        "0 0 18px rgba(255, 92, 92, 0.35)";

    }


    // ======================================
    // CONFIDENCE
    // ======================================

    confidenceBox.innerText =
      "Confidence: " +
      confidence +
      "% • " +
      signalStrength;


    if (confidenceFill) {

      confidenceFill.style.width =
        confidence +
        "%";


      if (
        direction.includes("CALL")
      ) {

        confidenceFill.style.background =
          "#00d084";

      } else {

        confidenceFill.style.background =
          "#ff5c5c";

      }

    }


    // ======================================
    // DETAILS
    // ======================================

    detailsBox.innerHTML =
      "Pair: " +
      pair +
      " • Expiry: " +
      expiry +
      " Minute" +
      "<br>Entry Price: " +
      price.toFixed(5) +
      "<br>EMA9: " +
      ema9.toFixed(5) +
      " • EMA21: " +
      ema21.toFixed(5) +
      "<br>RSI: " +
      rsi.toFixed(1) +
      "<br>Signal Strength: <b>" +
      signalStrength +
      "</b>" +
      "<br><b>Result: Waiting...</b>";


    // ======================================
    // ADD HISTORY
    // ======================================

    addHistory(
      pair,
      direction,
      confidence,
      price,
      expiry
    );


  } catch (error) {

    signalBox.innerText =
      "ERROR";


    signalBox.style.color =
      "#ff5c5c";


    signalBox.style.textShadow =
      "none";


    confidenceBox.innerText =
      "Could not generate signal";


    if (confidenceFill) {

      confidenceFill.style.width =
        "0%";

    }


    detailsBox.innerText =
      error.message ||
      "Unknown error";


    if (countdownBox) {

      countdownBox.innerText =
        "⚠️ Signal unavailable";

    }


    console.error(
      "Signal error:",
      error
    );

  }


  signalBtn.disabled =
    false;


  signalBtn.innerText =
    "GENERATE SIGNAL";

}


// ==========================================
// EMA
// ==========================================

function calculateEMA(
  prices,
  period
) {

  const multiplier =
    2 / (period + 1);


  let ema =
    prices
      .slice(0, period)
      .reduce(
        function(a, b) {

          return a + b;

        },
        0
      ) / period;


  for (
    let i = period;
    i < prices.length;
    i++
  ) {

    ema =
      (prices[i] - ema) *
      multiplier +
      ema;

  }


  return ema;

}


// ==========================================
// RSI
// ==========================================

function calculateRSI(
  prices,
  period
) {

  let gains = 0;
  let losses = 0;


  for (
    let i = 1;
    i <= period;
    i++
  ) {

    const change =
      prices[i] -
      prices[i - 1];


    if (change >= 0) {

      gains += change;

    } else {

      losses -= change;

    }

  }


  let averageGain =
    gains / period;


  let averageLoss =
    losses / period;


  for (
    let i = period + 1;
    i < prices.length;
    i++
  ) {

    const change =
      prices[i] -
      prices[i - 1];


    const gain =
      change > 0
        ? change
        : 0;


    const loss =
      change < 0
        ? -change
        : 0;


    averageGain =
      (
        averageGain *
        (period - 1) +
        gain
      ) / period;


    averageLoss =
      (
        averageLoss *
        (period - 1) +
        loss
      ) / period;

  }


  if (averageLoss === 0) {

    return 100;

  }


  const rs =
    averageGain /
    averageLoss;


  return (
    100 -
    100 / (1 + rs)
  );

}


// ==========================================
// ADD HISTORY
// ==========================================

function addHistory(
  pair,
  direction,
  confidence,
  entryPrice,
  expiry
) {

  const empty =
    document.querySelector(
      ".empty-history"
    );


  if (empty) {

    empty.remove();

  }


  const now =
    new Date();


  const time =
    now.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }
    );


  const trade = {

    pair: pair,

    direction: direction,

    confidence: confidence,

    entryPrice: entryPrice,

    expiry: expiry,

    result: null,

    exitPrice: null,

    time: time,

    expiresAt:
      Date.now() +
      expiry * 60 * 1000,

    element: null

  };


  history.push(trade);


  renderHistoryItem(trade);


  saveHistory();


  updateStats();


  startCountdown(trade);

}


// ==========================================
// CHECK RESULT
// ==========================================

async function checkResult(trade) {

  if (trade.result) {

    return;

  }


  const resultBox =
    trade.element
      ? trade.element.querySelector(
          ".trade-result"
        )
      : null;


  if (resultBox) {

    resultBox.innerText =
      "🔄 Checking result...";

  }


  let lastError =
    "Unknown error";


  for (
    let attempt = 1;
    attempt <= 3;
    attempt++
  ) {

    try {

      const response =
        await fetch(
          WORKER_URL +
          "?symbol=" +
          encodeURIComponent(
            trade.pair
          ) +
          "&t=" +
          Date.now()
        );


      if (!response.ok) {

        throw new Error(
          "Worker HTTP Error: " +
          response.status
        );

      }


      const data =
        await response.json();


      if (data.status === "error") {

        throw new Error(
          data.message ||
          data.error ||
          "Market API error"
        );

      }


      if (
        !data.values ||
        data.values.length === 0
      ) {

        throw new Error(
          "No candle data received"
        );

      }


      const exitPrice =
        Number(
          data.values[0].close
        );


      if (!Number.isFinite(exitPrice)) {

        throw new Error(
          "Invalid exit price"
        );

      }


      let result;


      if (
        exitPrice >
        trade.entryPrice
      ) {

        result =
          trade.direction === "CALL ↑"
            ? "WIN"
            : "LOSS";

      } else if (
        exitPrice <
        trade.entryPrice
      ) {

        result =
          trade.direction === "PUT ↓"
            ? "WIN"
            : "LOSS";

      } else {

        result =
          "DRAW";

      }


      trade.result =
        result;


      trade.exitPrice =
        exitPrice;


      if (resultBox) {

        resultBox.classList.remove(
          "win-result",
          "loss-result",
          "draw-result"
        );


        if (result === "WIN") {

          resultBox.innerText =
            "✅ WIN • Exit: " +
            exitPrice.toFixed(5);

          resultBox.classList.add(
            "win-result"
          );

        } else if (result === "LOSS") {

          resultBox.innerText =
            "❌ LOSS • Exit: " +
            exitPrice.toFixed(5);

          resultBox.classList.add(
            "loss-result"
          );

        } else {

          resultBox.innerText =
            "➖ DRAW • Exit: " +
            exitPrice.toFixed(5);

          resultBox.classList.add(
            "draw-result"
          );

        }

      }


      if (countdownBox) {

        countdownBox.innerText =
          "✅ Result checked";

      }


      saveHistory();


      updateStats();


      return;


    } catch (error) {

      lastError =
        error.message ||
        "Result check failed";


      console.error(
        "Result attempt " +
        attempt +
        ":",
        error
      );


      if (attempt < 3) {

        if (resultBox) {

          resultBox.innerText =
            "🔄 Retrying... " +
            attempt +
            "/3";

        }


        await new Promise(
          function(resolve) {

            setTimeout(
              resolve,
              5000
            );

          }
        );

      }

    }

  }


  if (resultBox) {

    resultBox.innerText =
      "⚠️ " +
      lastError;

  }


  if (countdownBox) {

    countdownBox.innerText =
      "⚠️ Result check failed";

  }

}


// ==========================================
// UPDATE STATS
// ==========================================

function updateStats() {

  const completed =
    history.filter(
      function(item) {

        return (
          item.result === "WIN" ||
          item.result === "LOSS"
        );

      }
    );


  const wins =
    history.filter(
      function(item) {

        return item.result === "WIN";

      }
    ).length;


  const losses =
    history.filter(
      function(item) {

        return item.result === "LOSS";

      }
    ).length;


  totalSignalsBox.innerText =
    history.length;


  winsBox.innerText =
    wins;


  lossesBox.innerText =
    losses;


  if (completed.length > 0) {

    const rate =
      Math.round(
        (wins / completed.length) *
        100
      );


    winRateBox.innerText =
      rate +
      "%";

  } else {

    winRateBox.innerText =
      "0%";

  }


  saveHistory();

}


// ==========================================
// CLEAR HISTORY
// ==========================================

function clearHistory() {

  const confirmClear =
    confirm(
      "Are you sure you want to delete all signal history?"
    );


  if (!confirmClear) {

    return;

  }


  history = [];


  localStorage.removeItem(
    "malikSignalsHistory"
  );


  if (countdownTimer) {

    clearInterval(countdownTimer);

    countdownTimer = null;

  }


  historyList.innerHTML =
    "";


  const empty =
    document.createElement("p");


  empty.className =
    "empty-history";


  empty.innerText =
    "No signals yet.";


  historyList.appendChild(
    empty
  );


  if (countdownBox) {

    countdownBox.innerText =
      "⏳ Waiting for signal";

  }


  updateStats();

}


// ==========================================
// PAGE NAVIGATION
// ==========================================

function showPage(page) {

  if (page === "home") {

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }


  if (page === "signals") {

    window.scrollTo({
      top: 250,
      behavior: "smooth"
    });

  }


  if (page === "history") {

    const historySection =
      document.querySelector(
        ".history"
      );


    if (historySection) {

      historySection.scrollIntoView({
        behavior: "smooth"
      });

    }

  }


  if (page === "settings") {

    const settingsSection =
      document.querySelector(
        ".settings"
      );


    if (settingsSection) {

      settingsSection.scrollIntoView({
        behavior: "smooth"
      });

    }

  }

}


// ==========================================
// SETTINGS
// ==========================================

const notificationToggle =
  document.getElementById(
    "notificationToggle"
  );


const autoRefreshToggle =
  document.getElementById(
    "autoRefreshToggle"
  );


// Signal Notifications setting

if (notificationToggle) {

  notificationToggle.checked =
    localStorage.getItem(
      "malikNotifications"
    ) === "true";


  notificationToggle.addEventListener(
    "change",
    function() {

      localStorage.setItem(
        "malikNotifications",
        notificationToggle.checked
      );


      if (
        notificationToggle.checked &&
        "Notification" in window &&
        Notification.permission === "default"
      ) {

        Notification.requestPermission();

      }

    }
  );

}


// Auto Refresh stays OFF

if (autoRefreshToggle) {

  autoRefreshToggle.checked =
    false;


  autoRefreshToggle.addEventListener(
    "change",
    function() {

      autoRefreshToggle.checked =
        false;


      alert(
        "Auto Refresh is disabled. Signals are generated manually."
      );

    }
  );

}


// ==========================================
// SIGNAL NOTIFICATION
// ==========================================
function sendSignalNotification(
  pair,
  direction,
  confidence
) {
  const notificationsEnabled =
    localStorage.getItem(
      "malikNotifications"
    ) === "true";

  if (!notificationsEnabled) {
    return;
  }

  if (!("Notification" in window)) {
    return;
  }

  if (
    Notification.permission !==
    "granted"
  ) {
    return;
  }

  new Notification(
    "⚡ MALIK SIGNALS",
    {
      body:
        pair +
        " • " +
        direction +
        "\nConfidence: " +
        confidence +
        "%"
    }
  );
}
