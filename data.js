const GAME_CONFIG = {
  title: "快樂酒局派對遊戲",
  minPlayers: 8,
  maxPlayers: 40,
  roundCount: 10,
  initialCarrierCount: 6,
  finalWinnerCount: 6,
  roundDurationMs: 30 * 1000,
  startSatisfaction: 45,
  startAnxiety: 0,
  hospitalSatisfactionLoss: 10,
  refuseSatisfactionLoss: 8,
  failedAttemptSatisfactionLoss: 6,
  failedAttemptAnxietyGain: 4,
  forceMajeureChance: 0.55,
  panicThreshold: 80,
  satisfactionClueStep: 35,
  riskPairingStrength: 0.65,
  actionOrder: [
    "oral_condom",
    "sex_condom",
    "oral_raw",
    "sex_raw",
    "refuse",
    "hospital"
  ]
};

const ACTIONS = {
  oral_condom: {
    key: "oral_condom",
    label: "🍬 戴套口交",
    shortLabel: "戴套口交",
    category: "oral",
    condom: true,
    satisfactionGain: 6,
    anxietyGain: 2,
    transmissionRisk: 0.05,
    description: "先試水溫，穩穩來不硬衝。"
  },
  sex_condom: {
    key: "sex_condom",
    label: "🛡️ 戴套性交",
    shortLabel: "戴套性交",
    category: "sex",
    condom: true,
    satisfactionGain: 10,
    anxietyGain: 5,
    transmissionRisk: 0.15,
    description: "中規中矩，但至少還沒把理智丟掉。"
  },
  oral_raw: {
    key: "oral_raw",
    label: "🍭 無套口交",
    shortLabel: "無套口交",
    category: "oral",
    condom: false,
    satisfactionGain: 12,
    anxietyGain: 15,
    transmissionRisk: 0.3,
    description: "當下很敢，事後通常比較會想很多。"
  },
  sex_raw: {
    key: "sex_raw",
    label: "🔥 無套性交",
    shortLabel: "無套性交",
    category: "sex",
    condom: false,
    satisfactionGain: 22,
    anxietyGain: 30,
    transmissionRisk: 0.6,
    description: "這招最猛，也最像在跟命運猜拳。"
  },
  refuse: {
    key: "refuse",
    label: "👋 換一個",
    shortLabel: "換一個",
    category: "none",
    condom: false,
    satisfactionGain: 0,
    anxietyGain: 0,
    transmissionRisk: 0,
    description: "不陪了先撤，讓腦袋保住一點。"
  },
  hospital: {
    key: "hospital",
    label: "🏥 去醫院檢查",
    shortLabel: "去醫院檢查",
    category: "none",
    condom: false,
    satisfactionGain: 0,
    anxietyGain: 0,
    transmissionRisk: 0,
    description: "去把腦袋洗清醒，順便看自己有沒有中獎。"
  }
};

const AVATARS = [
  "🌚", "🦊", "🐷", "🐶", "🦄", "🐲", "🐙", "👽", "💀", "🤡",
  "🤠", "👻", "🧛", "🧟", "🐺", "🦜", "🐸", "🐻", "🦁", "🐼",
  "🐱", "🐰", "🐵", "🐯", "🐨", "🐹", "🦝", "🐧", "🦩", "🦖",
  "🤖", "😈", "🥸", "😎", "🥳", "🤩", "🫠", "🥴", "😼", "💃"
];

const FLIRT_LINES = [
  "你站那麼近，是想讓我先笑還是先心動？",
  "先別裝正經，今晚大家都不是來背課文的。",
  "你看起來像會惹事的人，我有點想知道會多惹事。",
  "你是自己走過來的，還是氣氛把你推過來的？",
  "先說好，我今天的理智沒有帶很多。",
  "你再靠近一點，我就當你已經答應一半。",
  "今晚不一定要乖，但至少要有趣。",
  "你那個眼神很像要出事，我先記一下。",
  "別站那麼遠，像在排隊買鹹酥雞。",
  "你是危險，還是只是很會包裝？",
  "不如我們直接跳過尷尬，自然發瘋。",
  "敢不敢陪我把今晚玩得有點離譜？"
];

