const STORAGE_KEY = "happy-party-profile-v1";
const CONSENT_KEY = "happy-party-consent-v1";
const HOST_PEER_PREFIX = "happy-party-host-";
const PUBLIC_JOIN_BASE = "https://victoriac1122.github.io/happy-party-game/";
const HOST_HEARTBEAT_MS = 5000;
const LOBBY_DISCONNECT_GRACE_MS = 18000;
const PLAYER_RECONNECT_DELAYS_MS = [900, 1600, 2600, 4200, 6000, 8200];
const SCRIPT_SOURCES = {
  peer: "./vendor/peerjs.min.js?v=20260814a",
  qr: "./vendor/qrcode.min.js?v=20260814b"
};
const SCRIPT_LOADS = new Map();
const TEST_BOT_NAMES = [
  "陪測分身阿酒",
  "氣氛組小王",
  "亂入系阿桃",
  "今晚很敢姐",
  "觀望派阿北",
  "嘴很甜小美",
  "滑進來老張",
  "卡位系阿球",
  "不演了阿森",
  "戲很多小艾"
];

const APP = {
  dom: {},
  role: null,
  activeScreenId: null,
  peer: null,
  hostConn: null,
  hostConnections: new Map(),
  hostDisconnectTimers: new Map(),
  hostRoom: null,
  playerSnapshot: null,
  playerProfile: null,
  playerReconnectTimer: null,
  playerReconnectAttempts: 0,
  playerReconnectActive: false,
  queuedSnapshot: null,
  actionButtonNodes: [],
  countdownState: null,
  lastSentSnapshotKeys: new Map(),
  lobbyPlayerIds: new Set(),
  testBotTimers: [],
  testViewPlayerId: "",
  lastToast: {
    message: "",
    shownAt: 0
  },
  renderSignature: "",
  roomCode: "",
  hostPeerId: "",
  selfId: "",
  selectedAvatar: AVATARS[0],
  pendingRoomCode: "",
  renderFrame: null,
  countdownTimer: null,
  hostDeadlineTimer: null,
  hostIntervalTimer: null,
  hostSyncTimer: null,
  joinAttemptTimer: null,
  joinHandshakePending: false,
  localPending: {
    submission: null,
    utility: null,
    roundStartedAt: null
  }
};

const ROUND_EVENT_DECK = [
  {
    icon: "🦜",
    blockedActions: ["oral_condom", "sex_condom"],
    lockLabel: "他不給",
    badge: "他不給你戴",
    detail: "他把手一擋：「我今天不想戴，你要戴就不要。」這局戴套選項全鎖。"
  },
  {
    icon: "🎈",
    blockedActions: ["oral_condom", "sex_condom"],
    lockLabel: "他不想",
    badge: "他今天不想戴",
    detail: "他勾勾手指：「我今天就是不想戴。」這局戴套選項不能按。"
  },
  {
    icon: "🪩",
    blockedActions: ["oral_condom", "sex_condom"],
    lockLabel: "他不給",
    badge: "他把套子收走了",
    detail: "他笑得很直接：「那個今天用不到。」這局所有戴套選項直接鎖起來。"
  },
  {
    icon: "🍸",
    blockedActions: ["oral_condom", "sex_condom"],
    lockLabel: "他不想",
    badge: "他不想隔一層",
    detail: "他邊笑邊擺手：「我不想隔一層。」這局戴套選項一律不給過。"
  },
  {
    icon: "🎤",
    blockedActions: ["oral_condom", "sex_condom"],
    lockLabel: "他不給",
    badge: "他說戴套免談",
    detail: "他很有主見地說：「要戴就免談。」這局不能選任何戴套互動。"
  },
  {
    icon: "🧽",
    blockedActions: ["oral_raw", "sex_raw"],
    lockLabel: "他不給",
    badge: "他不給你無套",
    detail: "他直接畫線：「沒戴就別碰我。」這局無套選項全鎖。"
  },
  {
    icon: "🐙",
    blockedActions: ["oral_raw", "sex_raw"],
    lockLabel: "他不想",
    badge: "他今天不想無套",
    detail: "你才剛試探，他就秒回：「我不想無套。」這局不能選任何無套路線。"
  },
  {
    icon: "📦",
    blockedActions: ["oral_raw", "sex_raw"],
    lockLabel: "他不給",
    badge: "他只給你戴套",
    detail: "他把套子拍在桌上：「只有這條路，沒得商量。」這局無套選項都不能碰。"
  },
  {
    icon: "🪄",
    blockedActions: ["oral_raw", "sex_raw"],
    lockLabel: "他不想",
    badge: "他不想拿健康賭",
    detail: "他眨眼補一句：「我不想拿健康跟你賭。」這局不能選任何無套互動。"
  },
  {
    icon: "🎲",
    blockedActions: ["oral_raw", "sex_raw"],
    lockLabel: "他不給",
    badge: "他說不戴沒得聊",
    detail: "他理直氣壯地下結論：「不戴套就沒得聊。」這局不能選任何無套選項。"
  },
  {
    icon: "🕯️",
    badge: "突然停電",
    detail: "包廂突然黑掉，大家只剩緊急燈在那邊臉對臉，這局只要真的有互動，風險直接 x1.6。",
    riskMultiplier: 1.6
  },
  {
    icon: "💦",
    badge: "香檳灑滿沙發",
    detail: "香檳、冰塊、尖叫聲一起灑滿包廂，大家忙到東倒西歪，這局只要真的有互動，風險再加 15%。",
    riskBonus: 0.15
  },
  {
    icon: "🌫️",
    badge: "乾冰噴過頭",
    detail: "乾冰機今天像失戀一樣狂噴，現場直接變迷霧副本，這局只要真的有互動，風險直接 x1.8。",
    riskMultiplier: 1.8
  },
  {
    icon: "🚨",
    badge: "火警誤鳴",
    detail: "火警突然亂叫，全場手腳一起打結，這局只要真的有互動，風險再多 20%。",
    riskBonus: 0.2
  },
  {
    icon: "🎉",
    badge: "彩炮失控",
    detail: "彩炮像不用錢一樣亂噴，碎紙飛到眼睛都睜不開，這局只要真的有互動，風險直接 x1.5。",
    riskMultiplier: 1.5
  },
  {
    icon: "🛼",
    badge: "地板太滑",
    detail: "地板滑到像夜店版溜冰場，連站著都像在抽卡，這局只要真的有互動，風險再多 10%。",
    riskBonus: 0.1
  }
];

document.addEventListener("DOMContentLoaded", initApp, { once: true });

function loadGlobalScript(key, globalName) {
  if (window[globalName]) {
    return Promise.resolve(window[globalName]);
  }
  if (SCRIPT_LOADS.has(key)) {
    return SCRIPT_LOADS.get(key);
  }

  const load = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SOURCES[key];
    script.async = true;
    script.onload = () => {
      if (window[globalName]) {
        resolve(window[globalName]);
        return;
      }
      reject(new Error(`${globalName} 沒有正確啟動`));
    };
    script.onerror = () => reject(new Error(`${globalName} 載入失敗`));
    document.head.appendChild(script);
  }).catch((error) => {
    SCRIPT_LOADS.delete(key);
    throw error;
  });

  SCRIPT_LOADS.set(key, load);
  return load;
}

function ensurePeerLibrary() {
  return loadGlobalScript("peer", "Peer");
}

function ensureQrLibrary() {
  return loadGlobalScript("qr", "QRCode");
}

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
    testLabPanel: document.getElementById("test-lab-panel"),
    testLabPill: document.getElementById("test-lab-pill"),
    testViewSelect: document.getElementById("test-view-select"),
    testHostViewBtn: document.getElementById("test-host-view-btn"),
    testAdvanceBtn: document.getElementById("test-advance-btn"),
    testLabHint: document.getElementById("test-lab-hint"),
    testLabRoomCode: document.getElementById("test-lab-room-code"),
    testLabJoinLink: document.getElementById("test-lab-join-link"),
    testLabCopyBtn: document.getElementById("test-lab-copy-btn"),
    testQrCode: document.getElementById("test-qr-code"),
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
    lobbyScreen: document.getElementById("lobby-screen"),
    lobbyTitle: document.getElementById("lobby-title"),
    phasePill: document.getElementById("phase-pill"),
    roomCodeDisplay: document.getElementById("room-code-display"),
    joinLinkDisplay: document.getElementById("join-link-display"),
    qrWrap: document.getElementById("qr-wrap"),
    qrCode: document.getElementById("qr-code"),
    copyLinkBtn: document.getElementById("copy-link-btn"),
    soloTestBtn: document.getElementById("solo-test-btn"),
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
    replayPanel: document.getElementById("replay-panel"),
    replayHeading: document.getElementById("replay-heading"),
    replayList: document.getElementById("replay-list"),
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
  APP.dom.soloTestBtn.addEventListener("click", startSoloTestGame);
  APP.dom.startGameBtn.addEventListener("click", startHostedGame);
  APP.dom.chatBtn.addEventListener("click", handleChatReveal);
  APP.dom.testBtn.addEventListener("click", handleUseTestkit);
  APP.dom.hospitalBtn.addEventListener("click", () => submitAction("hospital"));
  APP.dom.hostNextRoundBtn.addEventListener("click", handleHostAdvance);
  APP.dom.testViewSelect.addEventListener("change", (event) => {
    setTestView(event.target.value);
  });
  APP.dom.testHostViewBtn.addEventListener("click", () => {
    setTestView(APP.selfId);
  });
  APP.dom.testAdvanceBtn.addEventListener("click", handleHostAdvance);
  APP.dom.testLabCopyBtn.addEventListener("click", copyJoinLink);
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
  AVATARS.forEach((avatar, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "avatar-chip";
    button.dataset.avatar = avatar;
    button.textContent = avatar;
    button.setAttribute("aria-label", `選擇頭像 ${index + 1}：${avatar}`);
    button.setAttribute("aria-pressed", "false");
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
    const isSelected = chip.dataset.avatar === avatar;
    chip.classList.toggle("selected", isSelected);
    chip.setAttribute("aria-pressed", String(isSelected));
  });
}

function renderActionButtons() {
  APP.dom.actionButtons.innerHTML = "";
  APP.actionButtonNodes = [];
  ["oral_condom", "sex_condom", "oral_raw", "sex_raw", "refuse"].forEach((actionKey) => {
    const action = ACTIONS[actionKey];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-option";
    button.dataset.action = actionKey;
    button.innerHTML = `<strong>${action.label}</strong><span>${action.description}</span><span class="action-lock-label hidden"></span>`;
    button.addEventListener("click", () => submitAction(actionKey));
    APP.dom.actionButtons.appendChild(button);
    APP.actionButtonNodes.push(button);
  });
}

function switchScreen(screenId) {
  if (APP.activeScreenId === screenId) {
    return;
  }
  APP.activeScreenId = screenId;
  APP.dom.screens.forEach((screen) => {
    const active = screen.id === screenId;
    screen.classList.toggle("hidden", !active);
    screen.classList.toggle("active", active);
  });
}

