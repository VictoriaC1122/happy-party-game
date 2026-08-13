const STORAGE_KEY = "happy-party-profile-v1";
const CONSENT_KEY = "happy-party-consent-v1";
const HOST_PEER_PREFIX = "happy-party-host-";

const APP = {
  dom: {},
  role: null,
  peer: null,
  hostConn: null,
  hostConnections: new Map(),
  hostRoom: null,
  playerSnapshot: null,
  roomCode: "",
  hostPeerId: "",
  selfId: "",
  selectedAvatar: AVATARS[0],
  pendingRoomCode: "",
  countdownTimer: null,
  hostDeadlineTimer: null,
  hostIntervalTimer: null,
  hostSyncTimer: null,
  joinAttemptTimer: null,
  localPending: {
    submission: null,
    utility: null,
    roundStartedAt: null
  }
};

const ROUND_EVENT_DECK = [
  {
    blockedActions: ["oral_condom"],
    badge: "現場缺貨",
    detail: "這一局現場沒有可用的口交保護用品，無法選擇「戴套口交」。"
  },
  {
    blockedActions: ["oral_condom"],
    badge: "對方臨時改口",
    detail: "這一局對方臨時不接受這種保護方式，無法選擇「戴套口交」。"
  },
  {
    blockedActions: ["oral_condom"],
    badge: "節奏太亂",
    detail: "這一局現場節奏太混亂，無法安排到「戴套口交」這條路線。"
  }
];

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  cacheDom();
  bindDomEvents();
  renderAvatarPicker();
  hydrateStoredProfile();
  hydrateConsent();
  hydrateRoomQuery();
  renderActionButtons();
  switchScreen("consent-screen");
}

function cacheDom() {
  APP.dom = {
    screens: Array.from(document.querySelectorAll(".screen")),
    consentCheckbox: document.getElementById("consent-checkbox"),
    consentContinue: document.getElementById("consent-continue"),
    createRoomBtn: document.getElementById("create-room-btn"),
    gotoJoinBtn: document.getElementById("goto-join-btn"),
    joinBackBtn: document.getElementById("join-back-btn"),
    joinForm: document.getElementById("join-form"),
    joinSubmitBtn: document.querySelector("#join-form button[type='submit']"),
    roomCodeInput: document.getElementById("room-code-input"),
    playerNameInput: document.getElementById("player-name-input"),
    hostNameInput: document.getElementById("host-name-input"),
    avatarPicker: document.getElementById("avatar-picker"),
    lobbyTitle: document.getElementById("lobby-title"),
    phasePill: document.getElementById("phase-pill"),
    roomCodeDisplay: document.getElementById("room-code-display"),
    joinLinkDisplay: document.getElementById("join-link-display"),
    qrWrap: document.getElementById("qr-wrap"),
    qrCode: document.getElementById("qr-code"),
    copyLinkBtn: document.getElementById("copy-link-btn"),
    startGameBtn: document.getElementById("start-game-btn"),
    hostControls: document.getElementById("host-controls"),
    playerCountDisplay: document.getElementById("player-count-display"),
    playerList: document.getElementById("player-list"),
    roundTitle: document.getElementById("round-title"),
    timerPill: document.getElementById("timer-pill"),
    selfRolePill: document.getElementById("self-role-pill"),
    desireValue: document.getElementById("desire-value"),
    anxietyValue: document.getElementById("anxiety-value"),
    intimacyValue: document.getElementById("intimacy-value"),
    testkitValue: document.getElementById("testkit-value"),
    desireBar: document.getElementById("desire-bar"),
    anxietyBar: document.getElementById("anxiety-bar"),
    panicWarning: document.getElementById("panic-warning"),
    partnerAvatar: document.getElementById("partner-avatar"),
    partnerName: document.getElementById("partner-name"),
    partnerFlirt: document.getElementById("partner-flirt"),
    partnerTags: document.getElementById("partner-tags"),
    chatBtn: document.getElementById("chat-btn"),
    testBtn: document.getElementById("test-btn"),
    hospitalBtn: document.getElementById("hospital-btn"),
    actionButtons: document.getElementById("action-buttons"),
    submittedActionLabel: document.getElementById("submitted-action-label"),
    submissionHint: document.getElementById("submission-hint"),
    summaryTitle: document.getElementById("summary-title"),
    summaryBody: document.getElementById("summary-body"),
    summaryExtra: document.getElementById("summary-extra"),
    summaryPhasePill: document.getElementById("summary-phase-pill"),
    scoreboard: document.getElementById("scoreboard"),
    hostNextRoundBtn: document.getElementById("host-next-round-btn"),
    awardsTitle: document.getElementById("awards-title"),
    finaleHeading: document.getElementById("finale-heading"),
    finaleBody: document.getElementById("finale-body"),
    podiumStage: document.getElementById("podium-stage"),
    awardsList: document.getElementById("awards-list"),
    restartBtn: document.getElementById("restart-btn"),
    toast: document.getElementById("toast")
  };
}

function bindDomEvents() {
  APP.dom.consentCheckbox.addEventListener("change", () => {
    const checked = APP.dom.consentCheckbox.checked;
    APP.dom.consentContinue.disabled = !checked;
  });

  APP.dom.consentContinue.addEventListener("click", () => {
    localStorage.setItem(CONSENT_KEY, "yes");
    if (APP.pendingRoomCode) {
      switchScreen("join-screen");
      APP.dom.roomCodeInput.value = APP.pendingRoomCode;
      APP.dom.playerNameInput.focus();
      return;
    }
    switchScreen("mode-screen");
  });

  APP.dom.gotoJoinBtn.addEventListener("click", () => {
    switchScreen("join-screen");
    APP.dom.playerNameInput.focus();
  });

  APP.dom.joinBackBtn.addEventListener("click", () => {
    switchScreen("mode-screen");
  });

  APP.dom.createRoomBtn.addEventListener("click", handleCreateRoom);
  APP.dom.joinForm.addEventListener("submit", handleJoinSubmit);
  APP.dom.copyLinkBtn.addEventListener("click", copyJoinLink);
  APP.dom.startGameBtn.addEventListener("click", startHostedGame);
  APP.dom.chatBtn.addEventListener("click", handleChatReveal);
  APP.dom.testBtn.addEventListener("click", handleUseTestkit);
  APP.dom.hospitalBtn.addEventListener("click", () => submitAction("hospital"));
  APP.dom.hostNextRoundBtn.addEventListener("click", handleHostAdvance);
  APP.dom.restartBtn.addEventListener("click", restartApp);
}

function hydrateConsent() {
  const accepted = localStorage.getItem(CONSENT_KEY) === "yes";
  APP.dom.consentCheckbox.checked = accepted;
  APP.dom.consentContinue.disabled = !accepted;
}

function hydrateRoomQuery() {
  const params = new URLSearchParams(window.location.search);
  const room = sanitizeRoomCode(params.get("room") || "");
  if (!room) {
    return;
  }
  APP.pendingRoomCode = room;
}

function hydrateStoredProfile() {
  const profile = loadStoredProfile();
  APP.selectedAvatar = sanitizeAvatar(profile.avatar);
  APP.dom.playerNameInput.value = profile.name || "";
  APP.dom.hostNameInput.value = profile.name || "";
  highlightAvatarChip(APP.selectedAvatar);
}

function renderAvatarPicker() {
  APP.dom.avatarPicker.innerHTML = "";
  AVATARS.forEach((avatar) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "avatar-chip";
    button.dataset.avatar = avatar;
    button.textContent = avatar;
    button.addEventListener("click", () => {
      APP.selectedAvatar = avatar;
      highlightAvatarChip(avatar);
    });
    APP.dom.avatarPicker.appendChild(button);
  });
}

function highlightAvatarChip(avatar) {
  const chips = Array.from(APP.dom.avatarPicker.querySelectorAll(".avatar-chip"));
  chips.forEach((chip) => {
    chip.classList.toggle("selected", chip.dataset.avatar === avatar);
  });
}

function renderActionButtons() {
  APP.dom.actionButtons.innerHTML = "";
  ["oral_condom", "sex_condom", "oral_raw", "sex_raw", "refuse"].forEach((actionKey) => {
    const action = ACTIONS[actionKey];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-option";
    button.dataset.action = actionKey;
    button.innerHTML = `<strong>${action.label}</strong><span>${action.description}</span>`;
    button.addEventListener("click", () => submitAction(actionKey));
    APP.dom.actionButtons.appendChild(button);
  });
}

function switchScreen(screenId) {
  APP.dom.screens.forEach((screen) => {
    const active = screen.id === screenId;
    screen.classList.toggle("hidden", !active);
    screen.classList.toggle("active", active);
  });
}

function showToast(message) {
  APP.dom.toast.textContent = message;
  APP.dom.toast.classList.remove("hidden");
  clearTimeout(APP.dom.toast._timer);
  APP.dom.toast._timer = setTimeout(() => {
    APP.dom.toast.classList.add("hidden");
  }, 2600);
}

