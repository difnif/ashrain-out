import { useState, useMemo, useCallback } from "react";
import { PASTEL } from "../config";

const PARENT_TABS = [
  { key: "gallery", icon: "🎨", label: "갤러리" },
  { key: "crossTalk", icon: "💬", label: "소통" },
  { key: "shop", icon: "🛍️", label: "숍" },
  { key: "pricing", icon: "💳", label: "요금제" },
];

// ===== Gallery Tab (익명 아카이브 갤러리 + 숙제 보내기) =====
function GalleryTab({ theme, publicArchive, playSfx, showMsg, user, sendHomeworkToChild }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState("all");

  const typeFilters = [
    { key: "all", label: "전체" },
    { key: "circumcenter", label: "외심" },
    { key: "incenter", label: "내심" },
    { key: "congruence", label: "합동" },
    { key: "problem", label: "문제분석" },
  ];

  const filtered = useMemo(() => {
    if (!publicArchive || publicArchive.length === 0) return [];
    if (filter === "all") return publicArchive;
    return publicArchive.filter(a => (a.type || "").toLowerCase().includes(filter));
  }, [publicArchive, filter]);

  const sendAsHomework = useCallback((item) => {
    if (!sendHomeworkToChild) return;
    sendHomeworkToChild({
      id: `hw-parent-${Date.now()}`,
      title: item.title || "학부모가 보낸 숙제",
      description: `갤러리에서 선택한 학습 활동: ${item.type || "기하학"}`,
      type: item.type,
      referenceArchiveId: item.id,
      from: "parent",
      assignedAt: Date.now(),
      status: "pending",
    });
    playSfx("success");
    showMsg("자녀에게 숙제로 보냈어요! 📨", 2000);
    setSelectedItem(null);
  }, [sendHomeworkToChild, playSfx, showMsg]);

  const sendEncouragement = useCallback((item) => {
    // 응원 포인트 보내기 (추후 포인트 시스템 연동)
    playSfx("success");
    showMsg("응원을 보냈어요! 💪🏆", 2000);
  }, [playSfx, showMsg]);

  // 상세 보기
  if (selectedItem) {
    const item = selectedItem;
    return (
      <div style={{ padding: "8px 0" }}>
        <button onClick={() => setSelectedItem(null)} style={{
          background: "none", border: "none", color: theme.textSec, fontSize: 12, cursor: "pointer", marginBottom: 12,
        }}>← 목록으로</button>

        <div style={{ background: theme.card, borderRadius: 16, padding: 20, border: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>{item.type === "circumcenter" ? "⊙" : item.type === "incenter" ? "◎" : item.type === "congruence" ? "≅" : "📐"}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{item.title || "학습 기록"}</div>
              <div style={{ fontSize: 10, color: theme.textSec }}>
                익명 학생 · {item.date || new Date(item.createdAt).toLocaleDateString("ko")}
              </div>
            </div>
          </div>

          {item.preview && (
            <div style={{ fontSize: 12, color: theme.textSec, lineHeight: 1.6, marginBottom: 16, padding: 12, background: theme.bg, borderRadius: 10 }}>
              {item.preview}
            </div>
          )}

          {item.content?.problemText && (
            <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.6, marginBottom: 16, padding: 12, background: `${PASTEL.mint}10`, borderRadius: 10, border: `1px solid ${PASTEL.mint}30` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: PASTEL.mint, marginBottom: 6 }}>문제</div>
              {item.content.problemText}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => sendAsHomework(item)} style={{
              flex: 1, padding: "12px", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
              color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>📨 자녀에게 숙제로 보내기</button>
            <button onClick={() => sendEncouragement(item)} style={{
              padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${PASTEL.gold || "#f5c542"}`,
              background: "transparent", color: PASTEL.gold || "#f5c542", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>💪 응원</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 0" }}>
      <p style={{ fontSize: 11, color: theme.textSec, marginBottom: 12, lineHeight: 1.6 }}>
        다른 학생들의 학습 기록을 익명으로 열람하고,<br />
        마음에 드는 활동을 자녀에게 숙제로 보낼 수 있어요.
      </p>

      {/* 필터 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {typeFilters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: "5px 12px", borderRadius: 20, fontSize: 10, cursor: "pointer",
            border: filter === f.key ? `2px solid ${PASTEL.coral}` : `1px solid ${theme.border}`,
            background: filter === f.key ? `${PASTEL.coral}10` : theme.card,
            color: filter === f.key ? PASTEL.coral : theme.textSec,
            fontWeight: filter === f.key ? 700 : 400,
          }}>{f.label}</button>
        ))}
      </div>

      {/* 갤러리 목록 */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: theme.textSec }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎨</div>
          <p style={{ fontSize: 12 }}>아직 공개된 학습 기록이 없어요.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(item => (
            <button key={item.id} onClick={() => { playSfx("click"); setSelectedItem(item); }} style={{
              width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 14,
              border: `1px solid ${theme.border}`, background: theme.card, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s",
            }}>
              <span style={{ fontSize: 20 }}>
                {item.type === "circumcenter" ? "⊙" : item.type === "incenter" ? "◎" : item.type === "congruence" ? "≅" : "📐"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.title || item.type || "학습 기록"}
                </div>
                <div style={{ fontSize: 10, color: theme.textSec, marginTop: 2 }}>
                  {item.preview?.slice(0, 40) || "익명 학생의 학습 활동"}
                </div>
              </div>
              <span style={{ fontSize: 10, color: theme.textSec, flexShrink: 0 }}>
                {item.date || new Date(item.createdAt || Date.now()).toLocaleDateString("ko")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== CrossTalk Tab (학부모-학생 익명 소통) =====
function CrossTalkTab({ theme, playSfx, showMsg, crossTalkPosts, setCrossTalkPosts, user }) {
  const [isOpen, setIsOpen] = useState(false); // 기능 오픈 여부 (초기 닫힘)
  const [newPost, setNewPost] = useState("");
  const [viewPost, setViewPost] = useState(null);
  const [newReply, setNewReply] = useState("");

  const userType = user?.role === "parent" ? "학부모" : "학생";
  const anonLabel = user?.role === "parent" ? "익명 학부모" : "익명 학생";

  if (!isOpen) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 8 }}>
          세대 교차 소통 공간
        </h3>
        <p style={{ fontSize: 12, color: theme.textSec, lineHeight: 1.7, marginBottom: 20 }}>
          학부모와 학생이 익명으로 서로의 속마음을 나누는 공간이에요.<br />
          내 부모/자녀가 아닌 다른 분과 솔직하게 이야기할 수 있어요.<br /><br />
          <span style={{ color: PASTEL.coral, fontWeight: 700 }}>현재 준비 중입니다.</span><br />
          안전한 소통 환경을 위한 모더레이션 시스템을 구축 중이에요.
        </p>
        <div style={{ padding: 12, background: `${PASTEL.mint}10`, borderRadius: 12, border: `1px solid ${PASTEL.mint}30` }}>
          <p style={{ fontSize: 10, color: PASTEL.mint, fontWeight: 700, margin: 0 }}>
            🛡️ 비속어 필터 · 신고 시스템 · 작성 가이드 적용 후 오픈 예정
          </p>
        </div>
      </div>
    );
  }

  // 글 상세 + 답글
  if (viewPost) {
    return (
      <div style={{ padding: "8px 0" }}>
        <button onClick={() => setViewPost(null)} style={{
          background: "none", border: "none", color: theme.textSec, fontSize: 12, cursor: "pointer", marginBottom: 12,
        }}>← 목록으로</button>

        <div style={{ background: theme.card, borderRadius: 14, padding: 16, border: `1px solid ${theme.border}`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 700,
              background: viewPost.authorType === "parent" ? `${PASTEL.lavender}20` : `${PASTEL.sky}20`,
              color: viewPost.authorType === "parent" ? PASTEL.lavender : PASTEL.sky,
            }}>{viewPost.authorType === "parent" ? "학부모" : "학생"}</span>
            <span style={{ fontSize: 10, color: theme.textSec }}>{new Date(viewPost.createdAt).toLocaleDateString("ko")}</span>
          </div>
          <p style={{ fontSize: 14, color: theme.text, lineHeight: 1.7, margin: 0 }}>{viewPost.content}</p>
        </div>

        {/* 답글 목록 */}
        {(viewPost.replies || []).map((reply, i) => (
          <div key={i} style={{ background: `${theme.bg}`, borderRadius: 12, padding: 12, marginBottom: 8, marginLeft: 16, borderLeft: `3px solid ${reply.authorType === "parent" ? PASTEL.lavender : PASTEL.sky}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, fontWeight: 700,
                background: reply.authorType === "parent" ? `${PASTEL.lavender}20` : `${PASTEL.sky}20`,
                color: reply.authorType === "parent" ? PASTEL.lavender : PASTEL.sky,
              }}>{reply.authorType === "parent" ? "학부모" : "학생"}</span>
              <span style={{ fontSize: 9, color: theme.textSec }}>{new Date(reply.createdAt).toLocaleDateString("ko")}</span>
            </div>
            <p style={{ fontSize: 12, color: theme.text, lineHeight: 1.6, margin: 0 }}>{reply.content}</p>
          </div>
        ))}

        {/* 답글 입력 */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input value={newReply} onChange={e => setNewReply(e.target.value)} placeholder={`${anonLabel}(으)로 답글 달기...`}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 12 }} />
          <button onClick={() => {
            if (!newReply.trim()) return;
            const updated = { ...viewPost, replies: [...(viewPost.replies || []), { content: newReply.trim(), authorType: userType === "학부모" ? "parent" : "student", createdAt: Date.now() }] };
            setCrossTalkPosts(prev => prev.map(p => p.id === viewPost.id ? updated : p));
            setViewPost(updated);
            setNewReply("");
            playSfx("success");
          }} style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: PASTEL.coral, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>전송</button>
        </div>
      </div>
    );
  }

  // 목록
  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ marginBottom: 12, padding: 10, background: `${PASTEL.lavender}08`, borderRadius: 10, border: `1px solid ${PASTEL.lavender}20` }}>
        <p style={{ fontSize: 10, color: theme.textSec, margin: 0, lineHeight: 1.6 }}>
          🛡️ 이 공간은 서로를 이해하기 위한 곳이에요. 상대방을 존중하는 마음으로 이야기해 주세요.
        </p>
      </div>

      {/* 새 글 작성 */}
      <div style={{ marginBottom: 14 }}>
        <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
          placeholder={`${anonLabel}(으)로 질문이나 이야기를 남겨보세요...`}
          style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 12, resize: "none", minHeight: 60, boxSizing: "border-box" }} />
        <button onClick={() => {
          if (!newPost.trim()) return;
          setCrossTalkPosts(prev => [{ id: `ct-${Date.now()}`, content: newPost.trim(), authorType: userType === "학부모" ? "parent" : "student", createdAt: Date.now(), replies: [] }, ...prev]);
          setNewPost("");
          playSfx("success");
          showMsg("게시되었어요!", 1500);
        }} style={{ marginTop: 6, width: "100%", padding: "10px", borderRadius: 12, border: "none", background: PASTEL.coral, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {anonLabel}(으)로 게시하기
        </button>
      </div>

      {/* 목록 */}
      {(!crossTalkPosts || crossTalkPosts.length === 0) ? (
        <div style={{ textAlign: "center", padding: "30px 20px", color: theme.textSec }}>
          <p style={{ fontSize: 12 }}>아직 게시글이 없어요. 첫 이야기를 시작해보세요!</p>
        </div>
      ) : (
        crossTalkPosts.map(post => (
          <button key={post.id} onClick={() => { playSfx("click"); setViewPost(post); }} style={{
            width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 8, borderRadius: 12,
            border: `1px solid ${theme.border}`, background: theme.card, cursor: "pointer",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, fontWeight: 700,
                background: post.authorType === "parent" ? `${PASTEL.lavender}20` : `${PASTEL.sky}20`,
                color: post.authorType === "parent" ? PASTEL.lavender : PASTEL.sky,
              }}>{post.authorType === "parent" ? "학부모" : "학생"}</span>
              <span style={{ fontSize: 9, color: theme.textSec }}>{new Date(post.createdAt).toLocaleDateString("ko")}</span>
              {(post.replies || []).length > 0 && (
                <span style={{ fontSize: 9, color: PASTEL.coral }}>💬 {post.replies.length}</span>
              )}
            </div>
            <p style={{ fontSize: 12, color: theme.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {post.content}
            </p>
          </button>
        ))
      )}
    </div>
  );
}

// ===== Shop Tab (굿즈 숍) =====
function ShopTab({ theme, playSfx, showMsg }) {
  const [selectedItem, setSelectedItem] = useState(null);

  const shopItems = [
    { id: "sticker-pack", name: "ashrain.out 스티커 팩", price: 5000, emoji: "🎨", desc: "수학 테마 스티커 12장 세트", includesSub: false },
    { id: "notebook", name: "기하학 노트", price: 8000, emoji: "📓", desc: "작도용 모눈 노트 + 공식 카드", includesSub: false },
    { id: "pencil-set", name: "삼각형 연필 세트", price: 6000, emoji: "✏️", desc: "삼각형 모양 연필 3자루 + 지우개", includesSub: false },
    { id: "premium-bundle", name: "프리미엄 학습 키트", price: 35000, emoji: "🎁", desc: "전 굿즈 포함 + 1개월 구독권", includesSub: true, highlight: true },
    { id: "sub-gift", name: "구독 선물권 (1개월)", price: 50000, emoji: "🎫", desc: "자녀에게 선물할 수 있는 1개월 이용권", includesSub: true },
  ];

  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: PASTEL.coral, fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>
          ASHRAIN.OUT
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: theme.text, margin: "0 0 4px 0" }}>재원생에게 매우 친화적 숍</h3>
        <p style={{ fontSize: 10, color: theme.textSec, margin: 0 }}>
          굿즈 구매 시 구독권이 함께 제공될 수 있어요
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {shopItems.map(item => (
          <button key={item.id} onClick={() => { playSfx("click"); setSelectedItem(item); }} style={{
            width: "100%", textAlign: "left", padding: "16px", borderRadius: 16,
            border: item.highlight ? `2px solid ${PASTEL.coral}` : `1px solid ${theme.border}`,
            background: item.highlight ? `${PASTEL.coral}06` : theme.card,
            cursor: "pointer", position: "relative",
          }}>
            {item.highlight && (
              <span style={{ position: "absolute", top: -8, right: 12, background: PASTEL.coral, color: "white", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>BEST</span>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>{item.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{item.name}</div>
                <div style={{ fontSize: 10, color: theme.textSec, marginTop: 2 }}>{item.desc}</div>
                {item.includesSub && (
                  <span style={{ display: "inline-block", marginTop: 4, fontSize: 9, padding: "1px 6px", borderRadius: 8, background: `${PASTEL.mint}20`, color: PASTEL.mint, fontWeight: 700 }}>
                    🎫 구독권 포함
                  </span>
                )}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: PASTEL.coral }}>
                ₩{item.price.toLocaleString()}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 선택 시 구매 확인 */}
      {selectedItem && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={() => setSelectedItem(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: theme.card, borderRadius: 20, padding: 24, maxWidth: 340, width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 48 }}>{selectedItem.emoji}</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: theme.text, margin: "8px 0 4px" }}>{selectedItem.name}</h3>
              <p style={{ fontSize: 11, color: theme.textSec, margin: 0 }}>{selectedItem.desc}</p>
              <div style={{ fontSize: 22, fontWeight: 800, color: PASTEL.coral, marginTop: 12 }}>
                ₩{selectedItem.price.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: 12, background: `${PASTEL.lavender}10`, borderRadius: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 10, color: theme.textSec, margin: 0, textAlign: "center", lineHeight: 1.6 }}>
                🚧 결제 시스템 준비 중입니다.<br />
                오픈 시 알림을 받으시려면 관리자에게 문의해주세요.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setSelectedItem(null)} style={{
                flex: 1, padding: "12px", borderRadius: 12, border: `1px solid ${theme.border}`,
                background: "transparent", color: theme.textSec, fontSize: 13, cursor: "pointer",
              }}>닫기</button>
              <button onClick={() => { showMsg("결제 시스템 준비 중이에요! 🚧", 2000); setSelectedItem(null); }} style={{
                flex: 1, padding: "12px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
                color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>구매하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Pricing Tab (요금제 안내) =====
function PricingTab({ theme, user }) {
  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: PASTEL.coral, fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>
          ASHRAIN.OUT
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: theme.text, margin: "0 0 6px 0" }}>재원생에게 매우 친화적 요금제</h3>
        <p style={{ fontSize: 11, color: theme.textSec, margin: 0, lineHeight: 1.6 }}>
          재원생은 수업료에 포함 · 추가 비용 없음
        </p>
      </div>

      {/* 재원생 플랜 */}
      <div style={{
        borderRadius: 16, padding: 20, marginBottom: 14,
        border: `2px solid ${PASTEL.mint}`,
        background: `${PASTEL.mint}06`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: PASTEL.mint, color: "white", fontWeight: 700 }}>재원생</span>
            <div style={{ fontSize: 16, fontWeight: 800, color: theme.text, marginTop: 6 }}>무제한 이용</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: PASTEL.mint }}>₩0</div>
            <div style={{ fontSize: 10, color: theme.textSec }}>수업료에 포함</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: theme.textSec, lineHeight: 1.8 }}>
          ✓ 모든 학습 도구 무제한<br />
          ✓ AI 문제 분석 무제한<br />
          ✓ 다이어리 · 아카이브 · 숙제<br />
          ✓ 광장 참여 · 선생님 질문<br />
          ✓ 학부모 갤러리 열람
        </div>
      </div>

      {/* 외부생 플랜 */}
      <div style={{
        borderRadius: 16, padding: 20, marginBottom: 14,
        border: `2px solid ${PASTEL.coral}`,
        background: `${PASTEL.coral}06`,
        position: "relative",
      }}>
        <span style={{ position: "absolute", top: -10, left: 16, background: PASTEL.coral, color: "white", fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 10 }}>
          외부생
        </span>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 4 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: theme.text }}>프리미엄 구독</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: PASTEL.coral }}>₩50,000</div>
            <div style={{ fontSize: 10, color: theme.textSec }}>/ 월</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: theme.textSec, lineHeight: 1.8 }}>
          ✓ 모든 학습 도구 이용<br />
          ✓ AI 문제 분석 하루 10회<br />
          ✓ 다이어리 · 아카이브 · 숙제<br />
          ✓ 광장 참여 · 선생님 질문<br />
          ✓ 학부모 갤러리 열람
        </div>
        <div style={{ marginTop: 12, padding: 10, background: `${PASTEL.coral}10`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, color: PASTEL.coral, fontWeight: 700, margin: 0, textAlign: "center" }}>
            🎁 첫 1주일 무료 체험 제공
          </p>
        </div>
      </div>

      {/* 무료 플랜 */}
      <div style={{
        borderRadius: 16, padding: 20, marginBottom: 14,
        border: `1px solid ${theme.border}`,
        background: theme.card,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: theme.border, color: theme.textSec, fontWeight: 700 }}>무료</span>
            <div style={{ fontSize: 16, fontWeight: 800, color: theme.text, marginTop: 6 }}>기본 이용</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: theme.textSec }}>₩0</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: theme.textSec, lineHeight: 1.8 }}>
          ✓ 그리기 도구<br />
          ✓ 알림<br />
          ✗ <span style={{ textDecoration: "line-through" }}>AI 문제 분석</span><br />
          ✗ <span style={{ textDecoration: "line-through" }}>다이어리 · 숙제 · 질문</span><br />
          ✗ <span style={{ textDecoration: "line-through" }}>광장 글쓰기</span>
        </div>
      </div>

      {/* 숍 연동 안내 */}
      <div style={{ textAlign: "center", padding: 16, background: `${PASTEL.lavender}08`, borderRadius: 14, border: `1px solid ${PASTEL.lavender}20` }}>
        <p style={{ fontSize: 11, color: theme.textSec, margin: 0, lineHeight: 1.7 }}>
          🛍️ 숍에서 <span style={{ color: PASTEL.coral, fontWeight: 700 }}>프리미엄 학습 키트</span>를 구매하면<br />
          1개월 구독권이 포함되어 있어요!
        </p>
      </div>
    </div>
  );
}

