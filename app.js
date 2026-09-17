(function(){
"use strict";

const DATA_BASE="https://raw.githubusercontent.com/shkuhub/study-salesforce/main/data/";
const FILES=[
  {part:1,partName:"Easy",files:["part1/ch01-015.txt","part1/ch02-030.txt","part1/ch03-045.txt","part1/ch04-060.txt"]},
  {part:2,partName:"Intermediate",files:["part2/ch05-075.txt","part2/ch06-090.txt","part2/ch07-105.txt","part2/ch08-120.txt"]},
  {part:3,partName:"Advanced",files:["part3/ch09-135.txt","part3/ch10-150.txt","part3/ch11-165.txt","part3/ch12-180.txt"]}
];
const SECTIONS=[
 "Platform Setup and Governance",
 "Consent Management",
 "Data Modeling, Identity Resolution, and Segmentation",
 "Campaigns, Flows, and Content",
 "Agentforce and AI Innovation",
 "Analytics and Performance Insights"
];
const STORE_KEY="mcn180_v5";
let QUESTIONS=[],filtered=[],idx=0,mode="study",section="all",flipped=false,quizAnswered=false;
let state;
try{state=JSON.parse(localStorage.getItem(STORE_KEY)||"");}catch(e){}
if(!state||typeof state!=="object")state={known:{},review:{},correct:{},wrong:{}};

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const inline=s=>esc(s).replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");
const md=s=>String(s??"").split(/\n\s*\n/).map(b=>{b=b.trim();if(!b)return"";const ls=b.split("\n");if(ls.every(x=>/^\s*-\s+/.test(x)))return"<ul>"+ls.map(x=>"<li>"+inline(x.replace(/^\s*-\s+/,""))+"</li>").join("")+"</ul>";return"<p>"+ls.map(inline).join("<br>")+"</p>"}).join("");

async function decodeBase64Gzip(text){
  const b64=text.trim();
  if(!b64)throw new Error("empty data");
  const binary=atob(b64.replace(/\s+/g,""));
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  if(!window.DecompressionStream)throw new Error("This browser does not support DecompressionStream");
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}
async function loadFile(path){
  const url=DATA_BASE+path+"?v=20260917";
  let r=await fetch(url,{cache:"no-store"});
  if(!r.ok)throw new Error(`${path} HTTP ${r.status}`);
  return decodeBase64Gzip(await r.text());
}

async function init(){
  try{
    const groups=[];
    for(const group of FILES){
      const chunks=await Promise.all(group.files.map(loadFile));
      const qs=chunks.flat().map(q=>({...q,part:group.part,partName:group.partName,id:q.id||((group.part-1)*60+q.no)}));
      groups.push(qs);
    }
    QUESTIONS=groups.flat().sort((a,b)=>a.id-b.id);
    if(QUESTIONS.length!==180)throw new Error(`Expected 180 questions, got ${QUESTIONS.length}`);
    $("loading").textContent="180개 문항 로드 완료";
    renderSections();
    apply();
  }catch(e){
    console.error("Question data loading failed:",e);
    $("loading").innerHTML=`문항 데이터 로드 실패 <small>(${esc(e.message)})</small>`;
    $("question").innerHTML='<div style="padding:40px;text-align:center;color:#6c7482">문항을 불러오지 못했습니다.<br>잠시 후 새로고침하세요.</div>';
    $("choices").innerHTML="";
  }
}
function save(){localStorage.setItem(STORE_KEY,JSON.stringify(state));stats();performance();}
function stats(){
  $("total").textContent=filtered.length;
  $("known").textContent=Object.values(state.known).filter(Boolean).length;
  $("review").textContent=Object.values(state.review).filter(Boolean).length;
}
function renderSections(){
  $("sections").innerHTML='<button class="sec active" data-s="all">All Sections</button>'+SECTIONS.map(s=>`<button class="sec" data-s="${esc(s)}">${esc(s)}</button>`).join("");
  document.querySelectorAll(".sec").forEach(b=>b.onclick=()=>{section=b.dataset.s;document.querySelectorAll(".sec").forEach(x=>x.classList.toggle("active",x===b));idx=0;apply();});
}
function apply(){
  const lv=$("level").value;
  const term=$("search").value.trim().toLowerCase();
  filtered=QUESTIONS.filter(q=>(lv==="all"||String(q.part)===lv)&&(section==="all"||q.section===section)&&(!term||(q.question+" "+q.answerText+" "+q.explanation).toLowerCase().includes(term)));
  idx=Math.min(idx,Math.max(0,filtered.length-1));
  render();
  stats();
}
function render(){
  const q=filtered[idx];
  if(!q){$("question").innerHTML='<div class="empty">조건에 맞는 문제가 없습니다.</div>';$("choices").innerHTML="";$("answerPanel")&&$("answerPanel").classList.add("hidden");return;}
  flipped=false;$("card").classList.remove("flip");
  $("num").textContent=`Q${q.id} · ${q.partName}`;
  $("secLabel").textContent=q.section;
  $("backLabel").textContent=q.partName;
  $("question").innerHTML=md(q.question);
  $("choices").innerHTML=["A","B","C","D"].map(l=>`<div class="choice"><b>${l}</b><span>${inline(q.choices[l]||"")}</span></div>`).join("");
  $("answer").textContent=`${q.answer}. ${q.answerText}`;
  $("explanation").innerHTML=md(q.explanation);
  $("progress").style.width=(filtered.length?(idx+1)/filtered.length*100:0)+"%";
  $("loading").textContent="";
}
function next(){if(filtered.length){idx=(idx+1)%filtered.length;render();}}
function prev(){if(filtered.length){idx=(idx-1+filtered.length)%filtered.length;render();}}
function mark(t){const q=filtered[idx];if(!q)return;if(t==='known'){state.known[q.id]=1;delete state.review[q.id];}else{state.review[q.id]=1;delete state.known[q.id];}save();next();}
function performance(){if(!$("performance"))return;$("performance").innerHTML=SECTIONS.map(s=>{const a=QUESTIONS.filter(q=>q.section===s),k=a.filter(q=>state.known[q.id]).length,r=a.filter(q=>state.review[q.id]).length,c=a.filter(q=>state.correct[q.id]).length,w=a.filter(q=>state.wrong[q.id]).length,p=a.length?Math.round(k/a.length*100):0;return `<div class="pc"><h3>${esc(s)}</h3><div class="row"><b>${k}/${a.length} Known</b><span>${p}%</span></div><div class="mini"><i style="width:${p}%"></i></div><small>Review ${r} · Quiz ✓ ${c} · Quiz ✕ ${w}</small></div>`;}).join("");}
function setMode(m){mode=m;document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));$("study").style.display=m==='study'?'block':'none';$("quiz").style.display=m==='quiz'?'block':'none';$("perf").style.display=m==='perf'?'block':'none';$("title").textContent=m==='study'?'Study Mode':m==='quiz'?'Quiz Mode':'Performance';if(m==='quiz')quiz();else if(m==='perf')performance();else render();}
function quiz(){const q=filtered[idx];if(!q)return;$("qnum").textContent=`Q${q.id} · ${q.partName}`;$("qsec").textContent=q.section;$("qq").innerHTML=md(q.question);$("qchoices").innerHTML=['A','B','C','D'].map(l=>`<button class="qchoice" data-l="${l}"><b>${l}</b> · ${inline(q.choices[l]||'')}</button>`).join('');$("feedback").className='feedback';$("feedback").innerHTML='';quizAnswered=false;document.querySelectorAll('.qchoice').forEach(b=>b.onclick=()=>answerQuiz(b.dataset.l));}
function answerQuiz(l){if(quizAnswered)return;quizAnswered=true;const q=filtered[idx],ok=l===q.answer;(ok?state.correct:state.wrong)[q.id]=1;document.querySelectorAll('.qchoice').forEach(b=>{if(b.dataset.l===q.answer)b.classList.add('correct');if(b.dataset.l===l&&!ok)b.classList.add('wrong');b.disabled=true;});$("feedback").className='feedback '+(ok?'good':'bad');$("feedback").innerHTML=ok?`✓ Correct<br>${esc(q.answerText)}`:`✕ Incorrect<br>정답: ${esc(q.answer+'. '+q.answerText)}<div class="explain">${md(q.explanation)}</div>`;save();}
$("card").onclick=()=>{flipped=!flipped;$("card").classList.toggle('flip',flipped);};
$("next").onclick=next;$("prev").onclick=prev;$("knownBtn").onclick=()=>mark('known');$("reviewBtn").onclick=()=>mark('review');
$("random").onclick=()=>{if(!filtered.length)return;idx=Math.floor(Math.random()*filtered.length);render();};
$("again").onclick=()=>{filtered=QUESTIONS.filter(q=>state.review[q.id]);idx=0;$("level").value='all';section='all';document.querySelectorAll('.sec').forEach(x=>x.classList.toggle('active',x.dataset.s==='all'));render();stats();};
$("reset").onclick=()=>{if(confirm('모든 학습 기록을 초기화할까요?')){state={known:{},review:{},correct:{},wrong:{}};save();apply();}};
$("level").onchange=()=>{idx=0;section='all';document.querySelectorAll('.sec').forEach(x=>x.classList.toggle('active',x.dataset.s==='all'));apply();};
$("search").oninput=()=>{idx=0;apply();};
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
document.addEventListener('keydown',e=>{if(e.target.matches('input,select,button'))return;if(mode==='study'){if(e.code==='Space'){e.preventDefault();$("card").click();}if(e.key==='ArrowRight')next();if(e.key==='ArrowLeft')prev();}else if(mode==='quiz'){if('1234'.includes(e.key))answerQuiz(['A','B','C','D'][+e.key-1]);if(e.key==='ArrowRight')next();}});
init();
})();
