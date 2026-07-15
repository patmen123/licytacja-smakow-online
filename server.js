"use strict";

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: false }
});

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true }));

const FOODS = [
  ["Pizza", "🍕"], ["Sushi", "🍣"], ["Burger", "🍔"], ["Tacos", "🌮"],
  ["Ramen", "🍜"], ["Lody", "🍨"], ["Stek", "🥩"], ["Pierogi", "🥟"],
  ["Kebab", "🥙"], ["Pączki", "🍩"], ["Naleśniki", "🥞"], ["Sałatka", "🥗"]
];

const rooms = new Map();
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const DISCONNECT_GRACE_MS = 5 * 60 * 1000;

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function token() {
  return crypto.randomBytes(24).toString("hex");
}

function shuffledFoods(count) {
  const copy = FOODS.map(([name, emoji]) => ({ name, emoji }));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count).map(food => ({
    ...food,
    value: Math.floor(Math.random() * 10) + 1
  }));
}

function cleanName(value, fallback) {
  const name = String(value || "").trim().replace(/\s+/g, " ").slice(0, 18);
  return name || fallback;
}

function publicState(room, viewerIndex = null) {
  const ended = room.status === "finished";
  return {
    code: room.code,
    status: room.status,
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
    viewerIndex,
    players: room.players.map((player, index) => player ? ({
      name: player.name,
      budget: player.budget,
      connected: Boolean(player.socketId),
      items: player.items.map(item => ({
        name: item.name,
        emoji: item.emoji,
        price: item.price,
        ...(ended ? { value: item.value } : {})
      })),
      score: ended ? player.items.reduce((sum, item) => sum + item.value, 0) : null,
      isYou: index === viewerIndex
    }) : null)
  };
}

function emitState(room) {
  room.updatedAt = Date.now();
  room.players.forEach((player, index) => {
    if (player?.socketId) {
      io.to(player.socketId).emit("state", publicState(room, index));
    }
  });
}

function sendError(socket, message) {
  socket.emit("game-error", { message });
}

function roomForSocket(socket) {
  const code = socket.data.roomCode;
  const index = socket.data.playerIndex;
  const room = rooms.get(code);
  if (!room || !Number.isInteger(index) || room.players[index]?.token !== socket.data.playerToken) {
    return null;
  }
  return { room, index };
}

function startGame(room) {
  room.status = "playing";
  room.round = 0;
  room.turn = 0;
  room.currentBid = 0;
  room.leader = null;
  room.passed = [false, false];
  room.message = `${room.players[0].name} rozpoczyna licytację.`;
  emitState(room);
}

function beginNextRound(room) {
  room.round += 1;
  if (room.round >= room.items.length) {
    room.status = "finished";
    room.currentBid = 0;
    room.leader = null;
    room.message = "Koniec gry — odkrywamy ukryte punkty.";
    emitState(room);
    return;
  }

  room.currentBid = 0;
  room.leader = null;
  room.passed = [false, false];
  room.turn = room.round % 2;
  room.message = `${room.players[room.turn].name} rozpoczyna kolejną licytację.`;
  emitState(room);
}

function resolveAuction(room) {
  const winnerIndex = room.leader;
  if (winnerIndex === null) {
    room.message = "Oboje spasowali. Potrawa przepada.";
  } else {
    const winner = room.players[winnerIndex];
    const item = room.items[room.round];
    winner.budget -= room.currentBid;
    winner.items.push({ ...item, price: room.currentBid });
    room.message = `${item.emoji} ${item.name} trafia do ${winner.name} za ${room.currentBid} monet.`;
  }
  emitState(room);
  setTimeout(() => {
    if (rooms.get(room.code) === room && room.status === "playing") {
      beginNextRound(room);
    }
  }, 1300);
}

function attachPlayer(socket, room, index) {
  const player = room.players[index];
  if (player.socketId && player.socketId !== socket.id) {
    io.to(player.socketId).emit("session-replaced");
    io.sockets.sockets.get(player.socketId)?.disconnect(true);
  }
  player.socketId = socket.id;
  player.disconnectedAt = null;
  socket.data.roomCode = room.code;
  socket.data.playerIndex = index;
  socket.data.playerToken = player.token;
  socket.join(room.code);
}

