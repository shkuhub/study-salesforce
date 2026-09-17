(function(){
"use strict";

let QUESTIONS=[];

const FILES=[
  "data/part1/ch01-015.txt","data/part1/ch02-030.txt","data/part1/ch03-045.txt","data/part1/ch04-060.txt",
  "data/part2/ch05-075.txt","data/part2/ch06-090.txt","data/part2/ch07-105.txt","data/part2/ch08-120.txt",
  "data/part3/ch09-135.txt","data/part3/ch10-150.txt","data/part3/ch11-165.txt","data/part3/ch12-180.txt"
];

const SECTIONS=[
  "Platform Setup and Governance",
  "Consent Management",
  "Data Modeling, Identity Resolution, and Segmentation",
  "Campaigns, Flows, and Content",
  "Agentforce and AI Innovation",
  "Analytics and Performance Insights"
];

const STORE_KEY="mcn180_v4";
let filtered=[];
let idx=0;
let mode="study";
let section="all";
let flipped=false;
let quizAnswered=false;

let state;
try{state=JSON.parse(localStorage.getItem(STORE_KEY)||"");}catch(e){}
if(!state||typeof state!=="object") state={known:{},review:{},correct:{},wrong:{}};

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const inline=s=>esc(s).replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");
const md=s=>String(s??"").split(/\n\s*\n/).map(b=>{
  b=b.trim(); if(!b)return "";
  const ls=b.split("\n");
  if(ls.length&&ls.every(x=>/^\s*-\s+/.test(x))) return "<ul>"+ls.map(x=>"<li>"+inline(x.replace(/^\s*-\s+/,""))+"</li>").join("")+"</ul>";
  return "<p>"+ls.map(inline).join("<br>")+"</p>";
}).join("");

async function decodeChunk(path){
  const r=await fetch(path,{cache:"no-store"});
  if(!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  const b64=(await r.text()).trim();
  if(!b64) throw new Error(`${path}: empty file`);
  const binary=atob(b64);
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  if(typeof DecompressionStream==="undefined") throw new Error("DecompressionStream is not supported by this browser");
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}

async function init(){
  try{
    const parts=await Promise.all(FILES.map(decodeChunk));
    QUESTIONS=parts.flat();
    if(QUESTIONS.length!==180) throw new Error(`Expected 180 questions, got ${QUESTIONS.length}`);
    $("loading").textContent=`${QUESTIONS.length}개 문항 로드 완료`;
    renderSections();
    apply();
    performance();
  }catch(e){
    console.error("Question data loading failed:",e);
    $("loading").textContent="문항 데이터를 불러오지 못했습니다. 페이지를 새로고침하세요.";
  }
}

function save(){localStorage.setItem(STORE_KEY,JSON.stringify(state));stats();performance();}
function stats(){$("total").textContent=filtered.length;$("known").textContent=Object.values(state.known).filter(Boolean).length;$("review").textContent=Object.values(state.review).filter(Boolean).length;}
function renderSections(){$("sections").innerHTML='<button class="sec active" data-s="all">All Sections</button>'+SECTIONS.map(s=>`<button class="sec" data-s="${esc(s)}">${esc(s)}</button>`).join("");document.querySelectorAll(".sec").forEach(btn=>btn.addEventListener("click",()=>{section=btn.dataset.s;document.querySelectorAll(".sec").forEach(x=>x.classList.toggle("active",x===btn));idx=0;apply();}));}
function apply(){const lv=$("level").value;const term=$("search").value.trim().toLowerCase();filtered=QUESTIONS.filter(q=>(lv==="all"||String(q.part)===lv)&&(section==="all"||q.section===section)&&(!term||[q.question,q.answerText,q.explanation,q.section,q.partName].join(" ").toLowerCase().includes(term)));idx=Math.min(idx,Math.max(0,filtered.length-1));render();stats();}
function render(){
  const q=filtered[idx];
  if(!q){$("loading").textContent="조건에 맞는 문제가 없습니다.";return;}
  $("loading").textContent=`${QUESTIONS.length}개 문항 로드 완료`;
  flipped=false;
  $("card").classList.remove("flip");
  $("num").textContent=`Q${q.id} · ${q.partName}`;
  $("secLabel").textContent=q.section;
  $("backLabel").textContent=q.partName;
  $("question").innerHTML=md(q.question);
  $("choices").innerHTML=["A","B","C","D"].map(l=>`<div class="choice"><b>${l}</b><span>${inline(q.choices[l]||"")}</span></div>`).join("");
  $("answer").textContent=`${q.answer}. ${q.answerText}`;
  $("explanation").innerHTML=md(q.explanation);
  $("progress").style.width=(filtered.length?(idx+1)/filtered.length*100:0)+"%";
}
function next(){if(filtered.length){idx=(idx+1)%filtered.length;mode==="quiz"?quiz():render();}}
function prev(){if(filtered.length){idx=(idx-1+filtered.length)%filtered.length;mode==="quiz"?quiz():render();}}
function mark(type){const id=filtered[idx]?.id;if(!id)return;if(type==="known"){state.known[id]=1;delete state.review[id]}else{state.review[id]=1;delete state.known[id]}save();next();}
function performance(){$("performance").innerHTML=SECTIONS.map(s=>{const a=QUESTIONS.filter(q=>q.section===s);const k=a.filter(q=>state.known[q.id]).length;const r=a.filter(q=>state.review[q.id]).length;const c=a.filter(q=>state.correct[q.id]).length;const w=a.filter(q=>state.wrong[q.id]).length;const p=a.length?Math.round(k/a.length*100):0;return `<div class="pc"><h3>${esc(s)}</h3><div class="row"><b>${k}/${a.length} Known</b><span>${p}%</span></div><div class="mini"><i style="width:${p}%"></i></div><small>Review ${r} · Quiz ✓ ${c} · Quiz ✕ ${w}</small></div>`;}).join("");}
function setMode(m){mode=m;document.querySelectorAll(".mode").forEach(b=>b.classList.toggle("on",b.dataset.mode===m));$("study").style.display=m==="study"?"block":"none";$("quiz").style.display=m==="quiz"?"block":"none";$("perf").style.display=m==="perf"?"block":"none";$("title").textContent=m==="study"?"Study Mode":m==="quiz"?"Quiz Mode":"Performance";if(m==="quiz")quiz();else if(m==="perf")performance();else render();}
function quiz(){const q=filtered[idx];if(!q)return;$("qnum").textContent=`Q${q.id} · ${q.partName}`;$("qsec").textContent=q.section;$("qq").innerHTML=md(q.question);$("qchoices").innerHTML=["A","B","C","D"].map(l=>`<button class="qchoice" data-l="${l}"><b>${l}</b> · ${inline(q.choices[l]||"")}</button>`).join("");$("feedback").className="feedback";$("feedback").innerHTML="";quizAnswered=false;document.querySelectorAll(".qchoice").forEach(b=>b.onclick=()=>answerQuiz(b.dataset.l));$("qnext").onclick=()=>next();}
function answerQuiz(l){if(quizAnswered)return;quizAnswered=true;const q=filtered[idx],ok=l===q.answer;(ok?state.correct:state.wrong)[q.id]=1;document.querySelectorAll(".qchoice").forEach(b=>{if(b.dataset.l===q.answer)b.classList.add("correct");if(b.dataset.l===l&&!ok)b.classList.add("wrong");b.disabled=true;});$("feedback").className="feedback "+(ok?"good":"bad");$("feedback").innerHTML=ok?`✓ Correct<br>${esc(q.answerText)}`:`✕ Incorrect<br>정답: ${esc(q.answer+". "+q.answerText)}<div class="explain">${md(q.explanation)}</div>`;save();}
$("card").onclick=()=>{flipped=!flipped;$("card").classList.toggle("flip",flipped);};
$("random").onclick=()=>{if(!filtered.length)return;idx=Math.floor(Math.random()*filtered.length);mode==="quiz"?quiz():render();};
$("again").onclick=()=>{filtered=QUESTIONS.filter(q=>state.review[q.id]);idx=0;section="all";document.querySelectorAll(".sec").forEach(x=>x.classList.toggle("active",x.dataset.s==="all"));$("level").value="all";$("search").value="";setMode("study");stats();};
$("reset").onclick=()=>{if(confirm("모든 학습 기록을 초기화할까요?")){state={known:{},review:{},correct:{},wrong:{}};save();apply();}};
$("level").onchange=()=>{idx=0;apply();};
$("search").oninput=()=>{idx=0;apply();};
document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
document.addEventListener("keydown",e=>{if(e.target.matches("input,select,button"))return;if(mode==="study"){if(e.code==="Space"){e.preventDefault();$("card")?.click();}if(e.key==="ArrowRight")next();if(e.key==="ArrowLeft")prev();}else if(mode==="quiz"){if("1234".includes(e.key))answerQuiz(["A","B","C","D"][+e.key-1]);if(e.key==="ArrowRight")next();}});
init();
})();
