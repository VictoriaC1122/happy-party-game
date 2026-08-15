const STORAGE_KEY = "happy-party-profile-v1";
const CONSENT_KEY = "happy-party-consent-v1";
const PLAYER_SESSIONS_KEY = "happy-party-player-sessions-v1";
const HOST_PEER_PREFIX = "happy-party-host-";
const PUBLIC_JOIN_BASE = "https://victoriac1122.github.io/happy-party-game/";
const HOST_HEARTBEAT_MS = 5000;
const LOBBY_DISCONNECT_GRACE_MS = 18000;
const PLAYER_CONNECTION_STALE_MS = 18000;
const PEER_OPEN_TIMEOUT_MS = 12000;
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
  hostConnectionPlayerIds: new Map(),
  hostDisconnectTimers: new Map(),
  hostRoom: null,
  playerSnapshot: null,
  playerProfile: null,
  playerReconnectTimer: null,
  playerReconnectAttempts: 0,
  playerReconnectActive: false,
  playerWatchdogTimer: null,
  lastHostPacketAt: 0,
  queuedSnapshot: null,
  actionButtonNodes: [],
  countdownState: null,
  lastSentSnapshotKeys: new Map(),
  lobbyPlayerIds: new Set(),
  lobbyOnlinePlayerIds: new Set(),
  testBotTimers: [],
  testViewPlayerId: "",
  testCarrierPreviewActive: false,
  lastToast: {
    message: "",
    shownAt: 0
  },
  eventModalQueue: [],
  eventModalOpen: false,
  currentEventModal: null,
  eventModalPreviousFocus: null,
  shownEventModalKeys: new Set(),
  renderSignature: "",
  roomCode: "",
  hostPeerId: "",
  selfId: "",
  playerSessionId: "",
  autoResumeStarted: false,
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
    icon: "🪡",
    badge: "對方偷偷戳破套子",
    detail: "你明明選了戴套，翻牌才發現套子早被偷偷戳破；戴套口交改判無套口交，戴套性交改判無套性交。",
    actionTransform: "remove_condom"
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

