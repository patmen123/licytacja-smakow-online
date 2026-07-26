"use strict";

const socket = io();
const $ = id => document.getElementById(id);

let latestState = null;
let quizSelections = { favorites: new Set(), dislikes: new Set() };
let session = JSON.parse(localStorage.getItem("foodAuctionSession") || "null");
let autoJoinAttempted = false;
let timerAnimation = null;

function show(screen) {
  ["home", "waiting", "quizScreen", "game", "resultsScreen"]
    .forEach(id => $(id).classList.toggle("hidden", id !== screen));
}

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("toast").classList.add("hidden"), 2800);
}

function saveSession(data) {
  session = { code: data.code, playerToken: data.playerToken, playerIndex: data.playerIndex };
  localStorage.setItem("foodAuctionSession", JSON.stringify(session));
}

function returnToMenu() {
  localStorage.removeItem("foodAuctionSession");
  session = null;
  latestState = null;
  quizSelections = { favorites: new Set(), dislikes: new Set() };
  autoJoinAttempted = false;
  history.replaceState({}, "", location.pathname);
  show("home");
}

function leaveRoom() {
  socket.emit("leave-room");
}

function inviteLink(code) {
  const url = new URL(location.href);
  url.searchParams.set("room", code);
  return url.toString();
}

function copyInvite() {
  const code = latestState?.code || session?.code;
  if (!code) return;
  navigator.clipboard.writeText(inviteLink(code))
    .then(() => toast("Skopiowano link zaproszenia."))
    .catch(() => toast(`Kod pokoju: ${code}`));
}

function tryAutoJoinFromLink() {
  const room = new URLSearchParams(location.search).get("room");
  if (!room || session || autoJoinAttempted || !socket.connected) return;
  autoJoinAttempted = true;
  $("autoJoinInfo").classList.remove("hidden");
  $("autoJoinInfo").textContent = `Dołączanie do pokoju ${room.toUpperCase()}…`;
  socket.emit("join-room", {
    name: $("guestName").value || "Gracz",
    code: room.toUpperCase()
  });
}

function toggleMode() {
  const bot = $("gameMode").value === "bot";
  $("maxPlayersLabel").classList.toggle("hidden", bot);
  $("botCountLabel").classList.toggle("hidden", !bot);
}

function toggleQuizChoice(type, name) {
  const own = quizSelections[type];
  const other = quizSelections[type === "favorites" ? "dislikes" : "favorites"];

  if (own.has(name)) own.delete(name);
  else {
    if (own.size >= 3) return toast("Możesz wybrać maksymalnie 3 dania.");
    other.delete(name);
    own.add(name);
  }
  if (latestState?.status === "quiz") renderQuiz(latestState);
}

function renderChoiceGrid(containerId, foods, type) {
  const selected = quizSelections[type];
  $(containerId).innerHTML = foods.map(food => `
    <button class="food-choice ${selected.has(food.name) ? "selected" : ""}"
      data-name="${food.name}" data-type="${type}">
      <span>${food.emoji}</span>${food.name}
    </button>
  `).join("");

  $(containerId).querySelectorAll(".food-choice").forEach(button => {
    button.addEventListener("click", () => toggleQuizChoice(button.dataset.type, button.dataset.name));
  });
}

function renderWaiting(state) {
  show("waiting");
  $("waitingCode").textContent = state.code;
  $("waitingPlayers").textContent = `Graczy: ${state.players.length}/${state.maxPlayers}`;
  $("waitingList").innerHTML = state.players.map(player =>
    `<span class="waiting-player">${player.isBot ? "🤖" : "👤"} ${player.name}</span>`
  ).join("");
  $("startRoomBtn").classList.toggle("hidden", !state.isHost);
  $("startRoomBtn").disabled = !state.canStart;
}

function renderQuiz(state) {
  show("quizScreen");
  const me = state.players[state.viewerIndex];
  renderChoiceGrid("favoriteChoices", state.quizFoods, "favorites");
  renderChoiceGrid("dislikeChoices", state.quizFoods, "dislikes");

  $("favCount").textContent = `${quizSelections.favorites.size}/3`;
  $("dislikeCount").textContent = `${quizSelections.dislikes.size}/3`;
  $("submitQuizBtn").disabled =
    quizSelections.favorites.size !== 3 ||
    quizSelections.dislikes.size !== 3 ||
    me.quizSubmitted;

  $("quizWaiting").classList.toggle("hidden", !me.quizSubmitted);
  $("favoriteChoices").classList.toggle("locked", me.quizSubmitted);
  $("dislikeChoices").classList.toggle("locked", me.quizSubmitted);
}

