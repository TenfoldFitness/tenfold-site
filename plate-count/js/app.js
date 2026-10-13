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
var ENT = null;   /* what this client is entitled to see; null = no limits (dev) */

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
  /* programStart is set to the client's own first day (see start()); it is never a shared default. */
  profile: {targets:Object.assign({},DEF_TARGETS), programStart:"", programIdx:0, plyoLevel:0, custom:[], updatedAt:0},
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
var lsBroken=false;
function lsSave(){
  try{
    localStorage.setItem(lsKey(),JSON.stringify({d:S.days,p:S.profile,dirty:S.dirty}));
    if(lsBroken){ lsBroken=false; showSync(); }
  }catch(e){
    /* This device could not keep the entry. Say so plainly: the cloud copy may be the only copy. */
    if(!lsBroken){ lsBroken=true; showSync(); toast("Couldn’t save on this device. Storage may be full or blocked."); }
  }
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
  if(typeof p.onboarded==="boolean") d.onboarded=p.onboarded;
  if(p.goal==="lose"||p.goal==="maintain"||p.goal==="build") d.goal=p.goal;
  ["goalWeight","bf","goalBfLo","goalBfHi"].forEach(function(f){ d[f]=(typeof p[f]==="number"&&isFinite(p[f]))?p[f]:null; });
  d.updatedAt=+p.updatedAt||0;
  unionCustom(p.custom);
}
function unionCustom(list){
  if(!Array.isArray(list)) return;
  var have={}; S.profile.custom.forEach(function(c){ have[c.n.toLowerCase()]=1; });
  list.forEach(function(c){ if(c&&typeof c.n==="string"&&!have[c.n.toLowerCase()]){ S.profile.custom.push(c); have[c.n.toLowerCase()]=1; } });
  S.profile.custom=S.profile.custom.slice(0,300);
}
var flushTimer=0, retryTimer=0, retryDelay=0;
function persistDay(k){
  if(roBlocked()) return;
  var d=day(k); d.updatedAt=Date.now(); S.dirty.days[k]=true; lsSave(); queueFlush();
}
function persistProfile(){
  if(roBlocked()) return;
  S.profile.updatedAt=Date.now(); S.dirty.profile=true; lsSave(); queueFlush();
}
function pendingCount(){ return Object.keys(S.dirty.days).length+(S.dirty.profile?1:0); }
function queueFlush(){
  if(DEV||!uid) return;
  if(S.syncOff){ setSync("off","Saved on this device (cloud backup isn’t set up yet)"); return; }
  if(!navigator.onLine){ setSync("off","Offline — saved on this device"); return; }
  setSync("busy","Saving…");
  clearTimeout(flushTimer); flushTimer=setTimeout(flush,900);
}
/* The pill says, in words, whether what you just entered is saved. */
var syncState={state:"busy",title:""};
function setSync(state,title){ syncState={state:state,title:title||""}; showSync(); }
function showSync(){
  var state=lsBroken?"bad":syncState.state;
  var title=lsBroken?"Couldn’t save on this device. Storage may be full or blocked.":syncState.title;
  var el=$("syncdot"); el.className="syncdot "+state; el.title=title; el.setAttribute("aria-label","Save status: "+(title||state));
  var f=$("syncNote"); if(f) f.textContent=title;
  var t=$("synctext"), p=$("syncpill"), n=pendingCount(), txt;
  if(state==="ok") txt="Saved";
  else if(state==="busy") txt=/Sync/.test(title)?"Syncing…":(title?"Saving…":"");
  else if(state==="bad") txt="Not saved";
  else if(/Offline/.test(title)) txt=n?("Offline · "+n+" waiting"):"Offline · saved";
  else txt=n?(n+" waiting to back up"):"Saved on device";
  if(t) t.textContent=txt;
  if(p){ p.className="syncpill "+state; p.title=title; }
}
function flush(){
  if(DEV||!uid||S.syncOff||!S.pulled) return Promise.resolve();
  if(!navigator.onLine){ setSync("off","Offline — saved on this device"); return Promise.resolve(); }
  var keys=Object.keys(S.dirty.days), prof=S.dirty.profile;
  if(!keys.length&&!prof){ setSync("ok","Saved and backed up"); return Promise.resolve(); }
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
  return Promise.all(jobs).then(function(){
    retryDelay=0; clearTimeout(retryTimer); lsSave();
    if(pendingCount()){ setSync("busy","Saving…"); queueFlush(); } else setSync("ok","Saved and backed up");
  }).catch(function(e){
    console.warn("sync failed",e); setSync("off","Saved on this device — will back up when connected");
    /* keep trying quietly while online, backing off up to a minute */
    clearTimeout(retryTimer); retryDelay=Math.min(60000,(retryDelay||2000)*2); retryTimer=setTimeout(flush,retryDelay);
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
    if(missing(dr.error)||missing(pr.error)){ S.syncOff=true; S.pulled=true; setSync("off","Saved on this device (cloud backup isn’t set up yet)"); return; }
    if(dr.error||pr.error) throw (dr.error||pr.error);
    (dr.data||[]).forEach(function(row){ if(row&&/^\d{4}-\d{2}-\d{2}$/.test(row.day)) acceptIncoming(row.day,row.data); });
    if(pr.data&&pr.data.data) mergeProfile(pr.data.data,false); else S.dirty.profile=true;
    S.pulled=true; lsSave(); softRender(); return flush();
  }).catch(function(e){
    console.warn("pull failed",e); setSync("off","Offline — saved on this device");
  });
}
window.addEventListener("online",function(){ (S.pulled?flush():pull()); });
window.addEventListener("offline",function(){ if(!DEV&&uid) setSync("off","Offline — saved on this device"); });
/* Tap the pill for the plain-words detail, and to back up right now */
var syncPill=$("syncpill");
if(syncPill) syncPill.onclick=function(){
  var n=pendingCount();
  if(lsBroken){ toast("This device couldn’t keep your latest entry. Free up some space or turn off private browsing, then try again."); return; }
  if(S.syncOff){ toast("Everything is saved on this device. Cloud backup isn’t set up yet."); return; }
  if(!navigator.onLine){ toast(n?"You’re offline. "+n+" change"+(n>1?"s":"")+" will back up when you’re online.":"You’re offline. Everything is saved on this device."); return; }
  toast("Checking…");
  (S.pulled?flush():pull()).then(function(){ toast(pendingCount()?"Not backed up yet. We’ll keep trying.":"All changes are saved and backed up."); });
};