function createPeerClient(id) {
  const configuredIceServers = Array.isArray(window.HAPPY_PARTY_ICE_SERVERS)
    ? window.HAPPY_PARTY_ICE_SERVERS.filter((server) => server && server.urls)
    : [];
  const iceServers = configuredIceServers.length
    ? configuredIceServers
    : [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  return new Peer(id, {
    pingInterval: 4000,
    config: {
      iceServers,
      iceCandidatePoolSize: 4,
      sdpSemantics: "unified-plan"
    }
  });
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
  tryAutoResumeStoredRoom();
}

function cacheDom() {
  APP.dom = {
    screens: Array.from(document.querySelectorAll(".screen")),
    testLabPanel: document.getElementById("test-lab-panel"),
    testExitBtn: document.getElementById("test-exit-btn"),
    testLabPill: document.getElementById("test-lab-pill"),
    testViewSelect: document.getElementById("test-view-select"),
    testFillBotsBtn: document.getElementById("test-fill-bots-btn"),
    testHostViewBtn: document.getElementById("test-host-view-btn"),
    testCarrierBtn: document.getElementById("test-carrier-btn"),
    testAdvanceBtn: document.getElementById("test-advance-btn"),
    testLabHint: document.getElementById("test-lab-hint"),
    testCarrierPanel: document.getElementById("test-carrier-panel"),
    testCarrierAvatar: document.getElementById("test-carrier-avatar"),
    testCarrierName: document.getElementById("test-carrier-name"),
    testCarrierInfection: document.getElementById("test-carrier-infection"),
    testCarrierTransmissions: document.getElementById("test-carrier-transmissions"),
    testCarrierIntimacy: document.getElementById("test-carrier-intimacy"),
    consentCheckbox: document.getElementById("consent-checkbox"),
    consentContinue: document.getElementById("consent-continue"),
    createRoomBtn: document.getElementById("create-room-btn"),
    createTestRoomBtn: document.getElementById("create-test-room-btn"),
    gotoJoinBtn: document.getElementById("goto-join-btn"),
    joinBackBtn: document.getElementById("join-back-btn"),
    joinForm: document.getElementById("join-form"),
    joinSubmitBtn: document.querySelector("#join-form button[type='submit']"),
    roomCodeInput: document.getElementById("room-code-input"),
    playerNameInput: document.getElementById("player-name-input"),
    hostNameInput: document.getElementById("host-name-input"),
    avatarPicker: document.getElementById("avatar-picker"),
    lobbyScreen: document.getElementById("lobby-screen"),
    lobbyEyebrow: document.getElementById("lobby-eyebrow"),
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
    playerWallStatus: document.getElementById("player-wall-status"),
    playerList: document.getElementById("player-list"),
    roundTitle: document.getElementById("round-title"),
    timerPill: document.getElementById("timer-pill"),
    selfRolePill: document.getElementById("self-role-pill"),
    carrierMissionBanner: document.getElementById("carrier-mission-banner"),
    carrierMissionProgress: document.getElementById("carrier-mission-progress"),
    dissatisfactionValue: document.getElementById("dissatisfaction-value"),
    healthAnxietyValue: document.getElementById("health-anxiety-value"),
    intimacyValue: document.getElementById("intimacy-value"),
    testkitValue: document.getElementById("testkit-value"),
    dissatisfactionBar: document.getElementById("dissatisfaction-bar"),
    healthAnxietyBar: document.getElementById("health-anxiety-bar"),
    healthAnxietyWarning: document.getElementById("health-anxiety-warning"),
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
    eventModal: document.getElementById("event-modal"),
    eventModalIcon: document.getElementById("event-modal-icon"),
    eventModalKicker: document.getElementById("event-modal-kicker"),
    eventModalTitle: document.getElementById("event-modal-title"),
    eventModalBody: document.getElementById("event-modal-body"),
    eventModalClose: document.getElementById("event-modal-close"),
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
      if (resumePendingRoomFromStorage()) {
        return;
      }
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

  APP.dom.createRoomBtn.addEventListener("click", () => handleCreateRoom(false));
  APP.dom.createTestRoomBtn.addEventListener("click", () => handleCreateRoom(true));
  APP.dom.testExitBtn.addEventListener("click", exitTestMode);
  APP.dom.joinForm.addEventListener("submit", handleJoinSubmit);
  APP.dom.copyLinkBtn.addEventListener("click", copyJoinLink);
  APP.dom.startGameBtn.addEventListener("click", startHostedGame);
  APP.dom.testFillBotsBtn.addEventListener("click", fillTestRoomWithBots);
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
  APP.dom.testCarrierBtn.addEventListener("click", activateCarrierTestView);
  APP.dom.testAdvanceBtn.addEventListener("click", handleHostAdvance);
  APP.dom.restartBtn.addEventListener("click", restartApp);
  APP.dom.eventModalClose.addEventListener("click", closeEventModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && APP.eventModalOpen) {
      closeEventModal();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      resumeActiveConnection();
    }
  });
  window.addEventListener("online", resumeActiveConnection);
  window.addEventListener("pageshow", resumeActiveConnection);
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

function loadPlayerSessions() {
  try {
    const stored = JSON.parse(localStorage.getItem(PLAYER_SESSIONS_KEY) || "{}");
    return stored && typeof stored === "object" ? stored : {};
  } catch (error) {
    return {};
  }
}

function savePlayerSessions(sessions) {
  try {
    const entries = Object.entries(sessions)
      .sort((left, right) => Number(right[1]?.updatedAt || 0) - Number(left[1]?.updatedAt || 0))
      .slice(0, 12);
    localStorage.setItem(PLAYER_SESSIONS_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (error) {
    // Private browsing can reject storage writes; the current tab still keeps the session in memory.
  }
}

function sanitizePlayerSessionId(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 96);
  return normalized.length >= 12 ? normalized : "";
}

function createPlayerSessionId() {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(18);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${randomId(24)}${Date.now().toString(36)}`;
}

function getStoredPlayerSessionId(roomCode) {
  const room = sanitizeRoomCode(roomCode);
  const record = loadPlayerSessions()[room];
  return sanitizePlayerSessionId(typeof record === "string" ? record : record?.id);
}

function getOrCreatePlayerSessionId(roomCode, preferredId = "") {
  const room = sanitizeRoomCode(roomCode);
  const sessions = loadPlayerSessions();
  const current = sanitizePlayerSessionId(typeof sessions[room] === "string" ? sessions[room] : sessions[room]?.id);
  const sessionId = sanitizePlayerSessionId(preferredId) || current || createPlayerSessionId();
  sessions[room] = { id: sessionId, updatedAt: Date.now() };
  savePlayerSessions(sessions);
  return sessionId;
}

function persistPlayerRoomInUrl(roomCode) {
  if (!window.history?.replaceState) {
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("room", sanitizeRoomCode(roomCode));
  url.hash = "";
  window.history.replaceState(null, "", url.toString());
}

function resumePendingRoomFromStorage() {
  if (APP.autoResumeStarted || !APP.pendingRoomCode) {
    return false;
  }
  const sessionId = getStoredPlayerSessionId(APP.pendingRoomCode);
  const profile = currentProfile();
  if (!sessionId || !profile.name) {
    return false;
  }
  APP.autoResumeStarted = true;
  APP.dom.roomCodeInput.value = APP.pendingRoomCode;
  APP.dom.playerNameInput.value = profile.name;
  APP.selectedAvatar = profile.avatar;
  highlightAvatarChip(profile.avatar);
  switchScreen("join-screen");
  beginPlayerJoin(APP.pendingRoomCode, profile, { isReconnect: true, sessionId });
  return true;
}

function tryAutoResumeStoredRoom() {
  if (localStorage.getItem(CONSENT_KEY) !== "yes") {
    return;
  }
  resumePendingRoomFromStorage();
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

function queueEventModal(event) {
  const normalized = normalizeEventModal(event);
  if (!normalized || APP.shownEventModalKeys.has(normalized.id)) {
    return;
  }
  APP.shownEventModalKeys.add(normalized.id);
  APP.eventModalQueue.push(normalized);
  showNextEventModal();
}

function normalizeEventModal(event) {
  const id = String(event?.id || "").trim();
  const title = String(event?.title || "").trim();
  const body = String(event?.body || "").trim();
  if (!id || !title || !body) {
    return null;
  }
  return {
    id,
    icon: String(event.icon || "🎲").trim() || "🎲",
    kicker: String(event.kicker || "本局強制事件").trim() || "本局強制事件",
    title,
    body
  };
}

function showNextEventModal() {
  if (APP.eventModalOpen || APP.eventModalQueue.length === 0 || !APP.dom.eventModal) {
    return;
  }
  const event = APP.eventModalQueue.shift();
  APP.currentEventModal = event;
  APP.eventModalOpen = true;
  if (!APP.eventModalPreviousFocus) {
    APP.eventModalPreviousFocus = document.activeElement;
  }
  APP.dom.eventModalIcon.textContent = event.icon;
  APP.dom.eventModalKicker.textContent = event.kicker;
  APP.dom.eventModalTitle.textContent = event.title;
  APP.dom.eventModalBody.textContent = event.body;
  APP.dom.eventModal.classList.remove("hidden");
  APP.dom.eventModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("event-modal-open");
  requestAnimationFrame(() => APP.dom.eventModalClose.focus({ preventScroll: true }));
}

function closeEventModal() {
  if (!APP.eventModalOpen || !APP.dom.eventModal) {
    return;
  }
  APP.eventModalOpen = false;
  APP.currentEventModal = null;
  APP.dom.eventModal.classList.add("hidden");
  APP.dom.eventModal.setAttribute("aria-hidden", "true");

  if (APP.eventModalQueue.length > 0) {
    requestAnimationFrame(showNextEventModal);
    return;
  }

  document.body.classList.remove("event-modal-open");
  const previousFocus = APP.eventModalPreviousFocus;
  APP.eventModalPreviousFocus = null;
  if (previousFocus?.isConnected && typeof previousFocus.focus === "function") {
    previousFocus.focus({ preventScroll: true });
  }
}

function clearEventModals() {
  APP.eventModalQueue = [];
  APP.eventModalOpen = false;
  APP.currentEventModal = null;
  APP.eventModalPreviousFocus = null;
  APP.shownEventModalKeys.clear();
  document.body.classList.remove("event-modal-open");
  if (APP.dom.eventModal) {
    APP.dom.eventModal.classList.add("hidden");
    APP.dom.eventModal.setAttribute("aria-hidden", "true");
  }
}

function queueSnapshotEventModals(events) {
  if (!Array.isArray(events)) {
    return;
  }
  events.forEach(queueEventModal);
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

function startPlayerConnectionWatchdog() {
  clearInterval(APP.playerWatchdogTimer);
  APP.playerWatchdogTimer = setInterval(() => {
    if (APP.role !== "player" || !APP.hostConn?.open || !APP.lastHostPacketAt) {
      return;
    }
    if (Date.now() - APP.lastHostPacketAt <= PLAYER_CONNECTION_STALE_MS) {
      return;
    }
    const staleConn = APP.hostConn;
    APP.hostConn = null;
    try {
      staleConn.close();
    } catch (error) {
      // Closing a stale channel is best-effort; the reconnect loop does the real recovery.
    }
    schedulePlayerReconnect("主揪太久沒回話，我正在幫你重新接上。");
  }, HOST_HEARTBEAT_MS);
}

function resumeActiveConnection() {
  if (APP.role === "host" && APP.peer?.disconnected) {
    handleHostPeerDisconnected(APP.peer);
    return;
  }
  if (APP.role !== "player" || !APP.playerProfile || !APP.peer) {
    return;
  }

  if (APP.peer.disconnected && typeof APP.peer.reconnect === "function") {
    try {
      APP.peer.reconnect();
    } catch (error) {
      // The retry loop below will try the data channel again.
    }
  }

  const connectionIsFresh = APP.hostConn
    && APP.lastHostPacketAt
    && Date.now() - APP.lastHostPacketAt <= PLAYER_CONNECTION_STALE_MS;
  if (connectionIsFresh) {
    return;
  }
  if (APP.hostConn) {
    const staleConn = APP.hostConn;
    APP.hostConn = null;
    try {
      staleConn.close();
    } catch (error) {
      // Ignore stale-channel cleanup errors and reconnect below.
    }
  }
  schedulePlayerReconnect("回到畫面了，我正在幫你接回主揪。");
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
    createPlayerPeer(APP.roomCode, APP.playerProfile, {
      isReconnect: true,
      preserveSnapshot: true,
      sessionId: APP.playerSessionId
    });
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

function setTestView(playerId, options = {}) {
  if (!isHostTestMode()) {
    return;
  }
  if (!options.keepCarrierPreview) {
    APP.testCarrierPreviewActive = false;
  }
  const room = APP.hostRoom;
  if (!room?.players[playerId] || playerId === room.hostId) {
    APP.testViewPlayerId = "";
  } else {
    APP.testViewPlayerId = playerId;
  }
  APP.renderSignature = "";
  syncTestLab();
  renderHostSnapshot();
}

function findNextCarrierTestPlayer(room, viewerId, shouldCycle) {
  const carriers = (room?.initialCarrierIds || [])
    .map((playerId) => room.players[playerId])
    .filter(Boolean);
  if (!carriers.length) {
    return null;
  }
  if (shouldCycle) {
    const currentIndex = carriers.findIndex((player) => player.id === viewerId);
    if (currentIndex >= 0) {
      return carriers[(currentIndex + 1) % carriers.length];
    }
  }
  return carriers.find((player) => !player.isHost) || carriers[0];
}

function activateCarrierTestView() {
  if (!isHostTestMode()) {
    return;
  }
  const room = APP.hostRoom;
  const viewerId = getHostViewPlayerId();
  const carrier = findNextCarrierTestPlayer(room, viewerId, APP.testCarrierPreviewActive);
  if (!carrier) {
    showToast("帶原者還沒出爐，開局再來偷看。");
    return;
  }
  APP.testCarrierPreviewActive = true;
  setTestView(carrier.id, { keepCarrierPreview: true });
  showToast(`抓到 ${carrier.name}，看看他怎麼玩。`);
}

function syncTestLab() {
  if (!APP.dom.testLabPanel) {
    return;
  }

  const room = APP.hostRoom;
  const visible = APP.role === "host" && Boolean(room?.testMode);
  APP.dom.testLabPanel.classList.toggle("hidden", !visible);
  APP.dom.testExitBtn.classList.toggle("hidden", !visible);
  if (!visible || !room) {
    return;
  }

  const players = buildSortedPlayers(room);
  const viewerId = getHostViewPlayerId();
  const viewer = room.players[viewerId] || room.players[room.hostId];
  const carrierPreview = APP.testCarrierPreviewActive && viewer?.isCarrier ? viewer : null;
  const playersNeeded = Math.max(0, GAME_CONFIG.minPlayers - activeLobbyPlayers(room).length);
  const botsToAdd = getTestBotFillCount(room);
  const optionsFragment = document.createDocumentFragment();

  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = formatTestViewLabel(player);
    optionsFragment.appendChild(option);
  });

  APP.dom.testViewSelect.replaceChildren(optionsFragment);
  APP.dom.testViewSelect.value = viewer?.id || room.hostId;
  APP.dom.testLabPill.textContent = viewer?.isHost
    ? "坐在主揪位"
    : `換成 ${viewer?.name || "分身"}`;
  if (carrierPreview) {
    APP.dom.testLabPill.textContent = `帶原者：${carrierPreview.name}`;
  }
  APP.dom.testHostViewBtn.disabled = viewer?.isHost ?? true;
  APP.dom.testFillBotsBtn.classList.toggle("hidden", room.phase !== "lobby");
  APP.dom.testFillBotsBtn.disabled = botsToAdd === 0;
  APP.dom.testFillBotsBtn.textContent = botsToAdd > 0
    ? `叫 ${botsToAdd} 個電腦分身`
    : (playersNeeded > 0 ? "座位滿了，等手機接回來" : "人數已經夠了");
  APP.dom.testCarrierBtn.disabled = !(room.initialCarrierIds || []).length;
  APP.dom.testCarrierBtn.textContent = carrierPreview ? "換下一位帶原者" : "偷看帶原者";
  APP.dom.testAdvanceBtn.classList.toggle("hidden", !(room.phase === "summary" && !viewer?.isHost));
  APP.dom.testAdvanceBtn.textContent = room.roundIndex >= room.roundCount ? "直接開獎去" : "下一局，走起";
  APP.dom.testLabHint.textContent = viewer?.isHost
    ? "選一位玩家切換視角。"
    : `目前視角：${viewer?.name || "這位玩家"}`;
  APP.dom.testCarrierPanel.classList.toggle("hidden", !carrierPreview);
  if (carrierPreview) {
    APP.dom.testCarrierAvatar.textContent = carrierPreview.avatar;
    APP.dom.testCarrierName.textContent = carrierPreview.name;
    APP.dom.testCarrierInfection.textContent = carrierPreview.isInfected ? "已感染" : "還沒中";
    APP.dom.testCarrierTransmissions.textContent = `${carrierPreview.transmissionCount} 次`;
    APP.dom.testCarrierIntimacy.textContent = `${carrierPreview.intimacyCount} 次`;
  }
}

function formatTestViewLabel(player) {
  const carrierLabel = APP.testCarrierPreviewActive && player.isCarrier ? " · 帶原者" : "";
  if (player.isHost) {
    return `${player.avatar} 主揪本人${carrierLabel}`;
  }
  if (player.isBot) {
    return `${player.avatar} ${player.name} · 分身${carrierLabel}`;
  }
  return `${player.avatar} ${player.name}${carrierLabel}`;
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

async function handleCreateRoom(testMode = false) {
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
  setCreateRoomBusy(true, testMode ? "test" : "formal");
  try {
    await ensurePeerLibrary();
    attemptCreateHostPeer(profile, 0, testMode);
  } catch (error) {
    setCreateRoomBusy(false);
    showToast("連線工具沒載到，再按一次就好。");
  }
}

function attemptCreateHostPeer(profile, attempts, testMode = false) {
  const roomCode = generateRoomCode();
  const hostPeerId = `${HOST_PEER_PREFIX}${roomCode}`;
  const peer = createPeerClient(hostPeerId);
  let initialized = false;
  let abandoned = false;
  const openTimer = setTimeout(() => {
    if (initialized || abandoned) {
      return;
    }
    abandoned = true;
    try {
      peer.destroy();
    } catch (error) {
      // Retry below with a fresh room peer.
    }
    if (attempts < 3) {
      attemptCreateHostPeer(profile, attempts + 1, testMode);
      return;
    }
    setCreateRoomBusy(false);
    showToast("開桌訊號等太久了，再按一次就好。");
  }, PEER_OPEN_TIMEOUT_MS);

  peer.on("open", (id) => {
    if (abandoned || initialized) {
      return;
    }
    initialized = true;
    clearTimeout(openTimer);
    setCreateRoomBusy(false);
    APP.role = "host";
    APP.peer = peer;
    APP.selfId = id;
    APP.roomCode = roomCode;
    APP.hostPeerId = hostPeerId;
    APP.hostRoom = createHostRoom(profile, testMode);
    wireHostPeer(peer);
    startHostHeartbeat();
    hostSyncAll({ immediate: true });
    switchScreen("lobby-screen");
    showToast(testMode
      ? "測試桌開好啦。手機先掃碼，人不夠再叫電腦分身。"
      : "正式桌開好啦，快把掃碼圖丟出去抓人。");
  });

  peer.on("disconnected", () => {
    handleHostPeerDisconnected(peer);
  });

  peer.on("error", (error) => {
    if (abandoned) {
      return;
    }
    clearTimeout(openTimer);
    if (error.type === "unavailable-id" && attempts < 6) {
      abandoned = true;
      peer.destroy();
      attemptCreateHostPeer(profile, attempts + 1, testMode);
      return;
    }
    if (initialized && APP.peer === peer && APP.role === "host") {
      handleHostPeerDisconnected(peer);
      return;
    }
    abandoned = true;
    setCreateRoomBusy(false);
    showToast(`開桌失敗：${error.type || error.message}`);
  });
}

function createHostRoom(profile, testMode = false) {
  const hostPlayer = createPlayerState(APP.selfId, profile, true);
  return {
    hostId: APP.selfId,
    roomCode: APP.roomCode,
    testMode: Boolean(testMode),
    testBotIds: [],
    gamePlayerIds: [],
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

function getHostConnectionPlayerId(conn) {
  return APP.hostConnectionPlayerIds.get(conn) || conn?.peer || "";
}

function findPlayerBySessionId(room, sessionId) {
  if (!room || !sessionId) {
    return null;
  }
  return Object.values(room.players)
    .find((player) => !player.isHost && player.sessionId === sessionId) || null;
}

function bindHostConnection(playerId, conn) {
  const existingConn = APP.hostConnections.get(playerId);
  APP.hostConnectionPlayerIds.set(conn, playerId);
  APP.hostConnections.set(playerId, conn);
  if (existingConn && existingConn !== conn) {
    try {
      existingConn.close();
    } catch (error) {
      // The replacement connection is already active, so old-channel cleanup is best-effort.
    }
  }
}

function wireHostPeer(peer) {
  peer.on("connection", (conn) => {
    conn.on("open", () => {
      conn.on("data", (data) => handleHostMessage(conn, data));
      conn.on("close", () => handleHostDisconnect(getHostConnectionPlayerId(conn), conn));
      conn.on("error", () => handleHostDisconnect(getHostConnectionPlayerId(conn), conn));
    });
  });
}

function createPlayerState(id, profile, isHost = false) {
  return {
    id,
    sessionId: isHost ? "" : sanitizePlayerSessionId(profile.sessionId),
    name: sanitizeName(profile.name || `玩家${Math.floor(Math.random() * 999)}`),
    avatar: sanitizeAvatar(profile.avatar),
    isHost,
    isBot: false,
    online: true,
    joinedAt: Date.now(),
    dissatisfaction: GAME_CONFIG.startDissatisfaction,
    healthAnxiety: GAME_CONFIG.startHealthAnxiety,
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
      successfulRawSex: 0,
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
  APP.autoResumeStarted = true;
  await beginPlayerJoin(roomCode, { name, avatar });
}

async function beginPlayerJoin(roomCode, profile, options = {}) {
  const sessionId = getOrCreatePlayerSessionId(roomCode, options.sessionId);
  destroyPeerState();
  rememberPlayerProfile(profile);
  APP.playerSessionId = sessionId;
  APP.pendingRoomCode = roomCode;
  persistPlayerRoomInUrl(roomCode);
  setJoinFormBusy(true, options.isReconnect ? "正在接回座位…" : "潛入中…");
  showToast(options.isReconnect ? "正在接回你原本的座位。" : "正在找主揪對暗號，等我一下。");
  try {
    await ensurePeerLibrary();
    createPlayerPeer(roomCode, profile, {
      isReconnect: Boolean(options.isReconnect),
      preserveSnapshot: Boolean(options.preserveSnapshot),
      sessionId
    });
  } catch (error) {
    clearJoinAttemptState();
    showToast("連線工具沒載到，再滑一次就好。");
  }
}

function createPlayerPeer(roomCode, profile, options = {}) {
  const peerId = `happy-party-player-${randomId(12)}`;
  const peer = createPeerClient(peerId);
  let initialized = false;
  const preservedSnapshot = options.preserveSnapshot ? APP.playerSnapshot : null;
  const sessionId = getOrCreatePlayerSessionId(roomCode, options.sessionId || APP.playerSessionId);
  rememberPlayerProfile(profile);
  APP.playerSessionId = sessionId;
  APP.peer = peer;
  APP.role = "player";
  APP.roomCode = roomCode;
  APP.hostPeerId = `${HOST_PEER_PREFIX}${roomCode}`;
  const openTimer = setTimeout(() => {
    if (initialized || APP.peer !== peer) {
      return;
    }
    try {
      peer.destroy();
    } catch (error) {
      // The reconnect loop below will replace this peer object.
    }
    schedulePlayerReconnect("手機連線等太久了，我換一條路再接一次。");
  }, PEER_OPEN_TIMEOUT_MS);

  peer.on("open", (id) => {
    if (initialized) {
      if (APP.peer === peer && APP.role === "player" && !APP.hostConn?.open) {
        wirePlayerPeer(APP.playerProfile || profile, { isReconnect: true });
      }
      return;
    }
    initialized = true;
    clearTimeout(openTimer);
    APP.peer = peer;
    APP.selfId = id;
    APP.playerSnapshot = preservedSnapshot;
    if (!options.isReconnect) {
      APP.playerReconnectAttempts = 0;
      APP.playerReconnectActive = false;
    }
    if (APP.playerSnapshot) {
      renderPlayerSnapshot();
    } else {
      renderJoiningLobby(profile, roomCode, options.isReconnect ? "接回座位中" : "潛入中");
    }
    wirePlayerPeer(profile, { isReconnect: Boolean(options.isReconnect) });
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
    clearTimeout(openTimer);
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

  if (APP.hostConn) {
    const pendingConn = APP.hostConn;
    APP.hostConn = null;
    try {
      pendingConn.close();
    } catch (error) {
      // A fresh channel is created below even if the pending channel cannot close cleanly.
    }
  }

  const conn = APP.peer.connect(APP.hostPeerId, {
    reliable: true,
    serialization: "json",
    metadata: { sessionId: APP.playerSessionId }
  });
  APP.hostConn = conn;
  APP.lastHostPacketAt = Date.now();
  startJoinAttemptTimeout();

  conn.on("open", () => {
    APP.lastHostPacketAt = Date.now();
    startPlayerConnectionWatchdog();
    if (!APP.playerSnapshot) {
      renderJoiningLobby(profile, APP.roomCode, options.isReconnect ? "重新對暗號" : "等主揪點頭");
    }
    startJoinAttemptTimeout();
    conn.send({
      type: "join-request",
      payload: {
        name: profile.name,
        avatar: profile.avatar,
        sessionId: APP.playerSessionId,
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

    const requestedSessionId = sanitizePlayerSessionId(
      packet.payload?.sessionId || conn.metadata?.sessionId
    );
    const directPlayer = room.players[conn.peer] || null;
    if (
      directPlayer?.sessionId
      && requestedSessionId
      && directPlayer.sessionId !== requestedSessionId
    ) {
      conn.send({ type: "join-rejected", reason: "這個座位的手機憑證對不上，重新掃一次 QR Code。" });
      conn.close();
      return;
    }

    const existingPlayer = findPlayerBySessionId(room, requestedSessionId) || directPlayer;
    if (existingPlayer) {
      const playerId = existingPlayer.id;
      if (
        room.phase !== "lobby"
        && room.gamePlayerIds?.length
        && !room.gamePlayerIds.includes(playerId)
      ) {
        conn.send({ type: "join-rejected", reason: "這局開始時你不在桌上，下桌再來。" });
        conn.close();
        return;
      }
      clearHostDisconnectTimer(playerId);
      bindHostConnection(playerId, conn);
      APP.lastSentSnapshotKeys.delete(playerId);
      existingPlayer.online = true;
      existingPlayer.sessionId = requestedSessionId || existingPlayer.sessionId;
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

    const occupiedSeats = Object.keys(room.players).length;
    if (occupiedSeats >= GAME_CONFIG.maxPlayers) {
      conn.send({ type: "join-rejected", reason: "包廂爆滿啦，真的塞不下。" });
      conn.close();
      return;
    }

    const playerId = conn.peer;
    bindHostConnection(playerId, conn);
    room.players[playerId] = createPlayerState(playerId, packet.payload || {}, false);
    hostSyncAll({ immediate: true });
    return;
  }

  const playerId = getHostConnectionPlayerId(conn);
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
  if (conn) {
    APP.hostConnectionPlayerIds.delete(conn);
  }
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
  APP.lastHostPacketAt = Date.now();

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

  if (packet.type === "action-rejected") {
    APP.localPending.submission = null;
    APP.localPending.utility = null;
    renderPlayerSnapshot();
    showToast(packet.message || "這個選項現在不能用。");
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
  return room.gamePlayerIds?.length
    ? room.gamePlayerIds.filter((playerId) => Boolean(room.players[playerId]))
    : Object.keys(room.players);
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
  const carrierMissionStatus = me.isCarrier
    ? calculateCarrierMissionStatus(Object.values(room.players))
    : null;

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
      dissatisfaction: me.dissatisfaction,
      healthAnxiety: me.healthAnxiety,
      intimacyCount: me.intimacyCount,
      testkits: me.testkits,
      hospitalVisitsRemaining: Math.max(0, GAME_CONFIG.hospitalVisitLimit - (me.stats.hospitals || 0)),
      detectedSelf: me.detectedSelf,
      detectedInfected: me.detectedSelf ? me.detectedInfected : null,
      isInitialCarrier: Boolean(me.isCarrier),
      carrierRawSexSuccesses: me.isCarrier ? (me.stats.successfulRawSex || 0) : 0,
      carrierCondomLockChance: me.isCarrier ? getCarrierCondomLockChance(me) : 0,
      carrierMissionStatus
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
      eventModals: [
        ...buildCarrierMissionModals(me, room.roundIndex, playerId),
        ...buildRoundEventModals(privateStateForPlayer(room, playerId), room.roundIndex, playerId)
      ],
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
    dissatisfactionEvent: privateState.dissatisfactionEvent || null,
    carrierPressureEvent: privateState.carrierPressureEvent || null,
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
        dissatisfactionEvent: personal.dissatisfactionEvent,
        carrierPressureEvent: personal.carrierPressureEvent,
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
    notes: [],
    eventModals: []
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
    queueSnapshotEventModals(snapshot.round.eventModals);
    return;
  }
  if (snapshot.phase === "summary") {
    renderSummary(snapshot);
    switchScreen("summary-screen");
    queueSnapshotEventModals(snapshot.summary.private.eventModals);
    return;
  }
  if (snapshot.phase === "awards") {
    renderAwards(snapshot);
    switchScreen("awards-screen");
  }
}

function renderLobby(snapshot) {
  const isHostLobby = snapshot.role === "host";
  const isTestLobby = Boolean(snapshot.testMode);
  const onlinePlayers = snapshot.players.filter((player) => player.online);
  const onlineCount = onlinePlayers.length;
  const offlineCount = snapshot.players.length - onlineCount;
  const playersNeeded = Math.max(0, GAME_CONFIG.minPlayers - onlineCount);
  APP.dom.lobbyScreen.classList.toggle("host-lobby", isHostLobby);
  APP.dom.lobbyScreen.classList.toggle("player-lobby", !isHostLobby);
  APP.dom.lobbyScreen.classList.toggle("test-lobby", isTestLobby);
  APP.dom.lobbyEyebrow.textContent = isTestLobby ? "測試遊玩" : "正式遊玩";
  APP.dom.lobbyTitle.textContent = isTestLobby
    ? (isHostLobby
        ? (playersNeeded ? "手機先掃碼，人不夠再叫分身" : "人齊啦，測試隨時可以開始")
        : "你進到測試桌了")
    : (isHostLobby ? "掃碼加入，名字立刻上牆" : "你已經連上主持人");
  APP.dom.phasePill.textContent = isHostLobby
    ? `${onlineCount} 人在線`
    : (isTestLobby ? "等測試主揪發車" : "名字已上牆");
  APP.dom.roomCodeDisplay.textContent = snapshot.roomCode;
  APP.dom.joinLinkDisplay.textContent = snapshot.joinLink;
  APP.dom.playerCountDisplay.textContent = String(onlineCount);
  APP.dom.startGameBtn.disabled = !snapshot.canStart;
  APP.dom.startGameBtn.textContent = isTestLobby
    ? (playersNeeded ? `再差 ${playersNeeded} 人` : "開始測試")
    : (playersNeeded ? `再等 ${playersNeeded} 人` : "人齊，開始遊戲");
  APP.dom.hostControls.classList.toggle("hidden", snapshot.role !== "host");

  if (isHostLobby) {
    APP.dom.playerWallStatus.textContent = offlineCount
      ? `${onlineCount} 人在線，${offlineCount} 人正在接回來。`
      : (playersNeeded ? `手機連上就會立刻出現，還差 ${playersNeeded} 人可以開始。` : "人數到齊，所有手機都在線。");
  } else {
    APP.dom.playerWallStatus.textContent = "你的名字已經出現在主持畫面上。";
  }

  if (snapshot.role === "host") {
    APP.dom.qrWrap.classList.remove("hidden");
    renderQrCode(snapshot.joinLink, 220);
  } else {
    APP.dom.qrWrap.classList.add("hidden");
  }

  const previousPlayerIds = APP.lobbyPlayerIds;
  const previousOnlinePlayerIds = APP.lobbyOnlinePlayerIds;
  const currentPlayerIds = new Set(snapshot.players.map((player) => player.id));
  const currentOnlinePlayerIds = new Set(onlinePlayers.map((player) => player.id));
  const fragment = document.createDocumentFragment();
  snapshot.players.forEach((player) => {
    const identityLabel = player.isHost ? "主揪" : player.isBot ? "分身" : "玩家";
    const justRejoined = isHostLobby
      && player.online
      && previousPlayerIds.has(player.id)
      && !previousOnlinePlayerIds.has(player.id);
    const statusLabel = justRejoined
      ? "重新連上"
      : player.online ? (player.isBot ? "待命中" : "連線成功") : "正在接回來";
    const row = document.createElement("article");
    const justJoined = isHostLobby && previousPlayerIds.size > 0 && !previousPlayerIds.has(player.id);
    row.className = `player-row${isHostLobby ? " player-tile" : ""}${player.online ? "" : " offline"}${justJoined ? " just-joined" : ""}${justRejoined ? " just-rejoined" : ""}`;
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
  APP.lobbyOnlinePlayerIds = currentOnlinePlayerIds;
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

function renderRound(snapshot) {
  const self = snapshot.self;
  const round = snapshot.round;
  const pendingSubmission = snapshot.role === "player" ? APP.localPending.submission : null;
  const pendingUtility = snapshot.role === "player" ? APP.localPending.utility : null;
  const reconnecting = snapshot.role === "player" && APP.playerReconnectActive;
  const effectiveSubmission = round.submission || pendingSubmission;
  const isLocked = Boolean(effectiveSubmission || pendingUtility || reconnecting);
  APP.dom.roundTitle.textContent = `Round ${snapshot.roundIndex} / ${snapshot.roundCount}`;
  const carrierPreview = isHostTestMode()
    && APP.testCarrierPreviewActive
    && APP.hostRoom?.players[getHostViewPlayerId()]?.isCarrier;
  APP.dom.selfRolePill.textContent = carrierPreview
    ? "偷看：初始帶原者"
    : self.isInitialCarrier ? "初始帶原者 · 別說破" : describeRolePill(self);
  APP.dom.carrierMissionBanner.classList.toggle("hidden", !self.isInitialCarrier);
  if (self.isInitialCarrier) {
    const successes = self.carrierRawSexSuccesses || 0;
    const chancePercent = Math.round((self.carrierCondomLockChance || 0) * 100);
    const mission = self.carrierMissionStatus || {
      directInfections: 0,
      indirectInfections: 0,
      directGoal: GAME_CONFIG.carrierDirectInfectionWinCount,
      indirectGoal: GAME_CONFIG.carrierIndirectInfectionWinCount
    };
    const pressure = successes < GAME_CONFIG.carrierCondomLockMinimumRawSex
      ? `你再 ${GAME_CONFIG.carrierCondomLockMinimumRawSex - successes} 次無套開始鎖套`
      : `你的鎖套率 ${chancePercent}%`;
    APP.dom.carrierMissionProgress.textContent = `全隊直傳 ${mission.directInfections} / ${mission.directGoal} · 感染鏈 ${mission.indirectInfections} / ${mission.indirectGoal} · ${pressure}`;
  }
  APP.dom.dissatisfactionValue.textContent = `${self.dissatisfaction}%`;
  APP.dom.healthAnxietyValue.textContent = `${self.healthAnxiety}%`;
  APP.dom.intimacyValue.textContent = String(self.intimacyCount);
  APP.dom.testkitValue.textContent = String(self.testkits);
  APP.dom.dissatisfactionBar.style.width = `${self.dissatisfaction}%`;
  APP.dom.healthAnxietyBar.style.width = `${self.healthAnxiety}%`;
  const healthAnxietyBlocksChat = self.healthAnxiety >= GAME_CONFIG.healthAnxietyChatThreshold;
  const hospitalVisitsRemaining = self.hospitalVisitsRemaining || 0;
  APP.dom.healthAnxietyWarning.classList.toggle("hidden", !healthAnxietyBlocksChat);

  if (!round.partner) {
    APP.dom.partnerAvatar.textContent = "🪑";
    APP.dom.partnerName.textContent = "這局放空";
    APP.dom.partnerFlirt.textContent = "「這局讓你喘口氣，暫時沒人跟你對到。」";
    APP.dom.partnerTags.replaceChildren();
    setPartnerToolState(false, isLocked, healthAnxietyBlocksChat, hospitalVisitsRemaining);
    renderActionButtonStates([], {}, effectiveSubmission, true, Boolean(pendingUtility));
  } else {
    APP.dom.partnerAvatar.textContent = round.partner.avatar;
    APP.dom.partnerName.textContent = round.partner.name;
    APP.dom.partnerFlirt.textContent = `「${round.partner.flirt}」`;
    renderPartnerTags(round.partner, self.healthAnxiety);
    setPartnerToolState(true, isLocked, healthAnxietyBlocksChat, hospitalVisitsRemaining);
    renderActionButtonStates(round.availableActions, round.actionLocks || {}, effectiveSubmission, false, Boolean(pendingUtility || reconnecting));
  }

  startCountdown(round.deadlineAt, round.submissionProgress, snapshot.role === "host");
}

function setPartnerToolState(hasPartner, locked, healthAnxietyBlocksChat = false, hospitalVisitsRemaining = 0) {
  APP.dom.chatBtn.disabled = !hasPartner || locked || healthAnxietyBlocksChat;
  APP.dom.testBtn.disabled = !hasPartner || locked;
  APP.dom.hospitalBtn.disabled = locked || hospitalVisitsRemaining <= 0;
  APP.dom.hospitalBtn.textContent = hospitalVisitsRemaining > 0
    ? `🏥 去驗一下（剩 ${hospitalVisitsRemaining} 次）`
    : "🏥 今晚已驗過";
}

function renderPartnerTags(partner, healthAnxiety) {
  const fragment = document.createDocumentFragment();
  const shouldBlur = healthAnxiety >= GAME_CONFIG.healthAnxietyChatThreshold;

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
  if (partner.dissatisfactionEvent) {
    const eventBadge = document.createElement("div");
    eventBadge.className = "tag tag-risk-strong";
    eventBadge.innerHTML = `<span class="icon">${escapeHtml(partner.dissatisfactionEvent.icon)}</span><span>${escapeHtml(partner.dissatisfactionEvent.badge)}</span>`;
    fragment.appendChild(eventBadge);
  }
  if (partner.carrierPressureEvent) {
    const eventBadge = document.createElement("div");
    eventBadge.className = "tag tag-risk-strong";
    eventBadge.innerHTML = `<span class="icon">${escapeHtml(partner.carrierPressureEvent.icon)}</span><span>${escapeHtml(partner.carrierPressureEvent.badge)}</span>`;
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
        ${entry.dissatisfactionEvent ? `<span class="phase-pill warm">${escapeHtml(`失控：${entry.dissatisfactionEvent.badge}`)}</span>` : ""}
        ${entry.carrierPressureEvent ? `<span class="phase-pill warm">${escapeHtml(`氣勢：${entry.carrierPressureEvent.badge}`)}</span>` : ""}
      </div>
      <p class="replay-body">${escapeHtml(entry.summary.body)}</p>
      <div class="summary-extra">${chips}${notes}</div>
      <div class="replay-stats">
        <span>${escapeHtml(publicLine)}</span>
        <strong>${escapeHtml(resultLabel)}</strong>
      </div>
      <div class="replay-meters">
        <span>欲求不滿值 ${entry.postState.dissatisfaction}%</span>
        <span>焦慮得病值 ${entry.postState.healthAnxiety}%</span>
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

function getTestBotFillCount(room) {
  if (!room?.testMode || room.phase !== "lobby") {
    return 0;
  }
  const playersNeeded = Math.max(0, GAME_CONFIG.minPlayers - activeLobbyPlayers(room).length);
  const availableSeats = Math.max(0, GAME_CONFIG.maxPlayers - Object.keys(room.players).length);
  return Math.min(playersNeeded, availableSeats);
}

function ensureSoloTestPlayers(room) {
  if (!room?.testMode || room.phase !== "lobby") {
    return 0;
  }
  room.testBotIds = room.testBotIds || [];
  const neededCount = getTestBotFillCount(room);

  for (let index = 0; index < neededCount; index += 1) {
    const botNumber = room.testBotIds.length + 1;
    const botId = `happy-party-bot-${randomId(10)}`;
    const bot = createPlayerState(botId, createTestBotProfile(botNumber), false);
    bot.isBot = true;
    bot.joinedAt = Date.now() + botNumber;
    room.players[botId] = bot;
    room.testBotIds.push(botId);
  }
  return neededCount;
}

function fillTestRoomWithBots() {
  const room = APP.hostRoom;
  if (APP.role !== "host" || !room?.testMode || room.phase !== "lobby") {
    return;
  }

  const addedCount = ensureSoloTestPlayers(room);
  hostSyncAll({ immediate: true });
  showToast(addedCount > 0
    ? `叫來 ${addedCount} 個電腦分身，現在可以開局啦。`
    : "人數已經夠了，不用再叫分身。");
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
  Object.keys(room.players).forEach((playerId) => {
    if (activeIds.includes(playerId)) {
      return;
    }
    clearHostDisconnectTimer(playerId);
    APP.lastSentSnapshotKeys.delete(playerId);
    delete room.players[playerId];
  });
  room.gamePlayerIds = activeIds.slice();
  const shuffledIds = shuffle(activeIds);
  room.initialCarrierIds = shuffledIds.slice(0, Math.min(GAME_CONFIG.initialCarrierCount, shuffledIds.length));
  room.pairSchedule = [];
  room.finalResults = null;
  room.finale = null;
  room.summary = null;
  room.replayArchive = [];

  activeIds.forEach((playerId) => {
    const player = room.players[playerId];
    player.dissatisfaction = GAME_CONFIG.startDissatisfaction;
    player.healthAnxiety = GAME_CONFIG.startHealthAnxiety;
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
      successfulRawSex: 0,
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

function buildNextRoundPairs(room, playerIds) {
  const pairCounts = new Map();
  const byeCounts = new Map(playerIds.map((playerId) => [playerId, 0]));
  const previousPartners = new Map();
  const previousRounds = room.pairSchedule || [];

  previousRounds.forEach((pairs, roundIndex) => {
    const pairedIds = new Set();
    pairs.forEach(([left, right]) => {
      const key = [left, right].sort().join("|");
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      pairedIds.add(left);
      pairedIds.add(right);
      if (roundIndex === previousRounds.length - 1) {
        previousPartners.set(left, right);
        previousPartners.set(right, left);
      }
    });
    playerIds.forEach((playerId) => {
      if (!pairedIds.has(playerId)) {
        byeCounts.set(playerId, (byeCounts.get(playerId) || 0) + 1);
      }
    });
  });

  const remaining = shuffle(playerIds);
  if (remaining.length % 2 === 1) {
    const lowestByeCount = Math.min(...remaining.map((playerId) => byeCounts.get(playerId) || 0));
    const byeCandidates = remaining.filter((playerId) => (byeCounts.get(playerId) || 0) === lowestByeCount);
    const byePlayerId = randomFrom(byeCandidates);
    remaining.splice(remaining.indexOf(byePlayerId), 1);
  }

  const pairs = [];
  while (remaining.length > 1) {
    const leftId = remaining.shift();
    const candidates = remaining.map((rightId) => ({
      playerId: rightId,
      weight: calculatePairingWeight(room, leftId, rightId, pairCounts, previousPartners)
    }));
    const rightId = pickWeightedPlayer(candidates);
    remaining.splice(remaining.indexOf(rightId), 1);
    pairs.push([leftId, rightId]);
  }

  return pairs;
}

function calculatePairingWeight(room, leftId, rightId, pairCounts, previousPartners) {
  const key = [leftId, rightId].sort().join("|");
  const repeatCount = pairCounts.get(key) || 0;
  let weight = 1 / (1 + repeatCount * 2.5);
  if (previousPartners.get(leftId) === rightId) {
    weight *= 0.12;
  }
  return Math.max(0.01, weight);
}

function pickWeightedPlayer(candidates) {
  const totalWeight = candidates.reduce((total, candidate) => total + candidate.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const candidate of candidates) {
    cursor -= candidate.weight;
    if (cursor <= 0) {
      return candidate.playerId;
    }
  }
  return candidates[candidates.length - 1].playerId;
}

function startHostRound() {
  const room = APP.hostRoom;
  const pairMap = {};
  const activeIds = getGamePlayerIds(room);
  const pairs = buildNextRoundPairs(room, activeIds);
  room.pairSchedule[room.roundIndex - 1] = pairs;
  activeIds.forEach((playerId) => {
    pairMap[playerId] = null;
  });

  pairs.forEach(([left, right]) => {
    pairMap[left] = right;
    pairMap[right] = left;
  });

  const randomEventsEnabled = room.roundIndex > 1;
  const roundRestrictions = createRoundRestrictions(activeIds, pairs, randomEventsEnabled);
  const privateMap = {};
  activeIds.forEach((playerId) => {
    privateMap[playerId] = createPrivateRoundState(
      playerId,
      pairMap[playerId],
      roundRestrictions[playerId],
      randomEventsEnabled
    );
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
  Object.entries(privateMap).forEach(([playerId, privateState]) => {
    if (privateState.forcedAction) {
      room.round.submissions[playerId] = privateState.forcedAction;
    }
  });
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

function privateStateForPlayer(room, playerId) {
  return room.round?.private?.[playerId] || {};
}

function buildRoundEventModals(privateState, roundIndex, playerId) {
  if (roundIndex <= 1) {
    return [];
  }
  const events = [];
  const roundNotice = privateState?.roundNotice;
  if (roundNotice && privateState.actionTransform !== "remove_condom") {
    events.push({
      id: `round-${roundIndex}-${playerId}-random-event`,
      icon: roundNotice.icon,
      kicker: "現場突然亂入",
      title: roundNotice.badge,
      body: roundNotice.detail
    });
  }

  const dissatisfactionEvent = privateState?.dissatisfactionEvent;
  if (dissatisfactionEvent) {
    events.push({
      id: `round-${roundIndex}-${playerId}-dissatisfaction-event`,
      icon: dissatisfactionEvent.icon,
      kicker: "欲求不滿失控",
      title: dissatisfactionEvent.badge,
      body: dissatisfactionEvent.detail
    });
  }
  const carrierPressureEvent = privateState?.carrierPressureEvent;
  if (carrierPressureEvent) {
    events.push({
      id: `round-${roundIndex}-${playerId}-carrier-pressure`,
      icon: carrierPressureEvent.icon,
      kicker: "對方氣勢壓過來",
      title: carrierPressureEvent.badge,
      body: carrierPressureEvent.detail
    });
  }
  return events;
}

function buildCarrierMissionModals(player, roundIndex, playerId) {
  if (roundIndex !== 1 || !player?.isCarrier) {
    return [];
  }
  return [{
    id: `round-1-${playerId}-carrier-mission`,
    icon: "🦠",
    kicker: "你的隱藏身分",
    title: "你是初始帶原者",
    body: "你是今晚 6 位帶原者之一。全隊直傳 6 人、讓後來感染的人再拐中 15 人，或把有下場的人全送進感染名單，6 人就一起贏。你無套性交成功 2 次後，遇到你的人開始抽 25% 鎖套，最高 70%。"
  }];
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
    return canVisitHospital(player) && Math.random() < 0.28 ? "hospital" : "refuse";
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
  const nerve = visibleRisk - visibleSafety - testedDelta - noticeDelta + Math.floor(player.healthAnxiety / 18);
  const heat = player.dissatisfaction - Math.floor(player.healthAnxiety / 2) - (visibleRisk * 7) + (visibleSafety * 5) + (testedDelta * 4);

  if (nerve >= 4 && canVisitHospital(player) && Math.random() < 0.45) {
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

function createPrivateRoundState(
  playerId,
  partnerId,
  restriction = { blockedActions: [], roundNotice: null, riskMultiplier: 1, riskBonus: 0, actionTransform: null, carrierPressureEvent: null },
  randomEventsEnabled = true
) {
  if (!partnerId) {
    return {
      hiddenIndices: [],
      revealedIndices: [],
      dissatisfactionEvent: null,
      forcedAction: null,
      selfBlockedActions: [],
      testedResult: null,
      blockedActions: restriction.blockedActions.slice(),
      roundNotice: restriction.roundNotice,
      riskMultiplier: restriction.riskMultiplier,
      riskBonus: restriction.riskBonus,
      actionTransform: restriction.actionTransform || null,
      carrierPressureEvent: restriction.carrierPressureEvent || null
    };
  }

  const player = APP.hostRoom.players[playerId];
  const partner = APP.hostRoom.players[partnerId];
  const hiddenIndices = new Set();
  partner.persona.tags.forEach((tag, index) => {
    if (Math.random() < tag.hiddenChance) {
      hiddenIndices.add(index);
    }
  });

  if (hiddenIndices.size === partner.persona.tags.length && hiddenIndices.size > 0) {
    hiddenIndices.delete(hiddenIndices.values().next().value);
  }

  const visibleIndices = partner.persona.tags
    .map((_, index) => index)
    .filter((index) => !hiddenIndices.has(index));
  const extraHiddenCount = Math.min(
    visibleIndices.length,
    Math.floor(player.healthAnxiety / GAME_CONFIG.healthAnxietyClueStep)
  );
  shuffle(visibleIndices).slice(0, extraHiddenCount).forEach((index) => hiddenIndices.add(index));
  const dissatisfactionEvent = randomEventsEnabled ? createDissatisfactionEvent(player) : null;

  return {
    hiddenIndices: [...hiddenIndices],
    revealedIndices: [],
    dissatisfactionEvent,
    forcedAction: dissatisfactionEvent?.type === "force_raw_sex" ? "sex_raw" : null,
    selfBlockedActions: dissatisfactionEvent?.type === "reject_condom"
      ? ["oral_condom", "sex_condom"]
      : [],
    testedResult: null,
    blockedActions: restriction.blockedActions.slice(),
    roundNotice: restriction.roundNotice,
    riskMultiplier: restriction.riskMultiplier,
    riskBonus: restriction.riskBonus,
    actionTransform: restriction.actionTransform || null,
    carrierPressureEvent: restriction.carrierPressureEvent || null
  };
}

function createDissatisfactionEvent(player) {
  const value = player?.dissatisfaction || 0;
  if (value < GAME_CONFIG.dissatisfactionEventThreshold) {
    return null;
  }
  const progress = (value - GAME_CONFIG.dissatisfactionEventThreshold)
    / (100 - GAME_CONFIG.dissatisfactionEventThreshold);
  const chance = GAME_CONFIG.dissatisfactionEventBaseChance
    + progress * (GAME_CONFIG.dissatisfactionEventMaxChance - GAME_CONFIG.dissatisfactionEventBaseChance);
  if (Math.random() >= chance) {
    return null;
  }
  if (Math.random() < 0.5) {
    return {
      type: "force_raw_sex",
      icon: "🔥",
      badge: "沒得選，我就是要做",
      detail: "欲求不滿直接接管這一局，所有選項作廢，無條件套用無套性交。"
    };
  }
  return {
    type: "reject_condom",
    icon: "🙅",
    badge: "你不想",
    detail: "你現在就是不想戴，這局的戴套口交和戴套性交全部上鎖。"
  };
}

function createRoundRestrictions(activeIds, pairs, randomEventsEnabled = true) {
  const restrictions = Object.fromEntries(activeIds.map((playerId) => [playerId, {
    blockedActions: [],
    roundNotice: null,
    riskMultiplier: 1,
    riskBonus: 0,
    actionTransform: null,
    carrierPressureEvent: null
  }]));

  if (!randomEventsEnabled) {
    return restrictions;
  }

  pairs.forEach(([leftId, rightId]) => {
    const event = createPairRoundEvent();
    restrictions[leftId] = {
      blockedActions: event.blockedActions.slice(),
      roundNotice: event.roundNotice,
      riskMultiplier: event.riskMultiplier,
      riskBonus: event.riskBonus,
      actionTransform: event.actionTransform,
      carrierPressureEvent: createCarrierPressureEvent(APP.hostRoom?.players[rightId])
    };
    restrictions[rightId] = {
      blockedActions: event.blockedActions.slice(),
      roundNotice: event.roundNotice,
      riskMultiplier: event.riskMultiplier,
      riskBonus: event.riskBonus,
      actionTransform: event.actionTransform,
      carrierPressureEvent: createCarrierPressureEvent(APP.hostRoom?.players[leftId])
    };
  });

  return restrictions;
}

function getCarrierCondomLockChance(player) {
  if (!player?.isCarrier) {
    return 0;
  }
  const successes = player.stats?.successfulRawSex || 0;
  if (successes < GAME_CONFIG.carrierCondomLockMinimumRawSex) {
    return 0;
  }
  const extraSuccesses = successes - GAME_CONFIG.carrierCondomLockMinimumRawSex;
  return Math.min(
    GAME_CONFIG.carrierCondomLockMaxChance,
    GAME_CONFIG.carrierCondomLockBaseChance + extraSuccesses * GAME_CONFIG.carrierCondomLockChanceStep
  );
}

function createCarrierPressureEvent(partner) {
  const chance = getCarrierCondomLockChance(partner);
  if (chance <= 0 || Math.random() >= chance) {
    return null;
  }
  return {
    icon: "🦠",
    badge: "他今晚越玩越敢",
    detail: "他把套子推回來：「我現在就是不想戴。」這局戴套口交和戴套性交全鎖。",
    lockLabel: "他不給"
  };
}

function createPairRoundEvent() {
  if (Math.random() >= GAME_CONFIG.forceMajeureChance) {
    return {
      blockedActions: [],
      roundNotice: null,
      riskMultiplier: 1,
      riskBonus: 0,
      actionTransform: null
    };
  }

  const picked = randomFrom(ROUND_EVENT_DECK);
  return {
    blockedActions: picked?.blockedActions || [],
    riskMultiplier: picked?.riskMultiplier || 1,
    riskBonus: picked?.riskBonus || 0,
    actionTransform: picked?.actionTransform || null,
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
  if (privateState?.forcedAction === "sex_raw") {
    return Object.fromEntries(
      GAME_CONFIG.actionOrder
        .filter((actionKey) => actionKey !== "sex_raw")
        .map((actionKey) => [actionKey, "沒得選"])
    );
  }
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
  if (privateState?.carrierPressureEvent) {
    lockActions(
      ["oral_condom", "sex_condom"],
      privateState.carrierPressureEvent.lockLabel || "他不給"
    );
  }
  (privateState?.selfBlockedActions || []).forEach((actionKey) => {
    locks[actionKey] = "你不想";
  });

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
  const player = room.players[playerId];
  return GAME_CONFIG.actionOrder.filter((actionKey) => (
    !locks[actionKey]
    && (actionKey !== "hospital" || canVisitHospital(player))
  ));
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

  if (room.players[playerId].healthAnxiety >= GAME_CONFIG.healthAnxietyChatThreshold) {
    sendPrivateToast(playerId, "你焦慮程度太高了，無法好好聊天得到對方的資訊");
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
    if (!canVisitHospital(room.players[playerId])) {
      sendActionRejected(playerId, "醫院整晚只能去一次，你剛剛已經驗過了。");
      return;
    }
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

function applyRoundTimeoutDefaults(room) {
  const autoRefusedPlayerIds = new Set();
  Object.entries(room.round.pairMap).forEach(([playerId, partnerId]) => {
    if (!partnerId || room.round.submissions[playerId]) {
      return;
    }
    room.round.submissions[playerId] = "refuse";
    autoRefusedPlayerIds.add(playerId);
  });
  room.round.autoRefusedPlayerIds = [...autoRefusedPlayerIds];
  return autoRefusedPlayerIds;
}

function applyTimeoutDefaultSummary(summary, partnerName, wasOverridden) {
  if (wasOverridden) {
    summary.notes.unshift("時間到沒選，本來會默認「換一個」，但這局的欲求不滿事件蓋過了所有選項。");
    return;
  }
  summary.body = `45 秒到了，你沒出牌，這局算你換掉 ${partnerName}。`;
  summary.notes.unshift("鐘響沒選，默認「換一個」。");
}

function resolveHostedRound() {
  const room = APP.hostRoom;
  if (!room || !room.round || room.round.resolved) {
    return;
  }

  clearTestBotTimers();
  clearTimeout(APP.hostDeadlineTimer);
  room.round.resolved = true;
  const autoRefusedPlayerIds = applyRoundTimeoutDefaults(room);

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
          notes: [
            "醫院讓焦慮得病值歸零，但欲求不滿值會往上跑；今晚的醫院機會也用掉了。",
            ...(player.isInfected ? ["你已經知道自己陽性；後面還能繼續互動，感染也還能往下傳。"] : [])
          ]
        };
        return;
      }
      applyRefuse(player);
      privateSummaries[playerId] = {
        title: `第 ${room.roundIndex} 局翻牌`,
        body: "你這局剛好空窗，什麼都沒發生，欲求不滿值也往上跑。",
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
    const forcedRawSex = room.round.private[leftId]?.forcedAction === "sex_raw"
      || room.round.private[rightId]?.forcedAction === "sex_raw";
    if (autoRefusedPlayerIds.has(leftId)) {
      applyTimeoutDefaultSummary(result.left, room.players[rightId].name, forcedRawSex);
    }
    if (autoRefusedPlayerIds.has(rightId)) {
      applyTimeoutDefaultSummary(result.right, room.players[leftId].name, forcedRawSex);
    }
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
      dissatisfactionEvent: privateState.dissatisfactionEvent
        ? {
            icon: privateState.dissatisfactionEvent.icon,
            badge: privateState.dissatisfactionEvent.badge,
            type: privateState.dissatisfactionEvent.type
          }
        : null,
      carrierPressureEvent: privateState.carrierPressureEvent
        ? {
            icon: privateState.carrierPressureEvent.icon,
            badge: privateState.carrierPressureEvent.badge
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
        dissatisfaction: player.dissatisfaction,
        healthAnxiety: player.healthAnxiety
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
  const leftSummary = { title: `第 ${roundIndex} 局翻牌`, body: "", chips: [], notes: [], eventModals: [] };
  const rightSummary = { title: `第 ${roundIndex} 局翻牌`, body: "", chips: [], notes: [], eventModals: [] };
  const publicStats = {
    intimateEvents: 0,
    riskyEvents: 0,
    hospitalVisits: 0,
    forceMajeureSurges: 0
  };
  const leftPrivate = room.round.private[leftId] || {};
  const rightPrivate = room.round.private[rightId] || {};
  const forcedRawSex = leftPrivate.forcedAction === "sex_raw" || rightPrivate.forcedAction === "sex_raw";

  if (!forcedRawSex && leftActionKey === "hospital") {
    applyHospital(left);
    publicStats.hospitalVisits += 1;
    leftSummary.body = left.isInfected
      ? "你這局衝去醫院，翻牌答案是：你真的中獎了。"
      : "你這局衝去醫院，翻牌答案是：你目前還安全。";
    leftSummary.chips.push({ label: left.isInfected ? "真的中獎" : "目前安全", kind: left.isInfected ? "bad" : "good" });
    leftSummary.notes.push("醫院讓焦慮得病值歸零，但欲求不滿值會往上跑；今晚的醫院機會也用掉了。");
    if (left.isInfected) {
      leftSummary.notes.push("你已經知道自己陽性；後面還能繼續互動，感染也還能往下傳。");
    }
  }

  if (!forcedRawSex && rightActionKey === "hospital") {
    applyHospital(right);
    publicStats.hospitalVisits += 1;
    rightSummary.body = right.isInfected
      ? "你這局衝去醫院，翻牌答案是：你真的中獎了。"
      : "你這局衝去醫院，翻牌答案是：你目前還安全。";
    rightSummary.chips.push({ label: right.isInfected ? "真的中獎" : "目前安全", kind: right.isInfected ? "bad" : "good" });
    rightSummary.notes.push("醫院讓焦慮得病值歸零，但欲求不滿值會往上跑；今晚的醫院機會也用掉了。");
    if (right.isInfected) {
      rightSummary.notes.push("你已經知道自己陽性；後面還能繼續互動，感染也還能往下傳。");
    }
  }

  const leftIntimacy = forcedRawSex || isIntimacyAction(leftActionKey);
  const rightIntimacy = forcedRawSex || isIntimacyAction(rightActionKey);
  const blocked = !forcedRawSex
    && (leftActionKey === "hospital" || rightActionKey === "hospital" || leftActionKey === "refuse" || rightActionKey === "refuse");

  if (blocked) {
    if (leftActionKey === "refuse") {
      applyRefuse(left, right);
      leftSummary.body = `你決定跟 ${right.name} 保持距離，這局直接不接球。`;
      leftSummary.chips.push({ label: right.isInfected ? "閃得漂亮" : "自己閃人", kind: right.isInfected ? "good" : "warn" });
      if (right.isInfected) {
        left.stats.correctLeaves += 1;
      }
    } else if (!leftSummary.body) {
      applyBlockedAttempt(leftSummary, left, right, leftActionKey, rightActionKey);
    }

    if (rightActionKey === "refuse") {
      applyRefuse(right, left);
      rightSummary.body = `你決定跟 ${left.name} 保持距離，這局直接不接球。`;
      rightSummary.chips.push({ label: left.isInfected ? "閃得漂亮" : "自己閃人", kind: left.isInfected ? "good" : "warn" });
      if (left.isInfected) {
        right.stats.correctLeaves += 1;
      }
    } else if (!rightSummary.body) {
      applyBlockedAttempt(rightSummary, right, left, rightActionKey, leftActionKey);
    }

    appendNoExperienceReminder(leftSummary, left);
    appendNoExperienceReminder(rightSummary, right);
    return { left: leftSummary, right: rightSummary, public: publicStats };
  }

  if (leftIntimacy && rightIntimacy) {
    const pairEffect = room.round.private[leftId] || room.round.private[rightId] || {};
    const riskContext = {
      riskMultiplier: pairEffect.riskMultiplier || 1,
      riskBonus: pairEffect.riskBonus || 0,
      roundNotice: pairEffect.roundNotice || null,
      actionTransform: pairEffect.actionTransform || null
    };
    const intendedActionKey = forcedRawSex ? "sex_raw" : resolveSharedAction(leftActionKey, rightActionKey);
    const intendedAction = ACTIONS[intendedActionKey];
    const condomWasPunctured = riskContext.actionTransform === "remove_condom" && intendedAction.condom;
    const resolvedActionKey = condomWasPunctured
      ? `${intendedAction.category}_raw`
      : intendedActionKey;
    const resolvedAction = ACTIONS[resolvedActionKey];
    const forceMajeureRisk = riskContext.riskMultiplier > 1
      || riskContext.riskBonus > 0
      || condomWasPunctured;
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

    const meterResult = resolvedAction.condom
      ? "有戴套，欲求不滿值小幅上升，焦慮得病值只多一點。"
      : "沒戴套，欲求不滿值降了，但焦慮得病值會飆得很快。";
    leftSummary.body = `你和 ${right.name} 最後真的演到「${resolvedAction.shortLabel}」。${meterResult}`;
    rightSummary.body = `你和 ${left.name} 最後真的演到「${resolvedAction.shortLabel}」。${meterResult}`;
    leftSummary.chips.push({ label: resolvedAction.shortLabel, kind: resolvedAction.condom ? "good" : "warn" });
    rightSummary.chips.push({ label: resolvedAction.shortLabel, kind: resolvedAction.condom ? "good" : "warn" });

    if (resolvedActionKey === "sex_raw") {
      appendCarrierRawSexProgress(leftSummary, left);
      appendCarrierRawSexProgress(rightSummary, right);
    }

    if (forcedRawSex) {
      leftSummary.chips.push({ label: "沒得選，我就是要做", kind: "warn" });
      rightSummary.chips.push({ label: "沒得選，我就是要做", kind: "warn" });
      leftSummary.notes.push("欲求不滿事件蓋過所有人的選項，這局無條件套用無套性交。");
      rightSummary.notes.push("欲求不滿事件蓋過所有人的選項，這局無條件套用無套性交。");
    }

    if (forceMajeureRisk && riskContext.roundNotice) {
      const eventChip = condomWasPunctured ? "套子被戳破" : "亂入加碼風險";
      leftSummary.chips.push({ label: eventChip, kind: "warn" });
      rightSummary.chips.push({ label: eventChip, kind: "warn" });
      const eventNote = condomWasPunctured
        ? `你原本選「${intendedAction.shortLabel}」，翻牌才發現對方偷偷戳破套子，改判「${resolvedAction.shortLabel}」。`
        : `這局碰上「${riskContext.roundNotice.badge}」，現場一亂，風險也跟著亂飛。`;
      leftSummary.notes.push(eventNote);
      rightSummary.notes.push(eventNote);
      if (condomWasPunctured) {
        leftSummary.eventModals.push({
          id: `round-${roundIndex}-${leftId}-punctured-condom`,
          icon: riskContext.roundNotice.icon,
          kicker: "翻牌強制事件",
          title: riskContext.roundNotice.badge,
          body: eventNote
        });
        rightSummary.eventModals.push({
          id: `round-${roundIndex}-${rightId}-punctured-condom`,
          icon: riskContext.roundNotice.icon,
          kicker: "翻牌強制事件",
          title: riskContext.roundNotice.badge,
          body: eventNote
        });
      }
    }

    if (!leftInfectedBefore && left.isInfected && !left.detectedSelf) {
      leftSummary.notes.push("剛中招不一定有感覺；如果還沒用掉那次機會，可以去醫院翻答案。");
    } else if (leftPartnerWasInfected && !left.isInfected) {
      left.stats.closeCalls += 1;
      leftSummary.notes.push("這波其實擦身得很驚險，但你暫時還沒看到明顯異狀。");
    }

    if (!rightInfectedBefore && right.isInfected && !right.detectedSelf) {
      rightSummary.notes.push("剛中招不一定有感覺；如果還沒用掉那次機會，可以去醫院翻答案。");
    } else if (rightPartnerWasInfected && !right.isInfected) {
      right.stats.closeCalls += 1;
      rightSummary.notes.push("這波其實擦身得很驚險，但你暫時還沒看到明顯異狀。");
    }

    return { left: leftSummary, right: rightSummary, public: publicStats };
  }

  return { left: leftSummary, right: rightSummary, public: publicStats };
}

function applyBlockedAttempt(summary, player, partner, actionKey, partnerActionKey) {
  applyFailedAttempt(player);
  const actionLabel = ACTIONS[actionKey]?.shortLabel || "親密互動";
  if (partnerActionKey === "hospital") {
    summary.body = `你選了「${actionLabel}」，但 ${partner.name} 這局跑去醫院，所以什麼都沒發生。`;
    summary.chips.push({ label: "對方去醫院", kind: "warn" });
    return;
  }
  summary.body = `你選了「${actionLabel}」，但 ${partner.name} 選了「換一個」，所以這局沒發生。`;
  summary.chips.push({ label: "對方選了換一個", kind: "warn" });
}

function appendNoExperienceReminder(summary, player) {
  if (player.intimacyCount === 0) {
    summary.notes.push("你目前還是 0 次親密；終局還是 0 次，才會拿到「來觀光」。");
  }
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
  if (!canVisitHospital(player)) {
    return false;
  }
  player.dissatisfaction = clamp(
    player.dissatisfaction + GAME_CONFIG.hospitalDissatisfactionGain,
    0,
    100
  );
  player.healthAnxiety = 0;
  player.detectedSelf = true;
  player.detectedInfected = player.isInfected;
  player.stats.hospitals += 1;
  return true;
}

function canVisitHospital(player) {
  return Boolean(player)
    && (player.stats?.hospitals || 0) < GAME_CONFIG.hospitalVisitLimit;
}

function applyRefuse(player) {
  player.dissatisfaction = finalizeDissatisfaction(
    player.dissatisfaction + GAME_CONFIG.refuseDissatisfactionGain
  );
}

function applyFailedAttempt(player) {
  player.dissatisfaction = finalizeDissatisfaction(
    player.dissatisfaction + GAME_CONFIG.failedAttemptDissatisfactionGain
  );
  player.stats.failedAttempts += 1;
}

function applyIntimacy(player, actionKey, partnerWasInfected) {
  const action = ACTIONS[actionKey];
  const dissatisfactionDelta = action.dissatisfactionDelta || 0;
  const nextDissatisfaction = player.dissatisfaction + dissatisfactionDelta;
  player.dissatisfaction = dissatisfactionDelta > 0
    ? finalizeDissatisfaction(nextDissatisfaction)
    : clamp(nextDissatisfaction, 0, 100);
  player.healthAnxiety = finalizeHealthAnxiety(player.healthAnxiety + action.healthAnxietyGain);
  player.intimacyCount += 1;
  player.stats.successfulIntimacies += 1;
  if (actionKey === "sex_raw") {
    player.stats.successfulRawSex = (player.stats.successfulRawSex || 0) + 1;
  }
  if (!action.condom) {
    player.stats.riskyActions += 1;
  }
  player.history.push({
    round: APP.hostRoom.roundIndex,
    action: actionKey,
    partnerWasInfected
  });
}

function appendCarrierRawSexProgress(summary, player) {
  if (!player?.isCarrier) {
    return;
  }
  const successes = player.stats?.successfulRawSex || 0;
  const chance = getCarrierCondomLockChance(player);
  if (chance <= 0) {
    const remaining = GAME_CONFIG.carrierCondomLockMinimumRawSex - successes;
    summary.notes.push(`帶原進度 ${successes} 次。再成功 ${remaining} 次無套性交，對方就開始抽鎖套。`);
    return;
  }
  summary.chips.push({ label: `帶原者氣勢 ${Math.round(chance * 100)}%`, kind: "warn" });
  summary.notes.push(`帶原進度 ${successes} 次。之後遇到你的人，有 ${Math.round(chance * 100)}% 會被鎖住兩個戴套選項。`);
}

function finalizeHealthAnxiety(value) {
  const extra = value > 20 ? 2 : 0;
  return clamp(value + extra, 0, 100);
}

function finalizeDissatisfaction(value) {
  const extra = value > 50 ? 4 : 0;
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

function calculateCarrierMissionStatus(players) {
  const playerById = new Map(players.map((player) => [player.id, player]));
  let directInfections = 0;
  let indirectInfections = 0;

  players.forEach((player) => {
    if (player.isCarrier || !player.isInfected || !player.infectionSourceId) {
      return;
    }
    const source = playerById.get(player.infectionSourceId);
    if (!source) {
      return;
    }
    if (source.isCarrier) {
      directInfections += 1;
    } else {
      indirectInfections += 1;
    }
  });

  const activePlayers = players.filter((player) => player.intimacyCount > 0);
  const activePlayersAllInfected = activePlayers.length > 0
    && activePlayers.every((player) => player.isInfected);
  const directGoal = GAME_CONFIG.carrierDirectInfectionWinCount;
  const indirectGoal = GAME_CONFIG.carrierIndirectInfectionWinCount;
  const directGoalMet = directInfections >= directGoal;
  const indirectGoalMet = indirectInfections >= indirectGoal;

  return {
    directInfections,
    indirectInfections,
    directGoal,
    indirectGoal,
    directGoalMet,
    indirectGoalMet,
    activePlayersAllInfected,
    victory: activePlayersAllInfected || directGoalMet || indirectGoalMet
  };
}

function describeCarrierVictory(carrierMissionStatus) {
  const status = carrierMissionStatus;
  if (status.activePlayersAllInfected) {
    return {
      heading: "有下場的全淪陷，六位帶原者包下舞台",
      reason: "有下場的人全部感染"
    };
  }
  if (status.directGoalMet && status.indirectGoalMet) {
    return {
      heading: "直傳、感染鏈雙線過關",
      reason: `全隊直傳 ${status.directInfections} 人，感染鏈又拐中 ${status.indirectInfections} 人`
    };
  }
  if (status.directGoalMet) {
    return {
      heading: `全隊直傳 ${status.directInfections} 人，六位帶原者過關`,
      reason: `全隊直傳達到 ${status.directInfections} 人`
    };
  }
  return {
    heading: `感染鏈拐中 ${status.indirectInfections} 人，六位帶原者過關`,
    reason: `感染鏈間接感染達到 ${status.indirectInfections} 人`
  };
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
  const carrierMissionStatus = calculateCarrierMissionStatus(players);
  const carrierVictoryCopy = carrierMissionStatus.victory
    ? describeCarrierVictory(carrierMissionStatus)
    : null;
  const selection = selectFinalWinners(players, carrierMissionStatus.victory);
  const winnerById = new Map(selection.entries.map((entry) => [entry.player.id, entry]));
  const finalResults = {};

  players.forEach((player) => {
    const winner = winnerById.get(player.id) || null;
    const scoreCard = carrierMissionStatus.victory
      ? calculateCarrierStageScore(player)
      : calculateSurvivalScore(player);
    let kind = "lose";
    let label = "今晚翻車";
    let detail = `親密 ${player.intimacyCount} 次，終局是${player.isInfected ? "感染" : "健康"}，生存分 ${scoreCard.score}。`;

    if (winner && carrierMissionStatus.victory) {
      kind = "carrier";
      label = `帶原勝利 · 第 ${winner.rank} 席`;
      detail = `${carrierVictoryCopy.reason}，帶原任務成功；你帶出 ${player.transmissionCount} 次傳播，站上第 ${winner.rank} 席。`;
    } else if (winner) {
      kind = "winner";
      label = `${player.isInfected ? "逆風勝利" : "健康勝利"} · 第 ${winner.rank} 席`;
      detail = `${player.isInfected ? "雖然終局感染，仍靠整體判斷遞補上榜" : "保持健康並拿下前段生存分"}；生存分 ${winner.scoreCard.score}。`;
    } else if (player.intimacyCount === 0) {
      kind = "lose";
      label = "全程觀望王";
      detail = "你一路看到最後都沒真正下場，遊戲直接判你白來。";
    } else if (carrierMissionStatus.victory) {
      kind = "lose";
      label = "帶原陣營過關";
      detail = `${carrierVictoryCopy.reason}；這局是 6 位初始帶原者的陣營勝利。`;
    } else if (player.isCarrier) {
      kind = "lose";
      label = "帶原任務失敗";
      detail = `全隊直傳 ${carrierMissionStatus.directInfections} / ${carrierMissionStatus.directGoal}、感染鏈 ${carrierMissionStatus.indirectInfections} / ${carrierMissionStatus.indirectGoal}，也沒有全場淪陷；你的生存分是 ${scoreCard.score}。`;
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
  room.finale = buildFinale(players, selection, carrierMissionStatus, finalResults);
  room.phase = "awards";
  hostSyncAll({ immediate: true });
}

function selectFinalWinners(players, carrierVictory) {
  if (carrierVictory) {
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
    hospital: Math.min(player.stats.hospitals, GAME_CONFIG.hospitalVisitLimit) * 3,
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

function buildFinale(players, selection, carrierMissionStatus, finalResults) {
  const winnerCount = selection.entries.length;
  const carrierVictoryCopy = carrierMissionStatus.victory
    ? describeCarrierVictory(carrierMissionStatus)
    : null;
  const heading = carrierMissionStatus.victory
    ? carrierVictoryCopy.heading
    : `${winnerCount} 位終局勝利者上台`;
  const body = carrierMissionStatus.victory
    ? `${carrierVictoryCopy.reason}；終局直傳 ${carrierMissionStatus.directInfections} 人、間接感染 ${carrierMissionStatus.indirectInfections} 人，6 位初始帶原者共同獲勝。`
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

function setCreateRoomBusy(isBusy, mode = "") {
  APP.dom.createRoomBtn.disabled = isBusy;
  APP.dom.createTestRoomBtn.disabled = isBusy;
  APP.dom.createRoomBtn.textContent = isBusy && mode === "formal" ? "正在開正式桌…" : "我要開一桌";
  APP.dom.createTestRoomBtn.textContent = isBusy && mode === "test" ? "正在開測試桌…" : "進入測試房";
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
  APP.lobbyPlayerIds.clear();
  APP.lobbyOnlinePlayerIds.clear();
  APP.testViewPlayerId = "";
  APP.testCarrierPreviewActive = false;
  APP.lastToast.message = "";
  APP.lastToast.shownAt = 0;
  hideToast();
  clearEventModals();
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

function sendActionRejected(playerId, message) {
  if (playerId === APP.selfId || isLocalTestViewPlayer(playerId)) {
    clearLocalPendingState();
    renderPlayerSnapshot();
    showToast(message);
    return;
  }
  const conn = APP.hostConnections.get(playerId);
  if (conn?.open) {
    conn.send({ type: "action-rejected", message });
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

function exitTestMode() {
  if (APP.role !== "host" || !APP.hostRoom?.testMode) {
    return;
  }
  destroyPeerState();
  setCreateRoomBusy(false);
  switchScreen("mode-screen");
  showToast("測試收好，回主畫面啦。");
}

function destroyPeerState() {
  resetTransientUiState();
  clearTimeout(APP.hostDeadlineTimer);
  clearTimeout(APP.hostSyncTimer);
  clearTimeout(APP.joinAttemptTimer);
  clearInterval(APP.hostIntervalTimer);
  clearInterval(APP.playerWatchdogTimer);
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
  APP.hostConnectionPlayerIds.clear();
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
  APP.playerSessionId = "";
  APP.hostDeadlineTimer = null;
  APP.hostIntervalTimer = null;
  APP.playerWatchdogTimer = null;
  APP.lastHostPacketAt = 0;
  APP.hostSyncTimer = null;
  APP.joinAttemptTimer = null;
  stopPlayerReconnectLoop({ preserveProfile: false });
  clearJoinAttemptState();
  clearLocalPendingState();
  syncTestLab();
}
