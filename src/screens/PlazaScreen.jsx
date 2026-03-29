import { PASTEL } from "../config";

// --- Profanity Filter (Smart Detection) ---

// Base words - the core forms
const BASE_PROFANITY = [
  // 한국어 핵심 욕설
  "시발","씨발","씨빨","시빨","씨팔","시팔","시부랄","씨부랄","씨불","시불",
  "씹","씹할","씹새","씹년","씹놈","씹덕","씹물","씹치","씹팔","18","십팔","열여덟",
  "개새끼","개색끼","개새기","개색기","개세끼","개자식","개년","개놈","개돼지","개쓰레기","개소리","개지랄","개씹","개좆",
  "병신","병먹","병딱",
  "지랄","지럴","지랼","지롤",
  "닥쳐","닥치","닥처","입닥쳐",
  "꺼져","꺼저","꺼지세요",
  "미친놈","미친년","미친새끼","미친것",
  "좆","좆같","좆나","좆밥","좆만","좆까",
  "새끼","색끼","쌔끼",
  "썅","쌍놈","쌍년",
  "멍청","찐따","찐다","등신","돌아이","또라이","돌대가리",
  "엿먹","엿같","엿되",
  "느금마","느금","니미","니애미","니애비","느개비",
  "걸레","화냥년","창녀","창남","갈보",
  "죽어","뒤져","뒈져","뒤질","죽여","죽일","뒤져라",
  "꼴값","꼴통","추접","추잡",
  "거지","쪽팔","꼬붕","따까리",
  "빡대가리","대가리","주둥이","주둥아리",
  "쓰레기","찌질","찌질이",
  "한남충","한녀충","맘충","틀딱","급식충","진지충",
  "존나","졸라","존니","졸리",
  "빨갱이","쪽바리","짱깨","짱개",

  // 한국어 외설 핵심
  "섹스","야동","포르노","자위","딸치","딸딸이",
  "보지","자지","음경","성기","가슴만져",
  "강간","성폭행","성추행","성희롱","몰카","도촬",
  "음란","변태","노출증",
  "원조교제","원교","조건만남","파파활",
  "떡치다","떡질","따먹다","따먹어",
  "사까시","사까",
  "벗방","몸캠","폰섹","야캠",
  "섹파","쎅파","원나잇",
  "n번방","박사방","그루밍","성착취",
  "오나홀","텐가","딜도","바이브",
  "정액","사정","질액","애액",
  "발기","귀두","고환","음핵","클리토리스","음순",
  "페니스","바기나",
  "체위","후배위","정상위","여상위",
  "쓰리섬","난교","스와핑","근친상간",
  "소아성애","로리","쇼타",
  "얼싸","몸싸","입싸","중출",
  "딥쓰로트","펠라치오","쿤니",
  "애널","항문성교","피스팅",
  "육봉","육변기","꼴리다","꼴림",
  "야짤","야겜","19금",
  "후장","뒷구멍","똥꼬",
  "대딸","핸플","풀코스",
  "게이비하","호모","레즈비하","트젠비하",

  // 영어
  "fuck","shit","bitch","asshole","bastard","damn","dick","cock","pussy","cunt",
  "whore","slut","retard","nigger","nigga","faggot","fag","motherfucker",
  "wanker","tosser","bollocks","prick","douche","douchebag",
  "penis","vagina","clitoris","testicle","scrotum","erection","boner",
  "ejaculate","masturbate","blowjob","handjob","rimjob","deepthroat",
  "gangbang","orgy","threesome","creampie","facial","squirt",
  "fellatio","cunnilingus","doggystyle","bareback",
  "dominatrix","bondage","spank","choking",
  "pornhub","xvideos","xhamster","onlyfans","chaturbate",
  "stripper","escort","hooker","prostitute","brothel",
  "pedophile","bestiality","necrophilia","incest","jailbait",
  "lolita","loli","shota","upskirt","voyeur","grope",
  "revenge porn","deepfake","sextortion","grooming",
  "horny","kinky","lewd","smut","hentai","ahegao","futanari",
  "sexting","nudes","dickpic",

  // 일본어
  "くそ","クソ","ばか","バカ","馬鹿","あほ","アホ",
  "しね","シネ","死ね","ころす","殺す",
  "きもい","キモい","うざい","ウザい",
  "畜生","くたばれ","野郎","テメエ","貴様",
  "ゴミ","カス","クズ","デブ","ブス","ハゲ",
  "まんこ","マンコ","ちんこ","チンコ","ちんぽ","チンポ",
  "おっぱい","オッパイ","エロ","エッチ","変態",
  "痴漢","ヤリマン","淫乱","セックス","オナニー",
  "レイプ","強姦","売春","風俗","ソープ",
  "ロリコン","ショタコン","キチガイ","障害者","ガイジ",
  "中出し","顔射","ぶっかけ","フェラ","クンニ",
  "手コキ","パイズリ","潮吹き","乱交","緊縛",
  "盗撮","パンチラ","肉便器","アヘ顔","寝取り",

  // 중국어
  "他妈的","操你妈","操你","草你妈","傻逼","傻B",
  "煞笔","白痴","蠢货","笨蛋","混蛋","王八蛋",
  "贱人","贱货","狗日的","狗娘养","畜生",
  "废物","垃圾","妈逼","尼玛","泥马",
  "卧槽","我操","我草","去死","该死","滚蛋",
  "脑残","智障","弱智","屌丝","逼","鸡巴",
  "做爱","啪啪","打炮","约炮","色情","黄片","毛片",
  "妓女","嫖","卖淫","强奸","猥亵","性骚扰",
  "打飞机","撸管","口交","肛交","骑乘","高潮",
  "内射","颜射","群交","换妻","恋童","萝莉控",
  "捆绑","调教","偷拍","偷窥","裸聊",
  "飞机杯","跳蛋","黄漫","骚货","骚穴","肉棒",
  "处女","破处","基佬","搞基","人妖","伪娘",
];