function loadStoredProfile() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (error) {
    return {};
  }
}

function saveStoredProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function currentProfile() {
  const stored = loadStoredProfile();
  return {
    name: sanitizeName(stored.name || ""),
    avatar: sanitizeAvatar(stored.avatar || APP.selectedAvatar)
  };
}

function sanitizeName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
}

function sanitizeAvatar(value) {
  return AVATARS.includes(value) ? value : AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

function sanitizeRoomCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function randomId(length = 10) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

function shuffle(list) {
  const array = [...list];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function handleCreateRoom() {
  const existing = currentProfile();
  const typedName = sanitizeName(APP.dom.hostNameInput.value);
  const name = typedName || existing.name || "主持人";

  const profile = {
    name,
    avatar: sanitizeAvatar(existing.avatar || APP.selectedAvatar)
  };
  saveStoredProfile(profile);
  APP.selectedAvatar = profile.avatar;
  APP.dom.playerNameInput.value = profile.name;
  APP.dom.hostNameInput.value = profile.name;
  highlightAvatarChip(profile.avatar);

  if (!typedName && !existing.name) {
    showToast("未填主持暱稱，已套用預設「主持人」。");
  }

  destroyPeerState();
  attemptCreateHostPeer(profile, 0);
}

function attemptCreateHostPeer(profile, attempts) {
  const roomCode = generateRoomCode();
  const hostPeerId = `${HOST_PEER_PREFIX}${roomCode}`;
  const peer = new Peer(hostPeerId);

  peer.on("open", (id) => {
    APP.role = "host";
    APP.peer = peer;
    APP.selfId = id;
    APP.roomCode = roomCode;
    APP.hostPeerId = hostPeerId;
    APP.hostRoom = createHostRoom(profile);
    wireHostPeer(peer);
    renderHostSnapshot();
    switchScreen("lobby-screen");
    showToast("主持房間已建立，現在可以讓玩家掃碼加入。");
  });

  peer.on("error", (error) => {
    if (error.type === "unavailable-id" && attempts < 6) {
      peer.destroy();
      attemptCreateHostPeer(profile, attempts + 1);
      return;
    }
    showToast(`建立房間失敗：${error.type || error.message}`);
  });
}

function createHostRoom(profile) {
  const hostPlayer = createPlayerState(APP.selfId, profile, true);
  return {
    hostId: APP.selfId,
    roomCode: APP.roomCode,
    phase: "lobby",
    roundIndex: 0,
    roundCount: GAME_CONFIG.roundCount,
    round: null,
    summary: null,
    finale: null,
    finalResults: null,
    initialCarrierIds: [],
    pairSchedule: [],
    players: {
      [APP.selfId]: hostPlayer
    }
  };
}

function wireHostPeer(peer) {
  peer.on("connection", (conn) => {
    conn.on("open", () => {
      conn.on("data", (data) => handleHostMessage(conn, data));
      conn.on("close", () => handleHostDisconnect(conn.peer));
      conn.on("error", () => handleHostDisconnect(conn.peer));
    });
  });
}

function createPlayerState(id, profile, isHost = false) {
  return {
    id,
    name: sanitizeName(profile.name || `玩家${Math.floor(Math.random() * 999)}`),
    avatar: sanitizeAvatar(profile.avatar),
    isHost,
    online: true,
    joinedAt: Date.now(),
    desire: GAME_CONFIG.startDesire,
    anxiety: GAME_CONFIG.startAnxiety,
    intimacyCount: 0,
    testkits: 1,
    isCarrier: false,
    isInfected: false,
    detectedSelf: false,
    infectionSourceId: null,
    infectionRound: null,
    transmissionCount: 0,
    persona: null,
    history: [],
    stats: {
      chats: 0,
      tests: 0,
      hospitals: 0,
      successfulIntimacies: 0,
      riskyActions: 0,
      correctLeaves: 0,
      closeCalls: 0,
      failedAttempts: 0
    }
  };
}

function handleJoinSubmit(event) {
  event.preventDefault();
  const roomCode = sanitizeRoomCode(APP.dom.roomCodeInput.value);
  const name = sanitizeName(APP.dom.playerNameInput.value);
  const avatar = sanitizeAvatar(APP.selectedAvatar);

  if (!roomCode) {
    showToast("請輸入有效房號。");
    return;
  }
  if (!name) {
    showToast("請輸入你的暱稱。");
    return;
  }

  saveStoredProfile({ name, avatar });
  destroyPeerState();
  setJoinFormBusy(true, "正在連線…");
  showToast("正在連線房間，請稍候。");
  createPlayerPeer(roomCode, { name, avatar });
}

function createPlayerPeer(roomCode, profile) {
  const peerId = `happy-party-player-${randomId(12)}`;
  const peer = new Peer(peerId);

  peer.on("open", (id) => {
    APP.role = "player";
    APP.peer = peer;
    APP.selfId = id;
    APP.roomCode = roomCode;
    APP.hostPeerId = `${HOST_PEER_PREFIX}${roomCode}`;
    APP.playerSnapshot = null;
    renderJoiningLobby(profile, roomCode, "正在連線");
    startJoinAttemptTimeout();
    wirePlayerPeer(profile);
  });

  peer.on("error", (error) => {
    clearJoinAttemptState();
    if (!APP.playerSnapshot) {
      switchScreen("join-screen");
    }
    showToast(`加入房間失敗：${error.type || error.message}`);
  });
}

function wirePlayerPeer(profile) {
  const conn = APP.peer.connect(APP.hostPeerId, { reliable: true });
  APP.hostConn = conn;

  conn.on("open", () => {
    renderJoiningLobby(profile, APP.roomCode, "等待主持人回應");
    startJoinAttemptTimeout();
    conn.send({
      type: "join-request",
      payload: {
        name: profile.name,
        avatar: profile.avatar
      }
    });
  });

  conn.on("data", handlePlayerMessage);
  conn.on("close", () => {
    clearLocalPendingState();
    clearJoinAttemptState();
    if (!APP.playerSnapshot) {
      switchScreen("join-screen");
    }
    showToast("與主持人斷線，請重新加入房間。");
  });
  conn.on("error", () => {
    clearLocalPendingState();
    clearJoinAttemptState();
    if (!APP.playerSnapshot) {
      switchScreen("join-screen");
    }
    showToast("連線中斷，請重新整理後再加入。");
  });
}

function handleHostMessage(conn, packet) {
  if (!packet || typeof packet.type !== "string") {
    return;
  }

  if (packet.type === "join-request") {
    const room = APP.hostRoom;
    if (!room || room.phase !== "lobby") {
      conn.send({ type: "join-rejected", reason: "比賽已經開始，暫時無法加入。" });
      conn.close();
      return;
    }

    const currentCount = activeLobbyPlayers(room).length;
    if (currentCount >= GAME_CONFIG.maxPlayers) {
      conn.send({ type: "join-rejected", reason: "房間已滿。" });
      conn.close();
      return;
    }

    const playerId = conn.peer;
    APP.hostConnections.set(playerId, conn);
    room.players[playerId] = createPlayerState(playerId, packet.payload || {}, false);
    hostSyncAll();
    return;
  }

  const playerId = conn.peer;
  if (!APP.hostRoom || !APP.hostRoom.players[playerId]) {
    return;
  }

  if (packet.type === "submit-action") {
    hostReceiveAction(playerId, packet.action);
    return;
  }

  if (packet.type === "chat-reveal") {
    hostRevealTag(playerId);
    return;
  }

  if (packet.type === "use-testkit") {
    hostUseTestkit(playerId);
  }
}

function handleHostDisconnect(playerId) {
  const room = APP.hostRoom;
  APP.hostConnections.delete(playerId);
  if (!room || !room.players[playerId]) {
    return;
  }

  if (room.phase === "lobby") {
    delete room.players[playerId];
  } else {
    room.players[playerId].online = false;
  }
  hostSyncAll({ immediate: true });
}

function handlePlayerMessage(packet) {
  if (!packet || typeof packet.type !== "string") {
    return;
  }

  if (packet.type === "join-rejected") {
    clearLocalPendingState();
    clearJoinAttemptState();
    showToast(packet.reason || "主持人拒絕加入。");
    switchScreen("join-screen");
    return;
  }

  if (packet.type === "toast") {
    showToast(packet.message);
    return;
  }

  if (packet.type === "snapshot") {
    clearJoinAttemptState();
    APP.playerSnapshot = packet.snapshot;
    reconcileLocalPendingState(packet.snapshot);
    renderPlayerSnapshot();
  }
}

function activeLobbyPlayers(room) {
  return Object.values(room.players).filter((player) => player.online !== false);
}

function getGamePlayerIds(room) {
  return Object.keys(room.players);
}

function hostSyncAll(options = {}) {
  if (options.immediate) {
    flushHostSync();
    return;
  }
  if (APP.hostSyncTimer) {
    return;
  }
  APP.hostSyncTimer = setTimeout(() => {
    flushHostSync();
  }, 40);
}

function flushHostSync() {
  clearTimeout(APP.hostSyncTimer);
  APP.hostSyncTimer = null;
  if (!APP.hostRoom) {
    return;
  }
  renderHostSnapshot();
  APP.hostConnections.forEach((conn, playerId) => {
    if (conn.open && APP.hostRoom.players[playerId]) {
      conn.send({
        type: "snapshot",
        snapshot: buildSnapshotForPlayer(playerId)
      });
    }
  });
}

function renderHostSnapshot() {
  if (!APP.hostRoom) {
    return;
  }
  renderSnapshot(buildSnapshotForPlayer(APP.selfId));
}

function renderPlayerSnapshot() {
  if (!APP.playerSnapshot) {
    return;
  }
  renderSnapshot(APP.playerSnapshot);
}

function renderJoiningLobby(profile, roomCode, phaseLabel) {
  APP.dom.lobbyTitle.textContent = "正在加入房間…";
  APP.dom.phasePill.textContent = phaseLabel;
  APP.dom.roomCodeDisplay.textContent = roomCode;
  APP.dom.joinLinkDisplay.textContent = "等待主持人確認後顯示";
  APP.dom.playerCountDisplay.textContent = "…";
  APP.dom.startGameBtn.disabled = true;
  APP.dom.hostControls.classList.add("hidden");
  APP.dom.qrWrap.classList.add("hidden");
  APP.dom.playerList.innerHTML = `
    <article class="player-row">
      <div class="player-avatar">${escapeHtml(profile.avatar)}</div>
      <div class="player-meta">
        <strong>${escapeHtml(profile.name)}</strong>
        <span>正在與主持人同步入場資料</span>
      </div>
      <span class="phase-pill subtle">連線中</span>
    </article>
  `;
  switchScreen("lobby-screen");
}

function buildSnapshotForPlayer(playerId) {
  const room = APP.hostRoom;
  const me = room.players[playerId];
  const publicPlayers = Object.values(room.players)
    .sort((left, right) => left.joinedAt - right.joinedAt)
    .map((player) => {
      const result = room.finalResults ? room.finalResults[player.id] : null;
      return {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        isHost: player.isHost,
        online: player.online !== false,
        intimacyCount: player.intimacyCount,
        result
      };
    });

  const snapshot = {
    role: playerId === room.hostId ? "host" : "player",
    phase: room.phase,
    roomCode: room.roomCode,
    roundIndex: room.roundIndex,
    roundCount: room.roundCount,
    canStart: room.phase === "lobby" && activeLobbyPlayers(room).length >= GAME_CONFIG.minPlayers,
    joinLink: buildJoinLink(room.roomCode),
    players: publicPlayers,
    self: {
      id: me.id,
      name: me.name,
      avatar: me.avatar,
      desire: me.desire,
      anxiety: me.anxiety,
      intimacyCount: me.intimacyCount,
      testkits: me.testkits,
      isCarrier: me.isCarrier,
      detectedSelf: me.detectedSelf,
      detectedInfected: me.detectedSelf ? me.isInfected : null
    }
  };

  if (room.phase === "round" && room.round) {
    const partnerId = room.round.pairMap[playerId] || null;
    const pairedPlayerIds = Object.keys(room.round.pairMap).filter((id) => room.round.pairMap[id]);
    snapshot.round = {
      startedAt: room.round.startedAt,
      deadlineAt: room.round.deadlineAt,
      partnerId,
      partner: partnerId ? buildPartnerView(playerId, partnerId) : null,
      submission: room.round.submissions[playerId] || null,
      availableActions: getAllowedActionsForPlayer(playerId),
      submissionProgress: {
        submittedCount: pairedPlayerIds.filter((id) => Boolean(room.round.submissions[id])).length,
        totalCount: pairedPlayerIds.length
      }
    };
  }

  if (room.phase === "summary" && room.summary) {
    snapshot.summary = {
      private: room.summary.private[playerId] || fallbackSummary(),
      publicStats: room.summary.publicStats,
      canAdvance: playerId === room.hostId,
      isFinalRound: room.roundIndex >= room.roundCount
    };
  }

  if (room.phase === "awards" && room.finale) {
    snapshot.finale = {
      heading: room.finale.heading,
      body: room.finale.body,
      podium: room.finale.podium,
      awards: room.finale.awards,
      selfResult: room.finalResults[playerId]
    };
  }

  return snapshot;
}

function buildJoinLink(roomCode) {
  const base = new URL(window.location.href);
  base.search = "";
  base.hash = "";
  base.searchParams.set("room", roomCode);
  return base.toString();
}

function buildPartnerView(playerId, partnerId) {
  const room = APP.hostRoom;
  const partner = room.players[partnerId];
  const privateState = room.round.private[playerId];
  const tags = partner.persona.tags.map((tag, index) => {
    const hidden = privateState.hiddenIndices.includes(index) && !privateState.revealedIndices.includes(index);
    return {
      id: tag.id,
      text: tag.text,
      clue: tag.clue,
      color: tag.color,
      hidden
    };
  });

  return {
    id: partner.id,
    name: partner.name,
    avatar: partner.avatar,
    flirt: partner.persona.flirt,
    testedResult: privateState.testedResult,
    roundNotice: privateState.roundNotice,
    constraints: partner.persona.constraints,
    tags
  };
}

function fallbackSummary() {
  return {
    title: "本局已結束",
    body: "等待主持人推進下一局。",
    chips: [],
    notes: []
  };
}

function renderSnapshot(snapshot) {
  if (snapshot.phase === "lobby") {
    renderLobby(snapshot);
    switchScreen("lobby-screen");
    return;
  }
  if (snapshot.phase === "round") {
    renderRound(snapshot);
    switchScreen("round-screen");
    return;
  }
  if (snapshot.phase === "summary") {
    renderSummary(snapshot);
    switchScreen("summary-screen");
    return;
  }
  if (snapshot.phase === "awards") {
    renderAwards(snapshot);
    switchScreen("awards-screen");
  }
}

function renderLobby(snapshot) {
  APP.dom.lobbyTitle.textContent = snapshot.role === "host" ? "等待玩家就位" : "已加入房間，等待主持人開始";
  APP.dom.phasePill.textContent = "Lobby";
  APP.dom.roomCodeDisplay.textContent = snapshot.roomCode;
  APP.dom.joinLinkDisplay.textContent = snapshot.joinLink;
  APP.dom.playerCountDisplay.textContent = String(snapshot.players.length);
  APP.dom.startGameBtn.disabled = !snapshot.canStart;
  APP.dom.hostControls.classList.toggle("hidden", snapshot.role !== "host");

  if (snapshot.role === "host") {
    APP.dom.qrWrap.classList.remove("hidden");
    renderQrCode(snapshot.joinLink);
  } else {
    APP.dom.qrWrap.classList.add("hidden");
  }

  APP.dom.playerList.innerHTML = "";
  snapshot.players.forEach((player) => {
    const row = document.createElement("article");
    row.className = `player-row${player.online ? "" : " offline"}`;
    row.innerHTML = `
      <div class="player-avatar">${player.avatar}</div>
      <div class="player-meta">
        <strong>${escapeHtml(player.name)}</strong>
        <span>${player.isHost ? "主持人" : "玩家"}${player.online ? "" : " · 離線"}</span>
      </div>
      <span class="phase-pill subtle">${player.online ? "已就位" : "中斷"}</span>
    `;
    APP.dom.playerList.appendChild(row);
  });
}

function renderQrCode(link) {
  if (!window.QRCode) {
    return;
  }
  if (APP.dom.qrCode.dataset.value === link) {
    return;
  }
  APP.dom.qrCode.innerHTML = "";
  APP.dom.qrCode.dataset.value = link;
  QRCode.toCanvas(link, {
    width: 180,
    margin: 1,
    color: {
      dark: "#23160c",
      light: "#fff6eb"
    }
  }, (error, canvas) => {
    if (!error && canvas) {
      APP.dom.qrCode.appendChild(canvas);
    }
  });
}

function renderRound(snapshot) {
  const self = snapshot.self;
  const round = snapshot.round;
  const pendingSubmission = snapshot.role === "player" ? APP.localPending.submission : null;
  const pendingUtility = snapshot.role === "player" ? APP.localPending.utility : null;
  const effectiveSubmission = round.submission || pendingSubmission;
  const isLocked = Boolean(effectiveSubmission || pendingUtility);
  APP.dom.roundTitle.textContent = `第 ${snapshot.roundIndex} 局 / ${snapshot.roundCount}`;
  APP.dom.selfRolePill.textContent = describeRolePill(self);
  APP.dom.desireValue.textContent = `${self.desire}%`;
  APP.dom.anxietyValue.textContent = `${self.anxiety}%`;
  APP.dom.intimacyValue.textContent = String(self.intimacyCount);
  APP.dom.testkitValue.textContent = String(self.testkits);
  APP.dom.desireBar.style.width = `${self.desire}%`;
  APP.dom.anxietyBar.style.width = `${self.anxiety}%`;
  APP.dom.panicWarning.classList.toggle("hidden", self.anxiety < GAME_CONFIG.panicThreshold);

  if (!round.partner) {
    APP.dom.partnerAvatar.textContent = "🪑";
    APP.dom.partnerName.textContent = "本局輪空";
    APP.dom.partnerFlirt.textContent = "「這一局你暫時沒有配對對象。」";
    APP.dom.partnerTags.innerHTML = "";
    setPartnerToolState(false, isLocked);
    renderActionButtonStates([], effectiveSubmission, true, Boolean(pendingUtility));
  } else {
    APP.dom.partnerAvatar.textContent = round.partner.avatar;
    APP.dom.partnerName.textContent = round.partner.name;
    APP.dom.partnerFlirt.textContent = `「${round.partner.flirt}」`;
    renderPartnerTags(round.partner, self.anxiety);
    setPartnerToolState(true, isLocked);
    renderActionButtonStates(round.availableActions, effectiveSubmission, false, Boolean(pendingUtility));
  }

  updateSubmissionCard(effectiveSubmission, round.partner, pendingUtility, !round.partner);
  startCountdown(round.deadlineAt, round.submissionProgress, snapshot.role === "host");
}

function setPartnerToolState(hasPartner, locked) {
  APP.dom.chatBtn.disabled = !hasPartner || locked;
  APP.dom.testBtn.disabled = !hasPartner || locked;
  APP.dom.hospitalBtn.disabled = locked;
}

function renderPartnerTags(partner, anxiety) {
  APP.dom.partnerTags.innerHTML = "";
  const shouldBlur = anxiety >= GAME_CONFIG.panicThreshold;

  partner.tags.forEach((tag, index) => {
    const badge = document.createElement("div");
    const blurThis = shouldBlur && !tag.hidden && index % 2 === 1;
    if (tag.hidden || blurThis) {
      badge.className = "tag tag-hidden";
      badge.innerHTML = `<span class="icon">❓</span><span>${blurThis ? "視線模糊" : "隱藏資訊"}</span>`;
    } else {
      badge.className = `tag ${tagClassName(tag.color)}`;
      badge.innerHTML = `<span class="icon">${tagIcon(tag.color)}</span><span>${escapeHtml(tag.text)}</span>`;
    }
    APP.dom.partnerTags.appendChild(badge);
  });

  if (partner.testedResult) {
    const testBadge = document.createElement("div");
    testBadge.className = `tag ${partner.testedResult.infected ? "tag-tested-positive" : "tag-tested-negative"}`;
    testBadge.innerHTML = `<span class="icon">${partner.testedResult.infected ? "🧪" : "🛡️"}</span><span>${partner.testedResult.infected ? "試紙結果：陽性" : "試紙結果：陰性"}</span>`;
    APP.dom.partnerTags.appendChild(testBadge);
  }

  if (partner.roundNotice) {
    const eventBadge = document.createElement("div");
    eventBadge.className = "tag tag-risk-soft";
    eventBadge.innerHTML = `<span class="icon">🎲</span><span>${escapeHtml(partner.roundNotice.badge)}</span>`;
    APP.dom.partnerTags.appendChild(eventBadge);
  }
}

function tagClassName(color) {
  if (color === "risk-strong") return "tag-risk-strong";
  if (color === "risk") return "tag-risk";
  if (color === "risk-soft") return "tag-risk-soft";
  if (color === "positive") return "tag-positive";
  return "tag-neutral";
}

function tagIcon(color) {
  if (color === "risk-strong") return "⚠️";
  if (color === "risk") return "🔥";
  if (color === "risk-soft") return "👀";
  if (color === "positive") return "🛡️";
  return "⏺";
}

function renderActionButtonStates(availableActions, submittedAction, noPartner, pendingUtility = false) {
  const buttons = Array.from(APP.dom.actionButtons.querySelectorAll(".action-option"));
  buttons.forEach((button) => {
    const actionKey = button.dataset.action;
    const allowed = noPartner ? false : availableActions.includes(actionKey);
    button.disabled = Boolean(submittedAction) || pendingUtility || !allowed;
    button.classList.toggle("selected", submittedAction === actionKey);
    button.classList.toggle("locked", Boolean(submittedAction) || pendingUtility || !allowed);
  });
}

function updateSubmissionCard(submission, partner, pendingUtility, noPartner) {
  if (submission) {
    APP.dom.submittedActionLabel.textContent = ACTIONS[submission].shortLabel;
    APP.dom.submissionHint.textContent = APP.localPending.submission && !APP.playerSnapshot?.round?.submission
      ? "正在送出你的選擇…"
      : "本局已提交，請等待主持人結算。";
    return;
  }
  if (pendingUtility) {
    APP.dom.submittedActionLabel.textContent = pendingUtility.label;
    APP.dom.submissionHint.textContent = "正在同步你的操作，請稍候。";
    return;
  }
  if (noPartner) {
    APP.dom.submittedActionLabel.textContent = "本局可略過";
    APP.dom.submissionHint.textContent = "輪空局不需提交互動選擇；若想確認自身狀態，仍可去醫院檢查。";
    return;
  }
  APP.dom.submittedActionLabel.textContent = "尚未提交";
  APP.dom.submissionHint.textContent = partner
    ? `${partner.roundNotice ? `${partner.roundNotice.detail} ` : ""}若倒數結束仍未提交，系統會自動判定為「換一個」。`
    : "輪空局無需提交，等待其他玩家完成。";
}

function startCountdown(deadlineAt, progress, isHost) {
  clearInterval(APP.countdownTimer);
  const update = () => {
    const remaining = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
    const timeLabel = remaining > 0 ? `剩餘 ${remaining} 秒` : "主持人正在結算";
    if (isHost && progress?.totalCount) {
      APP.dom.timerPill.textContent = `${timeLabel} · ${progress.submittedCount}/${progress.totalCount} 已交`;
      return;
    }
    APP.dom.timerPill.textContent = timeLabel;
  };
  update();
  APP.countdownTimer = setInterval(update, 1000);
}

function describeRolePill(self) {
  if (self.isCarrier) {
    return "你是初始帶原者";
  }
  if (self.detectedSelf && self.detectedInfected) {
    return "醫院已確認感染";
  }
  if (self.detectedSelf && !self.detectedInfected) {
    return "醫院確認目前健康";
  }
  return "你起始是健康人，狀態未檢查";
}

function renderSummary(snapshot) {
  clearInterval(APP.countdownTimer);
  APP.dom.summaryTitle.textContent = snapshot.summary.private.title;
  APP.dom.summaryBody.textContent = snapshot.summary.private.body;
  APP.dom.summaryExtra.innerHTML = "";
  APP.dom.summaryPhasePill.textContent = "Summary";

  snapshot.summary.private.chips.forEach((chip) => {
    const badge = document.createElement("div");
    badge.className = `summary-chip ${chip.kind}`;
    badge.textContent = chip.label;
    APP.dom.summaryExtra.appendChild(badge);
  });

  snapshot.summary.private.notes.forEach((note) => {
    const text = document.createElement("p");
    text.textContent = note;
    APP.dom.summaryExtra.appendChild(text);
  });

  APP.dom.scoreboard.innerHTML = "";
  snapshot.summary.publicStats.forEach((item) => {
    const row = document.createElement("div");
    row.className = "score-row";
    row.innerHTML = `<span>${escapeHtml(item.label)}</span><strong>${escapeHtml(String(item.value))}</strong>`;
    APP.dom.scoreboard.appendChild(row);
  });

  const isHost = snapshot.role === "host";
  APP.dom.hostNextRoundBtn.classList.toggle("hidden", !isHost);
  APP.dom.hostNextRoundBtn.textContent = snapshot.summary.isFinalRound ? "揭曉終局頒獎" : "主持人推進下一局";
}

function renderAwards(snapshot) {
  clearInterval(APP.countdownTimer);
  APP.dom.awardsTitle.textContent = "派對頒獎典禮";
  APP.dom.finaleHeading.textContent = snapshot.finale.heading;
  APP.dom.finaleBody.textContent = snapshot.finale.body;
  APP.dom.podiumStage.innerHTML = "";

  snapshot.finale.podium.forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = `podium-card rank-${index + 1}`;
    card.innerHTML = `
      <div class="podium-rank">${index + 1}</div>
      <div class="podium-avatar">${entry.avatar}</div>
      <strong>${escapeHtml(entry.title)}</strong>
      <div>${escapeHtml(entry.playerName)}</div>
      <span>${escapeHtml(entry.subtitle)}</span>
    `;
    APP.dom.podiumStage.appendChild(card);
  });

  APP.dom.awardsList.innerHTML = "";
  snapshot.finale.awards.forEach((entry) => {
    const row = document.createElement("article");
    row.className = "award-row";
    row.innerHTML = `
      <div class="player-avatar">${entry.avatar}</div>
      <div class="player-meta">
        <strong>${escapeHtml(entry.name)}</strong>
        <span>${escapeHtml(entry.detail)}</span>
      </div>
      <span class="result-chip ${entry.kind}">${escapeHtml(entry.label)}</span>
    `;
    APP.dom.awardsList.appendChild(row);
  });
}

