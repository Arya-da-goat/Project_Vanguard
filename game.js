import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const $=id=>document.getElementById(id);
const ui={boot:$('boot'),loading:$('loading'),hud:$('hud'),pause:$('pause'),end:$('endScreen'),toast:$('toast')};
let renderer,scene,camera,clock,player,weaponRoot,world=[],enemies=[],particles=[],tracers=[],pickups=[];
let animationStarted=false,controlsBound=false;
let running=false,paused=false,ended=false,startedAt=0,elapsed=0,difficulty='standard',quality='medium';
let yaw=0,pitch=0,velY=0,grounded=true,health=100,armor=50,kills=0,requiredKills=8,objectiveStage=0;
let keys={},mouseDown=false,aiming=false,crouching=false,sprinting=false,canLock=false,lastShot=0,reloading=false,reloadEnd=0,fireCooldown=0,damageFlash=0;
let sensitivity=1,masterVolume=.55,audioCtx=null,ambienceGain=null,lastFoot=0,noticeTimer=0,fpsFrames=0,fpsLast=0;
let mobile=matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
let stick={x:0,y:0,active:false,id:null,startX:0,startY:0},lookTouch=null,lookPrev=null;
const raycaster=new THREE.Raycaster(),center=new THREE.Vector2(0,0);
const mats={};
const weapons=[
 {name:'VX-4 ASSAULT RIFLE',short:'AR',damage:28,rate:105,mag:30,reserve:150,reload:1.55,spread:.012,auto:true,range:90,color:0xc9b27b},
 {name:'KX-9 SUBMACHINE GUN',short:'SMG',damage:18,rate:70,mag:36,reserve:180,reload:1.35,spread:.022,auto:true,range:55,color:0x9eafb7},
 {name:'M-77 MARKSMAN',short:'SR',damage:95,rate:800,mag:5,reserve:35,reload:2.05,spread:.002,auto:false,range:150,color:0xb3c5ca},
 {name:'BREACH-12 SHOTGUN',short:'SG',damage:15,rate:650,mag:8,reserve:48,reload:1.8,spread:.065,auto:false,range:28,pellets:8,color:0xc79c70},
 {name:'P9 SIDEARM',short:'P',damage:24,rate:240,mag:15,reserve:75,reload:1.15,spread:.014,auto:false,range:60,color:0xb8c2c5}
];
let weaponIndex=0,ammo=weapons.map(w=>w.mag),reserves=weapons.map(w=>w.reserve);
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function mat(color,rough=.8,metal=0){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
function box(x,y,z,sx,sy,sz,material,opts={}){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.userData.solid=opts.solid!==false;m.userData.kind=opts.kind||'world';scene.add(m);world.push(m);return m;}
function cylinder(x,y,z,r1,r2,h,material,segments=8){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);world.push(m);return m;}
function makeTexture(base, flecks, size=128){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,size,size);for(let i=0;i<700;i++){x.fillStyle=flecks[Math.floor(Math.random()*flecks.length)];x.globalAlpha=Math.random()*.24;x.fillRect(Math.random()*size,Math.random()*size,1+Math.random()*5,1+Math.random()*3)}x.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return t;}
function surface(base,flecks,rough=.9,metal=0){return new THREE.MeshStandardMaterial({map:makeTexture(base,flecks),roughness:rough,metalness:metal});}
function buildScene(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9aa6a8);scene.fog=new THREE.FogExp2(0x89999a,.009);
 camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.08,220);
 renderer=new THREE.WebGLRenderer({antialias:quality!=='low',powerPreference:'high-performance'});
 renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.6:quality==='medium'?1.15:.85));
 renderer.shadowMap.enabled=quality!=='low';renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 document.body.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xd8e2e1,0x45463e,quality==='low'?1.1:1.45));
 const sun=new THREE.DirectionalLight(0xffe4b5,2.2);sun.position.set(-25,38,15);sun.castShadow=quality!=='low';sun.shadow.mapSize.set(quality==='high'?2048:1024,quality==='high'?2048:1024);sun.shadow.camera.left=-55;sun.shadow.camera.right=55;sun.shadow.camera.top=55;sun.shadow.camera.bottom=-55;scene.add(sun);
 const fill=new THREE.DirectionalLight(0x93b5c7,.55);fill.position.set(30,15,-25);scene.add(fill);
 const concrete=surface('#626b6b',['#3f4949','#778080','#9a9b8e','#535d5c']);
 const darkConcrete=surface('#3b4547',['#242c30','#56605f','#485252']);
 const metal=surface('#303b40',['#192226','#5b6667','#3c484b'],.35,.55);
 const sand=surface('#857b63',['#655f4f','#a49a7d','#746b58']);
 const ground=surface('#646b64',['#424a43','#778074','#535a52']);
 box(0,-.55,0,115,1,115,ground,{solid:false});
 // map boundary walls and ruined compound
 for(const [x,z,sx,sz] of [[0,-54,110,2],[0,54,110,2],[-54,0,2,110],[54,0,2,110]])box(x,2,z,sx,5,sz,darkConcrete);
 // exterior road and paint stripes
 box(0,-.025,0,19,.06,105,mat(0x4a5251),{solid:false});
 for(let z=-45;z<48;z+=10)box(0,.012,z,.18,.025,4,mat(0xc2b98d),{solid:false});
 // industrial buildings / interiors
 const buildings=[
  [-20,-18,18,18,7], [21,-25,19,15,8],[-23,20,17,18,6],[24,20,19,17,7]
 ];
 for(const [x,z,w,d,h] of buildings){
   box(x,h/2,z,w,h,d,concrete);
   // roof cap / broken parapet and dark windows
   box(x,h+.1,z,w+.4,.35,d+.4,darkConcrete);
   for(let xx=x-w/2+2;xx<x+w/2-1;xx+=4){
    box(xx,h*.57,z-d/2-.03,1.5,1.5,.08,mat(0x202b30,.28,.25),{solid:false});
    box(xx,h*.57,z+d/2+.03,1.5,1.5,.08,mat(0x202b30,.28,.25),{solid:false});
   }
   // doorways are represented by passages through gaps between buildings
   for(let i=0;i<5;i++){const dx=x-w/2+1+i*(w-2)/5;box(dx,.8,z-d/2-0.23,.28,1.6,.15,metal,{solid:false});}
 }
 // cover lines and tactical obstacles
 for(let i=0;i<10;i++){
   let x=-37+(i%5)*18,z=-4+Math.floor(i/5)*11;
   if(Math.abs(x)<9) x+=13;
   box(x,.72,z,4.5,1.35,1.1,i%2?sand:concrete);
   for(let k=-1;k<=1;k++)box(x+k*1.25,1.43,z,.1,.08,1.12,metal,{solid:false});
 }
 // crates, barrels, pipes, wreckage
 for(let i=0;i<22;i++){
   const x=(Math.random()-.5)*78,z=(Math.random()-.5)*78;
   if(Math.abs(x)<9&&Math.abs(z)<10)continue;
   if(Math.random()<.55){const c=box(x,.65,z,1.35,1.3,1.25,i%2?metal:sand);c.rotation.y=Math.random()*.5;box(x,.66,z,.07,1.32,1.28,darkConcrete,{solid:false});}
   else {const b=cylinder(x,.6,z,.42,.42,1.2,metal,12);b.userData.solid=true;}
 }
 // barriers, sandbags, machinery
 for(let j=0;j<5;j++){const x=-40+j*19;box(x,.55,34,6,1.1,1.2,sand);box(x,.95,34,.18,.15,1.25,metal,{solid:false});}
 for(let i=0;i<12;i++){let x=-40+Math.random()*80,z=-42+Math.random()*84;box(x,.25,z,2.5,.5,.35,metal);cylinder(x+.5,.7,z,.12,.12,.9,mat(0x8d6e4b,.5,.4),8);}
 // central objective structure and extraction beacon
 box(0,1.7,-2,5,3.4,4,metal);
 box(0,3.5,-2,5.3,.25,4.3,darkConcrete);
 const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,2.4,12),new THREE.MeshBasicMaterial({color:0xd8b66e}));beacon.position.set(0,4.8,-2);scene.add(beacon);
 const glow=new THREE.PointLight(0xe2b768,3,12);glow.position.set(0,4.5,-2);scene.add(glow);
 // overhead cable runs
 for(const z of [-32,0,31]){const cable=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,78,6),metal);cable.rotation.z=Math.PI/2;cable.position.set(0,7,z);scene.add(cable);}
 // scattered debris / low plants
 const debrisMat=mat(0x4b5551);
 for(let i=0;i<65;i++){let x=(Math.random()-.5)*98,z=(Math.random()-.5)*98;let d=box(x,.04,z,.3+Math.random()*.8,.08,.25+Math.random()*.8,debrisMat,{solid:false});d.rotation.y=Math.random()*3;}
 createPlayer();createWeaponModel();spawnEnemies();createPickups();
}
function createPlayer(){player={pos:V(0,1.65,43),radius:.42,height:1.8};camera.position.copy(player.pos);camera.rotation.order='YXZ';}
function createWeaponModel(){
 weaponRoot=new THREE.Group();camera.add(weaponRoot);weaponRoot.position.set(.28,-.28,-.56);
 const gunMat=mat(weapons[0].color,.35,.6),black=mat(0x1b2428,.42,.55),edge=mat(0x697575,.35,.65);
 const body=new THREE.Mesh(new THREE.BoxGeometry(.17,.16,.55),gunMat);body.position.set(0,0,-.1);weaponRoot.add(body);
 const receiver=new THREE.Mesh(new THREE.BoxGeometry(.19,.11,.25),black);receiver.position.set(0,-.07,-.05);weaponRoot.add(receiver);
 const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.48,10),edge);barrel.rotation.x=Math.PI/2;barrel.position.set(0,.005,-.52);weaponRoot.add(barrel);
 const grip=new THREE.Mesh(new THREE.BoxGeometry(.09,.2,.12),black);grip.position.set(0,-.16,.02);grip.rotation.x=-.15;weaponRoot.add(grip);
 const sight=new THREE.Mesh(new THREE.BoxGeometry(.065,.055,.13),black);sight.position.set(0,.105,-.08);weaponRoot.add(sight);
 const mag=new THREE.Mesh(new THREE.BoxGeometry(.09,.2,.14),black);mag.position.set(0,-.17,-.16);weaponRoot.add(mag);
 const flashGeo=new THREE.SphereGeometry(.12,8,8),flashMat=new THREE.MeshBasicMaterial({color:0xffc66a,transparent:true,opacity:.9});
 const flash=new THREE.Mesh(flashGeo,flashMat);flash.position.set(0,.01,-.82);flash.visible=false;weaponRoot.add(flash);
 const light=new THREE.PointLight(0xffad4d,0,5);light.position.copy(flash.position);weaponRoot.add(light);
 weaponRoot.userData={flash,light,body,mag,barrel,basePos:V(.28,-.28,-.56)};
}
function rebuildWeapon(){if(weaponRoot)camera.remove(weaponRoot);weaponRoot=null;createWeaponModel();const w=weapons[weaponIndex];weaponRoot.children[0].material.color.setHex(w.color);weaponRoot.scale.set(weaponIndex===2?1.12:1,weaponIndex===3?1.1:1,weaponIndex===1?.9:1);updateHud();notify(w.name);}
function spawnEnemies(){
 const spots=[[-16,0,-10],[17,0,-12],[-32,0,7],[31,0,8],[-15,0,31],[15,0,30],[-39,0,-30],[38,0,-32],[0,0,-38],[8,0,12],[-9,0,-29],[29,0,0]];
 const types=['rifle','armor','fast','heavy','rifle','fast','armor','rifle','heavy','rifle','fast','rifle'];
 requiredKills=8;
 for(let i=0;i<requiredKills;i++){
   const [x,y,z]=spots[i],type=types[i];
   const group=new THREE.Group();group.position.set(x,y,z);scene.add(group);
   const armored=type==='armor'||type==='heavy',heavy=type==='heavy',fast=type==='fast';
   const torso=new THREE.Mesh(new THREE.BoxGeometry(armored?.66:.52,heavy?1.05:.86,.34),mat(heavy?0x4d5555:armored?0x555d5c:0x394947,.78,.12));torso.position.y=1.18;torso.castShadow=true;group.add(torso);
   const head=new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),mat(0x6d7068));head.position.y=1.83;head.castShadow=true;group.add(head);
   const helmet=new THREE.Mesh(new THREE.SphereGeometry(.24,10,6,0,Math.PI*2,0,Math.PI/2),mat(0x262f30,.55,.2));helmet.position.y=1.92;group.add(helmet);
   const legMat=mat(0x303938),leg1=new THREE.Mesh(new THREE.BoxGeometry(.2,.63,.24),legMat),leg2=leg1.clone();leg1.position.set(-.16,.42,0);leg2.position.set(.16,.42,0);group.add(leg1,leg2);
   const armMat=mat(armored?0x555e5b:0x3c4845),a1=new THREE.Mesh(new THREE.BoxGeometry(.19,.62,.2),armMat),a2=a1.clone();a1.position.set(-.39,1.2,0);a2.position.set(.39,1.2,0);group.add(a1,a2);
   const gun=new THREE.Mesh(new THREE.BoxGeometry(.1,.12,.8),mat(0x1a2224,.4,.6));gun.position.set(.18,1.1,-.48);group.add(gun);
   const hp=heavy?180:armored?125:fast?65:85;
   const barGroup=new THREE.Group();const bg=new THREE.Mesh(new THREE.PlaneGeometry(.9,.09),new THREE.MeshBasicMaterial({color:0x182124,side:THREE.DoubleSide}));const fg=new THREE.Mesh(new THREE.PlaneGeometry(.86,.05),new THREE.MeshBasicMaterial({color:0xc95c4d,side:THREE.DoubleSide}));fg.position.z=.002;barGroup.add(bg,fg);barGroup.position.y=2.3;group.add(barGroup);
   enemies.push({group,type,hp,maxHp:hp,alive:true,state:'patrol',speed:fast?3.4:heavy?1.45:2.1,range:fast?22:32,accuracy:difficulty==='hard'?.52:.32,lastFire:0,fireRate:heavy?1.2:1.65,patrolTarget:V(x+(Math.random()-.5)*8,0,z+(Math.random()-.5)*8),lastSeen:0,searchUntil:0,coverTimer:0,barGroup,fg,flash:0,basePos:V(x,0,z),phase:Math.random()*6});
 }
}
function createPickups(){for(const [x,z,type] of [[-8,15,'ammo'],[8,-18,'health'],[35,13,'ammo'],[-35,-10,'armor']]){const g=new THREE.Group();g.position.set(x,.55,z);const m=new THREE.Mesh(new THREE.BoxGeometry(.65,.65,.65),mat(type==='health'?0x719e80:type==='armor'?0x739caa:0xc4a45f,.45,.25));g.add(m);const stripe=new THREE.Mesh(new THREE.BoxGeometry(.68,.12,.68),mat(0x1b2729));g.add(stripe);scene.add(g);pickups.push({group:g,type,active:true});}}
function setupAudio(){try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();ambienceGain=audioCtx.createGain();ambienceGain.gain.value=.025*masterVolume;ambienceGain.connect(audioCtx.destination);const osc=audioCtx.createOscillator(),filter=audioCtx.createBiquadFilter();osc.type='sawtooth';osc.frequency.value=49;filter.type='lowpass';filter.frequency.value=95;osc.connect(filter);filter.connect(ambienceGain);osc.start();}catch(e){}}
function sound(kind){
 if(!audioCtx)return;try{if(audioCtx.state==='suspended')audioCtx.resume();const t=audioCtx.currentTime,g=audioCtx.createGain(),o=audioCtx.createOscillator(),f=audioCtx.createBiquadFilter();g.connect(audioCtx.destination);g.gain.setValueAtTime(masterVolume*(kind==='shot'?.12:.08),t);g.gain.exponentialRampToValueAtTime(.001,t+(kind==='shot'?.14:.25));o.connect(f);f.connect(g);
 if(kind==='shot'){o.type='sawtooth';o.frequency.setValueAtTime(115,t);o.frequency.exponentialRampToValueAtTime(38,t+.12);f.type='lowpass';f.frequency.value=850;}
 else if(kind==='hit'){o.type='square';o.frequency.setValueAtTime(700,t);o.frequency.exponentialRampToValueAtTime(250,t+.08);f.type='lowpass';f.frequency.value=1300;}
 else if(kind==='reload'){o.type='triangle';o.frequency.setValueAtTime(320,t);o.frequency.exponentialRampToValueAtTime(140,t+.22);f.frequency.value=800;}
 else if(kind==='hurt'){o.type='sawtooth';o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(35,t+.22);f.frequency.value=240;}
 else{o.type='triangle';o.frequency.setValueAtTime(kind==='enemy'?520:kind==='pickup'?650:240,t);o.frequency.exponentialRampToValueAtTime(120,t+.16);f.frequency.value=1200;}
 o.start(t);o.stop(t+.28);}catch(e){}
}
function notify(msg){const n=$('notice');n.textContent=msg;n.style.opacity='1';noticeTimer=2.1;}
function toast(msg){ui.toast.textContent=msg;ui.toast.classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>ui.toast.classList.add('hidden'),1900);}
function updateHud(){
 const w=weapons[weaponIndex];$('weaponName').textContent=w.name;$('ammoNow').textContent=ammo[weaponIndex];$('ammoReserve').textContent=reserves[weaponIndex];$('healthText').textContent=Math.ceil(health);$('armorText').textContent=Math.ceil(armor);$('healthBar').style.width=health+'%';$('armorBar').style.width=(armor/50*100)+'%';$('kills').textContent=kills;$('enemyTotal').textContent=requiredKills;
 document.querySelectorAll('.weapon-switch span').forEach((e,i)=>e.classList.toggle('active',i===weaponIndex));
 $('objectiveText').textContent=objectiveStage===0?'ELIMINATE HOSTILE UNITS':objectiveStage===1?'SECURE THE UPLINK':'REACH EXTRACTION';$('objectiveBar').style.width=(objectiveStage===0?kills/requiredKills*100:objectiveStage===1?65:100)+'%';
}
function makeParticle(pos,color=0xc6a16a,count=6,scale=1){if(quality==='low')count=Math.min(count,2);for(let i=0;i<count;i++){if(particles.length>220)break;const mesh=new THREE.Mesh(new THREE.BoxGeometry(.035*scale,.035*scale,.035*scale),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));mesh.position.copy(pos);mesh.userData.vel=V((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4);mesh.userData.life=.25+Math.random()*.5;scene.add(mesh);particles.push(mesh);}}
function tracer(from,to,color=0xffd38a){const d=to.clone().sub(from),mesh=new THREE.Mesh(new THREE.CylinderGeometry(.012,.006,d.length(),5),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7}));mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());scene.add(mesh);tracers.push({mesh,life:.075});}
function intersectsSolid(origin,dir,maxDist){raycaster.set(origin,dir);raycaster.far=maxDist;const solids=world.filter(o=>o.userData.solid!==false);const hit=raycaster.intersectObjects(solids,false);return hit.length?hit[0]:null;}
function fire(){
 const w=weapons[weaponIndex],now=performance.now();if(reloading||now-lastShot<w.rate||!running||paused||ended)return;
 if(ammo[weaponIndex]<=0){if(reserves[weaponIndex]>0)reload();else{notify('MAGAZINE EMPTY');sound('ui');}return;}
 lastShot=now;ammo[weaponIndex]--;updateHud();sound('shot');
 const kick=aiming?.012:.035;pitch=Math.max(-1.25,Math.min(1.25,pitch+kick*(weaponIndex===2?2.4:1)));yaw+=(Math.random()-.5)*kick*.25;
 weaponRoot.position.z=-.56+.09;weaponRoot.position.y=-.28-.025;
 const ud=weaponRoot.userData;if(ud.flash){ud.flash.visible=true;ud.light.intensity=5;setTimeout(()=>{if(ud.flash){ud.flash.visible=false;ud.light.intensity=0;}},55);}
 $('crosshair').style.transform=`translate(-50%,-50%) scale(${1+(w.spread*30)})`;
 setTimeout(()=>$('crosshair').style.transform='translate(-50%,-50%)',75);
 const origin=camera.position.clone(),baseDir=new THREE.Vector3();camera.getWorldDirection(baseDir);
 const pelletCount=w.pellets||1;
 let hitAny=false;
 for(let p=0;p<pelletCount;p++){
  const dir=baseDir.clone();dir.x+=(Math.random()-.5)*w.spread*(aiming?.35:1);dir.y+=(Math.random()-.5)*w.spread*(aiming?.35:1);dir.z+=(Math.random()-.5)*w.spread*(aiming?.35:1);dir.normalize();
  const wall=intersectsSolid(origin,dir,w.range);const max=wall?wall.distance:w.range;
  raycaster.set(origin,dir);raycaster.far=max;
  const targets=[];for(const e of enemies)if(e.alive)e.group.traverse(o=>{if(o.isMesh&&o!==e.barGroup&&o.geometry.type!=='PlaneGeometry')targets.push(o);});
  const hits=raycaster.intersectObjects(targets,false);
  if(hits.length){const obj=hits[0].object,e=enemies.find(en=>{let yes=false;en.group.traverse(o=>{if(o===obj)yes=true;});return yes;});if(e){const dist=origin.distanceTo(hits[0].point),falloff=Math.max(.45,1-dist/w.range*.45);e.hp-=w.damage*falloff*(obj.geometry.type==='SphereGeometry'?1.5:1);e.flash=.12;makeParticle(hits[0].point,0xd2b28a,3,.7);sound('hit');hitAny=true;const ratio=Math.max(0,e.hp/e.maxHp);e.fg.scale.x=ratio;e.fg.position.x=-(1-ratio)*.43;if(e.hp<=0)killEnemy(e);}}
  const end=hits.length?hits[0].point:wall?wall.point:origin.clone().add(dir.multiplyScalar(w.range));
  if(p===0&&weaponIndex!==2)tracer(origin.clone().add(baseDir.clone().multiplyScalar(.7)),end);
  if(wall&&(!hits.length||wall.distance<hits[0].distance))makeParticle(wall.point,0x8d9894,3,.6);
 }
 if(hitAny){$('hitmarker').style.opacity='1';setTimeout(()=>$('hitmarker').style.opacity='0',100);}
}
function killEnemy(e){if(!e.alive)return;e.alive=false;kills++;sound('enemy');makeParticle(e.group.position.clone().add(V(0,1,0)),0x8b3e34,12,1.3);scene.remove(e.group);updateHud();notify('HOSTILE NEUTRALIZED');if(kills>=requiredKills&&objectiveStage===0){objectiveStage=1;updateHud();toast('AREA CLEAR — SECURE THE UPLINK');}}
function reload(){if(reloading||ammo[weaponIndex]===weapons[weaponIndex].mag||reserves[weaponIndex]<=0)return;reloading=true;reloadEnd=performance.now()+weapons[weaponIndex].reload*1000;$('reloadLabel').textContent='RELOADING';weaponRoot.position.y=-.4;sound('reload');notify('RELOADING');}
function finishReload(){const w=weapons[weaponIndex],need=w.mag-ammo[weaponIndex],load=Math.min(need,reserves[weaponIndex]);ammo[weaponIndex]+=load;reserves[weaponIndex]-=load;reloading=false;$('reloadLabel').textContent='';updateHud();}
function switchWeapon(i){if(i<0||i>=weapons.length||i===weaponIndex)return;weaponIndex=i;reloading=false;$('reloadLabel').textContent='';rebuildWeapon();sound('ui');}
function movePlayer(dt){
 let forward=(keys.KeyW?1:0)-(keys.KeyS?1:0),strafe=(keys.KeyD?1:0)-(keys.KeyA?1:0);
 if(mobile){forward+=-stick.y;strafe+=stick.x;}
 const mag=Math.hypot(forward,strafe);if(mag>1){forward/=mag;strafe/=mag;}
 const speed=crouching?2.2:sprinting?8.4:5.2;
 const dirF=V(-Math.sin(yaw),0,-Math.cos(yaw)),dirR=V(Math.cos(yaw),0,-Math.sin(yaw));
 const delta=dirF.multiplyScalar(forward*speed*dt).add(dirR.multiplyScalar(strafe*speed*dt));
 const old=player.pos.clone();tryMove(delta);
 velY-=19*dt;player.pos.y+=velY*dt;
 if(player.pos.y<= (crouching?1.15:1.65)){player.pos.y=crouching?1.15:1.65;velY=0;grounded=true;}else grounded=false;
 player.pos.y=Math.min(player.pos.y,12);
 camera.position.copy(player.pos);camera.rotation.set(pitch,yaw,0,'YXZ');
 if(mag>.1){const now=performance.now();if(now-lastFoot>(sprinting?290:470)){lastFoot=now;sound('foot');}}
 const sway=mag>.1?Math.sin(performance.now()*.012)*(sprinting?.025:.012):0;
 weaponRoot.position.x=weaponRoot.userData.basePos.x+(aiming?-.15:0)+strafe*.018;
 weaponRoot.position.y=(crouching?-.35:weaponRoot.userData.basePos.y)+sway;
 weaponRoot.position.z=weaponRoot.userData.basePos.z+(aiming?.13:0);
}
function tryMove(delta){
 const r=player.radius;
 const tryAxis=(axis,val)=>{if(!val)return;player.pos[axis]+=val;for(const o of world){if(o.userData.solid===false)continue;const b=new THREE.Box3().setFromObject(o);if(player.pos.x+r>b.min.x&&player.pos.x-r<b.max.x&&player.pos.z+r>b.min.z&&player.pos.z-r<b.max.z&&player.pos.y-1.0<b.max.y&&player.pos.y+.2>b.min.y){player.pos[axis]=axis==='x'?(val>0?b.min.x-r:b.max.x+r):(val>0?b.min.z-r:b.max.z+r);}}};
 tryAxis('x',delta.x);tryAxis('z',delta.z);
 player.pos.x=THREE.MathUtils.clamp(player.pos.x,-51,51);player.pos.z=THREE.MathUtils.clamp(player.pos.z,-51,51);
}
function enemyAI(dt){
 const now=performance.now()/1000;
 for(const e of enemies){if(!e.alive)continue;e.phase+=dt*5;const p=e.group.position,dist=p.distanceTo(player.pos),toPlayer=player.pos.clone().sub(p);toPlayer.y=0;
 const eye=p.clone().add(V(0,1.65,0)),dir=player.pos.clone().sub(eye).normalize();const wall=intersectsSolid(eye,dir,dist);
 const visible=dist<e.range&&(!wall||wall.distance>dist-.8);
 if(visible){if(e.state!=='attack')sound('enemy');e.state='attack';e.lastSeen=now;e.searchUntil=now+4;}
 else if(e.state==='attack'){e.state='search';e.searchUntil=now+4;}
 if(e.state==='attack'){
   e.group.rotation.y=Math.atan2(toPlayer.x,toPlayer.z);
   const stop=e.type==='heavy'?11:9;
   if(dist>stop){const step=toPlayer.normalize().multiplyScalar(e.speed*dt);const save=p.clone();p.add(step);if(enemyBlocked(e)){p.copy(save);e.patrolTarget=V(p.x+(Math.random()-.5)*8,0,p.z+(Math.random()-.5)*8);}}
   if(now-e.lastFire>e.fireRate&&dist<e.range&&visible){e.lastFire=now;enemyShoot(e,dist);}
 }else if(e.state==='search'&&now<e.searchUntil){const target=V(player.pos.x,0,player.pos.z);if(now-e.lastSeen>1.1&&dist>4){const d=target.sub(p);d.y=0;p.add(d.normalize().multiplyScalar(e.speed*.45*dt));e.group.rotation.y=Math.atan2(d.x,d.z);}}
 else{e.state='patrol';const d=e.patrolTarget.clone().sub(p);d.y=0;if(d.length()<1.5)e.patrolTarget=V(e.basePos.x+(Math.random()-.5)*11,0,e.basePos.z+(Math.random()-.5)*11);else{d.normalize();p.add(d.multiplyScalar(e.speed*.35*dt));e.group.rotation.y=Math.atan2(d.x,d.z);}}
 e.group.children[0].position.y=1.18+Math.sin(e.phase)*.015;
 e.barGroup.lookAt(camera.position);e.barGroup.visible=dist<24&&e.hp<e.maxHp;
 }
}
function enemyBlocked(e){const p=e.group.position;for(const o of world){if(o.userData.solid===false)continue;const b=new THREE.Box3().setFromObject(o);if(p.x+.35>b.min.x&&p.x-.35<b.max.x&&p.z+.35>b.min.z&&p.z-.35<b.max.z&&b.max.y>1.4)return true;}return false;}
function enemyShoot(e,dist){const accuracy=e.accuracy*(difficulty==='hard'?1.12:1);if(Math.random()<accuracy*Math.max(.25,1-dist/55)){const damage=(e.type==='heavy'?13:e.type==='fast'?7:9)*(difficulty==='hard'?1.3:1);takeDamage(damage);const start=e.group.position.clone().add(V(0,1.35,0));tracer(start,player.pos.clone(),0xd57b62);}else{const start=e.group.position.clone().add(V(0,1.35,0)),end=player.pos.clone().add(V((Math.random()-.5)*3,(Math.random()-.5)*2,(Math.random()-.5)*3));tracer(start,end,0xd57b62);makeParticle(end,0xb8a47d,2,.6);}}
function takeDamage(d){if(ended||paused)return;let remaining=d;if(armor>0){const absorb=Math.min(armor,remaining*.65);armor-=absorb;remaining-=absorb;}health=Math.max(0,health-remaining);damageFlash=.22;$('damageVignette').style.boxShadow='inset 0 0 95px rgba(210,35,27,.8)';setTimeout(()=>$('damageVignette').style.boxShadow='inset 0 0 0 rgba(213,44,35,0)',180);sound('hurt');updateHud();if(health<=0)endMission(false);}
function updatePickups(dt){for(const p of pickups){if(!p.active)continue;p.group.rotation.y+=dt*.8;p.group.position.y=.55+Math.sin(performance.now()*.002+p.group.position.x)*.08;if(p.group.position.distanceTo(player.pos)<1.6){if(p.type==='health'&&health<100)health=Math.min(100,health+35);else if(p.type==='armor'&&armor<50)armor=Math.min(50,armor+25);else if(p.type==='ammo'){reserves=reserves.map((v,i)=>v+Math.round(weapons[i].mag*.65));}else continue;p.active=false;scene.remove(p.group);sound('pickup');notify(p.type.toUpperCase()+' RESUPPLIED');updateHud();}}}
function objectiveCheck(){if(objectiveStage===1&&player.pos.distanceTo(V(0,1.5,-2))<4){objectiveStage=2;updateHud();toast('UPLINK SECURED — PROCEED TO EXTRACTION');}if(objectiveStage===2&&player.pos.distanceTo(V(0,1.5,45))<5){endMission(true);}}
function endMission(win){ended=true;running=false;document.exitPointerLock?.();ui.hud.classList.add('hidden');ui.end.classList.remove('hidden');$('endTitle').innerHTML=win?'MISSION <em>COMPLETE</em>':'MISSION <em>FAILED</em>';$('endEyebrow').textContent=win?'EXTRACTION CONFIRMED':'VITAL SIGNS LOST';$('endDesc').textContent=win?'Uplink secured. Friendly extraction confirmed.':'Operator incapacitated. Review the mission and redeploy.';$('endKills').textContent=kills;$('endTime').textContent=formatTime(elapsed);sound(win?'pickup':'hurt');}
function formatTime(t){const m=Math.floor(t/60),s=Math.floor(t%60);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function pauseGame(){if(!running||ended)return;paused=true;ui.pause.classList.remove('hidden');if(document.pointerLockElement)document.exitPointerLock();mouseDown=false;}
function resumeGame(){paused=false;ui.pause.classList.add('hidden');if(!mobile)renderer.domElement.requestPointerLock?.();}
function resetGame(){
 if(renderer){renderer.dispose();renderer.domElement.remove();}
 if(scene){scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});}
 world=[];enemies=[];particles=[];tracers=[];pickups=[];keys={};health=100;armor=50;kills=0;objectiveStage=0;elapsed=0;velY=0;grounded=true;paused=false;ended=false;reloading=false;weaponIndex=0;ammo=weapons.map(w=>w.mag);reserves=weapons.map(w=>w.reserve);yaw=0;pitch=0;
 ui.end.classList.add('hidden');ui.pause.classList.add('hidden');ui.boot.classList.add('hidden');ui.loading.classList.remove('hidden');ui.hud.classList.add('hidden');
 setTimeout(()=>{buildScene();updateHud();ui.loading.classList.add('hidden');ui.hud.classList.remove('hidden');rendererEvents();if(mobile)$('mobileControls').classList.remove('hidden');running=true;startedAt=performance.now();clock=new THREE.Clock();setupAudio();if(!mobile)renderer.domElement.requestPointerLock?.();toast('OBJECTIVE UPDATED — ELIMINATE HOSTILES');animate();},80);
}
function animate(){
 requestAnimationFrame(animate);if(!renderer||!scene)return;const dt=Math.min(clock?.getDelta()||.016,.04);
 if(running&&!paused&&!ended){elapsed=(performance.now()-startedAt)/1000;movePlayer(dt);enemyAI(dt);updatePickups(dt);objectiveCheck();if(mouseDown&&weapons[weaponIndex].auto)fire();if(reloading&&performance.now()>=reloadEnd)finishReload();if(noticeTimer>0){noticeTimer-=dt;if(noticeTimer<=0)$('notice').style.opacity='0';}
  weaponRoot.position.z=THREE.MathUtils.lerp(weaponRoot.position.z,weaponRoot.userData.basePos.z+(aiming?.13:0),dt*13);
  weaponRoot.position.y=THREE.MathUtils.lerp(weaponRoot.position.y,weaponRoot.userData.basePos.y,dt*9);
  const now=performance.now();if(now-fpsLast>500){$('fps').textContent=Math.round(1/dt)+' FPS';fpsLast=now;}
 }
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.userData.life-=dt;p.position.addScaledVector(p.userData.vel,dt);p.userData.vel.y-=7*dt;p.material.opacity=Math.max(0,p.userData.life);if(p.userData.life<=0){scene.remove(p);p.geometry.dispose();p.material.dispose();particles.splice(i,1);}}
 for(let i=tracers.length-1;i>=0;i--){tracers[i].life-=dt;if(tracers[i].life<=0){scene.remove(tracers[i].mesh);tracers[i].mesh.geometry.dispose();tracers[i].mesh.material.dispose();tracers.splice(i,1);}}
 if(renderer&&scene)renderer.render(scene,camera);
}
function start(){difficulty=document.querySelector('.choice.selected')?.dataset.diff||'standard';if(difficulty==='hard'){}resetGame();}
function bind(){
 document.querySelectorAll('.choice').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');}));
 $('startBtn').addEventListener('click',start);$('resumeBtn').addEventListener('click',resumeGame);$('restartBtn').addEventListener('click',resetGame);$('endRestart').addEventListener('click',resetGame);$('menuBtn').addEventListener('click',toMenu);$('endMenu').addEventListener('click',toMenu);
 $('settingsBtn').addEventListener('click',()=>$('settingsPanel').classList.toggle('hidden'));
 $('sensitivity').addEventListener('input',e=>{sensitivity=+e.target.value;$('sensVal').textContent=sensitivity.toFixed(1)+'×';});
 $('volume').addEventListener('input',e=>{masterVolume=+e.target.value;if(ambienceGain)ambienceGain.gain.value=.025*masterVolume;});
 $('quality').addEventListener('change',e=>{quality=e.target.value;if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.6:quality==='medium'?1.15:.85));renderer.shadowMap.enabled=quality!=='low';toast('GRAPHICS SETTING APPLIED');}});
 $('showFps').addEventListener('change',e=>$('fps').style.display=e.target.checked?'':'none');
 document.addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&running&&!ended){if(!paused)pauseGame();else resumeGame();}if(!running||paused||ended)return;if(e.code==='Space'&&grounded){velY=7.5;grounded=false;}if(e.code==='ShiftLeft'||e.code==='ShiftRight')sprinting=true;if(e.code==='KeyC')crouching=true;if(e.code==='KeyR')reload();if(e.code==='Digit1')switchWeapon(0);if(e.code==='Digit2')switchWeapon(1);if(e.code==='Digit3')switchWeapon(2);if(e.code==='Digit4')switchWeapon(3);if(e.code==='Digit5')switchWeapon(4);});
 document.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='ShiftLeft'||e.code==='ShiftRight')sprinting=false;if(e.code==='KeyC')crouching=false;});
}
function rendererEvents(){
 if(!renderer)return;
 if(!controlsBound){
  document.addEventListener('pointerlockchange',()=>{canLock=!!document.pointerLockElement;});
  document.addEventListener('mousemove',e=>{if(!running||paused||ended||mobile||!document.pointerLockElement)return;yaw-=e.movementX*.0021*sensitivity;pitch-=e.movementY*.0021*sensitivity;pitch=THREE.MathUtils.clamp(pitch,-1.35,1.35);});
  document.addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;if(e.button===2)aiming=false;});
  window.addEventListener('resize',()=>{if(!renderer||!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.6:quality==='medium'?1.15:.85));});
  setupMobile();controlsBound=true;
 }
 renderer.domElement.addEventListener('mousedown',e=>{if(e.button===0){if(!mobile&&!document.pointerLockElement){renderer.domElement.requestPointerLock?.();return;}mouseDown=true;if(!weapons[weaponIndex].auto)fire();}if(e.button===2)aiming=true;});
 renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
}
function setupMobile(){
 if(!mobile)return;$('mobileControls').classList.remove('hidden');
 const base=$('stickBase'),knob=$('stickKnob');
 base.addEventListener('pointerdown',e=>{e.preventDefault();stick.active=true;stick.id=e.pointerId;stick.startX=e.clientX;stick.startY=e.clientY;base.setPointerCapture(e.pointerId);});
 base.addEventListener('pointermove',e=>{if(!stick.active||e.pointerId!==stick.id)return;const dx=e.clientX-stick.startX,dy=e.clientY-stick.startY,l=Math.hypot(dx,dy),lim=34,n=l>lim?lim/l:1;stick.x=dx*n/lim;stick.y=dy*n/lim;knob.style.transform=`translate(${dx*n}px,${dy*n}px)`;});
 const endStick=e=>{if(e.pointerId!==stick.id)return;stick.active=false;stick.x=stick.y=0;knob.style.transform='translate(0,0)';};base.addEventListener('pointerup',endStick);base.addEventListener('pointercancel',endStick);
 const look=$('lookZone');look.addEventListener('pointerdown',e=>{if(lookTouch!==null)return;lookTouch=e.pointerId;lookPrev={x:e.clientX,y:e.clientY};look.setPointerCapture(e.pointerId);});
 look.addEventListener('pointermove',e=>{if(e.pointerId!==lookTouch||!lookPrev)return;const dx=e.clientX-lookPrev.x,dy=e.clientY-lookPrev.y;yaw-=dx*.004*sensitivity;pitch=THREE.MathUtils.clamp(pitch-dy*.004*sensitivity,-1.3,1.3);lookPrev={x:e.clientX,y:e.clientY};});
 const endLook=e=>{if(e.pointerId===lookTouch){lookTouch=null;lookPrev=null;}};look.addEventListener('pointerup',endLook);look.addEventListener('pointercancel',endLook);
 const hold=(id,down,up=()=>{})=>{const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();down();});b.addEventListener('pointerup',e=>{e.preventDefault();up();});b.addEventListener('pointercancel',up);};
 hold('mobileFire',()=>{mouseDown=true;fire();},()=>mouseDown=false);hold('mobileAim',()=>{aiming=!aiming;$('mobileAim').classList.toggle('active',aiming);});hold('mobileJump',()=>{if(grounded){velY=7.5;grounded=false;}});hold('mobileCrouch',()=>{crouching=!crouching;$('mobileCrouch').classList.toggle('active',crouching);});hold('mobileReload',reload);hold('mobileSwitch',()=>switchWeapon((weaponIndex+1)%weapons.length));
}
function toMenu(){running=false;paused=false;ended=false;ui.pause.classList.add('hidden');ui.end.classList.add('hidden');ui.hud.classList.add('hidden');$('mobileControls').classList.add('hidden');ui.boot.classList.remove('hidden');if(renderer){renderer.dispose();renderer.domElement.remove();renderer=null;}}
bind();
