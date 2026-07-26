"use strict";

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const TURN_MS = 10_000;
const MAX_DISHES_PER_PLAYER = 5;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: false } });

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/health", (_req, res) => res.json({ ok: true }));

const AUCTION_ITEMS = [
  { name: "Pizza", emoji: "🍕", category: "main" },
  { name: "Sushi", emoji: "🍣", category: "main" },
  { name: "Burger", emoji: "🍔", category: "main" },
  { name: "Tacos", emoji: "🌮", category: "main" },
  { name: "Ramen", emoji: "🍜", category: "main" },
  { name: "Stek", emoji: "🥩", category: "main" },
  { name: "Pierogi", emoji: "🥟", category: "main" },
  { name: "Kebab", emoji: "🥙", category: "main" },
  { name: "Spaghetti", emoji: "🍝", category: "main" },
  { name: "Kurczak", emoji: "🍗", category: "main" },
  { name: "Curry", emoji: "🍛", category: "main" },
  { name: "Zupa", emoji: "🥣", category: "main" },
  { name: "Risotto", emoji: "🍚", category: "main" },
  { name: "Lasagne", emoji: "🧀", category: "main" },
  { name: "Burrito", emoji: "🌯", category: "main" },
  { name: "Paella", emoji: "🥘", category: "main" },
  { name: "Kotlety", emoji: "🍖", category: "main" },
  { name: "Omlet", emoji: "🍳", category: "main" },
  { name: "Ryba", emoji: "🐟", category: "main" },
  { name: "Gulasz", emoji: "🍲", category: "main" },

  { name: "Lody", emoji: "🍨", category: "dessert" },
  { name: "Pączki", emoji: "🍩", category: "dessert" },
  { name: "Naleśniki", emoji: "🥞", category: "dessert" },
  { name: "Ciasto", emoji: "🍰", category: "dessert" },
  { name: "Czekolada", emoji: "🍫", category: "dessert" },
  { name: "Ciasteczka", emoji: "🍪", category: "dessert" },
  { name: "Muffinka", emoji: "🧁", category: "dessert" },
  { name: "Pudding", emoji: "🍮", category: "dessert" },
  { name: "Tort", emoji: "🎂", category: "dessert" },
  { name: "Sernik", emoji: "🍰", category: "dessert" },
  { name: "Szarlotka", emoji: "🥧", category: "dessert" },
  { name: "Makaroniki", emoji: "🍬", category: "dessert" },
  { name: "Beza", emoji: "☁️", category: "dessert" },
  { name: "Tiramisu", emoji: "☕", category: "dessert" },
  { name: "Brownie", emoji: "🟫", category: "dessert" },
  { name: "Gofry", emoji: "🧇", category: "dessert" },
  { name: "Galaretka", emoji: "🍮", category: "dessert" },
  { name: "Sorbet", emoji: "🍧", category: "dessert" },
  { name: "Karmelki", emoji: "🍬", category: "dessert" },
  { name: "Donut z polewą", emoji: "🍩", category: "dessert" },

  { name: "Kawa", emoji: "☕", category: "drink" },
  { name: "Herbata", emoji: "🍵", category: "drink" },
  { name: "Sok", emoji: "🧃", category: "drink" },
  { name: "Lemoniada", emoji: "🍋", category: "drink" },
  { name: "Koktajl", emoji: "🥤", category: "drink" },
  { name: "Woda kokosowa", emoji: "🥥", category: "drink" },
  { name: "Kakao", emoji: "☕", category: "drink" },
  { name: "Cola", emoji: "🥤", category: "drink" },
  { name: "Smoothie", emoji: "🍓", category: "drink" },
  { name: "Mleko", emoji: "🥛", category: "drink" },
  { name: "Bubble tea", emoji: "🧋", category: "drink" },
  { name: "Espresso", emoji: "☕", category: "drink" },
  { name: "Cappuccino", emoji: "☕", category: "drink" },
  { name: "Latte", emoji: "☕", category: "drink" },
  { name: "Mrożona herbata", emoji: "🧊", category: "drink" },
  { name: "Napój energetyczny", emoji: "⚡", category: "drink" },
  { name: "Woda gazowana", emoji: "💧", category: "drink" },
  { name: "Kompot", emoji: "🍎", category: "drink" },
  { name: "Napój imbirowy", emoji: "🫚", category: "drink" },
  { name: "Shake waniliowy", emoji: "🥤", category: "drink" },

  { name: "Frytki", emoji: "🍟", category: "snack" },
  { name: "Hot dog", emoji: "🌭", category: "snack" },
  { name: "Popcorn", emoji: "🍿", category: "snack" },
  { name: "Precel", emoji: "🥨", category: "snack" },
  { name: "Orzeszki", emoji: "🥜", category: "snack" },
  { name: "Kanapka", emoji: "🥪", category: "snack" },
  { name: "Nachosy", emoji: "🧀", category: "snack" },
  { name: "Krakersy", emoji: "🍘", category: "snack" },
  { name: "Chipsy", emoji: "🥔", category: "snack" },
  { name: "Paluszki", emoji: "🥖", category: "snack" },
  { name: "Mini pizza", emoji: "🍕", category: "snack" },
  { name: "Skrzydełka", emoji: "🍗", category: "snack" },
  { name: "Mozzarella sticks", emoji: "🧀", category: "snack" },
  { name: "Onion rings", emoji: "🧅", category: "snack" },
  { name: "Mini tacos", emoji: "🌮", category: "snack" },
  { name: "Wrap", emoji: "🌯", category: "snack" },
  { name: "Koreczki", emoji: "🫒", category: "snack" },
  { name: "Bruschetta", emoji: "🍅", category: "snack" },
  { name: "Samosa", emoji: "🥟", category: "snack" },
  { name: "Spring rolls", emoji: "🥢", category: "snack" }
];