function copyJoinLink() {
  const link = APP.hostRoom ? buildJoinLink(APP.hostRoom.roomCode) : "";
  if (!link) {
    return;
  }
  navigator.clipboard.writeText(link)
    .then(() => showToast("加入連結已複製。"))
    .catch(() => showToast("複製失敗，請手動複製畫面上的連結。"));
}

function startHostedGame() {
  const room = APP.hostRoom;
  if (!room) {
    return;
  }

  const lobbyPlayers = activeLobbyPlayers(room);
  if (lobbyPlayers.length < GAME_CONFIG.minPlayers) {
    showToast(`至少需要 ${GAME_CONFIG.minPlayers} 人才能開始。`);
    return;
  }

  const activeIds = lobbyPlayers.map((player) => player.id);
  const shuffledIds = shuffle(activeIds);
  room.initialCarrierIds = shuffledIds.slice(0, Math.min(GAME_CONFIG.initialCarrierCount, shuffledIds.length));
  room.pairSchedule = buildRoundRobin(shuffledIds, GAME_CONFIG.roundCount);
  room.finalResults = null;
  room.finale = null;
  room.summary = null;

  activeIds.forEach((playerId) => {
    const player = room.players[playerId];
    player.desire = GAME_CONFIG.startDesire;
    player.anxiety = GAME_CONFIG.startAnxiety;
    player.intimacyCount = 0;
    player.testkits = 1;
    player.isCarrier = room.initialCarrierIds.includes(playerId);
    player.isInfected = player.isCarrier;
    player.detectedSelf = false;
    player.infectionSourceId = player.isCarrier ? playerId : null;
    player.infectionRound = player.isCarrier ? 0 : null;
    player.transmissionCount = 0;
    player.history = [];
    player.stats = {
      chats: 0,
      tests: 0,
      hospitals: 0,
      successfulIntimacies: 0,
      riskyActions: 0,
      correctLeaves: 0,
      closeCalls: 0,
      failedAttempts: 0
    };
    player.persona = generatePersona(player.isCarrier);
  });

  room.roundIndex = 1;
  startHostRound();
}