function showToast(message) {
  const text = String(message || "").trim();
  if (!text) {
    return;
  }
  const now = Date.now();
  if (APP.lastToast.message === text && now - APP.lastToast.shownAt < 900) {
    return;
  }
  APP.lastToast.message = text;
  APP.lastToast.shownAt = now;
  APP.dom.toast.textContent = text;
  APP.dom.toast.classList.remove("hidden");
  clearTimeout(APP.dom.toast._timer);
  APP.dom.toast._timer = setTimeout(hideToast, 2600);
}

function hideToast() {
  if (!APP.dom.toast) {
    return;
  }
  clearTimeout(APP.dom.toast._timer);
  APP.dom.toast._timer = null;
  APP.dom.toast.classList.add("hidden");
}

function createSnapshotSignature(snapshot) {
  return JSON.stringify(snapshot);
}

function createRenderSignature(snapshot) {
  const pendingState = snapshot.role === "player" && snapshot.phase === "round"
    ? {
        submission: APP.localPending.submission,
        utility: APP.localPending.utility,
        roundStartedAt: APP.localPending.roundStartedAt,
        reconnecting: APP.playerReconnectActive
      }
    : null;

  return JSON.stringify({
    snapshot,
    pendingState
  });
}

function isHostTestMode() {
  return APP.role === "host" && Boolean(APP.hostRoom?.testMode);
}

function buildSortedPlayers(room) {
  return Object.values(room.players).sort((left, right) => left.joinedAt - right.joinedAt);
}

function getHostViewPlayerId() {
  if (!isHostTestMode()) {
    return APP.selfId;
  }
  if (APP.testViewPlayerId && APP.hostRoom?.players[APP.testViewPlayerId]) {
    return APP.testViewPlayerId;
  }
  return APP.hostRoom?.hostId || APP.selfId;
}

function isLocalTestViewPlayer(playerId) {
  return isHostTestMode() && playerId === getHostViewPlayerId();
}

function clearTestBotTimers() {
  APP.testBotTimers.forEach((timerId) => clearTimeout(timerId));
  APP.testBotTimers = [];
}

function rememberPlayerProfile(profile) {
  APP.playerProfile = {
    name: sanitizeName(profile?.name || ""),
    avatar: sanitizeAvatar(profile?.avatar)
  };
}

function stopPlayerReconnectLoop({ preserveProfile = true } = {}) {
  clearTimeout(APP.playerReconnectTimer);
  APP.playerReconnectTimer = null;
  APP.playerReconnectAttempts = 0;
  APP.playerReconnectActive = false;
  if (!preserveProfile) {
    APP.playerProfile = null;
  }
}

function clearHostDisconnectTimer(playerId) {
  const timerId = APP.hostDisconnectTimers.get(playerId);
  if (!timerId) {
    return;
  }
  clearTimeout(timerId);
  APP.hostDisconnectTimers.delete(playerId);
}

function scheduleLobbyDisconnectCleanup(playerId) {
  clearHostDisconnectTimer(playerId);
  const timerId = setTimeout(() => {
    APP.hostDisconnectTimers.delete(playerId);
    const room = APP.hostRoom;
    if (!room || room.phase !== "lobby") {
      return;
    }
    const player = room.players[playerId];
    if (!player || player.online !== false || APP.hostConnections.has(playerId)) {
      return;
    }
    delete room.players[playerId];
    APP.lastSentSnapshotKeys.delete(playerId);
    hostSyncAll({ immediate: true });
  }, LOBBY_DISCONNECT_GRACE_MS);
  APP.hostDisconnectTimers.set(playerId, timerId);
}

function startHostHeartbeat() {
  clearInterval(APP.hostIntervalTimer);
  APP.hostIntervalTimer = setInterval(() => {
    if (!APP.hostRoom) {
      return;
    }
    APP.hostConnections.forEach((conn, playerId) => {
      if (conn?.open && APP.hostRoom.players[playerId]) {
        conn.send({ type: "heartbeat", at: Date.now() });
      }
    });
  }, HOST_HEARTBEAT_MS);
}

function handleHostPeerDisconnected(peer) {
  if (APP.peer !== peer || APP.role !== "host") {
    return;
  }
  showToast("主揪訊號晃了一下，我正在幫你拉回來。");
  if (typeof peer.reconnect === "function") {
    try {
      peer.reconnect();
    } catch (error) {
      // Ignore reconnect errors and wait for the next retry path.
    }
  }
}

function fallbackToJoinScreen(message) {
  const roomCode = APP.roomCode;
  const profile = APP.playerProfile || currentProfile();
  destroyPeerState();
  APP.dom.roomCodeInput.value = roomCode;
  APP.dom.playerNameInput.value = profile.name || "";
  APP.selectedAvatar = sanitizeAvatar(profile.avatar || APP.selectedAvatar);
  highlightAvatarChip(APP.selectedAvatar);
  switchScreen("join-screen");
  showToast(message);
}

function schedulePlayerReconnect(message) {
  if (APP.role !== "player" || !APP.playerProfile || !APP.peer) {
    return;
  }
  clearLocalPendingState();
  clearJoinAttemptState();
  APP.playerReconnectActive = true;
  if (APP.playerSnapshot) {
    renderPlayerSnapshot();
  }
  showToast(message);

  if (APP.playerReconnectAttempts >= PLAYER_RECONNECT_DELAYS_MS.length) {
    fallbackToJoinScreen("跟主揪失聯太久了，回入口重新滑進來吧。");
    return;
  }
  if (APP.playerReconnectTimer) {
    return;
  }

  const delay = PLAYER_RECONNECT_DELAYS_MS[APP.playerReconnectAttempts];
  APP.playerReconnectTimer = setTimeout(() => {
    APP.playerReconnectTimer = null;
    attemptPlayerReconnect();
  }, delay);
}

function attemptPlayerReconnect() {
  if (APP.role !== "player" || !APP.playerProfile || !APP.peer) {
    return;
  }

  APP.playerReconnectAttempts += 1;
  const peer = APP.peer;
  if (peer.destroyed) {
    fallbackToJoinScreen("你的玩家連線整個散掉了，重新滑進來最快。");
    return;
  }
  if (peer.disconnected && typeof peer.reconnect === "function") {
    try {
      peer.reconnect();
    } catch (error) {
      // Ignore reconnect errors and keep trying the data channel path.
    }
  }
  wirePlayerPeer(APP.playerProfile, { isReconnect: true });
}

function handlePlayerConnectionDropped(conn, message) {
  if (APP.hostConn !== conn) {
    return;
  }
  APP.hostConn = null;
  schedulePlayerReconnect(message);
}

function setTestView(playerId) {
  if (!isHostTestMode()) {
    return;
  }
  const room = APP.hostRoom;
  if (!room?.players[playerId] || playerId === room.hostId) {
    APP.testViewPlayerId = "";
  } else {
    APP.testViewPlayerId = playerId;
  }
  syncTestLab();
  renderHostSnapshot();
}

function syncTestLab() {
  if (!APP.dom.testLabPanel) {
    return;
  }

  const room = APP.hostRoom;
  const visible = APP.role === "host" && Boolean(room?.testMode);
  APP.dom.testLabPanel.classList.toggle("hidden", !visible);
  if (!visible || !room) {
    return;
  }

  const players = buildSortedPlayers(room);
  const viewerId = getHostViewPlayerId();
  const viewer = room.players[viewerId] || room.players[room.hostId];
  const joinLink = buildJoinLink(room.roomCode);
  const optionsFragment = document.createDocumentFragment();

  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = formatTestViewLabel(player);
    optionsFragment.appendChild(option);
  });

  APP.dom.testViewSelect.replaceChildren(optionsFragment);
  APP.dom.testViewSelect.value = viewer?.id || room.hostId;
  APP.dom.testLabRoomCode.textContent = room.roomCode;
  APP.dom.testLabJoinLink.textContent = joinLink;
  APP.dom.testLabPill.textContent = viewer?.isHost
    ? "目前主揪視角"
    : `現在偷看：${viewer?.name || "陪測分身"}`;
  APP.dom.testHostViewBtn.disabled = viewer?.isHost ?? true;
  APP.dom.testAdvanceBtn.classList.toggle("hidden", !(room.phase === "summary" && !viewer?.isHost));
  APP.dom.testAdvanceBtn.textContent = room.roundIndex >= room.roundCount ? "直接開獎去" : "下一局，走起";
  APP.dom.testLabHint.textContent = viewer?.isHost
    ? "你現在看的是主揪總控畫面；想測玩家端，就切去任一陪測分身。"
    : `你現在看的是 ${viewer?.name || "這位陪測分身"} 的畫面，出牌、偷測、去醫院都會直接算在這位頭上。`;
  renderTestLabQr(joinLink);
}

function formatTestViewLabel(player) {
  if (player.isHost) {
    return `${player.avatar} 主揪本人`;
  }
  if (player.isBot) {
    return `${player.avatar} ${player.name} · 陪測分身`;
  }
  return `${player.avatar} ${player.name}`;
}

function buildPublicPlayerList(room) {
  return buildSortedPlayers(room)
    .map((player) => {
      const result = room.finalResults ? room.finalResults[player.id] : null;
      return {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        isHost: player.isHost,
        isBot: Boolean(player.isBot),
        online: player.online !== false,
        intimacyCount: player.intimacyCount,
        result
      };
    });
}

function buildSnapshotSharedContext(room) {
  const shared = {
    joinLink: buildJoinLink(room.roomCode),
    publicPlayers: buildPublicPlayerList(room)
  };

  if (room.phase === "round" && room.round) {
    const pairedPlayerIds = Object.keys(room.round.pairMap).filter((id) => room.round.pairMap[id]);
    shared.round = {
      startedAt: room.round.startedAt,
      deadlineAt: room.round.deadlineAt,
      submissionProgress: {
        submittedCount: pairedPlayerIds.filter((id) => Boolean(room.round.submissions[id])).length,
        totalCount: pairedPlayerIds.length
      }
    };
  }

  return shared;
}

function stopCountdown() {
  clearTimeout(APP.countdownTimer);
  APP.countdownTimer = null;
  APP.countdownState = null;
}

function updateCountdownText() {
  if (!APP.countdownState) {
    return;
  }

  const remaining = Math.max(0, Math.ceil((APP.countdownState.deadlineAt - Date.now()) / 1000));
  const timeLabel = remaining > 0 ? `還有 ${remaining} 秒` : "主揪正在翻牌";
  if (APP.countdownState.isHost && APP.countdownState.totalCount) {
    APP.dom.timerPill.textContent = `${timeLabel} · ${APP.countdownState.submittedCount}/${APP.countdownState.totalCount} 已出牌`;
    return;
  }
  APP.dom.timerPill.textContent = timeLabel;
}

function queueCountdownTick() {
  clearTimeout(APP.countdownTimer);
  if (!APP.countdownState) {
    APP.countdownTimer = null;
    return;
  }

  const remainingMs = APP.countdownState.deadlineAt - Date.now();
  if (remainingMs <= 0) {
    updateCountdownText();
    APP.countdownTimer = null;
    return;
  }

  const nextDelay = Math.max(120, Math.min(1000, (remainingMs % 1000) + 40));
  APP.countdownTimer = setTimeout(() => {
    updateCountdownText();
    queueCountdownTick();
  }, nextDelay);
}