const rooms = new Map();

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function cleanName(value, fallback) {
  const name = String(value || "").trim().replace(/\s+/g, " ").slice(0, 18);
  return name || fallback;
}

function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function categoryPool(category) {
  return category === "mixed"
    ? AUCTION_ITEMS
    : AUCTION_ITEMS.filter(item => item.category === category);
}

function makeItems(rounds, category = "mixed") {
  const pool = shuffled(categoryPool(category));

  if (pool.length < rounds) {
    throw new Error(`Za mało unikalnych produktów w kategorii ${category}.`);
  }

  return pool.slice(0, rounds).map(item => ({
    name: item.name,
    emoji: item.emoji,
    category: item.category,
    value: 5
  }));
}

function randomBotQuiz(room) {
  const names = shuffled(categoryPool(room.category).map(item => item.name));
  return { favorites: names.slice(0, 3), dislikes: names.slice(3, 6) };
}

function applyQuizScores(room) {
  for (const item of room.items) {
    let score = 5;
    for (const player of room.players) {
      if (!player?.quiz) continue;
      if (player.quiz.favorites.includes(item.name)) score += 2;
      if (player.quiz.dislikes.includes(item.name)) score -= 1;
    }
    item.value = Math.max(1, Math.min(10, score));
  }
}

function humanPlayers(room) {
  return room.players.filter(player => player && !player.isBot);
}

function connectedHumanCount(room) {
  return humanPlayers(room).filter(player => player.socketId).length;
}

function publicState(room, viewerIndex = null) {
  const ended = room.status === "finished";
  const viewer = Number.isInteger(viewerIndex) ? room.players[viewerIndex] : null;

  return {
    code: room.code,
    status: room.status,
    mode: room.mode,
    category: room.category,
    maxPlayers: room.maxPlayers,
    maxDishesPerPlayer: MAX_DISHES_PER_PLAYER,
    hostIndex: room.hostIndex,
    viewerIndex,
    isHost: viewerIndex === room.hostIndex,
    round: room.round,
    roundCount: room.items.length,
    currentItem: room.items[room.round]
      ? { name: room.items[room.round].name, emoji: room.items[room.round].emoji }
      : null,
    currentBid: room.currentBid,
    leader: room.leader,
    turn: room.turn,
    passed: room.passed,
    message: room.message,
    turnEndsAt: room.turnEndsAt,
    quizFoods: categoryPool(room.category).map(({ name, emoji }) => ({ name, emoji })),
    players: room.players.map((player, index) => ({
      name: player.name,
      budget: index === viewerIndex ? player.budget : null,
      connected: player.isBot || Boolean(player.socketId),
      isBot: player.isBot,
      items: player.items.map(item => ({
        name: item.name,
        emoji: item.emoji,
        price: item.price,
        ...(ended ? { value: item.value } : {})
      })),
      score: ended ? player.items.reduce((sum, item) => sum + item.value, 0) : null,
      quizSubmitted: Boolean(player.quiz),
      rematchReady: Boolean(player.rematchReady),
      isYou: index === viewerIndex
    })),
    canStart: room.status === "waiting" &&
      viewerIndex === room.hostIndex &&
      room.players.length >= 2
  };
}