io.on("connection", socket => {
  socket.on("create-room", (payload = {}) => {
    const budget = Math.max(20, Math.min(1000, Math.floor(Number(payload.budget) || 100)));
    const rounds = Math.max(3, Math.min(12, Math.floor(Number(payload.rounds) || 10)));
    const code = randomCode();
    const playerToken = token();

    const room = {
      code,
      status: "waiting",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: shuffledFoods(rounds),
      round: 0,
      turn: 0,
      currentBid: 0,
      leader: null,
      passed: [false, false],
      message: "Pokój utworzony. Oczekiwanie na drugiego gracza.",
      players: [
        {
          name: cleanName(payload.name, "Gracz 1"),
          budget,
          initialBudget: budget,
          items: [],
          token: playerToken,
          socketId: null,
          disconnectedAt: null
        },
        null
      ]
    };

    rooms.set(code, room);
    attachPlayer(socket, room, 0);
    socket.emit("room-created", { code, playerToken, playerIndex: 0 });
    emitState(room);
  });

  socket.on("join-room", (payload = {}) => {
    const code = String(payload.code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return sendError(socket, "Nie znaleziono pokoju o takim kodzie.");
    if (room.status !== "waiting") return sendError(socket, "Ta gra już się rozpoczęła.");

    const playerToken = token();
    room.players[1] = {
      name: cleanName(payload.name, "Gracz 2"),
      budget: room.players[0].initialBudget,
      initialBudget: room.players[0].initialBudget,
      items: [],
      token: playerToken,
      socketId: null,
      disconnectedAt: null
    };

    attachPlayer(socket, room, 1);
    socket.emit("room-joined", { code, playerToken, playerIndex: 1 });
    startGame(room);
  });

  socket.on("reconnect-player", (payload = {}) => {
    const code = String(payload.code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return sendError(socket, "Ten pokój już nie istnieje.");

    const index = room.players.findIndex(player => player?.token === payload.playerToken);
    if (index < 0) return sendError(socket, "Nieprawidłowy klucz powrotu do gry.");

    attachPlayer(socket, room, index);
    socket.emit("reconnected-player", { code, playerIndex: index });
    room.message = `${room.players[index].name} wrócił do gry.`;
    emitState(room);
  });

  socket.on("place-bid", payload => {
    const found = roomForSocket(socket);
    if (!found) return sendError(socket, "Nie jesteś przypisany do aktywnej gry.");
    const { room, index } = found;

    if (room.status !== "playing") return sendError(socket, "Gra nie jest teraz aktywna.");
    if (room.turn !== index) return sendError(socket, "Teraz licytuje drugi gracz.");
    if (!room.players[1]) return sendError(socket, "Drugi gracz jeszcze nie dołączył.");

    const amount = Number(payload?.amount);
    const player = room.players[index];

    if (!Number.isInteger(amount)) return sendError(socket, "Oferta musi być pełną liczbą monet.");
    if (amount <= room.currentBid) return sendError(socket, `Oferta musi być wyższa niż ${room.currentBid}.`);
    if (amount > player.budget) return sendError(socket, `Masz tylko ${player.budget} monet.`);

    room.currentBid = amount;
    room.leader = index;
    room.passed[index] = false;
    room.message = `${player.name} licytuje ${amount} monet.`;
    room.turn = 1 - index;
    emitState(room);
  });

  socket.on("pass", () => {
    const found = roomForSocket(socket);
    if (!found) return sendError(socket, "Nie jesteś przypisany do aktywnej gry.");
    const { room, index } = found;

    if (room.status !== "playing") return sendError(socket, "Gra nie jest teraz aktywna.");
    if (room.turn !== index) return sendError(socket, "Teraz ruch ma drugi gracz.");

    room.passed[index] = true;

    if (room.leader !== null && room.leader !== index) {
      resolveAuction(room);
      return;
    }

    if (room.passed[0] && room.passed[1]) {
      resolveAuction(room);
      return;
    }

    room.turn = 1 - index;
    room.message = `${room.players[index].name} pasuje.`;
    emitState(room);
  });

  socket.on("disconnect", () => {
    const found = roomForSocket(socket);
    if (!found) return;
    const { room, index } = found;
    const player = room.players[index];

    if (player.socketId === socket.id) {
      player.socketId = null;
      player.disconnectedAt = Date.now();
      room.message = `${player.name} stracił połączenie. Może wrócić do gry w ciągu 5 minut.`;
      emitState(room);
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const allDisconnected = room.players.filter(Boolean).every(player => !player.socketId);
    const disconnectedTooLong = room.players.filter(Boolean).some(
      player => player.disconnectedAt && now - player.disconnectedAt > DISCONNECT_GRACE_MS
    );
    if ((allDisconnected && disconnectedTooLong) || now - room.updatedAt > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  }
}, 60_000).unref();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Licytacja Smaków działa na porcie ${PORT}`);
});
