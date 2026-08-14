const STORAGE_KEY = "happy-party-profile-v1";
const CONSENT_KEY = "happy-party-consent-v1";
const HOST_PEER_PREFIX = "happy-party-host-";
const PUBLIC_JOIN_BASE = "https://victoriac1122.github.io/happy-party-game/";
const TEST_BOT_NAMES = [
  "陪測分身阿酒",
  "氣氛組小王",
  "亂入系阿桃",
  "今晚很敢姐",
  "先看看阿北",
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
  hostRoom: null,
  playerSnapshot: null,
  queuedSnapshot: null,
  actionButtonNodes: [],
  countdownState: null,
  lastSentSnapshotKeys: new Map(),
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
  localPending: {
    submission: null,
    utility: null,
    roundStartedAt: null
  }
};

const ROUND_EVENT_DECK = [
  {
    icon: "🦜",
    blockedActions: ["oral_condom"],
    badge: "我今天就是不想",
    detail: "對方把頭一偏說：「我今天就是不想。」這局不能選「戴套口交」。"
  },
  {
    icon: "🎈",
    blockedActions: ["oral_condom"],
    badge: "嘴巴今天公休",
    detail: "對方一本正經地宣布：「嘴巴今天公休，明天再來。」這局不能選「戴套口交」。"
  },
  {
    icon: "🪩",
    blockedActions: ["oral_condom"],
    badge: "這個我先不要",
    detail: "對方眨眨眼只回你一句：「這個我先不要。」這局不能選「戴套口交」。"
  },
  {
    icon: "🍸",
    blockedActions: ["oral_condom"],
    badge: "不要跟我談流程",
    detail: "對方邊笑邊擺手：「不要跟我談流程，我今天走感覺派。」這局不能選「戴套口交」。"
  },
  {
    icon: "🎤",
    blockedActions: ["oral_condom"],
    badge: "今天走任性路線",
    detail: "對方很有主見地說：「今天走任性路線，那個先不要。」這局不能選「戴套口交」。"
  },
  {
    icon: "🧽",
    blockedActions: ["oral_condom"],
    badge: "先聊天，不要那個",
    detail: "對方把距離拉近，小聲說：「先聊天，不要那個。」這局不能選「戴套口交」。"
  },
  {
    icon: "🐙",
    blockedActions: ["oral_condom"],
    badge: "問就是不想",
    detail: "你才剛開口，對方就秒回：「不要問，問就是不想。」這局不能選「戴套口交」。"
  },
  {
    icon: "📦",
    blockedActions: ["oral_condom"],
    badge: "我剛剛許願了，不行",
    detail: "對方神神祕祕地說：「我剛剛有許願，今天不走這條線。」這局不能選「戴套口交」。"
  },
  {
    icon: "🪄",
    blockedActions: ["oral_condom"],
    badge: "今天口交額度用完",
    detail: "對方攤手聳肩：「今天口交額度用完，改天再說。」這局不能選「戴套口交」。"
  },
  {
    icon: "🎲",
    blockedActions: ["oral_condom"],
    badge: "規則是我剛剛現編的",
    detail: "對方理直氣壯地下結論：「規則是我剛剛現編的，這個今天不玩。」這局不能選「戴套口交」。"
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
    blockedActions: ["oral_condom"],
    badge: "地板太滑",
    detail: "地板滑到像夜店版溜冰場，連站著都像在抽卡，這局不能選「戴套口交」，而且只要真的有互動，風險再多 10%。",
    riskBonus: 0.1
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
  APP.actionButtonNodes = [];
  ["oral_condom", "sex_condom", "oral_raw", "sex_raw", "refuse"].forEach((actionKey) => {
    const action = ACTIONS[actionKey];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-option";
    button.dataset.action = actionKey;
    button.innerHTML = `<strong>${action.label}</strong><span>${action.description}</span>`;
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
        roundStartedAt: APP.localPending.roundStartedAt
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

function handleCreateRoom() {
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
    showToast("你主揪名號空著，我先幫你套上「今晚主揪」。");
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
    showToast("桌子開好啦，快把掃碼圖丟出去抓人。");
  });

  peer.on("error", (error) => {
    if (error.type === "unavailable-id" && attempts < 6) {
      peer.destroy();
      attemptCreateHostPeer(profile, attempts + 1);
      return;
    }
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
    showToast("這房號像是手滑打的，重輸一次。");
    return;
  }
  if (!name) {
    showToast("先取個有記憶點的名字吧。");
    return;
  }

  saveStoredProfile({ name, avatar });
  destroyPeerState();
  setJoinFormBusy(true, "潛入中…");
  showToast("正在找主揪對暗號，等我一下。");
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
    renderJoiningLobby(profile, roomCode, "潛入中");
    startJoinAttemptTimeout();
    wirePlayerPeer(profile);
  });

  peer.on("error", (error) => {
    clearJoinAttemptState();
    if (!APP.playerSnapshot) {
      switchScreen("join-screen");
    }
    showToast(`滑進包廂失敗：${error.type || error.message}`);
  });
}

function wirePlayerPeer(profile) {
  const conn = APP.peer.connect(APP.hostPeerId, { reliable: true });
  APP.hostConn = conn;

  conn.on("open", () => {
    renderJoiningLobby(profile, APP.roomCode, "等主揪點頭");
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
    showToast("你跟主揪斷線了，重新滑進來吧。");
  });
  conn.on("error", () => {
    clearLocalPendingState();
    clearJoinAttemptState();
    if (!APP.playerSnapshot) {
      switchScreen("join-screen");
    }
    showToast("連線突然散掉了，重新整理再衝一次。");
  });
}

function handleHostMessage(conn, packet) {
  if (!packet || typeof packet.type !== "string") {
    return;
  }

  if (packet.type === "join-request") {
    const room = APP.hostRoom;
    if (!room || room.phase !== "lobby") {
      conn.send({ type: "join-rejected", reason: "這桌已經開喝了，這局先別硬擠。" });
      conn.close();
      return;
    }

    const currentCount = activeLobbyPlayers(room).length;
    if (currentCount >= GAME_CONFIG.maxPlayers) {
      conn.send({ type: "join-rejected", reason: "包廂爆滿啦，真的塞不下。" });
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
  APP.lastSentSnapshotKeys.delete(playerId);
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
    showToast(packet.reason || "主揪現在不收人。");
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
      isCarrier: me.isCarrier,
      detectedSelf: me.detectedSelf,
      detectedInfected: me.detectedSelf ? me.isInfected : null
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
      selfResult: room.finalResults[playerId]
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
  APP.dom.lobbyTitle.textContent = snapshot.role === "host" ? "等人到齊再開喝" : "你已卡位，等主揪發車";
  APP.dom.phasePill.textContent = "等開桌";
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
    renderQrCode(snapshot.joinLink);
  } else {
    APP.dom.qrWrap.classList.add("hidden");
  }

  const fragment = document.createDocumentFragment();
  snapshot.players.forEach((player) => {
    const identityLabel = player.isHost ? "主揪" : player.isBot ? "陪測分身" : "玩家";
    const statusLabel = player.online ? (player.isBot ? "待命中" : "已卡位") : "斷線中";
    const row = document.createElement("article");
    row.className = `player-row${player.online ? "" : " offline"}`;
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
}

function renderQrCanvas(target, link, width = 180) {
  if (!target || !window.QRCode) {
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
    APP.dom.partnerName.textContent = "這局放空";
    APP.dom.partnerFlirt.textContent = "「這局先讓你喘口氣，暫時沒人跟你對到。」";
    APP.dom.partnerTags.replaceChildren();
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

function renderActionButtonStates(availableActions, submittedAction, noPartner, pendingUtility = false) {
  APP.actionButtonNodes.forEach((button) => {
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
      ? "你的選擇正飛去主揪那邊…"
      : "你已鎖牌，等主揪翻牌。";
    return;
  }
  if (pendingUtility) {
    APP.dom.submittedActionLabel.textContent = pendingUtility.label;
    APP.dom.submissionHint.textContent = "動作送出了，先別急著亂按。";
    return;
  }
  if (noPartner) {
    APP.dom.submittedActionLabel.textContent = "這局可放空";
    APP.dom.submissionHint.textContent = "這局沒配到人，你可以發呆；想驗身還是能跑醫院。";
    return;
  }
  APP.dom.submittedActionLabel.textContent = "還沒拍板";
  APP.dom.submissionHint.textContent = partner
    ? `${partner.roundNotice ? `亂入事件：${partner.roundNotice.detail} ` : ""}倒數跑完還沒選，遊戲就會幫你自動「換下一位」。`
    : "這局放空就好，等其他人把戲演完。";
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
  if (self.isCarrier) {
    return "你就是開場那 6 個帶原者之一";
  }
  if (self.detectedSelf && self.detectedInfected) {
    return "醫院說：你中獎了";
  }
  if (self.detectedSelf && !self.detectedInfected) {
    return "醫院說：你目前安全";
  }
  return "你開場是健康人，還沒去驗";
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
    card.className = `podium-card rank-${index + 1}`;
    card.innerHTML = `
      <div class="podium-rank">${index + 1}</div>
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
    showToast("現在有真人在場，先別偷切成單機測試。");
    return;
  }

  ensureSoloTestPlayers(room);
  APP.testViewPlayerId = "";
  showToast("陪測分身已火速就位，現在一支手機也能把整桌跑完。");
  startHostedGame();
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
    sendPrivateToast(playerId, `已鎖牌：${ACTIONS.hospital.shortLabel}`);
    if (allRoundActionsSubmitted()) {
      resolveHostedRound();
      return;
    }
    hostSyncAll();
    return;
  }

  if (!partnerId) {
    room.round.submissions[playerId] = "refuse";
    sendPrivateToast(playerId, `已鎖牌：${ACTIONS.refuse.shortLabel}`);
    hostSyncAll();
    return;
  }

  const allowedActions = getAllowedActionsForPlayer(playerId);
  const finalAction = allowedActions.includes(actionKey) ? actionKey : "refuse";
  room.round.submissions[playerId] = finalAction;
  sendPrivateToast(playerId, `已鎖牌：${ACTIONS[finalAction].shortLabel}`);

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
  room.phase = "summary";
  hostSyncAll({ immediate: true });
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
      ? "你這局先衝去醫院，翻牌答案是：你真的中獎了。"
      : "你這局先衝去醫院，翻牌答案是：你目前還安全。";
    leftSummary.chips.push({ label: left.isInfected ? "真的中獎" : "目前安全", kind: left.isInfected ? "bad" : "good" });
    leftSummary.notes.push("醫院會讓你瞬間清醒，但回來只會更想玩。");
  }

  if (rightActionKey === "hospital") {
    applyHospital(right);
    publicStats.hospitalVisits += 1;
    rightSummary.body = right.isInfected
      ? "你這局先衝去醫院，翻牌答案是：你真的中獎了。"
      : "你這局先衝去醫院，翻牌答案是：你目前還安全。";
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
      leftSummary.chips.push({ label: right.isInfected ? "閃得漂亮" : "自己先撤", kind: right.isInfected ? "good" : "warn" });
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
      rightSummary.chips.push({ label: left.isInfected ? "閃得漂亮" : "自己先撤", kind: left.isInfected ? "good" : "warn" });
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

    leftSummary.body = `你和 ${right.name} 最後真的演到「${resolvedAction.shortLabel}」。上頭值掉了點，但心裡也更七上八下。`;
    rightSummary.body = `你和 ${left.name} 最後真的演到「${resolvedAction.shortLabel}」。上頭值掉了點，但心裡也更七上八下。`;
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
  const healthyWinners = players.filter((player) => !player.isInfected && player.intimacyCount > 0);
  const everyoneInfected = players.every((player) => player.isInfected);
  const finalResults = {};

  players.forEach((player) => {
    let kind = "lose";
    let label = "今晚翻車";
    let detail = `演了 ${player.intimacyCount} 次，最後狀態是${player.isInfected ? "感染" : "健康"}。`;

    if (player.intimacyCount === 0) {
      kind = "lose";
      label = "全程觀望王";
      detail = "你一路看到最後都沒真正下場，遊戲直接判你白來。";
    } else if (healthyWinners.some((winner) => winner.id === player.id)) {
      kind = "winner";
      label = "健康倖存王";
      detail = `演了 ${player.intimacyCount} 次還能全身而退，真的有兩把刷子。`;
    } else if (everyoneInfected && player.isCarrier) {
      kind = "carrier";
      label = "帶原者笑到最後";
      detail = "你是開局那批帶原者之一，最後真的把全場帶歪了。";
    } else if (player.isCarrier) {
      kind = "lose";
      label = "帶原者差一口氣";
      detail = "最後還有人全身而退，這桌沒有被你們徹底帶壞。";
    } else {
      kind = "lose";
      label = player.isInfected ? "終局中標" : "差一點就成神";
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
    heading = "健康倖存者笑到最後";
    body = `今晚有 ${healthyWinners.length} 位玩家不是來觀光的，真的下場後還能全身而退。`;
  } else if (everyoneInfected) {
    heading = "全場淪陷，帶原者開香檳";
    body = "收官時全場通通中標，開局那 6 位帶原者把這桌徹底帶歪。";
  } else {
    heading = "沒人完美收工";
    body = "雖然沒有倖存王，但也沒全場淪陷，大家今晚算是各有各的翻車。";
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
      detail: `${finalResults[player.id].detail} 還順手傳了 ${player.transmissionCount} 次。`,
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
      playerName: bestCarrier?.name || "帶原者本人",
      title: "今晚最會帶節奏",
      subtitle: bestCarrier ? `一口氣帶飛 ${bestCarrier.transmissionCount} 次` : "帶原者今晚真的贏麻了"
    });
  } else {
    entries.push({
      avatar: safest?.avatar || "✨",
      playerName: safest?.name || "倖存本人",
      title: "全身而退王",
      subtitle: safest ? `演了 ${safest.intimacyCount} 次還是沒翻車` : "今晚沒人能乾淨收工"
    });
  }

  entries.push({
    avatar: spreader?.avatar || "🔥",
    playerName: spreader?.name || "高風險本尊",
    title: "帶風向散播王",
    subtitle: spreader ? `一路帶出 ${spreader.transmissionCount} 次傳播` : "今晚大家居然都還算克制"
  });

  entries.push({
    avatar: social?.avatar || "🎉",
    playerName: social?.name || "派對本人",
    title: "今晚最忙的人",
    subtitle: social ? `全場跑了 ${social.intimacyCount} 次互動` : "下次再來刷存在感"
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

function startJoinAttemptTimeout() {
  clearTimeout(APP.joinAttemptTimer);
  APP.joinAttemptTimer = setTimeout(() => {
    if (APP.playerSnapshot || APP.role !== "player") {
      return;
    }
    destroyPeerState();
    switchScreen("join-screen");
    showToast("滑進包廂超時了，檢查一下房號再試一次。");
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
  clearTimeout(APP.hostIntervalTimer);
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
  APP.hostDeadlineTimer = null;
  APP.hostIntervalTimer = null;
  APP.hostSyncTimer = null;
  APP.joinAttemptTimer = null;
  clearJoinAttemptState();
  clearLocalPendingState();
  syncTestLab();
}