function emitState(room) {
  room.updatedAt = Date.now();
  room.players.forEach((player, index) => {
    if (player?.socketId) io.to(player.socketId).emit("state", publicState(room, index));
  });
}

function sendError(socket, message) {
  socket.emit("game-error", { message });
}

function clearTurnTimer(room) {
  if (room.turnTimer) clearTimeout(room.turnTimer);
  room.turnTimer = null;
  room.turnEndsAt = null;
}

function roomForSocket(socket) {
  const room = rooms.get(socket.data.roomCode);
  const index = socket.data.playerIndex;
  if (!room || !Number.isInteger(index)) return null;
  if (room.players[index]?.token !== socket.data.playerToken) return null;
  return { room, index };
}

function attachPlayer(socket, room, index) {
  const player = room.players[index];
  if (player.socketId && player.socketId !== socket.id) {
    io.to(player.socketId).emit("session-replaced");
    io.sockets.sockets.get(player.socketId)?.disconnect(true);
  }
  player.socketId = socket.id;
  socket.data.roomCode = room.code;
  socket.data.playerIndex = index;
  socket.data.playerToken = player.token;
  socket.join(room.code);
}



function hasFreeDishSlot(player) {
  return player.items.length < MAX_DISHES_PER_PLAYER;
}

function playersWithFreeSlots(room) {
  return room.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) =>
      hasFreeDishSlot(player) &&
      player.budget > 0 &&
      (player.isBot || player.socketId)
    );
}

function assignRemainingDishesIfOnlyOneHasSlots(room) {
  const available = playersWithFreeSlots(room);
  if (available.length !== 1) return false;

  const { player, index } = available[0];
  const needed = MAX_DISHES_PER_PLAYER - player.items.length;
  if (needed <= 0) return false;

  const remaining = room.items.slice(room.round, room.round + needed);
  remaining.forEach(item => {
    player.items.push({ ...item, price: 0 });
  });

  room.round += remaining.length;
  finishGame(
    room,
    `${player.name} jako jedyny aktywny gracz miał wolne miejsca i otrzymał ${remaining.length} darmowych dań do kompletu 5.`
  );
  return true;
}

function playersWithMoney(room) {
  return room.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.budget > 0);
}

function shouldFinishForBankruptcy(room) {
  return playersWithMoney(room).length <= 1;
}

function finishGame(room, message = "Koniec gry — poznajemy Największego Obżartucha!") {
  clearTurnTimer(room);
  room.status = "finished";
  room.currentBid = 0;
  room.leader = null;
  room.turnEndsAt = null;
  room.message = message;
  emitState(room);
}

function markBankruptPlayersPassed(room) {
  room.players.forEach((player, index) => {
    if (player.budget <= 0) room.passed[index] = true;
  });
}

function nextActiveIndex(room, afterIndex, excludeLeader = true) {
  const count = room.players.length;
  for (let step = 1; step <= count; step++) {
    const index = (afterIndex + step) % count;
    if (room.passed[index]) continue;
    if (room.players[index].budget <= 0) continue;
    if (!hasFreeDishSlot(room.players[index])) continue;
    if (!room.players[index].isBot && !room.players[index].socketId) continue;
    if (excludeLeader && index === room.leader) continue;
    return index;
  }
  return null;
}

