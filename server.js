"use strict";

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const TURN_MS = 10_000;
const MAX_DISHES_PER_PLAYER = 5;
const PUBLIC_MATCH_BUDGET = 100;
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
  { name: "Spring rolls", emoji: "🥢", category: "snack" },

  { name: "Lekarz", emoji: "🧑‍⚕️", category: "job" },
  { name: "Strażak", emoji: "🧑‍🚒", category: "job" },
  { name: "Policjant", emoji: "👮", category: "job" },
  { name: "Nauczyciel", emoji: "🧑‍🏫", category: "job" },
  { name: "Kucharz", emoji: "🧑‍🍳", category: "job" },
  { name: "Mechanik", emoji: "🧑‍🔧", category: "job" },
  { name: "Rolnik", emoji: "🧑‍🌾", category: "job" },
  { name: "Astronauta", emoji: "🧑‍🚀", category: "job" },
  { name: "Pilot", emoji: "🧑‍✈️", category: "job" },
  { name: "Prawnik", emoji: "⚖️", category: "job" },
  { name: "Programista", emoji: "💻", category: "job" },
  { name: "Architekt", emoji: "📐", category: "job" },
  { name: "Fotograf", emoji: "📷", category: "job" },
  { name: "Muzyk", emoji: "🎸", category: "job" },
  { name: "Aktor", emoji: "🎭", category: "job" },
  { name: "Weterynarz", emoji: "🐾", category: "job" },
  { name: "Dentysta", emoji: "🦷", category: "job" },
  { name: "Dziennikarz", emoji: "📰", category: "job" },
  { name: "Naukowiec", emoji: "🔬", category: "job" },
  { name: "Elektryk", emoji: "⚡", category: "job" },

  { name: "Samochód", emoji: "🚗", category: "vehicle" },
  { name: "Motocykl", emoji: "🏍️", category: "vehicle" },
  { name: "Rower", emoji: "🚲", category: "vehicle" },
  { name: "Autobus", emoji: "🚌", category: "vehicle" },
  { name: "Ciężarówka", emoji: "🚚", category: "vehicle" },
  { name: "Pociąg", emoji: "🚆", category: "vehicle" },
  { name: "Tramwaj", emoji: "🚋", category: "vehicle" },
  { name: "Metro", emoji: "🚇", category: "vehicle" },
  { name: "Samolot", emoji: "✈️", category: "vehicle" },
  { name: "Helikopter", emoji: "🚁", category: "vehicle" },
  { name: "Statek", emoji: "🚢", category: "vehicle" },
  { name: "Łódź", emoji: "🚤", category: "vehicle" },
  { name: "Kajak", emoji: "🛶", category: "vehicle" },
  { name: "Hulajnoga", emoji: "🛴", category: "vehicle" },
  { name: "Deskorolka", emoji: "🛹", category: "vehicle" },
  { name: "Traktor", emoji: "🚜", category: "vehicle" },
  { name: "Karetka", emoji: "🚑", category: "vehicle" },
  { name: "Wóz strażacki", emoji: "🚒", category: "vehicle" },
  { name: "Radiowóz", emoji: "🚓", category: "vehicle" },
  { name: "Rakieta", emoji: "🚀", category: "vehicle" }

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
  const uniquePool = [
    ...new Map(
      categoryPool(category).map(item => [item.name.trim().toLowerCase(), item])
    ).values()
  ];
  const pool = shuffled(uniquePool);

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
  const participants = room.mode === "tournament" ? activePlayers(room) : room.players;

  for (const item of room.items) {
    let score = 5;
    for (const player of participants) {
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

function activePlayerIndices(room) {
  if (
    room.mode === "tournament" &&
    room.tournament &&
    Array.isArray(room.tournament.currentPlayers)
  ) {
    return room.tournament.currentPlayers;
  }

  return room.players.map((_player, index) => index);
}

function activePlayers(room) {
  return activePlayerIndices(room).map(index => room.players[index]);
}

function isActiveTournamentPlayer(room, index) {
  return activePlayerIndices(room).includes(index);
}

function scoreForPlayer(player) {
  return player.items.reduce((sum, item) => sum + item.value, 0);
}

function tournamentStageLabel(stage) {
  return {
    semifinal1: "Półfinał 1",
    semifinal2: "Półfinał 2",
    bronze: "Mecz o 3. miejsce",
    final: "Finał"
  }[stage] || "Turniej";
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
    startingBudget: viewer ? viewer.initialBudget : null,
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
    countdownValue: room.countdownValue ?? null,
    turnEndsAt: room.turnEndsAt,
    tournament: room.tournament ? {
      complete: Boolean(room.tournament.complete),
      stage: room.tournament.stage,
      stageLabel: tournamentStageLabel(room.tournament.stage),
      currentPlayers: room.tournament.currentPlayers || [],
      nextPlayers: room.tournament.nextPlayers || [],
      matches: room.tournament.matches || [],
      ranking: room.tournament.ranking || null
    } : null,
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
      inCurrentMatch: isActiveTournamentPlayer(room, index),
      tournamentStats: {
        wins: player.tournamentWins || 0,
        losses: player.tournamentLosses || 0,
        points: player.tournamentPoints || 0,
        spent: player.tournamentSpent || 0
      },
      isYou: index === viewerIndex
    })),
    canStart: (
      room.mode === "online" &&
      room.status === "waiting" &&
      viewerIndex === room.hostIndex &&
      room.players.length >= 2
    ) || (
      room.mode === "tournament" &&
      room.status === "waiting" &&
      viewerIndex === room.hostIndex &&
      room.players.length === 4
    )
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

