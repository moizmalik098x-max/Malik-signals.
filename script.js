const API_KEY = "5850293cf62845a6b0e446719a74dd37";


// ===============================
// GENERATE SIGNAL
// ===============================
function generateSignal() {

  const pair = document.getElementById("pair").value;
  const expiry = document.getElementById("expiry").value;

  const signal = document.getElementById("signal");
  const confidence = document.getElementById("confidence");
  const history = document.getElementById("history");

  signal.textContent = "ANALYZING...";
  confidence.textContent = "Getting market data...";

  const url =
    "https://api.twelvedata.com/time_series" +
    "?symbol=" + encodeURIComponent(pair) +
    "&interval=1min" +
    "&outputsize=30" +
    "&apikey=" + API_KEY;

  fetch(url)
    .then(response => response.json())
    .then(data => {

      if (!data.values) {
        throw new Error(
          data.message || "Market data unavailable"
        );
      }

      const candles = [...data.values].reverse();

      const closes =
        candles.map(c => Number(c.close));

      if (closes.length < 21) {
        throw new Error("Not enough market data");
      }

      const price =
        closes[closes.length - 1];

      const ema9 =
        calculateEMA(closes, 9);

      const ema21 =
        calculateEMA(closes, 21);

      const rsi =
        calculateRSI(closes, 14);


      // ===============================
      // SIGNAL LOGIC
      // ===============================

      let result = "WAIT";
      let confidenceValue = 50;

      if (
        ema9 > ema21 &&
        rsi >= 50 &&
        rsi < 70
      ) {

        result = "CALL ↑";
        confidenceValue = 75;

      }

      else if (
        ema9 < ema21 &&
        rsi <= 50 &&
        rsi > 30
      ) {

        result = "PUT ↓";
        confidenceValue = 75;

      }

      else if (ema9 > ema21) {

        result = "CALL ↑";
        confidenceValue = 65;

      }

      else if (ema9 < ema21) {

        result = "PUT ↓";
        confidenceValue = 65;

      }


      // ===============================
      // DISPLAY SIGNAL
      // ===============================

      signal.textContent = result;
sendSignalNotification(
  result,
  pair,
  confidenceValue
);
      signal.className = "";


      if (result === "CALL ↑") {

        signal.classList.add(
          "call-signal"
        );

      }

      else if (result === "PUT ↓") {

        signal.classList.add(
          "put-signal"
        );

      }

      else {

        signal.classList.add(
          "wait-signal"
        );

      }


      confidence.textContent =
        "Pair: " + pair +
        " • Expiry: " + expiry +
        " • Price: " + price.toFixed(5) +
        " • EMA9: " + ema9.toFixed(5) +
        " • EMA21: " + ema21.toFixed(5) +
        " • RSI: " + rsi.toFixed(1) +
        " • Confidence: " +
        confidenceValue + "%";


      // ===============================
      // SAVE HISTORY
      // ===============================

      const time =
        new Date().toLocaleTimeString();

      const historyText =
        time +
        " | " +
        pair +
        " | " +
        result +
        " | " +
        confidenceValue +
        "%";


      const item =
        document.createElement("div");

      item.className =
        "history-item";


      item.innerHTML = `
        <span>${time}</span>
        <span>${pair}</span>
        <span>${result}</span>
        <span>${confidenceValue}%</span>
      `;


      history.prepend(item);

      saveHistory(historyText);


      // ===============================
      // CHECK RESULT AFTER EXPIRY
      // ===============================

      if (result !== "WAIT") {

        setTimeout(() => {

          checkSignalResult(
            pair,
            result,
            price
          );

        }, getExpiryMilliseconds(expiry));

      }

    })


    .catch(error => {

      signal.textContent =
        "DATA ERROR";

      confidence.textContent =
        error.message;

      console.log(error);

    });

}


// ===============================
// EMA
// ===============================
function calculateEMA(
  values,
  period
) {

  const multiplier =
    2 / (period + 1);

  let ema =
    values[0];


  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    ema =
      (values[i] - ema) *
      multiplier +
      ema;

  }


  return ema;

}


