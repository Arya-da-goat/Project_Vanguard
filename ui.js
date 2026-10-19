import {WEAPONS} from "./config.js";
const $=id=>document.getElementById(id);
let noticeTimer=0;
export function notify(text){const el=$("notice");el.textContent=text;el.classList.add("show");clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove("show"),1700);}
export function showToast(text){const el=$("toast");el.textContent=text;el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),1800);}
export function updateHUD(s){
 $("healthText").textContent=Math.ceil(s.health);$("healthBar").style.width=Math.max(0,s.health)+"%";$("armorText").textContent=Math.ceil(s.armor);$("armorBar").style.width=Math.max(0,s.armor*2)+"%";
 $("kills").textContent=s.kills;$("deaths").textContent=s.deaths;$("aliveCount").textContent=s.alive;$("timer").textContent=formatTime(s.time);
 $("weaponName").textContent=WEAPONS[s.weapon].name;$("weaponCategory").textContent=WEAPONS[s.weapon].category;$("weaponKey").textContent=s.weapon+1;
 $("ammoNow").textContent=s.ammo;$("ammoReserve").textContent=s.reserve;$("reloadLabel").textContent=s.reloading?"RELOADING…":"";
 const pips=$("alivePips");pips.innerHTML="";for(let i=0;i<s.total;i++){const e=document.createElement("i");if(i>=s.alive)e.className="dead";pips.appendChild(e);}
 const ap=$("ammoPips");ap.innerHTML="";const max=WEAPONS[s.weapon].mag;for(let i=0;i<Math.min(max,30);i++){const e=document.createElement("i");if(i>=s.ammo)e.className="empty";ap.appendChild(e);}
}
export function addFeed(killer,victim,self=false){const feed=$("killFeed"),el=document.createElement("div");el.className="feed-item";el.innerHTML=`<b class="${self?"self":""}">${escapeHtml(killer)}</b> <span>✕</span> ${escapeHtml(victim)}`;feed.prepend(el);while(feed.children.length>4)feed.lastChild.remove();setTimeout(()=>el.remove(),4800);}
export function showHit(){const h=$("hitmarker"),c=$("crosshair");h.classList.add("show");c.classList.add("hit");setTimeout(()=>{h.classList.remove("show");c.classList.remove("hit");},100);}
export function setScoreboard(rows){$("scoreRows").innerHTML=rows.map(r=>`<div class="score-row"><span>${escapeHtml(r.name)}${r.player?' <b class="self">YOU</b>':''}</span><span>${r.kills}</span><span class="${r.alive?'alive':'dead'}">${r.alive?'ALIVE':'ELIMINATED'}</span></div>`).join("");}
export function formatTime(t){t=Math.max(0,Math.floor(t));return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0");}
export function showResult({win,kills,time,place}){$("hud").classList.add("hidden");$("endScreen").classList.remove("hidden");$("endTitle").innerHTML=win?'VICTORY <em>CONFIRMED</em>':'OPERATOR <em>ELIMINATED</em>';$("endEyebrow").textContent=win?"LAST OPERATOR STANDING":"MATCH REPORT";$("endDesc").textContent=win?"You survived the arena. Every other operator has been eliminated.":"Your run is over. Watch the result or jump back into a new round.";$("endKills").textContent=kills;$("endTime").textContent=formatTime(time);$("endPlace").textContent="#"+place;$("resultMark").textContent=win?"V":"×";}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
