import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function mat(color,rough=.8,metal=0){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
function box(scene,colliders,x,y,z,sx,sy,sz,material,solid=true){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);if(solid)colliders.push(new THREE.Box3().setFromObject(m));return m;}
function cylinder(scene,x,y,z,r,h,material,segments=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
export function buildArena(scene){
 scene.background=new THREE.Color(0x87969b);scene.fog=new THREE.FogExp2(0x849399,.0095);
 const colliders=[];
 const floorMat=mat(0x48545a,.84,.18), concrete=mat(0x566165,.9,.08), dark=mat(0x202a30,.56,.48), metal=mat(0x35454b,.32,.7), trim=mat(0x8b9a9d,.4,.65), amber=new THREE.MeshStandardMaterial({color:0xe0a46a,emissive:0x5b2910,emissiveIntensity:.7}), teal=new THREE.MeshStandardMaterial({color:0x71e3e2,emissive:0x1c777a,emissiveIntensity:.65});
 box(scene,colliders,0,-.55,0,110,1,110,floorMat,false);
 // Perimeter and distinct lanes
 for(const [x,z,sx,sz] of [[0,-53,108,2], [0,53,108,2],[-53,0,2,108],[53,0,2,108]])box(scene,colliders,x,2.4,z,sx,5.8,sz,dark);
 // Main architecture: central combat hub, side lanes and upper-looking structure.
 const blocks=[
 [-18,1,-14,12,3,4], [18,1,-14,12,3,4],[-18,1,14,12,3,4],[18,1,14,12,3,4],
 [-30,1,0,4,3,18],[30,1,0,4,3,18],[0,1,-27,18,3,4],[0,1,27,18,3,4],
 [-8,1,-2,5,2.5,5],[8,1,2,5,2.5,5],[0,1,10,5,2.5,5],[0,1,-10,5,2.5,5],
 [-39,1,-30,10,3,4],[39,1,-30,10,3,4],[-39,1,30,10,3,4],[39,1,30,10,3,4],
 [-29,1,-39,4,3,10],[29,1,-39,4,3,10],[-29,1,39,4,3,10],[29,1,39,4,3,10]
 ];
 for(const [x,y,z,sx,sy,sz] of blocks){box(scene,colliders,x,y,z,sx,sy,sz,concrete);box(scene,colliders,x,y+sy/2+.03,z,sx*.94,.07,sz*.94,trim,false);}
 // tall pillars / light structures
 for(const [x,z] of [[-42,-42],[42,-42],[-42,42],[42,42],[-24,0],[24,0],[0,-42],[0,42]]){
   box(scene,colliders,x,3,z,1.3,6,1.3,dark);
   box(scene,colliders,x,5.8,z,1.55,.16,1.55,trim,false);
   const lamp=new THREE.Mesh(new THREE.BoxGeometry(.65,.08,.65),teal);lamp.position.set(x,5.65,z);scene.add(lamp);
 }
 // crates and cover pieces, scattered but intentional
 for(const [x,z,r] of [[-8,-25,0],[8,25,.3],[-39,0,.2],[39,0,-.2],[-15,37,.1],[15,-37,-.1],[-43,18,0],[43,-18,0]]){
   const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=r;
   const c1=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.5,2),dark);c1.position.y=.75;c1.castShadow=true;c1.receiveShadow=true;g.add(c1);
   for(let i=0;i<3;i++){const rib=new THREE.Mesh(new THREE.BoxGeometry(.08,1.35,2.05),trim);rib.position.set(-.75+i*.75,.75,0);g.add(rib);}
   scene.add(g);colliders.push(new THREE.Box3().setFromObject(g));
 }
 // floor markings
 for(const z of [-45,-35,-25,25,35,45]){const line=new THREE.Mesh(new THREE.BoxGeometry(22,.015,.09),amber);line.position.set(0,-.035,z);scene.add(line);}
 for(const x of [-45,-35,35,45]){const line=new THREE.Mesh(new THREE.BoxGeometry(.09,.015,22),teal);line.position.set(x,-.03,0);scene.add(line);}
 // small industrial details
 for(let i=0;i<18;i++){const x=(i%6-2.5)*14,z=Math.floor(i/6)*28-28;const pipe=cylinder(scene,x,2.1,z, .12,4.2,metal,8);pipe.castShadow=true;box(scene,colliders,x+.45,1.2,z,1.1,2.4,.7,dark);}
 // sky lights and lighting
 scene.add(new THREE.HemisphereLight(0xdce8e9,0x303b40,1.55));
 const sun=new THREE.DirectionalLight(0xffe0bd,2.1);sun.position.set(-25,40,18);sun.castShadow=true;sun.shadow.mapSize.set(qualitySize(),qualitySize());sun.shadow.camera.left=-58;sun.shadow.camera.right=58;sun.shadow.camera.top=58;sun.shadow.camera.bottom=-58;scene.add(sun);
 const fill=new THREE.DirectionalLight(0x7ec4d0,.85);fill.position.set(28,18,-30);scene.add(fill);
 for(const [x,z] of [[-25,-25],[25,-25],[-25,25],[25,25],[0,0]]){const l=new THREE.PointLight(0x65cbd0,1.6,17,2);l.position.set(x,4,z);scene.add(l);}
 return {colliders, spawnPoints:[V(-44,0,-44),V(44,0,-44),V(-44,0,44),V(44,0,44),V(-44,0,0),V(44,0,0),V(0,0,-44),V(0,0,44)]};
}
function qualitySize(){return 1024;}