function autoPassUnablePlayers(room) {
  room.players.forEach((player, index) => {
    if (player.budget <= 0 || !hasFreeDishSlot(player)) {
      room.passed[index] = true;
      return;
    }
    if (!player.isBot && !player.socketId) {
      room.passed[index] = true;
      return;
    }
    if (room.leader !== null && index !== room.leader && player.budget <= room.currentBid) {
      room.passed[index] = true;
    }
  });
}

function setTurn(room, index) {
  clearTurnTimer(room);
  room.turn = index;
  room.turnEndsAt = Date.now() + TURN_MS;
  emitState(room);

  room.turnTimer = setTimeout(() => {
    if (rooms.get(room.code) !== room || room.status !== "playing" || room.turn !== index) return;
    handlePass(room, index, true);
  }, TURN_MS + 50);

  if (room.players[index].isBot) {
    setTimeout(() => botMove(room, index), 650 + Math.floor(Math.random() * 850));
  }
}

function advanceAuction(room, afterIndex) {
  autoPassUnablePlayers(room);

  const activeChallengers = room.players
    .map((_player, index) => index)
    .filter(index => !room.passed[index] && index !== room.leader);

  if (room.leader !== null && activeChallengers.length === 0) {
    resolveAuction(room);
    return;
  }

  if (room.leader === null && room.passed.every(Boolean)) {
    resolveAuction(room);
    return;
  }

  const next = nextActiveIndex(room, afterIndex, room.leader !== null);
  if (next === null) {
    resolveAuction(room);
    return;
  }

  room.message = `${room.players[next].name} ma 10 sekund na ruch.`;
  setTurn(room, next);
}

function handleBid(room, index, amount) {
  if (room.status !== "playing" || room.turn !== index || room.passed[index]) return false;
  const player = room.players[index];

  if (!Number.isInteger(amount)) return false;
  if (amount <= room.currentBid || amount > player.budget) return false;

  clearTurnTimer(room);
  room.currentBid = amount;
  room.leader = index;
  room.message = `${player.name} licytuje ${amount} monet.`;
  advanceAuction(room, index);
  return true;
}

function handlePass(room, index, timedOut = false) {
  if (room.status !== "playing" || room.turn !== index || room.passed[index]) return;
  clearTurnTimer(room);
  room.passed[index] = true;
  room.message = timedOut
    ? `${room.players[index].name} nie zdążył i automatycznie pasuje.`
    : `${room.players[index].name} pasuje.`;
  advanceAuction(room, index);
}

function botMove(room, index) {
  if (rooms.get(room.code) !== room || room.status !== "playing" || room.turn !== index) return;
  const bot = room.players[index];
  const item = room.items[room.round];
  const minBid = room.currentBid + 1;

  if (bot.budget < minBid) {
    handlePass(room, index);
    return;
  }

  const likes = bot.quiz?.favorites.includes(item.name);
  const dislikes = bot.quiz?.dislikes.includes(item.name);
  const appetite = likes ? 1.15 : dislikes ? 0.55 : 0.82;
  const target = Math.max(1, Math.floor((item.value / 10) * bot.initialBudget * appetite * 0.45));
  const shouldBid = minBid <= target && Math.random() > (likes ? 0.08 : dislikes ? 0.48 : 0.25);

  if (!shouldBid) {
    handlePass(room, index);
    return;
  }

  const increment = 1 + Math.floor(Math.random() * Math.max(1, Math.min(5, target - minBid + 1)));
  handleBid(room, index, Math.min(bot.budget, minBid + increment - 1));
}

function startGame(room, isRematch = false) {
  clearTurnTimer(room);
  room.players.forEach(player => {
    player.rematchReady = false;
    if (player.isBot && !player.quiz) player.quiz = randomBotQuiz(room);
  });

  if (!isRematch) applyQuizScores(room);
  room.status = "playing";
  room.round = 0;
  room.currentBid = 0;
  room.leader = null;
  room.passed = room.players.map(() => false);
  markBankruptPlayersPassed(room);
  const starting = nextActiveIndex(room, room.players.length - 1, false);

  if (starting === null || shouldFinishForBankruptcy(room)) {
    finishGame(room, "Gra zakończona — tylko jeden gracz ma jeszcze monety.");
    return;
  }

  if (assignRemainingDishesIfOnlyOneHasSlots(room)) return;

  room.message = `${room.players[starting].name} rozpoczyna licytację.`;
  setTurn(room, starting);
}