function renderPlayers(state) {
  $("playersGrid").innerHTML = state.players.map((player, index) => `
    <article class="card player ${index === state.turn ? "active" : ""} ${state.passed[index] ? "passed" : ""}">
      <div class="player-head">
        <h2>${player.isBot ? "🤖 " : ""}${player.name}${player.isYou ? " (Ty)" : ""}</h2>
        <strong>${player.isYou ? `${player.budget} 🪙` : "Monety ukryte"}</strong>
      </div>
      <div class="presence ${player.connected ? "online" : "offline"}">
        ● ${player.isBot ? "komputer" : player.connected ? "online" : "rozłączony"}
        ${state.passed[index] ? " · pas" : ""}
      </div>
      <div class="items">
        ${player.items.length
          ? player.items.map(item => `<span class="chip" title="Cena: ${item.price}">${item.emoji} ${item.name}</span>`).join("")
          : '<span class="empty">Brak zdobytych dań</span>'}
      </div>
    </article>
  `).join("");
}

function animateTimer(state) {
  cancelAnimationFrame(timerAnimation);

  const update = () => {
    if (!latestState || latestState.status !== "playing" || !latestState.turnEndsAt) return;
    const remaining = Math.max(0, latestState.turnEndsAt - Date.now());
    const seconds = (remaining / 1000).toFixed(1);
    $("timerText").textContent = `${seconds.replace(".", ",")} s`;
    $("timerBar").style.width = `${Math.max(0, Math.min(100, remaining / 100))}%`;
    if (remaining > 0) timerAnimation = requestAnimationFrame(update);
  };
  update();
}

function renderGame(state) {
  show("game");
  $("gameCode").textContent = state.code;
  $("roundLabel").textContent = `Danie ${state.round + 1} z ${state.roundCount}`;
  $("foodEmoji").textContent = state.currentItem?.emoji || "🍽️";
  $("foodName").textContent = state.currentItem?.name || "";
  $("currentBid").textContent = `${state.currentBid} 🪙`;
  $("message").textContent = state.message;

  const me = state.players[state.viewerIndex];
  $("mobileOwnMoney").textContent = `${me.budget} 🪙`;

  const turnPlayer = state.players[state.turn];
  $("turnLabel").textContent = turnPlayer ? `Ruch: ${turnPlayer.name}` : "Oczekiwanie";
  $("bidAmount").min = state.currentBid + 1;
  $("bidAmount").placeholder = `Minimum ${state.currentBid + 1}`;

  renderPlayers(state);

  const myTurn = state.viewerIndex === state.turn;
  const canAct = myTurn && me.connected && !state.passed[state.viewerIndex];
  $("controls").classList.toggle("hidden", !canAct);
  $("spectatorNote").classList.toggle("hidden", canAct);
  $("spectatorNote").textContent = turnPlayer?.isBot
    ? "Komputer podejmuje decyzję…"
    : `Czekasz na ruch gracza ${turnPlayer?.name || ""}.`;

  animateTimer(state);
}

