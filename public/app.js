"use strict";

const socket = io();
const $ = id => document.getElementById(id);
let latestState = null;
let session = JSON.parse(localStorage.getItem("foodAuctionSession") || "null");

function show(screen) {
  ["home", "waiting", "game", "resultsScreen"].forEach(id => $(id).classList.toggle("hidden", id !== screen));
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

function render(state) {
  latestState = state;
  $("gameCode").textContent = state.code;

  if (state.status === "waiting") {
    show("waiting");
    $("codeButton").textContent = state.code;
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
    $(`money${index}`).textContent = `${player.budget} 🪙`;
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
  let winner;
  if (scores[0] === scores[1]) {
    if (state.players[0].budget === state.players[1].budget) winner = "Remis! 🤝";
    else winner = `Wygrywa ${state.players[state.players[0].budget > state.players[1].budget ? 0 : 1].name}! 🏆`;
  } else {
    winner = `Wygrywa ${state.players[scores[0] > scores[1] ? 0 : 1].name}! 🏆`;
  }
  $("winner").textContent = winner;
  $("results").innerHTML = state.players.map(player => `
    <article class="result">
      <h3>${player.name}${player.isYou ? " (Ty)" : ""}</h3>
      <p><strong>${player.score} punktów</strong> · zostało ${player.budget} monet</p>
      ${player.items.length ? player.items.map(item =>
        `<div class="result-line"><span>${item.emoji} ${item.name}</span><span>${item.value} pkt · ${item.price} 🪙</span></div>`
      ).join("") : '<p class="muted">Brak zdobytych potraw</p>'}
    </article>
  `).join("");
  localStorage.removeItem("foodAuctionSession");
  session = null;
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
$("shareBtn").addEventListener("click", copyInvite);
$("codeButton").addEventListener("click", copyInvite);
$("againBtn").addEventListener("click", () => {
  localStorage.removeItem("foodAuctionSession");
  session = null;
  history.replaceState({}, "", location.pathname);
  show("home");
});

socket.on("room-created", saveSession);
socket.on("room-joined", saveSession);
socket.on("state", render);
socket.on("game-error", ({ message }) => {
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
  }
});
socket.on("disconnect", () => {
  $("connection").textContent = "Ponowne łączenie…";
});

const roomFromLink = new URLSearchParams(location.search).get("room");
if (roomFromLink && !session) {
  $("roomCode").value = roomFromLink.toUpperCase();
}
