"use strict";

const socket = io();
const $ = id => document.getElementById(id);
let latestState = null;
let quizSelections = { favorites: new Set(), dislikes: new Set() };
let session = JSON.parse(localStorage.getItem("foodAuctionSession") || "null");
let autoJoinAttempted = false;

function show(screen) {
  ["home", "waiting", "quizScreen", "game", "resultsScreen"].forEach(id => $(id).classList.toggle("hidden", id !== screen));
}

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("toast").classList.add("hidden"), 2600);
}

function saveSession(data) {
  session = { code: data.code, playerToken: data.playerToken, playerIndex: data.playerIndex };
  localStorage.setItem("foodAuctionSession", JSON.stringify(session));
}


function leaveRoom() {
  socket.emit("leave-room");
}

function returnToMenu() {
  localStorage.removeItem("foodAuctionSession");
  session = null;
  latestState = null;
  quizSelections = { favorites: new Set(), dislikes: new Set() };
  history.replaceState({}, "", location.pathname);
  $("bidAmount").value = "";
  show("home");
}


function tryAutoJoinFromLink() {
  const room = new URLSearchParams(location.search).get("room");
  if (!room || session || autoJoinAttempted || !socket.connected) return;

  autoJoinAttempted = true;
  $("autoJoinInfo").classList.remove("hidden");
  $("autoJoinInfo").textContent = `Dołączanie do pokoju ${room.toUpperCase()}…`;

  socket.emit("join-room", {
    name: $("guestName").value || "Gracz 2",
    code: room.toUpperCase()
  });
}

function inviteLink(code) {
  const url = new URL(location.href);
  url.searchParams.set("room", code);
  return url.toString();
}

function copyInvite() {
  if (!latestState?.code && !session?.code) return;
  const code = latestState?.code || session.code;
  navigator.clipboard.writeText(inviteLink(code))
    .then(() => toast("Skopiowano link zaproszenia."))
    .catch(() => toast(`Kod pokoju: ${code}`));
}


function toggleQuizChoice(type, name) {
  const own = quizSelections[type];
  const otherType = type === "favorites" ? "dislikes" : "favorites";
  const other = quizSelections[otherType];

  if (own.has(name)) own.delete(name);
  else {
    if (own.size >= 3) return toast("Możesz wybrać maksymalnie 3 potrawy.");
    other.delete(name);
    own.add(name);
  }
  if (latestState?.status === "quiz") renderQuiz(latestState);
}

function renderChoiceGrid(containerId, foods, type) {
  const selected = quizSelections[type];
  $(containerId).innerHTML = foods.map(food => `
    <button class="food-choice ${selected.has(food.name) ? "selected" : ""}"
      data-type="${type}" data-name="${food.name}">
      <span>${food.emoji}</span>${food.name}
    </button>`).join("");

  $(containerId).querySelectorAll(".food-choice").forEach(button => {
    button.addEventListener("click", () => toggleQuizChoice(button.dataset.type, button.dataset.name));
  });
}

function renderQuiz(state) {
  show("quizScreen");
  const me = state.players[state.viewerIndex];
  renderChoiceGrid("favoriteChoices", state.quizFoods, "favorites");
  renderChoiceGrid("dislikeChoices", state.quizFoods, "dislikes");
  $("favCount").textContent = `${quizSelections.favorites.size}/3`;
  $("dislikeCount").textContent = `${quizSelections.dislikes.size}/3`;
  $("submitQuizBtn").disabled =
    quizSelections.favorites.size !== 3 || quizSelections.dislikes.size !== 3 || me.quizSubmitted;
  $("quizWaiting").classList.toggle("hidden", !me.quizSubmitted);
  $("favoriteChoices").classList.toggle("locked", me.quizSubmitted);
  $("dislikeChoices").classList.toggle("locked", me.quizSubmitted);
}

function render(state) {
  latestState = state;
  $("gameCode").textContent = state.code;

  if (state.status === "waiting") {
    show("waiting");
    $("codeButton").textContent = state.code;
    return;
  }

  if (state.status === "quiz") {
    renderQuiz(state);
    return;
  }

  if (state.status === "finished") {
    renderResults(state);
    return;
  }

  show("game");
  $("roundLabel").textContent = `Runda ${state.round + 1} z ${state.roundCount}`;
  $("foodEmoji").textContent = state.currentItem?.emoji || "🍽️";
  $("foodName").textContent = state.currentItem?.name || "";
  $("currentBid").textContent = `${state.currentBid} 🪙`;
  $("message").textContent = state.message;
  $("turnLabel").textContent = state.players[state.turn]
    ? `Licytuje ${state.players[state.turn].name}`
    : "Oczekiwanie";
  $("bidAmount").min = state.currentBid + 1;
  $("bidAmount").placeholder = `Minimum ${state.currentBid + 1}`;

  state.players.forEach((player, index) => {
    if (!player) return;
    $(`name${index}`).textContent = player.name + (player.isYou ? " (Ty)" : "");
    $(`money${index}`).textContent = player.isYou ? `${player.budget} 🪙` : "Monety ukryte";
    $(`online${index}`).innerHTML = player.connected
      ? '<span class="online">● online</span>'
      : '<span class="offline">● rozłączony</span>';
    $(`player${index}`).classList.toggle("active", index === state.turn);
    $(`items${index}`).innerHTML = player.items.length
      ? player.items.map(item => `<span class="chip" title="Cena: ${item.price}">${item.emoji} ${item.name}</span>`).join("")
      : '<span class="empty">Brak zdobytych potraw</span>';
  });

  const myTurn = state.viewerIndex === state.turn;
  const opponentConnected = state.players[1 - state.viewerIndex]?.connected;
  const canAct = myTurn && opponentConnected;
  $("controls").classList.toggle("hidden", !canAct);
  $("spectatorNote").classList.toggle("hidden", canAct);
  $("spectatorNote").textContent = !opponentConnected
    ? "Drugi gracz jest rozłączony. Czekamy na jego powrót."
    : "Czekasz na ruch drugiego gracza.";
}

