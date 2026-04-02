// DiaryConfig.js — shared constants for Diary feature
export const DECO_CATALOG = [
  {id:"vase",   label:"화병",   emoji:"🌸", baseSize:52, premium:false},
  {id:"coffee", label:"커피",   emoji:"☕", baseSize:46, premium:false},
  {id:"plant",  label:"식물",   emoji:"🪴", baseSize:54, premium:false},
  {id:"pencils",label:"연필통", emoji:"✏️", baseSize:42, premium:false},
  {id:"cat",    label:"고양이", emoji:"🐱", baseSize:58, premium:true},
  {id:"glasses",label:"안경",   emoji:"👓", baseSize:40, premium:true},
  {id:"phone",  label:"폰",     emoji:"📱", baseSize:44, premium:true},
  {id:"headph", label:"이어폰", emoji:"🎧", baseSize:50, premium:true},
  {id:"ribbon", label:"리본",   emoji:"🎀", baseSize:44, premium:true},
  {id:"teddy",  label:"곰인형", emoji:"🧸", baseSize:56, premium:true},
  {id:"candle", label:"캔들",   emoji:"🕯️", baseSize:44, premium:true},
  {id:"moon",   label:"달",     emoji:"🌙", baseSize:40, premium:true},
];

// 원문 + 짧고 불완전한 한 줄. 나머지는 읽는 사람이 채운다.
export const MYSTICAL_QUOTES = [
  {
    original: "其次致曲，曲能有誠，誠則形，形則著，著則明，明則動，動則變，變則化，唯天下至誠為能化。",
    line: "작은 것에 정성을 다하면, 결국 세상이 바뀐다.",
    source: "자사, 《중용》 제23장"
  },
  {
    original: "知人者智，自知者明。勝人者有力，自勝者強。",
    line: "남을 이기는 것은 힘이지만, 자신을 이기는 것은—",
    source: "노자, 《도덕경》 33장"
  },
  {
    original: "天下之至柔，馳騁天下之至堅。",
    line: "가장 부드러운 것이 가장 단단한 것을 이긴다.",
    source: "노자, 《도덕경》 43장"
  },
  {
    original: "上善若水。水善利萬物而不爭。",
    line: "물은 이롭게 하면서 다투지 않는다.",
    source: "노자, 《도덕경》 8장"
  },
  {
    original: "信言不美，美言不信。",
    line: "참된 말은 아름답지 않다.",
    source: "노자, 《도덕경》 81장"
  },
  {
    original: "Omnia, Lucili, aliena sunt, tempus tantum nostrum est.",
    line: "모든 것은 남의 것이다. 시간만 빼고.",
    source: "세네카, 《루킬리우스에게 보내는 편지》 I"
  },
  {
    original: "Dum differtur vita transcurrit.",
    line: "미루는 사이에.",
    source: "세네카, 《인생의 짧음에 대하여》"
  },
  {
    original: "The impediment to action advances action. What stands in the way becomes the way.",
    line: "막는 것이 길이 된다.",
    source: "마르쿠스 아우렐리우스, 《명상록》 V.20"
  },
  {
    original: "You have power over your mind, not outside events.",
    line: "바깥은 네 것이 아니다.",
    source: "마르쿠스 아우렐리우스, 《명상록》"
  },
  {
    original: "Nusquam est qui ubique est.",
    line: "어디에나 있는 자는 아무 데도 없다.",
    source: "세네카, 《루킬리우스에게 보내는 편지》 II"
  },
  {
    original: "古池や　蛙飛び込む　水の音",
    line: "오래된 연못. 개구리 한 마리. 그리고 소리.",
    source: "마츠오 바쇼, 1686"
  },
  {
    original: "日々是好日。",
    line: "매일이 좋은 날이다, 라고 했다.",
    source: "운문선사, 《벽암록》"
  },
  {
    original: "花は盛りに、月は隈なきをのみ見るものかは。",
    line: "꽃은 질 때, 달은 가릴 때.",
    source: "요시다 켄코, 《츠레즈레구사》"
  },
  {
    original: "一期一会。",
    line: "이 순간은 다시 오지 않는다.",
    source: "이이 나오스케, 《차의 경지》"
  },
  {
    original: "雨ニモマケズ、風ニモマケズ、雪ニモ夏ノ暑サニモマケヌ丈夫ナカラダヲモチ。",
    line: "비에도, 바람에도, 눈에도—",
    source: "미야자와 겐지, 〈비에도 지지 않고〉"
  },
  {
    original: "Not all those who wander are lost.",
    line: "방황하는 것과 길 잃은 것은 다르다.",
    source: "J.R.R. 톨킨, 《반지의 제왕》"
  },
  {
    original: "We are all broken. That's how the light gets in.",
    line: "우리는 모두 부서져 있다. 그래야 빛이—",
    source: "레너드 코헨"
  },
  {
    original: "The most beautiful thing we can experience is the mysterious.",
    line: "진짜 아름다운 것은 설명이 안 된다.",
    source: "알베르트 아인슈타인"
  },
  {
    original: "Man cannot discover new oceans unless he has the courage to lose sight of the shore.",
    line: "육지를 잃어버릴 용기.",
    source: "앙드레 지드"
  },
  {
    original: "生きるとは、ゆっくりと生まれることだ。",
    line: "산다는 것은, 천천히 태어나는 것.",
    source: "생텍쥐페리, 《어린 왕자》"
  },
  {
    original: "人は一生のうちに逢うべき本に必ず逢える。しかし、そのためには今、良書を読んでいなければならない。",
    line: "만나야 할 책은 반드시 만난다. 지금 읽고 있다면.",
    source: "가와카미 테쓰타로"
  },
  {
    original: "Die Grenzen meiner Sprache bedeuten die Grenzen meiner Welt.",
    line: "내 언어의 한계가 내 세계의 한계다.",
    source: "루트비히 비트겐슈타인, 《논리철학논고》"
  },
  {
    original: "Der Mensch ist verurteilt, frei zu sein.",
    line: "인간은 자유롭도록 선고받았다.",
    source: "장폴 사르트르"
  },
  {
    original: "學而不思則罔，思而不學則殆。",
    line: "배움과 생각. 하나만으로는 위태롭다.",
    source: "공자, 《논어》 위정편"
  },
  {
    original: "吾日三省吾身。",
    line: "나는 하루에 세 번 나를 돌아본다.",
    source: "증자, 《논어》 학이편"
  },
  {
    original: "Il faut imaginer Sisyphe heureux.",
    line: "시지프는 행복했을 것이다, 라고 상상해야 한다.",
    source: "알베르 카뮈, 《시지프 신화》"
  },
  {
    original: "What is essential is invisible to the eye.",
    line: "중요한 것은 눈에 보이지 않는다.",
    source: "생텍쥐페리, 《어린 왕자》"
  },
  {
    original: "이 또한 지나가리라. גַּם זֶה יַעֲבֹר",
    line: "이것도.",
    source: "솔로몬 왕의 반지에 새겨진 문구"
  },
  {
    original: "夫唯弗居，是以不去。",
    line: "머물지 않기 때문에, 사라지지 않는다.",
    source: "노자, 《도덕경》 2장"
  },
  {
    original: "Per aspera ad astra.",
    line: "험한 길을 통해 별에 닿는다.",
    source: "세네카, 《헤라클레스의 광기》"
  },
];