function cancelQueuedRender() {
  if (APP.renderFrame !== null) {
    cancelAnimationFrame(APP.renderFrame);
    APP.renderFrame = null;
  }
  APP.queuedSnapshot = null;
}

function queueSnapshotRender(snapshot) {
  if (!snapshot) {
    return;
  }
  APP.queuedSnapshot = snapshot;
  if (APP.renderFrame !== null) {
    return;
  }
  APP.renderFrame = requestAnimationFrame(() => {
    const nextSnapshot = APP.queuedSnapshot;
    APP.renderFrame = null;
    APP.queuedSnapshot = null;
    if (nextSnapshot) {
      renderSnapshot(nextSnapshot);
    }
  });
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

async function handleCreateRoom() {
  const existing = currentProfile();
  const typedName = sanitizeName(APP.dom.hostNameInput.value);
  const name = typedName || existing.name || "今晚主揪";

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
    showToast("你主揪名號空著，直接送你「今晚主揪」。");
  }

  destroyPeerState();
  setCreateRoomBusy(true);
  try {
    await ensurePeerLibrary();
    attemptCreateHostPeer(profile, 0);
  } catch (error) {
    setCreateRoomBusy(false);
    showToast("連線工具沒載到，再按一次就好。");
  }
}

function attemptCreateHostPeer(profile, attempts) {
  const roomCode = generateRoomCode();
  const hostPeerId = `${HOST_PEER_PREFIX}${roomCode}`;
  const peer = new Peer(hostPeerId);

  peer.on("open", (id) => {
    setCreateRoomBusy(false);
    APP.role = "host";
    APP.peer = peer;
    APP.selfId = id;
    APP.roomCode = roomCode;
    APP.hostPeerId = hostPeerId;
    APP.hostRoom = createHostRoom(profile);
    wireHostPeer(peer);
    startHostHeartbeat();
    renderHostSnapshot();
    switchScreen("lobby-screen");
    showToast("桌子開好啦，快把掃碼圖丟出去抓人。");
  });

  peer.on("disconnected", () => {
    handleHostPeerDisconnected(peer);
  });

  peer.on("error", (error) => {
    if (error.type === "unavailable-id" && attempts < 6) {
      peer.destroy();
      attemptCreateHostPeer(profile, attempts + 1);
      return;
    }
    setCreateRoomBusy(false);
    showToast(`開桌失敗：${error.type || error.message}`);
  });
}

function createHostRoom(profile) {
  const hostPlayer = createPlayerState(APP.selfId, profile, true);
  return {
    hostId: APP.selfId,
    roomCode: APP.roomCode,
    testMode: false,
    testBotIds: [],
    replayArchive: [],
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
      conn.on("close", () => handleHostDisconnect(conn.peer, conn));
      conn.on("error", () => handleHostDisconnect(conn.peer, conn));
    });
  });
}