function renderResults(state) {
  show("resultsScreen");
  const scores = state.players.map(p => p.score);

  let winnerIndex = null;
  let winnerText;

  if (scores[0] === scores[1]) {
    if (state.players[0].budget === state.players[1].budget) {
      winnerText = "Remis! 🤝";
    } else {
      winnerIndex = state.players[0].budget > state.players[1].budget ? 0 : 1;
      winnerText = `Największy obżartuch: ${state.players[winnerIndex].name}`;
    }
  } else {
    winnerIndex = scores[0] > scores[1] ? 0 : 1;
    winnerText = `Największy obżartuch: ${state.players[winnerIndex].name}`;
  }

  $("winner").innerHTML = winnerIndex === null
    ? winnerText
    : `${winnerText} <span class="dancing-pig" aria-label="Tańcząca świnka">🐷</span>`;

  $("results").innerHTML = state.players.map((player, index) => `
    <article class="result ${index === winnerIndex ? "winner-result" : ""}">
      <h3>
        ${player.name}${player.isYou ? " (Ty)" : ""}
        ${index === winnerIndex ? '<span class="dancing-pig small-pig" aria-label="Tańcząca świnka">🐷</span>' : ""}
      </h3>
      <p><strong>${player.score} punktów</strong>${player.isYou ? ` · zostało ${player.budget} monet` : ""}</p>
      ${player.items.length ? player.items.map(item =>
        `<div class="result-line"><span>${item.emoji} ${item.name}</span><span>${item.value} pkt · ${item.price} 🪙</span></div>`
      ).join("") : '<p class="muted">Brak zdobytych potraw</p>'}
    </article>
  `).join("");

  const me = state.players[state.viewerIndex];
  $("rematchBtn").disabled = me.rematchReady;
  $("rematchBtn").textContent = me.rematchReady ? "Czekamy na przeciwnika…" : "Zagraj ponownie";
  $("rematchWaiting").classList.toggle("hidden", !me.rematchReady);
}

$("createBtn").addEventListener("click", () => {
  socket.emit("create-room", {
    name: $("hostName").value,
    budget: Number($("budget").value),
    rounds: Number($("rounds").value)
  });
});

$("joinBtn").addEventListener("click", () => {
  socket.emit("join-room", {
    name: $("guestName").value,
    code: $("roomCode").value
  });
});

$("bidBtn").addEventListener("click", () => {
  socket.emit("place-bid", { amount: Number($("bidAmount").value) });
  $("bidAmount").value = "";
});

$("bidAmount").addEventListener("keydown", event => {
  if (event.key === "Enter") $("bidBtn").click();
});

$("passBtn").addEventListener("click", () => socket.emit("pass"));
$("rematchBtn").addEventListener("click", () => socket.emit("request-rematch"));
$("leaveAfterGameBtn").addEventListener("click", () => {
  if (confirm("Na pewno chcesz opuścić ten pokój?")) leaveRoom();
});
$("shareBtn").addEventListener("click", copyInvite);
$("submitQuizBtn").addEventListener("click", () => {
  socket.emit("submit-quiz", {
    favorites: [...quizSelections.favorites],
    dislikes: [...quizSelections.dislikes]
  });
});
$("leaveQuizBtn").addEventListener("click", () => {
  if (confirm("Na pewno chcesz opuścić ten pokój?")) leaveRoom();
});
$("leaveWaitingBtn").addEventListener("click", leaveRoom);
$("leaveGameBtn").addEventListener("click", () => {
  if (confirm("Na pewno chcesz opuścić tę grę?")) leaveRoom();
});
$("codeButton").addEventListener("click", copyInvite);


socket.on("left-room", () => {
  returnToMenu();
  toast("Opuszczono pokój.");
});

socket.on("room-created", saveSession);
socket.on("room-joined", data => {
  $("autoJoinInfo").classList.add("hidden");
  saveSession(data);
});
socket.on("state", render);
socket.on("game-error", ({ message }) => {
  $("autoJoinInfo").classList.add("hidden");
  toast(message);
  if (message.includes("nie istnieje") || message.includes("Nieprawidłowy")) {
    localStorage.removeItem("foodAuctionSession");
    session = null;
    show("home");
  }
});
socket.on("session-replaced", () => toast("Gra została otwarta na innym urządzeniu."));
socket.on("connect", () => {
  $("connection").textContent = "Połączono";
  if (session?.code && session?.playerToken) {
    socket.emit("reconnect-player", session);
  } else {
    tryAutoJoinFromLink();
  }
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