// Korean character substitution maps for auto-detection
const KO_SUBS = {
  "ㅅ": ["ㅆ","s","5","$"],
  "ㅂ": ["8","b","ㅃ","6"],
  "ㄱ": ["9","ㄲ","g","k"],
  "ㅈ": ["ㅉ","z","j"],
  "ㄷ": ["ㄸ","d"],
  "ㅁ": ["m"],
  "ㄴ": ["n"],
  "ㄹ": ["r","l"],
  "ㅇ": ["0","o"],
  "ㅎ": ["h"],
  "ㅗ": ["0","o"],
  "ㅏ": ["a","ㅑ"],
  "ㅓ": ["e","ㅕ"],
  "ㅣ": ["1","i","l","|","!"],
  "ㅜ": ["u","ㅠ"],
  "ㅡ": ["-","_"],
  "시": ["씨","ci","si","쉬","ㅅl","ㅆl","sl"],
  "발": ["빨","bal","팔","벌","벨","밸"],
  "병": ["byung","벼응","ㅂㅇ"],
  "신": ["shin","sin","씬","싄"],
  "개": ["gae","게","걔","캐"],
  "새": ["세","쌔","sae"],
  "끼": ["키","기","kki"],
};

// Consonant-only (초성) patterns
const CHOSUNG_MAP = [
  ["ㅅㅂ","ㅆㅂ","ㅅ ㅂ","ㅆ ㅂ"],
  ["ㅂㅅ","ㅃㅅ","ㅂ ㅅ"],
  ["ㅈㄹ","ㅉㄹ","ㅈ ㄹ"],
  ["ㄱㅅㄲ","ㄱㅅ ㄲ"],
  ["ㅅㄲ","ㅆㄲ","ㅅ ㄲ"],
  ["ㅁㅊ","ㅁ ㅊ"],
  ["ㅂㅈ","ㅂ ㅈ"],
  ["ㅈㅈ","ㅉㅉ"],
  ["ㅈㄴ","ㅉㄴ"],
  ["ㄲㅈ","ㄲ ㅈ"],
  ["ㅄ","ㅂㅅ"],
  ["ㅅㅂㄴ","ㅆㅂㄴ"],
  ["ㅅㅂㄹ","ㅆㅂㄹ"],
  ["ㅈㄹㅇ"],
  ["ㄴㄱㅁ"],
  ["ㄷㅊ"],
  ["ㅎㅇ"],
  ["ㅈㅅ"],
  ["ㅈ같","ㅈ까"],
];