function buildRoundRobin(playerIds, rounds) {
  const players = [...playerIds];
  if (players.length % 2 === 1) {
    players.push(null);
  }
  let rotation = [...players];
  const schedule = [];
  const totalRounds = Math.min(rounds, rotation.length - 1);

  for (let round = 0; round < totalRounds; round += 1) {
    const pairs = [];
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const left = rotation[index];
      const right = rotation[rotation.length - 1 - index];
      if (left && right) {
        pairs.push([left, right]);
      }
    }
    schedule.push(pairs);
    rotation = [rotation[0], rotation[rotation.length - 1], ...rotation.slice(1, rotation.length - 1)];
  }
  return schedule;
}

function startHostRound() {
  const room = APP.hostRoom;
  const pairs = room.pairSchedule[room.roundIndex - 1] || [];
  const pairMap = {};
  const activeIds = getGamePlayerIds(room);
  activeIds.forEach((playerId) => {
    pairMap[playerId] = null;
  });

  pairs.forEach(([left, right]) => {
    pairMap[left] = right;
    pairMap[right] = left;
  });

  const roundRestrictions = createRoundRestrictions(activeIds, pairs);
  const privateMap = {};
  activeIds.forEach((playerId) => {
    privateMap[playerId] = createPrivateRoundState(playerId, pairMap[playerId], roundRestrictions[playerId]);
  });

  room.round = {
    roundIndex: room.roundIndex,
    startedAt: Date.now(),
    deadlineAt: Date.now() + GAME_CONFIG.roundDurationMs,
    pairMap,
    submissions: {},
    private: privateMap,
    resolved: false
  };
  room.phase = "round";
  room.summary = null;

  clearTimeout(APP.hostDeadlineTimer);
  APP.hostDeadlineTimer = setTimeout(() => {
    resolveHostedRound();
  }, GAME_CONFIG.roundDurationMs + 100);

  hostSyncAll({ immediate: true });
}

