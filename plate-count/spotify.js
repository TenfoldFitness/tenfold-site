/* Workout music: connect your own Spotify, and see what the other person is listening to.
   - Sign-in is Spotify's "authorization code with PKCE" flow, which is safe in a browser (no secret).
   - Your Spotify tokens stay in this device's localStorage. Only the song, artist and artwork go to Supabase.
   - While Plate Count is open, it checks your "now playing" every 20 seconds and saves it to plate_listening.
   - Setup: create a Spotify developer app, add the redirect URIs and the two people's Spotify emails,
     then paste its Client ID into SPOTIFY_CLIENT_ID below. Until then the card stays hidden. */
(function(){
"use strict";
var SPOTIFY_CLIENT_ID = "af8eefe8b12e4eb6be31e25f0a0de1c8";   /* public Client ID of the "Plate Count" app at developer.spotify.com */
var SCOPES = "user-read-currently-playing user-read-recently-played";
var POLL_MS = 20000, RECENT_MS = 5*60000, SAVE_MS = 60000;

var ctx=null, el=null, timer=0, me=null, others=[], err="", busy=false, lastSaved={key:"",at:0}, lastRecent=0, recent=[];

function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function tokKey(){ return "pc_spotify_"+ctx.uid; }
function loadTok(){ try{ return JSON.parse(localStorage.getItem(tokKey())||"null"); }catch(e){ return null; } }
function saveTok(t){ try{ localStorage.setItem(tokKey(),JSON.stringify(t)); }catch(e){} }
function redirectUri(){ return location.origin+location.pathname; }
function connected(){ return !!loadTok(); }
function isShut(){ try{ return localStorage.getItem("pc_sp_shut")==="1"; }catch(e){ return false; } }
function setShut(v){ try{ localStorage.setItem("pc_sp_shut",v?"1":"0"); }catch(e){} }

/* ---- PKCE helpers ---- */
function rand(n){ var a=new Uint8Array(n); crypto.getRandomValues(a); return Array.prototype.map.call(a,function(b){ return ("0"+b.toString(16)).slice(-2); }).join(""); }
function b64url(buf){ return btoa(String.fromCharCode.apply(null,new Uint8Array(buf))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function connect(){
  var v=rand(48), st=rand(8);
  try{ localStorage.setItem("pc_sp_pkce",v+"|"+st+"|"+ctx.uid); }catch(e){ err="This browser is blocking storage, so Spotify can’t connect."; paint(); return; }
  crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)).then(function(h){
    location.href="https://accounts.spotify.com/authorize?"+new URLSearchParams({client_id:SPOTIFY_CLIENT_ID,response_type:"code",redirect_uri:redirectUri(),
      scope:SCOPES,code_challenge_method:"S256",code_challenge:b64url(h),state:st}).toString();
  });
}
/* Spotify sends you back here with ?code=... */
function handleReturn(){
  var q=new URLSearchParams(location.search), code=q.get("code"), st=q.get("state"), e=q.get("error");
  if(!code&&!e) return Promise.resolve();
  var saved=(function(){ try{ return (localStorage.getItem("pc_sp_pkce")||"").split("|"); }catch(x){ return []; } })();
  history.replaceState(null,"",location.pathname);
  try{ localStorage.removeItem("pc_sp_pkce"); }catch(x){}
  if(e){ err="Spotify didn’t connect ("+e+")."; return Promise.resolve(); }
  if(saved[1]!==st||saved[2]!==ctx.uid){ err="That Spotify sign-in didn’t match this device. Please try again."; return Promise.resolve(); }
  return tokenCall({grant_type:"authorization_code",code:code,redirect_uri:redirectUri(),code_verifier:saved[0]}).then(function(t){
    if(t) saveTok(t); else err="Spotify didn’t accept that sign-in. Please try again.";
  });
}
function tokenCall(params){
  params.client_id=SPOTIFY_CLIENT_ID;
  return fetch("https://accounts.spotify.com/api/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(params).toString()})
    .then(function(r){ return r.ok?r.json():null; }).then(function(j){
      if(!j||!j.access_token) return null;
      var old=loadTok()||{};
      return {access:j.access_token,refresh:j.refresh_token||old.refresh,exp:Date.now()+(j.expires_in||3600)*1000};
    }).catch(function(){ return null; });
}
function getToken(){
  var t=loadTok(); if(!t) return Promise.resolve(null);
  if(t.exp-Date.now()>60000) return Promise.resolve(t.access);
  return tokenCall({grant_type:"refresh_token",refresh_token:t.refresh}).then(function(n){
    if(!n){ localStorage.removeItem(tokKey()); err="Spotify needs you to connect again."; return null; }
    saveTok(n); return n.access;
  });
}
function api(path){
  return getToken().then(function(tok){
    if(!tok) return null;
    return fetch("https://api.spotify.com/v1"+path,{headers:{Authorization:"Bearer "+tok}});
  });
}

/* ---- polling ---- */
function parseNow(j){
  if(!j||!j.item||j.currently_playing_type==="ad") return null;
  var imgs=(j.item.album&&j.item.album.images)||[], im=imgs[1]||imgs[0]||{};
  return {id:j.item.id,track:j.item.name,artist:(j.item.artists||[]).map(function(a){ return a.name; }).join(", "),art:im.url||"",url:(j.item.external_urls||{}).spotify||"",is_playing:!!j.is_playing};
}
function save(){
  if(!me) return Promise.resolve();
  var key=(me.id||"")+"|"+me.is_playing+"|"+(recent[0]||""), now=Date.now();
  if(key===lastSaved.key&&now-lastSaved.at<SAVE_MS) return Promise.resolve();
  lastSaved={key:key,at:now};
  return ctx.sb.from("plate_listening").upsert({user_id:ctx.uid,name:ctx.name,is_coach:ctx.isCoach,track:me.track,artist:me.artist,art:me.art,url:me.url,
    is_playing:me.is_playing,recent:recent.slice(0,6),updated_at:new Date().toISOString()},{onConflict:"user_id"}).then(function(){},function(){});
}
function pollOthers(){
  var q=ctx.sb.from("plate_listening").select("user_id,name,is_coach,track,artist,art,url,is_playing,recent,updated_at").neq("user_id",ctx.uid).order("updated_at",{ascending:false}).limit(5);
  return q.then(function(r){ if(!r.error) others=r.data||[]; },function(){});
}
function poll(){
  if(busy||document.hidden||!connected()) return;
  busy=true;
  var p=api("/me/player/currently-playing").then(function(r){
    if(!r) return;
    if(r.status===204){ if(me&&me.is_playing) lastRecent=0; if(me) me.is_playing=false; return; }
    if(r.status===401){ return; }
    if(r.status===403){ err="Spotify says this account hasn’t been added yet. Ask Sarah to add your Spotify email."; return; }
    if(!r.ok) return;
    err=""; return r.json().then(function(j){ var was=me&&me.is_playing, n=parseNow(j); if(n) me=n; else if(me) me.is_playing=false; if(was&&!(me&&me.is_playing)) lastRecent=0; });
  }).then(function(){
    if(Date.now()-lastRecent<RECENT_MS) return;
    lastRecent=Date.now();
    return api("/me/player/recently-played?limit=6").then(function(r){ return r&&r.ok?r.json():null; }).then(function(j){
      if(j&&j.items) recent=j.items.map(function(i){ return i.track.name+" · "+(i.track.artists[0]||{}).name; });
    });
  }).then(save).then(pollOthers).catch(function(){}).then(function(){ busy=false; paint(); });
  return p;
}

/* ---- display ---- */
function ago(iso){
  var m=Math.round((Date.now()-Date.parse(iso))/60000);
  if(isNaN(m)) return ""; if(m<2) return "just now"; if(m<60) return m+" min ago"; var h=Math.round(m/60); return h<24?h+" hr ago":Math.round(h/24)+" days ago";
}
function liveRow(who,t,when){
  return "<div class='sp-row'>"+(t.art?"<img src='"+esc(t.art)+"' alt='' width='48' height='48'>":"<span class='sp-noart'></span>")+
    "<div class='sp-t'><b>"+esc(who)+" <span class='sp-live'>listening now</span></b>"+
    "<span>"+(t.url?"<a href='"+esc(t.url)+"' target='_blank' rel='noopener'>"+esc(t.track)+"</a>":esc(t.track))+"</span><span class='muted small'>"+esc(t.artist)+"</span></div></div>";
}
/* Someone else's feed: the song playing right now, otherwise their last 6 songs. */
function feed(o){
  var who=o.name||"Someone", fresh=Date.now()-Date.parse(o.updated_at)<10*60000;
  if(o.is_playing&&fresh&&o.track) return liveRow(who,o);
  var songs=(o.recent||[]).slice(0,6);
  if(!songs.length&&o.track) songs=[o.track+" · "+(o.artist||"")];
  if(!songs.length) return "<div class='sp-row'><div class='sp-t'><b>"+esc(who)+"</b><span class='muted small'>Nothing played yet</span></div></div>";
  return "<div class='sp-t' style='padding:10px 0;border-top:1px solid var(--border)'><b>"+esc(who)+" <span class='muted small'>"+(who==="You"?"aren’t":"isn’t")+" playing right now. Last "+songs.length+" song"+(songs.length===1?"":"s")+(o.updated_at?" · "+esc(ago(o.updated_at)):"")+"</span></b>"+
    "<ol class='sp-list'>"+songs.map(function(s){ return "<li>"+esc(s)+"</li>"; }).join("")+"</ol></div>";
}
function paint(){
  if(!el||!document.body.contains(el)) return;
  /* The card can be folded away; the choice is remembered on this device. */
  var shut=isShut(), live=others.filter(function(o){ return o.is_playing&&o.track&&Date.now()-Date.parse(o.updated_at)<10*60000; })[0];
  var head="<button class='sp-head' id='spTog' type='button' aria-expanded='"+!shut+"' aria-label='"+(shut?"Show":"Hide")+" workout music'><span class='eyebrow'>Workout music</span>"+
    (shut&&live?"<span class='sp-peek'>"+esc(live.name||"")+" · "+esc(live.track)+"</span>":"")+
    "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 9l6 6 6-6'/></svg></button>";
  if(shut){
    el.innerHTML="<div class='card sp-shut'>"+head+"</div>";
    el.querySelector("#spTog").onclick=function(){ setShut(false); paint(); };
    return;
  }
  var h="<div class='card'>"+head+others.map(feed).join("");
  if(!connected()){
    h+="<h3 class='h2' style='font-size:18px;margin:12px 0 6px'>Share your music too</h3>"+
      "<p class='muted small' style='margin:0 0 12px'>Connect Spotify and "+(ctx.isCoach?"your clients":"your coach")+" can see what you’re playing while you train. Only the song, artist and artwork are shared, and only while Plate Count is open.</p>"+
      "<button class='btn' id='spConnect'>Connect Spotify</button>"+(err?"<p class='err' style='margin-top:10px'>"+esc(err)+"</p>":"");
  } else {
    if(me&&me.track&&me.is_playing) h+=liveRow("You",me);
    else if(recent.length) h+=feed({name:"You",is_playing:false,recent:recent,updated_at:""});
    else h+="<p class='muted small' style='margin:10px 0 0'>You: play something on Spotify and it shows here.</p>";
    if(!others.length) h+="<p class='muted small' style='margin:10px 0 0'>When the other person connects Spotify, you’ll see what they’re playing here.</p>";
    h+=(err?"<p class='err' style='margin-top:10px'>"+esc(err)+"</p>":"")+"<button class='linkbtn' id='spOff' style='margin-top:10px'>Disconnect Spotify</button>";
  }
  el.innerHTML=h+"</div>";
  var tg=el.querySelector("#spTog"); if(tg) tg.onclick=function(){ setShut(true); paint(); };
  var c=el.querySelector("#spConnect"); if(c) c.onclick=connect;
  var o=el.querySelector("#spOff"); if(o) o.onclick=disconnect;
}/* Connected: report my own playback and read the others. Not connected: just read the others, so the feed is live for viewers too. */
function tick(){
  if(!ctx||document.hidden) return;
  if(connected()) poll(); else pollOthers().then(paint);
}
function disconnect(){
  try{ localStorage.removeItem(tokKey()); }catch(e){}
  me=null; recent=[]; err="";
  ctx.sb.from("plate_listening").delete().eq("user_id",ctx.uid).then(function(){},function(){});
  paint();
}

window.PCSpotify={
  /* c = {sb, uid, name, isCoach, enabled} */
  init:function(c){
    ctx=c; if(!SPOTIFY_CLIENT_ID||!c.enabled) { ctx=null; return; }
    handleReturn().then(function(){ paint(); tick(); clearInterval(timer); timer=setInterval(tick,POLL_MS); });
    document.addEventListener("visibilitychange",function(){ if(!document.hidden) tick(); });
  },
  /* true when Spotify sharing is on for this account but this device isn't connected yet */
  needsConnect:function(){ return !!ctx&&!connected(); },
  connect:function(){ if(ctx) connect(); },
  mount:function(node){ if(!ctx) return; el=node; paint(); pollOthers().then(paint); }
};
})();
