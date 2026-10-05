/* Plate Count — Tenfold Method client portal app.
   Local-first: everything saves on the device instantly and syncs to Supabase
   (plate_days / plate_profile, row-level security per user) when online. */
(function(){
"use strict";

var ADMIN_EMAIL = "tenfoldfunctional@gmail.com";
var DEV = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]dev=1/.test(location.search);
var FOODS = window.FOODS || [];
var MEALS = ["Breakfast","Lunch","Dinner","Snacks"];
var DEF_TARGETS = {k:2100,p:140,c:258,f:56};
var uid = null, userEmail = "";

/* ================= tiny helpers ================= */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function pad(n){ return n<10?"0"+n:""+n; }
function keyOf(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function todayKey(){ return keyOf(new Date()); }
function parseKey(k){ var p=k.split("-"); return new Date(+p[0],+p[1]-1,+p[2]); }
function shiftKey(k,n){ var d=parseKey(k); d.setDate(d.getDate()+n); return keyOf(d); }
function daysBetween(a,b){ var pa=a.split("-"),pb=b.split("-"); return Math.round((Date.UTC(+pb[0],+pb[1]-1,+pb[2])-Date.UTC(+pa[0],+pa[1]-1,+pa[2]))/86400000); }
function wdIndex(k){ return (parseKey(k).getDay()+6)%7; }
function mondayOf(k){ return shiftKey(k,-wdIndex(k)); }
function prettyDate(k,opt){ return parseKey(k).toLocaleDateString(undefined,opt||{weekday:"long",month:"short",day:"numeric"}); }
function r0(n){ return Math.round(n); }
function r1(n){ return Math.round(n*10)/10; }
function slug(x){ return String(x).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function num(v){ var n=parseFloat(v); return isNaN(n)?null:n; }
function safe(fn){ try{ fn(); }catch(e){ console.error(e); showErr(e); } }
var errTimer=0;
function showErr(e){
  var t=$("toast"); t.innerHTML="<span>Something went wrong: "+esc((e&&e.message)||e)+"</span><button type='button' id='toastX'>OK</button>";
  t.hidden=false; $("toastX").onclick=function(){t.hidden=true;};
  clearTimeout(errTimer); errTimer=setTimeout(function(){t.hidden=true;},8000);
}
window.addEventListener("unhandledrejection",function(ev){ console.error(ev.reason); });

/* ================= state ================= */
var S = {
  date: todayKey(), tab: "fuel",
  days: {}, normalized: {},
  profile: {targets:Object.assign({},DEF_TARGETS), programStart:"2026-09-14", programIdx:0, plyoLevel:0, custom:[], updatedAt:0},
  openEx: null, dirty:{days:{},profile:false}, pulled:false, syncOff:false
};

function normDay(d){
  if(!d||typeof d!=="object") d={};
  var out={entries:[],weight:null,sets:{},period:!!d.period,updatedAt:+d.updatedAt||0,exSwaps:{},wd:null,cardio:{done:false,miles:null,minutes:null}};
  (Array.isArray(d.entries)?d.entries:[]).forEach(function(e){
    if(!e||typeof e!=="object") return;
    out.entries.push({name:String(e.name==null?"":e.name),amt:String(e.amt==null?"":e.amt),
      meal:MEALS.indexOf(e.meal)<0?"Snacks":e.meal,k:+e.k||0,p:+e.p||0,c:+e.c||0,f:+e.f||0});
  });
  if(d.sets&&typeof d.sets==="object") Object.keys(d.sets).forEach(function(kk){
    var v=d.sets[kk]; if(v&&typeof v==="object") out.sets[kk]={w:v.w==null?null:v.w,reps:v.reps==null?null:v.reps,done:!!v.done};
  });
  if(d.weight!=null&&d.weight!==""){ var w=parseFloat(d.weight); if(!isNaN(w)) out.weight=w; }
  if(d.exSwaps&&typeof d.exSwaps==="object") Object.keys(d.exSwaps).forEach(function(kk){ if(typeof d.exSwaps[kk]==="string") out.exSwaps[kk]=d.exSwaps[kk]; });
  /* Paired exercises from the original app: kept as-is so no logged data is ever lost. */
  out.pairs={};
  if(d.pairs&&typeof d.pairs==="object") Object.keys(d.pairs).forEach(function(kk){
    var v=d.pairs[kk]; if(v&&typeof v==="object"&&typeof v.n==="string") out.pairs[kk]={n:v.n,bodyPart:typeof v.bodyPart==="string"?v.bodyPart:""};
  });
  if(typeof d.wd==="number"&&d.wd>=0&&d.wd<7) out.wd=d.wd;
  if(d.cardio&&typeof d.cardio==="object"){
    out.cardio.done=!!d.cardio.done; out.cardio.miles=num(d.cardio.miles); out.cardio.minutes=num(d.cardio.minutes);
  }
  return out;
}
/* A date's object is normalized once, then stays the same object, so edits made
   anywhere are always what gets saved. */
function day(k){
  if(!S.days[k]||!S.normalized[k]){ S.days[k]=normDay(S.days[k]); S.normalized[k]=true; }
  return S.days[k];
}
function cur(){ return day(S.date); }

/* ================= local save + cloud sync ================= */
function lsKey(){ return "platecount2:"+uid; }
function lsSave(){
  try{ localStorage.setItem(lsKey(),JSON.stringify({d:S.days,p:S.profile,dirty:S.dirty})); }catch(e){}
}
function lsLoad(){
  try{
    var o=JSON.parse(localStorage.getItem(lsKey())||"null"); if(!o) return;
    if(o.d) Object.keys(o.d).forEach(function(k){ if(/^\d{4}-\d{2}-\d{2}$/.test(k)) S.days[k]=normDay(o.d[k]); });
    if(o.p) mergeProfile(o.p,true);
    if(o.dirty&&o.dirty.days) S.dirty=o.dirty;
  }catch(e){}
}
function mergeProfile(p,force){
  if(!p||typeof p!=="object") return;
  if(!force&&(+p.updatedAt||0)<=(S.profile.updatedAt||0)){
    /* keep ours, but never lose custom foods that exist only on the other side */
    unionCustom(p.custom); return;
  }
  var t=p.targets||{}, d=S.profile;
  d.targets={k:+t.k||DEF_TARGETS.k,p:+t.p||DEF_TARGETS.p,c:+t.c||DEF_TARGETS.c,f:+t.f||DEF_TARGETS.f};
  if(/^\d{4}-\d{2}-\d{2}$/.test(p.programStart)) d.programStart=p.programStart;
  if(typeof p.programIdx==="number") d.programIdx=p.programIdx;
  if(typeof p.plyoLevel==="number") d.plyoLevel=p.plyoLevel;
  d.updatedAt=+p.updatedAt||0;
  unionCustom(p.custom);
}
function unionCustom(list){
  if(!Array.isArray(list)) return;
  var have={}; S.profile.custom.forEach(function(c){ have[c.n.toLowerCase()]=1; });
  list.forEach(function(c){ if(c&&typeof c.n==="string"&&!have[c.n.toLowerCase()]){ S.profile.custom.push(c); have[c.n.toLowerCase()]=1; } });
  S.profile.custom=S.profile.custom.slice(0,300);
}
var flushTimer=0;
function persistDay(k){
  var d=day(k); d.updatedAt=Date.now(); S.dirty.days[k]=true; lsSave(); queueFlush();
}
function persistProfile(){
  S.profile.updatedAt=Date.now(); S.dirty.profile=true; lsSave(); queueFlush();
}
function queueFlush(){ if(DEV||!uid) return; clearTimeout(flushTimer); flushTimer=setTimeout(flush,900); }
function setSync(state,title){
  var el=$("syncdot"); el.className="syncdot "+state; el.title=title||""; el.setAttribute("aria-label","Sync: "+(title||state));
  var f=$("syncNote"); if(f) f.textContent=title||"";
}
function flush(){
  if(DEV||!uid||S.syncOff||!S.pulled||!navigator.onLine) return Promise.resolve();
  var keys=Object.keys(S.dirty.days), prof=S.dirty.profile;
  if(!keys.length&&!prof) return Promise.resolve();
  setSync("busy","Saving…");
  var jobs=[];
  if(keys.length){
    var rows=keys.map(function(k){ return {user_id:uid,day:k,data:JSON.parse(JSON.stringify(day(k))),updated_at:new Date().toISOString()}; });
    jobs.push(supabaseClient.from("plate_days").upsert(rows,{onConflict:"user_id,day"}).then(function(r){
      if(r.error) throw r.error; keys.forEach(function(k){ delete S.dirty.days[k]; });
    }));
  }
  if(prof){
    jobs.push(supabaseClient.from("plate_profile").upsert({user_id:uid,data:JSON.parse(JSON.stringify(S.profile)),updated_at:new Date().toISOString()},{onConflict:"user_id"}).then(function(r){
      if(r.error) throw r.error; S.dirty.profile=false;
    }));
  }
  return Promise.all(jobs).then(function(){ lsSave(); setSync("ok","Synced"); }).catch(function(e){
    console.warn("sync failed",e); setSync("off","Saved on this device — will sync when connected");
  });
}
function setScore(v){ return (v&&v.w!=null?1:0)+(v&&v.reps!=null?1:0)+(v&&v.done?1:0); }
function mergeSets(a,b){
  var out={}; a=a||{}; b=b||{};
  Object.keys(a).concat(Object.keys(b)).forEach(function(k){
    if(k in out) return; var av=a[k], bv=b[k];
    out[k]= !av?bv : !bv?av : (setScore(bv)>=setScore(av)?bv:av);
  });
  return out;
}
function acceptIncoming(k,data){
  var inc=normDay(data), ex=S.days[k];
  if(!ex){ S.days[k]=inc; S.normalized[k]=true; return; }
  ex=day(k);
  var newer=inc.updatedAt>(ex.updatedAt||0), win=newer?inc:ex;
  win.sets=mergeSets(ex.sets,inc.sets);
  if(!win.entries.length){
    if(newer&&ex.entries.length) win.entries=ex.entries; else if(!newer&&inc.entries.length) win.entries=inc.entries;
  }
  S.days[k]=win; S.normalized[k]=true;
}
function pull(){
  if(DEV||!uid) { S.pulled=true; return Promise.resolve(); }
  setSync("busy","Syncing…");
  return Promise.all([
    supabaseClient.from("plate_days").select("day,data").order("day",{ascending:false}).limit(400),
    supabaseClient.from("plate_profile").select("data").maybeSingle()
  ]).then(function(res){
    var dr=res[0], pr=res[1];
    var missing=function(e){ return e&&(e.code==="42P01"||e.code==="PGRST205"||/does not exist|schema cache/i.test(e.message||"")); };
    if(missing(dr.error)||missing(pr.error)){ S.syncOff=true; S.pulled=true; setSync("off","Saved on this device (sync not set up yet)"); return; }
    if(dr.error||pr.error) throw (dr.error||pr.error);
    (dr.data||[]).forEach(function(row){ if(row&&/^\d{4}-\d{2}-\d{2}$/.test(row.day)) acceptIncoming(row.day,row.data); });
    if(pr.data&&pr.data.data) mergeProfile(pr.data.data,false); else S.dirty.profile=true;
    S.pulled=true; lsSave(); softRender(); return flush();
  }).catch(function(e){
    console.warn("pull failed",e); setSync("off","Offline — saved on this device");
  });
}
window.addEventListener("online",function(){ (S.pulled?flush():pull()); });

/* ================= programs ================= */
var PROGRAMS=[];
(window.PHASES||[]).forEach(function(ph){ PROGRAMS.push({id:ph.id,name:ph.name,sub:ph.sub,note:ph.note,phase:ph,metric:{label:"Weight",ph:"lb"},days:(window.DAYS||[])}); });
PROGRAMS.push({
  id:"plyo1",name:"Plyo 1",note:"Warm up first with a complete dynamic or hurdle warm-up. 20 to 30 seconds rest between sets.",
  metric:{label:"Box / load",ph:"in or lb"},levels:[{name:"Level 1",s:2,r:"3"},{name:"Level 2",s:2,r:"5"}],
  days:[{name:"Plyo 1",title:"Plyo 1",ex:[
    {n:"Squat Jump Pause",cue:"Pause in the bottom, then jump. No countermovement out of the pause."},
    {n:"Tuck Jump",cue:"Knees to chest, land quietly."},
    {n:"Power Step Up",cue:"Drive through the top leg, full hip extension."},
    {n:"Relaxed Box Jump",cue:"Relaxed take-off. Land soft, do not crash the landing."},
    {n:"Speed Skater For Distance",cue:"Lateral bound for distance. Can be done with or without the boxes, on the ground."}]}]
},{
  id:"shock",name:"Total Body Shock",
  note:"Do this before strength or conditioning work, never after. Emphasize RESISTING the impact, not absorbing it. Two rounds through the five. 20 to 30 seconds rest between depth drop reps.",
  metric:{label:"Box / load",ph:"in or lb"},
  days:[{name:"Two rounds",title:"Two rounds",ex:[
    {n:"Depth Drop",s:2,r:"3",cue:"Round 1 and round 2. Rest 20 to 30 seconds between reps."},
    {n:"Clap Push Up",s:2,r:"5",cue:"Stiff through the trunk. Catch and resist."},
    {n:"Bicep Curl Shock",s:2,r:"5",cue:"Absorb the drop with the elbow flexors, then reverse it fast."},
    {n:"Speed Glute Ham Drops",s:2,r:"5",cue:"Resist the fall, do not free-fall into it."},
    {n:"Pull Up Drop",s:2,r:"5",cue:"Catch at the top position and resist the drop."}]}]
});
var DEF_FOCUS={ph1:"h",ph2:"h",ph3:"s",ph4:"h",ph5:"s",ph6:"s"};
function program(){ return PROGRAMS[S.profile.programIdx]||PROGRAMS[0]; }

/* Phase and week are COMPUTED from one fixed start date. */
function programPos(dateKey){
  var elapsed=Math.max(0,daysBetween(S.profile.programStart,dateKey)), weeksIn=Math.floor(elapsed/7), acc=0, last=0;
  for(var i=0;i<PROGRAMS.length;i++){
    if(!PROGRAMS[i].phase) break; last=i;
    var wk=PROGRAMS[i].phase.weeks||4;
    if(weeksIn<acc+wk) return {idx:i,week:weeksIn-acc+1,weeks:wk,done:false};
    acc+=wk;
  }
  var w=PROGRAMS[last].phase.weeks||4; return {idx:last,week:w,weeks:w,done:true};
}
function sameTargets(a,b){ return a&&b&&a.k===b.k&&a.p===b.p&&a.c===b.c&&a.f===b.f; }
function maybeAdvance(){
  var cp=PROGRAMS[S.profile.programIdx]; if(!cp||!cp.phase) return;
  var pos=programPos(todayKey()); if(pos.idx===S.profile.programIdx) return;
  var prevIdx=S.profile.programIdx, prevT=Object.assign({},S.profile.targets);
  var from=cp.phase, to=PROGRAMS[pos.idx].phase;
  S.profile.programIdx=pos.idx;
  var retarget=to.targets&&!sameTargets(from.targets,to.targets);
  if(retarget) S.profile.targets={k:to.targets.k,p:to.targets.p,c:to.targets.c,f:to.targets.f};
  persistProfile(); softRender();
  toast("Moved to "+PROGRAMS[pos.idx].name+(retarget?" — targets now "+S.profile.targets.k+" kcal":""),"Undo",function(){
    S.profile.programIdx=prevIdx; S.profile.targets=prevT; persistProfile(); renderAll();
  });
}
function workoutIdx(k){ var d=day(k); return d.wd!=null?d.wd:wdIndex(k); }

/* ================= toast, sheet, rest timer ================= */
var toastTimer=0;
function toast(msg,label,fn){
  var t=$("toast"); clearTimeout(toastTimer);
  t.innerHTML="<span>"+esc(msg)+"</span>"+(label?"<button type='button' id='toastBtn'>"+esc(label)+"</button>":"");
  t.hidden=false;
  if(label) $("toastBtn").onclick=function(){ clearTimeout(toastTimer); t.hidden=true; fn&&fn(); };
  toastTimer=setTimeout(function(){ t.hidden=true; },label?5500:2200);
}
var sheetBack=null;
function openSheet(title,body,foot){
  $("shTitle").textContent=title; $("shBody").innerHTML=body;
  var f=$("shFoot"); if(foot){ f.innerHTML=foot; f.hidden=false; } else { f.innerHTML=""; f.hidden=true; }
  $("scrim").hidden=false; $("shBody").scrollTop=0;
}
function closeSheet(){ $("scrim").hidden=true; $("shBody").innerHTML=""; $("shFoot").innerHTML=""; sheetBack=null; renderAll(); }
$("shClose").onclick=closeSheet;
$("scrim").onclick=function(e){ if(e.target===$("scrim")) closeSheet(); };
document.addEventListener("keydown",function(e){ if(e.key==="Escape"&&!$("scrim").hidden) closeSheet(); });

var rest={end:0,timer:0};
function parseRest(s){
  var n=(String(s||"").match(/\d+/g)||[]).map(Number); if(!n.length) return 90;
  var v=n.length>1?(n[0]+n[1])/2:n[0]; return /min/i.test(s)?v*60:v;
}
function startRest(sec){
  if(!sec) return; rest.end=Date.now()+sec*1000; clearInterval(rest.timer);
  rest.timer=setInterval(tickRest,500); tickRest();
}
function tickRest(){
  var p=$("restpill"), left=Math.ceil((rest.end-Date.now())/1000);
  if(left<=0){ clearInterval(rest.timer); p.hidden=true; try{ navigator.vibrate&&navigator.vibrate([200,100,200]); }catch(e){} return; }
  p.hidden=false; p.innerHTML="<span class='sr'>Rest</span><b>"+Math.floor(left/60)+":"+pad(left%60)+"</b><button type='button' id='restSkip'>Skip</button>";
  $("restSkip").onclick=function(){ clearInterval(rest.timer); p.hidden=true; };
}

/* ================= totals + burn ================= */
function totals(k){ var t={k:0,p:0,c:0,f:0}; day(k).entries.forEach(function(e){ t.k+=e.k;t.p+=e.p;t.c+=e.c;t.f+=e.f; }); return t; }
var MET_CARDIO=6.5, MET_LIFT=5, MIN_PER_SET=2.5;
function lastWeightLb(){
  var ks=Object.keys(S.days).filter(function(k){ return S.days[k]&&S.days[k].weight!=null; }).sort();
  return ks.length?S.days[ks[ks.length-1]].weight:150;
}
function kcalMET(met,min,kg){ return met*3.5*kg/200*min; }
function estBurn(k){
  var d=day(k), kg=lastWeightLb()/2.20462, burn=0, c=d.cardio, sets=0;
  if(c&&c.minutes) burn+=kcalMET(MET_CARDIO,c.minutes,kg);
  Object.keys(d.sets).forEach(function(x){ if(d.sets[x].done) sets++; });
  if(sets) burn+=kcalMET(MET_LIFT,sets*MIN_PER_SET,kg);
  return {kcal:burn,cardioMin:(c&&c.minutes)||0,sets:sets};
}
function hasActivity(k){
  var d=S.days[k]; if(!d) return false;
  if(d.entries&&d.entries.length) return true;
  if(d.cardio&&(d.cardio.done||d.cardio.minutes)) return true;
  return Object.keys(d.sets||{}).some(function(x){ return d.sets[x].done; });
}

/* ================= week strip ================= */
function renderWeek(){
  var mon=mondayOf(S.date), t=todayKey(), h="";
  var L=["M","T","W","T","F","S","S"];
  h+="<button class='wk-nav' id='wkPrev' aria-label='Previous week'>&#8249;</button>";
  for(var i=0;i<7;i++){
    var k=shiftKey(mon,i), fut=k>t;
    h+="<button class='wk-day"+(k===t?" today":"")+(hasActivity(k)?" has":"")+"' data-k='"+k+"' aria-pressed='"+(k===S.date)+"' "+(fut?"disabled":"")+
       " aria-label='"+esc(prettyDate(k))+"'><span class='l'>"+L[i]+"</span><span class='n'>"+parseKey(k).getDate()+"</span><span class='pip'></span></button>";
  }
  h+="<button class='wk-nav' id='wkNext' aria-label='Next week'"+(shiftKey(mon,7)>t?" disabled":"")+">&#8250;</button>";
  $("week").innerHTML=h;
  $("subtitle").textContent=(S.date===t?"Today · ":"")+prettyDate(S.date,{weekday:"short",month:"short",day:"numeric"});
  $("week").querySelectorAll(".wk-day").forEach(function(b){ b.onclick=function(){ gotoDate(b.dataset.k); }; });
  $("wkPrev").onclick=function(){ gotoDate(shiftKey(S.date,-7)); };
  $("wkNext").onclick=function(){ var n=shiftKey(S.date,7); gotoDate(n>t?t:n); };
}
function gotoDate(k){
  var a=document.activeElement; if(a&&a!==document.body&&a.blur) a.blur();
  S.date=k; S.openEx=null; renderAll(); window.scrollTo(0,0);
}

/* ================= orchestration ================= */
var TABS=["fuel","train","trend"];
function renderActive(){
  if(S.tab==="fuel") safe(renderFuel); else if(S.tab==="train") safe(renderTrain); else safe(renderTrend);
}
function renderAll(){ safe(renderWeek); renderActive(); }
/* A background sync must never rebuild a screen out from under a field you are typing in. */
var softQueued=false;
function typing(){ var a=document.activeElement; return !!(a&&a.tagName==="INPUT"&&a.closest&&a.closest("main"))||!$("scrim").hidden; }
function softRender(){ if(typing()){ softQueued=true; return; } renderAll(); }
document.addEventListener("focusout",function(){ setTimeout(function(){ if(softQueued&&!typing()){ softQueued=false; renderAll(); } },0); });
TABS.forEach(function(id){
  $("tab-"+id).onclick=function(){
    S.tab=id;
    TABS.forEach(function(o){ $("tab-"+o).setAttribute("aria-selected",o===id?"true":"false"); $("panel-"+o).hidden=(o!==id); });
    renderActive(); window.scrollTo(0,0);
  };
});

/* ================= FUEL ================= */
function statusMsg(t,burn){
  var target=S.profile.targets.k, net=t.k-burn.kcal, diff=net-target, pLeft=S.profile.targets.p-t.p;
  var block=(program().phase&&program().phase.block)||"build";
  var dt=diff===0?"On target":(diff>0?"+"+r0(diff)+" kcal over":"−"+r0(-diff)+" kcal under");
  if(t.k===0) return {cls:"mid",msg:"Nothing logged yet. Today's target is "+target+" kcal and "+S.profile.targets.p+" g protein."};
  var pm=pLeft>12?r0(pLeft)+" g of protein left to cover.":"Protein is covered.";
  if(block==="cut"){
    if(diff>150) return {cls:"warn",msg:dt+" against your cut target. A surplus is what stalls a cut — bring the rest of today down if you can."};
    if(diff>-600) return {cls:"ok",msg:dt+" against target. "+pm};
    return {cls:"warn",msg:dt+" — steeper than the plan calls for. Eat some of it back tomorrow to protect your muscle."};
  }
  if(diff<-250) return {cls:"warn",msg:dt+" — "+r0(-diff)+" kcal and "+Math.max(0,r0(pLeft))+" g protein still to go. Falling short again and again is what turns a building phase into maintenance."};
  if(diff<=400) return {cls:"ok",msg:dt+" against target. "+pm};
  return {cls:"ok",msg:dt+". Read the weekly average, not any single day."};
}
function renderFuel(){
  var k=S.date, d=cur(), T=S.profile.targets, t=totals(k), burn=estBurn(k);
  var net=t.k-burn.kcal, left=T.k-net, pct=T.k>0?Math.max(0,net)/T.k:0, C=2*Math.PI*56;
  var st=statusMsg(t,burn), sub="";
  if(burn.kcal>1){
    var bp=[]; if(burn.cardioMin) bp.push(r0(burn.cardioMin)+" min cardio"); if(burn.sets) bp.push(burn.sets+" set"+(burn.sets===1?"":"s"));
    sub="<span class='sub'>"+r0(t.k)+" eaten − ~"+r0(burn.kcal)+" burned ("+bp.join(" + ")+") = "+r0(net)+" net</span>";
  }
  function mac(cls,label,v,tg){
    var p=tg>0?Math.min(100,v/tg*100):0;
    return "<div class='mac "+cls+"'><div class='row1'><span>"+label+"</span><span><b>"+r0(v)+"</b> / "+r0(tg)+" g</span></div><div class='bar'><i style='width:"+p.toFixed(1)+"%'></i></div></div>";
  }
  var h="<div class='card'><div class='hero'>"+
    "<div class='ring'><svg viewBox='0 0 132 132' aria-hidden='true'><circle class='trk' cx='66' cy='66' r='56' fill='none' stroke-width='12'/>"+
    "<circle class='val' cx='66' cy='66' r='56' fill='none' stroke-width='12' stroke-linecap='round' stroke-dasharray='"+C.toFixed(1)+"' stroke-dashoffset='"+(C*(1-Math.min(pct,1))).toFixed(1)+"'/></svg>"+
    "<div class='mid'><div class='big'>"+(left>=0?r0(left).toLocaleString():"+"+r0(-left).toLocaleString())+"</div><div class='cap'>"+(left>=0?"kcal left":"kcal over")+"</div></div></div>"+
    "<div class='macros'>"+mac("p","Protein",t.p,T.p)+mac("c","Carbs",t.c,T.c)+mac("f","Fat",t.f,T.f)+"</div></div>"+
    "<div class='note "+st.cls+"'>"+esc(st.msg)+sub+"</div></div>";
  MEALS.forEach(function(mn){
    var items=d.entries.filter(function(e){ return e.meal===mn; }), kc=items.reduce(function(a,e){ return a+e.k; },0);
    h+="<section class='meal'><div class='meal-h'><h2 class='h2'>"+mn+"</h2>"+(items.length?"<span class='kc'>"+r0(kc)+" kcal</span>":"")+
       "<button class='addbtn' data-meal='"+mn+"' aria-label='Add food to "+mn+"'>+ Add</button></div><div class='entries'>";
    if(!items.length) h+="<div class='empty-meal'>Nothing logged.</div>";
    items.forEach(function(e){
      var i=d.entries.indexOf(e);
      h+="<div class='entry'><div><div class='nm'>"+esc(e.name)+"</div><div class='am'>"+esc(e.amt)+"</div></div>"+
         "<div class='mc'><b>"+r0(e.k)+"</b>"+r0(e.p)+"p · "+r0(e.c)+"c · "+r0(e.f)+"f</div>"+
         "<button class='del' data-i='"+i+"' aria-label='Remove "+esc(e.name)+"'>&times;</button></div>";
    });
    h+="</div></section>";
  });
  h+="<p class='foot'>Database values are USDA-derived. Barcode matches also draw on <a href='https://www.opennutrition.app' target='_blank' rel='noopener'>OpenNutrition</a> and <a href='https://world.openfoodfacts.org' target='_blank' rel='noopener'>Open Food Facts</a> contributors (ODbL). Photo and text estimates are approximate.</p>";
  var p=$("panel-fuel"); p.innerHTML=h;
  p.querySelectorAll(".addbtn").forEach(function(b){ b.onclick=function(){ openAdd(b.dataset.meal); }; });
  p.querySelectorAll(".del").forEach(function(b){
    b.onclick=function(){
      var i=+b.dataset.i, k2=S.date, e=day(k2).entries[i]; day(k2).entries.splice(i,1); persistDay(k2); renderFuel(); renderWeek();
      toast("Removed “"+e.name+"”","Undo",function(){ var a=day(k2).entries; a.splice(Math.min(i,a.length),0,e); persistDay(k2); if(S.date===k2){ renderFuel(); renderWeek(); } });
    };
  });
}
function logEntry(o){ var k=S.date; day(k).entries.push(o); persistDay(k); }

/* ---- search ---- */
function escRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
function searchFoods(q){
  q=q.toLowerCase().trim(); if(q.length<2) return [];
  var terms=q.split(/\s+/), out=[], wre=new RegExp("\\b"+escRe(q));
  for(var i=0;i<FOODS.length;i++){
    var f=FOODS[i], name=f.n.toLowerCase(), al=f.a||[], s=-1;
    if(name===q) s=1000; else if(al.indexOf(q)>-1) s=950; else if(name.indexOf(q)===0) s=800;
    else if(al.some(function(a){ return a.indexOf(q)===0; })) s=740; else if(wre.test(name)) s=600;
    else if(terms.every(function(t){ return name.indexOf(t)>-1; })) s=300; else continue;
    if(f.k) s+=130; s-=Math.min(name.length,70)*0.5; s-=(name.split(",").length-1)*9; out.push([s,f]);
  }
  out.sort(function(a,b){ return b[0]-a[0]; });
  return out.slice(0,40).map(function(x){ return x[1]; });
}
function customAsFood(c){ return {n:c.n,c:c.c,p:c.p,cb:c.cb,f:c.f,serving:c.sl||"1 serving",custom:true}; }
function saveCustom(name,amount,m,upc){
  var C=S.profile.custom, id=name.toLowerCase();
  for(var i=0;i<C.length;i++) if(C[i].n.toLowerCase()===id){ if(upc&&!C[i].upc){ C[i].upc=upc; persistProfile(); } return; }
  var rec={n:name,sl:amount||"1 serving",c:m.k,p:m.p,cb:m.c,f:m.f}; if(upc) rec.upc=upc;
  C.unshift(rec); S.profile.custom=C.slice(0,300); persistProfile();
}
function normUPC(s){ s=String(s||"").replace(/\D/g,"").replace(/^0+/,""); return s||"0"; }
function findByUPC(code){
  var n=normUPC(code), i, C=S.profile.custom;
  for(i=0;i<C.length;i++) if(C[i].upc&&normUPC(C[i].upc)===n) return customAsFood(C[i]);
  for(i=0;i<FOODS.length;i++) if(FOODS[i].upc&&normUPC(FOODS[i].upc)===n) return FOODS[i];
  return null;
}
var shardCache={};
function loadShard(n){
  var d=n.charAt(0); if(!/^[0-9]$/.test(d)) d="0"; var file="barcodes-"+d+".json";
  if(!shardCache[file]) shardCache[file]=fetch(file).then(function(r){ return r.ok?r.json():[]; }).catch(function(){ return []; });
  return shardCache[file];
}
function findByUPCRemote(code){
  var n=normUPC(code);
  return loadShard(n).then(function(list){
    for(var i=0;i<list.length;i++) if(normUPC(list[i][0])===n){
      var r=list[i], s=[["100 g",100]]; if(r[7]&&Math.round(r[7])!==100) s.unshift([r[6],r[7]]);
      return {n:r[1],c:r[2],p:r[3],cb:r[4],f:r[5],s:s,upc:r[0]};
    }
    return null;
  });
}
function recentEntries(){
  var seen={}, out=[];
  for(var i=0;i<28;i++){
    var d=S.days[shiftKey(todayKey(),-i)]; if(!d) continue;
    d.entries.slice().reverse().forEach(function(e){
      var id=e.name+"|"+e.amt; if(seen[id]){ seen[id].n++; return; } seen[id]={n:1}; out.push({e:e,id:id});
    });
  }
  out.forEach(function(o){ o.n=seen[o.id].n; }); out.sort(function(a,b){ return b.n-a.n; });
  return out.slice(0,12).map(function(o){ return o.e; });
}

/* ---- add-food sheet (meal is fixed by the button you tapped) ---- */
var AS={meal:"Snacks",added:[],query:""};
function openAdd(meal,keep){
  if(!keep){ AS.meal=meal; AS.added=[]; AS.query=""; }
  /* "Recent" is built from what this client actually eats. The bundled foods.js carries a
     personal "daily" flag from the original single-user build; it is deliberately ignored. */
  var daily=[], rec=recentEntries();
  var body="<div class='searchbar'><input class='field' id='q' type='search' placeholder='Search foods…' autocomplete='off' value='"+esc(AS.query)+"' aria-label='Search foods'>"+
    "<button class='iconbtn' id='scanBtn' aria-label='Scan a barcode'><svg viewBox='0 0 24 24'><path d='M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2M7 8v8M10 8v8M12.5 8v8M15 8v8M17.5 8v8'/></svg></button></div>"+
    "<div class='chips scroll' style='margin-top:10px'><button class='chip' id='photoBtn'>Photo of label or meal</button><button class='chip' id='descBtn'>Describe it</button><button class='chip' id='customBtn'>Enter macros</button></div>"+
    "<p class='added' id='addedLine' "+(AS.added.length?"":"hidden")+">"+(AS.added.length?"Added: "+AS.added.map(function(e){ return esc(e.name); }).join(", "):"")+"</p>"+
    "<div id='results'></div>";
  openSheet("Add to "+AS.meal,body,"<button class='btn' id='doneBtn'>Done"+(AS.added.length?" ("+AS.added.length+" added)":"")+"</button>");
  $("doneBtn").onclick=closeSheet;
  var q=$("q"), res=$("results");
  function quickAdd(entry){ entry.meal=AS.meal; logEntry(entry); AS.added.push(entry); openAdd(AS.meal,true); }
  function run(){
    var v=q.value.trim(); AS.query=q.value;
    if(!v){
      var h="";
      if(daily.length){
        h+="<p class='eyebrow' style='margin:16px 0 8px'>Daily — one tap</p><div class='list'>"+daily.map(function(f,i){
          return "<button class='item' data-d='"+i+"'><span class='t'>"+esc(f.sn||f.n)+"<small>"+esc(f.s[0][0])+" · "+r0(f.c*f.s[0][1]/100)+" kcal</small></span><span class='plus'>+</span></button>"; }).join("")+"</div>";
      }
      if(rec.length){
        h+="<p class='eyebrow' style='margin:16px 0 8px'>Recent — tap to log again</p><div class='list'>"+rec.map(function(e,i){
          return "<button class='item' data-r='"+i+"'><span class='t'>"+esc(e.name)+"<small>"+esc(e.amt)+" · "+r0(e.k)+" kcal</small></span><span class='plus'>+</span></button>"; }).join("")+"</div>";
      }
      if(!h) h="<p class='muted small' style='margin-top:16px'>Search above, scan a barcode, or enter macros by hand.</p>";
      res.innerHTML=h;
      res.querySelectorAll("[data-d]").forEach(function(b){ b.onclick=function(){
        var f=daily[+b.dataset.d], g=f.s[0][1], m=g/100; quickAdd({name:f.n,amt:f.s[0][0],k:f.c*m,p:f.p*m,c:f.cb*m,f:f.f*m}); }; });
      res.querySelectorAll("[data-r]").forEach(function(b){ b.onclick=function(){
        var e=rec[+b.dataset.r]; quickAdd({name:e.name,amt:e.amt,k:e.k,p:e.p,c:e.c,f:e.f}); }; });
      return;
    }
    if(!FOODS.length){ res.innerHTML="<p class='err'>The food database did not load. Check your connection and reopen the app.</p>"; return; }
    var mine=S.profile.custom.filter(function(c){ return c.n.toLowerCase().indexOf(v.toLowerCase())>-1; }).map(customAsFood);
    var list=mine.concat(searchFoods(v)).slice(0,40);
    if(!list.length){ res.innerHTML="<p class='muted small' style='margin-top:14px'>No match. Try <b>Describe it</b> or <b>Enter macros</b>.</p>"; return; }
    res.innerHTML="<div class='list'>"+list.map(function(f,i){
      return "<button class='item' data-i='"+i+"'><span class='t'>"+esc(f.n)+"<small>"+r0(f.c)+" kcal · "+r1(f.p)+"p "+r1(f.cb)+"c "+r1(f.f)+"f "+(f.custom?"per serving":"per 100 g")+"</small></span><span class='plus'>›</span></button>"; }).join("")+"</div>";
    res.querySelectorAll(".item").forEach(function(b){ b.onclick=function(){ openPortion(list[+b.dataset.i],function(entry){ AS.added.push(entry); openAdd(AS.meal,true); }); }; });
  }
  q.oninput=run; run();
  if(!keep) setTimeout(function(){ q.focus(); },60);
  $("scanBtn").onclick=function(){ startScan(); };
  $("photoBtn").onclick=function(){ $("photoInput").click(); };
  $("descBtn").onclick=openDescribe;
  $("customBtn").onclick=function(){ openManual(null); };
}
function openPortion(f,onAdded){
  var isC=!!f.custom, ps=isC?[["1 serving",1],["½",0.5],["1½",1.5],["2",2]]:(f.s||[["100 g",100]]), unit=isC?"servings":"grams", base=ps[0][1], step=isC?0.5:10;
  var body=(isC?"<p class='muted small'>Saved from a label — "+esc(f.serving)+" per serving.</p>":"")+
    (f.note?"<p class='note mid'>"+esc(f.note)+"</p>":"")+
    "<div class='chips' id='pchips'>"+ps.map(function(p,i){ return "<button class='chip' data-g='"+p[1]+"' aria-pressed='"+(i===0)+"'>"+esc(p[0])+"</button>"; }).join("")+"</div>"+
    "<div class='stepper'><button id='mn' aria-label='Less'>−</button><input class='field' id='gm' type='number' inputmode='decimal' value='"+base+"' aria-label='Amount in "+unit+"'><button id='pl' aria-label='More'>+</button></div>"+
    "<p class='eyebrow' style='text-align:center;margin:0'>"+unit+"</p><div id='pv' style='text-align:center'></div>";
  openSheet(f.n,body,"<button class='btn ghost' id='bk' style='flex:0 0 38%'>Back</button><button class='btn' id='padd'>Add to "+esc(AS.meal)+"</button>");
  var gm=$("gm");
  function calc(){
    var n=num(gm.value)||0, m=isC?n:n/100, o={k:f.c*m,p:f.p*m,c:f.cb*m,f:f.f*m};
    $("pv").innerHTML="<div class='preview'>"+r0(o.k)+" kcal</div><p class='preview-sub'>"+r1(o.p)+" g protein · "+r1(o.c)+" g carbs · "+r1(o.f)+" g fat</p>"; return o;
  }
  $("pchips").querySelectorAll(".chip").forEach(function(c){ c.onclick=function(){
    $("pchips").querySelectorAll(".chip").forEach(function(o){ o.setAttribute("aria-pressed","false"); }); c.setAttribute("aria-pressed","true"); gm.value=c.dataset.g; calc(); }; });
  $("mn").onclick=function(){ gm.value=Math.max(0,(num(gm.value)||0)-step); calc(); };
  $("pl").onclick=function(){ gm.value=(num(gm.value)||0)+step; calc(); };
  gm.oninput=calc; calc();
  $("bk").onclick=function(){ openAdd(AS.meal,true); };
  $("padd").onclick=function(){
    var o=calc(), n=num(gm.value)||0, amt=isC?(n===1?f.serving:n+" × "+f.serving):r0(n)+" g";
    var e={name:f.n,amt:amt,meal:AS.meal,k:o.k,p:o.p,c:o.c,f:o.f}; logEntry(e); onAdded(e);
  };
}
function openManual(prefill,upc){
  prefill=prefill||{};
  openSheet("Enter macros",
    "<input class='field' id='mn' placeholder='Name' style='margin-bottom:8px' value='"+esc(prefill.name||"")+"'>"+
    "<input class='field' id='ms' placeholder='Serving, e.g. 1 cup' value='"+esc(prefill.amt||"")+"'>"+
    "<div class='grid4'><div><label for='mk'>Kcal</label><input id='mk' type='number' inputmode='decimal'></div><div><label for='mp'>Protein</label><input id='mp' type='number' inputmode='decimal'></div>"+
    "<div><label for='mc'>Carbs</label><input id='mc' type='number' inputmode='decimal'></div><div><label for='mf'>Fat</label><input id='mf' type='number' inputmode='decimal'></div></div>"+
    "<p class='muted small'>Saved to your foods so it is one tap next time.</p>",
    "<button class='btn ghost' id='bk' style='flex:0 0 38%'>Back</button><button class='btn' id='msave'>Save &amp; add</button>");
  $("bk").onclick=function(){ openAdd(AS.meal,true); };
  $("msave").onclick=function(){
    var name=$("mn").value.trim()||"Custom food", amt=$("ms").value.trim()||"1 serving";
    var e={name:name,amt:amt,meal:AS.meal,k:num($("mk").value)||0,p:num($("mp").value)||0,c:num($("mc").value)||0,f:num($("mf").value)||0};
    logEntry(e); saveCustom(name,amt,e,upc); AS.added.push(e); openAdd(AS.meal,true);
  };
}

/* ---- barcode scan (photo of a barcode, decoded on-device) ---- */
function startScan(){
  if(!window.Html5Qrcode){ showErr({message:"Scanner library did not load — check your connection."}); return; }
  $("scanInput").click();
}
$("scanInput").onchange=function(e){ var f=e.target.files&&e.target.files[0]; e.target.value=""; if(f) onScanPhoto(f); };
function onScanPhoto(file){
  openSheet("Reading barcode","<p class='muted'><span class='spin'></span>&nbsp; Looking for a barcode in that photo…</p>");
  try{
    var rd=new window.Html5Qrcode("scanRegion",{formatsToSupport:[window.Html5QrcodeSupportedFormats.EAN_13,window.Html5QrcodeSupportedFormats.EAN_8,window.Html5QrcodeSupportedFormats.UPC_A,window.Html5QrcodeSupportedFormats.UPC_E],verbose:false});
    rd.scanFile(file,false).then(function(code){ try{rd.clear();}catch(e){} onBarcode(code); }).catch(function(){
      try{rd.clear();}catch(e){}
      openSheet("No barcode found","<p class='muted'>Try again with the barcode filling more of the frame, in good light, held steady. Or search by name.</p>","<button class='btn' id='rt'>Try another photo</button>");
      $("rt").onclick=startScan;
    });
  }catch(e){ showErr(e); }
}
function afterPortion(entry){
  openSheet("Added","<p class='added'>Added "+esc(entry.name)+" ("+r0(entry.k)+" kcal).</p>","<button class='btn ghost' id='sa' style='flex:1'>Scan another</button><button class='btn' id='sd' style='flex:1'>Done</button>");
  $("sa").onclick=startScan; $("sd").onclick=closeSheet;
}
function onBarcode(code){
  var f=findByUPC(code);
  if(f){ openPortion(f,afterPortion); return; }
  openSheet("Checking database","<p class='muted'><span class='spin'></span>&nbsp; Checking the barcode database…</p>");
  findByUPCRemote(code).then(function(rf){
    if(rf) openPortion(rf,afterPortion);
    else { openManual({name:"",amt:""},code); $("shTitle").textContent="New product"; }
  });
}

/* ---- AI estimates (photo / text) via the estimate-meal edge function ---- */
function estimate(payload){
  return supabaseClient.auth.getSession().then(function(r){
    var tok=r.data&&r.data.session?r.data.session.access_token:SUPABASE_PUBLISHABLE_KEY;
    return fetch(SUPABASE_URL+"/functions/v1/estimate-meal",{method:"POST",
      headers:{"Authorization":"Bearer "+tok,"apikey":SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},body:JSON.stringify(payload)});
  }).then(function(r){ return r.json().then(function(j){ if(!r.ok) throw new Error(j.error||"estimate failed"); return j; }); });
}
function showParsed(items,note){
  if(!items||!items.length){ openSheet("Estimate","<p class='err'>Nothing readable came back. Try again, or enter the macros by hand.</p>","<button class='btn' id='bk'>Back</button>"); $("bk").onclick=function(){ openAdd(AS.meal,true); }; return; }
  var h=(note?"<p class='note mid'>"+esc(note)+"</p>":"");
  items.forEach(function(it,i){
    h+="<div class='card' style='margin-top:8px'><b>"+esc(it.name)+"</b> <span class='muted small'>"+esc(it.amount||"")+"</span>"+
      "<div class='grid4'><div><label for='k"+i+"'>Kcal</label><input id='k"+i+"' type='number' value='"+r0(it.kcal)+"'></div><div><label for='p"+i+"'>Prot</label><input id='p"+i+"' type='number' value='"+r0(it.protein_g)+"'></div>"+
      "<div><label for='c"+i+"'>Carb</label><input id='c"+i+"' type='number' value='"+r0(it.carbs_g)+"'></div><div><label for='f"+i+"'>Fat</label><input id='f"+i+"' type='number' value='"+r0(it.fat_g)+"'></div></div></div>";
  });
  h+="<p class='muted small'>Estimates are approximate (±15% on plated meals). Correct anything that looks off.</p>";
  openSheet("Check the numbers",h,"<button class='btn ghost' id='bk' style='flex:0 0 38%'>Back</button><button class='btn' id='pall'>Add "+items.length+" item"+(items.length>1?"s":"")+"</button>");
  $("bk").onclick=function(){ openAdd(AS.meal,true); };
  $("pall").onclick=function(){
    items.forEach(function(it,i){
      var e={name:it.name,amt:it.amount||"",meal:AS.meal,k:num($("k"+i).value)||0,p:num($("p"+i).value)||0,c:num($("c"+i).value)||0,f:num($("f"+i).value)||0};
      logEntry(e); saveCustom(e.name,e.amt,e); AS.added.push(e);
    }); openAdd(AS.meal,true);
  };
}
function aiError(e){
  openSheet("Couldn’t estimate","<p class='err'>That didn’t go through"+(navigator.onLine?"":" — you appear to be offline")+". Try again, or use search or Enter macros.</p>","<button class='btn' id='bk'>Back</button>");
  $("bk").onclick=function(){ openAdd(AS.meal,true); };
}
function openDescribe(){
  openSheet("Describe it","<textarea class='field' id='dt' placeholder='6 oz grilled salmon, a cup of rice, big salad with olive oil'></textarea><p class='muted small'>Plain English. Portions help: “cup”, “6 oz”, “one medium”.</p>",
    "<button class='btn ghost' id='bk' style='flex:0 0 38%'>Back</button><button class='btn' id='dgo'>Work out macros</button>");
  $("bk").onclick=function(){ openAdd(AS.meal,true); }; $("dt").focus();
  $("dgo").onclick=function(){
    var v=$("dt").value.trim(); if(!v) return;
    openSheet("Working it out","<p class='muted'><span class='spin'></span>&nbsp; Estimating…</p>");
    estimate({text:v}).then(function(r){ showParsed(r.items,r.note); }).catch(aiError);
  };
}
$("photoInput").onchange=function(e){
  var f=e.target.files&&e.target.files[0]; e.target.value=""; if(!f) return;
  openSheet("Reading photo","<p class='muted'><span class='spin'></span>&nbsp; Reading it…</p>");
  var img=new Image(), url=URL.createObjectURL(f);
  img.onload=function(){
    var s=Math.min(1,1280/Math.max(img.width,img.height)), c=document.createElement("canvas");
    c.width=Math.round(img.width*s); c.height=Math.round(img.height*s); c.getContext("2d").drawImage(img,0,0,c.width,c.height);
    URL.revokeObjectURL(url);
    estimate({image:c.toDataURL("image/jpeg",0.8).split(",")[1],mediaType:"image/jpeg"}).then(function(r){ showParsed(r.items,r.note); }).catch(aiError);
  };
  img.onerror=function(){ aiError(); }; img.src=url;
};

/* ================= TRAIN ================= */
var prevIdx=null;
function buildPrevIndex(){
  var idx={}, keys=Object.keys(S.days).filter(function(k){ return k<S.date; }).sort().reverse();
  keys.forEach(function(k){
    var d=S.days[k]; if(!d||!d.sets) return;
    Object.keys(d.sets).forEach(function(sk){
      var v=d.sets[sk]; if(!v||(v.w==null&&v.reps==null)) return;
      var p=sk.split("|"); if(p.length<3) return; var pre=p[0]+"|"+p[1]+"|";
      if(!idx[pre]) idx[pre]={date:k,sets:[]};
      if(idx[pre].date===k) idx[pre].sets.push({i:+p[2],w:v.w,reps:v.reps});
    });
  });
  Object.keys(idx).forEach(function(p){ idx[p].sets.sort(function(a,b){ return a.i-b.i; }); });
  return idx;
}
function parseSpec(spec){
  var m=/^(\d+)\s*x\s*(.+)$/i.exec(String(spec||"")); if(!m) return {s:1,reps:[String(spec||"")]};
  var n=+m[1], parts=m[2].split(",").map(function(x){ return x.trim(); }), reps=[];
  for(var i=0;i<n;i++) reps.push(parts.length===1?parts[0]:(parts[i]!=null?parts[i]:parts[parts.length-1])); return {s:n,reps:reps};
}
function buildItems(p,d,wd,rdate){
  var sch=p.phase&&p.phase.scheme, focus=(DEF_FOCUS[p.id]||"h"), swaps=day(rdate).exSwaps||{}, items=[];
  (d.ex||[]).forEach(function(e){
    var active=swaps[e.n]||e.n, it={L:e.L,n:active,origN:e.n,cue:e.cue,sw:e.sw,key:wd+"|"+slug(active)};
    if(sch&&e.t){
      var tier=sch[e.t]||sch.iso, k=(e.t==="main"&&focus==="s"&&tier.s)?tier.s:tier.h;
      it.warm=k.w; it.s=k.s; it.r=k.r; it.rest=k.rest; it.tech=k.tech; it.t=e.t;
    } else {
      var sp; if(p.levels){ var L=p.levels[S.profile.plyoLevel]||p.levels[0]; sp=parseSpec(L.s+"x"+L.r); } else sp=parseSpec(e.s+"x"+e.r);
      it.s=sp.s; it.r=sp.reps.every(function(r){ return r===sp.reps[0]; })?String(sp.reps[0]):sp.reps.join(", ");
    }
    items.push(it);
  });
  return items;
}
var CHECK="<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 12.5l4.5 4.5L19 7.5'/></svg>";
function renderTrain(){
  var rd=S.date, wd=workoutIdx(rd), p=program(), pos=programPos(todayKey()), isNow=(PROGRAMS[pos.idx]===p);
  prevIdx=buildPrevIndex();
  if(p.days.length<7) wd=0;
  var d=p.days[Math.min(wd,p.days.length-1)]||p.days[0];
  var chip="<button class='phasechip' id='phaseBtn' aria-label='Change phase or workout'>"+esc(p.name)+(p.phase&&isNow?" · Wk "+pos.week+"/"+pos.weeks:"")+
    "<svg viewBox='0 0 24 24'><path d='M6 9l6 6 6-6'/></svg></button>";
  var h="";
  if(d.rest){
    h="<div class='card'><div class='session'><div class='ttl'><div class='eyebrow'>"+esc(prettyDate(rd,{weekday:"long"}))+"</div><h1 class='h1'>"+esc(d.title)+"</h1></div>"+chip+"</div></div>"+
      "<div class='restday'>"+esc(d.rest)+"</div>";
    $("panel-train").innerHTML=h; $("phaseBtn").onclick=openPhaseSheet; return;
  }
  var items=buildItems(p,d,wd,rd), sets=day(rd).sets;
  var total=0, done=0;
  items.forEach(function(it){ for(var i=0;i<it.s;i++){ total++; if((sets[it.key+"|"+i]||{}).done) done++; } });
  h+="<div class='card'><div class='session'><div class='ttl'><div class='eyebrow'>"+esc(prettyDate(rd,{weekday:"long"}))+(wd!==wdIndex(rd)?" · swapped":"")+"</div><h1 class='h1'>"+esc(d.title||d.name)+"</h1></div>"+chip+"</div>"+
     "<div class='progress' role='progressbar' aria-valuemin='0' aria-valuemax='"+total+"' aria-valuenow='"+done+"'><i id='progFill' style='width:"+(total?done/total*100:0)+"%'></i></div>"+
     "<div class='progtxt'><span id='progTxt'>"+done+" of "+total+" sets done</span><span>"+items.length+" exercises</span></div>"+
     (p.note?"<details class='fold' style='border:0;margin-top:8px'><summary style='padding:0;min-height:40px;font-size:13px;color:var(--text-2)'>About this phase</summary><div class='inner' style='padding:0 0 4px'><p style='margin:0 0 8px'>"+esc(p.note)+"</p>"+(p.phase&&p.phase.tech?"<p class='tech'>"+esc(p.phase.tech)+"</p>":"")+"</div></details>":"")+"</div>";

  var cardioHtml="";
  if(d.cardio){
    var c=day(rd).cardio, cs=cardioStatus(rd), dur=p.phase&&p.phase.cardio?p.phase.cardio+" · ":"";
    cardioHtml="<details class='fold' open><summary>Cardio<span class='r'>"+(c.done?"Done":esc(dur.replace(" · ","")))+"</span></summary><div class='inner'>"+esc(d.cardio)+(d.cardioSwap?"<br><span class='small'>Swap: "+esc(d.cardioSwap)+"</span>":"")+
      "<div class='cardio-row'><button class='tick' id='cTick' aria-pressed='"+c.done+"' aria-label='Mark cardio done'>"+CHECK+"</button>"+
      "<input class='numfield' id='cMin' type='number' inputmode='decimal' placeholder='min' value='"+(c.minutes!=null?c.minutes:"")+"' aria-label='Cardio minutes'>"+
      "<input class='numfield' id='cMi' type='number' inputmode='decimal' step='0.1' placeholder='miles' value='"+(c.miles!=null?c.miles:"")+"' aria-label='Cardio miles'></div>"+
      "<p class='cardio-note "+cs.cls+"'>"+esc(cs.msg)+"</p></div></details>";
  }
  if(d.bands||d.warmup||d.bosu){
    h+="<details class='fold'><summary>Warm-up"+(d.bosu?" &amp; balance":"")+"<span class='r'>optional</span></summary><div class='inner'><ul style='margin:0;padding-left:18px'>"+
      (d.bands||[]).concat(d.warmup||[]).map(function(x){ return "<li>"+esc(x)+"</li>"; }).join("")+(d.bosu||[]).map(function(x){ return "<li>"+esc(x)+" <span class='small'>(balance)</span></li>"; }).join("")+"</ul></div></details>";
  }
  /* the open exercise: first with unfinished sets, unless you tapped another */
  var firstOpen=-1; items.forEach(function(it,i){ if(firstOpen<0){ for(var s=0;s<it.s;s++) if(!(sets[it.key+"|"+s]||{}).done){ firstOpen=i; break; } } });
  var open=(S.openEx!=null&&S.openEx<items.length)?S.openEx:firstOpen;
  items.forEach(function(it,ix){
    var cnt=0; for(var s=0;s<it.s;s++) if((sets[it.key+"|"+s]||{}).done) cnt++;
    var isOpen=(ix===open), complete=(cnt===it.s);
    h+="<div class='ex"+(isOpen?" open":"")+(complete?" done":"")+"' data-ix='"+ix+"'><button class='ex-head' data-toggle='"+ix+"' aria-expanded='"+isOpen+"'>"+
      "<span class='ex-letter'>"+(complete?CHECK.replace("<svg","<svg style='width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:3;stroke-linecap:round'"):esc(it.L||ix+1))+"</span>"+
      "<span class='ex-t'><div class='ex-name'>"+esc(it.n)+"</div><div class='ex-meta'>"+it.s+" × "+esc(it.r)+(it.rest?" · rest "+esc(it.rest):"")+"</div></span>"+
      "<span class='pips' aria-hidden='true'>"+Array.apply(null,Array(it.s)).map(function(_,i){ return "<i class='"+(i<cnt?"on":"")+"'></i>"; }).join("")+"</span></button>";
    if(isOpen){
      var prev=(prevIdx||{})[it.key+"|"], pmap={}; if(prev) prev.sets.forEach(function(x){ pmap[x.i]=x; });
      var pr=(day(rd).pairs||{})[it.key];
      h+="<div class='ex-body'>"+(pr?"<p class='lastline' style='margin-bottom:10px'><b>Paired</b><span>"+esc(pr.n)+"</span></p>":"")+
        (it.cue?"<p class='cue'>"+esc(it.cue)+"</p>":"")+(it.tech?"<p class='tech'>"+esc(it.tech)+"</p>":"")+
        (it.warm&&it.warm!=="0"?"<p class='small muted' style='margin:0 0 8px'>"+esc(it.warm)+" warm-up set"+(it.warm==="1"?"":"s")+" first</p>":"")+
        (prev?"<div class='lastline'><b>Last</b><span>"+esc(prettyDate(prev.date,{month:"short",day:"numeric"}))+"</span><span>"+prev.sets.map(function(x){ return (x.w!=null?x.w:"?")+"×"+(x.reps!=null?x.reps:"?"); }).join(", ")+"</span></div>":"")+
        "<div class='sethd'><span></span><span>"+esc((p.metric||{}).label||"Weight")+"</span><span>Reps</span><span></span></div>";
      for(var si=0;si<it.s;si++){
        var key=it.key+"|"+si, v=sets[key]||{}, g=ghost(it,si,pmap,sets);
        h+="<div class='setrow"+(v.done?" done":"")+"' data-key='"+esc(key)+"' data-ix='"+ix+"'><span class='i'>"+(si+1)+"</span>"+
          "<input class='numfield"+(g.w!=null?" ghost":"")+"' type='number' inputmode='decimal' enterkeyhint='next' data-f='w' placeholder='"+(g.w!=null?g.w:esc((p.metric||{}).ph||"lb"))+"' value='"+(v.w!=null?v.w:"")+"' aria-label='"+esc(it.n)+" set "+(si+1)+" weight'>"+
          "<input class='numfield"+(g.reps!=null?" ghost":"")+"' type='number' inputmode='numeric' enterkeyhint='done' data-f='reps' placeholder='"+(g.reps!=null?g.reps:esc(String(it.r).split("-")[0]))+"' value='"+(v.reps!=null?v.reps:"")+"' aria-label='"+esc(it.n)+" set "+(si+1)+" reps'>"+
          "<button class='tick' aria-pressed='"+!!v.done+"' aria-label='Mark set "+(si+1)+" done'>"+CHECK+"</button></div>";
      }
      var opts=[it.origN].concat(it.sw||[]);
      h+="<div class='ex-foot'><button class='linkbtn' data-swap='"+ix+"'>"+(it.n!==it.origN?"Doing: "+esc(it.n)+" — change":"Did something else? Swap")+"</button></div></div>";
    }
    h+="</div>";
  });
  h+=cardioHtml;
  h+="<p class='foot'>Numbers save per day. Tap ✓ with empty boxes to log the suggested weight and reps.</p>";
  var panel=$("panel-train"); panel.innerHTML=h;
  wireTrain(panel,rd,items,sets,wd);
}
/* Suggested values: this set's number last session, else the set before it today. */
function ghost(it,si,pmap,sets){
  var g={w:null,reps:null}, pv=pmap[si];
  if(pv){ g.w=pv.w; g.reps=pv.reps; }
  if(si>0){ var b=sets[it.key+"|"+(si-1)]||{}; if(g.w==null&&b.w!=null) g.w=b.w; if(g.reps==null&&b.reps!=null) g.reps=b.reps; }
  if(g.reps==null){ var n=num(String(it.r).split(/[-–,]/)[0]); if(n!=null) g.reps=n; }
  return g;
}
function wireTrain(panel,rd,items,sets,wd){
  var pb=$("phaseBtn"); if(pb) pb.onclick=openPhaseSheet;
  panel.querySelectorAll("[data-toggle]").forEach(function(b){ b.onclick=function(){
    var ix=+b.dataset.toggle; S.openEx=(S.openEx===ix||(S.openEx==null&&b.getAttribute("aria-expanded")==="true"))?-1:ix; renderTrain();
    var el=panel.querySelector(".ex[data-ix='"+ix+"']"); if(el&&S.openEx===ix) el.scrollIntoView({block:"nearest",behavior:"smooth"});
  }; });
  panel.querySelectorAll("[data-swap]").forEach(function(b){ b.onclick=function(){ openSwap(items[+b.dataset.swap],rd); }; });
  function setUI(row){
    var key=row.dataset.key, v=sets[key]||{}, it=items[+row.dataset.ix];
    row.classList.toggle("done",!!v.done); row.querySelector(".tick").setAttribute("aria-pressed",v.done?"true":"false");
    var pips=row.closest(".ex").querySelectorAll(".pips i"), cnt=0;
    for(var i=0;i<it.s;i++){ if((sets[it.key+"|"+i]||{}).done){ cnt++; } if(pips[i]) pips[i].className=((sets[it.key+"|"+i]||{}).done)?"on":""; }
    var tot=0,dn=0; items.forEach(function(x){ for(var i=0;i<x.s;i++){ tot++; if((sets[x.key+"|"+i]||{}).done) dn++; } });
    $("progFill").style.width=(tot?dn/tot*100:0)+"%"; $("progTxt").textContent=dn+" of "+tot+" sets done";
    return cnt;
  }
  panel.querySelectorAll(".setrow").forEach(function(row){
    var key=row.dataset.key, it=items[+row.dataset.ix], inW=row.querySelector("[data-f='w']"), inR=row.querySelector("[data-f='reps']"), tick=row.querySelector(".tick");
    function rec(){ return sets[key]=sets[key]||{w:null,reps:null,done:false}; }
    [inW,inR].forEach(function(inp){
      inp.oninput=function(){ rec()[inp.dataset.f]=inp.value===""?null:+inp.value; persistDay(rd); };
      inp.onkeydown=function(e){ if(e.key==="Enter"){ e.preventDefault(); if(inp===inW) inR.focus(); else inR.blur(); } };
    });
    /* weight + reps both filled = set done, no extra tap (updated in place, never re-rendered mid-typing) */
    inR.onchange=function(){
      var r=rec(); if(r.w!=null&&r.reps!=null&&!r.done){ r.done=true; persistDay(rd); setUI(row); startRest(parseRest(it.rest)); }
    };
    tick.onclick=function(){
      var r=rec();
      if(r.done){ r.done=false; persistDay(rd); setUI(row); return; }
      var pm={}, prev=(prevIdx||{})[it.key+"|"]; if(prev) prev.sets.forEach(function(x){ pm[x.i]=x; });
      var si=+key.split("|").pop(), g=ghost(it,si,pm,sets);
      if(r.w==null&&g.w!=null) r.w=g.w; if(r.reps==null&&g.reps!=null) r.reps=g.reps;
      r.done=true; persistDay(rd); startRest(parseRest(it.rest));
      var cnt=0; for(var i=0;i<it.s;i++) if((sets[it.key+"|"+i]||{}).done) cnt++;
      if(cnt===it.s){ var nx=-1; items.forEach(function(x,i){ if(nx<0&&i>+row.dataset.ix){ for(var s=0;s<x.s;s++) if(!(sets[x.key+"|"+s]||{}).done){ nx=i; break; } } }); S.openEx=nx; }
      renderTrain(); renderWeek();
    };
  });
  var c=function(){ var cd=day(rd); return cd.cardio=cd.cardio||{done:false,miles:null,minutes:null}; };
  var ct=$("cTick"); if(ct) ct.onclick=function(){ c().done=!c().done; persistDay(rd); renderTrain(); renderWeek(); };
  var cm=$("cMin"); if(cm) cm.oninput=function(){ c().minutes=cm.value===""?null:num(cm.value); persistDay(rd); };
  var cmi=$("cMi"); if(cmi) cmi.oninput=function(){ c().miles=cmi.value===""?null:num(cmi.value); persistDay(rd); };
}
function openSwap(it,rd){
  var opts=[it.origN].concat(it.sw||[]);
  openSheet("Swap exercise","<p class='muted small'>Your numbers save against whichever you pick.</p><div class='list'>"+
    opts.map(function(x,i){ return "<button class='item' data-o='"+i+"'><span class='t'>"+esc(x)+(x===it.n?"<small>Current</small>":"")+"</span></button>"; }).join("")+"</div>"+
    "<input class='field' id='sw' placeholder='Something else…' style='margin-top:12px'>","<button class='btn' id='sws'>Use what I typed</button>");
  function pick(name){ var ex=day(rd).exSwaps; if(name===it.origN) delete ex[it.origN]; else ex[it.origN]=name; persistDay(rd); closeSheet(); }
  $("shBody").querySelectorAll("[data-o]").forEach(function(b){ b.onclick=function(){ pick(opts[+b.dataset.o]); }; });
  $("sws").onclick=function(){ var v=$("sw").value.trim(); if(v) pick(v); };
}
function openPhaseSheet(){
  var p=program(), pos=programPos(todayKey()), wd=workoutIdx(S.date), curP=PROGRAMS[pos.idx];
  var body="<p class='eyebrow' style='margin-bottom:8px'>Program</p><div class='chips'>"+PROGRAMS.map(function(x,i){
    return "<button class='chip' data-p='"+i+"' aria-pressed='"+(i===S.profile.programIdx)+"'>"+esc(x.name)+(x===curP?" · now":"")+"</button>"; }).join("")+"</div>"+
    "<p class='muted small' style='margin:8px 0 0'>You’re in "+esc(curP.name)+", week "+pos.week+" of "+pos.weeks+". Picking another program lets you browse it without changing that.</p>";
  if(p.levels) body+="<p class='eyebrow' style='margin:18px 0 8px'>Level</p><div class='chips'>"+p.levels.map(function(L,i){ return "<button class='chip' data-l='"+i+"' aria-pressed='"+(i===S.profile.plyoLevel)+"'>"+esc(L.name)+" · "+L.s+"×"+esc(L.r)+"</button>"; }).join("")+"</div>";
  if(p.days.length>=7) body+="<p class='eyebrow' style='margin:18px 0 8px'>Workout for "+esc(prettyDate(S.date,{weekday:"long"}))+"</p><div class='chips'>"+p.days.map(function(x,i){
    return "<button class='chip' data-w='"+i+"' aria-pressed='"+(i===wd)+"'>"+esc(x.d+" · "+x.title)+"</button>"; }).join("")+"</div>";
  if(p.phase&&p.phase.targets){ var T=p.phase.targets;
    body+="<p class='eyebrow' style='margin:18px 0 8px'>Daily targets</p><div class='tgt4'><div><b>"+T.k+"</b><span>kcal</span></div><div><b>"+T.p+"</b><span>protein</span></div><div><b>"+T.c+"</b><span>carbs</span></div><div><b>"+T.f+"</b><span>fat</span></div></div>"+
      "<button class='btn ghost sm' id='useT' style='margin-top:10px' "+(sameTargets(T,S.profile.targets)?"disabled":"")+">"+(sameTargets(T,S.profile.targets)?"In use":"Use these targets")+"</button>"; }
  body+="<p class='eyebrow' style='margin:18px 0 8px'>Program start date</p><input class='field' type='date' id='pstart' value='"+esc(S.profile.programStart)+"'>";
  openSheet("Phase & workout",body);
  var B=$("shBody");
  B.querySelectorAll("[data-p]").forEach(function(b){ b.onclick=function(){ S.profile.programIdx=+b.dataset.p; S.openEx=null; persistProfile(); closeSheet(); }; });
  B.querySelectorAll("[data-l]").forEach(function(b){ b.onclick=function(){ S.profile.plyoLevel=+b.dataset.l; persistProfile(); closeSheet(); }; });
  B.querySelectorAll("[data-w]").forEach(function(b){ b.onclick=function(){ var dd=cur(); dd.wd=(+b.dataset.w===wdIndex(S.date))?null:+b.dataset.w; persistDay(S.date); S.openEx=null; closeSheet(); }; });
  var ut=$("useT"); if(ut) ut.onclick=function(){ var T=p.phase.targets; S.profile.targets={k:T.k,p:T.p,c:T.c,f:T.f}; persistProfile(); closeSheet(); toast("Targets updated"); };
  $("pstart").onchange=function(){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(this.value)) return; S.profile.programStart=this.value;
    if(PROGRAMS[S.profile.programIdx]&&PROGRAMS[S.profile.programIdx].phase) S.profile.programIdx=programPos(todayKey()).idx;
    persistProfile(); closeSheet();
  };
}

/* ---- weekly cardio goal (4 sessions' worth of minutes, folded into the days left) ---- */
function cardioPerSession(){
  var raw=program().phase&&program().phase.cardio, n=(String(raw||"").match(/\d+/g)||[]).map(Number);
  if(!n.length) return 25; return n.length>1?(n[0]+n[1])/2:n[0];
}
function cardioStatus(k){
  var mon=mondayOf(k), target=cardioPerSession()*4, done=0, sessions=0;
  for(var i=0;i<7;i++){ var kk=shiftKey(mon,i); if(kk>k) break; var c=S.days[kk]&&S.days[kk].cardio; if(c&&(c.minutes||c.done)){ done+=(c.minutes||0); sessions++; } }
  var left=Math.max(0,daysBetween(k,shiftKey(mon,6))), tc=S.days[k]&&S.days[k].cardio, logged=!!(tc&&(tc.minutes||tc.done));
  var remaining=Math.max(0,target-done), slots=Math.max(1,left+(logged?0:1)), perDay=Math.ceil(remaining/slots);
  if(remaining<=0) return {cls:"good",msg:r0(done)+" of "+r0(target)+" min this week — goal met."};
  if(!logged&&slots<=1) return {cls:"warn",msg:"Last day to fit it in — "+perDay+" min closes out the week ("+r0(done)+"/"+r0(target)+")."};
  return {cls:"",msg:r0(done)+"/"+r0(target)+" min this week · about "+perDay+" min a day covers the rest."};
}

/* ================= TREND ================= */
function lastKeys(n){ var out=[],k=S.date; for(var i=0;i<n;i++){ out.unshift(k); k=shiftKey(k,-1); } return out; }
function periodStarts(){
  var out=[]; Object.keys(S.days).sort().forEach(function(k){ if(!S.days[k]||!S.days[k].period) return; var pv=S.days[shiftKey(k,-1)]; if(!pv||!pv.period) out.push(k); }); return out;
}
function bleedLen(s){ var n=0,k=s; while(S.days[k]&&S.days[k].period){ n++; k=shiftKey(k,1); } return n||5; }
function cycleInfo(k){
  var starts=periodStarts(), prior=starts.filter(function(s){ return s<=k; }); if(!prior.length) return {starts:starts,none:true};
  var last=prior[prior.length-1], lens=[];
  for(var i=1;i<starts.length;i++){ var L=daysBetween(starts[i-1],starts[i]); if(L>=18&&L<=45) lens.push(L); }
  var avg=lens.length?Math.round(lens.reduce(function(a,b){ return a+b; },0)/lens.length):null;
  return {starts:starts,last:last,day:daysBetween(last,k)+1,avg:avg,mens:bleedLen(last)};
}
function phaseFor(dy,avg,mens){ var L=avg||28, ov=Math.max(10,L-14); if(dy<=(mens||5)) return {n:"Menstrual",k:"mens"}; if(dy<ov-1) return {n:"Follicular",k:"foll"}; if(dy<=ov+1) return {n:"Ovulation",k:"ovul"}; return {n:"Luteal",k:"lut"}; }
function refWindow(avg,mens){ var L=avg||28, ov=Math.max(10,L-14); return {lo:(mens||5)+1,hi:Math.max((mens||5)+2,ov-2)}; }
function cycleBands(keys){
  var ref=cycleInfo(keys[keys.length-1]), avg=ref.none?null:ref.avg, bands=[], cb=null;
  keys.forEach(function(k,i){
    var ci=cycleInfo(k); if(ci.none) return; var L=avg||ci.avg||28; if(ci.day>L+10) return;
    var ph=phaseFor(ci.day,L,ci.mens); if(ph.k!=="mens"&&ph.k!=="lut") return;
    if(cb&&cb.k===ph.k&&i===cb.end+1){ cb.end=i; return; } cb={k:ph.k,start:i,end:i}; bands.push(cb);
  });
  return bands;
}
function baselines(){
  var ci=cycleInfo(S.date); if(ci.none||!ci.starts.length) return [];
  var out=[]; ci.starts.forEach(function(s){
    var rw=refWindow(ci.avg,bleedLen(s)), vals=[];
    for(var d=rw.lo;d<=rw.hi;d++){ var dd=S.days[shiftKey(s,d-1)]; if(dd&&dd.weight!=null) vals.push(dd.weight); }
    if(vals.length) out.push({start:s,n:vals.length,avg:vals.reduce(function(a,b){ return a+b; },0)/vals.length});
  }); return out;
}
function barChart(keys,vals,target,color){
  var W=480,H=150,L=34,R=6,T=14,B=20,iw=W-L-R,ih=H-T-B, max=Math.max(target*1.25,Math.max.apply(null,vals.map(function(v){ return v||0; }))*1.1,1), bw=iw/keys.length;
  var s="<svg viewBox='0 0 "+W+" "+H+"' role='img' aria-label='Daily values against target'>";
  [0,max/2,max].forEach(function(v){ var y=T+ih-(v/max)*ih; s+="<line x1='"+L+"' x2='"+(W-R)+"' y1='"+y.toFixed(1)+"' y2='"+y.toFixed(1)+"' stroke='var(--border)'/><text x='"+(L-6)+"' y='"+(y+3.5).toFixed(1)+"' text-anchor='end' font-size='9' fill='var(--text-3)'>"+r0(v)+"</text>"; });
  keys.forEach(function(k,i){ var v=vals[i]; if(v==null||v<=0) return; var h=(Math.min(v,max)/max)*ih; s+="<rect x='"+(L+i*bw+bw*.16).toFixed(1)+"' y='"+(T+ih-h).toFixed(1)+"' width='"+(bw*.68).toFixed(1)+"' height='"+h.toFixed(1)+"' rx='2' fill='"+color+"' opacity='"+(v<target*.9?.35:.95)+"'/>"; });
  var ty=T+ih-(Math.min(target,max)/max)*ih;
  s+="<line x1='"+L+"' x2='"+(W-R)+"' y1='"+ty.toFixed(1)+"' y2='"+ty.toFixed(1)+"' stroke='var(--text)' stroke-width='1.5' stroke-dasharray='5 3'/><text x='"+(W-R)+"' y='"+(ty-5).toFixed(1)+"' text-anchor='end' font-size='9.5' font-weight='600' fill='var(--text-2)'>TARGET "+r0(target)+"</text>";
  s+="<text x='"+L+"' y='"+(H-5)+"' font-size='9' fill='var(--text-3)'>"+keys[0].slice(5).replace("-","/")+"</text><text x='"+(W-R)+"' y='"+(H-5)+"' text-anchor='end' font-size='9' fill='var(--text-3)'>"+keys[keys.length-1].slice(5).replace("-","/")+"</text>";
  return s+"</svg>";
}
function weightChart(keys,wts){
  var pts=[]; keys.forEach(function(k,i){ if(wts[i]!=null) pts.push({i:i,v:wts[i]}); });
  if(pts.length<2) return "<p class='muted small' style='text-align:center;padding:20px 0;margin:0'>Log two weigh-ins and the trend line appears here.<br>Same time each morning works best.</p>";
  var W=480,H=150,L=34,R=6,T=14,B=20,iw=W-L-R,ih=H-T-B, vs=pts.map(function(p){ return p.v; }), lo=Math.min.apply(null,vs), hi=Math.max.apply(null,vs), pv=Math.max((hi-lo)*.35,1.2); lo-=pv; hi+=pv;
  function X(i){ return L+(i/(keys.length-1))*iw; } function Y(v){ return T+ih-((v-lo)/(hi-lo))*ih; }
  var s="<svg viewBox='0 0 "+W+" "+H+"' role='img' aria-label='Bodyweight with 7 day average'>", step=iw/(keys.length-1);
  cycleBands(keys).forEach(function(b){ var x=Math.max(L,X(b.start)-step/2), w=Math.min((b.end-b.start+1)*step,W-R-x); s+="<rect x='"+x.toFixed(1)+"' y='"+T+"' width='"+w.toFixed(1)+"' height='"+ih+"' fill='var(--m-fat)' opacity='"+(b.k==="mens"?.2:.08)+"'/>"; });
  [lo,(lo+hi)/2,hi].forEach(function(v){ s+="<line x1='"+L+"' x2='"+(W-R)+"' y1='"+Y(v).toFixed(1)+"' y2='"+Y(v).toFixed(1)+"' stroke='var(--border)'/><text x='"+(L-6)+"' y='"+(Y(v)+3.5).toFixed(1)+"' text-anchor='end' font-size='9' fill='var(--text-3)'>"+r1(v)+"</text>"; });
  var roll=[]; keys.forEach(function(k,i){ var win=[]; for(var j=Math.max(0,i-6);j<=i;j++) if(wts[j]!=null) win.push(wts[j]); if(win.length) roll.push({i:i,v:win.reduce(function(a,b){ return a+b; },0)/win.length}); });
  if(roll.length>1) s+="<path d='"+roll.map(function(p,i){ return (i?"L":"M")+X(p.i).toFixed(1)+" "+Y(p.v).toFixed(1); }).join(" ")+"' fill='none' stroke='var(--accent)' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/>";
  pts.forEach(function(p){ s+="<circle cx='"+X(p.i).toFixed(1)+"' cy='"+Y(p.v).toFixed(1)+"' r='2.8' fill='var(--text-3)'/>"; });
  var last=roll[roll.length-1]; if(last) s+="<circle cx='"+X(last.i).toFixed(1)+"' cy='"+Y(last.v).toFixed(1)+"' r='4.6' fill='var(--accent)' stroke='var(--surface)' stroke-width='2'/><text x='"+(X(last.i)-8).toFixed(1)+"' y='"+(Y(last.v)-12).toFixed(1)+"' text-anchor='end' font-size='11' font-weight='600' fill='var(--accent)'>"+r1(last.v)+"</text>";
  return s+"</svg>";
}
function renderTrend(){
  var keys=lastKeys(21), T=S.profile.targets;
  var kc=keys.map(function(k){ return S.days[k]?totals(k).k:null; }), pr=keys.map(function(k){ return S.days[k]?totals(k).p:null; });
  var wk=lastKeys(63), wt=wk.map(function(k){ return S.days[k]&&day(k).weight!=null?day(k).weight:null; });
  var lk=kc.filter(function(v){ return v>0; }), lp=pr.filter(function(v){ return v>0; }), wl=wt.filter(function(v){ return v!=null; });
  var avgK=lk.length?lk.reduce(function(a,b){ return a+b; },0)/lk.length:0, avgP=lp.length?lp.reduce(function(a,b){ return a+b; },0)/lp.length:0;
  var trend="—", tu="need 4 weigh-ins", bl=baselines();
  if(bl.length>=2){ var l2=bl.slice(-2), gap=daysBetween(l2[0].start,l2[1].start)/7, per=(l2[1].avg-l2[0].avg)/(gap||4); trend=(per>=0?"+":"")+r1(per); tu="lb / wk, cycle-matched"; }
  else if(wl.length>=4){ var half=Math.floor(wl.length/2), a=wl.slice(0,half).reduce(function(x,y){ return x+y; },0)/half, b=wl.slice(half).reduce(function(x,y){ return x+y; },0)/(wl.length-half), pw=(b-a)/((wk.length/2/7)||1); trend=(pw>=0?"+":"")+r1(pw); tu="lb / week"; }
  function stat(l,v,u){ return "<div class='stat'><div class='eyebrow'>"+l+"</div><div class='v'>"+v+"</div><div class='u'>"+u+"</div></div>"; }
  var h="<div class='stats'>"+stat("Avg kcal",lk.length?r0(avgK):"—",lk.length?"of "+T.k:"no days logged")+stat("Avg protein",lp.length?r0(avgP):"—",lp.length?"of "+T.p+" g":"no days logged")+stat("Weight",trend,tu)+"</div>";
  var d=cur();
  h+="<div class='wtform'><input class='field' id='wtIn' type='number' step='0.1' inputmode='decimal' placeholder='Weigh-in for this day (lb)' value='"+(d.weight!=null?d.weight:"")+"' aria-label='Weigh-in in pounds'><button class='btn' id='wtSave'>Log</button></div>"+
    "<button class='toggle' id='periodBtn' aria-pressed='"+!!d.period+"'><span class='dot'></span><span>"+(d.period?"Period logged on this day":"Period on this day")+"</span></button>";
  var ci=cycleInfo(S.date);
  h+="<div class='card'><h3 class='h2' style='font-size:18px'>Cycle</h3>";
  if(ci.none) h+="<p class='muted small' style='margin:6px 0 0'>Mark the days you bleed. After two logged periods this shows your cycle day and separates real weight change from cycle water.</p>";
  else {
    var ph=phaseFor(ci.day,ci.avg,ci.mens), due=ci.avg?ci.avg-ci.day:null, rw=refWindow(ci.avg,ci.mens), note;
    if(ph.k==="lut") note="Luteal phase. Progesterone drives fluid retention, and 2 to 5 lb on the scale is ordinary — not fat. Hold your target; read your trend from the follicular window.";
    else if(ph.k==="mens") note="Retained water usually clears over the next few days, so weigh-ins from here read lower without anything having changed.";
    else if(ph.k==="foll") note=(ci.day>=rw.lo&&ci.day<=rw.hi)?"Follicular phase, inside your reference window (day "+rw.lo+"–"+rw.hi+"). These weigh-ins are the ones worth comparing month to month.":"Follicular phase. Your cleanest comparison window is day "+rw.lo+"–"+rw.hi+".";
    else note="Around ovulation. A small water shift is common.";
    h+="<div class='cyc3'><div><div class='eyebrow'>Cycle day</div><div class='v'>"+ci.day+"</div></div><div><div class='eyebrow'>Avg length</div><div class='v'>"+(ci.avg||"—")+"</div></div><div><div class='eyebrow'>Next in</div><div class='v'>"+(due!=null?Math.max(0,due):"—")+"</div></div></div><span class='pill'>"+ph.n+"</span><p class='muted small' style='margin:10px 0 0'>"+esc(note)+"</p>";
  }
  h+="</div><div class='card chartcard'><h3 class='h2' style='font-size:18px'>Bodyweight</h3><p class='cap'>Dots are weigh-ins, the line is a 7-day average. Shaded bands are your period and the luteal phase before it.</p>"+weightChart(wk,wt)+"</div>";
  if(bl.length){ h+="<div class='card'><h3 class='h2' style='font-size:18px'>Cycle-matched baseline</h3><p class='muted small'>Average weight in the same phase of each cycle — the fair way to see real change.</p><table style='width:100%;border-collapse:collapse;font-size:14px'><tbody>"+bl.map(function(r,i){ var dl=i?r.avg-bl[i-1].avg:null; return "<tr><td style='padding:8px 0;border-top:1px solid var(--border)'>"+esc(prettyDate(r.start,{month:"short",day:"numeric"}))+"</td><td style='text-align:right;border-top:1px solid var(--border)'>"+r1(r.avg)+" lb</td><td style='text-align:right;border-top:1px solid var(--border);color:"+(dl==null?"inherit":(dl>=0?"var(--good)":"var(--warn)"))+"'>"+(dl==null?"—":(dl>=0?"+":"")+r1(dl))+"</td></tr>"; }).join("")+"</tbody></table></div>"; }
  h+="<div class='card chartcard'><h3 class='h2' style='font-size:18px'>Calories vs target</h3><p class='cap'>Faded bars fell more than 10% short of target.</p>"+barChart(keys,kc,T.k,"var(--m-kcal)")+"</div>"+
     "<div class='card chartcard'><h3 class='h2' style='font-size:18px'>Protein vs target</h3><p class='cap'>Hitting protein is the most protective habit while building. Over is fine.</p>"+barChart(keys,pr,T.p,"var(--m-pro)")+"</div>"+
     "<div class='card'><h3 class='h2' style='font-size:18px'>Daily targets</h3><div class='tgt4'><div><b>"+T.k+"</b><span>kcal</span></div><div><b>"+T.p+"</b><span>protein</span></div><div><b>"+T.c+"</b><span>carbs</span></div><div><b>"+T.f+"</b><span>fat</span></div></div><p class='muted small' style='margin:10px 0 0'>Set by your phase. Change them from the phase button on Train.</p></div>"+
     "<p class='foot' id='syncNote'></p><p class='foot'><button class='linkbtn' id='signOut'>Sign out</button></p>";
  $("panel-trend").innerHTML=h;
  var save=function(){ var v=num($("wtIn").value); if(v==null) return; cur().weight=v; persistDay(S.date); renderTrend(); toast("Weight saved"); };
  $("wtSave").onclick=save; $("wtIn").onkeydown=function(e){ if(e.key==="Enter"){ e.preventDefault(); save(); } };
  $("periodBtn").onclick=function(){ var dd=cur(); dd.period=!dd.period; persistDay(S.date); renderTrend(); };
  $("signOut").onclick=function(){ if(DEV) return; supabaseClient.auth.signOut().then(function(){ location.href="../portal-login.html"; }); };
  var dot=$("syncdot"); $("syncNote").textContent=dot.title||"";
}

/* ================= boot ================= */
function checkAccess(){
  if(DEV) return Promise.resolve({uid:"dev",email:"dev@local"});
  return supabaseClient.auth.getSession().then(function(r){
    var s=r.data&&r.data.session;
    if(!s){ location.replace("../portal-login.html"); return null; }
    var id=s.user.id, email=s.user.email, ck="pc_member_"+id;
    if(email===ADMIN_EMAIL) return {uid:id,email:email};
    return supabaseClient.from("memberships").select("*").eq("client_email",email).eq("status","active").order("tier",{ascending:false}).limit(1).then(function(m){
      if(m.error) throw m.error;
      var a=m.data&&m.data.length?m.data[0]:null, ok=a&&(!a.expires_at||new Date(a.expires_at)>new Date());
      if(!ok){ location.replace("../membership.html"); return null; }
      try{ localStorage.setItem(ck,String(Date.now())); }catch(e){}
      return {uid:id,email:email};
    }).catch(function(){
      var t=+localStorage.getItem(ck)||0;
      if(Date.now()-t<14*864e5) return {uid:id,email:email};   /* offline: trust a recent check */
      location.replace("../membership.html"); return null;
    });
  });
}
function start(u){
  uid=u.uid; userEmail=u.email; lsLoad();
  document.body.style.visibility="visible";
  maybeAdvance(); renderAll(); pull();
  if("serviceWorker" in navigator&&!DEV) navigator.serviceWorker.register("sw.js").catch(function(){});
}
checkAccess().then(function(u){ if(u) start(u); }).catch(function(e){ document.body.style.visibility="visible"; showErr(e); });
})();