// ===============================
// RSI
// ===============================
function calculateRSI(
  values,
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
      values[i] -
      values[i - 1];


    if (change >= 0) {

      gains += change;

    }

    else {

      losses +=
        Math.abs(change);

    }

  }


  let avgGain =
    gains / period;

  let avgLoss =
    losses / period;


  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {

    const change =
      values[i] -
      values[i - 1];


    const gain =
      change > 0
        ? change
        : 0;


    const loss =
      change < 0
        ? Math.abs(change)
        : 0;


    avgGain =
      (
        avgGain * (period - 1) +
        gain
      ) / period;


    avgLoss =
      (
        avgLoss * (period - 1) +
        loss
      ) / period;

  }


  if (avgLoss === 0) {

    return 100;

  }


  const rs =
    avgGain / avgLoss;


  return (
    100 -
    (100 / (1 + rs))
  );

}


// ===============================
// NAVIGATION
// ===============================
function showPage(
  page,
  button
) {

  document
    .querySelectorAll(".nav-item")
    .forEach(item => {

      item.classList.remove(
        "active"
      );

    });


  button.classList.add(
    "active"
  );


  const settings =
    document.getElementById(
      "settings-panel"
    );


  if (settings) {

    settings.style.display =
      page === "settings"
        ? "block"
        : "none";

  }


  if (page === "home") {

    window.scrollTo({

      top: 0,

      behavior: "smooth"

    });

  }


  if (page === "signals") {

    document
      .getElementById("signal")
      .scrollIntoView({

        behavior: "smooth"

      });

  }


  if (page === "history") {

    document
      .getElementById("history")
      .scrollIntoView({

        behavior: "smooth"

      });

  }


  if (
    page === "settings" &&
    settings
  ) {

    settings.scrollIntoView({

      behavior: "smooth"

    });

  }

}


// ===============================
// EXPIRY TIME
// ===============================
function getExpiryMilliseconds(
  expiry
) {

  if (expiry === "1 Minute") {

    return 60 * 1000;

  }


  if (expiry === "2 Minutes") {

    return 2 * 60 * 1000;

  }


  if (expiry === "5 Minutes") {

    return 5 * 60 * 1000;

  }


  if (expiry === "15 Minutes") {

    return 15 * 60 * 1000;

  }


  return 60 * 1000;

}


// ===============================
// CHECK SIGNAL RESULT
// ===============================
function checkSignalResult(
  pair,
  signalResult,
  entryPrice
) {

  const url =
    "https://api.twelvedata.com/time_series" +
    "?symbol=" +
    encodeURIComponent(pair) +
    "&interval=1min" +
    "&outputsize=2" +
    "&apikey=" +
    API_KEY;


  fetch(url)

    .then(response =>
      response.json()
    )

    .then(data => {

      if (
        !data.values ||
        !data.values.length
      ) {

        console.log(
          "Unable to check result"
        );

        return;

      }


      const latestPrice =
        Number(
          data.values[0].close
        );


      let resultText =
        "DRAW";


      if (
        signalResult ===
        "CALL ↑"
      ) {

        if (
          latestPrice >
          entryPrice
        ) {

          resultText =
            "WIN";

        }

        else if (
          latestPrice <
          entryPrice
        ) {

          resultText =
            "LOSS";

        }

      }


      if (
        signalResult ===
        "PUT ↓"
      ) {

        if (
          latestPrice <
          entryPrice
        ) {

          resultText =
            "WIN";

        }

        else if (
          latestPrice >
          entryPrice
        ) {

          resultText =
            "LOSS";

        }

      }


      const history =
        document.getElementById(
          "history"
        );


      const resultItem =
        document.createElement(
          "div"
        );


      resultItem.className =
        "history-item";


      resultItem.innerHTML = `
        <span>${new Date().toLocaleTimeString()}</span>
        <span>${pair}</span>
        <span>${signalResult}</span>
        <span class="${
          resultText === "WIN"
            ? "result-win"
            : "result-loss"
        }">
          ${resultText}
        </span>
      `;


      history.prepend(
        resultItem
      );


      saveHistory(

        pair +
        " | " +
        signalResult +
        " | " +
        resultText +
        " | Entry: " +
        entryPrice.toFixed(5) +
        " | Exit: " +
        latestPrice.toFixed(5)

      );


      if (
        resultText === "WIN" ||
        resultText === "LOSS"
      ) {

        updateStats(
          resultText
        );

      }

    })

    .catch(error => {

      console.log(
        "Result check error:",
        error
      );

    });

}