function createPrivateRoundState(playerId, partnerId, restriction = { blockedActions: [], roundNotice: null }) {
  if (!partnerId) {
    return {
      hiddenIndices: [],
      revealedIndices: [],
      testedResult: null,
      blockedActions: restriction.blockedActions.slice(),
      roundNotice: restriction.roundNotice
    };
  }

  const partner = APP.hostRoom.players[partnerId];
  const hiddenIndices = [];
  partner.persona.tags.forEach((tag, index) => {
    if (Math.random() < tag.hiddenChance) {
      hiddenIndices.push(index);
    }
  });

  if (hiddenIndices.length === partner.persona.tags.length && hiddenIndices.length > 0) {
    hiddenIndices.pop();
  }

  return {
    hiddenIndices,
    revealedIndices: [],
    testedResult: null,
    blockedActions: restriction.blockedActions.slice(),
    roundNotice: restriction.roundNotice
  };
}

function createRoundRestrictions(activeIds, pairs) {
  const restrictions = Object.fromEntries(activeIds.map((playerId) => [playerId, {
    blockedActions: [],
    roundNotice: null
  }]));

  pairs.forEach(([leftId, rightId]) => {
    const event = createPairRoundEvent();
    restrictions[leftId] = {
      blockedActions: event.blockedActions.slice(),
      roundNotice: event.roundNotice
    };
    restrictions[rightId] = {
      blockedActions: event.blockedActions.slice(),
      roundNotice: event.roundNotice
    };
  });

  return restrictions;
}

function createPairRoundEvent() {
  if (Math.random() >= GAME_CONFIG.oralCondomLockChance) {
    return {
      blockedActions: [],
      roundNotice: null
    };
  }

  const picked = randomFrom(ROUND_EVENT_DECK);
  return {
    blockedActions: picked?.blockedActions || [],
    roundNotice: picked ? {
      badge: picked.badge,
      detail: picked.detail
    } : null
  };
}

function getAllowedActionsForPlayer(playerId) {
  const room = APP.hostRoom;
  if (!room || !room.round) {
    return [];
  }
  const partnerId = room.round.pairMap[playerId];
  if (!partnerId) {
    return ["refuse"];
  }

  const constraints = room.players[partnerId].persona.constraints;
  const privateState = room.round.private[playerId];
  const blocked = new Set();
  constraints.forEach((constraint) => {
    if (constraint === "no_condom") {
      blocked.add("oral_condom");
      blocked.add("sex_condom");
    } else if (constraint === "condom_only") {
      blocked.add("oral_raw");
      blocked.add("sex_raw");
    } else if (constraint === "no_oral") {
      blocked.add("oral_condom");
      blocked.add("oral_raw");
    } else if (constraint === "oral_only") {
      blocked.add("sex_condom");
      blocked.add("sex_raw");
    }
  });

  (privateState?.blockedActions || []).forEach((actionKey) => {
    blocked.add(actionKey);
  });

  return GAME_CONFIG.actionOrder.filter((actionKey) => !blocked.has(actionKey));
}

function handleChatReveal() {
  if (APP.role === "host") {
    hostRevealTag(APP.selfId);
    return;
  }
  if (APP.localPending.submission || APP.localPending.utility) {
    return;
  }
  if (APP.hostConn?.open) {
    setLocalPendingUtility("chat", "正在試探…");
    APP.hostConn.send({ type: "chat-reveal" });
  }
}

function hostRevealTag(playerId) {
  const room = APP.hostRoom;
  if (!room || room.phase !== "round") {
    return;
  }
  if (room.round.submissions[playerId]) {
    return;
  }

  const privateState = room.round.private[playerId];
  const nextHidden = privateState.hiddenIndices.find((index) => !privateState.revealedIndices.includes(index));
  if (nextHidden === undefined) {
    sendPrivateToast(playerId, "沒有更多隱藏資訊可揭露了。");
    return;
  }
  privateState.revealedIndices.push(nextHidden);
  room.players[playerId].stats.chats += 1;
  const partnerId = room.round.pairMap[playerId];
  const tag = APP.hostRoom.players[partnerId].persona.tags[nextHidden];
  sendPrivateToast(playerId, `你試探出了一條新線索：${tag.text}`);
  hostSyncAll();
}