/* ================= programs ================= */
var PROGRAMS=[];
(window.PHASES||[]).forEach(function(ph){ PROGRAMS.push({id:ph.id,name:ph.name,sub:ph.sub,note:ph.note,phase:ph,metric:{label:"Weight",ph:"lb"},days:((ph.id==="ph1"?window.DAYS:(window.DAYS_V2||window.DAYS))||[])}); });
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
function programPosRaw(dateKey){
  var elapsed=Math.max(0,daysBetween(S.profile.programStart,dateKey)), weeksIn=Math.floor(elapsed/7), acc=0, last=0;
  for(var i=0;i<PROGRAMS.length;i++){
    if(!PROGRAMS[i].phase) break; last=i;
    var wk=PROGRAMS[i].phase.weeks||4;
    if(weeksIn<acc+wk) return {idx:i,week:weeksIn-acc+1,weeks:wk,done:false};
    acc+=wk;
  }
  var w=PROGRAMS[last].phase.weeks||4; return {idx:last,week:w,weeks:w,done:true};
}
/* ---- Entitlements ---- */
function phaseCount(){ var n=0; for(var i=0;i<PROGRAMS.length;i++) if(PROGRAMS[i].phase) n++; return n; }
function isLockedProgram(i){ return !!(ENT&&PROGRAMS[i]&&PROGRAMS[i].phase&&i>=ENT.allowed); }
function lastUnlockedIdx(){ return Math.max(0,Math.min(phaseCount(),ENT?ENT.allowed:phaseCount())-1); }
function fmtDate(ms){ return new Date(ms).toLocaleDateString(undefined,{month:"short",day:"numeric"}); }
function programPos(dateKey){
  var r=programPosRaw(dateKey);
  if(ENT&&r.idx>=ENT.allowed){
    var idx=lastUnlockedIdx(), w=PROGRAMS[idx].phase.weeks||4;
    return {idx:idx,week:w,weeks:w,done:false,held:true};
  }
  return r;
}
function unlockNote(){
  if(!ENT) return "";
  if(ENT.readOnly) return "<p class='muted small' style='margin:8px 0 0'>Your membership has ended. You can still read everything you had, but you can’t log new days.</p>";
  if(ENT.nextUnlock) return "<p class='muted small' style='margin:8px 0 0'>Phase "+(ENT.allowed+1)+" unlocks on "+fmtDate(ENT.nextUnlock)+(ENT.kind==="subscription"?" if you keep your membership":"")+".</p>";
  return "";
}
var roToastAt=0;
function roBlocked(){
  if(!(ENT&&ENT.readOnly)) return false;
  if(Date.now()-roToastAt>4000){ roToastAt=Date.now(); toast("Your membership has ended, so Plate Count is read-only."); }
  return true;
}
function renderEntBar(){
  var el=$("entbar");
  if(!el){ el=document.createElement("div"); el.id="entbar"; el.className="entbar"; el.hidden=true; var m=document.querySelector("main"); if(m) m.insertAdjacentElement("afterbegin",el); else return; }
  var msg="", pos=programPos(todayKey());
  if(ENT&&ENT.readOnly){
    msg="<b>Read-only.</b> Your membership has ended. Everything you logged is still here. <a href='../membership.html'>Renew to keep logging</a>.";
  } else if(ENT&&ENT.nextUnlock&&pos.held){
    msg="You’ve finished your unlocked weeks. Phase "+(ENT.allowed+1)+" unlocks on "+fmtDate(ENT.nextUnlock)+(ENT.kind==="subscription"?" if you keep your membership":"")+".";
  } else if(pos.done&&!pos.held&&(!ENT||ENT.allowed>=phaseCount())){
    msg="You’ve finished all six phases. The next cycle of workouts is being written. Keep logging in the meantime.";
  }
  el.innerHTML=msg; el.hidden=!msg;
}
/* ---- Move the rest of this week one day later ---- */
function weekShiftOK(k){
  if(wdIndex(k)===0||k>todayKey()) return false;          /* nothing earlier this week to have missed */
  var end=shiftKey(mondayOf(k),6);
  for(var d=k; d<=end; d=shiftKey(d,1)) if(hasActivity(d)) return false;   /* never move days that already have entries */
  return true;
}
function shiftOption(){
  if(!weekShiftOK(S.date)) return "";
  var prevName=prettyDate(shiftKey(S.date,-1),{weekday:"long"});
  return "<p class='eyebrow' style='margin:18px 0 8px'>Missed a day?</p>"+
    "<button class='btn ghost sm' id='shiftWeek'>Move the rest of this week one day later</button>"+
    "<p class='muted small' style='margin:8px 0 0'>Did "+esc(prevName)+"’s workout on "+esc(prettyDate(S.date,{weekday:"long"}))+"? This moves every workout from here to Sunday back a day, so Sunday’s rest day is used. You can undo it.</p>";
}
function shiftWeekFrom(k){
  if(!weekShiftOK(k)) return;
  var end=shiftKey(mondayOf(k),6), old={}, undo=[];
  for(var d=shiftKey(k,-1); d<=end; d=shiftKey(d,1)) old[d]=workoutIdx(d);
  for(var d2=k; d2<=end; d2=shiftKey(d2,1)){
    var src=old[shiftKey(d2,-1)], dd=day(d2);
    undo.push([d2,dd.wd]);
    dd.wd=(src===wdIndex(d2))?null:src;
    persistDay(d2);
  }
  S.openEx=null; closeSheet();
  toast("Moved the rest of this week one day later","Undo",function(){
    undo.forEach(function(u){ day(u[0]).wd=u[1]; persistDay(u[0]); }); renderAll();
  });
}
function sameTargets(a,b){ return a&&b&&a.k===b.k&&a.p===b.p&&a.c===b.c&&a.f===b.f; }
function maybeAdvance(){
  var cp=PROGRAMS[S.profile.programIdx]; if(!cp||!cp.phase) return;
  var pos=programPos(todayKey()); if(pos.idx===S.profile.programIdx) return;
  var prevIdx=S.profile.programIdx, prevT=Object.assign({},S.profile.targets);
  var from=cp.phase, to=PROGRAMS[pos.idx].phase;
  S.profile.programIdx=pos.idx;
  /* A client who set their own goal keeps their own targets; phase targets only auto-apply to legacy profiles. */
  var retarget=!S.profile.goal&&to.targets&&!sameTargets(from.targets,to.targets);
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
  if(ENT&&ENT.readOnly&&/saved|logged|added|set\b|updated|removed/i.test(msg)){ msg="Your membership has ended, so Plate Count is read-only."; label=null; }
  if(lsBroken&&/saved|logged|added|set\b/i.test(msg)){ msg="Couldn’t save on this device. Storage may be full or blocked."; label=null; }
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
function renderAll(){ safe(renderWeek); renderActive(); safe(renderEntBar); }
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
  /* Targets already include your training, so burn is never subtracted from the food budget. */
  var target=S.profile.targets.k, net=t.k, diff=net-target, pLeft=S.profile.targets.p-t.p;
  var block=S.profile.goal==="lose"?"cut":((program().phase&&program().phase.block)||"build");
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
  var net=t.k, left=T.k-net, pct=T.k>0?Math.max(0,net)/T.k:0, C=2*Math.PI*56;
  var st=statusMsg(t,burn), sub="";
  if(burn.kcal>1){
    var bp=[]; if(burn.cardioMin) bp.push(r0(burn.cardioMin)+" min cardio"); if(burn.sets) bp.push(burn.sets+" set"+(burn.sets===1?"":"s"));
    sub="<span class='sub'>"+r0(t.k)+" eaten. Today's training (~"+r0(burn.kcal)+" kcal: "+bp.join(" + ")+") is already built into your target.</span>";
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
      var p=sk.split("|"); if(p.length<3) return; var pre=p[1]+"|";
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
      if(e.s) it.s=e.s; if(e.r) it.r=e.r; it.bw=!!e.bw;
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
      var prev=(prevIdx||{})[it.key.slice(it.key.indexOf("|")+1)+"|"], pmap={}; if(prev) prev.sets.forEach(function(x){ pmap[x.i]=x; });
      var pr=(day(rd).pairs||{})[it.key];
      h+="<div class='ex-body'>"+(pr?"<p class='lastline' style='margin-bottom:10px'><b>Paired</b><span>"+esc(pr.n)+"</span></p>":"")+
        (it.cue?"<p class='cue'>"+esc(it.cue)+"</p>":"")+(it.tech?"<p class='tech'>"+esc(it.tech)+"</p>":"")+
        (it.warm&&it.warm!=="0"?"<p class='small muted' style='margin:0 0 8px'>"+esc(it.warm)+" warm-up set"+(it.warm==="1"?"":"s")+" first</p>":"")+
        (prev?"<div class='lastline'><b>Last</b><span>"+esc(prettyDate(prev.date,{month:"short",day:"numeric"}))+"</span><span>"+prev.sets.map(function(x){ return (x.w!=null?x.w:"?")+"×"+(x.reps!=null?x.reps:"?"); }).join(", ")+"</span></div>":"")+
        "<div class='sethd'><span></span><span>"+esc(it.bw?"Added weight":((p.metric||{}).label||"Weight"))+"</span><span>Reps</span><span></span></div>";
      for(var si=0;si<it.s;si++){
        var key=it.key+"|"+si, v=sets[key]||{}, g=ghost(it,si,pmap,sets);
        h+="<div class='setrow"+(v.done?" done":"")+"' data-key='"+esc(key)+"' data-ix='"+ix+"'><span class='i'>"+(si+1)+"</span>"+
          "<input class='numfield"+(g.w!=null?" ghost":"")+"' type='number' inputmode='decimal' enterkeyhint='next' data-f='w' placeholder='"+(g.w!=null?g.w:(it.bw?"BW":esc((p.metric||{}).ph||"lb")))+"' value='"+(v.w!=null?v.w:"")+"' aria-label='"+esc(it.n)+" set "+(si+1)+" weight'>"+
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
      var pm={}, prev=(prevIdx||{})[it.key.slice(it.key.indexOf("|")+1)+"|"]; if(prev) prev.sets.forEach(function(x){ pm[x.i]=x; });
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
    var lock=isLockedProgram(i);
    return "<button class='chip' data-p='"+i+"' aria-pressed='"+(i===S.profile.programIdx)+"'"+(lock?" disabled title='Not unlocked yet'":"")+">"+esc(x.name)+(x===curP?" · now":"")+(lock?" · locked":"")+"</button>"; }).join("")+"</div>"+
    unlockNote()+
    "<p class='muted small' style='margin:8px 0 0'>You’re in "+esc(curP.name)+", week "+pos.week+" of "+pos.weeks+". Picking another program lets you browse it without changing that.</p>";
  if(p.levels) body+="<p class='eyebrow' style='margin:18px 0 8px'>Level</p><div class='chips'>"+p.levels.map(function(L,i){ return "<button class='chip' data-l='"+i+"' aria-pressed='"+(i===S.profile.plyoLevel)+"'>"+esc(L.name)+" · "+L.s+"×"+esc(L.r)+"</button>"; }).join("")+"</div>";
  if(p.days.length>=7) body+="<p class='eyebrow' style='margin:18px 0 8px'>Workout for "+esc(prettyDate(S.date,{weekday:"long"}))+"</p><div class='chips'>"+p.days.map(function(x,i){
    return "<button class='chip' data-w='"+i+"' aria-pressed='"+(i===wd)+"'>"+esc(x.d+" · "+x.title)+"</button>"; }).join("")+"</div>";
  body+=shiftOption();
  if(S.profile.goal){ var MT=S.profile.targets;
    body+="<p class='eyebrow' style='margin:18px 0 8px'>Your daily targets</p><div class='tgt4'><div><b>"+MT.k+"</b><span>kcal</span></div><div><b>"+MT.p+"</b><span>protein</span></div><div><b>"+MT.c+"</b><span>carbs</span></div><div><b>"+MT.f+"</b><span>fat</span></div></div>"+
      "<button class='btn ghost sm' id='recalc' style='margin-top:10px'>Update weight &amp; targets</button>";
  } else if(p.phase&&p.phase.targets){ var T=p.phase.targets;
    body+="<p class='eyebrow' style='margin:18px 0 8px'>Daily targets</p><div class='tgt4'><div><b>"+T.k+"</b><span>kcal</span></div><div><b>"+T.p+"</b><span>protein</span></div><div><b>"+T.c+"</b><span>carbs</span></div><div><b>"+T.f+"</b><span>fat</span></div></div>"+
      "<button class='btn ghost sm' id='useT' style='margin-top:10px' "+(sameTargets(T,S.profile.targets)?"disabled":"")+">"+(sameTargets(T,S.profile.targets)?"In use":"Use these targets")+"</button>"; }
  body+="<p class='eyebrow' style='margin:18px 0 8px'>Program start date</p><input class='field' type='date' id='pstart' value='"+esc(S.profile.programStart)+"'>";
  openSheet("Phase & workout",body);
  var B=$("shBody");
  B.querySelectorAll("[data-p]").forEach(function(b){ b.onclick=function(){ if(isLockedProgram(+b.dataset.p)) return; S.profile.programIdx=+b.dataset.p; S.openEx=null; persistProfile(); closeSheet(); }; });
  B.querySelectorAll("[data-l]").forEach(function(b){ b.onclick=function(){ S.profile.plyoLevel=+b.dataset.l; persistProfile(); closeSheet(); }; });
  B.querySelectorAll("[data-w]").forEach(function(b){ b.onclick=function(){ var dd=cur(); dd.wd=(+b.dataset.w===wdIndex(S.date))?null:+b.dataset.w; persistDay(S.date); S.openEx=null; closeSheet(); }; });
  var rc=$("recalc"); if(rc) rc.onclick=function(){ openOnboarding(false); };
  var shw=$("shiftWeek"); if(shw) shw.onclick=function(){ shiftWeekFrom(S.date); };
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
/* ---- progress helpers ---- */
function blockNow(){ return S.profile.goal==="lose"?"cut":(S.profile.goal==="maintain"?"maintain":((program().phase&&program().phase.block)||"build")); }
function mean(a){ var v=a.filter(function(x){ return x!=null; }); return v.length?v.reduce(function(s,x){ return s+x; },0)/v.length:null; }
function fmtD(k){ return prettyDate(k,{month:"short",day:"numeric"}); }
function sgn(n){ var v=r1(n); return (v>0?"+":v<0?"−":"")+Math.abs(v); }
function rollAvg(wts){
  return wts.map(function(w,i){ var win=[]; for(var j=Math.max(0,i-6);j<=i;j++) if(wts[j]!=null) win.push(wts[j]); return win.length?mean(win):null; });
}
/* Percent of bodyweight per week that counts as "on pace" for each phase. */
function paceBand(){ var b=blockNow(); return b==="cut"?{lo:-1.0,hi:-0.3}:b==="maintain"?{lo:-0.15,hi:0.15}:{lo:0.15,hi:0.35}; }
function bandCls(pct){
  var b=blockNow(), r=paceBand();
  if(pct>=r.lo&&pct<=r.hi) return "ok";
  if(b==="cut") return pct<r.lo||pct>0.1?"warn":"mid";
  if(b==="build") return pct>r.hi||pct<-0.05?"warn":"mid";
  return "mid";
}
function paceInfo(){
  var keys=lastKeys(28), pts=[]; keys.forEach(function(k,i){ var d=S.days[k]; if(d&&d.weight!=null) pts.push({x:i,y:d.weight}); });
  var bl=baselines();
  if(bl.length>=2){ var l2=bl.slice(-2), gap=daysBetween(l2[0].start,l2[1].start)/7; if(gap>=2) return {rate:(l2[1].avg-l2[0].avg)/gap,src:"cycle"}; }
  if(pts.length<4||pts[pts.length-1].x-pts[0].x<10) return null;
  var mx=mean(pts.map(function(p){ return p.x; })), my=mean(pts.map(function(p){ return p.y; })), nu=0, de=0;
  pts.forEach(function(p){ nu+=(p.x-mx)*(p.y-my); de+=(p.x-mx)*(p.x-mx); });
  return {rate:de?nu/de*7:0,src:"recent"};
}
function paceVerdict(p,cw){
  var T=S.profile.targets, b=blockNow(), r=paceBand();
  if(!p||!cw) return {cls:"mid",head:"Pace: not enough weigh-ins yet",msg:"Log 4 or more weigh-ins spread over about 10 days and this will tell you whether your weight is moving at the right speed."};
  var pct=p.rate/cw*100, cls=bandCls(pct), rate=sgn(p.rate)+" lb a week", head, msg;
  var a=r1(Math.abs(r.lo)/100*cw), z=r1(Math.abs(r.hi)/100*cw);
  if(b==="build"){
    if(cls==="ok"){ head="On pace: "+rate; msg="That sits inside the lean-gain range of about "+a+" to "+z+" lb a week, so most of the gain can be muscle. Keep eating to your "+T.k+" kcal and keep the lifts going up."; }
    else if(pct>r.hi){ head="Gaining fast: "+rate; msg="A lean gain is closer to "+a+" to "+z+" lb a week. Faster than that is mostly fat. Hold to your "+T.k+" kcal, and if this is still true in two weeks, trim about 100 kcal."; }
    else if(pct>=-0.05){ head="Slow: "+rate; msg="Slower than the planned build. Fine for a few weeks. If it stays flat, add about 100 kcal."; }
    else { head="Dropping: "+rate; msg="Your weight is falling in a building phase. Check you are actually reaching "+T.k+" kcal on most days."; }
  } else if(b==="cut"){
    if(cls==="ok"){ head="On pace: "+rate; msg="Inside the "+z+" to "+a+" lb a week range that protects muscle. Stay the course."; }
    else if(pct<r.lo){ head="Dropping fast: "+rate; msg="Faster than "+a+" lb a week risks muscle. Eat a little more and keep protein high."; }
    else if(pct<=0.1){ head="Barely moving: "+rate; msg="A cut should lose about "+z+" to "+a+" lb a week. Give it two weeks of steady logging before changing anything."; }
    else { head="Going up: "+rate; msg="Weight is rising during a cut. Check portions and weekend eating."; }
  } else {
    head=(cls==="ok"?"Steady: ":"Moving: ")+rate; msg=cls==="ok"?"Right where maintenance should sit.":"Drifting from maintenance. Adjust food by about 100 kcal in the opposite direction if it continues.";
  }
  var ci=cycleInfo(S.date);
  if(!ci.none&&p.src==="recent"){ var ph=phaseFor(ci.day,ci.avg,ci.mens); if(ph.k==="lut") msg+=" You are in the luteal phase, when water can add 2 to 5 lb, so judge this again after your period starts."; }
  if(p.src==="cycle") msg+=" Measured between the same phase of your last two cycles, so cycle water is already filtered out.";
  return {cls:cls,head:head,msg:msg};
}

/* ---- weight chart: 12 weeks, 7-day average, goal line, cycle bands ---- */
function weightChart(keys,wts,goal){
  var have=wts.filter(function(v){ return v!=null; });
  if(have.length<2) return "<p class='muted small' style='text-align:center;padding:20px 0;margin:0'>Log two weigh-ins and your trend line appears here.<br>Same time each morning works best.</p>";
  var roll=rollAvg(wts), W=480,H=200,L=38,R=10,T=16,B=26,iw=W-L-R,ih=H-T-B;
  var lo=Math.min.apply(null,have), hi=Math.max.apply(null,have); if(goal){ lo=Math.min(lo,goal); hi=Math.max(hi,goal); }
  var pad=Math.max((hi-lo)*.12,.8); lo-=pad; hi+=pad;
  function X(i){ return L+(i/(keys.length-1))*iw; } function Y(v){ return T+ih-((v-lo)/(hi-lo))*ih; }
  var step=iw/(keys.length-1), s="<svg viewBox='0 0 "+W+" "+H+"' role='img' aria-label='Bodyweight over 12 weeks with 7 day average'>";
  cycleBands(keys).forEach(function(b){ var x=Math.max(L,X(b.start)-step/2), w=Math.min((b.end-b.start+1)*step,W-R-x); s+="<rect x='"+x.toFixed(1)+"' y='"+T+"' width='"+w.toFixed(1)+"' height='"+ih+"' fill='var(--m-fat)' opacity='"+(b.k==="mens"?.2:.08)+"'/>"; });
  [0,1,2,3].forEach(function(n){ var v=lo+(hi-lo)*n/3; s+="<line x1='"+L+"' x2='"+(W-R)+"' y1='"+Y(v).toFixed(1)+"' y2='"+Y(v).toFixed(1)+"' stroke='var(--border)'/><text x='"+(L-6)+"' y='"+(Y(v)+3.5).toFixed(1)+"' text-anchor='end' font-size='9' fill='var(--text-3)'>"+r1(v)+"</text>"; });
  if(goal) s+="<line x1='"+L+"' x2='"+(W-R)+"' y1='"+Y(goal).toFixed(1)+"' y2='"+Y(goal).toFixed(1)+"' stroke='var(--accent-deep)' stroke-width='1.5' stroke-dasharray='5 3'/><text x='"+(W-R)+"' y='"+(Y(goal)-5).toFixed(1)+"' text-anchor='end' font-size='9.5' font-weight='600' fill='var(--accent-deep)'>GOAL "+r1(goal)+"</text>";
  var rp=[]; roll.forEach(function(v,i){ if(v!=null) rp.push({i:i,v:v}); });
  if(rp.length>1){
    var line=rp.map(function(p,i){ return (i?"L":"M")+X(p.i).toFixed(1)+" "+Y(p.v).toFixed(1); }).join(" ");
    s+="<path d='"+line+" L"+X(rp[rp.length-1].i).toFixed(1)+" "+(T+ih)+" L"+X(rp[0].i).toFixed(1)+" "+(T+ih)+" Z' fill='var(--accent)' opacity='.12'/>";
    s+="<path d='"+line+"' fill='none' stroke='var(--accent)' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'/>";
  }
  wts.forEach(function(v,i){ if(v!=null) s+="<circle cx='"+X(i).toFixed(1)+"' cy='"+Y(v).toFixed(1)+"' r='2.4' fill='var(--text-3)' opacity='.7'/>"; });
  var last=rp[rp.length-1];
  if(last) s+="<circle cx='"+X(last.i).toFixed(1)+"' cy='"+Y(last.v).toFixed(1)+"' r='5' fill='var(--accent)' stroke='var(--surface)' stroke-width='2'/><text x='"+(X(last.i)-9).toFixed(1)+"' y='"+(Y(last.v)-11).toFixed(1)+"' text-anchor='end' font-size='12' font-weight='700' fill='var(--accent-deep)'>"+r1(last.v)+"</text>";
  var mid=Math.floor(keys.length/2);
  s+="<text x='"+L+"' y='"+(H-6)+"' font-size='9' fill='var(--text-3)'>"+fmtD(keys[0])+"</text><text x='"+X(mid).toFixed(1)+"' y='"+(H-6)+"' text-anchor='middle' font-size='9' fill='var(--text-3)'>"+fmtD(keys[mid])+"</text><text x='"+(W-R)+"' y='"+(H-6)+"' text-anchor='end' font-size='9' fill='var(--text-3)'>"+fmtD(keys[keys.length-1])+"</text>";
  return s+"</svg>";
}
function weekRows(n){
  var mon=mondayOf(S.date), rows=[];
  for(var i=n-1;i>=0;i--){
    var st=shiftKey(mon,-7*i), v=[];
    for(var d=0;d<7;d++){ var k=shiftKey(st,d); if(k>S.date) break; var dd=S.days[k]; if(dd&&dd.weight!=null) v.push(dd.weight); }
    rows.push({start:st,avg:mean(v),n:v.length});
  }
  var prev=null; rows.forEach(function(r){ r.delta=(r.avg!=null&&prev!=null)?r.avg-prev:null; if(r.avg!=null) prev=r.avg; });
  return rows;
}
function weekList(cw){
  var rows=weekRows(8), avs=rows.map(function(r){ return r.avg; }).filter(function(v){ return v!=null; });
  if(avs.length<2) return "";
  var lo=Math.min.apply(null,avs), hi=Math.max.apply(null,avs), span=Math.max(hi-lo,.5);
  return rows.slice().reverse().map(function(r,i){
    var w=r.avg==null?0:22+((r.avg-lo)/span)*70, cls=r.delta==null?"":bandCls(r.delta/(cw||r.avg)*100);
    return "<div class='wkrow'><span class='wl'>"+(i===0?"This week":fmtD(r.start))+"</span><span class='wb'><i class='"+cls+"' style='width:"+w.toFixed(0)+"%'></i></span><span class='wv'>"+(r.avg==null?"—":r1(r.avg))+"</span><span class='wd "+cls+"'>"+(r.delta==null?"":sgn(r.delta))+"</span></div>";
  }).join("");
}

/* ---- cycle: history, prediction, weight by phase ---- */
function cycleList(){
  var st=periodStarts(); return st.map(function(s,i){ var nx=st[i+1]; return {start:s,len:nx?daysBetween(s,nx):null,bleed:bleedLen(s),cur:!nx}; });
}
function cycleBar(ci){
  var avg=ci.avg||28, L=Math.max(avg,ci.day), W=480, bw=W/L, s="<svg viewBox='0 0 "+W+" 50' role='img' aria-label='Where you are in your cycle'>";
  for(var d=1;d<=L;d++){
    var ph=phaseFor(d,avg,ci.mens), f=ph.k==="mens"?"var(--m-fat)":ph.k==="foll"?"var(--accent)":ph.k==="ovul"?"var(--m-carb)":"var(--m-fat)", o=ph.k==="mens"?.85:ph.k==="foll"?.35:ph.k==="ovul"?.95:.28;
    s+="<rect x='"+((d-1)*bw+.5).toFixed(1)+"' y='20' width='"+(bw-1).toFixed(1)+"' height='16' rx='2' fill='"+f+"' opacity='"+o+"'/>";
  }
  var mx=(ci.day-.5)*bw, ax=Math.min(Math.max(mx,28),W-28);
  s+="<path d='M"+(mx-5).toFixed(1)+" 10 L"+(mx+5).toFixed(1)+" 10 L"+mx.toFixed(1)+" 18 Z' fill='var(--text)'/><text x='"+ax.toFixed(1)+"' y='7' text-anchor='middle' font-size='10' font-weight='700' fill='var(--text)'>Day "+ci.day+"</text>";
  s+="<text x='0' y='48' font-size='9' fill='var(--text-3)'>Day 1</text><text x='"+W+"' y='48' text-anchor='end' font-size='9' fill='var(--text-3)'>Day "+L+"</text>";
  return s+"</svg>";
}
function cycleWeight(){
  var ci=cycleInfo(S.date); if(ci.none) return null;
  var L=ci.avg||28, groups={mens:[],foll:[],ovul:[],lut:[]}, curves=[];
  ci.starts.forEach(function(s,idx){
    var nx=ci.starts[idx+1], mens=bleedLen(s), span=nx?daysBetween(s,nx):daysBetween(s,S.date)+1;
    if(span<1||(nx&&(span<18||span>45))) return;
    var pts=[]; for(var d=1;d<=Math.min(span,L+10);d++){ var dd=S.days[shiftKey(s,d-1)]; if(dd&&dd.weight!=null) pts.push({d:d,w:dd.weight}); }
    if(pts.length<3) return;
    var rw=refWindow(L,mens), ref=pts.filter(function(p){ return p.d>=rw.lo&&p.d<=rw.hi; }).map(function(p){ return p.w; });
    var base=mean(ref.length?ref:pts.map(function(p){ return p.w; })), cp=[];
    pts.forEach(function(p){ groups[phaseFor(p.d,L,mens).k].push(p.w-base); cp.push({d:p.d,dev:p.w-base}); });
    curves.push({start:s,pts:cp,cur:!nx});
  });
  if(!curves.length) return null;
  return {L:L,mens:ci.mens,groups:groups,curves:curves.slice(-3)};
}
function cycleWeightChart(cw){
  var W=480,H=170,L=34,R=8,T=12,B=22,iw=W-L-R,ih=H-T-B, maxD=cw.L+3, m=1;
  cw.curves.forEach(function(c){ c.pts.forEach(function(p){ m=Math.max(m,Math.abs(p.dev)); }); }); m=Math.ceil(m*1.15);
  function X(d){ return L+((d-1)/(maxD-1))*iw; } function Y(v){ return T+ih/2-(v/m)*(ih/2); }
  var s="<svg viewBox='0 0 "+W+" "+H+"' role='img' aria-label='Weight change by cycle day'>", bw=iw/(maxD-1), runs=[], run=null;
  for(var d=1;d<=maxD;d++){
    var k=phaseFor(d,cw.L,cw.mens).k; if(k!=="lut"&&k!=="mens"){ run=null; continue; }
    if(run&&run.k===k) run.e=d; else { run={k:k,s:d,e:d}; runs.push(run); }
  }
  runs.forEach(function(r){ var x=Math.max(L,X(r.s)-bw/2); s+="<rect x='"+x.toFixed(1)+"' y='"+T+"' width='"+Math.min((r.e-r.s+1)*bw,W-R-x).toFixed(1)+"' height='"+ih+"' fill='var(--m-fat)' opacity='"+(r.k==="mens"?.2:.08)+"'/>"; });
  [-m,0,m].forEach(function(v){ s+="<line x1='"+L+"' x2='"+(W-R)+"' y1='"+Y(v).toFixed(1)+"' y2='"+Y(v).toFixed(1)+"' stroke='"+(v===0?"var(--border-strong)":"var(--border)")+"' "+(v===0?"stroke-dasharray='4 3'":"")+"/><text x='"+(L-6)+"' y='"+(Y(v)+3.5).toFixed(1)+"' text-anchor='end' font-size='9' fill='var(--text-3)'>"+(v>0?"+":"")+v+"</text>"; });
  cw.curves.forEach(function(c,i){
    var col=c.cur?"var(--accent)":"var(--text-3)", op=c.cur?1:(.45+.2*i);
    if(c.pts.length>1) s+="<path d='"+c.pts.map(function(p,j){ return (j?"L":"M")+X(p.d).toFixed(1)+" "+Y(p.dev).toFixed(1); }).join(" ")+"' fill='none' stroke='"+col+"' stroke-width='"+(c.cur?2.6:1.8)+"' stroke-linecap='round' stroke-linejoin='round' opacity='"+op+"'/>";
    c.pts.forEach(function(p){ s+="<circle cx='"+X(p.d).toFixed(1)+"' cy='"+Y(p.dev).toFixed(1)+"' r='"+(c.cur?2.8:1.8)+"' fill='"+col+"' opacity='"+op+"'/>"; });
  });
  s+="<text x='"+L+"' y='"+(H-6)+"' font-size='9' fill='var(--text-3)'>Day 1</text><text x='"+X(cw.L).toFixed(1)+"' y='"+(H-6)+"' text-anchor='middle' font-size='9' fill='var(--text-3)'>Day "+cw.L+"</text>";
  return s+"</svg>";
}
var PH_NAMES={mens:"Period",foll:"After your period",ovul:"Ovulation",lut:"Before your period"};
function phaseRows(cw){
  var m=1; Object.keys(cw.groups).forEach(function(k){ var a=mean(cw.groups[k]); if(a!=null) m=Math.max(m,Math.abs(a)); });
  return ["mens","foll","ovul","lut"].map(function(k){
    var a=mean(cw.groups[k]); if(a==null) return "<div class='phrow'><span class='pl'>"+PH_NAMES[k]+"</span><span class='pt'></span><span class='pv muted'>no data</span></div>";
    var w=Math.abs(a)/m*50;
    return "<div class='phrow'><span class='pl'>"+PH_NAMES[k]+"</span><span class='pt'><i style='"+(a>=0?"left:50%":"right:50%")+";width:"+w.toFixed(1)+"%'></i></span><span class='pv'>"+sgn(a)+" lb</span></div>";
  }).join("");
}
function logPeriodRange(start,n){
  var t=todayKey(); for(var i=0;i<n;i++){ var k=shiftKey(start,i); if(k>t) break; day(k).period=true; persistDay(k); }
}
function clearPeriod(start){
  var k=start; while(S.days[k]&&S.days[k].period){ S.days[k].period=false; persistDay(k); k=shiftKey(k,1); }
}

/* ---- goal weight + body fat ---- */
function goalCard(cw){
  var P=S.profile, gw=P.goalWeight, h="<div class='card'><h3 class='h2' style='font-size:18px'>Your goal</h3>";
  if(!gw){
    return h+"<p class='muted small' style='margin:6px 0 12px'>Set the weight and body-fat range you are working toward. This tab will then show how far you have come and what weight fits your body-fat goal.</p><button class='btn' id='goalBtn'>Set my goal</button></div>";
  }
  var range=(P.goalBfLo&&P.goalBfHi)?P.goalBfLo+"–"+P.goalBfHi+"%":"—";
  h+="<div class='tgt4' style='grid-template-columns:repeat(3,1fr)'><div><b>"+r1(gw)+"</b><span>goal lb</span></div><div><b>"+range+"</b><span>body fat</span></div><div><b>"+(cw?Math.max(0,r1(cw-gw)):"—")+"</b><span>lb to go</span></div></div>";
  if(P.bf&&cw){
    var lean=cw*(1-P.bf/100), bfg=(1-lean/gw)*100;
    h+="<p class='small' style='margin:12px 0 0'>Right now you are about <b>"+r1(lean)+" lb lean</b> and <b>"+r1(cw-lean)+" lb fat</b> ("+P.bf+"%).</p>"+
       "<p class='small' style='margin:6px 0 0'>If you keep all your muscle, "+r1(gw)+" lb works out to about <b>"+r1(bfg)+"% body fat</b>.</p>";
    if(P.goalBfLo&&P.goalBfHi) h+="<p class='small' style='margin:6px 0 0'>With today's muscle, "+P.goalBfLo+"–"+P.goalBfHi+"% lands at <b>"+r1(lean/(1-P.goalBfLo/100))+"–"+r1(lean/(1-P.goalBfHi/100))+" lb</b>. Build muscle first and that number rises.</p>";
    h+="<p class='muted small' style='margin:10px 0 0'>Estimates only. Body-fat readings are usually off by a few points, so use the same method each time.</p>";
  } else h+="<p class='muted small' style='margin:12px 0 0'>Add your current body-fat % to see how much of your weight is muscle and which weight fits your range.</p>";
  return h+"<button class='btn ghost sm' id='goalBtn' style='margin-top:12px'>Edit goal</button></div>";
}
function openGoals(){
  var P=S.profile;
  function f(id,label,val,ph){ return "<div><label class='eyebrow' for='"+id+"' style='display:block;margin:0 0 6px'>"+label+"</label><input class='field' id='"+id+"' type='number' step='0.1' inputmode='decimal' placeholder='"+ph+"' value='"+esc(val==null?"":val)+"'></div>"; }
  openSheet("Your goal",
    "<div style='display:grid;gap:14px'>"+f("gw","Goal weight (lb)",P.goalWeight,"e.g. 135")+f("gbf","Current body fat % (optional)",P.bf,"e.g. 22")+
    "<div style='display:grid;grid-template-columns:1fr 1fr;gap:10px'>"+f("glo","Goal body fat, low %",P.goalBfLo,"e.g. 15")+f("ghi","high %",P.goalBfHi,"e.g. 17")+"</div></div>"+
    "<p class='muted small' style='margin:14px 0 0'>Leave a field empty to clear it.</p>",
    "<button class='btn ghost' id='gx' style='flex:0 0 36%'>Cancel</button><button class='btn' id='gs'>Save goal</button>");
  $("gx").onclick=closeSheet;
  $("gs").onclick=function(){
    var gw=num($("gw").value), bf=num($("gbf").value), lo=num($("glo").value), hi=num($("ghi").value);
    if(gw!=null&&(gw<70||gw>400)){ toast("Goal weight should be between 70 and 400 lb"); return; }
    if((bf!=null&&(bf<3||bf>60))||(lo!=null&&(lo<3||lo>60))||(hi!=null&&(hi<3||hi>60))){ toast("Body fat should be between 3 and 60 %"); return; }
    if(lo!=null&&hi!=null&&lo>hi){ var t=lo; lo=hi; hi=t; }
    P.goalWeight=gw; P.bf=bf; P.goalBfLo=lo; P.goalBfHi=hi; persistProfile(); closeSheet(); toast("Goal saved");
  };
}

function card(title,sub,inner,cls){ return "<div class='card"+(cls?" "+cls:"")+"'><h3 class='h2' style='font-size:18px'>"+title+"</h3>"+(sub?"<p class='cap'>"+sub+"</p>":"")+inner+"</div>"; }
function renderTrend(){
  var keys=lastKeys(21), T=S.profile.targets, P=S.profile, d=cur();
  var kc=keys.map(function(k){ return S.days[k]?totals(k).k:null; }), pr=keys.map(function(k){ return S.days[k]?totals(k).p:null; });
  var wk=lastKeys(84), wt=wk.map(function(k){ return S.days[k]&&day(k).weight!=null?day(k).weight:null; });
  var roll=rollAvg(wt), cwv=null; for(var i=roll.length-1;i>=0;i--){ if(roll[i]!=null){ cwv=roll[i]; break; } }
  var firstW=null; wt.some(function(v){ if(v!=null){ firstW=v; return true; } return false; });
  var peak=Math.max.apply(null,roll.filter(function(v){ return v!=null; }).concat([0]));
  var pace=paceInfo(), pv=paceVerdict(pace,cwv), rows=weekRows(2), wkDelta=rows[1]&&rows[1].delta;
  var h="";

  /* 1. where you are */
  h+="<div class='card hero-w'><div class='eyebrow'>Your weight, 7-day average</div><div class='big-w'>"+(cwv!=null?r1(cwv):"—")+"<small> lb</small></div>"+
     "<div class='mini3'><div><b>"+(cwv!=null&&firstW!=null?sgn(cwv-firstW):"—")+"</b><span>since your first weigh-in</span></div>"+
     "<div><b>"+(wkDelta!=null?sgn(wkDelta):"—")+"</b><span>this week vs last</span></div>"+
     "<div><b>"+(P.goalWeight?r1(P.goalWeight):"—")+"</b><span>goal</span></div></div>";
  if(P.goalWeight&&cwv!=null&&peak>P.goalWeight){
    var pct=Math.max(0,Math.min(1,(peak-cwv)/(peak-P.goalWeight)));
    h+="<div class='goalbar'><div class='gtrack'><i style='width:"+(pct*100).toFixed(0)+"%'></i></div><div class='gcap'><span>"+(pct>0?r0(pct*100)+"% of the way down from your highest ("+r1(peak)+")":"Counting down from your highest weight ("+r1(peak)+")")+"</span><span>"+r1(Math.max(0,cwv-P.goalWeight))+" lb to go</span></div></div>";
  }
  h+="<div class='note "+pv.cls+"' style='margin-top:14px'><b style='display:block;margin-bottom:3px'>"+esc(pv.head)+"</b>"+esc(pv.msg)+"</div>"+
     "<div class='wtform'><input class='field' id='wtIn' type='number' step='0.1' inputmode='decimal' placeholder='Weigh-in for "+esc(S.date===todayKey()?"today":fmtD(S.date))+" (lb)' value='"+(d.weight!=null?d.weight:"")+"' aria-label='Weigh-in in pounds'><button class='btn' id='wtSave'>Log</button></div></div>";

  /* 2. weight chart */
  h+=card("Weight, last 12 weeks","The green line is your 7-day average, which smooths out daily water swings. Dots are single weigh-ins. Pink bands are your period and the days before it.",weightChart(wk,wt,P.goalWeight),"chartcard");
  var wl=weekList(cwv);
  if(wl) h+=card("Week by week","Average weight each week and the change from the week before. Green means that change fits your current phase.",wl);

  /* 3. cycle */
  var ci=cycleInfo(S.date), cyc="";
  var logRow="<div class='logper'><div><label class='eyebrow' for='lpS'>Period started</label><input class='field' id='lpS' type='date' max='"+todayKey()+"' value='"+S.date+"'></div><div><label class='eyebrow' for='lpN'>Days</label><input class='field' id='lpN' type='number' min='1' max='10' value='5' inputmode='numeric'></div><button class='btn' id='lpGo'>Add</button></div>"+
     "<button class='toggle' id='periodBtn' aria-pressed='"+!!d.period+"'><span class='dot'></span><span>"+(d.period?"Period logged on this day":"Period on this day")+"</span></button>";
  if(ci.none){
    cyc="<p class='muted small' style='margin:0 0 12px'>Add the first day of your last period, and how many days it lasted. After two periods you will see your cycle length, your next expected period, and how your weight moves through the month.</p>"+logRow;
  } else {
    var ph=phaseFor(ci.day,ci.avg,ci.mens), avg=ci.avg||28, due=daysBetween(S.date,shiftKey(ci.last,avg)), rw=refWindow(ci.avg,ci.mens), note;
    if(ph.k==="lut") note="Progesterone is high, so you hold more water. A scale reading 2 to 5 lb up is normal and is not fat. Hold your calories and judge your weight again after your period starts.";
    else if(ph.k==="mens") note="Water retained before your period usually clears over the next few days, so weigh-ins from here often read lower with nothing changed.";
    else if(ph.k==="foll") note=(ci.day>=rw.lo&&ci.day<=rw.hi)?"These are your cleanest weigh-ins of the month (days "+rw.lo+" to "+rw.hi+"). Compare these from cycle to cycle.":"Your cleanest weigh-ins come on days "+rw.lo+" to "+rw.hi+" of your cycle.";
    else note="Around ovulation a small water shift is common.";
    var dueTxt=due>0?due+" day"+(due===1?"":"s"):(due===0?"today":Math.abs(due)+" late");
    var cl=cycleList(), lens=cl.filter(function(c){ return c.len&&c.len>=18&&c.len<=45; }).map(function(c){ return c.len; });
    var mn=lens.length?Math.min.apply(null,lens):null, mxl=lens.length?Math.max.apply(null,lens):null, reg=lens.length>=2?(mxl-mn<=4?"Regular":(mxl-mn<=7?"Slightly variable":"Variable")):null;
    cyc="<div class='cyc3'><div><div class='eyebrow'>Cycle day</div><div class='v'>"+ci.day+"</div></div><div><div class='eyebrow'>Next period</div><div class='v'>"+dueTxt+"</div></div><div><div class='eyebrow'>Average cycle</div><div class='v'>"+(ci.avg?ci.avg+" d":"—")+"</div></div></div>"+
      cycleBar(ci)+"<div class='legend'><span><i style='background:var(--m-fat);opacity:.85'></i>Period</span><span><i style='background:var(--accent);opacity:.35'></i>After period</span><span><i style='background:var(--m-carb)'></i>Ovulation</span><span><i style='background:var(--m-fat);opacity:.28'></i>Before period</span></div>"+
      "<span class='pill'>"+ph.n+"</span><p class='muted small' style='margin:10px 0 14px'>"+esc(note)+"</p>"+
      "<p class='small' style='margin:0 0 14px'>Next period expected around <b>"+fmtD(shiftKey(ci.last,avg))+"</b>"+(ci.avg?"":" (a 28-day guess until you log a second period)")+".</p>"+
      "<h4 class='sub-h'>Your cycles"+(mn!=null?" · "+(mn===mxl?mn+" days":mn+"–"+mxl+" days")+(reg?" · "+reg:""):"")+"</h4>"+
      cl.slice().reverse().slice(0,8).map(function(c){
        var odd=c.len&&(c.len<18||c.len>45);
        return "<div class='cyrow'><span class='cd'>"+fmtD(c.start)+"</span><span class='cl'>"+(c.cur?"Day "+ci.day+" so far":c.len+" days"+(odd?" (not counted)":""))+"</span><span class='cb'>period "+c.bleed+" day"+(c.bleed===1?"":"s")+"</span><button class='linkbtn' data-rm='"+c.start+"' aria-label='Remove period from "+esc(fmtD(c.start))+"'>Remove</button></div>";
      }).join("")+
      "<h4 class='sub-h' style='margin-top:16px'>Add a period</h4>"+logRow;
  }
  h+=card("Your cycle","How long your cycles run, when the next one is due, and where you are in the month.",cyc);

  /* 4. cycle and weight */
  var cwx=cycleWeight(), bl=baselines(), cwTxt="";
  if(cwx){
    var lutA=mean(cwx.groups.lut), folA=mean(cwx.groups.foll), msg;
    if(lutA!=null&&folA!=null){ var diff=lutA-folA; msg=Math.abs(diff)<.6?"So far your weight barely changes with your cycle, which makes any steady climb easier to trust.":"Your weight runs about <b>"+r1(Math.abs(diff))+" lb "+(diff>0?"higher":"lower")+"</b> in the days before your period than in the days after it. "+(diff>0?"That is water, not fat, and it drops back once your period starts.":"Keep logging to confirm the pattern."); }
    else msg="Keep weighing in through the days before your next period. Once there is data for both halves of the month, this will tell you how much your cycle moves your weight.";
    cwTxt="<p class='small' style='margin:0 0 12px'>"+msg+"</p>"+phaseRows(cwx)+"<p class='cap' style='margin:12px 0 6px'>Each line is one cycle, measured against that cycle's own baseline. The green line is the current cycle.</p>"+cycleWeightChart(cwx);
  } else cwTxt="<p class='muted small' style='margin:0'>"+(ci.none?"Log your periods above first. ":"")+"This fills in once you have at least 3 weigh-ins inside a logged cycle. Weighing most mornings gives the clearest picture.</p>";
  if(bl.length) cwTxt+="<h4 class='sub-h' style='margin-top:16px'>Same-phase baseline</h4><p class='cap' style='margin:0 0 6px'>Your average weight in the same part of each cycle. This is the fairest progress number.</p><table class='bltab'><tbody>"+bl.map(function(r,i){ var dl=i?r.avg-bl[i-1].avg:null, bc=dl==null?"":bandCls(dl/r.avg*100/(daysBetween(bl[i-1].start,r.start)/7||4)); return "<tr><td>"+esc(fmtD(r.start))+"</td><td style='text-align:right'>"+r1(r.avg)+" lb</td><td style='text-align:right;color:"+(bc==="warn"?"var(--warn)":bc==="ok"?"var(--good)":"inherit")+"'>"+(dl==null?"—":sgn(dl))+"</td></tr>"; }).join("")+"</tbody></table>";
  h+=card("How your cycle moves your weight","Weight compared with each cycle's baseline, split by part of the month.",cwTxt);

  /* 5. goal */
  h+=goalCard(cwv);

  /* 6. eating */
  var logged=kc.filter(function(v){ return v>0; }), within=logged.filter(function(v){ return Math.abs(v-T.k)/T.k<=.1; }).length;
  var lp=pr.filter(function(v){ return v>0; }), avgK=mean(logged), avgP=mean(lp);
  h+="<div class='stats' style='margin-top:12px'><div class='stat'><div class='eyebrow'>Avg kcal</div><div class='v'>"+(logged.length?r0(avgK):"—")+"</div><div class='u'>"+(logged.length?"of "+T.k:"no days logged")+"</div></div>"+
     "<div class='stat'><div class='eyebrow'>Avg protein</div><div class='v'>"+(lp.length?r0(avgP):"—")+"</div><div class='u'>"+(lp.length?"of "+T.p+" g":"no days logged")+"</div></div>"+
     "<div class='stat'><div class='eyebrow'>On target</div><div class='v'>"+(logged.length?within+"/"+logged.length:"—")+"</div><div class='u'>days within 10%</div></div></div>";
  h+=card("Calories vs target","Last 3 weeks. The dashed line is your daily target. Faded bars fell more than 10% short.",barChart(keys,kc,T.k,"var(--m-kcal)"),"chartcard")+
     card("Protein vs target","Hitting protein is the most protective habit while building. Over is fine.",barChart(keys,pr,T.p,"var(--m-pro)"),"chartcard");
  h+="<div class='card'><h3 class='h2' style='font-size:18px'>Daily targets</h3><div class='tgt4'><div><b>"+T.k+"</b><span>kcal</span></div><div><b>"+T.p+"</b><span>protein</span></div><div><b>"+T.c+"</b><span>carbs</span></div><div><b>"+T.f+"</b><span>fat</span></div></div><p class='muted small' style='margin:10px 0 0'>"+(P.goal?"Set from your weight and goal. You can change the calories to any number you like.":"Set by your phase. Change them from the phase button on Train.")+"</p>"+(P.goal?"<button class='btn ghost sm' id='recalcT' style='margin-top:10px'>Update weight &amp; targets</button>":"")+"</div>"+
     "<p class='foot' id='syncNote'></p><p class='foot'><button class='linkbtn' id='signOut'>Sign out</button></p>";
  $("panel-trend").innerHTML=h;

  var save=function(){ var v=num($("wtIn").value); if(v==null) return; cur().weight=v; persistDay(S.date); renderTrend(); toast("Weight saved"); };
  $("wtSave").onclick=save; $("wtIn").onkeydown=function(e){ if(e.key==="Enter"){ e.preventDefault(); save(); } };
  var rct=$("recalcT"); if(rct) rct.onclick=function(){ openOnboarding(false); };
  var gb=$("goalBtn"); if(gb) gb.onclick=openGoals;
  $("periodBtn").onclick=function(){ var dd=cur(); dd.period=!dd.period; persistDay(S.date); renderTrend(); };
  var lg=$("lpGo"); if(lg) lg.onclick=function(){
    var s=$("lpS").value, n=Math.round(num($("lpN").value)||0);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||s>todayKey()){ toast("Pick a start date that is today or earlier"); return; }
    if(n<1||n>10){ toast("Period length should be 1 to 10 days"); return; }
    logPeriodRange(s,n); renderTrend(); toast("Period added");
  };
  $("panel-trend").querySelectorAll("[data-rm]").forEach(function(b){ b.onclick=function(){ clearPeriod(b.dataset.rm); renderTrend(); toast("Period removed"); }; });
  $("signOut").onclick=function(){ if(DEV) return; supabaseClient.auth.signOut().then(function(){ location.reload(); }); };
  var dot=$("syncdot"); $("syncNote").textContent=dot.title||"";
}
/* ================= welcome: weight + goal -> daily targets ================= */
/* Starting estimates from bodyweight alone (calories per lb of bodyweight, protein per lb, 27% of
   calories from fat, the rest carbs). A coach can fine-tune these. */
