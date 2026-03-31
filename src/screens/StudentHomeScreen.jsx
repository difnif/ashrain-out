import { useState, useEffect, useRef, useCallback } from "react";
import { PASTEL } from "../config";

function dateStr(d) { return d ? new Date(typeof d==="object"&&d.seconds?d.seconds*1000:d).toLocaleDateString("ko-KR",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : ""; }
function todayKey() { return new Date().toISOString().slice(0,10); }
function weekAgo() { const d=new Date();d.setDate(d.getDate()-7);return d.toISOString().slice(0,10); }
function monthAgo() { const d=new Date();d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,10); }

const TABS = [
  {key:"home",icon:"🏠",label:"홈"},
  {key:"study",icon:"📖",label:"복습"},
  {key:"homework",icon:"📝",label:"숙제"},
  {key:"more",icon:"···",label:"더보기"},
];

// ============================================================
// HOME TAB — Dashboard
// ============================================================
function HomeTab({theme,user,playSfx,setTab,setScreen,homework,notifications,activityLog,streak}) {
  const pending = homework.filter(h=>h.status!=="completed").length;
  const unread = notifications.filter(n=>!n.read).length;
  const today = todayKey();
  const todayCount = activityLog.filter(a=>a.date===today).length;
  const weekCount = activityLog.filter(a=>a.date>=weekAgo()).length;
  const monthCount = activityLog.filter(a=>a.date>=monthAgo()).length;

  return (
    <div style={{padding:"16px 18px",animation:"fadeIn 0.3s ease"}}>
      {/* Greeting */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:20,fontWeight:700,color:theme.text}}>
          {(() => { const h=new Date().getHours(); return h<12?"좋은 아침 ☀️":h<18?"좋은 오후 📚":"좋은 저녁 🌙"; })()}, {user?.name||"학생"}!
        </div>
        {streak>0 && <div style={{fontSize:12,color:PASTEL.coral,fontWeight:700,marginTop:4}}>🔥 {streak}일 연속 학습 중!</div>}
      </div>

      {/* Stats dashboard */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[
          {label:"오늘",value:todayCount,unit:"회",color:PASTEL.coral,icon:"📊"},
          {label:"이번 주",value:weekCount,unit:"회",color:PASTEL.sky,icon:"📈"},
          {label:"이번 달",value:monthCount,unit:"회",color:PASTEL.mint,icon:"📅"},
        ].map(s=>(
          <div key={s.label} style={{flex:1,padding:"14px 10px",borderRadius:14,background:theme.card,border:`1px solid ${theme.border}`,textAlign:"center"}}>
            <div style={{fontSize:18}}>{s.icon}</div>
            <div style={{fontSize:18,fontWeight:700,color:s.color,marginTop:4}}>{s.value}<span style={{fontSize:10,fontWeight:400,color:theme.textSec}}>{s.unit}</span></div>
            <div style={{fontSize:10,color:theme.textSec}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending alerts */}
      {(pending>0||unread>0) && (
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {pending>0 && (
            <button onClick={()=>{setTab("homework");playSfx("click");}} style={{flex:1,padding:"12px",borderRadius:12,border:`1.5px solid ${PASTEL.coral}40`,background:`${PASTEL.coral}06`,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:13,fontWeight:700,color:PASTEL.coral}}>📝 숙제 {pending}개</span>
              <div style={{fontSize:10,color:theme.textSec,marginTop:2}}>선생님이 기다리고 있어요</div>
            </button>
          )}
          {unread>0 && (
            <button onClick={()=>{setTab("more");playSfx("click");}} style={{flex:1,padding:"12px",borderRadius:12,border:`1.5px solid ${PASTEL.sky}40`,background:`${PASTEL.sky}06`,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:13,fontWeight:700,color:PASTEL.sky}}>🔔 알림 {unread}개</span>
              <div style={{fontSize:10,color:theme.textSec,marginTop:2}}>확인해보세요</div>
            </button>
          )}
        </div>
      )}

      {/* Quick start */}
      <div style={{fontSize:12,fontWeight:700,color:theme.textSec,marginBottom:8}}>지금 바로 시작하기</div>
      <button onClick={()=>{setTab("study");playSfx("click");}} style={{
        width:"100%",padding:"18px 16px",borderRadius:16,
        border:`2px solid ${PASTEL.coral}30`,background:`linear-gradient(135deg,${PASTEL.coral}08,${PASTEL.dustyRose}08)`,
        cursor:"pointer",textAlign:"left",marginBottom:8,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:28}}>📖</span>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:theme.text}}>복습하기</div>
            <div style={{fontSize:11,color:theme.textSec}}>그려서 기억하기 · 문장 이해하기</div>
          </div>
        </div>
      </button>
      <button onClick={()=>{playSfx("click");setScreen("sentence");}} style={{
        width:"100%",padding:"16px 16px",borderRadius:14,
        border:`2px solid ${PASTEL.sky}25`,background:`${PASTEL.sky}04`,
        cursor:"pointer",textAlign:"left",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:24}}>🙋</span>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:theme.text}}>질문하기</div>
            <div style={{fontSize:11,color:theme.textSec}}>모르는 문제 사진 찍으면 AI가 분석해줘요</div>
          </div>
        </div>
      </button>
    </div>
  );
}