function handleUseTestkit() {
  if (APP.role === "host") {
    hostUseTestkit(APP.selfId);
    return;
  }
  if (APP.localPending.submission || APP.localPending.utility) {
    return;
  }
  if (APP.hostConn?.open) {
    setLocalPendingUtility("testkit", "正在檢測…");
    APP.hostConn.send({ type: "use-testkit" });
  }
}

function hostUseTestkit(playerId) {
  const room = APP.hostRoom;
  const player = room?.players[playerId];
  if (!room || room.phase !== "round" || !player) {
    return;
  }
  if (room.round.submissions[playerId]) {
    return;
  }
  if (player.testkits < 1) {
    sendPrivateToast(playerId, "你的對方試紙已經用完了。");
    return;
  }
  const partnerId = room.round.pairMap[playerId];
  if (!partnerId) {
    sendPrivateToast(playerId, "本局沒有配對對象，無法檢測。");
    return;
  }
  player.testkits -= 1;
  player.stats.tests += 1;
  room.round.private[playerId].testedResult = {
    infected: room.players[partnerId].isInfected
  };
  sendPrivateToast(playerId, room.players[partnerId].isInfected ? "試紙顯示陽性反應。" : "試紙顯示陰性反應。");
  hostSyncAll();
}

function submitAction(actionKey) {
  if (APP.role === "host") {
    hostReceiveAction(APP.selfId, actionKey);
    return;
  }
  if (APP.localPending.submission || APP.localPending.utility) {
    return;
  }
  if (APP.hostConn?.open) {
    setLocalPendingSubmission(actionKey);
    APP.hostConn.send({ type: "submit-action", action: actionKey });
  }
}

function hostReceiveAction(playerId, actionKey) {
  const room = APP.hostRoom;
  if (!room || room.phase !== "round" || !room.players[playerId]) {
    return;
  }
  if (room.round.submissions[playerId]) {
    return;
  }

  const partnerId = room.round.pairMap[playerId];
  if (!partnerId) {
    if (actionKey !== "hospital") {
      return;
    }
    room.round.submissions[playerId] = "hospital";
    sendPrivateToast(playerId, `已提交：${ACTIONS.hospital.shortLabel}`);
    hostSyncAll();
    return;
  }

  const allowedActions = getAllowedActionsForPlayer(playerId);
  const finalAction = allowedActions.includes(actionKey) ? actionKey : "refuse";
  room.round.submissions[playerId] = finalAction;
  sendPrivateToast(playerId, `已提交：${ACTIONS[finalAction].shortLabel}`);

  if (allRoundActionsSubmitted()) {
    resolveHostedRound();
    return;
  }
  hostSyncAll();
}

function allRoundActionsSubmitted() {
  const room = APP.hostRoom;
  return Object.keys(room.round.pairMap)
    .filter((playerId) => room.round.pairMap[playerId])
    .every((playerId) => Boolean(room.round.submissions[playerId]));
}

function resolveHostedRound() {
  const room = APP.hostRoom;
  if (!room || !room.round || room.round.resolved) {
    return;
  }

  clearTimeout(APP.hostDeadlineTimer);
  room.round.resolved = true;

  const privateSummaries = {};
  const publicCounter = {
    intimateEvents: 0,
    riskyEvents: 0,
    hospitalVisits: 0,
    noExperiencePlayers: 0
  };

  Object.keys(room.round.pairMap).forEach((playerId) => {
    if (!room.round.pairMap[playerId] && !privateSummaries[playerId]) {
      const player = room.players[playerId];
      const selfAction = room.round.submissions[playerId] || null;
      if (selfAction === "hospital") {
        applyHospital(player);
        publicCounter.hospitalVisits += 1;
        privateSummaries[playerId] = {
          title: `第 ${room.roundIndex} 局結束`,
          body: player.isInfected
            ? "你在輪空局選擇去醫院檢查，檢驗結果確認你已經感染。"
            : "你在輪空局選擇去醫院檢查，檢驗結果顯示你目前仍然健康。",
          chips: [{ label: player.isInfected ? "確認感染" : "確認健康", kind: player.isInfected ? "bad" : "good" }],
          notes: ["醫院會清空你的焦慮值，但衝動值會明顯上升。"]
        };
        return;
      }
      privateSummaries[playerId] = {
        title: `第 ${room.roundIndex} 局結束`,
        body: "你本局輪空，沒有發生任何互動。",
        chips: [{ label: "輪空", kind: "warn" }],
        notes: ["輪空局不會強迫你提交互動，也無法靠這一局累積親密次數。"]
      };
    }
  });

  const processed = new Set();
  const pairs = room.pairSchedule[room.roundIndex - 1] || [];

  pairs.forEach(([leftId, rightId]) => {
    const pairKey = [leftId, rightId].sort().join(":");
    if (processed.has(pairKey)) {
      return;
    }
    processed.add(pairKey);

    const leftAction = room.round.submissions[leftId] || "refuse";
    const rightAction = room.round.submissions[rightId] || "refuse";
    const result = resolvePair(leftId, rightId, leftAction, rightAction, room.roundIndex);
    privateSummaries[leftId] = result.left;
    privateSummaries[rightId] = result.right;
    publicCounter.intimateEvents += result.public.intimateEvents;
    publicCounter.riskyEvents += result.public.riskyEvents;
    publicCounter.hospitalVisits += result.public.hospitalVisits;
  });

  Object.values(room.players).forEach((player) => {
    if (player.intimacyCount === 0) {
      publicCounter.noExperiencePlayers += 1;
    }
  });

  room.summary = {
    private: privateSummaries,
    publicStats: [
      { label: "本局發生的親密互動", value: `${publicCounter.intimateEvents} 次` },
      { label: "高風險無套互動", value: `${publicCounter.riskyEvents} 次` },
      { label: "醫院檢查次數", value: `${publicCounter.hospitalVisits} 次` },
      { label: "尚未有親密經驗的人數", value: `${publicCounter.noExperiencePlayers} 人` }
    ]
  };
  room.phase = "summary";
  hostSyncAll({ immediate: true });
}