const TAG_POOL = [
  {
    id: "syphilis_rash_palms",
    text: "手掌／腳底有紅斑",
    color: "risk-strong",
    group: "symptom",
    suspicion: 0.95,
    hiddenChance: 0.8,
    clue: "如果你看到這個，快跑。這是梅毒二期非常典型的警訊。"
  },
  {
    id: "red_chancre",
    text: "私密處長了硬硬的紅疹",
    color: "risk-strong",
    group: "symptom",
    suspicion: 0.98,
    hiddenChance: 0.9,
    clue: "這種不痛不癢的硬下疳，是梅毒一期的強烈訊號。"
  },
  {
    id: "blisters",
    text: "嘴角或下方長了一簇水泡",
    color: "risk-strong",
    group: "symptom",
    suspicion: 0.9,
    hiddenChance: 0.9,
    clue: "疱疹發作期的水泡液傳播力很高，碰一下都可能出事。"
  },
  {
    id: "yellow_stain",
    text: "內褲上有黃色分泌物痕跡",
    color: "risk",
    group: "symptom",
    suspicion: 0.88,
    hiddenChance: 0.55,
    clue: "這類異常分泌物通常不太妙，淋病或其他感染都要提高警覺。"
  },
  {
    id: "cauliflower",
    text: "後方有菜花狀小肉粒",
    color: "risk-strong",
    group: "symptom",
    suspicion: 0.94,
    hiddenChance: 0.88,
    clue: "尖銳濕疣常被形容成菜花狀，這種外觀非常值得警惕。"
  },
  {
    id: "moving_black_scab",
    text: "毛髮根部像有會動的黑點",
    color: "risk-strong",
    group: "symptom",
    suspicion: 0.92,
    hiddenChance: 0.7,
    clue: "這種描述很像陰蝨與蟲卵，不是單純衛生差而已。"
  },
  {
    id: "white_tongue",
    text: "張嘴時舌頭白得像發霉",
    color: "risk",
    group: "symptom",
    suspicion: 0.72,
    hiddenChance: 0.45,
    clue: "成人出現明顯鵝口瘡，常代表免疫狀態出了問題。"
  },
  {
    id: "purple_patch",
    text: "身上有紫紅色斑塊",
    color: "risk",
    group: "symptom",
    suspicion: 0.78,
    hiddenChance: 0.82,
    clue: "看到紫紅色斑塊時，最好把風險評估拉到最高。"
  },
  {
    id: "hair_loss",
    text: "頭髮像被蟲啃過一樣稀疏",
    color: "risk",
    group: "symptom",
    suspicion: 0.62,
    hiddenChance: 0.35,
    clue: "蟲蝕狀落髮常被拿來當作梅毒的典型警訊之一。"
  },
  {
    id: "swollen_nodes",
    text: "脖子或腋下摸起來有腫塊",
    color: "risk",
    group: "symptom",
    suspicion: 0.58,
    hiddenChance: 0.72,
    clue: "淋巴結腫大並不一定等於感染，但確實是值得留心的紅旗。"
  },
  {
    id: "body_rash",
    text: "軀幹長滿不癢的紅疹",
    color: "risk",
    group: "symptom",
    suspicion: 0.66,
    hiddenChance: 0.8,
    clue: "這種不痛不癢的紅疹很容易被誤認成過敏，卻可能不是。"
  },
  {
    id: "furry_tongue",
    text: "舌頭側面有白色毛狀物",
    color: "risk",
    group: "symptom",
    suspicion: 0.74,
    hiddenChance: 0.6,
    clue: "這種口腔線索通常代表免疫狀態不佳，別輕忽。"
  },
  {
    id: "chemical_smell",
    text: "房間裡有刺鼻的化學味",
    color: "risk",
    group: "environment",
    suspicion: 0.48,
    hiddenChance: 0.5,
    clue: "這類味道常讓人聯想到派對藥物與失控的夜晚。"
  },
  {
    id: "blue_bottle",
    text: "床頭擺著奇怪的藍色藥瓶",
    color: "risk",
    group: "environment",
    suspicion: 0.52,
    hiddenChance: 0.7,
    clue: "可能只是一般藥物，也可能是某些需要特別注意的抗病毒藥。"
  },
  {
    id: "needle_mark",
    text: "手臂彎處有針孔與瘀青",
    color: "risk-strong",
    group: "environment",
    suspicion: 0.95,
    hiddenChance: 0.8,
    clue: "靜脈注射是血液傳播風險極高的紅線，看到幾乎不用猶豫。"
  },
  {
    id: "park_invite",
    text: "提議去公園或公廁解決",
    color: "risk",
    group: "environment",
    suspicion: 0.42,
    hiddenChance: 0,
    clue: "環境越混亂，越難掌握風險，也越可能有多重接觸史。"
  },
  {
    id: "party_recently",
    text: "剛參加完多人派對",
    color: "risk",
    group: "environment",
    suspicion: 0.55,
    hiddenChance: 0.65,
    clue: "多重交叉接觸本來就是風險放大器。"
  },
  {
    id: "just_hooked",
    text: "才剛結束上一場約會",
    color: "risk",
    group: "environment",
    suspicion: 0.4,
    hiddenChance: 0.5,
    clue: "無縫接軌的接觸史，本身就值得把警戒線再拉高一格。"
  },
  {
    id: "just_rub",
    text: "一直說『我就蹭蹭』",
    color: "risk",
    group: "environment",
    suspicion: 0.34,
    hiddenChance: 0,
    clue: "這類話術常在試探你能退讓到哪裡。"
  },
  {
    id: "if_clean_raw",
    text: "說『如果你乾淨就能無套』",
    color: "risk",
    group: "environment",
    suspicion: 0.38,
    hiddenChance: 0,
    clue: "把責任推給對方，是很典型的風險話術。"
  },
  {
    id: "fresh_hickey",
    text: "脖子上有新鮮吻痕",
    color: "risk-soft",
    group: "identity",
    suspicion: 0.18,
    hiddenChance: 0.3,
    clue: "不一定代表感染，但大概率代表近期接觸相當頻繁。"
  },
  {
    id: "athlete",
    text: "體育系猛男",
    color: "neutral",
    group: "identity",
    suspicion: 0.18,
    hiddenChance: 0,
    clue: "荷爾蒙很滿，但風險不靠外表判斷。"
  },
  {
    id: "otaku",
    text: "沉迷二次元的宅系玩家",
    color: "neutral",
    group: "identity",
    suspicion: 0.05,
    hiddenChance: 0.12,
    constraint: "no_oral",
    clue: "他對體液接觸很排斥，口交會直接被拒絕。"
  },
  {
    id: "art_student",
    text: "藝術學院長髮仔",
    color: "neutral",
    group: "identity",
    suspicion: 0.16,
    hiddenChance: 0,
    clue: "看起來很自由，但自由不代表一定高風險。"
  },
  {
    id: "exam_stress",
    text: "備考壓力怪",
    color: "neutral",
    group: "identity",
    suspicion: 0.06,
    hiddenChance: 0,
    constraint: "no_oral",
    clue: "他只想速戰速決，口交與前戲意願很低。"
  },
  {
    id: "keyboard_warrior",
    text: "滿嘴騷話的鍵盤俠",
    color: "neutral",
    group: "identity",
    suspicion: 0.08,
    hiddenChance: 0.28,
    constraint: "oral_only",
    clue: "線上很大聲，見面反而只敢做邊緣行為。"
  },
  {
    id: "student_council",
    text: "學生會門面擔當",
    color: "neutral",
    group: "identity",
    suspicion: 0.1,
    hiddenChance: 0,
    clue: "表面光鮮不等於安全，也不等於危險。"
  },
  {
    id: "pure_love",
    text: "自稱純愛戰神",
    color: "positive",
    group: "identity",
    suspicion: 0.04,
    hiddenChance: 0.22,
    constraint: "oral_only",
    clue: "他把插入當成底線，只接受邊緣行為。"
  },
  {
    id: "always_online",
    text: "交友 App 24 小時在線",
    color: "risk-soft",
    group: "identity",
    suspicion: 0.24,
    hiddenChance: 0,
    clue: "極度活躍不等於一定中標，但確實代表接觸機會很多。"
  },
  {
    id: "worker",
    text: "職業性工作者",
    color: "risk-soft",
    group: "identity",
    suspicion: 0.28,
    hiddenChance: 0.35,
    clue: "職業暴露風險高，但安全意識有時反而比一般人更完整。"
  },
  {
    id: "nightclub",
    text: "每週都去夜店蹦迪",
    color: "risk-soft",
    group: "identity",
    suspicion: 0.2,
    hiddenChance: 0,
    clue: "酒精與判斷力下滑總是一起出現。"
  },
  {
    id: "finance",
    text: "金融圈高壓菁英",
    color: "neutral",
    group: "identity",
    suspicion: 0.14,
    hiddenChance: 0,
    clue: "壓力大的人未必高風險，但衝動決策更常見。"
  },
  {
    id: "rocker",
    text: "搖滾樂團樂手",
    color: "neutral",
    group: "identity",
    suspicion: 0.1,
    hiddenChance: 0,
    clue: "生活不規律，不代表一定危險，只代表變數很多。"
  },
  {
    id: "heartbroken",
    text: "剛失戀想找安慰",
    color: "neutral",
    group: "identity",
    suspicion: 0.08,
    hiddenChance: 0,
    clue: "情緒失衡很容易讓人放棄原本的判斷標準。"
  },
  {
    id: "married",
    text: "已婚但想找刺激",
    color: "risk-soft",
    group: "identity",
    suspicion: 0.22,
    hiddenChance: 0.4,
    clue: "雙重生活意味著資訊透明度極低。"
  },
  {
    id: "flight_crew",
    text: "飛行員或空服員",
    color: "neutral",
    group: "identity",
    suspicion: 0.16,
    hiddenChance: 0,
    clue: "行程漂泊、接觸面廣，風險全靠個人管理。"
  },
  {
    id: "dirty_nails",
    text: "指甲縫裡都是黑泥",
    color: "risk-soft",
    group: "hygiene",
    suspicion: 0.26,
    hiddenChance: 0,
    clue: "連最基本的清潔都懶得做，別指望其他地方會更謹慎。"
  },
  {
    id: "too_thin",
    text: "極度消瘦、臉頰凹陷",
    color: "risk",
    group: "hygiene",
    suspicion: 0.36,
    hiddenChance: 0.22,
    clue: "身體狀態不佳就是訊號，至於原因，永遠值得多想一步。"
  },
  {
    id: "coughing",
    text: "一直咳嗽或盜汗",
    color: "risk",
    group: "hygiene",
    suspicion: 0.28,
    hiddenChance: 0.3,
    clue: "免疫狀態出問題時，很多細節都會藏在這些小地方。"
  },
  {
    id: "lights_off",
    text: "堅持不開燈，只留小夜燈",
    color: "risk",
    group: "hygiene",
    suspicion: 0.44,
    hiddenChance: 0,
    clue: "黑暗常常不是情調，而是遮掩。"
  },
  {
    id: "turtleneck",
    text: "大熱天還穿高領",
    color: "risk",
    group: "hygiene",
    suspicion: 0.42,
    hiddenChance: 0,
    clue: "越反常的遮掩，越值得你提高警覺。"
  },
  {
    id: "old_underwear",
    text: "內褲鬆鬆垮垮、很舊",
    color: "neutral",
    group: "hygiene",
    suspicion: 0.04,
    hiddenChance: 0,
    clue: "不修邊幅不等於感染，但確實會影響你對風險的直覺。"
  },
  {
    id: "innocent_student",
    text: "清純男大",
    color: "positive",
    group: "positive",
    suspicion: 0.03,
    hiddenChance: 0,
    clue: "看起來像還沒被世界毒打過，但別只靠臉做判斷。"
  },
  {
    id: "virgin",
    text: "性壓抑的小處男",
    color: "positive",
    group: "positive",
    suspicion: 0.02,
    hiddenChance: 0.18,
    constraint: "no_condom",
    clue: "太緊張導致戴套就手忙腳亂，可能因此拒絕戴套。"
  },
  {
    id: "med_student",
    text: "醫學生或醫師",
    color: "positive",
    group: "positive",
    suspicion: 0.02,
    hiddenChance: 0,
    clue: "通常有醫療常識，也比較理解風險管理的重要性。"
  },
  {
    id: "cdc_staff",
    text: "疾管單位工作者",
    color: "positive",
    group: "positive",
    suspicion: 0.01,
    hiddenChance: 0,
    clue: "這種人最知道麻煩長什麼樣子，也通常最不想碰上。"
  },
  {
    id: "clean_freak",
    text: "重度潔癖",
    color: "positive",
    group: "positive",
    suspicion: 0.02,
    hiddenChance: 0,
    clue: "進門先洗澡的人，至少在衛生層面很難敷衍。"
  },
  {
    id: "blood_donor",
    text: "定期捐血者",
    color: "positive",
    group: "positive",
    suspicion: 0.02,
    hiddenChance: 0.4,
    clue: "定期檢驗確實增加可信度，但不代表百分之百零風險。"
  },
  {
    id: "negative_report",
    text: "當面拆封近期陰性檢驗單",
    color: "positive",
    group: "positive",
    suspicion: 0.01,
    hiddenChance: 0.5,
    clue: "目前最可靠的安全訊號之一，但記得看日期。"
  },
  {
    id: "carry_condoms",
    text: "包裡自備各種安全套",
    color: "positive",
    group: "positive",
    suspicion: 0.01,
    hiddenChance: 0.3,
    constraint: "condom_only",
    clue: "安全意識很強，通常也會堅持只做有保護的選項。"
  },
  {
    id: "refuse_raw",
    text: "明確拒絕無套提議",
    color: "positive",
    group: "positive",
    suspicion: 0.01,
    hiddenChance: 0,
    constraint: "condom_only",
    clue: "有原則的人往往更值得信任。"
  },
  {
    id: "triathlete",
    text: "馬拉松或鐵人三項選手",
    color: "positive",
    group: "positive",
    suspicion: 0.04,
    hiddenChance: 0,
    clue: "生活自律常常代表風險控制也更嚴格。"
  },
  {
    id: "impatient",
    text: "急性子，不想洗澡",
    color: "neutral",
    group: "constraint",
    suspicion: 0.18,
    hiddenChance: 0.3,
    constraint: "no_oral",
    clue: "嫌麻煩的人通常會拒絕口交。"
  },
  {
    id: "latex_allergy",
    text: "對乳膠過敏",
    color: "neutral",
    group: "constraint",
    suspicion: 0.06,
    hiddenChance: 0.4,
    constraint: "no_condom",
    clue: "生理因素讓他無法使用一般保險套。"
  },
  {
    id: "hate_rubber",
    text: "非常討厭橡膠味",
    color: "risk-soft",
    group: "constraint",
    suspicion: 0.22,
    hiddenChance: 0.2,
    constraint: "no_condom",
    clue: "心理抗拒戴套的人，往往會試著讓你一起退讓。"
  },
  {
    id: "dental_surgery",
    text: "嘴裡剛做牙科手術",
    color: "neutral",
    group: "constraint",
    suspicion: 0.04,
    hiddenChance: 0,
    constraint: "no_oral",
    clue: "物理上張嘴不方便，口交幾乎不可能。"
  },
  {
    id: "mouth_ulcer",
    text: "嘴裡有潰瘍或起泡",
    color: "risk",
    group: "constraint",
    suspicion: 0.4,
    hiddenChance: 0.62,
    constraint: "no_oral",
    clue: "嘴巴有傷口時，很多風險都會被放大。"
  },
  {
    id: "conservative",
    text: "比較保守，只敢邊緣互動",
    color: "positive",
    group: "constraint",
    suspicion: 0.02,
    hiddenChance: 0,
    constraint: "oral_only",
    clue: "他不接受插入式互動，只願意停在邊界。"
  },
  {
    id: "religious",
    text: "有宗教信仰，婚前守貞",
    color: "positive",
    group: "constraint",
    suspicion: 0.02,
    hiddenChance: 0.2,
    constraint: "oral_only",
    clue: "插入式行為是明確底線，但邊緣互動不一定完全拒絕。"
  },
  {
    id: "post_surgery",
    text: "剛做完手術，還在恢復期",
    color: "neutral",
    group: "constraint",
    suspicion: 0.03,
    hiddenChance: 0,
    constraint: "oral_only",
    clue: "身體狀態限制了高強度選項。"
  },
  {
    id: "period",
    text: "處於生理期或出血狀態",
    color: "risk",
    group: "constraint",
    suspicion: 0.26,
    hiddenChance: 0.5,
    constraint: "oral_only",
    clue: "這種狀態會讓部分行為的風險明顯提高。"
  },
  {
    id: "roommate_nextdoor",
    text: "室友就在隔壁",
    color: "neutral",
    group: "constraint",
    suspicion: 0.03,
    hiddenChance: 0.1,
    constraint: "oral_only",
    clue: "他只敢做低調、快速的邊緣選項。"
  }
];