// ============================================================
// STUDY TAB — 복습하기
// ============================================================
function StudyTab({theme,setScreen,playSfx,logActivity}) {
  const items = [
    {icon:"✦",title:"그려서 기억하기",desc:"삼각형 · 외심 · 내심 · 합동 조건\n직접 그려보면서 기하학 개념 완벽 이해!",color:PASTEL.coral,screen:"polygons"},
    {icon:"📐",title:"문제 문장 이해하기",desc:"수학 문제 사진 찍기 → AI가 직독직해\n조건 형광펜 + 풀이 방향 제시",color:PASTEL.sky,screen:"sentence"},
  ];
  return (
    <div style={{padding:"16px 18px",animation:"fadeIn 0.3s ease"}}>
      <div style={{fontSize:16,fontWeight:700,color:theme.text,marginBottom:4}}>📖 복습하기</div>
      <p style={{fontSize:11,color:theme.textSec,marginBottom:16}}>어떤 방법으로 공부할까?</p>
      {items.map(item=>(
        <button key={item.screen} onClick={()=>{playSfx("click");logActivity(item.title);setScreen(item.screen);}}
          style={{width:"100%",padding:"20px 18px",borderRadius:18,border:`2px solid ${item.color}25`,background:theme.card,cursor:"pointer",textAlign:"left",marginBottom:12,transition:"transform 0.2s"}}>
          <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
            <span style={{fontSize:32,lineHeight:1}}>{item.icon}</span>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:theme.text,marginBottom:4}}>{item.title}</div>
              <div style={{fontSize:12,color:theme.textSec,lineHeight:1.8,whiteSpace:"pre-line"}}>{item.desc}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// HOMEWORK TAB
// ============================================================
function HomeworkTab({theme,homework,setHomework,playSfx,showMsg,logActivity}) {
  const pending=homework.filter(h=>h.status==="assigned"||h.status==="in_progress");
  const completed=homework.filter(h=>h.status==="completed");
  const [expandedId,setExpandedId]=useState(null);
  const [answerText,setAnswerText]=useState("");

  const complete=(id)=>{
    if(!answerText.trim()){showMsg("답을 적어주세요!",1500);return;}
    setHomework(prev=>prev.map(h=>h.id===id?{...h,status:"completed",completedAt:Date.now(),answer:answerText}:h));
    setExpandedId(null);setAnswerText("");logActivity("숙제완료");playSfx("success");showMsg("숙제 완료! 💪",1500);
  };

  return (
    <div style={{padding:"12px 16px",animation:"fadeIn 0.3s ease"}}>
      {pending.length>0&&(
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:PASTEL.coral,marginBottom:8}}>📌 해야 할 숙제 ({pending.length})</div>
          {pending.map(hw=>{
            const exp=expandedId===hw.id;
            return(
              <div key={hw.id} style={{marginBottom:8,borderRadius:14,overflow:"hidden",border:`2px solid ${PASTEL.coral}35`,background:`${PASTEL.coral}04`}}>
                <button onClick={()=>{setExpandedId(exp?null:hw.id);setAnswerText("");}} style={{width:"100%",padding:"12px 14px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left"}}>
                  <div style={{fontSize:13,fontWeight:700,color:theme.text}}>{hw.problemType||"수학 문제"}</div>
                  <div style={{fontSize:10,color:theme.textSec}}>{dateStr(hw.assignedAt)} · {hw.status==="in_progress"?"🔄 작성 중":"⏳ 대기"}</div>
                </button>
                {exp&&(
                  <div style={{padding:"0 14px 14px",animation:"fadeIn 0.2s ease"}}>
                    <div style={{padding:10,borderRadius:10,background:theme.bg,marginBottom:8,fontSize:12,lineHeight:2,color:theme.text}}>{hw.problemText||"문제를 확인하세요"}</div>
                    {hw.teacherResponse&&(<div style={{padding:10,borderRadius:10,background:`${PASTEL.sky}08`,border:`1px solid ${PASTEL.sky}20`,marginBottom:8,fontSize:11,color:theme.text}}><div style={{fontSize:10,color:PASTEL.sky,fontWeight:700,marginBottom:4}}>선생님 풀이</div>{hw.teacherResponse}</div>)}
                    <textarea value={answerText} onChange={e=>setAnswerText(e.target.value)} placeholder="답을 적어주세요..." style={{width:"100%",padding:10,borderRadius:10,border:`1px solid ${theme.border}`,background:theme.bg,color:theme.text,fontSize:13,minHeight:80,resize:"vertical",boxSizing:"border-box",fontFamily:"'Noto Serif KR',serif"}}/>
                    <button onClick={()=>complete(hw.id)} style={{width:"100%",marginTop:8,padding:11,borderRadius:12,border:"none",background:PASTEL.coral,color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>✅ 숙제 제출</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{fontSize:11,color:theme.textSec,marginBottom:8}}>✅ 완료 ({completed.length})</div>
      {completed.length===0&&pending.length===0&&<div style={{textAlign:"center",padding:40,color:theme.textSec}}><div style={{fontSize:36,marginBottom:8}}>🎉</div><p style={{fontSize:12}}>숙제가 없어요! 자유롭게 복습해보세요</p></div>}
      {completed.map(hw=>(<div key={hw.id} style={{padding:"10px 14px",marginBottom:6,borderRadius:12,background:theme.card,border:`1px solid ${PASTEL.mint}25`}}><div style={{fontSize:12,fontWeight:600,color:theme.text}}>{hw.problemType||"수학 문제"}</div><div style={{fontSize:10,color:PASTEL.mint}}>✅ {dateStr(hw.completedAt)}</div></div>))}
    </div>
  );
}

// ============================================================
// MORE TAB — 알림, 순위표, 아카이브, 광장, 설정
// ============================================================
function MoreTab({theme,playSfx,setScreen,setTab,setSubPage,subPage,
  notifications,setNotifications,dndStart,dndEnd,setDndStart,setDndEnd,
  archive,setArchive,activityLog,members,user}) {

  if(subPage==="notif") return <NotifPage theme={theme} notifications={notifications} setNotifications={setNotifications} dndStart={dndStart} dndEnd={dndEnd} setDndStart={setDndStart} setDndEnd={setDndEnd} playSfx={playSfx} back={()=>setSubPage(null)}/>;
  if(subPage==="ranking") return <RankingPage theme={theme} activityLog={activityLog} members={members} user={user} back={()=>setSubPage(null)}/>;
  if(subPage==="archive") return <ArchivePage theme={theme} archive={archive} setArchive={setArchive} playSfx={playSfx} back={()=>setSubPage(null)}/>;

  const unread = notifications.filter(n=>!n.read).length;
  const menus = [
    {icon:"🔔",label:"알림",desc:unread>0?`${unread}개 새 알림`:"알림 · 방해금지 설정",badge:unread,key:"notif"},
    {icon:"🏆",label:"순위표",desc:"복습량 기반 성장률 순위",key:"ranking"},
    {icon:"📂",label:"아카이브",desc:"저장한 복습 자료",key:"archive"},
    {icon:"💬",label:"광장",desc:"실시간 채팅",action:()=>setScreen("plaza")},
    {icon:"⚙️",label:"설정",desc:"테마 · 말투 · 계정",action:()=>setScreen("settings")},
  ];

  return (
    <div style={{padding:"16px 18px",animation:"fadeIn 0.3s ease"}}>
      <div style={{fontSize:16,fontWeight:700,color:theme.text,marginBottom:14}}>더보기</div>
      {menus.map(m=>(
        <button key={m.label} onClick={()=>{playSfx("click");m.action?m.action():setSubPage(m.key);}}
          style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:8,borderRadius:14,border:`1px solid ${theme.border}`,background:theme.card,cursor:"pointer",textAlign:"left",position:"relative"}}>
          <span style={{fontSize:20}}>{m.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:theme.text}}>{m.label}</div>
            <div style={{fontSize:10,color:theme.textSec}}>{m.desc}</div>
          </div>
          {m.badge>0&&<div style={{width:20,height:20,borderRadius:10,background:PASTEL.coral,color:"white",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{m.badge}</div>}
          <span style={{color:theme.textSec,fontSize:12}}>›</span>
        </button>
      ))}
    </div>
  );
}

// --- Notification Page ---
function NotifPage({theme,notifications,setNotifications,dndStart,dndEnd,setDndStart,setDndEnd,playSfx,back}) {
  const markAll=()=>{setNotifications(prev=>prev.map(n=>({...n,read:true})));playSfx("click");};
  return (
    <div style={{padding:"12px 16px",animation:"fadeIn 0.3s ease"}}>
      <button onClick={back} style={{background:"none",border:"none",color:theme.textSec,fontSize:12,cursor:"pointer",marginBottom:10}}>← 더보기</button>
      <div style={{padding:"10px 12px",borderRadius:12,background:theme.card,border:`1px solid ${theme.border}`,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:theme.text,marginBottom:6}}>🌙 방해금지</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input type="time" value={dndStart} onChange={e=>setDndStart(e.target.value)} style={{flex:1,padding:6,borderRadius:6,border:`1px solid ${theme.border}`,background:theme.bg,color:theme.text,fontSize:11}}/>
          <span style={{fontSize:11,color:theme.textSec}}>~</span>
          <input type="time" value={dndEnd} onChange={e=>setDndEnd(e.target.value)} style={{flex:1,padding:6,borderRadius:6,border:`1px solid ${theme.border}`,background:theme.bg,color:theme.text,fontSize:11}}/>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        <span style={{fontSize:11,color:theme.textSec}}>알림</span>
        {notifications.some(n=>!n.read)&&<button onClick={markAll} style={{fontSize:10,color:PASTEL.sky,background:"none",border:"none",cursor:"pointer"}}>모두 읽음</button>}
      </div>
      {notifications.length===0&&<p style={{textAlign:"center",color:theme.textSec,fontSize:12,padding:30}}>알림이 없어요</p>}
      {notifications.map(n=>(
        <div key={n.id} onClick={()=>setNotifications(prev=>prev.map(nn=>nn.id===n.id?{...nn,read:true}:nn))} style={{padding:"10px 12px",marginBottom:6,borderRadius:10,background:n.read?theme.card:`${PASTEL.sky}06`,border:`1px solid ${n.read?theme.border:PASTEL.sky+"30"}`,cursor:"pointer"}}>
          <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
            {!n.read&&<div style={{width:7,height:7,borderRadius:4,background:PASTEL.coral,marginTop:4,flexShrink:0}}/>}
            <div><div style={{fontSize:12,fontWeight:n.read?400:700,color:theme.text}}>{n.title}</div><div style={{fontSize:10,color:theme.textSec}}>{n.message}</div><div style={{fontSize:9,color:theme.textSec,marginTop:2}}>{dateStr(n.time)}</div></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Ranking Page ---
function RankingPage({theme,activityLog,members,user,back}) {
  const week=weekAgo();
  const lastWeek=(()=>{const d=new Date();d.setDate(d.getDate()-14);return d.toISOString().slice(0,10);})();
  // Calculate per-user stats
  const userStats = (members||[]).filter(m=>m.role==="student"||m.role==="assistant").map(m=>{
    const thisWeek=activityLog.filter(a=>a.userId===m.id&&a.date>=week).length;
    const prevWeek=activityLog.filter(a=>a.userId===m.id&&a.date>=lastWeek&&a.date<week).length;
    const growth=prevWeek>0?Math.round((thisWeek-prevWeek)/prevWeek*100):thisWeek>0?100:0;
    const streak=activityLog.filter(a=>a.userId===m.id).reduce((acc,a)=>{
      // Simple streak: count unique recent consecutive days
      return acc;
    },0);
    return{...m,thisWeek,prevWeek,growth,total:activityLog.filter(a=>a.userId===m.id).length};
  }).sort((a,b)=>b.growth-a.growth||b.thisWeek-a.thisWeek);

  const medals=["🥇","🥈","🥉"];

  return (
    <div style={{padding:"12px 16px",animation:"fadeIn 0.3s ease"}}>
      <button onClick={back} style={{background:"none",border:"none",color:theme.textSec,fontSize:12,cursor:"pointer",marginBottom:10}}>← 더보기</button>
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:28}}>🏆</div>
        <div style={{fontSize:16,fontWeight:700,color:theme.text}}>이번 주 성장률 순위</div>
        <p style={{fontSize:10,color:theme.textSec}}>지난주 대비 복습량 성장률 기준</p>
      </div>
      {userStats.length===0&&<p style={{textAlign:"center",color:theme.textSec,fontSize:12,padding:20}}>아직 데이터가 없어요</p>}
      {userStats.map((s,i)=>{
        const isMe=s.id===user?.id;
        return(
          <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",marginBottom:6,borderRadius:14,background:isMe?`${PASTEL.coral}06`:theme.card,border:`1.5px solid ${isMe?PASTEL.coral+"40":theme.border}`}}>
            <span style={{fontSize:18,width:28,textAlign:"center"}}>{medals[i]||`${i+1}`}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:theme.text}}>{s.name}{isMe&&<span style={{fontSize:9,color:PASTEL.coral,marginLeft:4}}>나</span>}</div>
              <div style={{fontSize:10,color:theme.textSec}}>이번 주 {s.thisWeek}회 · 총 {s.total}회</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:16,fontWeight:700,color:s.growth>0?PASTEL.mint:s.growth<0?PASTEL.coral:theme.textSec}}>
                {s.growth>0?"+":""}{s.growth}%
              </div>
              <div style={{fontSize:9,color:theme.textSec}}>성장률</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Archive Page ---
function ArchivePage({theme,archive,setArchive,playSfx,back}) {
  const [filter,setFilter]=useState("all");
  const filtered=filter==="all"?archive:archive.filter(a=>filter==="public"?a.isPublic:!a.isPublic);
  return (
    <div style={{padding:"12px 16px",animation:"fadeIn 0.3s ease"}}>
      <button onClick={back} style={{background:"none",border:"none",color:theme.textSec,fontSize:12,cursor:"pointer",marginBottom:10}}>← 더보기</button>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {[["all","전체"],["public","공개"],["private","비공개"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{padding:"5px 12px",borderRadius:20,fontSize:10,cursor:"pointer",border:filter===k?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,background:filter===k?`${PASTEL.coral}10`:theme.card,color:theme.text}}>{l}</button>
        ))}
      </div>
      {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:theme.textSec}}><div style={{fontSize:32,marginBottom:8}}>📂</div><p style={{fontSize:12}}>저장한 게 없어요</p></div>}
      {filtered.map(item=>(
        <div key={item.id} style={{padding:"10px 14px",marginBottom:6,borderRadius:12,background:theme.card,border:`1px solid ${theme.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:12,fontWeight:600,color:theme.text}}>{item.title}</div><div style={{fontSize:10,color:theme.textSec}}>{dateStr(item.createdAt)}</div></div>
          <button onClick={()=>{setArchive(prev=>prev.map(a=>a.id===item.id?{...a,isPublic:!a.isPublic}:a));playSfx("click");}} style={{fontSize:10,padding:"3px 8px",borderRadius:8,border:`1px solid ${theme.border}`,background:item.isPublic?`${PASTEL.mint}10`:theme.card,color:item.isPublic?PASTEL.mint:theme.textSec,cursor:"pointer"}}>{item.isPublic?"🌍":"🔒"}</button>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MAIN STUDENT HOME SCREEN
// ============================================================
export function StudentHomeScreenInner({theme,setScreen,playSfx,showMsg,user,isAdminPreview,exitPreview,
  archive,setArchive,homework,setHomework,notifications,setNotifications,
  dndStart,dndEnd,setDndStart,setDndEnd,members}) {

  const [tab,setTab]=useState("home");
  const [subPage,setSubPage]=useState(null);
  const [activityLog,setActivityLog]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("ar_activity_log"))||[];}catch{return[];}
  });

  useEffect(()=>{localStorage.setItem("ar_activity_log",JSON.stringify(activityLog));},[activityLog]);

  const logActivity=useCallback((type)=>{
    setActivityLog(prev=>[...prev,{date:todayKey(),type,userId:user?.id||"anon",time:Date.now()}]);
  },[user]);

  // Calculate streak
  const streak=(()=>{
    const dates=[...new Set(activityLog.filter(a=>a.userId===user?.id).map(a=>a.date))].sort().reverse();
    let count=0;const t=todayKey();
    for(let i=0;i<dates.length;i++){
      const expected=new Date();expected.setDate(expected.getDate()-i);
      if(dates[i]===expected.toISOString().slice(0,10))count++;
      else break;
    }
    return count;
  })();

  const unread=notifications.filter(n=>!n.read).length;
  const pendingHw=homework.filter(h=>h.status!=="completed").length;

  return (
    <div style={{height:"100vh",maxHeight:"100dvh",display:"flex",flexDirection:"column",background:theme.bg,fontFamily:"'Noto Serif KR',serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet"/>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {isAdminPreview&&(
        <div style={{flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 14px",background:`${PASTEL.coral}12`,borderBottom:`1px solid ${PASTEL.coral}30`}}>
          <span style={{fontSize:10,color:PASTEL.coral,fontWeight:700}}>👁️ 학생 모드 미리보기</span>
          <button onClick={exitPreview} style={{padding:"3px 10px",borderRadius:6,border:`1px solid ${PASTEL.coral}`,background:"transparent",color:PASTEL.coral,fontSize:10,cursor:"pointer",fontWeight:700}}>🚪 나가기</button>
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        {tab==="home"&&<HomeTab theme={theme} user={user} playSfx={playSfx} setTab={setTab} setScreen={setScreen} homework={homework} notifications={notifications} activityLog={activityLog} streak={streak}/>}
        {tab==="study"&&<StudyTab theme={theme} setScreen={setScreen} playSfx={playSfx} logActivity={logActivity}/>}
        {tab==="homework"&&<HomeworkTab theme={theme} homework={homework} setHomework={setHomework} playSfx={playSfx} showMsg={showMsg} logActivity={logActivity}/>}
        {tab==="more"&&<MoreTab theme={theme} playSfx={playSfx} setScreen={setScreen} setTab={setTab} subPage={subPage} setSubPage={setSubPage}
          notifications={notifications} setNotifications={setNotifications} dndStart={dndStart} dndEnd={dndEnd} setDndStart={setDndStart} setDndEnd={setDndEnd}
          archive={archive} setArchive={setArchive} activityLog={activityLog} members={members} user={user}/>}
      </div>

      <div style={{flexShrink:0,display:"flex",borderTop:`1px solid ${theme.border}`,background:theme.card,paddingBottom:"env(safe-area-inset-bottom,0)"}}>
        {TABS.map(t=>{
          const active=tab===t.key;
          const badge=t.key==="homework"?pendingHw:t.key==="more"?unread:0;
          return(
            <button key={t.key} onClick={()=>{setTab(t.key);setSubPage(null);playSfx("click");}}
              style={{flex:1,padding:"8px 0 6px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1,position:"relative"}}>
              <span style={{fontSize:16,opacity:active?1:0.4}}>{t.icon}</span>
              <span style={{fontSize:9,color:active?PASTEL.coral:theme.textSec,fontWeight:active?700:400}}>{t.label}</span>
              {badge>0&&<div style={{position:"absolute",top:2,right:"calc(50% - 14px)",minWidth:16,height:16,borderRadius:8,background:PASTEL.coral,color:"white",fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{badge}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function renderStudentHomeScreen(ctx) {
  return <StudentHomeScreenInner {...ctx}/>;
}
