"use strict";

const socket = io();
const $ = id => document.getElementById(id);

let latestState = null;
let quizSelections = { favorites: new Set(), dislikes: new Set() };
let session = JSON.parse(localStorage.getItem("foodAuctionSession") || "null");
let autoJoinAttempted = false;
let pendingInviteCode = null;
let timerAnimation = null;
let pendingPublicRequeue = null;
let deferredInstallPrompt = null;

const CATEGORY_META = {
  mixed: {
    name: "Miks wszystkiego",
    icon: "🎲",
    description: "W tej grze pojawią się elementy ze wszystkich kategorii.",
    winnerIcon: "🐷",
    winnerTitle: "Największy obżartuch",
    slotLabel: "elementy",
    emptyLabel: "Brak zdobytych elementów",
    roundLabel: "Element"
  },
  main: {
    name: "Dania główne",
    icon: "🍝",
    description: "Licytuj dania główne: pizzę, sushi, ramen i wiele innych.",
    winnerIcon: "🐷",
    winnerTitle: "Największy obżartuch",
    slotLabel: "dania",
    emptyLabel: "Brak zdobytych dań",
    roundLabel: "Danie"
  },
  dessert: {
    name: "Desery",
    icon: "🍰",
    description: "Licytuj desery, ciasta, lody i inne słodkości.",
    winnerIcon: "🐷",
    winnerTitle: "Największy obżartuch",
    slotLabel: "desery",
    emptyLabel: "Brak zdobytych deserów",
    roundLabel: "Deser"
  },
  drink: {
    name: "Napoje",
    icon: "🥤",
    description: "Licytuj kawy, soki, koktajle i pozostałe napoje.",
    winnerIcon: "🐷",
    winnerTitle: "Największy obżartuch",
    slotLabel: "napoje",
    emptyLabel: "Brak zdobytych napojów",
    roundLabel: "Napój"
  },
  snack: {
    name: "Przekąski",
    icon: "🍿",
    description: "Licytuj przekąski: frytki, popcorn, nachosy i inne.",
    winnerIcon: "🐷",
    winnerTitle: "Największy obżartuch",
    slotLabel: "przekąski",
    emptyLabel: "Brak zdobytych przekąsek",
    roundLabel: "Przekąska"
  },
  job: {
    name: "Zawody",
    icon: "🧑‍🚀",
    description: "Licytuj zawody: lekarza, pilota, programistę i inne profesje.",
    winnerIcon: "🧑‍🚀",
    winnerTitle: "Mistrz zawodów",
    slotLabel: "zawody",
    emptyLabel: "Brak zdobytych zawodów",
    roundLabel: "Zawód"
  },
  vehicle: {
    name: "Pojazdy",
    icon: "🚗",
    description: "Licytuj pojazdy: samochody, pociągi, samoloty i inne.",
    winnerIcon: "🚗",
    winnerTitle: "Król pojazdów",
    slotLabel: "pojazdy",
    emptyLabel: "Brak zdobytych pojazdów",
    roundLabel: "Pojazd"
  }
};

let selectedCategory = "mixed";


function show(screen) {
  ["home", "nameGate", "waiting", "quizScreen", "countdownScreen", "tournamentBreakScreen", "game", "resultsScreen"]
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
  pendingInviteCode = null;
  $("confirmLinkJoinBtn").disabled = false;
  $("confirmLinkJoinBtn").textContent = "Dołącz do pokoju";
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

  pendingInviteCode = room.toUpperCase();
  $("roomCode").value = pendingInviteCode;
  $("autoJoinInfo").classList.add("hidden");
  show("nameGate");
  setTimeout(() => $("linkPlayerName").focus(), 0);
}


function selectCategory(category) {
  const meta = CATEGORY_META[category] || CATEGORY_META.mixed;
  selectedCategory = category;
  $("auctionCategory").value = category;
  $("selectedCategoryName").textContent = `${meta.icon} ${meta.name}`;
  $("categoryActionTitle").textContent = `${meta.icon} ${meta.name}`;
  $("categoryActionDescription").textContent = meta.description;
  $("publicCategoryPreview").textContent = `${meta.icon} ${meta.name}`;

  document.querySelectorAll(".category-tile").forEach(tile => {
    const isSelected = tile.dataset.category === category;
    tile.classList.toggle("selected", isSelected);
    tile.classList.toggle("expanded", isSelected);
    const expand = tile.querySelector(".category-expand");
    if (expand) expand.textContent = isSelected ? "Wybrano" : "Rozwiń";
  });
}

