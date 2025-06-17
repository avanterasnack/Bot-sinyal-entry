const axios = require("axios");

async function getSignalCrypto(coin = "bitcoin") {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=30&interval=daily`;
    const res = await axios.get(url);
    const prices = res.data.prices.map(p => p[1]);

    const ma = (arr, period) => {
      const slice = arr.slice(-period);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    };

    const ma5 = ma(prices, 5);
    const ma20 = ma(prices, 20);
    const latest = prices[prices.length - 1];

    const trend = ma5 > ma20 ? "📈 SINYAL BELI" : "📉 SINYAL JUAL";

    return `📊 *Analisa ${coin.toUpperCase()}*\n` +
           `Harga Terakhir: $${latest.toFixed(2)}\n` +
           `MA5: $${ma5.toFixed(2)}\n` +
           `MA20: $${ma20.toFixed(2)}\n\n` +
           `${trend}`;
  } catch (e) {
    console.log("ERR:", e.message);
    return "❌ Gagal mengambil sinyal. Coba lagi nanti.";
  }
}

module.exports = { getSignalCrypto };