import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function material(color,roughness=.42,metalness=.55){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function addBox(g, x,y,z, sx,sy,sz, mat, rot=0){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);m.position.set(x,y,z);m.rotation.y=rot;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function addCyl(g,x,y,z,r1,r2,len,mat,segments=12,rot=Math.PI/2){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,len,segments),mat);m.rotation.x=rot;m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
export function makeWeapon(index, firstPerson=false){
 const root=new THREE.Group();root.name="weapon-"+index;
 const dark=material(0x172127,.38,.65), body=material([0x46565c,0x33464d,0x3e4a50,0x5a4c3d,0x293a41][index],.32,.62), edge=material(0x91a3a7,.28,.78), rubber=material(0x12191d,.9,.08), glow=new THREE.MeshStandardMaterial({color:0x75e6e8,emissive:0x2bafb6,emissiveIntensity:1.3,roughness:.25,metalness:.2});
 // Model axis: barrel points toward -Z. All pieces are built around a recognizable receiver.
 const length=index===2?1.08:index===3?.68:index===4?.52:.82;
 addBox(root,0,0,0,.22,.16,length*.58,body);
 addBox(root,0,.095,-.02,.17,.055,length*.53,dark);
 addBox(root,0,.126,-.04,.13,.018,length*.48,edge);
 addBox(root,0,-.035,.08,.18,.10,.18,dark); // rear block
 addBox(root,0,-.12,.12,.15,.14,.2,rubber); // grip
 addBox(root,0,-.205,.10,.12,.035,.19,dark);
 // barrel and muzzle
 addCyl(root,0,.012,-length*.48,.035,.035,length*.46,dark,12);
 addCyl(root,0,.012,-length*.70,.045,.035,.085,edge,12);
 addBox(root,0,.105,-length*.38,.08,.025,.28,dark);
 // rail notches
 for(let i=0;i<5;i++)addBox(root,-.03+i*.015,.126,-.12-i*.045,.008,.014,.022,edge);
 // magazine / weapon-specific geometry
 if(index===0||index===1||index===3){const magLen=index===3?.20:.26;addBox(root,0,-.145,-.025,.095,magLen,.12,dark);addBox(root,0,-.25,-.025,.075,.025,.095,edge);}
 if(index===2){addBox(root,0,.09,.22,.13,.075,.38,dark);addBox(root,0,.09,.36,.11,.05,.14,body);addBox(root,0,.17,-.03,.065,.06,.20,dark);}
 if(index===0||index===1){addBox(root,0,.15,.15,.15,.045,.33,dark);addBox(root,0,.17,.15,.11,.015,.27,edge);}
 if(index===3){addBox(root,0,.09,.20,.16,.08,.35,dark);addBox(root,0,.11,.28,.18,.10,.12,body);}
 if(index===4){addBox(root,0,.09,.10,.13,.07,.16,dark);addBox(root,0,-.08,.04,.085,.10,.10,rubber);}
 addBox(root,0,.025,-length*.71,.105,.045,.05,dark);
 addBox(root,.001,.055,-length*.71,.045,.012,.026,glow);
 // procedural hand/forearm forms for first person or bot display
 if(firstPerson){
   const sleeve=material(0x25363e,.8,.12), glove=material(0x10171b,.9,.05);
   const arm1=addBox(root,-.20,-.16,.02,.16,.15,.34,sleeve);arm1.rotation.z=-.35;
   const hand1=addBox(root,-.11,-.055,-.10,.13,.085,.18,glove);hand1.rotation.z=-.12;
   const arm2=addBox(root,.18,-.22,-.28,.13,.13,.30,sleeve);arm2.rotation.z=.22;
   const hand2=addBox(root,.13,-.13,-.32,.13,.075,.14,glove);hand2.rotation.z=.1;
   root.position.set(.36,-.30,-.68);
   root.scale.setScalar(index===2?1.08:index===3?1.0:index===4?.82:1);
 } else {
   root.scale.setScalar(index===2?0.8:index===3?.78:index===4?.72:.8);
 }
 root.userData.muzzle=new THREE.Vector3(0,.012,-length*.75);
 root.userData.index=index;
 return root;
}