// ===== Main Parent Home Screen =====
export function ParentHomeScreenInner({ theme, user, setScreen, playSfx, showMsg,
  publicArchive, crossTalkPosts, setCrossTalkPosts, sendHomeworkToChild, handleLogout }) {

  const [activeTab, setActiveTab] = useState("gallery");

  return (
    <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ flexShrink: 0, padding: "14px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9, color: PASTEL.coral, fontWeight: 700, letterSpacing: 2 }}>ASHRAIN.OUT</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>학부모</div>
        </div>
        <button onClick={() => { playSfx("click"); handleLogout(); }} style={{
          background: "none", border: `1px solid ${theme.border}`, borderRadius: 8,
          padding: "4px 10px", color: theme.textSec, fontSize: 10, cursor: "pointer",
        }}>로그아웃</button>
      </div>

      {/* Tab bar */}
      <div style={{ flexShrink: 0, display: "flex", borderBottom: `1px solid ${theme.border}`, background: theme.card }}>
        {PARENT_TABS.map(tab => (
          <button key={tab.key} onClick={() => { playSfx("click"); setActiveTab(tab.key); }} style={{
            flex: 1, padding: "10px 4px", border: "none", cursor: "pointer",
            background: activeTab === tab.key ? `${PASTEL.coral}10` : "transparent",
            borderBottom: activeTab === tab.key ? `2px solid ${PASTEL.coral}` : "2px solid transparent",
            transition: "all 0.2s",
          }}>
            <div style={{ fontSize: 16 }}>{tab.icon}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: activeTab === tab.key ? PASTEL.coral : theme.textSec, marginTop: 2 }}>{tab.label}</div>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 20px" }}>
        {activeTab === "gallery" && (
          <GalleryTab theme={theme} publicArchive={publicArchive} playSfx={playSfx} showMsg={showMsg} user={user} sendHomeworkToChild={sendHomeworkToChild} />
        )}
        {activeTab === "crossTalk" && (
          <CrossTalkTab theme={theme} playSfx={playSfx} showMsg={showMsg} crossTalkPosts={crossTalkPosts} setCrossTalkPosts={setCrossTalkPosts} user={user} />
        )}
        {activeTab === "shop" && (
          <ShopTab theme={theme} playSfx={playSfx} showMsg={showMsg} />
        )}
        {activeTab === "pricing" && (
          <PricingTab theme={theme} user={user} />
        )}
      </div>
    </div>
  );
}

export function renderParentHomeScreen(ctx) {
  return <ParentHomeScreenInner {...ctx} />;
}