function createPlayerState(id, profile, isHost = false) {
  return {
    id,
    name: sanitizeName(profile.name || `玩家${Math.floor(Math.random() * 999)}`),
    avatar: sanitizeAvatar(profile.avatar),
    isHost,
    isBot: false,
    online: true,
    joinedAt: Date.now(),
    desire: GAME_CONFIG.startDesire,
    anxiety: GAME_CONFIG.startAnxiety,
    intimacyCount: 0,
    testkits: 1,
    isCarrier: false,
    isInfected: false,
    detectedSelf: false,
    detectedInfected: null,
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

async function handleJoinSubmit(event) {
  event.preventDefault();
  const roomCode = sanitizeRoomCode(APP.dom.roomCodeInput.value);
  const name = sanitizeName(APP.dom.playerNameInput.value);
  const avatar = sanitizeAvatar(APP.selectedAvatar);

  if (!roomCode) {
    showToast("這房號像是手滑打的，重輸一次。");
    return;
  }
  if (!name) {
    showToast("取個有記憶點的名字吧。");
    return;
  }

  saveStoredProfile({ name, avatar });
  destroyPeerState();
  rememberPlayerProfile({ name, avatar });
  setJoinFormBusy(true, "潛入中…");
  showToast("正在找主揪對暗號，等我一下。");
  try {
    await ensurePeerLibrary();
    createPlayerPeer(roomCode, { name, avatar });
  } catch (error) {
    clearJoinAttemptState();
    showToast("連線工具沒載到，再滑一次就好。");
  }
}

function createPlayerPeer(roomCode, profile) {
  const peerId = `happy-party-player-${randomId(12)}`;
  const peer = new Peer(peerId);
  rememberPlayerProfile(profile);

  peer.on("open", (id) => {
    APP.role = "player";
    APP.peer = peer;
    APP.selfId = id;
    APP.roomCode = roomCode;
    APP.hostPeerId = `${HOST_PEER_PREFIX}${roomCode}`;
    APP.playerSnapshot = null;
    APP.playerReconnectAttempts = 0;
    APP.playerReconnectActive = false;
    renderJoiningLobby(profile, roomCode, "潛入中");
    wirePlayerPeer(profile, { isReconnect: false });
  });

  peer.on("disconnected", () => {
    if (APP.peer !== peer || APP.role !== "player") {
      return;
    }
    if (typeof peer.reconnect === "function") {
      try {
        peer.reconnect();
      } catch (error) {
        // Ignore reconnect errors and fall back to the data-channel retry loop.
      }
    }
    if (!APP.hostConn?.open) {
      schedulePlayerReconnect("手機訊號晃了一下，我正在幫你接回主揪。");
    }
  });

  peer.on("error", (error) => {
    const errorType = error?.type || error?.message || "unknown";
    if (
      APP.peer === peer
      && APP.role === "player"
      && APP.playerProfile
      && !APP.hostConn?.open
      && errorType !== "browser-incompatible"
    ) {
      schedulePlayerReconnect("手機訊號卡了一下，我再幫你敲一次主揪。");
      return;
    }
    clearJoinAttemptState();
    if (!APP.playerSnapshot) {
      switchScreen("join-screen");
    }
    showToast(`滑進包廂失敗：${errorType}`);
  });
}

function wirePlayerPeer(profile, options = {}) {
  if (!APP.peer || !APP.hostPeerId) {
    return;
  }
  if (APP.hostConn?.open) {
    return;
  }

  const conn = APP.peer.connect(APP.hostPeerId, { reliable: true });
  APP.hostConn = conn;

  conn.on("open", () => {
    if (!APP.playerSnapshot) {
      renderJoiningLobby(profile, APP.roomCode, options.isReconnect ? "重新對暗號" : "等主揪點頭");
    }
    startJoinAttemptTimeout();
    conn.send({
      type: "join-request",
      payload: {
        name: profile.name,
        avatar: profile.avatar,
        reconnecting: Boolean(options.isReconnect)
      }
    });
  });

  conn.on("data", handlePlayerMessage);
  conn.on("close", () => {
    handlePlayerConnectionDropped(conn, "你跟主揪斷了一下，我正在幫你接回去。");
  });
  conn.on("error", () => {
    handlePlayerConnectionDropped(conn, "連線突然散掉了，我正在幫你重拉。");
  });
}

function handleHostMessage(conn, packet) {
  if (!packet || typeof packet.type !== "string") {
    return;
  }

  if (packet.type === "join-request") {
    const room = APP.hostRoom;
    if (!room) {
      conn.send({ type: "join-rejected", reason: "主揪這桌剛剛收起來了。" });
      conn.close();
      return;
    }

    const playerId = conn.peer;
    const existingPlayer = room.players[playerId];
    if (existingPlayer) {
      const existingConn = APP.hostConnections.get(playerId);
      if (existingConn && existingConn !== conn) {
        try {
          existingConn.close();
        } catch (error) {
          // Ignore reconnect cleanup errors.
        }
      }
      clearHostDisconnectTimer(playerId);
      APP.hostConnections.set(playerId, conn);
      APP.lastSentSnapshotKeys.delete(playerId);
      existingPlayer.online = true;
      existingPlayer.name = sanitizeName(packet.payload?.name || existingPlayer.name);
      existingPlayer.avatar = sanitizeAvatar(packet.payload?.avatar || existingPlayer.avatar);
      hostSyncAll({ immediate: true });
      return;
    }

    if (room.phase !== "lobby") {
      conn.send({ type: "join-rejected", reason: "這桌已經開喝了，這局別硬擠。" });
      conn.close();
      return;
    }

    const currentCount = activeLobbyPlayers(room).length;
    if (currentCount >= GAME_CONFIG.maxPlayers) {
      conn.send({ type: "join-rejected", reason: "包廂爆滿啦，真的塞不下。" });
      conn.close();
      return;
    }

    APP.hostConnections.set(playerId, conn);
    room.players[playerId] = createPlayerState(playerId, packet.payload || {}, false);
    hostSyncAll({ immediate: true });
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

function handleHostDisconnect(playerId, conn = null) {
  const room = APP.hostRoom;
  const activeConn = APP.hostConnections.get(playerId);
  if (conn && activeConn && activeConn !== conn) {
    return;
  }
  APP.hostConnections.delete(playerId);
  APP.lastSentSnapshotKeys.delete(playerId);
  if (!room || !room.players[playerId]) {
    return;
  }

  room.players[playerId].online = false;
  if (room.phase === "lobby") {
    scheduleLobbyDisconnectCleanup(playerId);
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
    showToast(packet.reason || "主揪現在不收人。");
    switchScreen("join-screen");
    return;
  }

  if (packet.type === "toast") {
    showToast(packet.message);
    return;
  }

  if (packet.type === "heartbeat") {
    return;
  }

  if (packet.type === "snapshot") {
    const hadSnapshot = Boolean(APP.playerSnapshot);
    const wasReconnecting = APP.playerReconnectActive;
    clearJoinAttemptState();
    APP.playerSnapshot = packet.snapshot;
    APP.playerReconnectAttempts = 0;
    APP.playerReconnectActive = false;
    reconcileLocalPendingState(packet.snapshot);
    renderPlayerSnapshot();
    if (wasReconnecting && hadSnapshot) {
      showToast("跟主揪接回來了，繼續玩。");
    }
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
  const sharedContext = buildSnapshotSharedContext(APP.hostRoom);
  renderHostSnapshot(sharedContext);
  APP.hostConnections.forEach((conn, playerId) => {
    if (conn.open && APP.hostRoom.players[playerId]) {
      const snapshot = buildSnapshotForPlayer(playerId, sharedContext);
      const signature = createSnapshotSignature(snapshot);
      if (APP.lastSentSnapshotKeys.get(playerId) === signature) {
        return;
      }
      APP.lastSentSnapshotKeys.set(playerId, signature);
      conn.send({
        type: "snapshot",
        snapshot
      });
    }
  });
  syncTestLab();
}

function renderHostSnapshot(sharedContext = null) {
  if (!APP.hostRoom) {
    return;
  }
  const viewerId = getHostViewPlayerId();
  queueSnapshotRender(buildSnapshotForPlayer(viewerId, sharedContext || undefined));
}

function renderPlayerSnapshot(snapshot = null) {
  if (!APP.playerSnapshot && !snapshot) {
    return;
  }
  queueSnapshotRender(snapshot || APP.playerSnapshot);
}

function renderJoiningLobby(profile, roomCode, phaseLabel) {
  APP.dom.lobbyScreen.classList.remove("host-lobby");
  APP.dom.lobbyScreen.classList.add("player-lobby");
  APP.dom.lobbyTitle.textContent = "正在滑進包廂…";
  APP.dom.phasePill.textContent = phaseLabel;
  APP.dom.roomCodeDisplay.textContent = roomCode;
  APP.dom.joinLinkDisplay.textContent = "等主揪點頭後就會冒出來";
  APP.dom.playerCountDisplay.textContent = "…";
  APP.dom.startGameBtn.disabled = true;
  APP.dom.hostControls.classList.add("hidden");
  APP.dom.qrWrap.classList.add("hidden");
  APP.dom.playerList.innerHTML = `
    <article class="player-row">
      <div class="player-avatar">${escapeHtml(profile.avatar)}</div>
      <div class="player-meta">
        <strong>${escapeHtml(profile.name)}</strong>
        <span>正在跟主揪對名字跟座位</span>
      </div>
      <span class="phase-pill subtle">潛入中</span>
    </article>
  `;
  switchScreen("lobby-screen");
}

function buildSnapshotForPlayer(playerId, sharedContext = null) {
  const room = APP.hostRoom;
  const me = room.players[playerId];
  const shared = sharedContext || buildSnapshotSharedContext(room);

  const snapshot = {
    role: playerId === room.hostId ? "host" : "player",
    phase: room.phase,
    roomCode: room.roomCode,
    testMode: Boolean(room.testMode),
    roundIndex: room.roundIndex,
    roundCount: room.roundCount,
    canStart: room.phase === "lobby" && activeLobbyPlayers(room).length >= GAME_CONFIG.minPlayers,
    joinLink: shared.joinLink,
    players: shared.publicPlayers,
    self: {
      id: me.id,
      name: me.name,
      avatar: me.avatar,
      desire: me.desire,
      anxiety: me.anxiety,
      intimacyCount: me.intimacyCount,
      testkits: me.testkits,
      detectedSelf: me.detectedSelf,
      detectedInfected: me.detectedSelf ? me.detectedInfected : null
    }
  };

  if (room.phase === "round" && room.round) {
    const partnerId = room.round.pairMap[playerId] || null;
    snapshot.round = {
      startedAt: shared.round.startedAt,
      deadlineAt: shared.round.deadlineAt,
      partnerId,
      partner: partnerId ? buildPartnerView(playerId, partnerId) : null,
      submission: room.round.submissions[playerId] || null,
      availableActions: getAllowedActionsForPlayer(playerId),
      actionLocks: getActionLocksForPlayer(playerId),
      submissionProgress: shared.round.submissionProgress
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
      selfResult: room.finalResults[playerId],
      replayRounds: buildReplayRoundsForPlayer(room, playerId)
    };
  }

  return snapshot;
}

function buildJoinLink(roomCode) {
  const isLocalPreview = window.location.protocol === "file:"
    || window.location.hostname === "127.0.0.1"
    || window.location.hostname === "localhost";
  const baseSource = isLocalPreview ? PUBLIC_JOIN_BASE : window.location.href;
  const base = new URL(baseSource);
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

function buildReplayRoundsForPlayer(room, playerId) {
  return (room.replayArchive || [])
    .map((entry) => {
      const personal = entry.players[playerId];
      if (!personal) {
        return null;
      }
      return {
        roundIndex: entry.roundIndex,
        publicStats: entry.publicStats,
        partnerName: personal.partnerName,
        partnerAvatar: personal.partnerAvatar,
        actionLabel: personal.actionLabel,
        actionKey: personal.actionKey,
        roundNotice: personal.roundNotice,
        summary: personal.summary,
        postState: personal.postState
      };
    })
    .filter(Boolean);
}

function fallbackSummary() {
  return {
    title: "這局收攤",
    body: "等主揪一聲令下再往下走。",
    chips: [],
    notes: []
  };
}

function renderSnapshot(snapshot) {
  const renderSignature = createRenderSignature(snapshot);
  if (APP.renderSignature === renderSignature) {
    return;
  }
  APP.renderSignature = renderSignature;

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
  const isHostLobby = snapshot.role === "host";
  APP.dom.lobbyScreen.classList.toggle("host-lobby", isHostLobby);
  APP.dom.lobbyScreen.classList.toggle("player-lobby", !isHostLobby);
  APP.dom.lobbyTitle.textContent = isHostLobby ? "掃碼上牆，人齊就開喝" : "你上大螢幕了！";
  APP.dom.phasePill.textContent = isHostLobby ? `${snapshot.players.length} 人已上線` : "等主揪發車";
  APP.dom.roomCodeDisplay.textContent = snapshot.roomCode;
  APP.dom.joinLinkDisplay.textContent = snapshot.joinLink;
  APP.dom.playerCountDisplay.textContent = String(snapshot.players.length);
  APP.dom.startGameBtn.disabled = !snapshot.canStart;
  APP.dom.startGameBtn.textContent = snapshot.testMode ? "陪測分身到齊，直接開喝" : "人齊就開喝";
  APP.dom.hostControls.classList.toggle("hidden", snapshot.role !== "host");
  APP.dom.soloTestBtn.disabled = snapshot.testMode;
  APP.dom.soloTestBtn.textContent = snapshot.testMode ? "單機測試已上線" : "單機測一把";

  if (snapshot.role === "host") {
    APP.dom.qrWrap.classList.remove("hidden");
    renderQrCode(snapshot.joinLink, 220);
  } else {
    APP.dom.qrWrap.classList.add("hidden");
  }

  const previousPlayerIds = APP.lobbyPlayerIds;
  const currentPlayerIds = new Set(snapshot.players.map((player) => player.id));
  const fragment = document.createDocumentFragment();
  snapshot.players.forEach((player) => {
    const identityLabel = player.isHost ? "主揪" : player.isBot ? "陪測分身" : "玩家";
    const statusLabel = player.online ? (player.isBot ? "待命中" : "已卡位") : "斷線中";
    const row = document.createElement("article");
    const justJoined = isHostLobby && previousPlayerIds.size > 0 && !previousPlayerIds.has(player.id);
    row.className = `player-row${isHostLobby ? " player-tile" : ""}${player.online ? "" : " offline"}${justJoined ? " just-joined" : ""}`;
    row.innerHTML = `
      <div class="player-avatar">${player.avatar}</div>
      <div class="player-meta">
        <strong>${escapeHtml(player.name)}</strong>
        <span>${identityLabel}${player.online ? "" : " · 掉線"}</span>
      </div>
      <span class="phase-pill subtle">${statusLabel}</span>
    `;
    fragment.appendChild(row);
  });
  APP.dom.playerList.replaceChildren(fragment);
  APP.lobbyPlayerIds = currentPlayerIds;
}

function renderQrCanvas(target, link, width = 180) {
  if (!target || !link) {
    return;
  }
  if (!window.QRCode) {
    const loadingKey = `${link}|${width}`;
    if (target.dataset.loadingQr === loadingKey) {
      return;
    }
    target.dataset.loadingQr = loadingKey;
    target.setAttribute("aria-busy", "true");
    ensureQrLibrary()
      .then(() => {
        delete target.dataset.loadingQr;
        target.removeAttribute("aria-busy");
        renderQrCanvas(target, link, width);
      })
      .catch(() => {
        delete target.dataset.loadingQr;
        target.removeAttribute("aria-busy");
        target.textContent = "QR 暫時沒長出來，直接複製連結也行。";
      });
    return;
  }
  if (target.dataset.value === link && target.dataset.width === String(width)) {
    return;
  }
  target.replaceChildren();
  target.dataset.value = link;
  target.dataset.width = String(width);
  if (typeof QRCode.toCanvas === "function") {
    QRCode.toCanvas(link, {
      width,
      margin: 1,
      color: {
        dark: "#23160c",
        light: "#fff6eb"
      }
    }, (error, canvas) => {
      if (!error && canvas) {
        target.replaceChildren(canvas);
      }
    });
    return;
  }

  if (typeof QRCode === "function") {
    new QRCode(target, {
      text: link,
      width,
      height: width,
      colorDark: "#23160c",
      colorLight: "#fff6eb",
      correctLevel: QRCode.CorrectLevel?.H
    });
  }
}

function renderQrCode(link) {
  renderQrCanvas(APP.dom.qrCode, link, 180);
}

function renderTestLabQr(link) {
  renderQrCanvas(APP.dom.testQrCode, link, 136);
}

function renderRound(snapshot) {
  const self = snapshot.self;
  const round = snapshot.round;
  const pendingSubmission = snapshot.role === "player" ? APP.localPending.submission : null;
  const pendingUtility = snapshot.role === "player" ? APP.localPending.utility : null;
  const reconnecting = snapshot.role === "player" && APP.playerReconnectActive;
  const effectiveSubmission = round.submission || pendingSubmission;
  const isLocked = Boolean(effectiveSubmission || pendingUtility || reconnecting);
  APP.dom.roundTitle.textContent = `Round ${snapshot.roundIndex} / ${snapshot.roundCount}`;
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
    APP.dom.partnerName.textContent = "這局放空";
    APP.dom.partnerFlirt.textContent = "「這局讓你喘口氣，暫時沒人跟你對到。」";
    APP.dom.partnerTags.replaceChildren();
    setPartnerToolState(false, isLocked);
    renderActionButtonStates([], {}, effectiveSubmission, true, Boolean(pendingUtility));
  } else {
    APP.dom.partnerAvatar.textContent = round.partner.avatar;
    APP.dom.partnerName.textContent = round.partner.name;
    APP.dom.partnerFlirt.textContent = `「${round.partner.flirt}」`;
    renderPartnerTags(round.partner, self.anxiety);
    setPartnerToolState(true, isLocked);
    renderActionButtonStates(round.availableActions, round.actionLocks || {}, effectiveSubmission, false, Boolean(pendingUtility || reconnecting));
  }

  startCountdown(round.deadlineAt, round.submissionProgress, snapshot.role === "host");
}

function setPartnerToolState(hasPartner, locked) {
  APP.dom.chatBtn.disabled = !hasPartner || locked;
  APP.dom.testBtn.disabled = !hasPartner || locked;
  APP.dom.hospitalBtn.disabled = locked;
}

function renderPartnerTags(partner, anxiety) {
  const fragment = document.createDocumentFragment();
  const shouldBlur = anxiety >= GAME_CONFIG.panicThreshold;

  partner.tags.forEach((tag, index) => {
    const badge = document.createElement("div");
    const blurThis = shouldBlur && !tag.hidden && index % 2 === 1;
    if (tag.hidden || blurThis) {
      badge.className = "tag tag-hidden";
      badge.innerHTML = `<span class="icon">❓</span><span>${blurThis ? "眼神開始飄" : "還沒套出來"}</span>`;
    } else {
      badge.className = `tag ${tagClassName(tag.color)}`;
      badge.innerHTML = `<span class="icon">${tagIcon(tag.color)}</span><span>${escapeHtml(tag.text)}</span>`;
    }
    fragment.appendChild(badge);
  });

  if (partner.testedResult) {
    const testBadge = document.createElement("div");
    testBadge.className = `tag ${partner.testedResult.infected ? "tag-tested-positive" : "tag-tested-negative"}`;
    testBadge.innerHTML = `<span class="icon">${partner.testedResult.infected ? "🧪" : "🛡️"}</span><span>${partner.testedResult.infected ? "試紙爆燈：陽性" : "試紙很安靜：陰性"}</span>`;
    fragment.appendChild(testBadge);
  }

  if (partner.roundNotice) {
    const eventBadge = document.createElement("div");
    eventBadge.className = "tag tag-risk-soft";
    eventBadge.innerHTML = `<span class="icon">${escapeHtml(partner.roundNotice.icon || "🎲")}</span><span>${escapeHtml(`亂入事件：${partner.roundNotice.badge}`)}</span>`;
    fragment.appendChild(eventBadge);
  }
  APP.dom.partnerTags.replaceChildren(fragment);
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

function renderActionButtonStates(availableActions, actionLocks, submittedAction, noPartner, pendingUtility = false) {
  APP.actionButtonNodes.forEach((button) => {
    const actionKey = button.dataset.action;
    const allowed = noPartner ? false : availableActions.includes(actionKey);
    const denialLabel = noPartner ? "" : actionLocks[actionKey] || "";
    const lockLabel = button.querySelector(".action-lock-label");
    button.disabled = Boolean(submittedAction) || pendingUtility || !allowed;
    button.classList.toggle("selected", submittedAction === actionKey);
    button.classList.toggle("locked", Boolean(submittedAction) || pendingUtility || !allowed);
    button.classList.toggle("partner-denied", Boolean(denialLabel));
    if (lockLabel) {
      lockLabel.textContent = denialLabel;
      lockLabel.classList.toggle("hidden", !denialLabel);
    }
  });
}

function startCountdown(deadlineAt, progress, isHost) {
  const nextState = {
    deadlineAt,
    isHost: Boolean(isHost),
    submittedCount: progress?.submittedCount || 0,
    totalCount: progress?.totalCount || 0
  };
  const shouldRestart = !APP.countdownTimer || APP.countdownState?.deadlineAt !== nextState.deadlineAt;
  APP.countdownState = nextState;
  updateCountdownText();
  if (!shouldRestart) {
    return;
  }
  queueCountdownTick();
}

function describeRolePill(self) {
  if (self.detectedSelf && self.detectedInfected) {
    return "上次檢測：陽性";
  }
  if (self.detectedSelf && !self.detectedInfected) {
    return "上次檢測：陰性";
  }
  return "感染狀態：未知";
}

function renderSummary(snapshot) {
  stopCountdown();
  APP.dom.summaryTitle.textContent = snapshot.summary.private.title;
  APP.dom.summaryBody.textContent = snapshot.summary.private.body;
  const extraFragment = document.createDocumentFragment();
  APP.dom.summaryPhasePill.textContent = "這局翻牌";

  snapshot.summary.private.chips.forEach((chip) => {
    const badge = document.createElement("div");
    badge.className = `summary-chip ${chip.kind}`;
    badge.textContent = chip.label;
    extraFragment.appendChild(badge);
  });

  snapshot.summary.private.notes.forEach((note) => {
    const text = document.createElement("p");
    text.textContent = note;
    extraFragment.appendChild(text);
  });
  APP.dom.summaryExtra.replaceChildren(extraFragment);

  const scoreboardFragment = document.createDocumentFragment();
  snapshot.summary.publicStats.forEach((item) => {
    const row = document.createElement("div");
    row.className = "score-row";
    row.innerHTML = `<span>${escapeHtml(item.label)}</span><strong>${escapeHtml(String(item.value))}</strong>`;
    scoreboardFragment.appendChild(row);
  });
  APP.dom.scoreboard.replaceChildren(scoreboardFragment);

  const isHost = snapshot.role === "host";
  APP.dom.hostNextRoundBtn.classList.toggle("hidden", !isHost);
  APP.dom.hostNextRoundBtn.textContent = snapshot.summary.isFinalRound ? "直接開獎去" : "下一局，走起";
}

function renderAwards(snapshot) {
  stopCountdown();
  APP.dom.awardsTitle.textContent = "今晚頒獎台";
  APP.dom.finaleHeading.textContent = snapshot.finale.heading;
  APP.dom.finaleBody.textContent = snapshot.finale.body;
  const podiumFragment = document.createDocumentFragment();

  snapshot.finale.podium.forEach((entry, index) => {
    const card = document.createElement("article");
    const rank = entry.rank || index + 1;
    card.className = `podium-card rank-${rank}`;
    card.innerHTML = `
      <div class="podium-rank">${rank}</div>
      <div class="podium-avatar">${entry.avatar}</div>
      <strong>${escapeHtml(entry.title)}</strong>
      <div>${escapeHtml(entry.playerName)}</div>
      <span>${escapeHtml(entry.subtitle)}</span>
    `;
    podiumFragment.appendChild(card);
  });
  APP.dom.podiumStage.replaceChildren(podiumFragment);

  const awardsFragment = document.createDocumentFragment();
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
    awardsFragment.appendChild(row);
  });
  APP.dom.awardsList.replaceChildren(awardsFragment);

  if (!APP.dom.replayPanel || !APP.dom.replayHeading || !APP.dom.replayList) {
    return;
  }

  const replayRounds = snapshot.finale.replayRounds || [];
  APP.dom.replayPanel.classList.toggle("hidden", replayRounds.length === 0);
  if (!replayRounds.length) {
    APP.dom.replayList.replaceChildren();
    return;
  }

  APP.dom.replayHeading.textContent = `${snapshot.self.name} 的 ${replayRounds.length} 局往來復盤`;
  const replayFragment = document.createDocumentFragment();
  replayRounds.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "replay-card";

    const chips = (entry.summary.chips || [])
      .map((chip) => `<span class="summary-chip ${escapeHtml(chip.kind)}">${escapeHtml(chip.label)}</span>`)
      .join("");
    const notes = (entry.summary.notes || [])
      .map((note) => `<p>${escapeHtml(note)}</p>`)
      .join("");
    const publicLine = (entry.publicStats || [])
      .map((item) => `${item.label} ${item.value}`)
      .join(" · ");
    const resultLabel = entry.postState.detectedSelf
      ? entry.postState.infected ? "自己知道中獎了" : "自己知道還安全"
      : entry.postState.infected ? "已感染但還沒翻到自己" : "目前沒感染";

    card.innerHTML = `
      <div class="replay-topline">
        <strong>第 ${entry.roundIndex} 局</strong>
        <span class="replay-partner">往來對象：${escapeHtml(entry.partnerAvatar)} <b>${escapeHtml(entry.partnerName)}</b></span>
      </div>
      <div class="replay-actionline">
        <span class="phase-pill subtle">你這局選了：${escapeHtml(entry.actionLabel)}</span>
        ${entry.roundNotice ? `<span class="phase-pill warm">${escapeHtml(`亂入：${entry.roundNotice.badge}`)}</span>` : ""}
      </div>
      <p class="replay-body">${escapeHtml(entry.summary.body)}</p>
      <div class="summary-extra">${chips}${notes}</div>
      <div class="replay-stats">
        <span>${escapeHtml(publicLine)}</span>
        <strong>${escapeHtml(resultLabel)}</strong>
      </div>
      <div class="replay-meters">
        <span>還想玩 ${entry.postState.desire}%</span>
        <span>心裡多慌 ${entry.postState.anxiety}%</span>
        <span>親密 ${entry.postState.intimacyCount} 次</span>
      </div>
    `;
    replayFragment.appendChild(card);
  });
  APP.dom.replayList.replaceChildren(replayFragment);
}

function copyJoinLink() {
  const link = APP.hostRoom ? buildJoinLink(APP.hostRoom.roomCode) : "";
  if (!link) {
    return;
  }
  navigator.clipboard.writeText(link)
    .then(() => showToast("進場連結複製好了，快丟群組。"))
    .catch(() => showToast("複製失敗，只好手動抄一下。"));
}

function createTestBotProfile(index) {
  const baseName = TEST_BOT_NAMES[(index - 1) % TEST_BOT_NAMES.length];
  const cycle = Math.floor((index - 1) / TEST_BOT_NAMES.length) + 1;
  const suffix = cycle > 1 ? ` ${cycle}` : "";
  return {
    name: `${baseName}${suffix}`,
    avatar: AVATARS[index % AVATARS.length]
  };
}

function ensureSoloTestPlayers(room) {
  room.testMode = true;
  room.testBotIds = room.testBotIds || [];
  const neededCount = Math.max(0, GAME_CONFIG.minPlayers - activeLobbyPlayers(room).length);

  for (let index = 0; index < neededCount; index += 1) {
    const botNumber = room.testBotIds.length + 1;
    const botId = `happy-party-bot-${randomId(10)}`;
    const bot = createPlayerState(botId, createTestBotProfile(botNumber), false);
    bot.isBot = true;
    bot.joinedAt = Date.now() + botNumber;
    room.players[botId] = bot;
    room.testBotIds.push(botId);
  }
}

function startSoloTestGame() {
  const room = APP.hostRoom;
  if (!room || APP.role !== "host") {
    return;
  }
  if (room.phase !== "lobby") {
    showToast("這桌都已經開演了，單機測試要在開局前按。");
    return;
  }

  const realGuests = Object.values(room.players).filter((player) => !player.isHost && !player.isBot);
  if (realGuests.length > 0) {
    showToast("現在有真人在場，別偷切成單機測試。");
    return;
  }

  ensureSoloTestPlayers(room);
  APP.testViewPlayerId = "";
  hostSyncAll({ immediate: true });
  showToast("陪測分身正在跳上玩家牆，馬上開演。");
  setTimeout(() => {
    if (APP.hostRoom === room && room.phase === "lobby" && room.testMode) {
      startHostedGame();
    }
  }, 2600);
}

function startHostedGame() {
  const room = APP.hostRoom;
  if (!room) {
    return;
  }

  const lobbyPlayers = activeLobbyPlayers(room);
  if (lobbyPlayers.length < GAME_CONFIG.minPlayers) {
    showToast(`至少先湊到 ${GAME_CONFIG.minPlayers} 個人才夠熱鬧。`);
    return;
  }

  const activeIds = lobbyPlayers.map((player) => player.id);
  const shuffledIds = shuffle(activeIds);
  room.initialCarrierIds = shuffledIds.slice(0, Math.min(GAME_CONFIG.initialCarrierCount, shuffledIds.length));
  room.pairSchedule = buildRandomPairSchedule(shuffledIds, GAME_CONFIG.roundCount);
  room.finalResults = null;
  room.finale = null;
  room.summary = null;
  room.replayArchive = [];

  activeIds.forEach((playerId) => {
    const player = room.players[playerId];
    player.desire = GAME_CONFIG.startDesire;
    player.anxiety = GAME_CONFIG.startAnxiety;
    player.intimacyCount = 0;
    player.testkits = 1;
    player.isCarrier = room.initialCarrierIds.includes(playerId);
    player.isInfected = player.isCarrier;
    player.detectedSelf = false;
    player.detectedInfected = null;
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

function buildRandomPairSchedule(playerIds, rounds) {
  const schedule = [];
  const pairCounts = new Map();
  const byeCounts = new Map(playerIds.map((playerId) => [playerId, 0]));
  let previousPartners = new Map();

  for (let round = 0; round < rounds; round += 1) {
    let bestCandidate = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const order = shuffle(playerIds);
      const byePlayerId = order.length % 2 === 1 ? order.pop() : null;
      const pairs = [];
      let score = byePlayerId ? (byeCounts.get(byePlayerId) || 0) * 30 : 0;

      for (let index = 0; index < order.length; index += 2) {
        const left = order[index];
        const right = order[index + 1];
        const key = [left, right].sort().join("|");
        score += (pairCounts.get(key) || 0) * 20;
        if (previousPartners.get(left) === right) {
          score += 60;
        }
        pairs.push([left, right]);
      }

      score += Math.random();
      if (score < bestScore) {
        bestScore = score;
        bestCandidate = { pairs, byePlayerId };
      }
    }

    const nextPartners = new Map();
    bestCandidate.pairs.forEach(([left, right]) => {
      const key = [left, right].sort().join("|");
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      nextPartners.set(left, right);
      nextPartners.set(right, left);
    });
    if (bestCandidate.byePlayerId) {
      byeCounts.set(bestCandidate.byePlayerId, (byeCounts.get(bestCandidate.byePlayerId) || 0) + 1);
    }
    schedule.push(bestCandidate.pairs);
    previousPartners = nextPartners;
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
  clearTestBotTimers();

  clearTimeout(APP.hostDeadlineTimer);
  APP.hostDeadlineTimer = setTimeout(() => {
    resolveHostedRound();
  }, GAME_CONFIG.roundDurationMs + 100);

  hostSyncAll({ immediate: true });
  queueSoloTestBotsForRound();
}

function queueSoloTestBotsForRound() {
  clearTestBotTimers();
  const room = APP.hostRoom;
  if (!room?.testMode || room.phase !== "round") {
    return;
  }

  const currentViewId = getHostViewPlayerId();
  shuffle(room.testBotIds.slice()).forEach((playerId, index) => {
    if (!room.players[playerId]) {
      return;
    }
    const bonusDelay = playerId === currentViewId ? 4200 : 0;
    const delay = 3200 + (index * 650) + Math.floor(Math.random() * 2200) + bonusDelay;
    const timerId = setTimeout(() => {
      if (!APP.hostRoom?.testMode || APP.hostRoom.phase !== "round" || APP.hostRoom.round?.resolved) {
        return;
      }
      if (APP.hostRoom.round.submissions[playerId]) {
        return;
      }
      hostReceiveAction(playerId, chooseSoloTestAction(playerId));
    }, delay);
    APP.testBotTimers.push(timerId);
  });
}

function chooseSoloTestAction(playerId) {
  const room = APP.hostRoom;
  const player = room?.players[playerId];
  const partnerId = room?.round?.pairMap[playerId];
  if (!room || !player) {
    return "refuse";
  }
  if (!partnerId) {
    return Math.random() < 0.28 ? "hospital" : "refuse";
  }

  const allowed = getAllowedActionsForPlayer(playerId);
  if (!allowed.length) {
    return "refuse";
  }

  const partnerView = buildPartnerView(playerId, partnerId);
  const visibleRisk = partnerView.tags.filter((tag) => !tag.hidden && tag.color.startsWith("risk")).length;
  const visibleSafety = partnerView.tags.filter((tag) => !tag.hidden && tag.color === "positive").length;
  const testedDelta = partnerView.testedResult ? (partnerView.testedResult.infected ? -3 : 2) : 0;
  const noticeDelta = partnerView.roundNotice ? -1 : 0;
  const nerve = visibleRisk - visibleSafety - testedDelta - noticeDelta + Math.floor(player.anxiety / 18);
  const heat = player.desire - Math.floor(player.anxiety / 2) - (visibleRisk * 7) + (visibleSafety * 5) + (testedDelta * 4);

  if (nerve >= 4 && Math.random() < 0.45) {
    return "hospital";
  }
  if (nerve >= 3 && Math.random() < 0.62) {
    return "refuse";
  }

  const priority = heat >= 56
    ? ["sex_raw", "oral_raw", "sex_condom", "oral_condom", "refuse"]
    : heat >= 38
      ? ["sex_condom", "oral_raw", "oral_condom", "sex_raw", "refuse"]
      : ["oral_condom", "sex_condom", "refuse", "oral_raw", "sex_raw"];

  for (const actionKey of priority) {
    if (!allowed.includes(actionKey)) {
      continue;
    }
    if (actionKey === "refuse") {
      return actionKey;
    }
    if (Math.random() < 0.72) {
      return actionKey;
    }
  }

  return allowed[0] || "refuse";
}

function createPrivateRoundState(playerId, partnerId, restriction = { blockedActions: [], roundNotice: null, riskMultiplier: 1, riskBonus: 0 }) {
  if (!partnerId) {
    return {
      hiddenIndices: [],
      revealedIndices: [],
      testedResult: null,
      blockedActions: restriction.blockedActions.slice(),
      roundNotice: restriction.roundNotice,
      riskMultiplier: restriction.riskMultiplier,
      riskBonus: restriction.riskBonus
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
    roundNotice: restriction.roundNotice,
    riskMultiplier: restriction.riskMultiplier,
    riskBonus: restriction.riskBonus
  };
}

function createRoundRestrictions(activeIds, pairs) {
  const restrictions = Object.fromEntries(activeIds.map((playerId) => [playerId, {
    blockedActions: [],
    roundNotice: null,
    riskMultiplier: 1,
    riskBonus: 0
  }]));

  pairs.forEach(([leftId, rightId]) => {
    const event = createPairRoundEvent();
    restrictions[leftId] = {
      blockedActions: event.blockedActions.slice(),
      roundNotice: event.roundNotice,
      riskMultiplier: event.riskMultiplier,
      riskBonus: event.riskBonus
    };
    restrictions[rightId] = {
      blockedActions: event.blockedActions.slice(),
      roundNotice: event.roundNotice,
      riskMultiplier: event.riskMultiplier,
      riskBonus: event.riskBonus
    };
  });

  return restrictions;
}

function createPairRoundEvent() {
  if (Math.random() >= GAME_CONFIG.forceMajeureChance) {
    return {
      blockedActions: [],
      roundNotice: null,
      riskMultiplier: 1,
      riskBonus: 0
    };
  }

  const picked = randomFrom(ROUND_EVENT_DECK);
  return {
    blockedActions: picked?.blockedActions || [],
    riskMultiplier: picked?.riskMultiplier || 1,
    riskBonus: picked?.riskBonus || 0,
    roundNotice: picked ? {
      icon: picked.icon,
      badge: picked.badge,
      detail: picked.detail,
      lockLabel: picked.lockLabel || ""
    } : null
  };
}

function getActionLocksForPlayer(playerId) {
  const room = APP.hostRoom;
  if (!room || !room.round) {
    return {};
  }
  const partnerId = room.round.pairMap[playerId];
  if (!partnerId) {
    return {};
  }

  const constraints = room.players[partnerId].persona.constraints;
  const privateState = room.round.private[playerId];
  const locks = {};
  const lockActions = (actionKeys, label) => {
    actionKeys.forEach((actionKey) => {
      if (!locks[actionKey]) {
        locks[actionKey] = label;
      }
    });
  };

  constraints.forEach((constraint) => {
    if (constraint === "no_condom") {
      lockActions(["oral_condom", "sex_condom"], "他不給");
    } else if (constraint === "condom_only") {
      lockActions(["oral_raw", "sex_raw"], "他不給");
    } else if (constraint === "no_oral") {
      lockActions(["oral_condom", "oral_raw"], "他不想");
    } else if (constraint === "oral_only") {
      lockActions(["sex_condom", "sex_raw"], "他不想");
    }
  });

  lockActions(
    privateState?.blockedActions || [],
    privateState?.roundNotice?.lockLabel || "他不給"
  );

  return locks;
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

  const locks = getActionLocksForPlayer(playerId);
  return GAME_CONFIG.actionOrder.filter((actionKey) => !locks[actionKey]);
}

function handleChatReveal() {
  if (APP.role === "host") {
    hostRevealTag(getHostViewPlayerId());
    return;
  }
  if (APP.localPending.submission || APP.localPending.utility) {
    return;
  }
  if (APP.hostConn?.open) {
    setLocalPendingUtility("chat", "正在套話…");
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
    sendPrivateToast(playerId, "你已經把能套的都套光了。");
    return;
  }
  privateState.revealedIndices.push(nextHidden);
  room.players[playerId].stats.chats += 1;
  const partnerId = room.round.pairMap[playerId];
  const tag = APP.hostRoom.players[partnerId].persona.tags[nextHidden];
  sendPrivateToast(playerId, `你嘴到一條新線索：${tag.text}`);
  hostSyncAll();
}

function handleUseTestkit() {
  if (APP.role === "host") {
    hostUseTestkit(getHostViewPlayerId());
    return;
  }
  if (APP.localPending.submission || APP.localPending.utility) {
    return;
  }
  if (APP.hostConn?.open) {
    setLocalPendingUtility("testkit", "正在偷測…");
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
    sendPrivateToast(playerId, "你的偷驗機會已經用光啦。");
    return;
  }
  const partnerId = room.round.pairMap[playerId];
  if (!partnerId) {
    sendPrivateToast(playerId, "這局沒對到人，沒地方偷測。");
    return;
  }
  player.testkits -= 1;
  player.stats.tests += 1;
  room.round.private[playerId].testedResult = {
    infected: room.players[partnerId].isInfected
  };
  sendPrivateToast(playerId, room.players[partnerId].isInfected ? "試紙爆燈：陽性。" : "試紙很安靜：陰性。");
  hostSyncAll();
}

function submitAction(actionKey) {
  if (APP.role === "host") {
    hostReceiveAction(getHostViewPlayerId(), actionKey);
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
  if (actionKey === "hospital") {
    room.round.submissions[playerId] = "hospital";
    sendPrivateToast(playerId, `你選了：${ACTIONS.hospital.shortLabel}`);
    if (allRoundActionsSubmitted()) {
      resolveHostedRound();
      return;
    }
    hostSyncAll();
    return;
  }

  if (!partnerId) {
    room.round.submissions[playerId] = "refuse";
    sendPrivateToast(playerId, `你選了：${ACTIONS.refuse.shortLabel}`);
    hostSyncAll();
    return;
  }

  const allowedActions = getAllowedActionsForPlayer(playerId);
  const finalAction = allowedActions.includes(actionKey) ? actionKey : "refuse";
  room.round.submissions[playerId] = finalAction;
  sendPrivateToast(playerId, `你選了：${ACTIONS[finalAction].shortLabel}`);

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

  clearTestBotTimers();
  clearTimeout(APP.hostDeadlineTimer);
  room.round.resolved = true;

  const privateSummaries = {};
  const publicCounter = {
    intimateEvents: 0,
    riskyEvents: 0,
    hospitalVisits: 0,
    forceMajeureSurges: 0,
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
          title: `第 ${room.roundIndex} 局翻牌`,
          body: player.isInfected
            ? "你這局雖然放空，還是跑去醫院驗了一下，結果是你真的中獎了。"
            : "你這局雖然放空，還是跑去醫院驗了一下，結果目前還安全。",
          chips: [{ label: player.isInfected ? "真的中獎" : "目前安全", kind: player.isInfected ? "bad" : "good" }],
          notes: ["醫院會讓你瞬間清醒，但回來只會更想玩。"]
        };
        return;
      }
      privateSummaries[playerId] = {
        title: `第 ${room.roundIndex} 局翻牌`,
        body: "你這局剛好空窗，什麼都沒發生。",
        chips: [{ label: "放空一局", kind: "warn" }],
        notes: ["空窗局不會逼你出牌，但也刷不到親密次數。"]
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
    publicCounter.forceMajeureSurges += result.public.forceMajeureSurges;
  });

  Object.values(room.players).forEach((player) => {
    if (player.intimacyCount === 0) {
      publicCounter.noExperiencePlayers += 1;
    }
  });

  room.summary = {
    private: privateSummaries,
    publicStats: [
      { label: "這局真的有擦出火花", value: `${publicCounter.intimateEvents} 次` },
      { label: "高風險放飛互動", value: `${publicCounter.riskyEvents} 次` },
      { label: "跑去醫院冷靜的人", value: `${publicCounter.hospitalVisits} 次` },
      { label: "被亂入事件加碼的互動", value: `${publicCounter.forceMajeureSurges} 次` },
      { label: "到現在還沒開張的人", value: `${publicCounter.noExperiencePlayers} 人` }
    ]
  };
  room.replayArchive.push(createReplayArchiveEntry(room, privateSummaries, room.summary.publicStats));
  room.phase = "summary";
  hostSyncAll({ immediate: true });
}

function createReplayArchiveEntry(room, privateSummaries, publicStats) {
  const players = {};

  Object.keys(room.players).forEach((playerId) => {
    const player = room.players[playerId];
    const partnerId = room.round?.pairMap?.[playerId] || null;
    const partner = partnerId ? room.players[partnerId] : null;
    const privateState = room.round?.private?.[playerId] || {};
    const actionKey = room.round?.submissions?.[playerId] || null;

    players[playerId] = {
      partnerName: partner?.name || "這局放空",
      partnerAvatar: partner?.avatar || "🪑",
      actionKey,
      actionLabel: actionKey && ACTIONS[actionKey] ? ACTIONS[actionKey].shortLabel : "放空一局",
      roundNotice: privateState.roundNotice
        ? {
            icon: privateState.roundNotice.icon,
            badge: privateState.roundNotice.badge
          }
        : null,
      summary: {
        title: privateSummaries[playerId]?.title || `第 ${room.roundIndex} 局翻牌`,
        body: privateSummaries[playerId]?.body || "這局就這樣滑過去了。",
        chips: (privateSummaries[playerId]?.chips || []).map((chip) => ({
          label: chip.label,
          kind: chip.kind
        })),
        notes: [...(privateSummaries[playerId]?.notes || [])]
      },
      postState: {
        infected: player.isInfected,
        detectedSelf: player.detectedSelf,
        intimacyCount: player.intimacyCount,
        desire: player.desire,
        anxiety: player.anxiety
      }
    };
  });

  return {
    roundIndex: room.roundIndex,
    publicStats: publicStats.map((item) => ({
      label: item.label,
      value: item.value
    })),
    players
  };
}

function resolvePair(leftId, rightId, leftActionKey, rightActionKey, roundIndex) {
  const room = APP.hostRoom;
  const left = room.players[leftId];
  const right = room.players[rightId];
  const leftSummary = { title: `第 ${roundIndex} 局翻牌`, body: "", chips: [], notes: [] };
  const rightSummary = { title: `第 ${roundIndex} 局翻牌`, body: "", chips: [], notes: [] };
  const publicStats = {
    intimateEvents: 0,
    riskyEvents: 0,
    hospitalVisits: 0,
    forceMajeureSurges: 0
  };

  if (leftActionKey === "hospital") {
    applyHospital(left);
    publicStats.hospitalVisits += 1;
    leftSummary.body = left.isInfected
      ? "你這局衝去醫院，翻牌答案是：你真的中獎了。"
      : "你這局衝去醫院，翻牌答案是：你目前還安全。";
    leftSummary.chips.push({ label: left.isInfected ? "真的中獎" : "目前安全", kind: left.isInfected ? "bad" : "good" });
    leftSummary.notes.push("醫院會讓你瞬間清醒，但回來只會更想玩。");
  }

  if (rightActionKey === "hospital") {
    applyHospital(right);
    publicStats.hospitalVisits += 1;
    rightSummary.body = right.isInfected
      ? "你這局衝去醫院，翻牌答案是：你真的中獎了。"
      : "你這局衝去醫院，翻牌答案是：你目前還安全。";
    rightSummary.chips.push({ label: right.isInfected ? "真的中獎" : "目前安全", kind: right.isInfected ? "bad" : "good" });
    rightSummary.notes.push("醫院會讓你瞬間清醒，但回來只會更想玩。");
  }

  const leftIntimacy = isIntimacyAction(leftActionKey);
  const rightIntimacy = isIntimacyAction(rightActionKey);
  const blocked = leftActionKey === "hospital" || rightActionKey === "hospital" || leftActionKey === "refuse" || rightActionKey === "refuse";

  if (blocked) {
    if (leftActionKey === "refuse") {
      applyRefuse(left, right);
      leftSummary.body = `你決定跟 ${right.name} 保持距離，這局直接不接球。`;
      leftSummary.chips.push({ label: right.isInfected ? "閃得漂亮" : "自己閃人", kind: right.isInfected ? "good" : "warn" });
      if (right.isInfected) {
        left.stats.correctLeaves += 1;
      }
    } else if (!leftSummary.body) {
      applyFailedAttempt(left);
      leftSummary.body = `${right.name} 完全沒接你的節奏，這局直接變空氣球。`;
      leftSummary.chips.push({ label: "直接撲空", kind: "warn" });
    }

    if (rightActionKey === "refuse") {
      applyRefuse(right, left);
      rightSummary.body = `你決定跟 ${left.name} 保持距離，這局直接不接球。`;
      rightSummary.chips.push({ label: left.isInfected ? "閃得漂亮" : "自己閃人", kind: left.isInfected ? "good" : "warn" });
      if (left.isInfected) {
        right.stats.correctLeaves += 1;
      }
    } else if (!rightSummary.body) {
      applyFailedAttempt(right);
      rightSummary.body = `${left.name} 完全沒接你的節奏，這局直接變空氣球。`;
      rightSummary.chips.push({ label: "直接撲空", kind: "warn" });
    }

    leftSummary.notes.push("提醒一下，玩到最後如果一次都沒下場，遊戲會直接說你根本來觀光。");
    rightSummary.notes.push("提醒一下，玩到最後如果一次都沒下場，遊戲會直接說你根本來觀光。");
    return { left: leftSummary, right: rightSummary, public: publicStats };
  }

  if (leftIntimacy && rightIntimacy) {
    const pairEffect = room.round.private[leftId] || room.round.private[rightId] || {};
    const riskContext = {
      riskMultiplier: pairEffect.riskMultiplier || 1,
      riskBonus: pairEffect.riskBonus || 0,
      roundNotice: pairEffect.roundNotice || null
    };
    const forceMajeureRisk = riskContext.riskMultiplier > 1 || riskContext.riskBonus > 0;
    const resolvedActionKey = resolveSharedAction(leftActionKey, rightActionKey);
    const resolvedAction = ACTIONS[resolvedActionKey];
    publicStats.intimateEvents += 1;
    if (!resolvedAction.condom) {
      publicStats.riskyEvents += 1;
    }
    if (forceMajeureRisk) {
      publicStats.forceMajeureSurges += 1;
    }

    const leftPartnerWasInfected = right.isInfected;
    const rightPartnerWasInfected = left.isInfected;
    const leftInfectedBefore = left.isInfected;
    const rightInfectedBefore = right.isInfected;

    maybeTransmit(right, left, resolvedActionKey, roundIndex, riskContext);
    maybeTransmit(left, right, resolvedActionKey, roundIndex, riskContext);

    applyIntimacy(left, resolvedActionKey, leftPartnerWasInfected);
    applyIntimacy(right, resolvedActionKey, rightPartnerWasInfected);

    leftSummary.body = `你和 ${right.name} 最後真的演到「${resolvedAction.shortLabel}」。玩心消了一點，但心裡也更慌了。`;
    rightSummary.body = `你和 ${left.name} 最後真的演到「${resolvedAction.shortLabel}」。玩心消了一點，但心裡也更慌了。`;
    leftSummary.chips.push({ label: resolvedAction.shortLabel, kind: resolvedAction.condom ? "good" : "warn" });
    rightSummary.chips.push({ label: resolvedAction.shortLabel, kind: resolvedAction.condom ? "good" : "warn" });

    if (forceMajeureRisk && riskContext.roundNotice) {
      leftSummary.chips.push({ label: "亂入加碼風險", kind: "warn" });
      rightSummary.chips.push({ label: "亂入加碼風險", kind: "warn" });
      leftSummary.notes.push(`這局碰上「${riskContext.roundNotice.badge}」，現場一亂，風險也跟著亂飛。`);
      rightSummary.notes.push(`這局碰上「${riskContext.roundNotice.badge}」，現場一亂，風險也跟著亂飛。`);
    }

    if (!leftInfectedBefore && left.isInfected && !left.detectedSelf) {
      leftSummary.notes.push("你現在不一定馬上感覺得到什麼，但真想知道答案，還是得靠醫院翻牌。");
    } else if (leftPartnerWasInfected && !left.isInfected) {
      left.stats.closeCalls += 1;
      leftSummary.notes.push("這波其實擦身得很驚險，但你暫時還沒看到明顯異狀。");
    }

    if (!rightInfectedBefore && right.isInfected && !right.detectedSelf) {
      rightSummary.notes.push("你現在不一定馬上感覺得到什麼，但真想知道答案，還是得靠醫院翻牌。");
    } else if (rightPartnerWasInfected && !right.isInfected) {
      right.stats.closeCalls += 1;
      rightSummary.notes.push("這波其實擦身得很驚險，但你暫時還沒看到明顯異狀。");
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
  player.detectedInfected = player.isInfected;
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

function maybeTransmit(sourcePlayer, targetPlayer, actionKey, roundIndex, riskContext = null) {
  if (!sourcePlayer.isInfected || targetPlayer.isInfected) {
    return;
  }
  const baseRisk = ACTIONS[actionKey].transmissionRisk;
  const riskMultiplier = riskContext?.riskMultiplier || 1;
  const riskBonus = riskContext?.riskBonus || 0;
  const risk = clamp(baseRisk * riskMultiplier + riskBonus, 0, 0.98);
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
  const activePlayers = players.filter((player) => player.intimacyCount > 0);
  const activePlayersAllInfected = activePlayers.length > 0
    && activePlayers.every((player) => player.isInfected);
  const selection = selectFinalWinners(players, activePlayersAllInfected);
  const winnerById = new Map(selection.entries.map((entry) => [entry.player.id, entry]));
  const finalResults = {};

  players.forEach((player) => {
    const winner = winnerById.get(player.id) || null;
    const scoreCard = activePlayersAllInfected
      ? calculateCarrierStageScore(player)
      : calculateSurvivalScore(player);
    let kind = "lose";
    let label = "今晚翻車";
    let detail = `親密 ${player.intimacyCount} 次，終局是${player.isInfected ? "感染" : "健康"}，生存分 ${scoreCard.score}。`;

    if (winner && activePlayersAllInfected) {
      kind = "carrier";
      label = `帶原勝利 · 第 ${winner.rank} 席`;
      detail = `有下場的人全感染，帶原任務成功；你帶出 ${player.transmissionCount} 次傳播，站上第 ${winner.rank} 席。`;
    } else if (winner) {
      kind = "winner";
      label = `${player.isInfected ? "逆風勝利" : "健康勝利"} · 第 ${winner.rank} 席`;
      detail = `${player.isInfected ? "雖然終局感染，仍靠整體判斷遞補上榜" : "保持健康並拿下前段生存分"}；生存分 ${winner.scoreCard.score}。`;
    } else if (player.intimacyCount === 0) {
      kind = "lose";
      label = "全程觀望王";
      detail = "你一路看到最後都沒真正下場，遊戲直接判你白來。";
    } else if (activePlayersAllInfected) {
      kind = "lose";
      label = "下場就中標";
      detail = "扣掉全程觀望者，有下場的人全部感染；這局是 6 位初始帶原者的陣營勝利。";
    } else if (player.isCarrier) {
      kind = "lose";
      label = "帶原任務失敗";
      detail = `終局還有人健康，帶原陣營先扣順位；你的生存分是 ${scoreCard.score}。`;
    } else if (!player.isInfected) {
      kind = "lose";
      label = "健康但差一席";
      detail = `你有健康收工，但生存分 ${scoreCard.score} 沒擠進今晚前 6。`;
    } else {
      kind = "lose";
      label = "生存分沒進榜";
      detail = `你有下場，但終局感染且生存分 ${scoreCard.score} 沒搶到 6 個席次。`;
    }

    finalResults[player.id] = {
      kind,
      label,
      detail,
      rank: winner?.rank || null,
      score: scoreCard.score
    };
  });

  room.finalResults = finalResults;
  room.finale = buildFinale(players, selection, activePlayersAllInfected, finalResults);
  room.phase = "awards";
  hostSyncAll({ immediate: true });
}

function selectFinalWinners(players, activePlayersAllInfected) {
  if (activePlayersAllInfected) {
    const entries = players
      .filter((player) => player.isCarrier)
      .map((player) => ({
        player,
        scoreCard: calculateCarrierStageScore(player)
      }))
      .sort(compareCarrierFinalists)
      .slice(0, GAME_CONFIG.finalWinnerCount)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
    return { mode: "carrier", entries };
  }

  const entries = players
    .filter((player) => player.intimacyCount > 0)
    .map((player) => ({
      player,
      scoreCard: calculateSurvivalScore(player)
    }))
    .sort(compareSurvivalFinalists)
    .slice(0, GAME_CONFIG.finalWinnerCount)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  return { mode: "survival", entries };
}

function calculateSurvivalScore(player) {
  const protectedIntimacies = Math.max(0, player.stats.successfulIntimacies - player.stats.riskyActions);
  const scoreParts = {
    healthy: player.isInfected ? 0 : 120,
    participation: Math.min(player.intimacyCount, GAME_CONFIG.roundCount) * 4,
    protected: protectedIntimacies * 7,
    closeCalls: player.stats.closeCalls * 10,
    correctLeaves: player.stats.correctLeaves * 7,
    testkit: player.stats.tests * 5,
    hospital: Math.min(player.stats.hospitals, 2) * 3,
    risky: player.stats.riskyActions * -9,
    transmissions: player.transmissionCount * -10,
    failedCarrierMission: player.isCarrier ? -30 : 0
  };
  return {
    score: Object.values(scoreParts).reduce((total, value) => total + value, 0),
    protectedIntimacies,
    scoreParts
  };
}

function calculateCarrierStageScore(player) {
  return {
    score: player.transmissionCount * 25 + player.intimacyCount * 5 + player.stats.riskyActions * 2
  };
}

function compareSurvivalFinalists(left, right) {
  if (left.player.isInfected !== right.player.isInfected) {
    return left.player.isInfected ? 1 : -1;
  }
  if (left.player.isCarrier !== right.player.isCarrier) {
    return left.player.isCarrier ? 1 : -1;
  }
  return right.scoreCard.score - left.scoreCard.score
    || right.player.stats.closeCalls - left.player.stats.closeCalls
    || right.player.intimacyCount - left.player.intimacyCount
    || stableFinalTieValue(left.player.id) - stableFinalTieValue(right.player.id);
}

function compareCarrierFinalists(left, right) {
  return right.scoreCard.score - left.scoreCard.score
    || right.player.transmissionCount - left.player.transmissionCount
    || right.player.intimacyCount - left.player.intimacyCount
    || stableFinalTieValue(left.player.id) - stableFinalTieValue(right.player.id);
}

function stableFinalTieValue(playerId) {
  let hash = 2166136261;
  String(playerId).split("").forEach((character) => {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return hash >>> 0;
}

function buildFinale(players, selection, activePlayersAllInfected, finalResults) {
  const winnerCount = selection.entries.length;
  const heading = activePlayersAllInfected
    ? "有下場的全淪陷，六位帶原者包下舞台"
    : `${winnerCount} 位終局勝利者上台`;
  const body = activePlayersAllInfected
    ? "0 次親密的人先判輸並排除；其餘有下場的人全部感染，6 位初始帶原者共同獲勝。"
    : `健康者優先，再按生存分補滿 6 席。今晚共有 ${winnerCount} 位符合親密資格的玩家站上舞台。`;

  const podium = buildWinnerPodium(selection);
  const awards = players
    .slice()
    .sort((left, right) => {
      const leftRank = finalResults[left.id].rank || Number.POSITIVE_INFINITY;
      const rightRank = finalResults[right.id].rank || Number.POSITIVE_INFINITY;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return finalResults[right.id].score - finalResults[left.id].score
        || right.intimacyCount - left.intimacyCount;
    })
    .map((player) => ({
      avatar: player.avatar,
      name: player.name,
      label: finalResults[player.id].label,
      detail: finalResults[player.id].detail,
      kind: finalResults[player.id].kind
    }));

  return {
    heading,
    body,
    podium,
    awards
  };
}

function buildWinnerPodium(selection) {
  const survivalTitles = [
    "生存總冠軍",
    "風險拆彈亞軍",
    "清醒派對季軍",
    "第四席勝利者",
    "第五席勝利者",
    "第六席勝利者"
  ];
  const carrierTitles = [
    "帶原 MVP",
    "帶節奏亞軍",
    "擴散季軍",
    "帶原第四席",
    "帶原第五席",
    "帶原第六席"
  ];

  return selection.entries.map((entry) => ({
    rank: entry.rank,
    avatar: entry.player.avatar,
    playerName: entry.player.name,
    title: selection.mode === "carrier"
      ? carrierTitles[entry.rank - 1]
      : survivalTitles[entry.rank - 1],
    subtitle: selection.mode === "carrier"
      ? `傳播 ${entry.player.transmissionCount} 次 · 親密 ${entry.player.intimacyCount} 次`
      : `${entry.player.isInfected ? "逆風遞補" : "健康晉級"} · 生存分 ${entry.scoreCard.score}`
  }));
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

function setJoinFormBusy(isBusy, label = "我要入桌") {
  APP.dom.joinSubmitBtn.disabled = isBusy;
  APP.dom.joinSubmitBtn.textContent = label;
  APP.dom.joinBackBtn.disabled = isBusy;
  APP.dom.roomCodeInput.disabled = isBusy;
  APP.dom.playerNameInput.disabled = isBusy;
  Array.from(APP.dom.avatarPicker.querySelectorAll(".avatar-chip")).forEach((chip) => {
    chip.disabled = isBusy;
  });
}

function setCreateRoomBusy(isBusy) {
  APP.dom.createRoomBtn.disabled = isBusy;
  APP.dom.createRoomBtn.textContent = isBusy ? "正在開桌…" : "我要開一桌";
}

function startJoinAttemptTimeout() {
  clearTimeout(APP.joinAttemptTimer);
  APP.joinHandshakePending = true;
  APP.joinAttemptTimer = setTimeout(() => {
    if (!APP.joinHandshakePending || APP.role !== "player") {
      return;
    }
    APP.joinHandshakePending = false;
    schedulePlayerReconnect("主揪那邊還沒回你，我幫你再敲一次門。");
  }, 12000);
}

function clearJoinAttemptState() {
  clearTimeout(APP.joinAttemptTimer);
  APP.joinAttemptTimer = null;
  APP.joinHandshakePending = false;
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

function resetTransientUiState() {
  stopCountdown();
  cancelQueuedRender();
  clearTestBotTimers();
  APP.activeScreenId = null;
  APP.renderSignature = "";
  APP.lastSentSnapshotKeys.clear();
  APP.testViewPlayerId = "";
  APP.lastToast.message = "";
  APP.lastToast.shownAt = 0;
  hideToast();
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
  if (playerId === APP.selfId || isLocalTestViewPlayer(playerId)) {
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
  resetTransientUiState();
  clearTimeout(APP.hostDeadlineTimer);
  clearTimeout(APP.hostSyncTimer);
  clearTimeout(APP.joinAttemptTimer);
  clearInterval(APP.hostIntervalTimer);
  clearTimeout(APP.playerReconnectTimer);
  APP.hostDisconnectTimers.forEach((timerId) => clearTimeout(timerId));
  APP.hostDisconnectTimers.clear();
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
  APP.joinHandshakePending = false;
  APP.role = null;
  APP.selfId = "";
  APP.roomCode = "";
  APP.hostPeerId = "";
  APP.hostDeadlineTimer = null;
  APP.hostIntervalTimer = null;
  APP.hostSyncTimer = null;
  APP.joinAttemptTimer = null;
  stopPlayerReconnectLoop({ preserveProfile: false });
  clearJoinAttemptState();
  clearLocalPendingState();
  syncTestLab();
}