function clearCountdownTimer(room) {
  if (room.countdownTimer) clearTimeout(room.countdownTimer);
  room.countdownTimer = null;
  room.countdownValue = null;
}

function clearTournamentTimer(room) {
  if (room.tournamentTimer) clearTimeout(room.tournamentTimer);
  room.tournamentTimer = null;
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


function uniquePlayerName(room, value, fallback) {
  const base = cleanName(value, fallback);
  const used = new Set(room.players.map(player => player.name.toLowerCase()));

  if (!used.has(base.toLowerCase())) return base;

  let suffix = 2;
  while (used.has(`${base} ${suffix}`.toLowerCase())) suffix += 1;
  return `${base} ${suffix}`.slice(0, 18);
}

function prepareRoomQuiz(room, message) {
  room.roundCount = room.mode === "tournament"
    ? 2 * MAX_DISHES_PER_PLAYER
    : room.players.length * MAX_DISHES_PER_PLAYER;
  room.items = makeItems(room.roundCount, room.category);
  room.passed = room.players.map(() => false);
  room.status = "quiz";
  room.message = message;
  emitState(room);
}

function findWaitingPublicRoom(category, maxPlayers) {
  return [...rooms.values()].find(room =>
    room.mode === "public" &&
    room.status === "waiting" &&
    room.category === category &&
    room.maxPlayers === maxPlayers &&
    room.players.length < room.maxPlayers
  );
}





function resetTournamentStats(room) {
  room.players.forEach(player => {
    player.tournamentWins = 0;
    player.tournamentLosses = 0;
    player.tournamentPoints = 0;
    player.tournamentSpent = 0;
    player.items = [];
    player.budget = player.initialBudget;
    player.rematchReady = false;
  });
}

function prepareTournamentMatch(room, stage, playerIndices) {
  clearTurnTimer(room);
  clearCountdownTimer(room);
  clearTournamentTimer(room);

  room.tournament.stage = stage;
  room.tournament.currentPlayers = [...playerIndices];
  room.tournament.nextPlayers = [];
  room.roundCount = 2 * MAX_DISHES_PER_PLAYER;
  room.items = makeItems(room.roundCount, room.category);
  room.round = 0;
  room.currentBid = 0;
  room.leader = null;

  room.players.forEach((player, index) => {
    player.items = [];
    player.budget = player.initialBudget;
    player.rematchReady = false;
  });

  room.passed = room.players.map((_player, index) => !playerIndices.includes(index));
  room.message = `${tournamentStageLabel(stage)}: ${room.players[playerIndices[0]].name} kontra ${room.players[playerIndices[1]].name}.`;
}

function initializeTournament(room) {
  if (room.players.length !== 4) throw new Error("Turniej wymaga dokładnie 4 graczy.");

  resetTournamentStats(room);
  room.tournament = {
    complete: false,
    stage: "semifinal1",
    currentPlayers: [0, 1],
    nextPlayers: [],
    matches: [],
    semifinalWinners: [],
    semifinalLosers: [],
    bronzeWinner: null,
    bronzeLoser: null,
    ranking: null
  };
  prepareTournamentMatch(room, "semifinal1", [0, 1]);
}

function tournamentMatchWinner(room, playerAIndex, playerBIndex) {
  const playerA = room.players[playerAIndex];
  const playerB = room.players[playerBIndex];
  const scoreA = scoreForPlayer(playerA);
  const scoreB = scoreForPlayer(playerB);
  if (scoreA !== scoreB) return scoreA > scoreB ? playerAIndex : playerBIndex;
  if (playerA.budget !== playerB.budget) return playerA.budget > playerB.budget ? playerAIndex : playerBIndex;
  return Math.min(playerAIndex, playerBIndex);
}

function scheduleTournamentMatch(room, stage, playerIndices, resultMessage) {
  clearTurnTimer(room);
  clearCountdownTimer(room);
  clearTournamentTimer(room);
  room.status = "tournament-break";
  room.tournament.nextPlayers = [...playerIndices];
  room.message = resultMessage;
  emitState(room);

  room.tournamentTimer = setTimeout(() => {
    if (rooms.get(room.code) !== room || room.status !== "tournament-break") return;
    prepareTournamentMatch(room, stage, playerIndices);
    beginCountdown(room);
  }, 3200);
}

function finishTournamentMatch(room) {
  clearTurnTimer(room);
  fillAllEmptySlots(room);

  const [playerAIndex, playerBIndex] = room.tournament.currentPlayers;
  const playerA = room.players[playerAIndex];
  const playerB = room.players[playerBIndex];
  const scoreA = scoreForPlayer(playerA);
  const scoreB = scoreForPlayer(playerB);
  const winnerIndex = tournamentMatchWinner(room, playerAIndex, playerBIndex);
  const loserIndex = winnerIndex === playerAIndex ? playerBIndex : playerAIndex;
  const winner = room.players[winnerIndex];
  const loser = room.players[loserIndex];

  playerA.tournamentPoints += scoreA;
  playerB.tournamentPoints += scoreB;
  playerA.tournamentSpent += playerA.initialBudget - playerA.budget;
  playerB.tournamentSpent += playerB.initialBudget - playerB.budget;
  winner.tournamentWins += 1;
  loser.tournamentLosses += 1;

  room.tournament.matches.push({
    stage: room.tournament.stage,
    label: tournamentStageLabel(room.tournament.stage),
    players: [playerAIndex, playerBIndex],
    scores: [scoreA, scoreB],
    winner: winnerIndex,
    loser: loserIndex
  });

  const winnerScore = winnerIndex === playerAIndex ? scoreA : scoreB;
  const loserScore = winnerIndex === playerAIndex ? scoreB : scoreA;
  const resultText = `${tournamentStageLabel(room.tournament.stage)}: ${winner.name} wygrywa ${winnerScore}:${loserScore}.`;

  if (room.tournament.stage === "semifinal1") {
    room.tournament.semifinalWinners[0] = winnerIndex;
    room.tournament.semifinalLosers[0] = loserIndex;
    scheduleTournamentMatch(room, "semifinal2", [2, 3], `${resultText} Za chwilę drugi półfinał.`);
    return;
  }
  if (room.tournament.stage === "semifinal2") {
    room.tournament.semifinalWinners[1] = winnerIndex;
    room.tournament.semifinalLosers[1] = loserIndex;
    scheduleTournamentMatch(room, "bronze", [room.tournament.semifinalLosers[0], room.tournament.semifinalLosers[1]], `${resultText} Za chwilę mecz o 3. miejsce.`);
    return;
  }
  if (room.tournament.stage === "bronze") {
    room.tournament.bronzeWinner = winnerIndex;
    room.tournament.bronzeLoser = loserIndex;
    scheduleTournamentMatch(room, "final", [room.tournament.semifinalWinners[0], room.tournament.semifinalWinners[1]], `${resultText} Za chwilę wielki finał.`);
    return;
  }

  room.tournament.complete = true;
  room.tournament.ranking = [winnerIndex, loserIndex, room.tournament.bronzeWinner, room.tournament.bronzeLoser];
  room.status = "finished";
  room.currentBid = 0;
  room.leader = null;
  room.turnEndsAt = null;
  room.round = room.items.length;
  room.message = `${resultText} Turniej zakończony.`;
  emitState(room);
}

function hasFreeDishSlot(player) {
  return player.items.length < MAX_DISHES_PER_PLAYER;
}

function playersWithFreeSlots(room) {
  return activePlayerIndices(room)
    .map(index => ({ player: room.players[index], index }))
    .filter(({ player }) =>
      hasFreeDishSlot(player) &&
      player.budget > 0 &&
      (player.isBot || player.socketId)
    );
}

function assignRemainingDishesIfOnlyOneHasSlots(room) {
  const available = playersWithFreeSlots(room);
  if (available.length !== 1) return false;

  const { player } = available[0];
  const needed = MAX_DISHES_PER_PLAYER - player.items.length;
  if (needed <= 0) return false;

  const alreadyOwnedNames = new Set(
    room.players.flatMap(existingPlayer =>
      existingPlayer.items.map(item => item.name.trim().toLowerCase())
    )
  );

  const remaining = room.items
    .slice(room.round)
    .filter(item => !alreadyOwnedNames.has(item.name.trim().toLowerCase()))
    .slice(0, needed);

  remaining.forEach(item => {
    player.items.push({ ...item, price: 0 });
    alreadyOwnedNames.add(item.name.trim().toLowerCase());
  });

  room.round = room.items.length;
  finishGame(
    room,
    `${player.name} jako jedyny aktywny gracz otrzymał brakujące elementy do kompletu 5.`
  );
  return true;
}

function playersWithMoney(room) {
  return activePlayerIndices(room)
    .map(index => ({ player: room.players[index], index }))
    .filter(({ player }) => player.budget > 0);
}

function shouldFinishForBankruptcy(room) {
  return playersWithMoney(room).length <= 1;
}


function fillAllEmptySlots(room) {
  const participants = activePlayers(room);
  const ownedNames = new Set(
    participants.flatMap(player =>
      player.items.map(item => item.name.trim().toLowerCase())
    )
  );

  const unclaimedItems = room.items.filter(
    item => !ownedNames.has(item.name.trim().toLowerCase())
  );

  if (!unclaimedItems.length) return 0;

  let assigned = 0;
  let itemIndex = 0;

  while (itemIndex < unclaimedItems.length) {
    const playerWithFewestItems = participants
      .filter(player => hasFreeDishSlot(player))
      .sort((a, b) => a.items.length - b.items.length)[0];

    if (!playerWithFewestItems) break;

    const item = unclaimedItems[itemIndex++];
    const key = item.name.trim().toLowerCase();

    if (ownedNames.has(key)) continue;

    playerWithFewestItems.items.push({ ...item, price: 0 });
    ownedNames.add(key);
    assigned += 1;
  }

  return assigned;
}

function finishGame(room, message = "Koniec gry — poznajemy Największego Obżartucha!") {
  clearTurnTimer(room);

  if (room.mode === "tournament" && room.tournament && !room.tournament.complete) {
    finishTournamentMatch(room);
    return;
  }

  const automaticallyAssigned = fillAllEmptySlots(room);

  room.status = "finished";
  room.currentBid = 0;
  room.leader = null;
  room.turnEndsAt = null;
  room.round = room.items.length;

  room.message = automaticallyAssigned > 0
    ? `${message} Niewylicytowane elementy zostały rozdane za 0 monet, aby każdy miał komplet 5/5.`
    : message;

  emitState(room);
}

function markBankruptPlayersPassed(room) {
  const activeSet = new Set(activePlayerIndices(room));
  room.players.forEach((player, index) => {
    if (!activeSet.has(index) || player.budget <= 0) room.passed[index] = true;
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
  const activeSet = new Set(activePlayerIndices(room));
  room.players.forEach((player, index) => {
    if (!activeSet.has(index)) {
      room.passed[index] = true;
      return;
    }
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
    .filter(index => activePlayerIndices(room).includes(index) && !room.passed[index] && index !== room.leader);

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


function beginCountdown(room, isRematch = false) {
  clearTurnTimer(room);
  clearCountdownTimer(room);

  room.status = "countdown";
  room.countdownValue = 3;
  room.message = room.mode === "tournament" && room.tournament
    ? `${tournamentStageLabel(room.tournament.stage)}: ${room.players[room.tournament.currentPlayers[0]].name} kontra ${room.players[room.tournament.currentPlayers[1]].name}.`
    : isRematch
      ? "Rewanż rozpocznie się za chwilę."
      : "Wszyscy są gotowi. Gra zaraz się rozpocznie.";
  emitState(room);

  const tick = () => {
    if (rooms.get(room.code) !== room || room.status !== "countdown") return;

    if (room.countdownValue > 1) {
      room.countdownValue -= 1;
      emitState(room);
      room.countdownTimer = setTimeout(tick, 1000);
      return;
    }

    room.countdownValue = 0;
    room.message = "START!";
    emitState(room);

    room.countdownTimer = setTimeout(() => {
      if (rooms.get(room.code) !== room || room.status !== "countdown") return;
      clearCountdownTimer(room);
      startGame(room, isRematch);
    }, 700);
  };

  room.countdownTimer = setTimeout(tick, 1000);
}

function startGame(room, isRematch = false) {
  clearTurnTimer(room);
  clearCountdownTimer(room);
  room.players.forEach(player => {
    player.rematchReady = false;
    if (player.isBot && !player.quiz) player.quiz = randomBotQuiz(room);
  });

  if (!isRematch || room.mode === "tournament") applyQuizScores(room);
  room.status = "playing";
  room.round = 0;
  room.currentBid = 0;
  room.leader = null;
  const activeSet = new Set(activePlayerIndices(room));
  room.passed = room.players.map((_player, index) => !activeSet.has(index));
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
  room.round += 1;

  if (room.round >= room.items.length) {
    finishGame(room);
    return;
  }

  if (assignRemainingDishesIfOnlyOneHasSlots(room)) return;

  if (shouldFinishForBankruptcy(room)) {
    finishGame(room, "Gra zakończona — tylko jeden gracz ma jeszcze monety.");
    return;
  }

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
      room.message = `${winner.name} ma już komplet 5 elementów. Ta pozycja przepada.`;
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
    beginNextRound(room);
  }, 1300);
}

function resetForRematch(room) {
  if (room.mode === "tournament") {
    initializeTournament(room);
    beginCountdown(room, true);
    return;
  }

  room.roundCount = room.players.length * MAX_DISHES_PER_PLAYER;
  room.items = makeItems(room.roundCount, room.category);
  room.players.forEach(player => {
    player.budget = player.initialBudget;
    player.items = [];
    player.rematchReady = false;
  });
  applyQuizScores(room);
  beginCountdown(room, true);
}

io.on("connection", socket => {
  socket.on("find-public-game", (payload = {}) => {
    if (socket.data.roomCode) {
      return sendError(socket, "Najpierw opuść obecną grę.");
    }

    const allowedCategories = new Set(["mixed", "main", "dessert", "drink", "snack", "job", "vehicle"]);
    const category = allowedCategories.has(payload.category) ? payload.category : "mixed";
    const maxPlayers = Math.max(2, Math.min(4, Math.floor(Number(payload.maxPlayers) || 2)));

    let room = findWaitingPublicRoom(category, maxPlayers);

    if (!room) {
      const code = randomCode();
      room = {
        code,
        mode: "public",
        category,
        maxPlayers,
        hostIndex: 0,
        status: "waiting",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        roundCount: maxPlayers * MAX_DISHES_PER_PLAYER,
        items: makeItems(maxPlayers * MAX_DISHES_PER_PLAYER, category),
        players: [],
        round: 0,
        turn: 0,
        currentBid: 0,
        leader: null,
        passed: [],
        message: "Szukamy pozostałych graczy…",
        turnTimer: null,
        turnEndsAt: null,
        countdownTimer: null,
        countdownValue: null
      };
      rooms.set(code, room);
    }

    const playerToken = makeToken();
    const index = room.players.length;
    const playerName = uniquePlayerName(room, payload.name, `Gracz ${index + 1}`);

    room.players.push({
      name: playerName,
      budget: PUBLIC_MATCH_BUDGET,
      initialBudget: PUBLIC_MATCH_BUDGET,
      items: [],
      quiz: null,
      rematchReady: false,
      isBot: false,
      token: playerToken,
      socketId: null
    });
    room.passed.push(false);

    attachPlayer(socket, room, index);
    socket.emit("matchmaking-joined", {
      code: room.code,
      playerToken,
      playerIndex: index
    });

    if (room.players.length >= room.maxPlayers) {
      prepareRoomQuiz(
        room,
        `Znaleziono ${room.players.length} graczy. Wypełnijcie quiz preferencji.`
      );
      return;
    }

    room.message = `Szukamy graczy: ${room.players.length}/${room.maxPlayers}.`;
    emitState(room);
  });

  socket.on("create-room", (payload = {}) => {
    const requestedBudget = Math.floor(Number(payload.budget));
    const budget = Number.isFinite(requestedBudget)
      ? Math.max(1, Math.min(1000, requestedBudget))
      : 100;
    const requestedMode = String(payload.mode || "online");
    const mode = ["online", "bot", "tournament"].includes(requestedMode)
      ? requestedMode
      : "online";
    const allowedCategories = new Set(["mixed", "main", "dessert", "drink", "snack", "job", "vehicle"]);
    const category = allowedCategories.has(payload.category) ? payload.category : "mixed";
    const maxPlayers = mode === "tournament"
      ? 4
      : Math.max(2, Math.min(4, Math.floor(Number(payload.maxPlayers) || 2)));
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
        ? "Wypełnij quiz preferencji, aby rozpocząć grę z komputerem."
        : mode === "tournament"
          ? "Turniej wymaga dokładnie 4 zawodników. Wyślij im kod lub link."
          : "Pokój gotowy. Zaproś od 1 do 3 dodatkowych graczy.",
      turnTimer: null,
      turnEndsAt: null,
      countdownTimer: null,
      countdownValue: null,
      tournamentTimer: null,
      tournament: null
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
    if (!["online", "tournament"].includes(room.mode)) {
      return sendError(socket, "Do tego pokoju nie można dołączyć kodem.");
    }

    if (room.status === "finished" && room.mode === "online") {
      room.players = room.players.filter(player => player.isBot || player.socketId);
      room.passed = room.players.map(() => false);
      room.hostIndex = 0;
      room.status = "waiting";
      room.message = "Pokój jest ponownie otwarty. Czekamy na graczy.";
    }
    if (room.status === "finished" && room.mode === "tournament") {
      return sendError(socket, "Ten turniej już się zakończył.");
    }

    if (room.status !== "waiting") return sendError(socket, "Ta gra już się rozpoczęła.");
    if (room.players.length >= room.maxPlayers) return sendError(socket, "Pokój jest już pełny.");

    const playerToken = makeToken();
    const index = room.players.length;
    room.players.push({
      name: uniquePlayerName(room, payload.name, `Gracz ${index + 1}`),
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
    if (room.mode === "tournament") {
      if (room.players.length !== 4) return sendError(socket, "Turniej wymaga dokładnie 4 zawodników.");
      prepareRoomQuiz(room, "Wszyscy czterej zawodnicy wypełniają quiz preferencji przed rozpoczęciem turnieju.");
      return;
    }
    if (room.players.length < 2) return sendError(socket, "Potrzeba co najmniej 2 graczy.");

    prepareRoomQuiz(
      room,
      `Wszyscy gracze wypełniają quiz preferencji. W tej grze będzie ${room.players.length * MAX_DISHES_PER_PLAYER} elementów.`
    );
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
      if (room.mode === "tournament") initializeTournament(room);
      beginCountdown(room);
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
    if (!activePlayerIndices(room).includes(index)) return sendError(socket, "W tej rundzie jesteś obserwatorem.");
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
    if (!activePlayerIndices(room).includes(index)) return sendError(socket, "W tej rundzie jesteś obserwatorem.");
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

    if (room.mode === "tournament" && room.status === "tournament-break" && room.tournament && room.tournament.currentPlayers.every(playerIndex => room.players[playerIndex].isBot || room.players[playerIndex].socketId)) {
      room.message = "Wszyscy zawodnicy aktualnego meczu wrócili. Wznawiamy odliczanie.";
      emitState(room);
      room.tournamentTimer = setTimeout(() => beginCountdown(room), 800);
      return;
    }
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

      if (room.players.every(p => p.isBot) || room.players.length === 0) {
        rooms.delete(room.code);
      } else {
        room.message = room.mode === "public"
          ? `Szukamy graczy: ${room.players.length}/${room.maxPlayers}.`
          : `${player.name} opuścił poczekalnię.`;
        emitState(room);
      }
    } else if (connectedHumanCount(room) === 0) {
      clearTurnTimer(room);
      clearCountdownTimer(room);
      clearTournamentTimer(room);
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

      if (room.mode === "public" && room.status === "waiting") {
        room.players.splice(index, 1);
        room.passed.splice(index, 1);

        if (room.players.length === 0) {
          rooms.delete(room.code);
        } else {
          room.hostIndex = 0;
          room.message = `Szukamy graczy: ${room.players.length}/${room.maxPlayers}.`;
          emitState(room);
        }
        return;
      }

      room.message = `${room.players[index].name} stracił połączenie i będzie pomijany.`;

      if (room.status === "countdown") {
        clearCountdownTimer(room);
        if (room.mode === "tournament") {
          room.status = "tournament-break";
          room.message = `${room.players[index].name} rozłączył się. Turniej czeka na jego powrót.`;
        } else {
          room.status = "quiz";
          room.message = `${room.players[index].name} rozłączył się. Odliczanie anulowane.`;
        }
        emitState(room);
        return;
      }

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
      clearCountdownTimer(room);
      clearTournamentTimer(room);
      rooms.delete(code);
    }
  }
}, 60_000).unref();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Aukcyjna Arena działa na porcie ${PORT}`);
});