var GOALS={
  lose:    {label:"Lose weight",  mult:12,   protein:0.9, blurb:"A moderate deficit that keeps protein high so you lose fat, not muscle."},
  maintain:{label:"Maintain",     mult:14.5, protein:0.8, blurb:"Roughly your maintenance calories."},
  build:   {label:"Build muscle", mult:16,   protein:1.0, blurb:"A small surplus with plenty of protein."}
};
function calcTargets(w,goal,kOverride,pOverride){
  var g=GOALS[goal]||GOALS.lose;
  var k=kOverride?Math.round(kOverride):Math.max(1400,Math.min(3500,Math.round(w*g.mult/10)*10));
  var p=pOverride?Math.round(pOverride):Math.round(w*g.protein/5)*5, f=Math.round(k*0.27/9/5)*5;
  var c=Math.max(0,Math.round((k-p*4-f*9)/4/5)*5);
  return {k:k,p:p,c:c,f:f};
}
function openOnboarding(first){
  var goal=S.profile.goal||"lose", w=lastWeightLb()&&S.days&&Object.keys(S.days).some(function(k){ return S.days[k]&&S.days[k].weight!=null; })?lastWeightLb():"";
  var body="<p class='muted' style='margin:0 0 14px'>"+(first?"Welcome! Let’s set your daily targets so Plate Count can guide your food each day.":"Update your weight and Plate Count will recalculate your daily targets.")+"</p>"+
    "<label class='eyebrow' for='ow' style='display:block;margin-bottom:6px'>Your weight today (lb)</label>"+
    "<input class='field' id='ow' type='number' inputmode='decimal' step='0.1' placeholder='e.g. 165' value='"+esc(w)+"' style='margin-bottom:14px'>"+
    "<label class='eyebrow' for='ok' style='display:block;margin-bottom:6px'>Daily calories (change it to any number you like)</label>"+
    "<input class='field' id='ok' type='number' inputmode='numeric' step='10' placeholder='Worked out from your weight' value='"+(first?"":esc(S.profile.targets.k))+"' style='margin-bottom:14px'>"+
    "<label class='eyebrow' for='op' style='display:block;margin-bottom:6px'>Daily protein in grams (change it to any number you like)</label>"+
    "<input class='field' id='op' type='number' inputmode='numeric' step='5' placeholder='Worked out from your weight' value='"+(first?"":esc(S.profile.targets.p))+"' style='margin-bottom:14px'>"+
    "<p class='eyebrow' style='margin:0 0 8px'>Your goal</p><div class='chips' id='og'>"+Object.keys(GOALS).map(function(k){
      return "<button class='chip' type='button' data-g='"+k+"' aria-pressed='"+(k===goal)+"'>"+GOALS[k].label+"</button>"; }).join("")+"</div>"+
    "<p class='muted small' id='oblurb' style='margin:8px 0 0'></p><div id='oprev'></div>"+
    "<p class='muted small' style='margin:14px 0 0'>These are starting estimates, not medical advice. Your coach can fine-tune them, and you can update them any time.</p>";
  openSheet(first?"Welcome to Plate Count":"Update weight & targets",body,
    "<button class='btn ghost' id='oskip' style='flex:0 0 36%'>"+(first?"Later":"Cancel")+"</button><button class='btn' id='osave'>Set my targets</button>");
  var inp=$("ow"), kin=$("ok"), pin=$("op"), kEdited=!first&&!!kin.value, pEdited=!first&&!!pin.value;
  kin.oninput=function(){ kEdited=!!kin.value; calc(); };
  pin.oninput=function(){ pEdited=!!pin.value; calc(); };
  function calc(){
    var wt=num(inp.value), ko=kEdited?num(kin.value):null, po=pEdited?num(pin.value):null;
    if(ko!=null&&(ko<1000||ko>5000)) ko=null; if(po!=null&&(po<30||po>500)) po=null;
    var T=wt&&wt>=70&&wt<=600?calcTargets(wt,goal,ko,po):null;
    if(T&&!kEdited) kin.placeholder="Suggested: "+calcTargets(wt,goal).k;
    if(T&&!pEdited) pin.placeholder="Suggested: "+calcTargets(wt,goal).p;
    $("oblurb").textContent=GOALS[goal].blurb;
    $("oprev").innerHTML=T?"<div class='tgt4' style='margin-top:14px'><div><b>"+T.k+"</b><span>kcal</span></div><div><b>"+T.p+"</b><span>protein</span></div><div><b>"+T.c+"</b><span>carbs</span></div><div><b>"+T.f+"</b><span>fat</span></div></div>":"";
    $("osave").disabled=!T; return T;
  }
  $("og").querySelectorAll(".chip").forEach(function(b){ b.onclick=function(){
    goal=b.dataset.g; $("og").querySelectorAll(".chip").forEach(function(o){ o.setAttribute("aria-pressed",o===b?"true":"false"); }); calc(); }; });
  inp.oninput=calc; calc();
  setTimeout(function(){ try{ inp.focus(); }catch(e){} },80);
  $("oskip").onclick=closeSheet;
  $("osave").onclick=function(){
    var T=calc(), wt=num(inp.value); if(!T) return;
    S.profile.targets=T; S.profile.goal=goal; S.profile.onboarded=true;
    var td=todayKey(); day(td).weight=wt; persistDay(td);
    persistProfile(); closeSheet(); toast("Targets set: "+T.k+" kcal · "+T.p+" g protein");
  };
}
function maybeOnboard(){
  var legacy=S.profile.onboarded===undefined&&Object.keys(S.days).some(function(k){ return k<todayKey()&&hasActivity(k); });
  if(S.profile.onboarded===true||legacy) return;
  if($("scrim").hidden) openOnboarding(true);
}

