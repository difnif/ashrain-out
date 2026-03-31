import { useState, useEffect, useRef, useCallback } from "react";
import { PASTEL } from "../config";

function dateStr(d) { return d ? new Date(typeof d==="object"&&d.seconds?d.seconds*1000:d).toLocaleDateString("ko-KR",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : ""; }
function todayKey() { return new Date().toISOString().slice(0,10); }
function weekAgo() { const d=new Date();d.setDate(d.getDate()-7);return d.toISOString().slice(0,10); }
function monthAgo() { const d=new Date();d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,10); }

const TABS = [
  {key:"home",icon:"🏠",label:"홈"},
  {key:"study",icon:"📖",label:"복습"},
  {key:"diary",icon:"📓",label:"다이어리"},
  {key:"homework",icon:"📝",label:"숙제"},
  {key:"more",icon:"···",label:"더보기"},
];

// ============================================================
// HOME TAB — Dashboard
// ============================================================
function HomeTab({theme,user,playSfx,setTab,homework,notifications,activityLog,streak}) {
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
      <button onClick={()=>{setTab("diary");playSfx("click");}} style={{
        width:"100%",padding:"14px 16px",borderRadius:14,
        border:`1px solid ${theme.border}`,background:theme.card,
        cursor:"pointer",textAlign:"left",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>📓</span>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:theme.text}}>오늘의 다이어리 쓰기</div>
            <div style={{fontSize:10,color:theme.textSec}}>공부한 내용 정리 + 그림 그리기</div>
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
// DIARY TAB (with drawing)
// ============================================================
function DiaryTab({theme,diary,setDiary,playSfx,logActivity}) {
  const today = todayKey();
  const sortedDates = [...new Set(diary.map(d=>d.date))].sort().reverse();
  const [viewDate,setViewDate] = useState(today);
  const [text,setText] = useState("");
  const [editing,setEditing] = useState(false);
  const [drawMode,setDrawMode] = useState(false);
  const [penColor,setPenColor] = useState("#333");
  const [penSize,setPenSize] = useState(3);
  const [isEraser,setIsEraser] = useState(false);
  const [strokes,setStrokes] = useState([]);
  const [curStroke,setCurStroke] = useState(null);
  const [undoHist,setUndoHist] = useState([]);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  useEffect(()=>{
    const e = diary.find(d=>d.date===viewDate);
    setText(e?.content||""); setStrokes(e?.strokes||[]);
    setEditing(false); setDrawMode(false); setUndoHist([]);
  },[viewDate,diary]);

  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d");
    const r=cv.getBoundingClientRect();
    cv.width=r.width*2;cv.height=r.height*2;ctx.scale(2,2);
    ctx.clearRect(0,0,r.width,r.height);
    ctx.lineCap="round";ctx.lineJoin="round";
    [...strokes,...(curStroke?[curStroke]:[])].forEach(s=>{
      if(s.points.length<2) return;
      ctx.beginPath();ctx.strokeStyle=s.eraser?theme.card:s.color;
      ctx.lineWidth=s.eraser?s.size*3:s.size;
      ctx.globalCompositeOperation=s.eraser?"destination-out":"source-over";
      ctx.moveTo(s.points[0].x,s.points[0].y);
      for(let i=1;i<s.points.length;i++) ctx.lineTo(s.points[i].x,s.points[i].y);
      ctx.stroke();
    });
    ctx.globalCompositeOperation="source-over";
  },[strokes,curStroke,theme]);

  const getPos=e=>{const cv=canvasRef.current;if(!cv)return null;const r=cv.getBoundingClientRect();const s=e.touches?e.touches[0]:e;return{x:s.clientX-r.left,y:s.clientY-r.top};};
  const ds=e=>{if(!drawMode)return;e.preventDefault();const p=getPos(e);if(!p)return;drawingRef.current=true;setCurStroke({color:penColor,size:penSize,eraser:isEraser,points:[p]});};
  const dm=e=>{if(!drawingRef.current||!drawMode)return;e.preventDefault();const p=getPos(e);if(!p)return;setCurStroke(prev=>prev?{...prev,points:[...prev.points,p]}:null);};
  const de=()=>{if(!drawingRef.current)return;drawingRef.current=false;if(curStroke&&curStroke.points.length>1){setUndoHist(p=>[...p,strokes]);setStrokes(p=>[...p,curStroke]);}setCurStroke(null);};
  const undo=()=>{if(undoHist.length){setStrokes(undoHist[undoHist.length-1]);setUndoHist(p=>p.slice(0,-1));}};

  const save=()=>{
    setDiary(prev=>{
      const ex=prev.find(d=>d.date===viewDate);
      const data={content:text,strokes,updatedAt:Date.now()};
      if(ex)return prev.map(d=>d.date===viewDate?{...d,...data}:d);
      return[...prev,{id:`diary-${viewDate}`,date:viewDate,...data,createdAt:Date.now()}];
    });
    setEditing(false);setDrawMode(false);
    logActivity("다이어리");playSfx("success");
  };

  const canEdit=viewDate===today;
  const COLORS=["#333","#D95F4B","#3A8FC2","#2E9E6B","#9B7FBF","#E8A040","#E88DB5"];

  return (
    <div style={{padding:"12px 16px",animation:"fadeIn 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={()=>{const d=new Date(viewDate);d.setDate(d.getDate()-1);setViewDate(d.toISOString().slice(0,10));}} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:theme.text}}>◀</button>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:13,fontWeight:700,color:theme.text}}>
            {new Date(viewDate).toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"})}
          </div>
          {viewDate===today&&<span style={{fontSize:9,color:PASTEL.coral,fontWeight:700}}>오늘</span>}
        </div>
        <button onClick={()=>{const d=new Date(viewDate);d.setDate(d.getDate()+1);const n=d.toISOString().slice(0,10);if(n<=today)setViewDate(n);}} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:viewDate<today?theme.text:theme.border}}>▶</button>
      </div>

      {drawMode&&canEdit&&(
        <div style={{display:"flex",gap:5,marginBottom:8,padding:"6px 8px",borderRadius:10,background:theme.card,border:`1px solid ${theme.border}`,flexWrap:"wrap",alignItems:"center",animation:"fadeIn 0.2s ease"}}>
          {COLORS.map(col=>(<button key={col} onClick={()=>{setPenColor(col);setIsEraser(false);}} style={{width:22,height:22,borderRadius:11,background:col,border:penColor===col&&!isEraser?`3px solid ${PASTEL.coral}`:`1.5px solid ${theme.border}`,cursor:"pointer"}}/>))}
          <span style={{color:theme.border}}>|</span>
          <button onClick={()=>setIsEraser(!isEraser)} style={{padding:"3px 6px",borderRadius:6,fontSize:12,cursor:"pointer",border:isEraser?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,background:isEraser?`${PASTEL.coral}15`:theme.card}}>🧽</button>
          <input type="range" min={1} max={12} value={penSize} onChange={e=>setPenSize(+e.target.value)} style={{width:50,accentColor:PASTEL.coral}}/>
          <button onClick={undo} style={{padding:"3px 6px",borderRadius:6,fontSize:11,cursor:"pointer",border:`1px solid ${theme.border}`,background:theme.card,color:undoHist.length?theme.text:theme.border}}>↩</button>
        </div>
      )}

      <div style={{minHeight:300,borderRadius:14,position:"relative",overflow:"hidden",background:theme.card,border:`1px solid ${theme.border}`,backgroundImage:`repeating-linear-gradient(transparent,transparent 31px,${theme.border}40 31px,${theme.border}40 32px)`,backgroundPosition:"0 16px"}}>
        <div style={{padding:16,position:"relative",zIndex:1,pointerEvents:drawMode?"none":"auto"}}>
          {editing&&!drawMode?(
            <textarea value={text} onChange={e=>setText(e.target.value)} style={{width:"100%",minHeight:268,border:"none",background:"transparent",color:theme.text,fontSize:14,lineHeight:"32px",fontFamily:"'Noto Serif KR',serif",resize:"none",outline:"none"}} placeholder="오늘 공부한 내용을 적어보세요..." autoFocus/>
          ):(
            <div onClick={()=>canEdit&&!drawMode&&setEditing(true)} style={{fontSize:14,lineHeight:"32px",color:text?theme.text:theme.textSec,whiteSpace:"pre-wrap",minHeight:268,cursor:canEdit?"text":"default"}}>
              {text||(canEdit?"터치해서 작성하기...":"작성한 내용이 없어요")}
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",zIndex:drawMode?10:2,touchAction:"none",pointerEvents:drawMode?"auto":"none"}}
          onMouseDown={ds} onMouseMove={dm} onMouseUp={de} onMouseLeave={de} onTouchStart={ds} onTouchMove={dm} onTouchEnd={de}/>
      </div>

      {canEdit&&(
        <div style={{display:"flex",gap:6,marginTop:8}}>
          <button onClick={()=>{setDrawMode(!drawMode);if(editing)setEditing(false);playSfx("click");}} style={{padding:"9px 12px",borderRadius:10,border:drawMode?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,background:drawMode?`${PASTEL.coral}10`:theme.card,color:drawMode?PASTEL.coral:theme.text,fontSize:12,cursor:"pointer"}}>
            ✏️ {drawMode?"그리는 중":"그리기"}
          </button>
          {!drawMode&&!editing&&<button onClick={()=>setEditing(true)} style={{padding:"9px 12px",borderRadius:10,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:12,cursor:"pointer"}}>📝 글쓰기</button>}
          <button onClick={save} style={{flex:1,padding:9,borderRadius:10,border:"none",background:PASTEL.coral,color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>💾 저장</button>
        </div>
      )}

      {sortedDates.length>0&&(
        <div style={{marginTop:14}}>
          <div style={{fontSize:10,color:theme.textSec,marginBottom:6}}>최근 기록</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {sortedDates.slice(0,14).map(d=>{
              const has=diary.find(dd=>dd.date===d)?.strokes?.length>0;
              return <button key={d} onClick={()=>setViewDate(d)} style={{padding:"5px 8px",borderRadius:6,fontSize:9,cursor:"pointer",border:viewDate===d?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,background:viewDate===d?`${PASTEL.coral}10`:theme.card,color:d===today?PASTEL.coral:theme.text}}>{d.slice(5)}{has?" 🎨":""}</button>;
            })}
          </div>
        </div>
      )}
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
  archive,setArchive,diary,setDiary,homework,setHomework,notifications,setNotifications,
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
        {tab==="home"&&<HomeTab theme={theme} user={user} playSfx={playSfx} setTab={setTab} homework={homework} notifications={notifications} activityLog={activityLog} streak={streak}/>}
        {tab==="study"&&<StudyTab theme={theme} setScreen={setScreen} playSfx={playSfx} logActivity={logActivity}/>}
        {tab==="diary"&&<DiaryTab theme={theme} diary={diary} setDiary={setDiary} playSfx={playSfx} logActivity={logActivity}/>}
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