function beginNextRound(room) {
  if (assignRemainingDishesIfOnlyOneHasSlots(room)) return;

  if (shouldFinishForBankruptcy(room)) {
    finishGame(room, "Gra zakończona — tylko jeden gracz ma jeszcze monety.");
    return;
  }

  room.round += 1;
  if (room.round >= room.items.length) {
    finishGame(room);
    return;
  }

  if (assignRemainingDishesIfOnlyOneHasSlots(room)) return;

  room.currentBid = 0;
  room.leader = null;
  room.passed = room.players.map(() => false);
  markBankruptPlayersPassed(room);

  const preferredStart = room.round % room.players.length;
  const starting = room.players[preferredStart].budget > 0 &&
    hasFreeDishSlot(room.players[preferredStart]) &&
    (room.players[preferredStart].isBot || room.players[preferredStart].socketId)
    ? preferredStart
    : nextActiveIndex(room, preferredStart, false);

  if (starting === null) {
    finishGame(room, "Gra zakończona — nikt nie ma monet na dalszą licytację.");
    return;
  }

  room.message = `${room.players[starting].name} rozpoczyna kolejną licytację.`;
  setTurn(room, starting);
}

function resolveAuction(room) {
  clearTurnTimer(room);
  if (room.leader === null) {
    room.message = "Wszyscy spasowali. Potrawa przepada.";
  } else {
    const winner = room.players[room.leader];
    const item = room.items[room.round];

    if (!hasFreeDishSlot(winner)) {
      room.message = `${winner.name} ma już komplet 5 dań. Potrawa przepada.`;
      emitState(room);
      setTimeout(() => {
        if (rooms.get(room.code) === room && room.status === "playing") beginNextRound(room);
      }, 1000);
      return;
    }

    winner.budget -= room.currentBid;
    winner.items.push({ ...item, price: room.currentBid });
    room.message = `${item.emoji} ${item.name} trafia do ${winner.name} za ${room.currentBid} monet.`;
  }

  emitState(room);

  setTimeout(() => {
    if (rooms.get(room.code) !== room || room.status !== "playing") return;

    if (assignRemainingDishesIfOnlyOneHasSlots(room)) return;

    if (shouldFinishForBankruptcy(room)) {
      finishGame(room, "Gra zakończona — tylko jeden gracz ma jeszcze monety.");
      return;
    }

    beginNextRound(room);
  }, 1300);
}

function resetForRematch(room) {
  room.roundCount = room.players.length * MAX_DISHES_PER_PLAYER;
  room.items = makeItems(room.roundCount, room.category);
  room.players.forEach(player => {
    player.budget = player.initialBudget;
    player.items = [];
    player.rematchReady = false;
  });
  applyQuizScores(room);
  startGame(room, true);
}