// Leet/number/symbol substitution patterns
const LEET_PATTERNS = [
  ["tl발","tlqkf","Tlqkf"],
  ["gkrtod"], // 병신 in keyboard mapping
  ["dkssud"], // 닥쳐 in keyboard mapping
  ["qkfzm"], // 발음 in keyboard mapping
  ["si8","ssi8","c8","s1bal","ss1bal"],
  ["shibal","ssibal","sibal","shibbal"],
  ["byeongsin","byungsin","byungshin"],
  ["gaesaekki","geseki","kaesaekki"],
  ["jiral","jilal","zilar"],
  ["seksu","sekksu"],
  ["f*ck","f**k","fu*k","fvck","phuck","fxck","f u c k"],
  ["sh*t","s*it","sh!t","$hit"],
  ["b*tch","b!tch","bi+ch"],
  ["a$$","a**","a$$hole","a**hole"],
  ["d*ck","d!ck","d1ck"],
  ["p*ssy","pu$$y"],
  ["c*nt","c**t"],
  ["n*gger","n!gger","n1gga"],
  ["wh*re","h0e"],
  ["sl*t","s1ut"],
  ["r*tard","r3tard"],
  ["p0rn","pr0n","p*rn"],
  ["s3x","s*x","$ex"],
];


// Phonetic similarity map - normalizes similar-sounding Korean syllables
const PHONETIC_MAP = {
  // ㅅ/ㅆ 계열
  "씨":"시","쉬":"시","씌":"시","싀":"시","쒸":"시","슈":"시","쓔":"시","씨":"시",
  "빨":"발","벌":"발","밸":"발","뻘":"발","볼":"발","뱔":"발","팔":"발","펄":"발",
  "씹":"십","싶":"십","씝":"십","쉽":"십","숩":"십",
  // ㅂ/ㅃ 계열
  "뼝":"병","벵":"병","볌":"병","뼈":"병","뼉":"병",
  "씬":"신","싄":"신","씐":"신","쓘":"신",
  // ㄱ/ㄲ 계열
  "깨":"개","께":"개","겨":"개","겨":"개",
  "쌔":"새","쎄":"새","셰":"새","쎼":"새",
  "끼":"키","기":"키","끼":"키","키":"키",
  // ㅈ/ㅉ 계열
  "찌":"지","쪼":"조","째":"재","쯔":"즈",
  "쫗":"좆","졷":"좆","좃":"좆","족":"좆",
  // 기타 음운 변형
  "랼":"랄","럴":"랄","롤":"랄","뢀":"랄",
  "넘":"놈","늠":"놈",
  "녀":"년","녜":"년",
  "쳐":"처","쳐":"처",
  "쪄":"져","쪄":"져",
  "미":"미","믜":"미",
  "친":"친","틴":"친",
  "존":"존","쫀":"존","졸":"존",
  "나":"나","내":"나","니":"나",
  "느":"느","늬":"느","눼":"느",
  "금":"금","긍":"금","그":"금",
  "마":"마","매":"마","머":"마",
  "엿":"엿","옛":"엿","엳":"엿",
  "닥":"닥","딱":"닥","딲":"닥",
  "꺼":"꺼","껴":"꺼","거":"꺼",
  "뒤":"뒤","뒈":"뒤","듸":"뒤","뒹":"뒤",
  "쓰":"쓰","스":"쓰","슬":"쓰",
  "떡":"떡","덕":"떡","턱":"떡",
  "박":"박","빡":"박","밖":"박",
  "딸":"딸","달":"딸","탈":"딸",
};

