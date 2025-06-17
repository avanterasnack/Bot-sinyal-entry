const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const express = require('express');
const functions = require('./functions');

const app = express();
const PORT = process.env.PORT || 3000;

const bot = new Telegraf("7290478038:AAEHC2yxqdWj-O-9DZUD7Pp5Vhvn3F7H9L8");
const OWNER_ID = "1478960880";

// /start
bot.start((ctx) => {
  const name = ctx.from.first_name;
  ctx.reply(`Halo ${name}! 👋\n\nSelamat datang di Sinyal Entry Bot 📈\n\nKetik /menu untuk lihat fitur.`);
});

// /menu
bot.command('menu', (ctx) => {
  const menu = `
📊 MENU UTAMA

/crypto - Info Crypto (Harga + Sinyal)
/saham - Info Saham (Harga + Sinyal)
/upgrade - Info Langganan Premium
/token - Cek Sisa Token
/myid - Lihat ID Kamu
  `;
  ctx.reply(menu);
});

// ========== CRYPTO ==========
bot.command('crypto', (ctx) => {
  return ctx.reply('Pilih menu crypto:', Markup.inlineKeyboard([
    [Markup.button.callback('📊 Cek Harga (Gratis)', 'crypto_harga')],
    [Markup.button.callback('💹 Sinyal Entry (Premium)', 'crypto_entry')],
  ]));
});

bot.action('crypto_harga', async (ctx) => {
  await ctx.answerCbQuery();
  const result = await functions.getCryptoSignal();
  ctx.reply(result);
});

const koinList = [
  'BTC', 'ETH', 'SOL', 'DOGE', 'PEPE', 'SHIB', 'XRP', 'ADA', 'DOT',
  'TON', 'BNB', 'LTC', 'TRX', 'OP', 'AVAX', 'ARB', 'UNI', 'XLM',
  'NEAR', 'BOB', 'KAS', 'ICP', 'RNDR', 'INJ'
];

bot.action('crypto_entry', async (ctx) => {
  await ctx.answerCbQuery();
  const buttons = koinList.map(koin =>
    Markup.button.callback(koin, `entry_${koin.toLowerCase()}`)
  );
  const rows = [];
  while (buttons.length) rows.push(buttons.splice(0, 3));
  ctx.reply('Pilih koin untuk sinyal entry:', Markup.inlineKeyboard(rows));
});

koinList.forEach(koin => {
  const kode = `entry_${koin.toLowerCase()}`;
  bot.action(kode, async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id.toString();

    if (!functions.isPremium(userId)) {
      return ctx.reply('❌ Fitur ini khusus Premium. Ketik /upgrade untuk info.');
    }

    const result = await functions.getEntrySignal(koin);
    functions.reduceToken(userId);
    ctx.reply(result);
  });
});

// ========== SAHAM ==========
bot.command('saham', (ctx) => {
  return ctx.reply('Pilih menu saham:', Markup.inlineKeyboard([
    [Markup.button.callback('📈 Cek Harga Saham (Gratis)', 'saham_harga')],
    [Markup.button.callback('💹 Entry Saham (Premium)', 'saham_entry')],
  ]));
});

bot.action('saham_harga', async (ctx) => {
  await ctx.answerCbQuery();
  const result = await functions.getStockPrice();
  ctx.reply(result);
});

const sahamList = ['BBRI', 'TLKM', 'ASII', 'BBCA', 'UNVR', 'MDKA', 'ANTM', 'ADRO'];

bot.action('saham_entry', async (ctx) => {
  await ctx.answerCbQuery();
  const buttons = sahamList.map(saham =>
    Markup.button.callback(saham, `entrysaham_${saham.toLowerCase()}`)
  );
  const rows = [];
  while (buttons.length) rows.push(buttons.splice(0, 3));
  ctx.reply('Pilih saham untuk sinyal entry:', Markup.inlineKeyboard(rows));
});

sahamList.forEach(saham => {
  const kode = `entrysaham_${saham.toLowerCase()}`;
  bot.action(kode, async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id.toString();

    if (!functions.isPremium(userId)) {
      return ctx.reply('❌ Fitur ini khusus Premium. Ketik /upgrade untuk info.');
    }

    // ✅ FIX: Ganti dari getEntrySaham → getEntrySahamSignal
    const result = functions.getEntrySahamSignal(saham);
    functions.reduceToken(userId);
    ctx.reply(result);
  });
});

// ========== FITUR TAMBAHAN ==========
bot.command('upgrade', (ctx) => {
  ctx.reply(`
💎 UPGRADE KE PREMIUM

🪙 10 Token = Rp10.000
🪙 30 Token = Rp25.000
🪙 100 Token = Rp75.000

Transfer ke:
🏦 BCA 2582797669 a.n Danu Pradipta

Kirim bukti ke:
👤 @Juragan_BotID

Gunakan /token untuk cek saldo kamu.
  `);
});

bot.command('token', (ctx) => {
  const token = functions.getToken(ctx.from.id);
  ctx.reply(`🎟️ Sisa token kamu: ${token}`);
});

bot.command('myid', (ctx) => {
  ctx.reply(`🆔 ID Telegram kamu: ${ctx.from.id}`);
});

bot.command('addtoken', (ctx) => {
  if (ctx.from.id.toString() !== OWNER_ID) {
    return ctx.reply('❌ Kamu bukan admin.');
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
    return ctx.reply('❌ Format salah.\nContoh: /addtoken 123456789 5');
  }

  const targetId = args[1];
  const jumlah = parseInt(args[2]);
  if (isNaN(jumlah) || jumlah <= 0) {
    return ctx.reply('❌ Jumlah token harus angka lebih dari 0.');
  }

  functions.addToken(targetId, jumlah);
  ctx.reply(`✅ Token berhasil ditambahkan ke ID ${targetId} sebanyak ${jumlah}`);
});

// ========== ADMIN KHUSUS OWNER ==========
bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  if (userId !== OWNER_ID) return;

  const text = ctx.message.text;

  if (text.startsWith('updateharga')) {
    const ok = functions.simpanHargaSaham(text);
    return ctx.reply(ok ? '✅ Harga saham berhasil disimpan.' : '❌ Format salah. Contoh:\nupdateharga BBRI 5100 TLKM 3950');
  }

  if (text.startsWith('entrysaham')) {
    const ok = functions.simpanEntrySaham(text);
    return ctx.reply(ok ? '✅ Entry saham berhasil disimpan.' : '❌ Format salah. Contoh:\nentrysaham BBRI BUY 5100 TP 5500 SL 4900');
  }
});

// ========== KEEP ALIVE REPLIT ==========
app.get("/", (req, res) => {
  res.send("✅ Bot Sinyal Entry Aktif 🚀");
});

setInterval(() => {
  const url = "https://1bbf2702-57a2-4e2d-bd23-7d84639fab92-00-2z44bd1nvahhg.sisko.replit.dev/";
  fetch(url)
    .then(() => console.log("📡 Ping ke Replit OK"))
    .catch(err => console.error("❌ Ping gagal:", err));
}, 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`🌐 Server aktif di port ${PORT}`);
});

bot.launch();
console.log("🤖 Bot Telegram aktif...");