function resolvePair(leftId, rightId, leftActionKey, rightActionKey, roundIndex) {
  const room = APP.hostRoom;
  const left = room.players[leftId];
  const right = room.players[rightId];
  const leftSummary = { title: `第 ${roundIndex} 局結束`, body: "", chips: [], notes: [] };
  const rightSummary = { title: `第 ${roundIndex} 局結束`, body: "", chips: [], notes: [] };
  const publicStats = {
    intimateEvents: 0,
    riskyEvents: 0,
    hospitalVisits: 0
  };

  if (leftActionKey === "hospital") {
    applyHospital(left);
    publicStats.hospitalVisits += 1;
    leftSummary.body = left.isInfected
      ? "你本局選擇去醫院檢查，檢驗結果確認你已經感染。"
      : "你本局選擇去醫院檢查，檢驗結果顯示你目前仍然健康。";
    leftSummary.chips.push({ label: left.isInfected ? "確認感染" : "確認健康", kind: left.isInfected ? "bad" : "good" });
    leftSummary.notes.push("醫院會清空你的焦慮值，但衝動值會明顯上升。");
  }

  if (rightActionKey === "hospital") {
    applyHospital(right);
    publicStats.hospitalVisits += 1;
    rightSummary.body = right.isInfected
      ? "你本局選擇去醫院檢查，檢驗結果確認你已經感染。"
      : "你本局選擇去醫院檢查，檢驗結果顯示你目前仍然健康。";
    rightSummary.chips.push({ label: right.isInfected ? "確認感染" : "確認健康", kind: right.isInfected ? "bad" : "good" });
    rightSummary.notes.push("醫院會清空你的焦慮值，但衝動值會明顯上升。");
  }

  const leftIntimacy = isIntimacyAction(leftActionKey);
  const rightIntimacy = isIntimacyAction(rightActionKey);
  const blocked = leftActionKey === "hospital" || rightActionKey === "hospital" || leftActionKey === "refuse" || rightActionKey === "refuse";

  if (blocked) {
    if (leftActionKey === "refuse") {
      applyRefuse(left, right);
      leftSummary.body = `你選擇與 ${right.name} 保持距離，這一局沒有發生親密互動。`;
      leftSummary.chips.push({ label: right.isInfected ? "成功避開風險" : "主動離場", kind: right.isInfected ? "good" : "warn" });
      if (right.isInfected) {
        left.stats.correctLeaves += 1;
      }
    } else if (!leftSummary.body) {
      applyFailedAttempt(left);
      leftSummary.body = `${right.name} 沒有配合你的節奏，這一局的親密互動落空了。`;
      leftSummary.chips.push({ label: "互動落空", kind: "warn" });
    }

    if (rightActionKey === "refuse") {
      applyRefuse(right, left);
      rightSummary.body = `你選擇與 ${left.name} 保持距離，這一局沒有發生親密互動。`;
      rightSummary.chips.push({ label: left.isInfected ? "成功避開風險" : "主動離場", kind: left.isInfected ? "good" : "warn" });
      if (left.isInfected) {
        right.stats.correctLeaves += 1;
      }
    } else if (!rightSummary.body) {
      applyFailedAttempt(right);
      rightSummary.body = `${left.name} 沒有配合你的節奏，這一局的親密互動落空了。`;
      rightSummary.chips.push({ label: "互動落空", kind: "warn" });
    }

    leftSummary.notes.push("若終局前都沒有任何一次親密互動，你會直接判定失敗。");
    rightSummary.notes.push("若終局前都沒有任何一次親密互動，你會直接判定失敗。");
    return { left: leftSummary, right: rightSummary, public: publicStats };
  }

  if (leftIntimacy && rightIntimacy) {
    const resolvedActionKey = resolveSharedAction(leftActionKey, rightActionKey);
    const resolvedAction = ACTIONS[resolvedActionKey];
    publicStats.intimateEvents += 1;
    if (!resolvedAction.condom) {
      publicStats.riskyEvents += 1;
    }

    const leftPartnerWasInfected = right.isInfected;
    const rightPartnerWasInfected = left.isInfected;
    const leftInfectedBefore = left.isInfected;
    const rightInfectedBefore = right.isInfected;

    maybeTransmit(right, left, resolvedActionKey, roundIndex);
    maybeTransmit(left, right, resolvedActionKey, roundIndex);

    applyIntimacy(left, resolvedActionKey, leftPartnerWasInfected);
    applyIntimacy(right, resolvedActionKey, rightPartnerWasInfected);

    leftSummary.body = `你和 ${right.name} 的互動最後落在「${resolvedAction.shortLabel}」。衝動值下降，但焦慮值同步上升。`;
    rightSummary.body = `你和 ${left.name} 的互動最後落在「${resolvedAction.shortLabel}」。衝動值下降，但焦慮值同步上升。`;
    leftSummary.chips.push({ label: resolvedAction.shortLabel, kind: resolvedAction.condom ? "good" : "warn" });
    rightSummary.chips.push({ label: resolvedAction.shortLabel, kind: resolvedAction.condom ? "good" : "warn" });

    if (!leftInfectedBefore && left.isInfected && !left.detectedSelf) {
      leftSummary.notes.push("你沒有立刻察覺任何結果。若想確認自己是否安全，醫院才是唯一準確答案。");
    } else if (leftPartnerWasInfected && !left.isInfected) {
      left.stats.closeCalls += 1;
      leftSummary.notes.push("這次互動其實很驚險，但你暫時沒有明顯異狀。");
    }

    if (!rightInfectedBefore && right.isInfected && !right.detectedSelf) {
      rightSummary.notes.push("你沒有立刻察覺任何結果。若想確認自己是否安全，醫院才是唯一準確答案。");
    } else if (rightPartnerWasInfected && !right.isInfected) {
      right.stats.closeCalls += 1;
      rightSummary.notes.push("這次互動其實很驚險，但你暫時沒有明顯異狀。");
    }

    return { left: leftSummary, right: rightSummary, public: publicStats };
  }

  return { left: leftSummary, right: rightSummary, public: publicStats };
}

function isIntimacyAction(actionKey) {
  return ["oral_condom", "sex_condom", "oral_raw", "sex_raw"].includes(actionKey);
}

function resolveSharedAction(leftActionKey, rightActionKey) {
  const leftAction = ACTIONS[leftActionKey];
  const rightAction = ACTIONS[rightActionKey];
  const category = leftAction.category === "oral" || rightAction.category === "oral" ? "oral" : "sex";
  const condom = leftAction.condom || rightAction.condom;
  return `${category}_${condom ? "condom" : "raw"}`;
}

function applyHospital(player) {
  player.desire = clamp(player.desire + GAME_CONFIG.hospitalDesireCost, 0, 100);
  player.anxiety = 0;
  player.detectedSelf = true;
  player.stats.hospitals += 1;
}

function applyRefuse(player) {
  player.desire = clamp(player.desire + GAME_CONFIG.refuseDesireCost, 0, 100);
  player.anxiety = finalizeAnxiety(player.anxiety);
}

function applyFailedAttempt(player) {
  player.desire = clamp(player.desire + GAME_CONFIG.failedAttemptDesireCost, 0, 100);
  player.anxiety = finalizeAnxiety(player.anxiety + GAME_CONFIG.failedAttemptAnxietyGain);
  player.stats.failedAttempts += 1;
}

function applyIntimacy(player, actionKey, partnerWasInfected) {
  const action = ACTIONS[actionKey];
  player.desire = clamp(player.desire + GAME_CONFIG.passiveDesireGain - action.desireReward, 0, 100);
  player.anxiety = finalizeAnxiety(player.anxiety + action.anxietyGain);
  player.intimacyCount += 1;
  player.stats.successfulIntimacies += 1;
  if (!action.condom) {
    player.stats.riskyActions += 1;
  }
  player.history.push({
    round: APP.hostRoom.roundIndex,
    action: actionKey,
    partnerWasInfected
  });
}

function finalizeAnxiety(value) {
  const extra = value > 20 ? 2 : 0;
  return clamp(value + extra, 0, 100);
}

function maybeTransmit(sourcePlayer, targetPlayer, actionKey, roundIndex) {
  if (!sourcePlayer.isInfected || targetPlayer.isInfected) {
    return;
  }
  const risk = ACTIONS[actionKey].transmissionRisk;
  if (Math.random() < risk) {
    targetPlayer.isInfected = true;
    targetPlayer.infectionSourceId = sourcePlayer.id;
    targetPlayer.infectionRound = roundIndex;
    sourcePlayer.transmissionCount += 1;
  }
}

function handleHostAdvance() {
  const room = APP.hostRoom;
  if (!room || room.phase !== "summary") {
    return;
  }

  if (room.roundIndex >= room.roundCount) {
    finalizeHostedGame();
    return;
  }
  room.roundIndex += 1;
  startHostRound();
}

function finalizeHostedGame() {
  const room = APP.hostRoom;
  const players = Object.values(room.players);
  const healthyWinners = players.filter((player) => !player.isInfected && player.intimacyCount > 0);
  const everyoneInfected = players.every((player) => player.isInfected);
  const finalResults = {};

  players.forEach((player) => {
    let kind = "lose";
    let label = "未過關";
    let detail = `親密 ${player.intimacyCount} 次，最終 ${player.isInfected ? "感染" : "健康"}`;

    if (player.intimacyCount === 0) {
      kind = "lose";
      label = "零互動失敗";
      detail = "終局前從未有過親密互動，直接判定失敗。";
    } else if (healthyWinners.some((winner) => winner.id === player.id)) {
      kind = "winner";
      label = "健康倖存者";
      detail = `完成 ${player.intimacyCount} 次互動後仍保持健康。`;
    } else if (everyoneInfected && player.isCarrier) {
      kind = "carrier";
      label = "帶原者陣營獲勝";
      detail = `初始帶原者之一，成功達成全面感染。`;
    } else if (player.isCarrier) {
      kind = "lose";
      label = "帶原者失敗";
      detail = `最終仍有健康者存活，帶原者陣營未能達標。`;
    } else {
      kind = "lose";
      label = player.isInfected ? "終局感染" : "未達通關條件";
    }

    finalResults[player.id] = {
      kind,
      label,
      detail
    };
  });

  room.finalResults = finalResults;
  room.finale = buildFinale(players, healthyWinners, everyoneInfected, finalResults);
  room.phase = "awards";
  hostSyncAll({ immediate: true });
}

function buildFinale(players, healthyWinners, everyoneInfected, finalResults) {
  let heading = "";
  let body = "";

  if (healthyWinners.length > 0) {
    heading = "健康倖存者獲勝";
    body = `本場共有 ${healthyWinners.length} 位玩家在完成至少一次親密互動後，仍成功維持健康狀態。`;
  } else if (everyoneInfected) {
    heading = "全面感染，帶原者獲勝";
    body = "終局時全場皆已感染，初始 6 位帶原者成功完成陣營目標。";
  } else {
    heading = "無人完美過關";
    body = "雖然沒有任何健康倖存者，但也未達成全面感染，這是一場兩敗俱傷的派對。";
  }

  const podium = buildPodium(players, healthyWinners, everyoneInfected, finalResults);
  const awards = players
    .sort((left, right) => {
      const leftScore = rankWeight(finalResults[left.id].kind);
      const rightScore = rankWeight(finalResults[right.id].kind);
      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }
      return right.intimacyCount - left.intimacyCount;
    })
    .map((player) => ({
      avatar: player.avatar,
      name: player.name,
      label: finalResults[player.id].label,
      detail: `${finalResults[player.id].detail} 傳播 ${player.transmissionCount} 次。`,
      kind: finalResults[player.id].kind
    }));

  return {
    heading,
    body,
    podium,
    awards
  };
}