function createSelectedCategoryRoom() {
  $("createBtn").click();
}

function toggleMode() {
  const mode = $("gameMode").value;
  const bot = mode === "bot";
  const tournament = mode === "tournament";
  $("maxPlayersLabel").classList.toggle("hidden", bot || tournament);
  $("botCountLabel").classList.toggle("hidden", !bot);
  $("tournamentModeInfo").classList.toggle("hidden", !tournament);
  if (tournament) $("maxPlayers").value = "4";
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
  const isPublic = state.mode === "public";
  const isTournament = state.mode === "tournament";
  const categoryMeta = CATEGORY_META[state.category] || CATEGORY_META.mixed;

  $("waitingTitle").innerHTML = isPublic
    ? "🌍 Wyszukiwanie publicznej gry"
    : isTournament
      ? `🏆 Turniej <span id="waitingCode">${state.code}</span>`
      : `Pokój <span id="waitingCode">${state.code}</span>`;

  if (!isPublic) $("waitingCode").textContent = state.code;

  $("waitingCategoryBadge").textContent = `${categoryMeta.icon} ${categoryMeta.name}`;
  $("waitingPlayers").textContent = isPublic
    ? `Znaleziono graczy: ${state.players.length}/${state.maxPlayers}`
    : isTournament
      ? `Zawodników: ${state.players.length}/4`
      : `Graczy: ${state.players.length}/${state.maxPlayers}`;

  $("waitingList").innerHTML = state.players.map(player =>
    `<span class="waiting-player">${player.isBot ? "🤖" : "👤"} ${player.name}</span>`
  ).join("");

  $("shareBtn").classList.toggle("hidden", isPublic);
  $("startRoomBtn").classList.toggle("hidden", isPublic || !state.isHost);
  $("startRoomBtn").disabled = !state.canStart;
  $("leaveWaitingBtn").textContent = isPublic ? "Anuluj wyszukiwanie" : "Opuść pokój";
  $("waitingHint").textContent = isPublic
    ? "Gra rozpocznie się automatycznie, gdy zbierze się wybrana liczba osób."
    : isTournament
      ? "Gospodarz może rozpocząć turniej po dołączeniu dokładnie 4 zawodników."
      : "Gospodarz może rozpocząć po dołączeniu minimum 2 osób.";
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
  const categoryMeta = CATEGORY_META[state.category] || CATEGORY_META.mixed;
  const isTournament = state.mode === "tournament";

  $("playersGrid").innerHTML = state.players.map((player, index) => `
    <article class="card player ${index === state.turn ? "active" : ""} ${state.passed[index] ? "passed" : ""} ${isTournament && !player.inCurrentMatch ? "tournament-spectator" : ""}">
      <div class="player-head">
        <h2>${player.isBot ? "🤖 " : ""}${player.name}${player.isYou ? " (Ty)" : ""}</h2>
        <strong>${player.isYou ? `${player.budget} 🪙` : "Monety ukryte"}</strong>
      </div>
      <div class="presence ${player.connected ? "online" : "offline"}">
        ● ${player.isBot ? "komputer" : player.connected ? "online" : "rozłączony"}
        ${state.passed[index] ? " · pas" : ""}
        ${isTournament && !player.inCurrentMatch
          ? ` · oczekuje · bilans ${player.tournamentStats.wins}-${player.tournamentStats.losses}`
          : ` · ${categoryMeta.slotLabel} ${player.items.length}/${state.maxDishesPerPlayer}`}
      </div>
      <div class="items">
        ${player.items.length
          ? player.items.map(item => `<span class="chip" title="Cena: ${item.price}">${item.emoji} ${item.name}</span>`).join("")
          : `<span class="empty">${categoryMeta.emptyLabel}</span>`}
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



function tournamentPlayerName(state, index) {
  return Number.isInteger(index) && state.players[index] ? state.players[index].name : "—";
}

function renderTournamentBracket(state) {
  const matches = state.tournament?.matches || [];
  const stages = [["semifinal1", "Półfinał 1"], ["semifinal2", "Półfinał 2"], ["bronze", "Mecz o 3. miejsce"], ["final", "Finał"]];
  return stages.map(([stage, label]) => {
    const match = matches.find(entry => entry.stage === stage);
    if (!match) return `<div class="bracket-match pending"><strong>${label}</strong><span>Jeszcze nierozstrzygnięty</span></div>`;
    return `<div class="bracket-match"><strong>${label}</strong><span>${tournamentPlayerName(state, match.players[0])} ${match.scores[0]} : ${match.scores[1]} ${tournamentPlayerName(state, match.players[1])}</span><small>Wygrywa: ${tournamentPlayerName(state, match.winner)}</small></div>`;
  }).join("");
}

function renderTournamentBreak(state) {
  show("tournamentBreakScreen");
  const nextPlayers = state.tournament?.nextPlayers || [];
  $("tournamentBreakTitle").textContent = nextPlayers.length === 2 ? `Następnie: ${tournamentPlayerName(state, nextPlayers[0])} kontra ${tournamentPlayerName(state, nextPlayers[1])}` : "Wynik meczu";
  $("tournamentBreakMessage").textContent = state.message;
  $("tournamentBracket").innerHTML = renderTournamentBracket(state);
}

function renderCountdown(state) {
  show("countdownScreen");

  const value = state.countdownValue;
  $("countdownNumber").textContent = value === 0 ? "START!" : String(value ?? 3);
  $("countdownNumber").classList.toggle("start", value === 0);
  $("countdownMessage").textContent = state.message || "Gra zaraz się rozpocznie.";
  $("countdownScreen").classList.toggle("tournament-countdown", state.mode === "tournament");
}

function renderGame(state) {
  show("game");
  $("gameCode").textContent = state.code;
  const categoryMeta = CATEGORY_META[state.category] || CATEGORY_META.mixed;
  $("gameCategoryBadge").textContent = `${categoryMeta.icon} ${categoryMeta.name}`;
  $("roundLabel").textContent = `${categoryMeta.roundLabel} ${state.round + 1} z ${state.roundCount}`;
  $("foodEmoji").textContent = state.currentItem?.emoji || "🍽️";
  $("foodName").textContent = state.currentItem?.name || "";
  $("currentBid").textContent = `${state.currentBid} 🪙`;
  $("message").textContent = state.message;

  const me = state.players[state.viewerIndex];
  const isTournament = state.mode === "tournament";
  const currentMatchPlayers = state.tournament?.currentPlayers || [];
  const matchNames = currentMatchPlayers.map(index => tournamentPlayerName(state, index));
  $("tournamentMatchBanner").classList.toggle("hidden", !isTournament);
  if (isTournament) $("tournamentMatchBanner").innerHTML = `<strong>🏆 ${state.tournament.stageLabel}</strong><span>${matchNames[0]} kontra ${matchNames[1]}</span>`;
  $("mobileOwnMoney").textContent = `${me.budget} 🪙`;

  const turnPlayer = state.players[state.turn];
  $("turnLabel").textContent = turnPlayer ? `Ruch: ${turnPlayer.name}` : "Oczekiwanie";
  $("bidAmount").min = state.currentBid + 1;
  $("bidAmount").placeholder = `Minimum ${state.currentBid + 1}`;

  renderPlayers(state);

  const myTurn = state.viewerIndex === state.turn;
  const inCurrentMatch = !isTournament || me.inCurrentMatch;
  const canAct = myTurn && inCurrentMatch && me.connected && !state.passed[state.viewerIndex];
  $("controls").classList.toggle("hidden", !canAct);
  $("spectatorNote").classList.toggle("hidden", canAct);
  $("spectatorNote").textContent = isTournament && !me.inCurrentMatch
    ? `Obserwujesz ${state.tournament.stageLabel}. Twój kolejny mecz pojawi się automatycznie.`
    : turnPlayer?.isBot
      ? "Komputer podejmuje decyzję…"
      : `Czekasz na ruch gracza ${turnPlayer?.name || ""}.`;

  animateTimer(state);
}


function renderTournamentResults(state) {
  show("resultsScreen");
  const categoryMeta = CATEGORY_META[state.category] || CATEGORY_META.mixed;
  const ranking = state.tournament?.ranking || [];
  const podiumClasses = ["first", "second", "third"];
  const medals = ["🥇", "🥈", "🥉"];
  const champion = state.players[ranking[0]];
  $("winner").innerHTML = `Mistrz turnieju: ${champion?.name || "—"} <span class="dancing-winner-icon">🏆</span>`;
  $("podium").innerHTML = ranking.slice(0, 3).map((playerIndex, place) => {
    const player = state.players[playerIndex];
    return `<article class="podium-place ${podiumClasses[place]}"><div class="podium-medal">${medals[place]}</div><div class="podium-avatar">${place === 0 ? '<span class="dancing-winner-icon">🏆</span>' : "👤"}</div><h3>${player.name}${player.isYou ? " (Ty)" : ""}</h3><strong>${player.tournamentStats.wins} zwycięstwa</strong><span>${player.tournamentStats.points} pkt w turnieju</span></article>`;
  }).join("");
  $("results").innerHTML = ranking.map((playerIndex, place) => {
    const player = state.players[playerIndex];
    return `<article class="result ${place === 0 ? "winner-result" : ""}"><h3>${place + 1}. ${player.name}${player.isYou ? " (Ty)" : ""}</h3><p><strong>${player.tournamentStats.points} punktów</strong> · bilans ${player.tournamentStats.wins}-${player.tournamentStats.losses}</p><div class="tournament-ranking-stats"><span>Rozegrane mecze: ${player.tournamentStats.wins + player.tournamentStats.losses}</span><span>Wydane monety: ${player.tournamentStats.spent}</span><span>Kategoria: ${categoryMeta.icon} ${categoryMeta.name}</span></div></article>`;
  }).join("");
  const me = state.players[state.viewerIndex];
  $("rematchBtn").disabled = me.rematchReady;
  $("rematchBtn").textContent = me.rematchReady ? "Czekamy na pozostałych zawodników…" : "Zagraj turniej ponownie";
  $("rematchWaiting").classList.toggle("hidden", !me.rematchReady);
}

function renderResults(state) {
  if (state.mode === "tournament" && state.tournament?.complete) {
    renderTournamentResults(state);
    return;
  }
  show("resultsScreen");

  const ranking = state.players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => {
      if (b.player.score !== a.player.score) return b.player.score - a.player.score;
      const aBudget = a.player.isYou ? a.player.budget : 0;
      const bBudget = b.player.isYou ? b.player.budget : 0;
      return bBudget - aBudget;
    });

  const winnerIndex = ranking[0]?.index ?? null;
  const winnerName = winnerIndex === null ? "" : state.players[winnerIndex].name;

  const categoryMeta = CATEGORY_META[state.category] || CATEGORY_META.mixed;
  $("winner").innerHTML = `${categoryMeta.winnerTitle}: ${winnerName}
    <span class="dancing-winner-icon" aria-label="${categoryMeta.winnerTitle}">${categoryMeta.winnerIcon}</span>`;

  const podiumOrder = ranking.slice(0, 3);
  const podiumClasses = ["first", "second", "third"];
  const podiumLabels = ["🥇", "🥈", "🥉"];

  $("podium").innerHTML = podiumOrder.map(({ player, index }, place) => `
    <article class="podium-place ${podiumClasses[place]}">
      <div class="podium-medal">${podiumLabels[place]}</div>
      <div class="podium-avatar">${index === winnerIndex
        ? `<span class="dancing-winner-icon">${categoryMeta.winnerIcon}</span>`
        : player.isBot ? "🤖" : "👤"}</div>
      <h3>${player.name}${player.isYou ? " (Ty)" : ""}</h3>
      <strong>${player.score} pkt</strong>
      <span>${player.items.length}/5 ${categoryMeta.slotLabel}</span>
    </article>
  `).join("");

  $("results").innerHTML = ranking.map(({ player, index }, place) => `
    <article class="result ${index === winnerIndex ? "winner-result" : ""}">
      <h3>${place + 1}. ${player.isBot ? "🤖 " : ""}${player.name}${player.isYou ? " (Ty)" : ""}</h3>
      <p><strong>${player.score} punktów</strong>${player.isYou ? ` · zostało ${player.budget} monet` : ""}</p>
      ${player.items.length
        ? player.items.map(item => `<div class="result-line"><span>${item.emoji} ${item.name}</span><span>${item.value} pkt · ${item.price} 🪙</span></div>`).join("")
        : `<p class="muted">${categoryMeta.emptyLabel}</p>`}
    </article>
  `).join("");

  const me = state.players[state.viewerIndex];

  if (state.mode === "public") {
    $("rematchBtn").disabled = false;
    $("rematchBtn").textContent = "Znajdź kolejnych graczy";
    $("rematchWaiting").classList.add("hidden");
  } else {
    $("rematchBtn").disabled = me.rematchReady;
    $("rematchBtn").textContent = me.rematchReady ? "Czekamy na pozostałych…" : "Zagraj ponownie";
    $("rematchWaiting").classList.toggle("hidden", !me.rematchReady);
  }
}

function render(state) {
  latestState = state;
  if (state.status === "waiting") return renderWaiting(state);
  if (state.status === "quiz") return renderQuiz(state);
  if (state.status === "countdown") return renderCountdown(state);
  if (state.status === "tournament-break") return renderTournamentBreak(state);
  if (state.status === "playing") return renderGame(state);
  if (state.status === "finished") return renderResults(state);
}


function joinFromInviteLink() {
  const name = $("linkPlayerName").value.trim();
  if (!name) {
    toast("Wpisz swoją nazwę gracza.");
    $("linkPlayerName").focus();
    return;
  }
  if (!pendingInviteCode || autoJoinAttempted) return;

  autoJoinAttempted = true;
  $("confirmLinkJoinBtn").disabled = true;
  $("confirmLinkJoinBtn").textContent = "Dołączanie…";

  socket.emit("join-room", {
    name,
    code: pendingInviteCode
  });
}

$("confirmLinkJoinBtn").addEventListener("click", joinFromInviteLink);
$("linkPlayerName").addEventListener("keydown", event => {
  if (event.key === "Enter") joinFromInviteLink();
});


document.querySelectorAll(".category-tile").forEach(tile => {
  tile.addEventListener("click", () => selectCategory(tile.dataset.category));
});

$("createCategoryRoomBtn").addEventListener("click", createSelectedCategoryRoom);


function findPublicGame(settings = null) {
  const name = settings?.name || $("publicPlayerName").value.trim();
  const maxPlayers = settings?.maxPlayers || Number($("publicPlayerCount").value);
  const category = settings?.category || $("auctionCategory").value;

  if (!name) {
    toast("Wpisz swoją nazwę gracza.");
    $("publicPlayerName").focus();
    return;
  }

  $("findPublicGameBtn").disabled = true;
  $("findPublicGameBtn").textContent = "Szukamy graczy…";

  socket.emit("find-public-game", {
    name,
    maxPlayers,
    category
  });
}

$("findPublicGameBtn").addEventListener("click", () => findPublicGame());
$("publicPlayerName").addEventListener("keydown", event => {
  if (event.key === "Enter") findPublicGame();
});


function currentFeedbackContext() {
  return {
    category: latestState?.category || selectedCategory || "nieznana",
    mode: latestState?.mode || $("gameMode")?.value || "nieznany"
  };
}

function setFeedbackStatus(message, isError = false) {
  $("feedbackStatus").textContent = message;
  $("feedbackStatus").classList.remove("hidden", "error", "success");
  $("feedbackStatus").classList.add(isError ? "error" : "success");
}

async function submitFeedback(event) {
  event.preventDefault();

  const selectedRating = document.querySelector(
    'input[name="feedbackRating"]:checked'
  );

  const payload = {
    nickname: $("feedbackNickname").value.trim(),
    rating: selectedRating ? Number(selectedRating.value) : 0,
    liked: $("feedbackLiked").value.trim(),
    suggestions: $("feedbackSuggestions").value.trim(),
    ...currentFeedbackContext()
  };

  if (!payload.rating) {
    setFeedbackStatus("Wybierz ocenę od 1 do 5 gwiazdek.", true);
    return;
  }

  if (!payload.liked && !payload.suggestions) {
    setFeedbackStatus("Napisz, co Ci się podoba albo co warto poprawić.", true);
    return;
  }

  $("submitFeedbackBtn").disabled = true;
  $("submitFeedbackBtn").textContent = "Wysyłanie…";

  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Nie udało się wysłać opinii.");

    setFeedbackStatus(result.message || "Dziękujemy za opinię!");
    $("feedbackForm").reset();
    $("likedCounter").textContent = "0";
    $("suggestionsCounter").textContent = "0";
  } catch (error) {
    setFeedbackStatus(error.message || "Nie udało się wysłać opinii.", true);
  } finally {
    $("submitFeedbackBtn").disabled = false;
    $("submitFeedbackBtn").textContent = "Wyślij opinię";
  }
}


$("feedbackForm").addEventListener("submit", submitFeedback);
$("feedbackLiked").addEventListener("input", () => {
  $("likedCounter").textContent = String($("feedbackLiked").value.length);
});
$("feedbackSuggestions").addEventListener("input", () => {
  $("suggestionsCounter").textContent = String($("feedbackSuggestions").value.length);
});


function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function installPromptDismissedRecently() {
  const dismissedAt = Number(localStorage.getItem("arenaInstallDismissedAt") || 0);
  return dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000;
}

function updateInstallPanel() {
  const panel = $("installAppPanel");
  if (!panel) return;

  if (isStandaloneApp() || installPromptDismissedRecently()) {
    panel.classList.add("hidden");
    return;
  }

  const ios = isIosDevice();

  if (deferredInstallPrompt) {
    $("installAppBtn").textContent = "Zainstaluj aplikację";
    $("iosInstallInstructions").classList.add("hidden");
    panel.classList.remove("hidden");
    return;
  }

  if (ios) {
    $("installAppBtn").textContent = "Pokaż instrukcję";
    panel.classList.remove("hidden");
    return;
  }

  panel.classList.add("hidden");
}

async function installMobileApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    updateInstallPanel();
    return;
  }

  if (isIosDevice()) {
    $("iosInstallInstructions").classList.toggle("hidden");
  }
}

function updateOnlineStatus() {
  $("offlineBanner").classList.toggle("hidden", navigator.onLine);
}

function registerArenaServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js")
      .then(registration => registration.update())
      .catch(error => console.warn("Nie udało się uruchomić trybu aplikacji:", error));
  });
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallPanel();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  $("installAppPanel")?.classList.add("hidden");
  toast("Aplikacja została zainstalowana.");
});

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);



$("installAppBtn").addEventListener("click", installMobileApp);
$("dismissInstallBtn").addEventListener("click", () => {
  localStorage.setItem("arenaInstallDismissedAt", String(Date.now()));
  $("installAppPanel").classList.add("hidden");
});

$("gameMode").addEventListener("change", toggleMode);
$("createBtn").addEventListener("click", () => {
  socket.emit("create-room", {
    name: $("hostName").value,
    mode: $("gameMode").value,
    category: $("auctionCategory").value,
    budget: Number($("budget").value),
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
$("rematchBtn").addEventListener("click", () => {
  if (latestState?.mode === "public") {
    const me = latestState.players[latestState.viewerIndex];
    pendingPublicRequeue = {
      name: me.name,
      category: latestState.category,
      maxPlayers: latestState.maxPlayers
    };
    leaveRoom();
    return;
  }

  socket.emit("request-rematch");
});
$("leaveAfterGameBtn").addEventListener("click", () => confirm("Opuścić pokój?") && leaveRoom());

socket.on("matchmaking-joined", data => {
  $("findPublicGameBtn").disabled = false;
  $("findPublicGameBtn").textContent = "Znajdź publiczną grę";
  saveSession(data);
});

socket.on("room-created", saveSession);
socket.on("room-joined", data => {
  $("autoJoinInfo").classList.add("hidden");
  $("confirmLinkJoinBtn").disabled = false;
  $("confirmLinkJoinBtn").textContent = "Dołącz do pokoju";
  pendingInviteCode = null;
  saveSession(data);
});
socket.on("state", render);
socket.on("left-room", () => {
  const requeue = pendingPublicRequeue;
  pendingPublicRequeue = null;

  returnToMenu();

  if (requeue) {
    $("publicPlayerName").value = requeue.name;
    $("publicPlayerCount").value = String(requeue.maxPlayers);
    selectCategory(requeue.category);
    findPublicGame(requeue);
    return;
  }

  toast("Opuszczono pokój.");
});
socket.on("game-error", ({ message }) => {
  $("autoJoinInfo").classList.add("hidden");
  $("findPublicGameBtn").disabled = false;
  $("findPublicGameBtn").textContent = "Znajdź publiczną grę";
  $("confirmLinkJoinBtn").disabled = false;
  $("confirmLinkJoinBtn").textContent = "Dołącz do pokoju";
  autoJoinAttempted = false;
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
  pendingInviteCode = roomFromLink.toUpperCase();
  $("roomCode").value = pendingInviteCode;
  tryAutoJoinFromLink();
}
toggleMode();
selectCategory("mixed");
updateOnlineStatus();
updateInstallPanel();
registerArenaServiceWorker();