// Phonetic variants - manually expanded common evasion words
const PHONETIC_VARIANTS = [
  // 시발 계열 (모든 발음 변형)
  "시발","씨발","시바","씨바","시방","씨방","시봉","씨봉","시벌","씨벌",
  "시빨","씨빨","시뻘","씨뻘","시불","씨불","시부랄","씨부랄","시부럴",
  "시파","씨파","시펄","씨펄","시팔","씨팔","시퍌","씨퍌",
  "싀발","씌발","쉬발","쒸발","쓔발","슈발",
  "시1발","씨1발","시l발","씨l발","시!발","씨!발",
  "시ㅣ발","씨ㅣ발","시이발","씨이발",
  "시바라","씨바라","시바랄","시발롬","씨발롬","시발놈","씨발놈","시발년","씨발년",
  "시벨","씨벨","시볼","씨볼","시뷀","씨뷀",
  "시1팔","씨1팔","시l팔","씨l팔",
  "C발","c발","si발","ssi발",
  "시foot","씨foot",
  
  // 씹 계열
  "씹","십","싶","씝","쉽","숩","씹할","십할","씹새","십새",
  "씹년","십년","씹놈","십놈","씹팔","십팔","씹창","십창",
  "18","십팔","열여덟","십8","씹8","18놈","18년",
  "씹선비","씹덕","씹치","씹물","씹새끼","십새끼",

  // 병신 계열
  "병신","뼝신","벵신","볌신","병씬","병싄","병씐","병시인",
  "ㅂㅇ신","벼응신","별신","벌신","붱신","뵹신","뼁신",
  "병1신","병|신","byungsin","byeongsin","byungshin",
  "병시","병시이인","벼응시인","별씬",

  // 지랄 계열
  "지랄","지럴","지롤","지뢀","지렬","짓랄","찌랄","쥐랄",
  "G랄","g랄","zi랄","ji랄","지1랄","지l랄",
  "지뢜","지뤌","지뢔",

  // 좆 계열
  "좆","졷","좃","족같","졷같","좃같","좆같","족까","졷까",
  "좆나","족나","졷나","좃나",
  "조또","조또","좃도","졷도",
  "jot","zot",

  // 개새끼 계열
  "개새끼","개색끼","개새기","개색기","개세끼","개세기","개쉐끼",
  "개쌔끼","개쌔기","개쎄끼","개쎄기","개셰끼","개쎼끼",
  "개새키","개색키","개세키","개쌔키","개쎄키",
  "개싀끼","개씌끼","개쒸끼",
  "걔새끼","겤새끼","께새끼","깨새끼",
  "개자식","개자슥","개자시","개쟈식",
  "개넘","개노무","개놈아",

  // 새끼 계열
  "새끼","색끼","세끼","쌔끼","쎄끼","셰끼","쎼끼",
  "새키","색키","세키","쌔키","쎄키",
  "새기","색기","세기","쌔기","쎄기",
  "싀끼","씌끼","쒸끼","쉐끼",
  "saecci","saekki",

  // 존나 계열
  "존나","졸라","존내","졸래","존니","졸리","존너","졸려",
  "쫀나","쬰나","쮼나","즌나","쥰나",
  "존1나","존|나","존ㄴ나",
  "jonna","zonna","jola",

  // 미친 계열
  "미친","미틴","미띤","미씬","밋친","믿친","미친놈","미친년",
  "미친새끼","미친새기","미친색끼","미틴놈","미틴년",
  "ㅁㅊ","ㅁ1ㅊ","미1친",

  // 닥쳐 계열
  "닥쳐","닥치","닥처","딱쳐","딱치","딲쳐",
  "닥치세요","닥쳐라","입닥쳐","입닥","입딲",
  "dak쳐","닥chyeo",

  // 꺼져 계열
  "꺼져","꺼저","거져","껴져","꺼지","거지",
  "꺼져라","꺼져버려","꺼지세요",

  // 느금마 계열
  "느금마","느그마","늑마","느금","느그미","느그매",
  "느금빠","느그빠","늑빠",
  "니미","니미럴","니미랄","니미씨","니미씹",
  "니애미","니애비","느개비","니엄마","니아빠",
  "엄마가","아빠가","부모",

  // 엿 계열
  "엿먹","엿같","엿되","옛먹","엳먹","에먹",
  "엿이나","옛이나","엳이나",

  // 걸레 계열
  "걸레","걸래","걸레년","걸레녀","걸레같",
  "갈보","갈보년","화냥","화냥년",
  "창녀","창남","매춘부","매춘남",

  // 등신 계열
  "등신","등쉰","등씬","등시인","뜽신","듕신",
  "돌아이","도라이","또라이","도래이","돌대가리","돌머리",
  "찐따","찐다","진따","진다","찐빠",
  "멍청","멍청이","멍청아","멍총","먱청",

  // 뒤져 계열
  "뒤져","뒈져","듸져","뒤저","뒤질","뒈질","듸질",
  "뒤져라","뒈져라","뒤질래","뒈질래",
  "죽어","주거","쥬거","죽여","주겨","죽일",
  "자살","자살해","자살해라",

  // 보지/자지 계열
  "보지","보G","보ㅈ","봊이","보즤","보ㅈㅇ","뽀지",
  "자지","자G","자ㅈ","쟈지","쟈ㅈ","좌지",
  
  // 떡/따먹 계열
  "떡치다","떡쳤","떡질","떡실신","뗙치","턱치",
  "따먹다","따먹어","따먹자","따묵","딸먹",
  "박다","박았","박히다","박아","빡다",

  // 섹스 계열  
  "섹스","쎅스","쎡스","섹슈","색스","셱스","세엑스","쎅쓰",
  "sex","seX","sEx","SEX","s3x","$ex","se><",

  // 야동 계열
  "야동","야둥","얃동","야도옹","약동","야동영상",
  "포르노","뽀르노","포르너","폴노","포ooo르노",
  "porn","pr0n","p0rn","pron",

  // 한남/한녀 계열
  "한남충","한남","한녀충","한녀","맘충","틀딱","급식충","진지충",
  "김치녀","김치남","된장녀","된장남",

  // 추가 발음 변형
  "빡대가리","빡대","빡머리","대가리","대갈","대갈빡",
  "주둥이","주둥아리","주뎅이","쥬뎅이",
  "쓰레기","쓰뤠기","쓸레기","쓰래기","스레기",
  "찌질","찌질이","찌찔","찔찔",
  "꼴값","꼴깝","꼬라지","꼬라보다",
  "거지","거지같","거지같은","구걸",
];


