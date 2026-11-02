import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import {WEAPONS,SETTINGS_DEFAULTS} from "./config.js";
import {buildArena} from "./arena.js";
import {makeWeapon, WEAPON_MODEL_FILES} from "./weapon-models.js";
import { preloadModels, getModel, getAnimations, isModelReady } from "./model-loader.js";
import {sound,setVolume} from "./audio.js";
import {notify,showToast,updateHUD,addFeed,showHit,setScoreboard,showResult,formatTime} from "./ui.js";
const $=id=>document.getElementById(id);
let renderer,scene,camera,clock,weaponRoot,arena,colliders=[],enemies=[],effects=[],keys={},running=false,paused=false,ended=false,armoryOpen=false;
let yaw=0,pitch=0,health=100,armor=50,kills=0,deaths=0,elapsed=0,matchDuration=300,weaponIndex=0,ammo=[],reserve=[],reloading=false,reloadAt=0,lastShot=0,velY=0,grounded=true,playerPos=new THREE.Vector3(0,1.65,0),playerVel=new THREE.Vector3(),sensitivity=1,fov=78,quality="medium",camShake=true,showFps=true,mouseHeld=false,aiming=false,shootKick=0,walkPhase=0,fpsLast=0,fpsFrames=0;
let lastTime=0,noticeCooldown=0,fireHeld=false,moveStick={x:0,y:0},touchLook=null,stickTouch=null,mobile=('ontouchstart' in window)||matchMedia("(pointer:coarse)").matches,matchStart=0,lastMouseX=null,lastMouseY=null,shakeAmount=0,minimapCtx=null,powerups=[];
const raycaster=new THREE.Raycaster(),center=new THREE.Vector2(0,0),tmpV=new THREE.Vector3(),tmpV2=new THREE.Vector3();
const weaponModels=[];
const PLAYER_NAME="YOU";
const BOT_NAMES=["WRAITH","MANTIS","ROOK","NOVA","FALCON","GHOST","ONYX"];
const botDifficulties={easy:{accuracy:.34,react:1.0,speed:3.0,damage:.7},normal:{accuracy:.52,react:.65,speed:3.5,damage:1},hard:{accuracy:.68,react:.38,speed:4.0,damage:1.15}};
let difficulty="normal";
const CHAR_LETTERS="abcdefg".split("");
const MODELS_MANIFEST = Object.assign({}, WEAPON_MODEL_FILES, {
  soldier: "models/characters/soldier.glb",
  prop_barrel: "models/props/barrel.glb",
  prop_box: "models/props/box.glb",
  prop_boxlarge: "models/props/box-large.glb",
  prop_chest: "models/props/chest.glb",
  prop_rocka: "models/props/rock-a.glb",
  prop_rockb: "models/props/rock-b.glb",
  prop_rockc: "models/props/rock-c.glb",
  prop_tree: "models/props/tree.glb",
  prop_treetall: "models/props/tree-tall.glb",
});
let modelsPreloaded = false;
let modelsPreloadPromise = null;
function ensureModelsPreloaded(){
  if (modelsPreloadPromise) return modelsPreloadPromise;
  modelsPreloadPromise = preloadModels(MODELS_MANIFEST).then(()=>{ modelsPreloaded=true; });
  return modelsPreloadPromise;
}
// Kick off preload early so armory/menu can use models
ensureModelsPreloaded();
const settings={...SETTINGS_DEFAULTS};
function mat(color,rough=.6,metal=.2){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
function makeBox(parent,x,y,z,sx,sy,sz,material){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function buildPlayerWeapon(){
 weaponRoot=new THREE.Group();camera.add(weaponRoot);
 for(let i=0;i<WEAPONS.length;i++){const m=makeWeapon(i,true);m.visible=i===weaponIndex;weaponRoot.add(m);weaponModels.push(m);}
 weaponRoot.position.set(0,0,0);weaponRoot.renderOrder=1000;
}
function makeSoldier(name,index,isPlayer=false){
 const g=new THREE.Group();g.name=name;
 const tmpl = getModel("soldier");
 const char = tmpl ? tmpl.clone(true) : null;
 let mixer = null;
 if (char) {
   char.scale.setScalar(1);
   char.position.set(0,0,0);
   char.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; }});
   g.add(char);
   char.traverse(o=>{ if(o.isMesh && o.material){ const m=o.material; if(m.color) m.color.setHex(0x3a4a30); if(m.roughness!==undefined) m.roughness=.85; }});
   mixer = new THREE.AnimationMixer(char);
   const clips = getAnimations("soldier");
   const idleClip = clips.find(c=>/idle/i.test(c.name)) || clips[0];
   const walkClip = clips.find(c=>/walk/i.test(c.name)) || clips[1];
   const runClip = clips.find(c=>/run/i.test(c.name));
   const actions = {};
   if (idleClip) { actions.idle = mixer.clipAction(idleClip); actions.idle.play(); }
   if (walkClip) { actions.walk = mixer.clipAction(walkClip); }
   if (runClip) { actions.run = mixer.clipAction(runClip); }
   // store on a temp; will assign to bot after bot creation (closure)
   g.userData.mixer = mixer;
   g.userData.actions = actions;
   g.userData.clips = clips;
 }
 const torso=new THREE.Group();torso.position.y=1.05;g.add(torso);
 const arms=[];const legs=[];
 const hp= new THREE.Group();hp.position.y=2.1;g.add(hp);const bg=makeBox(hp,0,0,0,.7,.055,.06,mat(0x1b272d));const fg=makeBox(hp,0,0,.04,.66,.035,.02,new THREE.MeshBasicMaterial({color:0x74e0d9}));hp.visible=false;
 let gun = null;
 if (char) {
   let rh = null;
   char.traverse(o=>{ if(!rh && o.name==="mixamorig:RightHand") rh=o; });
   gun = makeWeapon(index%5,false);
   gun.scale.multiplyScalar(.35);
   if (rh) { rh.add(gun); gun.position.set(0,0,0); gun.rotation.set(0,Math.PI,0); }
   else { g.add(gun); gun.position.set(.3,-.2,.4); }
 }
 const bot={name,index,group:g,torso,head:torso,arms,legs,gun,alive:true,hp:100,maxHp:100,kills:0,isPlayer,bar:hp,state:"patrol",speed:3.3,accuracy:.5,react:.6,damage:1,fireAt:0,thinkAt:0,reloadAt:0,mag:30,patrolTarget:new THREE.Vector3(),lastSeen:0,strafe:1,phase:Math.random()*6,hitFlash:0,mixer,char,actions:g.userData.actions||{}};
 g.userData.bot=bot;scene.add(g);
 return bot;
}
function spawnPowerups(){powerups=[];const types=['health','ammo','armor'];const positions=[[15,0,20],[-20,0,-15],[30,0,-30],[-35,0,25],[0,0,40],[10,0,-40]];for(const [x,z] of positions){const type=types[Math.floor(Math.random()*types.length)];const g=new THREE.Group();const color=type==='health'?0x4ade80:type==='ammo'?0xfbbf24:0x60a5fa;const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.5,0),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.6,transparent:true,opacity:.9}));mesh.position.y=1;g.add(mesh);g.position.set(x,0,z);scene.add(g);powerups.push({group:g,type,x,z,active:true,bob:Math.random()*6});}}
function placeBots(){
 enemies=[];
 const all=[...arena.spawnPoints];shuffle(all);
 const botCount=7;
 for(let i=0;i<botCount;i++){
   const b=makeSoldier(BOT_NAMES[i],i+1,false);b.group.position.copy(all[i%all.length]);b.group.position.y=0;
   const cfg=botDifficulties[difficulty];b.accuracy=cfg.accuracy;b.react=cfg.react;b.speed=cfg.speed;b.damage=cfg.damage;
   b.patrolTarget.set((Math.random()-.5)*75,0,(Math.random()-.5)*75);b.mag=WEAPONS[i%5].mag;
   enemies.push(b);
 }
 const player={name:PLAYER_NAME,index:-1,group:null,alive:true,hp:100,maxHp:100,kills:0,isPlayer:true};
 // add player to match roster as a lightweight combatant record
 playerBot=player;
}
let playerBot=null;
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function buildGame(){
 if(renderer){renderer.setAnimationLoop(null);renderer.dispose();renderer.domElement.remove();}
 if(scene){scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});}
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(fov,innerWidth/innerHeight,.06,240);camera.rotation.order="YXZ";scene.add(camera);
 renderer=new THREE.WebGLRenderer({antialias:quality!=="low",powerPreference:"high-performance"});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,quality==="high"?1.5:quality==="medium"?1.1:.8));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=quality!=="low";renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.appendChild(renderer.domElement);
 renderer.domElement.addEventListener("click",()=>{if(running&&!paused&&!ended&&!mobile){try{document.body.requestPointerLock?.();}catch(e){}}});