// ===============================
// UPDATE STATS
// ===============================
function updateStats(
  resultText
) {

  let wins =
    Number(
      localStorage.getItem(
        "wins"
      )
    ) || 0;


  let losses =
    Number(
      localStorage.getItem(
        "losses"
      )
    ) || 0;


  if (
    resultText === "WIN"
  ) {

    wins++;

  }


  if (
    resultText === "LOSS"
  ) {

    losses++;

  }


  const total =
    wins + losses;


  localStorage.setItem(
    "totalSignals",
    total
  );


  localStorage.setItem(
    "wins",
    wins
  );


  localStorage.setItem(
    "losses",
    losses
  );


  updateStatsDisplay();

}


// ===============================
// DISPLAY STATS
// ===============================
function updateStatsDisplay() {

  const totalEl =
    document.getElementById(
      "totalSignals"
    );

  const winsEl =
    document.getElementById(
      "wins"
    );

  const lossesEl =
    document.getElementById(
      "losses"
    );

  const rateEl =
    document.getElementById(
      "winRate"
    );


  const total =
    Number(
      localStorage.getItem(
        "totalSignals"
      )
    ) || 0;


  const wins =
    Number(
      localStorage.getItem(
        "wins"
      )
    ) || 0;


  const losses =
    Number(
      localStorage.getItem(
        "losses"
      )
    ) || 0;


  const completed =
    wins + losses;


  const winRate =
    completed > 0
      ? Math.round(
          (wins / completed) * 100
        )
      : 0;


  if (totalEl) {

    totalEl.textContent =
      total;

  }


  if (winsEl) {

    winsEl.textContent =
      wins;

  }


  if (lossesEl) {

    lossesEl.textContent =
      losses;

  }


  if (rateEl) {

    rateEl.textContent =
      winRate + "%";

  }

}


// ===============================
// SAVE HISTORY
// ===============================
function saveHistory(text) {

  let historyData =
    JSON.parse(
      localStorage.getItem(
        "signalHistory"
      )
    ) || [];


  historyData.unshift(
    text
  );


  historyData =
    historyData.slice(
      0,
      50
    );


  localStorage.setItem(

    "signalHistory",

    JSON.stringify(
      historyData
    )

  );

}


// ===============================
// LOAD HISTORY
// ===============================
function loadHistory() {

  const history =
    document.getElementById(
      "history"
    );


  if (!history) return;


  history.innerHTML =
    "";


  const historyData =
    JSON.parse(
      localStorage.getItem(
        "signalHistory"
      )
    ) || [];


  historyData.forEach(
    text => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "history-item";


      item.textContent =
        text;


      history.appendChild(
        item
      );

    }
  );

}


// ===============================
// DEFAULT PAIR
// ===============================
document.addEventListener(
  "DOMContentLoaded",
  function () {

    updateStatsDisplay();

    loadHistory();


    const pairSelect =
      document.getElementById(
        "pair"
      );


    const settingsPair =
      document.getElementById(
        "settingsPair"
      );


    if (
      pairSelect &&
      settingsPair
    ) {

      const savedPair =
        localStorage.getItem(
          "defaultPair"
        ) || "EUR/USD";


      pairSelect.value =
        savedPair;


      settingsPair.value =
        savedPair;


      settingsPair.addEventListener(
        "change",
        function () {

          localStorage.setItem(
            "defaultPair",
            this.value
          );


          pairSelect.value =
            this.value;

        }
      );

    }

  }
);// ===============================
// SIGNAL NOTIFICATIONS
// ===============================
function sendSignalNotification(signal, pair, confidence) {

  const notificationToggle =
    document.getElementById("signalNotifications");

  if (!notificationToggle || !notificationToggle.checked) {
    return;
  }

  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {

    new Notification("⚡ Malik Signals", {
      body:
        pair +
        " → " +
        signal +
        "\nConfidence: " +
        confidence +
        "%"
    });

  }
}


// Request notification permission
document.addEventListener("DOMContentLoaded", function () {

  const notificationToggle =
    document.getElementById("signalNotifications");

  if (notificationToggle) {

    notificationToggle.addEventListener("change", function () {

      if (
        this.checked &&
        "Notification" in window &&
        Notification.permission === "default"
      ) {

        Notification.requestPermission();

      }

    });

  }

});