function filterProfanity(text) {
  // Normalize: remove spaces/dots/special chars between Korean chars for detection
  const normalize = (s) => {
    return s
      .replace(/[\s.·•_\-~=+*#@!,;:'"()\[\]{}|/\\]+/g, "") // strip separators
      .replace(/[0oO]/g, m => m) // keep for leet detection
      .toLowerCase();
  };

  const normalized = normalize(text);
  let result = text;

  // 0. Check phonetic variants (direct match)
  for (const word of PHONETIC_VARIANTS) {
    if (word.length < 1) continue;
    try {
      const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\$&"), "gi");
      result = result.replace(regex, m => "♡".repeat(m.length));
    } catch {}
  }

  // 0.5 Phonetic normalization check
  const phoneticNorm = (s) => {
    let r = s;
    for (const [from, to] of Object.entries(PHONETIC_MAP)) {
      r = r.split(from).join(to);
    }
    return r;
  };
  const pNorm = phoneticNorm(normalized);
  for (const word of BASE_PROFANITY) {
    const nw = phoneticNorm(normalize(word));
    if (nw.length < 2) continue;
    if (pNorm.includes(nw) && !BASE_PROFANITY.some(w => result.includes("♡".repeat(w.length)))) {
      try {
        const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\$&"), "gi");
        result = result.replace(regex, m => "♡".repeat(m.length));
      } catch {}
    }
  }

  // 1. Check base words (direct match in normalized form)
  for (const word of BASE_PROFANITY) {
    const nw = normalize(word);
    if (nw.length < 1) continue;
    // Check in normalized text
    if (normalized.includes(nw)) {
      // Find and replace in original text (fuzzy position)
      const regex = new RegExp(
        word.split("").map(c => c.replace(/[.*+?^${}()|[\]\\]/g, "\$&") + "[\s.·•_\-~=+*]*").join(""),
        "gi"
      );
      result = result.replace(regex, m => "♡".repeat(Math.max(m.replace(/\s/g,"").length, 1)));
    }
    // Also try direct regex on original
    try {
      const directRegex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\$&"), "gi");
      result = result.replace(directRegex, m => "♡".repeat(m.length));
    } catch {}
  }

  // 2. Check consonant-only patterns
  for (const group of CHOSUNG_MAP) {
    for (const pattern of group) {
      if (text.includes(pattern) || normalized.includes(pattern.replace(/\s/g,""))) {
        const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\$&"), "g");
        result = result.replace(regex, m => "♡".repeat(m.length));
        // Also without spaces
        const noSpace = pattern.replace(/\s/g, "");
        if (noSpace !== pattern) {
          const regex2 = new RegExp(noSpace.replace(/[.*+?^${}()|[\]\\]/g, "\$&"), "g");
          result = result.replace(regex2, m => "♡".repeat(m.length));
        }
      }
    }
  }

  // 3. Check leet/substitution patterns
  for (const group of LEET_PATTERNS) {
    for (const pattern of group) {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\$&"), "gi");
      result = result.replace(regex, m => "♡".repeat(m.length));
    }
  }

  // 4. Detect spaced-out profanity (e.g., "시 발", "병 신", "씨 발")  
  const spacedPatterns = [
    [/시\s*발/g], [/씨\s*발/g], [/씨\s*빨/g], [/시\s*팔/g], [/씨\s*팔/g],
    [/병\s*신/g], [/지\s*랄/g], [/개\s*새\s*끼/g], [/새\s*끼/g],
    [/닥\s*쳐/g], [/꺼\s*져/g], [/미\s*친/g], [/느\s*금\s*마/g],
    [/존\s*나/g], [/졸\s*라/g], [/좆\s*같/g], [/좆\s*까/g],
    [/따\s*먹/g], [/떡\s*치/g], [/보\s*지/g], [/자\s*지/g],
    [/f\s*u\s*c\s*k/gi], [/s\s*h\s*i\s*t/gi], [/b\s*i\s*t\s*c\s*h/gi],
    [/a\s*s\s*s/gi], [/d\s*i\s*c\s*k/gi], [/p\s*u\s*s\s*s\s*y/gi],
  ];
  for (const [regex] of spacedPatterns) {
    result = result.replace(regex, m => "♡".repeat(m.replace(/\s/g,"").length));
  }

  return result;
}

export function renderPlazaScreen(ctx) {
  const { theme, user, userRole, members, setScreen, showMsg, playSfx, hasPerm,
    chatMsg, setChatMsg, chatLog, setChatLog, chatEndRef, chatNotif, setChatNotif,
    plazaCalls, callUser, ROLES, themeKey } = ctx;

    // Freeze state (localStorage-shared)
    const isFrozen = (() => {
      try { return localStorage.getItem("ar_chat_frozen") === "true"; } catch { return false; }
    })();

    const toggleFreeze = () => {
      const next = !isFrozen;
      localStorage.setItem("ar_chat_frozen", next ? "true" : "false");
      showMsg(next ? "🧊 광장이 얼었습니다" : "🔥 광장이 녹았습니다", 2000);
      playSfx(next ? "click" : "success");
      setChatLog(prev => [...prev]);
    };

    const sendChat = () => {
      if (isFrozen && userRole !== "admin") {
        showMsg("🧊 광장이 얼어있어요!", 1500);
        return;
      }
      if (!chatMsg.trim()) return;
      const cleanText = filterProfanity(chatMsg.trim());
      const newMsg = { user: user?.nickname || user?.name || "익명", role: userRole, text: cleanText, time: Date.now() };
      const updated = [...chatLog, newMsg].slice(-100);
      setChatLog(updated);
      localStorage.setItem("ar_chat", JSON.stringify(updated));
      setChatMsg("");
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const now = Date.now();
    const filteredLog = chatLog.filter(m => now - m.time < 10 * 60 * 1000);
    if (filteredLog.length !== chatLog.length) {
      setChatLog(filteredLog);
      localStorage.setItem("ar_chat", JSON.stringify(filteredLog));
    }

    const myName = user?.nickname || user?.name || "익명";

    const onlineUsers = (() => {
      try {
        const online = JSON.parse(localStorage.getItem("ar_online") || "{}");
        return Object.entries(online).filter(([, v]) => Date.now() - v.time < 30000).map(([name, v]) => ({ name, role: v.role }));
      } catch { return []; }
    })();

    const deleteChat = (time) => {
      const updated = chatLog.filter(m => m.time !== time);
      setChatLog(updated);
      localStorage.setItem("ar_chat", JSON.stringify(updated));
    };

    const teacherMember = members.find(m => m.role === "admin");
    const teacherName = teacherMember ? (teacherMember.nickname || teacherMember.name) : "선생님";
    const teacherOnline = onlineUsers.some(u => u.role === "admin");
    const recentCalls = plazaCalls.filter(c => now - c.time < 10 * 60 * 1000).slice(-10);
    const roleColors = { admin: PASTEL.coral, assistant: PASTEL.lavender, student: PASTEL.sky, external: PASTEL.sage };

    return (
      <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif", position: "relative" }}>

        {/* Freeze overlay with snowfall */}
        {isFrozen && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "linear-gradient(180deg, rgba(181,213,232,0.08) 0%, rgba(181,213,232,0.15) 100%)",
            pointerEvents: "none", zIndex: 50,
          }}>
            {[...Array(12)].map((_, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${8 + (i * 7.5) % 85}%`,
                top: `-${10 + (i * 13) % 20}px`,
                fontSize: [10, 8, 12, 9, 11, 7, 10, 8, 13, 9, 11, 8][i],
                opacity: 0.3 + (i % 3) * 0.15,
                animation: `snowfall ${4 + (i % 3) * 2}s linear ${(i * 0.5) % 3}s infinite`,
              }}>
                {["❄", "❅", "❆", "✦"][i % 4]}
              </div>
            ))}
          </div>
        )}

        <style>{`
          @keyframes snowfall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
            10% { opacity: 0.5; }
            90% { opacity: 0.3; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
          }
          @keyframes freezePulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(181,213,232,0.3); }
            50% { box-shadow: 0 0 12px 4px rgba(181,213,232,0.15); }
          }
          .plaza-content { position: relative; }
          @media print { .plaza-content { display: none !important; } }
        `}</style>

        {/* Header */}
        <div style={{
          flexShrink: 0, display: "flex", alignItems: "center", padding: "14px 20px",
          borderBottom: `1px solid ${isFrozen ? PASTEL.sky : theme.border}`,
          animation: isFrozen ? "freezePulse 3s ease infinite" : "none",
        }}>
          <button onClick={() => { playSfx("click"); setScreen("menu"); }} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer" }}>← 메뉴</button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 700, color: isFrozen ? PASTEL.sky : theme.text, fontFamily: "'Playfair Display', serif" }}>
            {isFrozen ? "🧊 광장 (얼음)" : "광장"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {userRole === "admin" && (
              <button onClick={toggleFreeze} style={{
                background: isFrozen ? `${PASTEL.sky}25` : "none",
                border: `1px solid ${isFrozen ? PASTEL.sky : theme.border}`,
                borderRadius: 8, padding: "3px 8px", fontSize: 11, cursor: "pointer",
                color: isFrozen ? PASTEL.sky : theme.textSec,
                transition: "all 0.3s ease",
              }}>
                {isFrozen ? "🔥" : "🧊"}
              </button>
            )}
            <span style={{ fontSize: 11, color: PASTEL.mint }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: PASTEL.mint, marginRight: 4 }} />
              {onlineUsers.length}
            </span>
          </div>
        </div>

        {/* Online users bar */}
        <div style={{ flexShrink: 0, padding: "8px 16px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: recentCalls.length > 0 ? 6 : 0 }}>
            {teacherOnline ? (
              <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 10, background: `${PASTEL.coral}15`, color: PASTEL.coral, fontWeight: 700 }}>
                <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 3, background: PASTEL.mint, marginRight: 3 }} />
                선생님
              </span>
            ) : (
              <button onClick={() => {
                if (!hasPerm("plaza_call")) { showMsg("호출 권한이 없어요", 1500); return; }
                callUser(teacherName);
                showMsg(`${teacherName}을(를) 호출했어요!`, 2000);
                if ("Notification" in window && Notification.permission === "default") {
                  Notification.requestPermission();
                }
              }} style={{
                fontSize: 10, padding: "4px 10px", borderRadius: 10, border: `1px dashed ${PASTEL.coral}`,
                background: `${PASTEL.coral}08`, color: PASTEL.coral, fontWeight: 700, cursor: "pointer",
              }}>
                📢 선생님 호출
              </button>
            )}
            {onlineUsers.filter(u => u.role !== "admin").map((u, i) => (
              <button key={i} onClick={() => {
                if (!hasPerm("plaza_call")) return;
                callUser(u.name);
                showMsg(`${u.name}님을 호출했어요!`, 1500);
              }} style={{
                fontSize: 10, padding: "4px 10px", borderRadius: 10, border: "none", cursor: hasPerm("plaza_call") ? "pointer" : "default",
                background: `${roleColors[u.role] || theme.textSec}15`,
                color: roleColors[u.role] || theme.textSec, fontWeight: 600,
              }}>
                <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 3, background: PASTEL.mint, marginRight: 3 }} />
                {u.name}
              </button>
            ))}
          </div>
          {recentCalls.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {recentCalls.map((c, i) => (
                <span key={i} style={{ fontSize: 9, color: PASTEL.coral, background: `${PASTEL.coral}08`, padding: "2px 6px", borderRadius: 6 }}>
                  {c.from} → {c.to}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="plaza-content" style={{ flex: 1, overflowY: "auto", padding: "12px 16px", WebkitOverflowScrolling: "touch" }}>
          {filteredLog.length === 0 && (
            <p style={{ textAlign: "center", color: theme.textSec, fontSize: 13, marginTop: 40 }}>
              아직 대화가 없어요. 첫 메시지를 보내보세요!
              <br /><span style={{ fontSize: 10 }}>메시지는 10분 후 자동 삭제됩니다</span>
            </p>
          )}
          {filteredLog.map((msg, i) => {
            const isMe = msg.user === myName;
            const remaining = Math.max(0, Math.ceil((10 * 60 * 1000 - (now - msg.time)) / 60000));
            return (
              <div key={`${msg.time}-${i}`} style={{
                display: "flex", flexDirection: isMe ? "row-reverse" : "row",
                marginBottom: 8, animation: "fadeIn 0.3s ease",
              }}>
                <div style={{
                  maxWidth: "75%", padding: "10px 14px", borderRadius: 14,
                  background: isMe ? `${PASTEL.coral}20` : theme.card,
                  border: `1px solid ${isMe ? PASTEL.coral : theme.border}`,
                }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <span style={{
                      fontSize: 9, padding: "1px 6px", borderRadius: 4,
                      background: `${roleColors[msg.role] || theme.textSec}20`,
                      color: roleColors[msg.role] || theme.textSec,
                    }}>{ROLES[msg.role] || ""}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: theme.text }}>{msg.user}</span>
                    <span style={{ fontSize: 9, color: theme.textSec }}>
                      {new Date(msg.time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {remaining <= 3 && <span style={{ fontSize: 8, color: PASTEL.coral }}>{remaining}분</span>}
                  </div>
                  <p style={{ fontSize: 13, color: theme.text, margin: 0, lineHeight: 1.5, fontFamily: "'Noto Serif KR', serif" }}>
                    {msg.text}
                  </p>
                  {isMe && (
                    <button onClick={() => deleteChat(msg.time)} style={{
                      background: "none", border: "none", color: theme.textSec, fontSize: 9,
                      cursor: "pointer", padding: "2px 0", marginTop: 2, textAlign: "right", display: "block",
                    }}>삭제</button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div style={{
          flexShrink: 0, display: "flex", gap: 8, padding: "12px 16px",
          borderTop: `1px solid ${isFrozen ? PASTEL.sky : theme.border}`, background: theme.card,
          transition: "border-color 0.3s ease",
        }}>
          <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendChat(); } }}
            placeholder={isFrozen && userRole !== "admin" ? "🧊 광장이 얼어있어요..." : "메시지를 입력하세요..."}
            disabled={isFrozen && userRole !== "admin"}
            autoComplete="off" autoCorrect="off"
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 12,
              border: `1.5px solid ${isFrozen ? PASTEL.sky : theme.border}`,
              background: isFrozen && userRole !== "admin" ? `${PASTEL.sky}08` : theme.bg,
              color: theme.text, fontSize: 13, fontFamily: "'Noto Serif KR', serif",
              WebkitUserSelect: "text", userSelect: "text",
              transition: "all 0.3s ease",
            }} />
          <button onClick={sendChat}
            disabled={isFrozen && userRole !== "admin"}
            style={{
              padding: "10px 18px", borderRadius: 12, border: "none",
              background: isFrozen && userRole !== "admin"
                ? `${PASTEL.sky}30`
                : `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
              color: "white", fontSize: 13, fontWeight: 700,
              cursor: isFrozen && userRole !== "admin" ? "default" : "pointer",
              transition: "all 0.3s ease",
            }}>{isFrozen && userRole !== "admin" ? "🧊" : "전송"}</button>
        </div>
      </div>
    );
}