document.addEventListener("click",()=>{if(running&&!paused&&!ended&&!mobile&&!document.pointerLockElement){try{document.body.requestPointerLock?.();}catch(e){}}});
 arena=buildArena(scene);colliders=arena.colliders;
 minimapCtx=$('minimap').getContext('2d');
 // buildArena adds lights after floor and architecture
 weaponModels.length=0;buildPlayerWeapon();placeBots();spawnPowerups();
 playerPos.set(0,1.65,0);yaw=0;pitch=0;velY=0;grounded=true;
 ammo=WEAPONS.map(w=>w.mag);reserve=WEAPONS.map(w=>w.reserve);weaponIndex=0;reloading=false;health=100;armor=50;kills=0;deaths=0;elapsed=0;ended=false;paused=false;running=true;matchStart=performance.now();
 clock=new THREE.Clock();updateHud();setScoreboard(getRoster());
}
function updateHud(){const w=WEAPONS[weaponIndex];updateHUD({health,armor,kills,deaths,alive:1+enemies.filter(e=>e.alive).length,total:8,time:Math.max(0,matchDuration-elapsed),weapon:weaponIndex,ammo:ammo[weaponIndex]||0,reserve:reserve[weaponIndex]||0,reloading});}
function getRoster(){return [{name:PLAYER_NAME,kills,alive:health>0,player:true},...enemies.map(e=>({name:e.name,kills:e.kills,alive:e.alive,player:false}))].sort((a,b)=>b.kills-a.kills);}
function startMatch(){settings.sensitivity=+ $("sensitivity").value;settings.fov=+$("fov").value;settings.volume=+$("volume").value;setVolume(settings.volume);difficulty="normal";lastMouseX=null;lastMouseY=null;$("boot").classList.add("hidden");$("armory").classList.add("hidden");$("loading").classList.remove("hidden");ensureModelsPreloaded().then(()=>setTimeout(()=>{$("loading").classList.add("hidden");$("hud").classList.remove("hidden");buildGame();if(mobile)$("mobileControls").classList.remove("hidden");else {try{document.body.requestPointerLock?.();}catch(e){}}sound("ui");notify("FREE-FOR-ALL - LAST OPERATOR STANDING");},60));}
function movePlayer(dt){
 const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 let ix=(keys.KeyD?1:0)-(keys.KeyA?1:0)+moveStick.x,iz=(keys.KeyW?1:0)-(keys.KeyS?1:0)-moveStick.y;
 const len=Math.hypot(ix,iz);if(len>1){ix/=len;iz/=len;}
 const wish=right.multiplyScalar(ix).add(forward.multiplyScalar(iz));const speed=(keys.ShiftLeft||keys.ShiftRight?8.2:5.5)*(aiming?.82:1);
 playerVel.x=THREE.MathUtils.damp(playerVel.x,wish.x*speed,10,dt);playerVel.z=THREE.MathUtils.damp(playerVel.z,wish.z*speed,10,dt);
 tryMove(playerVel.x*dt,playerVel.z*dt);checkPowerups();
 if(!grounded){velY-=20*dt;playerPos.y+=velY*dt;if(playerPos.y<=1.65){playerPos.y=1.65;velY=0;grounded=true;}}
 camera.position.copy(playerPos);if(shakeAmount>0){camera.position.x+=(Math.random()-.5)*shakeAmount;camera.position.y+=(Math.random()-.5)*shakeAmount;camera.position.z+=(Math.random()-.5)*shakeAmount;shakeAmount=Math.max(0,shakeAmount-.08);}camera.rotation.set(pitch,yaw,0,"YXZ");
 walkPhase+=dt*(Math.abs(playerVel.x)+Math.abs(playerVel.z))*.8;
 const moving=Math.abs(playerVel.x)+Math.abs(playerVel.z)>.6;
 const sway=moving?Math.sin(walkPhase*5)*.012:Math.sin(performance.now()*.0014)*.0025;
 weaponRoot.position.set(0,0,0);weaponRoot.position.x=sway*(aiming?.3:1);weaponRoot.position.y=sway*.7-(keys.ShiftLeft||keys.ShiftRight?.018:0);
 weaponRoot.position.z=shootKick;
 shootKick=THREE.MathUtils.damp(shootKick,0,11,dt);
}
function checkPowerups(){for(const p of powerups){if(!p.active)continue;const dist=Math.hypot(playerPos.x-p.x,playerPos.z-p.z);if(dist<2){p.active=false;p.group.visible=false;sound('ui');if(p.type==='health'){health=Math.min(100,health+25);notify('+25 HEALTH');}else if(p.type==='ammo'){reserve[weaponIndex]+=30;notify('+30 AMMO');}else if(p.type==='armor'){armor=Math.min(100,armor+25);notify('+25 ARMOR');}updateHud();setTimeout(()=>{p.active=true;p.group.visible=true;},15000);}}}
function tryMove(dx,dz){
 const radius=.36;
 const test=(x,z)=>{const p=playerPos.clone();p.x=x;p.z=z;const bb=new THREE.Box3(new THREE.Vector3(x-radius,p.y-1.5,z-radius),new THREE.Vector3(x+radius,p.y+.15,z+radius));return colliders.some(b=>bb.intersectsBox(b));};
 const nx=playerPos.x+dx;if(!test(nx,playerPos.z))playerPos.x=THREE.MathUtils.clamp(nx,-51,51);
 const nz=playerPos.z+dz;if(!test(playerPos.x,nz))playerPos.z=THREE.MathUtils.clamp(nz,-51,51);
}
function setWeapon(i){if(i<0||i>=WEAPONS.length||i===weaponIndex)return;weaponModels[weaponIndex].visible=false;weaponIndex=i;weaponModels[weaponIndex].visible=true;reloading=false;sound("switch");updateHud();}
function reload(){if(reloading||ammo[weaponIndex]>=WEAPONS[weaponIndex].mag||reserve[weaponIndex]<=0||!running||paused||ended)return;reloading=true;reloadAt=performance.now()+WEAPONS[weaponIndex].reload*1000;sound("reload");updateHud();}
function finishReload(){const w=WEAPONS[weaponIndex],need=w.mag-ammo[weaponIndex],take=Math.min(need,reserve[weaponIndex]);ammo[weaponIndex]+=take;reserve[weaponIndex]-=take;reloading=false;updateHud();}
function fire(){
 if(!running||paused||ended||reloading)return;const w=WEAPONS[weaponIndex],now=performance.now();if(now-lastShot<w.rate)return;if(ammo[weaponIndex]<=0){sound("empty");reload();return;}lastShot=now;ammo[weaponIndex]--;shootKick=camShake?-.045:0;shakeAmount=camShake?.08:0;sound("shot");
 const pellets=w.pellets||1;let hitAny=false;
 for(let i=0;i<pellets;i++){
   // Camera center ray is authoritative; only weapon visual kick is applied, never camera pitch.
   const spread=w.spread*(aiming?.42:1);const dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);dir.x+=(Math.random()-.5)*spread;dir.y+=(Math.random()-.5)*spread;dir.z+=(Math.random()-.5)*spread;dir.normalize();
   const start=camera.position.clone();raycaster.set(start,dir);raycaster.far=w.range;
   const targets=[];for(const e of enemies)if(e.alive)e.group.traverse(o=>{if(o.isMesh){o.userData.targetBot=e;targets.push(o);}});
   const worldHits=raycaster.intersectObjects(scene.children,true).filter(h=>h.object!==weaponRoot&&!weaponRoot.children.some(m=>m===h.object||m.children.includes(h.object)));
   let hit=null;for(const h of worldHits){let bot=h.object.userData.targetBot;if(!bot){let p=h.object.parent;while(p&&!bot){bot=p.userData?.bot||p.userData?.targetBot;p=p.parent;}}if(bot?.alive){hit={...h,bot};break;}if(h.distance< w.range){break;}}
   if(hit){const dmg=w.damage*(1-hit.distance/w.range*.22);damageBot(hit.bot,dmg);hitAny=true;spawnImpact(hit.point,0x91e8e5);}
   else {const end=start.clone().addScaledVector(dir,Math.min(w.range,40));spawnTracer(start,end,0x9ceff0);}
 }
 if(hitAny)showHit();updateHud();
}
function damageBot(bot,dmg){if(!bot.alive)return;bot.hp-=dmg;bot.hitFlash=.12;bot.bar.visible=true;bot.bar.children[1].scale.x=Math.max(0,bot.hp/bot.maxHp);showDamageNumber(bot,dmg);if(bot.hp<=0){bot.alive=false;bot.group.visible=true;bot.group.rotation.z=1.3;bot.bar.visible=false;kills++;playerBot.kills=kills;addFeed(PLAYER_NAME,bot.name,true);sound("hit");notify("OPERATOR ELIMINATED");shakeAmount=.3;updateHud();checkEnd();}}
function showDamageNumber(bot,dmg){const el=document.createElement('div');el.className='damage-number';el.textContent=Math.round(dmg);el.style.left=(50+ (Math.random()-.5)*10)+'%';el.style.top='40%';document.body.appendChild(el);setTimeout(()=>el.remove(),800);}
function enemyDamagePlayer(dmg,bot){if(!running||paused||ended||health<=0)return;shakeAmount=.4;let left=dmg;if(armor>0){const a=Math.min(armor,left*.6);armor-=a;left-=a;}health=Math.max(0,health-left);$("damageVignette").style.boxShadow="inset 0 0 90px #ed3d3d66";setTimeout(()=>$("damageVignette").style.boxShadow="inset 0 0 0 transparent",150);$("damageDirection").style.opacity=".8";setTimeout(()=>$("damageDirection").style.opacity="0",170);sound("hurt");updateHud();if(health<=0){deaths++;playerBot.alive=false;addFeed(bot?.name||"OPPONENT",PLAYER_NAME);finishMatch(false);}}
function hasLineOfSight(a,b){const dir=b.clone().sub(a),dist=dir.length();dir.normalize();raycaster.set(a,dir);raycaster.far=dist-.3;const hits=raycaster.intersectObjects(scene.children,true);for(const h of hits){let p=h.object;while(p&&p.userData?.bot===undefined)p=p.parent;if(p?.userData?.bot)return true;if(h.object===weaponRoot||weaponRoot.children.some(w=>w===h.object))continue;if(h.object.isMesh&&h.object.material&&!h.object.userData.transparent)return false;}return true;}
function enemyUpdate(dt){
 const now=performance.now()/1000;
 for(const e of enemies){if(!e.alive)continue;e.phase+=dt*5;
   const p=e.group.position;const target=playerPos.clone();const eye=p.clone().add(new THREE.Vector3(0,1.45,0));const to=target.clone().sub(eye);const dist=to.length();const visible=dist<68&&hasLineOfSight(eye,target);
   if(visible){e.lastSeen=now;e.state="attack";}else if(now-e.lastSeen<3)e.state="search";else e.state="patrol";
   if(e.state==="attack"){
     const horizontal=target.clone().sub(p);horizontal.y=0;e.group.rotation.y=Math.atan2(horizontal.x,horizontal.z);
     if(dist>11){horizontal.normalize();horizontal.multiplyScalar(e.speed*dt);const old=p.clone();p.add(horizontal);if(enemyBlocked(p)){p.copy(old);e.patrolTarget.set((Math.random()-.5)*70,0,(Math.random()-.5)*70);}}
     else if(dist<6){horizontal.normalize().multiplyScalar(-e.speed*.65*dt);p.add(horizontal);}
     // periodic strafing to avoid static target behavior
     if(Math.sin(now*1.4+e.index)>0){p.x+=Math.cos(e.group.rotation.y)*e.speed*.22*dt;p.z-=Math.sin(e.group.rotation.y)*e.speed*.22*dt;}
     if(visible&&now>e.fireAt+e.react&&now-e.fireAt>1.0+Math.random()*.2){e.fireAt=now;enemyFire(e,dist,eye,target);}
   }else{
     const dest=e.state==="search"?target:e.patrolTarget;const d=dest.clone().sub(p);d.y=0;
     if(e.state==="patrol"&&d.length()<2)e.patrolTarget.set((Math.random()-.5)*76,0,(Math.random()-.5)*76);
     else if(d.length()>.8){d.normalize();p.addScaledVector(d,e.speed*.35*dt);e.group.rotation.y=Math.atan2(d.x,d.z);}
   }
   const moving=Math.abs(p.x-e._lastX||0)+Math.abs(p.z-e._lastZ||0)>.001;e._lastX=p.x;e._lastZ=p.z;
   if (e.legs && e.legs.length) {
     const stride=Math.sin(now*8+e.index)*.45;
     e.legs.forEach((l,i)=>{l.hip.rotation.x=stride*(i===0?1:-1);l.knee.rotation.x=Math.max(0,-stride)*.8;});
   }
   if (e.arms && e.arms.length) {
     e.arms.forEach((a,i)=>{a.pivot.rotation.x=-.5+(e.state==="attack"?-.12:Math.sin(now*5+e.index)*.08);});
   }
   if (e.torso) e.torso.position.y=1.05+Math.sin(now*3+e.index)*.012;
   // Update realistic soldier animation mixer
   if (e.mixer) {
     e.mixer.update(dt);
     const actions = e.actions || {};
     if (moving) {
       if (actions.walk && !actions.walk.isRunning()) { if (actions.idle) actions.idle.stop(); actions.walk.play(); }
     } else {
       if (actions.idle && !actions.idle.isRunning()) { if (actions.walk) actions.walk.stop(); actions.idle.play(); }
     }
   }
   e.bar.lookAt(camera.position);e.bar.visible=dist<25&&e.hp<e.maxHp;
 }
}
function enemyBlocked(p){const bb=new THREE.Box3(new THREE.Vector3(p.x-.4,p.y,p.z-.4),new THREE.Vector3(p.x+.4,p.y+1.9,p.z+.4));return colliders.some(c=>bb.intersectsBox(c));}
function enemyFire(e,dist,eye,target){
 const cfg=botDifficulties[difficulty];const accuracy=e.accuracy*Math.max(.2,1-dist/90);
 // Aim at a small offset around the player's torso; inaccurate bots miss honestly.
 const aim=target.clone().add(new THREE.Vector3((Math.random()-.5)*(1-accuracy)*2,(1.0+(Math.random()-.5)*(1-accuracy)*1.7),0));
 const gun=e.gun;const localMuzzle=gun.userData.muzzle||new THREE.Vector3(0,0,-.5);const muzzle=localMuzzle.clone();gun.localToWorld(muzzle); // muzzle is transformed from the visible enemy weapon
 spawnTracer(muzzle,aim,0xffb27f);
 sound("enemy");
 const dir=aim.clone().sub(muzzle).normalize();raycaster.set(muzzle,dir);raycaster.far=dist+4;
 const hit=raycaster.intersectObjects(scene.children,true).find(h=>h.distance<dist+2);
 let targetBot=null;if(hit){let o=hit.object;while(o&&!targetBot){targetBot=o.userData?.bot;o=o.parent;}}
 if(Math.random()<accuracy&&dist<62&&(!hit||targetBot===playerBot||hit.distance>dist-1)){enemyDamagePlayer((8+Math.random()*5)*cfg.damage,e);}
}
function spawnTracer(a,b,color){const d=b.clone().sub(a),len=d.length();const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.012,.022,len,5),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.88}));mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());scene.add(mesh);effects.push({mesh,life:.085});}
function spawnImpact(pos,color){const g=new THREE.Group();for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.025,5,5),new THREE.MeshBasicMaterial({color,transparent:true}));m.position.set((Math.random()-.5)*.22,(Math.random()-.5)*.22,(Math.random()-.5)*.22);g.add(m);}g.position.copy(pos);scene.add(g);effects.push({mesh:g,life:.18,impact:true});}
function checkEnd(){const alive=enemies.filter(e=>e.alive).length+(health>0?1:0);if(alive<=1){const win=health>0&&enemies.every(e=>!e.alive);finishMatch(win);}}
function finishMatch(win){if(ended)return;ended=true;running=false;paused=false;document.exitPointerLock?.();$("pause").classList.add("hidden");$("mobileControls").classList.add("hidden");sound(win?"win":"lose");const alive=enemies.filter(e=>e.alive).length+(health>0?1:0);showResult({win,kills,time:elapsed,place:win?1:Math.max(2,8-kills)});}
function drawMinimap(){if(!minimapCtx)return;const ctx=minimapCtx,w=120,h=120,scale=120/110;ctx.clearRect(0,0,w,h);ctx.fillStyle='rgba(8,13,18,.9)';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(135,153,157,.3)';ctx.strokeRect(0,0,w,h);ctx.fillStyle='rgba(135,153,157,.15)';ctx.fillRect(0,0,w,h);const cx=w/2,cy=h/2;for(const e of enemies){if(!e.alive)continue;const ex=cx+e.group.position.x*scale,cy2=cy+e.group.position.z*scale;ctx.fillStyle='#ff6b6b';ctx.beginPath();ctx.arc(ex,cy2,3,0,Math.PI*2);ctx.fill();}for(const p of powerups){if(!p.active)continue;const px=cx+p.x*scale,py=cy+p.z*scale;ctx.fillStyle=p.type==='health'?'#4ade80':p.type==='ammo'?'#fbbf24':'#60a5fa';ctx.beginPath();ctx.arc(px,py,2.5,0,Math.PI*2);ctx.fill();} if(health>0){ctx.fillStyle='#74e0d9';ctx.beginPath();ctx.arc(cx+playerPos.x*scale,cy+playerPos.z*scale,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#74e0d9';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx+playerPos.x*scale,cy+playerPos.z*scale,7,0,Math.PI*2);ctx.stroke();}}
function tick(){
 requestAnimationFrame(tick);if(!renderer||!scene||!camera)return;
 const dt=Math.min(clock?.getDelta()||.016,.04);
 if(running&&!paused&&!ended){
   elapsed=(performance.now()-matchStart)/1000;movePlayer(dt);enemyUpdate(dt);
   if(mouseHeld&&WEAPONS[weaponIndex].automatic)fire();if(reloading&&performance.now()>=reloadAt)finishReload();
   updateHud();
   drawMinimap();
   if(elapsed>=matchDuration){finishMatch(health>0&&enemies.filter(e=>e.alive).length===0);}
   if(performance.now()-fpsLast>500){$("fps").textContent=Math.round(1/Math.max(dt,.001))+" FPS";fpsLast=performance.now();}
 }
 for(const p of powerups){if(!p.active)continue;p.bob+=dt*2;p.group.position.y=Math.sin(p.bob)*.3+.8;p.group.rotation.y+=dt*2;} for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0){scene.remove(effects[i].mesh);effects[i].mesh.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});effects.splice(i,1);}}
 renderer.render(scene,camera);
}
function pause(){if(!running||ended)return;paused=true;$("pause").classList.remove("hidden");document.exitPointerLock?.();mouseHeld=false;}
function resume(){paused=false;$("pause").classList.add("hidden");if(!mobile)document.body.requestPointerLock?.();}
function toMenu(){running=false;paused=false;ended=false;document.exitPointerLock?.();$("hud").classList.add("hidden");$("pause").classList.add("hidden");$("endScreen").classList.add("hidden");$("mobileControls").classList.add("hidden");$("boot").classList.remove("hidden");}
function openArmory(){armoryOpen=true;$("boot").classList.add("hidden");$("armory").classList.remove("hidden");buildArmory();}
let armRenderer,armScene,armCamera,armWeapon,armDrag=null,armYaw=.5;
function buildArmory(){
 const canvas=$("armoryCanvas");if(armRenderer){armRenderer.dispose();armRenderer=null;}
 armScene=new THREE.Scene();armScene.background=new THREE.Color(0x0b141a);armCamera=new THREE.PerspectiveCamera(38,1,.1,30);armCamera.position.set(0,.25,3.4);
 armRenderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});armRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));armRenderer.setSize(canvas.clientWidth||600,canvas.clientHeight||400,false);armRenderer.outputColorSpace=THREE.SRGBColorSpace;armRenderer.toneMapping=THREE.ACESFilmicToneMapping;
 armScene.add(new THREE.HemisphereLight(0xd8f2f3,0x26333b,2));const l=new THREE.DirectionalLight(0xffffff,3);l.position.set(2,3,4);armScene.add(l);const l2=new THREE.DirectionalLight(0x5ddce0,1.6);l2.position.set(-3,1,-2);armScene.add(l2);
 armWeapon=makeWeapon(0,false);armWeapon.scale.setScalar(1.5);armScene.add(armWeapon);setArmoryWeapon(0);
 const draw=()=>{if(!armRenderer||$("armory").classList.contains("hidden"))return;armWeapon.rotation.y=armYaw;armRenderer.render(armScene,armCamera);requestAnimationFrame(draw);};requestAnimationFrame(draw);
}
function setArmoryWeapon(i){if(!armScene)return;if(armWeapon){armScene.remove(armWeapon);armWeapon.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});}armWeapon=makeWeapon(i,false);armWeapon.scale.setScalar(i===2?1.35:1.55);armScene.add(armWeapon);const w=WEAPONS[i];$("armoryName").innerHTML=w.name.replace(" "," <em>");$("armoryDesc").textContent=w.description;["statDamage","statRate","statControl"].forEach((id,n)=>$(id).style.width=w.stats[n]+"%");document.querySelectorAll(".armory-select button").forEach(b=>b.classList.toggle("selected",+b.dataset.weapon===i));}
function bind(){
 $("startBtn").addEventListener("click",startMatch);$("showcaseBtn").addEventListener("click",openArmory);$("armoryBack").addEventListener("click",()=>{armRenderer?.dispose();armRenderer=null;$("armory").classList.add("hidden");$("boot").classList.remove("hidden");});
 document.querySelectorAll(".armory-select button").forEach(b=>b.addEventListener("click",()=>setArmoryWeapon(+b.dataset.weapon)));
 const ac=$("armoryCanvas");ac.addEventListener("pointerdown",e=>{armDrag={x:e.clientX,y:e.clientY};ac.setPointerCapture(e.pointerId);});ac.addEventListener("pointermove",e=>{if(armDrag){armYaw+=(e.clientX-armDrag.x)*.012;armDrag={x:e.clientX,y:e.clientY};}});ac.addEventListener("pointerup",()=>armDrag=null);ac.addEventListener("pointercancel",()=>armDrag=null);
 $("resumeBtn").addEventListener("click",resume);$("settingsBtn").addEventListener("click",()=>$("settingsPanel").classList.toggle("hidden"));$("restartBtn").addEventListener("click",()=>{ $("pause").classList.add("hidden");startMatch();});$("menuBtn").addEventListener("click",toMenu);$("endRestart").addEventListener("click",startMatch);$("endMenu").addEventListener("click",toMenu);
 $("sensitivity").addEventListener("input",e=>{sensitivity=+e.target.value;$("sensVal").textContent=sensitivity.toFixed(1)+"×";});$("fov").addEventListener("input",e=>{fov=+e.target.value;$("fovVal").textContent=fov+"°";if(camera){camera.fov=fov;camera.updateProjectionMatrix();}});$("volume").addEventListener("input",e=>{settings.volume=+e.target.value;$("volVal").textContent=Math.round(settings.volume*100)+"%";setVolume(settings.volume);});$("quality").addEventListener("change",e=>{quality=e.target.value;if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,quality==="high"?1.5:quality==="medium"?1.1:.8));renderer.shadowMap.enabled=quality!=="low";}showToast("GRAPHICS PRESET APPLIED");});$("showFps").addEventListener("change",e=>{showFps=e.target.checked;$("fps").style.display=showFps?"":"none";});$("camShake").addEventListener("change",e=>camShake=e.target.checked);
 document.addEventListener("keydown",e=>{keys[e.code]=true;if(["Space","ArrowUp","ArrowDown"].includes(e.code))e.preventDefault();if(e.code==="Escape"&&running&&!ended){paused?resume():pause();}if(e.code==="Tab"&&running&&!paused&&!ended){e.preventDefault();$("scoreboard").classList.toggle("hidden");setScoreboard(getRoster());}if(e.code==="Space"&&running&&!paused&&grounded){velY=7.3;grounded=false;}if(e.code==="KeyR")reload();if(e.code==="Digit1")setWeapon(0);if(e.code==="Digit2")setWeapon(1);if(e.code==="Digit3")setWeapon(2);if(e.code==="Digit4")setWeapon(3);if(e.code==="Digit5")setWeapon(4);if(e.code==="KeyT")$("scoreboard").classList.toggle("hidden");});
 document.addEventListener("keyup",e=>{keys[e.code]=false;});
 document.addEventListener("mousemove",e=>{if(!running||paused||ended||mobile)return;let dx=0,dy=0;if(document.pointerLockElement===document.body){dx=e.movementX;dy=e.movementY;}else if(e.movementX!==undefined&&e.movementX!==0||e.movementY!==undefined&&e.movementY!==0){dx=e.movementX;dy=e.movementY;}else if(lastMouseX!==null){dx=e.clientX-lastMouseX;dy=e.clientY-lastMouseY;}lastMouseX=e.clientX;lastMouseY=e.clientY;if(dx!==0||dy!==0){yaw-=dx*.0022*sensitivity;pitch-=dy*.0022*sensitivity;pitch=THREE.MathUtils.clamp(pitch,-1.42,1.42);}});
 document.addEventListener("mousedown",e=>{if(!running||paused||ended)return;if(!document.pointerLockElement&&!mobile){try{document.body.requestPointerLock();}catch(err){}}if(e.button===0){mouseHeld=true;if(!WEAPONS[weaponIndex].automatic)fire();}if(e.button===2)aiming=true;});
 document.addEventListener("mouseup",e=>{if(e.button===0)mouseHeld=false;if(e.button===2)aiming=false;});
 document.addEventListener("contextmenu",e=>e.preventDefault());
 document.addEventListener("pointerlockchange",()=>{lastMouseX=null;lastMouseY=null;if(running&&!paused&&!ended&&document.pointerLockElement!==document.body&&!mobile){/* cursor unlocked - mouse look still works via position tracking */ if($("lockPrompt"))$("lockPrompt").classList.remove("hidden");}else{if($("lockPrompt"))$("lockPrompt").classList.add("hidden");}});
 $("scoreBtn").addEventListener("click",()=>{if(running){$("scoreboard").classList.toggle("hidden");setScoreboard(getRoster());}});
 bindMobile();
 window.addEventListener("resize",()=>{if(camera&&renderer){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}});
}
function bindMobile(){
 const base=$("stickBase"),knob=$("stickKnob"),look=$("lookZone"),fireButton=$("mobileFire");
 // Mobile browsers can cancel pointer streams when they interpret a gesture as scrolling.
 // CSS touch-action:none plus pointer capture keeps both controls continuous.
 for(const el of [base,look,fireButton]){
  el.style.touchAction="none";
  el.addEventListener("contextmenu",e=>e.preventDefault());
 }
 function resetStick(){stickTouch=null;moveStick={x:0,y:0};knob.style.transform="translate(0px, 0px)";base.classList.remove("active");}
 function updateStick(e){
  const r=base.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=e.clientX-cx,dy=e.clientY-cy;const max=Math.min(r.width,r.height)*.29;
  const length=Math.hypot(dx,dy)||1;if(length>max){dx=dx/length*max;dy=dy/length*max;}
  moveStick.x=THREE.MathUtils.clamp(dx/max,-1,1);moveStick.y=THREE.MathUtils.clamp(dy/max,-1,1);
  knob.style.transform=`translate(${dx}px, ${dy}px)`;
 }
 base.addEventListener("pointerdown",e=>{
  if(stickTouch!==null)return;stickTouch=e.pointerId;
  try{base.setPointerCapture(e.pointerId);}catch{}
  base.classList.add("active");updateStick(e);e.preventDefault();
 });
 base.addEventListener("pointermove",e=>{if(stickTouch===e.pointerId){updateStick(e);e.preventDefault();}});
 for(const type of ["pointerup","pointercancel","lostpointercapture"]){base.addEventListener(type,e=>{if(stickTouch===e.pointerId||type==="lostpointercapture")resetStick();});}
 // Read the full delta between events and apply it directly; don't use per-frame deltas,
 // which can lose movement on touchscreens with sparse pointermove events.
 look.addEventListener("pointerdown",e=>{
  if(touchLook)return;touchLook={id:e.pointerId,x:e.clientX,y:e.clientY};
  try{look.setPointerCapture(e.pointerId);}catch{}e.preventDefault();
 });
 look.addEventListener("pointermove",e=>{
  if(touchLook?.id!==e.pointerId)return;
  const events=typeof e.getCoalescedEvents==="function"?e.getCoalescedEvents():[e];
  for(const ev of events){
   const dx=ev.clientX-touchLook.x,dy=ev.clientY-touchLook.y;
   // 0.008 rad/px is responsive on phones; sensitivity remains user-adjustable.
   yaw-=dx*.008*sensitivity;pitch-=dy*.008*sensitivity;
   touchLook.x=ev.clientX;touchLook.y=ev.clientY;
  }
  pitch=THREE.MathUtils.clamp(pitch,-1.4,1.4);e.preventDefault();
 });
 function clearLook(e){if(!e||touchLook?.id===e.pointerId)touchLook=null;}
 for(const type of ["pointerup","pointercancel","lostpointercapture"]){look.addEventListener(type,clearLook);}
 fireButton.addEventListener("pointerdown",e=>{try{fireButton.setPointerCapture(e.pointerId);}catch{}fireHeld=true;mouseHeld=true;if(!WEAPONS[weaponIndex].automatic)fire();e.preventDefault();});
 for(const ev of ["pointerup","pointercancel","lostpointercapture"]){fireButton.addEventListener(ev,()=>{fireHeld=false;mouseHeld=false;});}
 $("mobileJump").addEventListener("pointerdown",e=>{e.preventDefault();if(grounded){velY=7.3;grounded=false;}});
 $("mobileReload").addEventListener("pointerdown",e=>{e.preventDefault();reload();});
 $("mobileSwap").addEventListener("pointerdown",e=>{e.preventDefault();setWeapon((weaponIndex+1)%5);});
}

function boot(){bind();tick();}
boot();