io.on("connection", socket => {
  socket.on("create-room", (payload = {}) => {
    const budget = Math.max(20, Math.min(1000, Math.floor(Number(payload.budget) || 100)));
    const mode = payload.mode === "bot" ? "bot" : "online";
    const allowedCategories = new Set(["mixed", "main", "dessert", "drink", "snack"]);
    const category = allowedCategories.has(payload.category) ? payload.category : "mixed";
    const maxPlayers = Math.max(2, Math.min(4, Math.floor(Number(payload.maxPlayers) || 2)));
    const botCount = mode === "bot"
      ? Math.max(1, Math.min(3, Math.floor(Number(payload.botCount) || 1)))
      : 0;

    const code = randomCode();
    const hostToken = makeToken();
    const host = {
      name: cleanName(payload.name, "Gracz 1"),
      budget,
      initialBudget: budget,
      items: [],
      quiz: null,
      rematchReady: false,
      isBot: false,
      token: hostToken,
      socketId: null
    };

    const players = [host];
    for (let i = 0; i < botCount; i++) {
      players.push({
        name: `Komputer ${i + 1}`,
        budget,
        initialBudget: budget,
        items: [],
        quiz: null,
        rematchReady: true,
        isBot: true,
        token: null,
        socketId: null
      });
    }

    const room = {
      code,
      mode,
      category,
      maxPlayers: mode === "bot" ? players.length : maxPlayers,
      hostIndex: 0,
      status: mode === "bot" ? "quiz" : "waiting",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      roundCount: players.length * MAX_DISHES_PER_PLAYER,
      items: makeItems(players.length * MAX_DISHES_PER_PLAYER, category),
      players,
      round: 0,
      turn: 0,
      currentBid: 0,
      leader: null,
      passed: players.map(() => false),
      message: mode === "bot"
        ? "Wypełnij quiz smaków, aby rozpocząć grę z komputerem."
        : "Pokój gotowy. Zaproś od 1 do 3 dodatkowych graczy.",
      turnTimer: null,
      turnEndsAt: null
    };

    rooms.set(code, room);
    attachPlayer(socket, room, 0);
    socket.emit("room-created", { code, playerToken: hostToken, playerIndex: 0 });
    emitState(room);
  });

  socket.on("join-room", (payload = {}) => {
    const code = String(payload.code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return sendError(socket, "Nie znaleziono pokoju o takim kodzie.");
    if (room.mode !== "online") return sendError(socket, "To jest pokój gry z komputerem.");

    if (room.status === "finished") {
      room.players = room.players.filter(player => player.isBot || player.socketId);
      room.passed = room.players.map(() => false);
      room.hostIndex = 0;
      room.status = "waiting";
      room.message = "Pokój jest ponownie otwarty. Czekamy na graczy.";
    }

    if (room.status !== "waiting") return sendError(socket, "Ta gra już się rozpoczęła.");
    if (room.players.length >= room.maxPlayers) return sendError(socket, "Pokój jest już pełny.");

    const playerToken = makeToken();
    const index = room.players.length;
    room.players.push({
      name: cleanName(payload.name, `Gracz ${index + 1}`),
      budget: room.players[0].initialBudget,
      initialBudget: room.players[0].initialBudget,
      items: [],
      quiz: null,
      rematchReady: false,
      isBot: false,
      token: playerToken,
      socketId: null
    });
    room.passed.push(false);

    attachPlayer(socket, room, index);
    socket.emit("room-joined", { code, playerToken, playerIndex: index });
    room.message = `${room.players[index].name} dołączył. Graczy: ${room.players.length}/${room.maxPlayers}.`;
    emitState(room);
  });

  socket.on("start-room", () => {
    const found = roomForSocket(socket);
    if (!found) return;
    const { room, index } = found;
    if (index !== room.hostIndex) return sendError(socket, "Tylko gospodarz może rozpocząć grę.");
    if (room.status !== "waiting") return;
    if (room.players.length < 2) return sendError(socket, "Potrzeba co najmniej 2 graczy.");

    room.roundCount = room.players.length * MAX_DISHES_PER_PLAYER;
    room.roundCount = room.players.length * MAX_DISHES_PER_PLAYER;
  room.items = makeItems(room.roundCount, room.category);
    room.status = "quiz";
    room.message = `Wszyscy gracze wypełniają quiz smaków. W tej grze będzie ${room.roundCount} dań.`;
    emitState(room);
  });

  socket.on("submit-quiz", (payload = {}) => {
    const found = roomForSocket(socket);
    if (!found) return;
    const { room, index } = found;
    if (room.status !== "quiz") return sendError(socket, "Quiz nie jest teraz aktywny.");

    const valid = new Set(categoryPool(room.category).map(item => item.name));
    const favorites = Array.isArray(payload.favorites)
      ? [...new Set(payload.favorites.filter(name => valid.has(name)))].slice(0, 3)
      : [];
    const dislikes = Array.isArray(payload.dislikes)
      ? [...new Set(payload.dislikes.filter(name => valid.has(name)))].slice(0, 3)
      : [];

    if (favorites.length !== 3 || dislikes.length !== 3) {
      return sendError(socket, "Wybierz dokładnie 3 ulubione i 3 najmniej lubiane dania.");
    }
    if (favorites.some(name => dislikes.includes(name))) {
      return sendError(socket, "To samo danie nie może znaleźć się w obu grupach.");
    }

    room.players[index].quiz = { favorites, dislikes };
    room.message = `${room.players[index].name} ukończył quiz.`;

    if (humanPlayers(room).every(player => player.quiz)) {
      startGame(room);
      return;
    }
    emitState(room);
  });

  socket.on("place-bid", payload => {
    const found = roomForSocket(socket);
    if (!found) return;
    const { room, index } = found;
    const amount = Number(payload?.amount);

    if (room.status !== "playing") return sendError(socket, "Gra nie jest aktywna.");
    if (room.turn !== index) return sendError(socket, "Teraz ruch ma inny gracz.");
    if (!Number.isInteger(amount)) return sendError(socket, "Oferta musi być pełną liczbą monet.");
    if (amount <= room.currentBid) return sendError(socket, `Oferta musi być wyższa niż ${room.currentBid}.`);
    if (amount > room.players[index].budget) return sendError(socket, `Masz tylko ${room.players[index].budget} monet.`);

    handleBid(room, index, amount);
  });

  socket.on("pass", () => {
    const found = roomForSocket(socket);
    if (!found) return;
    const { room, index } = found;
    if (room.turn !== index) return sendError(socket, "Teraz ruch ma inny gracz.");
    handlePass(room, index);
  });

  socket.on("request-rematch", () => {
    const found = roomForSocket(socket);
    if (!found) return;
    const { room, index } = found;
    if (room.status !== "finished") return;

    room.players[index].rematchReady = true;
    const humansReady = humanPlayers(room).every(player => player.rematchReady);
    if (humansReady) {
      resetForRematch(room);
      return;
    }
    room.message = `${room.players[index].name} chce rewanżu. Czekamy na pozostałych.`;
    emitState(room);
  });

  socket.on("reconnect-player", (payload = {}) => {
    const code = String(payload.code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return sendError(socket, "Ten pokój już nie istnieje.");

    const index = room.players.findIndex(player => player?.token === payload.playerToken);
    if (index < 0) return sendError(socket, "Nieprawidłowy klucz powrotu do gry.");

    attachPlayer(socket, room, index);
    socket.emit("reconnected-player", { code, playerIndex: index });

    if (room.status === "playing") {
      room.message = `${room.players[index].name} wrócił do gry i dołączy od następnej licytacji.`;
    } else {
      room.message = `${room.players[index].name} wrócił do gry.`;
    }
    emitState(room);
  });

  socket.on("leave-room", () => {
    const found = roomForSocket(socket);
    if (!found) {
      socket.emit("left-room");
      return;
    }

    const { room, index } = found;
    const player = room.players[index];
    player.socketId = null;

    socket.leave(room.code);
    socket.data.roomCode = null;
    socket.data.playerIndex = null;
    socket.data.playerToken = null;

    if (room.status === "waiting") {
      room.players.splice(index, 1);
      room.passed.splice(index, 1);
      if (index === room.hostIndex && room.players.length) room.hostIndex = 0;
      if (room.players.every(p => p.isBot) || room.players.length === 0) rooms.delete(room.code);
      else emitState(room);
    } else if (connectedHumanCount(room) === 0) {
      clearTurnTimer(room);
      rooms.delete(room.code);
    } else {
      room.message = `${player.name} opuścił grę.`;
      if (room.status === "playing" && room.turn === index) handlePass(room, index);
      else emitState(room);
    }

    socket.emit("left-room");
  });

  socket.on("disconnect", () => {
    const found = roomForSocket(socket);
    if (!found) return;
    const { room, index } = found;
    if (room.players[index].socketId === socket.id) {
      room.players[index].socketId = null;
      room.message = `${room.players[index].name} stracił połączenie i będzie pomijany.`;

      if (room.status === "playing") {
        room.passed[index] = true;
        if (room.turn === index) {
          handlePass(room, index, true);
        } else {
          autoPassUnablePlayers(room);
          emitState(room);
        }
      } else {
        emitState(room);
      }
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.updatedAt > ROOM_TTL_MS) {
      clearTurnTimer(room);
      rooms.delete(code);
    }
  }
}, 60_000).unref();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Licytacja Smaków działa na porcie ${PORT}`);
});
