const fs = require('fs');
const axios = require('axios');

// 🗂️ Path file database
const dbPath = './database.json';
const stockPath = './stock_price.json';
const entryPath = './entry_saham.json';

// 🧠 Load database
function loadDB() {
  try { return JSON.parse(fs.readFileSync(dbPath)); } catch { return {}; }
}
function saveDB(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

// Token system
function getToken(userId) {
  const db = loadDB();
  const id = userId.toString();
  return db[id]?.token || 0;
}
function addToken(userId, jumlah) {
  const db = loadDB();
  const id = userId.toString();
  if (!db[id]) db[id] = { token: 0 };
  db[id].token += jumlah;
  saveDB(db);
}
function reduceToken(userId, amount = 1) {
  const db = loadDB();
  const id = userId.toString();
  if (!db[id]) db[id] = { token: 0 };
  db[id].token = Math.max(0, db[id].token - amount);
  saveDB(db);
}
function isPremium(userId) {
  return getToken(userId) > 0;
}

// 📈 Harga + status crypto
async function getCryptoSignal() {
  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false });
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,dogecoin,pepe,shiba-inu,ripple,cardano,polkadot,binancecoin,litecoin,tron,optimism,avalanche-2,the-open-network,arbitrum,uniswap,stellar,near,bob,kaspa,internet-computer,render-token,injective-protocol&vs_currencies=idr,usd');
    const data = response.data;

    const getSignal = () => {
      const rand = Math.random();
      if (rand < 0.45) return '🟢 BUY';
      if (rand < 0.85) return '⏳ HOLD';
      return '🔻 SELL';
    };

    const formatCoin = (id, label) => {
      const price = data[id];
      if (!price || !price.idr || !price.usd) return `⚠️ ${label}: Data gagal`;
      return `🪙 ${label} → Rp${price.idr.toLocaleString('id-ID')} / $${price.usd} [${getSignal()}]`;
    };

    return `
📈 Sinyal Crypto Hari Ini:

${formatCoin('bitcoin', 'BTC')}
${formatCoin('ethereum', 'ETH')}
${formatCoin('solana', 'SOL')}
${formatCoin('dogecoin', 'DOGE')}
${formatCoin('pepe', 'PEPE')}
${formatCoin('shiba-inu', 'SHIB')}
${formatCoin('ripple', 'XRP')}
${formatCoin('cardano', 'ADA')}
${formatCoin('polkadot', 'DOT')}
${formatCoin('the-open-network', 'TON')}
${formatCoin('binancecoin', 'BNB')}
${formatCoin('litecoin', 'LTC')}
${formatCoin('tron', 'TRX')}
${formatCoin('optimism', 'OP')}
${formatCoin('avalanche-2', 'AVAX')}
${formatCoin('arbitrum', 'ARB')}
${formatCoin('uniswap', 'UNI')}
${formatCoin('stellar', 'XLM')}
${formatCoin('near', 'NEAR')}
${formatCoin('bob', 'BOB')}
${formatCoin('kaspa', 'KAS')}
${formatCoin('internet-computer', 'ICP')}
${formatCoin('render-token', 'RNDR')}
${formatCoin('injective-protocol', 'INJ')}

⏱️ Update: ${now}`;
  } catch (err) {
    return '⚠️ Gagal mengambil data harga crypto.';
  }
}

// 📊 Harga Saham Harian (dari file)
function getStockPrice() {
  try {
    const data = JSON.parse(fs.readFileSync(stockPath));
    const list = ['BBRI', 'TLKM', 'ASII', 'BBCA', 'UNVR'];
    const result = Object.entries(data)
    .filter(([key]) => key !== 'update')
    .map(([kode, harga]) => `📈 ${kode}: Rp${harga.toLocaleString('id-ID')}`);
    
    return `📊 Harga Saham Hari Ini:\n\n${result.join('\n')}\n\n⏱️ Update: ${data.update || '-'}`;
  } catch {
    return '⚠️ Gagal memuat data harga saham.';
  }
}

// 📩 Sinyal Entry Saham
function getEntrySahamSignal(kode) {
  try {
    const data = JSON.parse(fs.readFileSync(entryPath));
    const entry = data[kode.toUpperCase()];
    if (!entry) return `⚠️ Sinyal untuk ${kode.toUpperCase()} belum tersedia`;

    if (entry.status === 'HOLD') {
      return `📊 ${kode.toUpperCase()}: ⏳ HOLD\n📌 Tidak ada sinyal entry hari ini.`;
    }

    return `
📊 Sinyal Entry ${kode.toUpperCase()}:
📥 BUY: Rp${entry.harga}
🎯 TP: Rp${entry.tp}
🛡️ SL: Rp${entry.sl}
⏱️ Status: ${entry.status}`;
  } catch {
    return '⚠️ Gagal mengambil sinyal entry.';
  }
}

// ✍️ Simpan harga saham dari pesan admin
function simpanHargaSaham(input) {
  const parts = input.trim().split(/\s+/);
  if (parts[0] !== 'updateharga') return false;

  const obj = {};
  for (let i = 1; i < parts.length; i += 2) {
    const kode = parts[i]?.toUpperCase();
    const harga = parseInt(parts[i + 1]);
    if (kode && !isNaN(harga)) {
      obj[kode] = harga;
    }
  }

  obj.update = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  fs.writeFileSync(stockPath, JSON.stringify(obj, null, 2));
  return true;
}

// ✍️ Simpan entry saham dari pesan admin
function simpanEntrySaham(input) {
  const lines = input.trim().split('\n').filter(l => l.startsWith('entrysaham'));
  const db = fs.existsSync(entryPath) ? JSON.parse(fs.readFileSync(entryPath)) : {};

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const kode = parts[1]?.toUpperCase();
    const status = parts[2]?.toUpperCase();

    if (kode && status === 'HOLD') {
      db[kode] = { status };
    } else if (kode && status === 'BUY') {
      const harga = parseInt(parts[3]);
      const tp = parseInt(parts[5]);
      const sl = parseInt(parts[7]);
      db[kode] = { status, harga, tp, sl };
    }
  }

  fs.writeFileSync(entryPath, JSON.stringify(db, null, 2));
  return true;
}

// ✅ Dummy getEntrySignal untuk crypto (biar gak error)
async function getEntrySignal(koin) {
  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  return `
📊 Sinyal Entry untuk ${koin.toUpperCase()}:

📥 BUY: $63,500
📤 SELL: $64,200
🎯 Take Profit: $66,000
🛡️ Stop Loss: $61,800

⏱️ Update: ${now}
  `;
}

// 📊 Dummy getStockSignal (biar gak error)
function getStockSignal() {
  return '📊 Fitur sinyal saham manual. Ketik langsung di admin.';
}

// 🧠 Export semua fungsi
module.exports = {
  loadDB,
  saveDB,
  getToken,
  addToken,
  reduceToken,
  isPremium,
  getCryptoSignal,
  getEntrySignal,      // ✅ fix error ini
  getStockSignal,      // meskipun belum dipakai, biar kompatibel
  getStockPrice,
  getEntrySahamSignal,
  simpanHargaSaham,
  simpanEntrySaham,
};