/* ================= boot ================= */
/* Sign-in lives inside the app, so an installed (home-screen) copy stays inside its own window and
   its own saved login. The session is stored on the device and refreshed automatically, so you
   sign in once and every launch opens straight to Plate Count. */
function showLogin(){
  return new Promise(function(resolve){
    document.body.classList.add("loggedout");
    document.body.style.visibility="visible";
    var box=document.createElement("div"); box.className="loginwrap"; box.id="loginBox";
    box.innerHTML="<div class='card' style='margin-top:56px'>"+
      "<div class='eyebrow'>Tenfold Method</div><h1 class='h2' style='font-size:30px;margin:2px 0 6px'>Plate Count</h1>"+
      "<p class='muted' style='margin:0 0 16px'>Sign in with your Tenfold portal login. You'll stay signed in on this device.</p>"+
      "<form id='lf' novalidate>"+
      "<label class='sr' for='le'>Email</label><input class='field' id='le' type='email' inputmode='email' autocomplete='username' autocapitalize='off' autocorrect='off' placeholder='Email' style='margin-bottom:10px'>"+
      "<label class='sr' for='lp'>Password</label><input class='field' id='lp' type='password' autocomplete='current-password' placeholder='Password' style='margin-bottom:10px'>"+
      "<p class='err' id='lerr' role='alert' hidden></p>"+
      "<button class='btn' id='lgo' type='submit'>Sign in</button></form>"+
      "<p class='foot' style='margin-top:18px'><a href='../reset-password.html'>Forgot password?</a> &nbsp;·&nbsp; <a href='../membership.html'>Not a member yet?</a></p></div>";
    document.body.appendChild(box);
    var f=$("lf"), err=$("lerr"), go=$("lgo");
    f.onsubmit=function(e){
      e.preventDefault();
      var em=$("le").value.trim().toLowerCase(), pw=$("lp").value;
      if(!em||!pw){ err.textContent="Enter your email and password."; err.hidden=false; return; }
      err.hidden=true; go.disabled=true; go.textContent="Signing in…";
      supabaseClient.auth.signInWithPassword({email:em,password:pw}).then(function(r){
        if(r.error) throw r.error;
        box.remove(); document.body.classList.remove("loggedout");
        resolve(checkAccess());
      }).catch(function(ex){
        go.disabled=false; go.textContent="Sign in";
        err.textContent=/invalid/i.test(ex.message||"")?"That email or password didn’t match. Try again.":(navigator.onLine?"Couldn’t sign in: "+(ex.message||"unknown error"):"You appear to be offline.");
        err.hidden=false;
      });
    };
    setTimeout(function(){ try{ $("le").focus(); }catch(e){} },80);
  });
}
/* Which phases a client may open depends on what they bought. Pure date arithmetic on the membership row. */
var RULES_START=Date.parse("2026-10-09");   /* memberships that began before this keep full access */
var WEEK_MS=7*864e5;
function monthsSince(startMs,nowMs){
  var a=new Date(startMs), b=new Date(nowMs), m=(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth());
  if(b.getDate()<a.getDate()) m--;
  return Math.max(0,m);
}
function addMonthsMs(startMs,n){ var d=new Date(startMs); d.setMonth(d.getMonth()+n); return d.getTime(); }
function entFromMembership(m){
  var total=phaseCount(), now=Date.now();
  var started=Date.parse(m.started_at||"")||0, exp=m.expires_at?Date.parse(m.expires_at):null;
  var active=m.status==="active"&&(!exp||exp>now);
  if(!started||started<RULES_START) return {kind:"legacy",allowed:total,readOnly:!active,nextUnlock:null};
  if(exp){   /* one-time package */
    var pkg=Math.max(1,Math.min(total,Math.floor(Math.round((exp-started)/WEEK_MS)/4)));
    var allowed=active?Math.min(pkg,1+Math.floor((now-started)/(4*WEEK_MS))):pkg;
    return {kind:"package",allowed:allowed,readOnly:!active,nextUnlock:(active&&allowed<pkg)?started+allowed*4*WEEK_MS:null};
  }
  var months=monthsSince(started,now), allowedSub=Math.min(total,1+months);   /* monthly membership */
  return {kind:"subscription",allowed:allowedSub,readOnly:!active,nextUnlock:(active&&allowedSub<total)?addMonthsMs(started,allowedSub):null};
}
function pickMembership(rows){
  var now=Date.now();
  var act=rows.filter(function(r){ return r.status==="active"&&(!r.expires_at||Date.parse(r.expires_at)>now); });
  var pool=act.length?act:rows;
  return pool.slice().sort(function(a,b){ return (b.tier||0)-(a.tier||0)||(Date.parse(b.started_at||"")||0)-(Date.parse(a.started_at||"")||0); })[0];
}
function checkAccess(){
  if(DEV) return Promise.resolve({uid:"dev",email:"dev@local",ent:null});
  return supabaseClient.auth.getSession().then(function(r){
    var s=r.data&&r.data.session;
    if(!s) return showLogin();
    var id=s.user.id, email=s.user.email, ck="pc_member_"+id, ek="pc_ent_"+id;
    if(email===ADMIN_EMAIL) return {uid:id,email:email,ent:null};
    return supabaseClient.from("memberships").select("*").eq("client_email",email).order("started_at",{ascending:false}).limit(10).then(function(m){
      if(m.error) throw m.error;
      var rows=m.data||[];
      if(!rows.length){ location.replace("../membership.html"); return null; }
      var pick=pickMembership(rows);
      try{ localStorage.setItem(ck,String(Date.now())); localStorage.setItem(ek,JSON.stringify(pick)); }catch(e){}
      return {uid:id,email:email,ent:entFromMembership(pick)};
    }).catch(function(){
      var t=+localStorage.getItem(ck)||0;
      if(Date.now()-t<14*864e5){   /* offline: use the last membership we saw, and work out the dates fresh */
        var cached=null; try{ cached=JSON.parse(localStorage.getItem(ek)||"null"); }catch(e){}
        return {uid:id,email:email,ent:cached?entFromMembership(cached):null};
      }
      location.replace("../membership.html"); return null;
    });
  });
}
function start(u){
  uid=u.uid; userEmail=u.email; ENT=u.ent||null; if(ENT&&ENT.readOnly) document.body.classList.add("ro"); lsLoad();
  if(isLockedProgram(S.profile.programIdx)) S.profile.programIdx=lastUnlockedIdx();
  document.body.style.visibility="visible";
  if(!S.profile.programStart) S.profile.programStart=todayKey();   /* a new client's Week 1 starts the day they begin */
  maybeAdvance(); renderAll();
  pull().then(function(){ if(!S.profile.programStart) S.profile.programStart=todayKey(); maybeAdvance(); maybeOnboard(); });
  if("serviceWorker" in navigator&&!DEV) navigator.serviceWorker.register("sw.js").catch(function(){});
}
checkAccess().then(function(u){ if(u) start(u); }).catch(function(e){ document.body.style.visibility="visible"; showErr(e); });
})();