function buildPodium(players, healthyWinners, everyoneInfected, finalResults) {
  const safest = healthyWinners
    .slice()
    .sort((left, right) => left.anxiety - right.anxiety || right.intimacyCount - left.intimacyCount)[0];
  const spreader = players
    .slice()
    .sort((left, right) => right.transmissionCount - left.transmissionCount || right.stats.riskyActions - left.stats.riskyActions)[0];
  const social = players
    .slice()
    .sort((left, right) => right.intimacyCount - left.intimacyCount || left.anxiety - right.anxiety)[0];

  const entries = [];

  if (everyoneInfected) {
    const bestCarrier = players
      .filter((player) => player.isCarrier)
      .sort((left, right) => right.transmissionCount - left.transmissionCount)[0];
    entries.push({
      avatar: bestCarrier?.avatar || "🦠",
      playerName: bestCarrier?.name || "帶原者",
      title: "全面感染 MVP",
      subtitle: bestCarrier ? `成功傳播 ${bestCarrier.transmissionCount} 次` : "帶原者陣營奪勝"
    });
  } else {
    entries.push({
      avatar: safest?.avatar || "✨",
      playerName: safest?.name || "健康倖存者",
      title: "終局倖存王",
      subtitle: safest ? `完成 ${safest.intimacyCount} 次互動仍健康` : "本場沒有健康倖存者"
    });
  }

  entries.push({
    avatar: spreader?.avatar || "🔥",
    playerName: spreader?.name || "高風險玩家",
    title: "風險擴散王",
    subtitle: spreader ? `累計傳播 ${spreader.transmissionCount} 次` : "本場無有效傳播"
  });

  entries.push({
    avatar: social?.avatar || "🎉",
    playerName: social?.name || "派對玩家",
    title: "社交風雲人物",
    subtitle: social ? `共完成 ${social.intimacyCount} 次互動` : "等待下次派對"
  });

  return entries;
}

function rankWeight(kind) {
  if (kind === "winner") return 3;
  if (kind === "carrier") return 2;
  return 1;
}

function generatePersona(isCarrier) {
  const tags = [];
  const usedIds = new Set();
  const constraints = [];
  const flirt = FLIRT_LINES[Math.floor(Math.random() * FLIRT_LINES.length)];
  const targetCount = 4 + Math.floor(Math.random() * 2);
  let loopGuard = 0;

  const riskTags = TAG_POOL.filter((tag) => tag.group === "symptom" || tag.group === "environment" || tag.color.startsWith("risk"));
  const safeTags = TAG_POOL.filter((tag) => tag.group === "positive" || tag.color === "positive");
  const identityTags = TAG_POOL.filter((tag) => tag.group === "identity" || tag.group === "hygiene");
  const constraintTags = TAG_POOL.filter((tag) => tag.constraint);

  if (isCarrier) {
    maybePushTag(tags, usedIds, pickWeightedRisk(riskTags), constraints);
    if (Math.random() < 0.78) {
      maybePushTag(tags, usedIds, pickWeightedRisk(riskTags), constraints);
    }
  } else {
    if (Math.random() < 0.72) {
      maybePushTag(tags, usedIds, randomFrom(safeTags), constraints);
    }
    if (Math.random() < 0.28) {
      maybePushTag(tags, usedIds, pickWeightedRisk(riskTags.filter((tag) => tag.suspicion < 0.5)), constraints);
    }
  }

  if (Math.random() < 0.42) {
    const constraint = randomFrom(constraintTags);
    maybePushTag(tags, usedIds, constraint, constraints);
  }

  while (tags.length < targetCount && loopGuard < 200) {
    loopGuard += 1;
    const source = Math.random() < 0.58 ? identityTags : TAG_POOL;
    const candidate = randomFrom(source);
    maybePushTag(tags, usedIds, candidate, constraints);
  }

  if (tags.length < targetCount) {
    TAG_POOL.forEach((tag) => {
      if (tags.length < targetCount) {
        maybePushTag(tags, usedIds, tag, constraints);
      }
    });
  }

  return {
    flirt,
    tags,
    constraints
  };
}

function maybePushTag(tags, usedIds, tag, constraints) {
  if (!tag || usedIds.has(tag.id)) {
    return;
  }
  if (tag.constraint && !canUseConstraint(constraints, tag.constraint)) {
    return;
  }
  tags.push(tag);
  usedIds.add(tag.id);
  if (tag.constraint && !constraints.includes(tag.constraint)) {
    constraints.push(tag.constraint);
  }
}

function canUseConstraint(existingConstraints, incomingConstraint) {
  const conflicts = {
    no_oral: ["oral_only"],
    oral_only: ["no_oral"],
    no_condom: ["condom_only"],
    condom_only: ["no_condom"]
  };
  return !(conflicts[incomingConstraint] || []).some((conflict) => existingConstraints.includes(conflict));
}

function pickWeightedRisk(riskTags) {
  const sorted = riskTags.slice().sort((left, right) => right.suspicion - left.suspicion);
  const topHalf = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  return randomFrom(topHalf);
}

function randomFrom(list) {
  if (!list.length) {
    return null;
  }
  return list[Math.floor(Math.random() * list.length)];
}

function setJoinFormBusy(isBusy, label = "加入房間") {
  APP.dom.joinSubmitBtn.disabled = isBusy;
  APP.dom.joinSubmitBtn.textContent = label;
  APP.dom.joinBackBtn.disabled = isBusy;
  APP.dom.roomCodeInput.disabled = isBusy;
  APP.dom.playerNameInput.disabled = isBusy;
  Array.from(APP.dom.avatarPicker.querySelectorAll(".avatar-chip")).forEach((chip) => {
    chip.disabled = isBusy;
  });
}

function startJoinAttemptTimeout() {
  clearTimeout(APP.joinAttemptTimer);
  APP.joinAttemptTimer = setTimeout(() => {
    if (APP.playerSnapshot || APP.role !== "player") {
      return;
    }
    destroyPeerState();
    switchScreen("join-screen");
    showToast("加入房間逾時，請確認房號或稍後再試。");
  }, 12000);
}

function clearJoinAttemptState() {
  clearTimeout(APP.joinAttemptTimer);
  APP.joinAttemptTimer = null;
  setJoinFormBusy(false);
}

function setLocalPendingSubmission(actionKey) {
  APP.localPending.submission = actionKey;
  APP.localPending.utility = null;
  if (APP.playerSnapshot) {
    renderPlayerSnapshot();
  }
}

function setLocalPendingUtility(kind, label) {
  APP.localPending.utility = { kind, label };
  if (APP.playerSnapshot) {
    renderPlayerSnapshot();
  }
}

function clearLocalPendingState() {
  APP.localPending.submission = null;
  APP.localPending.utility = null;
  APP.localPending.roundStartedAt = null;
}

function reconcileLocalPendingState(snapshot) {
  if (!snapshot || snapshot.phase !== "round" || !snapshot.round) {
    clearLocalPendingState();
    return;
  }
  if (APP.localPending.roundStartedAt !== snapshot.round.startedAt) {
    clearLocalPendingState();
    APP.localPending.roundStartedAt = snapshot.round.startedAt;
    return;
  }
  APP.localPending.roundStartedAt = snapshot.round.startedAt;
  if (snapshot.round.submission) {
    APP.localPending.submission = null;
  }
  APP.localPending.utility = null;
}

function sendPrivateToast(playerId, message) {
  if (playerId === APP.selfId) {
    showToast(message);
    return;
  }
  const conn = APP.hostConnections.get(playerId);
  if (conn?.open) {
    conn.send({ type: "toast", message });
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function restartApp() {
  window.location.href = `${window.location.pathname}`;
}

function destroyPeerState() {
  clearInterval(APP.countdownTimer);
  clearTimeout(APP.hostDeadlineTimer);
  clearTimeout(APP.hostSyncTimer);
  clearTimeout(APP.joinAttemptTimer);
  APP.hostConnections.forEach((conn) => {
    try {
      conn.close();
    } catch (error) {
      // Ignore cleanup errors.
    }
  });
  APP.hostConnections.clear();
  if (APP.hostConn) {
    try {
      APP.hostConn.close();
    } catch (error) {
      // Ignore cleanup errors.
    }
  }
  if (APP.peer) {
    try {
      APP.peer.destroy();
    } catch (error) {
      // Ignore cleanup errors.
    }
  }
  APP.peer = null;
  APP.hostConn = null;
  APP.hostRoom = null;
  APP.playerSnapshot = null;
  APP.role = null;
  APP.selfId = "";
  APP.roomCode = "";
  APP.hostPeerId = "";
  APP.hostSyncTimer = null;
  APP.joinAttemptTimer = null;
  clearJoinAttemptState();
  clearLocalPendingState();
}