function renderResults(state) {
  show("resultsScreen");
  const ranking = state.players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => b.player.score - a.player.score);

  const topScore = ranking[0].player.score;
  const top = ranking.filter(entry => entry.player.score === topScore);
  const winnerIndex = top.length === 1 ? top[0].index : null;

  $("winner").innerHTML = winnerIndex === null
    ? "Remis największych obżartuchów! 🤝"
    : `Największy obżartuch: ${state.players[winnerIndex].name}
       <span class="dancing-pig" aria-label="Tańcząca świnka">🐷</span>`;

  $("results").innerHTML = ranking.map(({ player, index }, place) => `
    <article class="result ${index === winnerIndex ? "winner-result" : ""}">
      <h3>${place + 1}. ${player.isBot ? "🤖 " : ""}${player.name}${player.isYou ? " (Ty)" : ""}
        ${index === winnerIndex ? '<span class="dancing-pig small-pig">🐷</span>' : ""}
      </h3>
      <p><strong>${player.score} punktów</strong>${player.isYou ? ` · zostało ${player.budget} monet` : ""}</p>
      ${player.items.length
        ? player.items.map(item => `<div class="result-line"><span>${item.emoji} ${item.name}</span><span>${item.value} pkt · ${item.price} 🪙</span></div>`).join("")
        : '<p class="muted">Brak zdobytych dań</p>'}
    </article>
  `).join("");

  const me = state.players[state.viewerIndex];
  $("rematchBtn").disabled = me.rematchReady;
  $("rematchBtn").textContent = me.rematchReady ? "Czekamy na pozostałych…" : "Zagraj ponownie";
  $("rematchWaiting").classList.toggle("hidden", !me.rematchReady);
}

function render(state) {
  latestState = state;
  if (state.status === "waiting") return renderWaiting(state);
  if (state.status === "quiz") return renderQuiz(state);
  if (state.status === "playing") return renderGame(state);
  if (state.status === "finished") return renderResults(state);
}

$("gameMode").addEventListener("change", toggleMode);
$("createBtn").addEventListener("click", () => {
  socket.emit("create-room", {
    name: $("hostName").value,
    mode: $("gameMode").value,
    budget: Number($("budget").value),
    rounds: Number($("rounds").value),
    maxPlayers: Number($("maxPlayers").value),
    botCount: Number($("botCount").value)
  });
});
$("joinBtn").addEventListener("click", () => socket.emit("join-room", {
  name: $("guestName").value,
  code: $("roomCode").value
}));
$("startRoomBtn").addEventListener("click", () => socket.emit("start-room"));
$("shareBtn").addEventListener("click", copyInvite);
$("leaveWaitingBtn").addEventListener("click", leaveRoom);
$("submitQuizBtn").addEventListener("click", () => socket.emit("submit-quiz", {
  favorites: [...quizSelections.favorites],
  dislikes: [...quizSelections.dislikes]
}));
$("leaveQuizBtn").addEventListener("click", () => confirm("Opuścić pokój?") && leaveRoom());
$("bidBtn").addEventListener("click", () => {
  socket.emit("place-bid", { amount: Number($("bidAmount").value) });
  $("bidAmount").value = "";
});
$("bidAmount").addEventListener("keydown", event => {
  if (event.key === "Enter") $("bidBtn").click();
});
$("passBtn").addEventListener("click", () => socket.emit("pass"));
$("leaveGameBtn").addEventListener("click", () => confirm("Opuścić grę?") && leaveRoom());
$("rematchBtn").addEventListener("click", () => socket.emit("request-rematch"));
$("leaveAfterGameBtn").addEventListener("click", () => confirm("Opuścić pokój?") && leaveRoom());

socket.on("room-created", saveSession);
socket.on("room-joined", data => {
  $("autoJoinInfo").classList.add("hidden");
  saveSession(data);
});
socket.on("state", render);
socket.on("left-room", () => {
  returnToMenu();
  toast("Opuszczono pokój.");
});
socket.on("game-error", ({ message }) => {
  $("autoJoinInfo").classList.add("hidden");
  toast(message);
  if (message.includes("nie istnieje") || message.includes("Nieprawidłowy")) returnToMenu();
});
socket.on("session-replaced", () => toast("Sesja została otwarta na innym urządzeniu."));
socket.on("connect", () => {
  $("connection").textContent = "Połączono";
  if (session?.code && session?.playerToken) socket.emit("reconnect-player", session);
  else tryAutoJoinFromLink();
});
socket.on("disconnect", () => {
  $("connection").textContent = "Ponowne łączenie…";
});

const roomFromLink = new URLSearchParams(location.search).get("room");
if (roomFromLink && !session) {
  $("roomCode").value = roomFromLink.toUpperCase();
  $("autoJoinInfo").classList.remove("hidden");
  $("autoJoinInfo").textContent = `Przygotowanie do dołączenia do pokoju ${roomFromLink.toUpperCase()}…`;
  tryAutoJoinFromLink();
}
toggleMode();
