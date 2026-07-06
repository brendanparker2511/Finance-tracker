// FROM — NIGHTFALL · a fan-made browser survival horror
import * as THREE from 'three';

/* ───────────────────── helpers ───────────────────── */
const R  = (a,b)=>a+Math.random()*(b-a);
const RI = (a,b)=>Math.floor(R(a,b+1));
const clamp = (v,a,b)=>v<a?a:v>b?b:v;
const lerp  = (a,b,t)=>a+(b-a)*t;
const $ = id=>document.getElementById(id);
const dist2d = (ax,az,bx,bz)=>Math.hypot(ax-bx,az-bz);

/* ───────────────────── audio ───────────────────── */
let AC=null, master=null, NB=null, windG=null, droneG=null;
function initAudio(){
  if(AC) return;
  try{
    AC = new (window.AudioContext||window.webkitAudioContext)();
    const comp = AC.createDynamicsCompressor();
    const out = AC.createGain(); out.gain.value=.9;
    comp.connect(out); out.connect(AC.destination); master=comp;
    NB = AC.createBuffer(1, AC.sampleRate*2, AC.sampleRate);
    const d = NB.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    // wind
    const ws=AC.createBufferSource(); ws.buffer=NB; ws.loop=true;
    const wf=AC.createBiquadFilter(); wf.type='lowpass'; wf.frequency.value=380;
    windG=AC.createGain(); windG.gain.value=.05;
    ws.connect(wf); wf.connect(windG); windG.connect(master); ws.start();
    // night drone
    const o1=AC.createOscillator(); o1.type='triangle'; o1.frequency.value=52;
    const o2=AC.createOscillator(); o2.type='sine'; o2.frequency.value=55.7;
    droneG=AC.createGain(); droneG.gain.value=0;
    o1.connect(droneG); o2.connect(droneG); droneG.connect(master);
    o1.start(); o2.start();
  }catch(e){ AC=null; }
}
function env(g,t0,a,peak,d){
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.linearRampToValueAtTime(peak,t0+a);
  g.gain.exponentialRampToValueAtTime(0.001,t0+a+d);
}
function tone(o){
  if(!AC) return;
  const {f=440,f2=null,type='sine',vol=.2,a=.01,d=.3,pan=0,when=0}=o;
  const t0=AC.currentTime+when;
  const osc=AC.createOscillator(); osc.type=type;
  osc.frequency.setValueAtTime(Math.max(f,20),t0);
  if(f2) osc.frequency.exponentialRampToValueAtTime(Math.max(f2,20),t0+a+d);
  const g=AC.createGain(); env(g,t0,a,vol,d);
  const p=AC.createStereoPanner(); p.pan.value=clamp(pan,-1,1);
  osc.connect(g); g.connect(p); p.connect(master);
  osc.start(t0); osc.stop(t0+a+d+.1);
}
function noiseHit(o){
  if(!AC) return;
  const {vol=.2,f=800,type='bandpass',a=.005,d=.12,pan=0,when=0}=o;
  const t0=AC.currentTime+when;
  const s=AC.createBufferSource(); s.buffer=NB; s.loop=true;
  const fl=AC.createBiquadFilter(); fl.type=type; fl.frequency.value=f;
  const g=AC.createGain(); env(g,t0,a,vol,d);
  const p=AC.createStereoPanner(); p.pan.value=clamp(pan,-1,1);
  s.connect(fl); fl.connect(g); g.connect(p); p.connect(master);
  s.start(t0); s.stop(t0+a+d+.15);
}
const sfx={
  step(run){ noiseHit({vol:run?.08:.045,f:R(180,340),d:.06}); },
  pickup(){ tone({f:660,f2:990,vol:.13,d:.16}); tone({f:1320,vol:.05,d:.2,when:.06}); },
  paper(){ noiseHit({vol:.09,f:2600,d:.18,a:.02}); },
  creak(){ tone({f:130,f2:65,type:'sawtooth',vol:.06,a:.06,d:.55}); },
  bang(pan,vol){ noiseHit({vol:vol*.8,f:110,type:'lowpass',d:.15,pan}); tone({f:52,vol:vol*.55,d:.2,pan}); },
  clatter(){ noiseHit({vol:.18,f:1900,d:.22}); noiseHit({vol:.13,f:900,d:.28,when:.09}); },
  stoneTick(pan,vol){ noiseHit({vol,f:2600,d:.07,pan}); noiseHit({vol:vol*.6,f:1400,d:.09,pan,when:.1}); },
  thump(vol){ tone({f:47,vol,d:.11,a:.004}); tone({f:43,vol:vol*.75,d:.13,when:.17}); },
  sting(){ tone({f:520,f2:170,type:'sawtooth',vol:.2,a:.02,d:1.1}); tone({f:524,f2:176,type:'sawtooth',vol:.15,a:.02,d:1.2,when:.04}); },
  screech(){
    tone({f:150,f2:1250,type:'sawtooth',vol:.5,a:.03,d:.8});
    tone({f:220,f2:1500,type:'square',vol:.28,a:.03,d:.7,when:.03});
    noiseHit({vol:.4,f:1800,type:'highpass',a:.01,d:.75});
  },
  whistle(pan,vol){
    const sc=[392,349.2,311.1,466.2,415.3];
    let w=0, idx=RI(0,4);
    for(let i=0;i<5;i++){
      tone({f:sc[idx],type:'sine',vol:vol*R(.55,1),a:.07,d:.36,pan,when:w});
      w+=R(.34,.58); idx=clamp(idx+RI(-1,1),0,4);
    }
  },
  giggle(pan,vol){
    let w=0;
    for(let i=0;i<4;i++){ tone({f:R(520,700)-i*55,type:'square',vol:vol*.45,a:.008,d:.06,pan,when:w}); w+=.09+i*.02; }
  },
};
function panVol(x,z){
  const dx=x-P.x, dz=z-P.z, d=Math.hypot(dx,dz)||.001;
  const rx=Math.cos(P.yaw), rz=-Math.sin(P.yaw);
  return [clamp((dx*rx+dz*rz)/d,-1,1), clamp(1.2/(1+d*.09),0,1), d];
}

/* ───────────────────── textures ───────────────────── */
function canvasTex(size,h,fn){
  const c=document.createElement('canvas'); c.width=size; c.height=h||size;
  fn(c.getContext('2d'), c.width, c.height);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
const HILL={x:0,z:-150,top:27,foot:80,h:16};
function groundH(x,z){
  const d=Math.hypot(x-HILL.x,z-HILL.z);
  if(d>=HILL.foot) return 0;
  if(d<=HILL.top)  return HILL.h;
  const t=(HILL.foot-d)/(HILL.foot-HILL.top);
  return HILL.h*t*t*(3-2*t);
}
const GSIZE=520;
const w2c=(v,S)=> (v+GSIZE/2)/GSIZE*S;
const groundTexture = canvasTex(2048,2048,(g,S)=>{
  g.fillStyle='#252c1f'; g.fillRect(0,0,S,S);
  for(let i=0;i<11000;i++){
    const v=R(0,1);
    g.fillStyle=`rgba(${28+v*34},${38+v*34},${24+v*22},.4)`;
    g.fillRect(R(0,S),R(0,S),R(2,7),R(2,7));
  }
  function road(x1,z1,x2,z2,w,col){
    g.strokeStyle=col; g.lineWidth=w/GSIZE*S; g.lineCap='round';
    g.beginPath(); g.moveTo(w2c(x1,S),w2c(z1,S)); g.lineTo(w2c(x2,S),w2c(z2,S)); g.stroke();
  }
  road(0,134,0,-96,9,'#3e3c37'); road(0,134,0,-96,7,'#464440');
  road(-112,0,112,0,8,'#3e3c37'); road(-112,0,112,0,6.4,'#464440');
  road(0,-96,0,-152,5,'#4a4234');            // dirt path up the hill
  // scattered gravel noise on roads
  for(let i=0;i<2600;i++){
    const onMain=Math.random()<.6;
    const x=onMain?R(-4,4):R(-110,110), z=onMain?R(-150,132):R(-3.5,3.5);
    g.fillStyle=`rgba(${60+R(0,30)},${58+R(0,26)},${52+R(0,22)},.35)`;
    g.fillRect(w2c(x,S),w2c(z,S),2,2);
  }
  // dirt aprons at buildings + crop rows at the farm
  g.fillStyle='rgba(64,56,40,.55)';
  [[20,-8],[ -24,-34],[-26,26],[24,34],[-22,68],[30,-46],[-72,-14],[0,-150]].forEach(p=>{
    g.beginPath(); g.ellipse(w2c(p[0],S),w2c(p[1],S),34,26,0,0,7); g.fill();
  });
  g.strokeStyle='rgba(58,44,30,.8)'; g.lineWidth=4;
  for(let i=0;i<7;i++){
    g.beginPath(); g.moveTo(w2c(-84,S),w2c(2+i*3,S)); g.lineTo(w2c(-62,S),w2c(2+i*3,S)); g.stroke();
  }
});
const faceTexture = canvasTex(256,256,(g)=>{
  g.fillStyle='#dccdb2'; g.fillRect(0,0,256,256);
  const rg=g.createRadialGradient(128,120,40,128,128,150);
  rg.addColorStop(0,'rgba(0,0,0,0)'); rg.addColorStop(1,'rgba(60,40,30,.55)');
  g.fillStyle=rg; g.fillRect(0,0,256,256);
  // sunken cheeks
  g.strokeStyle='rgba(90,60,45,.5)'; g.lineWidth=7;
  g.beginPath(); g.arc(70,150,34,-.6,1.2); g.stroke();
  g.beginPath(); g.arc(186,150,34,Math.PI-1.2,Math.PI+.6); g.stroke();
  // eyes — small, dark, delighted
  for(const ex of [88,168]){
    g.fillStyle='rgba(70,50,40,.5)';
    g.beginPath(); g.ellipse(ex,96,20,14,0,0,7); g.fill();
    g.fillStyle='#120c0a';
    g.beginPath(); g.ellipse(ex,98,9,13,0,0,7); g.fill();
    g.fillStyle='#e8e2d2';
    g.beginPath(); g.arc(ex+3,93,2.4,0,7); g.fill();
  }
  // the grin
  g.fillStyle='#1c0e0d';
  g.beginPath();
  g.moveTo(50,146); g.quadraticCurveTo(128,222,206,146); g.quadraticCurveTo(128,176,50,146);
  g.fill();
  g.strokeStyle='#553f33'; g.lineWidth=4;
  g.beginPath(); g.moveTo(50,146); g.quadraticCurveTo(128,222,206,146); g.stroke();
  // teeth along the upper curve
  g.fillStyle='#cabb9c';
  for(let t=.08;t<=.92;t+=.084){
    const x=lerp(lerp(50,128,t),lerp(128,206,t),t);
    const yTop=lerp(lerp(146,176,t),lerp(176,146,t),t);
    const yBot=lerp(lerp(146,222,t),lerp(222,146,t),t);
    g.fillRect(x-4, yTop+1, 8, clamp((yBot-yTop)*.52,4,20));
  }
});
const wardTexture = canvasTex(128,128,(g)=>{
  g.clearRect(0,0,128,128);
  g.fillStyle='#cfc0a0';
  g.beginPath(); g.arc(64,64,56,0,7); g.fill();
  g.strokeStyle='#4a3524'; g.lineWidth=5;
  g.beginPath(); g.arc(64,64,50,0,7); g.stroke();
  // three figures holding hands
  g.lineWidth=4;
  for(const fx of [40,64,88]){
    g.beginPath(); g.arc(fx,48,7,0,7); g.stroke();               // head
    g.beginPath(); g.moveTo(fx,55); g.lineTo(fx,80); g.stroke(); // body
    g.beginPath(); g.moveTo(fx,84); g.lineTo(fx-7,96); g.moveTo(fx,84); g.lineTo(fx+7,96); g.stroke(); // legs
  }
  g.beginPath(); g.moveTo(40,66); g.lineTo(88,66); g.stroke();   // joined hands
});
const glowTexture = canvasTex(64,64,(g)=>{
  const rg=g.createRadialGradient(32,32,2,32,32,30);
  rg.addColorStop(0,'rgba(255,240,190,.9)'); rg.addColorStop(1,'rgba(255,240,190,0)');
  g.fillStyle=rg; g.fillRect(0,0,64,64);
});
const moonTexture = canvasTex(128,128,(g)=>{
  const rg=g.createRadialGradient(64,64,10,64,64,60);
  rg.addColorStop(0,'rgba(225,228,240,1)'); rg.addColorStop(.35,'rgba(200,205,225,.85)'); rg.addColorStop(1,'rgba(180,190,220,0)');
  g.fillStyle=rg; g.fillRect(0,0,128,128);
});
const signTexture = canvasTex(256,128,(g)=>{
  g.fillStyle='#5d5648'; g.fillRect(0,0,256,128);
  g.strokeStyle='#3a352c'; g.lineWidth=8; g.strokeRect(4,4,248,120);
  g.fillStyle='#241f18'; g.font='bold 42px Georgia'; g.textAlign='center';
  g.fillText('WELCOME',128,60);
  g.font='italic 20px Georgia'; g.fillStyle='rgba(36,31,24,.7)';
  g.fillText('population  —',128,96);
});
const dinerTexture = canvasTex(256,64,(g)=>{
  g.fillStyle='#1a0d0d'; g.fillRect(0,0,256,64);
  g.fillStyle='#c94f3d'; g.font='bold 44px Georgia'; g.textAlign='center';
  g.shadowColor='#ff6a50'; g.shadowBlur=18;
  g.fillText('D I N E R',128,47);
});

/* ───────────────────── renderer / scene ───────────────────── */
const renderer=new THREE.WebGLRenderer({antialias:true});
let basePR=Math.min(window.devicePixelRatio||1,1.5), curPR=basePR;
renderer.setPixelRatio(curPR);
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x8d9793,.0085);
const camera=new THREE.PerspectiveCamera(74,innerWidth/innerHeight,.1,420);
camera.rotation.order='YXZ';
scene.add(camera);

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

const hemi=new THREE.HemisphereLight(0x9aa5b0,0x2a2620,.55); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xe8e4d4,1.4);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-70; sun.shadow.camera.right=70;
sun.shadow.camera.top=70;  sun.shadow.camera.bottom=-70;
sun.shadow.camera.near=1;  sun.shadow.camera.far=260;
sun.shadow.bias=-.0005;
scene.add(sun); scene.add(sun.target);

const flash=new THREE.SpotLight(0xfff0cc,0,44,.46,.5,.9);
flash.position.set(.14,-.1,0);
camera.add(flash); camera.add(flash.target);
flash.target.position.set(.1,-.15,-3);

// stars + moon
const starGeo=new THREE.BufferGeometry();
{
  const pts=new Float32Array(900*3);
  for(let i=0;i<900;i++){
    const a=R(0,Math.PI*2), e=R(.08,1.4), r=380;
    pts[i*3]=Math.cos(a)*Math.cos(e)*r; pts[i*3+1]=Math.sin(e)*r; pts[i*3+2]=Math.sin(a)*Math.cos(e)*r;
  }
  starGeo.setAttribute('position',new THREE.BufferAttribute(pts,3));
}
const starMat=new THREE.PointsMaterial({color:0xbfc6dd,size:1.3,sizeAttenuation:false,transparent:true,opacity:0,fog:false});
const stars=new THREE.Points(starGeo,starMat); scene.add(stars);
const moon=new THREE.Sprite(new THREE.SpriteMaterial({map:moonTexture,transparent:true,opacity:0,fog:false}));
moon.scale.set(34,34,1); scene.add(moon);

/* ───────────────────── world containers ───────────────────── */
const colliders=[];      // {minX..maxZ,minY,maxY,active,los}
const interactables=[];  // {p:{x,y,z},r,label(),act(),cond?()}
const blds=[];           // building records
const lootPts=[];
const monsters=[];
let graveGroup=new THREE.Group(); scene.add(graveGroup);

const matWood =new THREE.MeshLambertMaterial({color:0x5c4b38});
const matDark =new THREE.MeshLambertMaterial({color:0x2c2620});
const matRoof =new THREE.MeshLambertMaterial({color:0x37322c});
const matFloor=new THREE.MeshLambertMaterial({color:0x4a4034});
const matBed  =new THREE.MeshLambertMaterial({color:0x6b6455});
const matWin  =new THREE.MeshLambertMaterial({color:0x0b0d12});
const wallCols=[0x6b5f4e,0x5d5a52,0x635648,0x57503f,0x6a6154,0x4f4a44];

function addBox(px,py,pz,sx,sy,sz,mat,o={}){
  const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);
  m.position.set(px,py,pz);
  m.castShadow=o.cast!==false; m.receiveShadow=true;
  scene.add(m);
  if(o.col!==false){
    colliders.push({minX:px-sx/2,maxX:px+sx/2,minY:py-sy/2,maxY:py+sy/2,
                    minZ:pz-sz/2,maxZ:pz+sz/2,active:true,los:o.los!==false});
  }
  return m;
}

/* ───────────────────── terrain / forest ───────────────────── */
{
  const gg=new THREE.PlaneGeometry(GSIZE,GSIZE,120,120);
  gg.rotateX(-Math.PI/2);
  const pa=gg.attributes.position;
  for(let i=0;i<pa.count;i++) pa.setY(i, groundH(pa.getX(i),pa.getZ(i)));
  gg.computeVertexNormals();
  const gm=new THREE.Mesh(gg,new THREE.MeshLambertMaterial({map:groundTexture}));
  gm.receiveShadow=true; scene.add(gm);
}
{
  const spots=[];
  const near=(x,z,px,pz,d)=>dist2d(x,z,px,pz)<d;
  let guard=0;
  while(spots.length<650 && guard++<20000){
    const a=R(0,Math.PI*2), r=Math.sqrt(R(.02,1))*250;
    const x=Math.cos(a)*r, z=Math.sin(a)*r+(-20);
    const inTown=Math.abs(x)<50 && z>-84 && z<130;
    if(inTown && Math.random()>.04) continue;
    if(Math.abs(x)<9 && z>-160 && z<134) continue;
    if(Math.abs(z)<9 && Math.abs(x)<115) continue;
    if(dist2d(x,z,HILL.x,HILL.z)<32) continue;
    if(near(x,z,2,118,14)) continue;
    let bad=false;
    for(const b of [[20,-8],[-24,-34],[-26,26],[24,34],[-22,68],[30,-46],[-72,-14],[0,-150]])
      if(near(x,z,b[0],b[1],12)){bad=true;break;}
    if(bad) continue;
    spots.push([x,z,R(.8,1.7)]);
  }
  const trunkG=new THREE.CylinderGeometry(.22,.34,3.2,5);
  const leafG=new THREE.ConeGeometry(2.3,7.5,6);
  const trunkM=new THREE.MeshLambertMaterial({color:0x3a2f24});
  const leafM=new THREE.MeshLambertMaterial({color:0x1c2418});
  const trunks=new THREE.InstancedMesh(trunkG,trunkM,spots.length);
  const leaves=new THREE.InstancedMesh(leafG,leafM,spots.length);
  trunks.castShadow=leaves.castShadow=true;
  const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), S=new THREE.Vector3(), T=new THREE.Vector3();
  spots.forEach((s,i)=>{
    const y=groundH(s[0],s[1]);
    Q.setFromAxisAngle(new THREE.Vector3(0,1,0),R(0,6.28));
    S.setScalar(s[2]);
    T.set(s[0],y+1.6*s[2],s[1]); M.compose(T,Q,S); trunks.setMatrixAt(i,M);
    T.set(s[0],y+(3.2+3.75)*s[2]*.92,s[1]); M.compose(T,Q,S); leaves.setMatrixAt(i,M);
  });
  scene.add(trunks); scene.add(leaves);
}

/* ───────────────────── narration ───────────────────── */
let subQ=[], subActive=null, subT=0;
function say(text,dur=3.6,cls=''){ subQ.push({text,dur,cls}); }
function sayNow(text,dur=3.6,cls=''){ subQ=[{text,dur,cls}]; subActive=null; $('subs').style.opacity=0; }
const onceKeys={};
function once(key,text,dur){ if(onceKeys[key])return; onceKeys[key]=true; say(text,dur); }
function tickSubs(dt){
  if(subActive){
    subT-=dt;
    if(subT<=0){ $('subs').style.opacity=0; if(subT<-.55) subActive=null; }
  } else if(subQ.length){
    subActive=subQ.shift(); subT=subActive.dur;
    const el=$('subs'); el.textContent=subActive.text;
    el.className=subActive.cls; el.style.opacity=1;
  }
}

/* ───────────────────── buildings ───────────────────── */
const WALL_T=.28, DOOR_W=1.4;
function mkDoor(bld,side,warded,fy){
  const {cx,cz,w,d}=bld;
  let gx=cx, gz=cz, nx=0, nz=0, alongX=true;
  if(side==='N'){ gz=cz-d/2; nz=-1; }
  if(side==='S'){ gz=cz+d/2; nz= 1; }
  if(side==='E'){ gx=cx+w/2; nx= 1; alongX=false; }
  if(side==='W'){ gx=cx-w/2; nx=-1; alongX=false; }
  const grp=new THREE.Group();
  if(alongX){ grp.position.set(gx-DOOR_W/2,fy,gz); }
  else{ grp.position.set(gx,fy,gz+DOOR_W/2); grp.rotation.y=Math.PI/2; }
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(DOOR_W,2.3,.09),matWood);
  mesh.position.set(DOOR_W/2,1.15,0); mesh.castShadow=true;
  grp.add(mesh); scene.add(grp);
  const ward=new THREE.Mesh(new THREE.PlaneGeometry(.55,.55),
    new THREE.MeshLambertMaterial({map:wardTexture,transparent:true,side:THREE.DoubleSide}));
  ward.position.set(DOOR_W/2,1.62,(nx+nz)>0? .06 : -.06);
  ward.visible=warded; grp.add(ward);
  const col={ minX:alongX?gx-DOOR_W/2-.05:gx-.16, maxX:alongX?gx+DOOR_W/2+.05:gx+.16,
              minZ:alongX?gz-.16:gz-DOOR_W/2-.05, maxZ:alongX?gz+.16:gz+DOOR_W/2+.05,
              minY:fy, maxY:fy+2.3, active:true, los:true };
  colliders.push(col);
  const door={ open:false, ang:0, warded, initWard:warded, grp, mesh, ward, col,
               cx:gx, cz:gz, nx, nz, fy, bld:bld.id,
               outP:{x:gx+nx*1.5,z:gz+nz*1.5}, inP:{x:gx-nx*1.5,z:gz-nz*1.5},
               openDir:alongX?-1:1 };
  interactables.push({
    p:{x:gx,y:fy+1.3,z:gz}, r:2.6,
    label:()=> (door.open?'[E] Close the door':'[E] Open the door') +
               (!door.warded && inv.tal>0 ? '   ·   [T] Hang talisman':''),
    act:()=>toggleDoor(door),
  });
  return door;
}
function toggleDoor(d,silent){
  d.open=!d.open; d.col.active=!d.open;
  if(!silent) sfx.creak();
}
function tickDoors(dt){
  for(const b of blds){
    const d=b.door, target=d.open? 1.9*d.openDir : 0;
    d.ang=lerp(d.ang,target,clamp(dt*6,0,1));
    d.grp.rotation.y=(d.grp.userData.baseY??(d.grp.userData.baseY=d.grp.rotation.y), d.grp.userData.baseY+d.ang);
  }
}

function mkLoot(kind,x,y,z,noteIdx){
  let mesh;
  if(kind==='battery') mesh=new THREE.Mesh(new THREE.BoxGeometry(.16,.3,.16),new THREE.MeshLambertMaterial({color:0xb8a23e}));
  else if(kind==='talisman') mesh=new THREE.Mesh(new THREE.PlaneGeometry(.38,.38),new THREE.MeshLambertMaterial({map:wardTexture,transparent:true,side:THREE.DoubleSide}));
  else if(kind==='stone') mesh=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),new THREE.MeshLambertMaterial({color:0x777468}));
  else mesh=new THREE.Mesh(new THREE.PlaneGeometry(.3,.4),new THREE.MeshLambertMaterial({color:0xcfc4a4,side:THREE.DoubleSide}));
  mesh.position.set(x,y,z); mesh.rotation.y=R(0,6); mesh.castShadow=false; scene.add(mesh);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,transparent:true,opacity:.5,depthWrite:false}));
  glow.scale.set(.7,.7,1); glow.position.set(x,y+.1,z); scene.add(glow);
  const pt={kind,x,y,z,taken:false,mesh,glow,noteIdx};
  lootPts.push(pt);
  interactables.push({
    p:{x,y,z}, r:2.2,
    cond:()=>!pt.taken,
    label:()=> kind==='note' ? '[E] Read the note' : `[E] Take ${kind}`,
    act:()=>{
      if(kind==='note'){ sfx.paper(); openNote(NOTES[pt.noteIdx]); return; }
      pt.taken=true; pt.mesh.visible=false; pt.glow.visible=false; sfx.pickup();
      if(kind==='battery'){ inv.bat=Math.min(inv.bat+50,150); say('A battery. Still warm. Don’t think about why.'); }
      if(kind==='talisman'){ inv.tal++; once('talFound','Three figures on old wood. It hums against your palm.'); }
      if(kind==='stone'){ inv.stone=Math.min(inv.stone+1,6); }
    },
  });
  return pt;
}
function mkExam(x,y,z,textFn,r=3){
  interactables.push({p:{x,y,z},r,label:()=>'[E] Examine',act:()=>say(typeof textFn==='function'?textFn():textFn,4.6)});
}
const hideSpots=[];
function mkHide(x,z,camY,exitX,exitZ,type,bldId,label){
  const spot={x,z,y:camY,exit:{x:exitX,z:exitZ},type,b:bldId,comp:false,label};
  hideSpots.push(spot);
  interactables.push({
    p:{x,y:camY,z}, r:2.3,
    cond:()=>!P.hidden,
    label:()=>`[E] ${label}`,
    act:()=>enterHide(spot),
  });
  return spot;
}

function makeBuilding(o){
  const id=blds.length;
  const {cx,cz,w,d,h,fy=0,side,warded=false,name,style}=o;
  const bld={id,cx,cz,w,d,h,fy,name,style,
    fp:{minX:cx-w/2+.2,maxX:cx+w/2-.2,minZ:cz-d/2+.2,maxZ:cz+d/2-.2}};
  const wallMat=new THREE.MeshLambertMaterial({color:wallCols[id%wallCols.length]});
  addBox(cx,fy+.07,cz,w,.14,d,matFloor,{col:false,cast:false});
  const yC=fy+h/2;
  for(const s of ['N','S','E','W']){
    const isDoor = s===side;
    if(s==='N'||s==='S'){
      const wz=s==='N'?cz-d/2:cz+d/2;
      if(!isDoor) addBox(cx,yC,wz,w,h,WALL_T,wallMat);
      else{
        const seg=(w-DOOR_W)/2;
        addBox(cx-w/2+seg/2,yC,wz,seg,h,WALL_T,wallMat);
        addBox(cx+w/2-seg/2,yC,wz,seg,h,WALL_T,wallMat);
        addBox(cx,fy+2.3+(h-2.3)/2,wz,DOOR_W,h-2.3,WALL_T,wallMat);
      }
    } else {
      const wx=s==='E'?cx+w/2:cx-w/2;
      if(!isDoor) addBox(wx,yC,cz,WALL_T,h,d,wallMat);
      else{
        const seg=(d-DOOR_W)/2;
        addBox(wx,yC,cz-d/2+seg/2,WALL_T,h,seg,wallMat);
        addBox(wx,yC,cz+d/2-seg/2,WALL_T,h,seg,wallMat);
        addBox(wx,fy+2.3+(h-2.3)/2,cz,WALL_T,h-2.3,DOOR_W,wallMat);
      }
    }
  }
  addBox(cx,fy+h+.16,cz,w+.7,.32,d+.7,matRoof);
  // dark windows on the two walls without the door
  const winY=fy+1.55;
  function win(x,z,ry){
    const wm=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.9),matWin);
    wm.position.set(x,winY,z); wm.rotation.y=ry; scene.add(wm);
  }
  if(side==='E'||side==='W'){
    for(const xx of [cx-w/4,cx+w/4]){
      win(xx,cz-d/2-.03,Math.PI);   // north wall
      win(xx,cz+d/2+.03,0);         // south wall
    }
  } else {
    for(const zz of [cz-d/4,cz+d/4]){
      win(cx-w/2-.03,zz,-Math.PI/2); // west wall
      win(cx+w/2+.03,zz,Math.PI/2);  // east wall
    }
  }
  bld.door=mkDoor(bld,side,warded,fy);

  // furniture
  const bx=cx-w/2+1.6, bz=cz-d/2+1.4;   // far corner from most doors
  if(style==='house'||style==='colony'){
    addBox(bx,fy+.3,bz,2,.6,1.1,matBed);
    addBox(bx-0.6,fy+.62,bz,.5,.12,.9,new THREE.MeshLambertMaterial({color:0x8a8272}),{col:false});
    interactables.push({
      p:{x:bx,y:fy+.8,z:bz}, r:2.1,
      cond:()=>phase()==='DAY'&&!P.hidden,
      label:()=>'[E] Sleep until dusk',
      act:sleep,
    });
    mkHide(bx,bz+1.3,fy+.42,bx,bz+2.1,'under',id,'Slide under the bed');
    const clx=cx+w/2-1, clz=cz-d/2+1;
    addBox(clx,fy+1.15,clz,1.1,2.3,1.1,matWood);
    mkHide(clx,clz,fy+1.5,clx-1.2,clz+.6,'closet',id,'Hide in the wardrobe');
    addBox(cx+w/2-.8,fy+.8,cz+d/4,1.3,1.6,.5,matWood);   // shelf
    bld.shelf={x:cx+w/2-.9,y:fy+1.7,z:cz+d/4};
    addBox(cx,fy+.45,cz+.5,1.5,.9,1,matWood);            // table
  }
  if(style==='colony'){
    addBox(cx,fy+.5,cz+1.2,5,.9,1.4,matWood);            // long table
    const cl2x=cx-w/2+1, cl2z=cz+d/2-1.2;
    addBox(cl2x,fy+1.15,cl2z,1.1,2.3,1.1,matWood);
    mkHide(cl2x,cl2z,fy+1.5,cl2x+1.2,cl2z-.6,'closet',id,'Hide in the cabinet');
    mkExam(cx+w/2-.4,fy+1.5,cz-2,
      'Tally marks gouged into the plaster. They stop at 97. Nobody stops counting at 97 on purpose.',2.6);
  }
  if(style==='diner'){
    addBox(cx-1,fy+.55,cz-1.6,7,1.1,1,matWood);          // counter
    mkHide(cx-3.2,cz-3,fy+.9,cx-3.2,cz-1,'crouch',id,'Duck behind the counter');
    addBox(cx-3,fy+.5,cz+2.6,1.6,1,.6,matBed);           // booths
    addBox(cx+1,fy+.5,cz+2.6,1.6,1,.6,matBed);
    addBox(cx-1,fy+.45,cz+2.6,1.2,.9,.9,matWood);
    const jb=addBox(cx+w/2-1,fy+.75,cz-2.8,.9,1.5,.7,new THREE.MeshLambertMaterial({color:0x5a2e28,emissive:0x220a08}));
    mkExam(jb.position.x,fy+1.2,jb.position.z,'It only plays one song. You have never pressed anything.',2.4);
    mkExam(cx-w/2+.5,fy+1.5,cz+2,'MISSING posters, sun-bleached. Every face is scratched out. The names are all in the same handwriting.',2.6);
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.4,1.1),new THREE.MeshBasicMaterial({map:dinerTexture}));
    sign.position.set(cx-w/2-.2,fy+h+.9,cz); sign.rotation.y=-Math.PI/2; scene.add(sign);
  }
  if(style==='shed'){
    addBox(cx,fy+.5,cz+d/2-1.4,2.4,1,.8,matWood);        // workbench
    bld.shelf={x:cx,y:fy+1.1,z:cz+d/2-1.4};
    addBox(cx-w/2+1,fy+.5,cz-d/2+1.2,1,1,1,matWood);     // crates
    addBox(cx-w/2+1,fy+1.3,cz-d/2+1.2,.8,.7,.8,matWood);
    mkHide(cx-w/2+2.2,cz-d/2+1.4,fy+.9,cx-w/2+3.4,cz-d/2+2,'crouch',id,'Crouch behind the crates');
  }
  blds.push(bld);
  return bld;
}

/* town layout */
const DINER = makeBuilding({cx:20,cz:-8, w:14,d:10,h:4,  side:'W',warded:true, name:'the diner',style:'diner'});
const HA = makeBuilding({cx:-24,cz:-34,w:10,d:8, h:3.6,side:'E',name:'a gray house',style:'house'});
const HB = makeBuilding({cx:-26,cz:26, w:9, d:9, h:3.6,side:'E',name:'the yellow house',style:'house'});
const HC = makeBuilding({cx:24, cz:34, w:10,d:8, h:3.6,side:'W',name:'the parson’s house',style:'house'});
const HD = makeBuilding({cx:-22,cz:68, w:9, d:8, h:3.6,side:'E',name:'the crooked house',style:'house'});
const HE = makeBuilding({cx:30, cz:-46,w:10,d:9, h:3.6,side:'W',name:'the last house',style:'house'});
const SHED= makeBuilding({cx:-72,cz:-14,w:8, d:12,h:3.4,side:'E',name:'the farm shed',style:'shed'});
const COLONY=makeBuilding({cx:0,cz:-150,w:16,d:12,h:5,fy:HILL.h,side:'S',warded:true,name:'Colony House',style:'colony'});

/* porch lights (the town has power; nobody asks from where) */
const porchA=new THREE.PointLight(0xffd9a0,0,16,1.8);
porchA.position.set(DINER.door.outP.x,2.6,DINER.door.outP.z); scene.add(porchA);
const porchB=new THREE.PointLight(0xffd9a0,0,18,1.8);
porchB.position.set(COLONY.door.outP.x,HILL.h+2.8,COLONY.door.outP.z); scene.add(porchB);

/* props */
{ // the bus
  addBox(2,1.5,121,3,2.6,9,new THREE.MeshLambertMaterial({color:0x76705f}));
  addBox(2,2.2,121,3.1,.8,8.2,matWin,{col:false});
  mkExam(2,1.4,116.2,'The bus. The engine is cold. It has been cold longer than you’ve been driving.',3.4);
}
{ // welcome sign
  addBox(6.5,1.2,106,.18,2.4,.18,matWood);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.3),new THREE.MeshLambertMaterial({map:signTexture,side:THREE.DoubleSide}));
  board.position.set(6.5,2,106); scene.add(board);
  mkExam(6.5,1.6,106,'WELCOME. There is older paint underneath. It says the same thing.',3);
}
{ // farm rows + scarecrow
  const cropMat=new THREE.MeshLambertMaterial({color:0x39412a});
  for(let i=0;i<6;i++) addBox(-73,.25,4+i*3,18,.5,.7,cropMat,{col:false});
  addBox(-64,1.5,10,.16,3,.16,matWood,{col:false});
  addBox(-64,2.2,10,1.6,.14,.14,matWood,{col:false});
  const head=new THREE.Mesh(new THREE.SphereGeometry(.28,8,8),new THREE.MeshLambertMaterial({color:0xb5a583}));
  head.position.set(-64,2.75,10); scene.add(head);
  mkExam(-64,1.8,10,'It faced the road this morning. You’re almost sure.',3);
  mkExam(-73,1,10,'Rows too straight. Nothing here grows crooked. Nothing here grows old.',3.4);
}
mkExam(16,HILL.h+1.2,-157.5,()=> twistDone
  ? `Fourteen crosses. And ${deaths} more with fresh dirt. You know the name on every one of them. It’s yours.`
  : 'Fourteen crosses. Someone keeps the weeds off.', 4.5);
function buildGraves(){
  scene.remove(graveGroup);
  graveGroup=new THREE.Group();
  const n=14+Math.min(deaths,25);
  for(let i=0;i<n;i++){
    const gx=11+(i%6)*1.7, gz=-160+Math.floor(i/6)*1.8;
    const c=new THREE.Group();
    const v=new THREE.Mesh(new THREE.BoxGeometry(.12,1.1,.12),matDark);
    v.position.y=.55; c.add(v);
    const hbar=new THREE.Mesh(new THREE.BoxGeometry(.6,.1,.1),matDark);
    hbar.position.y=.82; c.add(hbar);
    c.position.set(gx,HILL.h,gz); c.rotation.y=R(-.15,.15); c.rotation.z=R(-.06,.06);
    graveGroup.add(c);
  }
  scene.add(graveGroup);
}

/* fixed loot */
mkLoot('note',   14.5,1.25,-10.6,0);      // diner counter — house rules
mkLoot('battery',15.8,1.25,-9.4);
mkLoot('stone',  21,  1.05,-5.4);
mkLoot('talisman',HA.shelf.x,HA.shelf.y,HA.shelf.z);
mkLoot('note',  -24,  .35,-31,3);
mkLoot('battery',HB.shelf.x,HB.shelf.y,HB.shelf.z);
mkLoot('note',  -28.5,.35,24,4);
mkLoot('talisman',HC.shelf.x,HC.shelf.y,HC.shelf.z);
mkLoot('battery',24,  .35,31.4);
mkLoot('battery',HD.shelf.x,HD.shelf.y,HD.shelf.z);
mkLoot('note',  -20,  .35,66,2);
mkLoot('stone',  HE.shelf.x,HE.shelf.y,HE.shelf.z);
mkLoot('battery',31.5,.35,-43);
mkLoot('talisman',SHED.shelf.x,SHED.shelf.y,SHED.shelf.z);
mkLoot('stone', -73,  1.1,-9.5);
mkLoot('note',  -71,  1.1,-9,1);
mkLoot('talisman',-3.2,HILL.h+1.7,-153.5);
mkLoot('battery', 3,  HILL.h+1.7,-153.5);
mkLoot('note',    0,  HILL.h+.95,-148,5);
mkLoot('stone',  -8,  .25,12);
mkLoot('stone',   9,  .25,44);
mkLoot('stone',  -12, .25,-58);

const NOTES=[
 {t:'Nailed to the counter',b:'House rules.\n1. Inside before dark.\n2. Talisman on the door.\n3. Doors closed.\n4. Whatever it says through the wood — whatever voice it borrows — it is not her.\n\n— L.'},
 {t:'On the workbench',b:'The crops grow back overnight. The batteries too. The shelves restock themselves and nobody talks about it.\n\nThe town feeds what it keeps.'},
 {t:'Under a floorboard',b:'The tally in Colony House stopped at 97.\n\nAsk yourself why anyone would stop counting.'},
 {t:'Folded into a shoe',b:'They only walk. Remember that when your legs give out —\n\nthey never do.'},
 {t:'Pinned behind the door',b:'I hung the talisman upside-down as a test. It still worked.\n\nIt’s not the symbol. It’s the agreement.'},
 {t:'On the long table',b:'If you are reading this, the house is yours tonight. Keep the door shut. Keep the talisman up.\n\nDon’t sleep in the same house twice. It learns doors.'},
];

/* roam waypoints */
const WPTS=[];
for(let z=-88;z<=120;z+=16) WPTS.push({x:R(-3,3),z});
for(let x=-100;x<=100;x+=16) WPTS.push({x,z:R(-3,3)});
[[12,14],[-14,12],[14,-22],[-14,-20],[-50,-8],[8,52]].forEach(p=>WPTS.push({x:p[0],z:p[1]}));

/* ───────────────────── geometry queries ───────────────────── */
function inB(x,z){
  for(const b of blds){
    const f=b.fp;
    if(x>f.minX-.4&&x<f.maxX+.4&&z>f.minZ-.4&&z<f.maxZ+.4) return b.id;
  }
  return -1;
}
function collideCircle(x,z,r,feetY){
  for(const c of colliders){
    if(!c.active) continue;
    if(c.minY>feetY+1.7||c.maxY<feetY+.25) continue;
    if(x<=c.minX-r||x>=c.maxX+r||z<=c.minZ-r||z>=c.maxZ+r) continue;
    const cx=clamp(x,c.minX,c.maxX), cz=clamp(z,c.minZ,c.maxZ);
    let dx=x-cx, dz=z-cz;
    const d2=dx*dx+dz*dz;
    if(d2>=r*r) continue;
    if(d2<1e-9){
      const pl=x-(c.minX-r), pr=(c.maxX+r)-x, pt=z-(c.minZ-r), pb=(c.maxZ+r)-z;
      const m=Math.min(pl,pr,pt,pb);
      if(m===pl)x=c.minX-r; else if(m===pr)x=c.maxX+r; else if(m===pt)z=c.minZ-r; else z=c.maxZ+r;
    } else {
      const d=Math.sqrt(d2); x=cx+dx/d*r; z=cz+dz/d*r;
    }
  }
  return [x,z];
}
function losBlocked(ax,ay,az,bx,by,bz){
  const dx=bx-ax, dy=by-ay, dz=bz-az;
  for(const c of colliders){
    if(!c.active||!c.los) continue;
    let t0=0,t1=1;
    if(Math.abs(dx)<1e-9){ if(ax<c.minX||ax>c.maxX) continue; }
    else{ let ta=(c.minX-ax)/dx, tb=(c.maxX-ax)/dx; if(ta>tb){const q=ta;ta=tb;tb=q;} t0=Math.max(t0,ta); t1=Math.min(t1,tb); if(t0>t1) continue; }
    if(Math.abs(dy)<1e-9){ if(ay<c.minY||ay>c.maxY) continue; }
    else{ let ta=(c.minY-ay)/dy, tb=(c.maxY-ay)/dy; if(ta>tb){const q=ta;ta=tb;tb=q;} t0=Math.max(t0,ta); t1=Math.min(t1,tb); if(t0>t1) continue; }
    if(Math.abs(dz)<1e-9){ if(az<c.minZ||az>c.maxZ) continue; }
    else{ let ta=(c.minZ-az)/dz, tb=(c.maxZ-az)/dz; if(ta>tb){const q=ta;ta=tb;tb=q;} t0=Math.max(t0,ta); t1=Math.min(t1,tb); if(t0>t1) continue; }
    return true;
  }
  return false;
}

/* ───────────────────── monsters ───────────────────── */
const clothCols=[0x4a4038,0x3d4248,0x514438,0x2f3336,0x463b30];
class Monster{
  constructor(x,z,scripted){
    this.x=x; this.z=z; this.yaw=0; this.dead=false;
    this.state=scripted?'stare':'approach';
    this.stareT=scripted?2.6:0;
    this.goal=null; this.plan=[]; this.wait=0;
    this.alert=0; this.lastSeen=null; this.loseT=0; this.searchT=0;
    this.bangT=0; this.frust=0; this.sndT=R(2,8); this.stuckT=0; this.veerT=0; this.veerS=1;
    this.walkT=0; this.spd=0;
    this.entry={x:R(-30,30),z:R(-30,40)};
    this.chaseAnnounced=false;
    this.buildMesh();
  }
  buildMesh(){
    const g=new THREE.Group();
    const cloth=new THREE.MeshLambertMaterial({color:clothCols[RI(0,4)]});
    const skin=new THREE.MeshLambertMaterial({color:0xd8c9ac});
    this.legL=new THREE.Mesh(new THREE.CylinderGeometry(.09,.08,.9,6),matDark);
    this.legR=this.legL.clone();
    this.legL.position.set(-.13,.45,0); this.legR.position.set(.13,.45,0);
    this.legL.geometry.translate(0,-.45,0); this.legL.position.y=.9;
    this.legR.geometry=this.legL.geometry; this.legR.position.y=.9;
    g.add(this.legL,this.legR);
    const torso=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,.85,7),cloth);
    torso.position.y=1.32; g.add(torso);
    this.armL=new THREE.Mesh(new THREE.CylinderGeometry(.06,.05,.72,5),cloth);
    this.armL.geometry.translate(0,-.36,0);
    this.armR=this.armL.clone();
    this.armL.position.set(-.3,1.68,0); this.armR.position.set(.3,1.68,0);
    const handG=new THREE.SphereGeometry(.07,6,5);
    const hl=new THREE.Mesh(handG,skin); hl.position.y=-.74; this.armL.add(hl);
    const hr=new THREE.Mesh(handG,skin); hr.position.y=-.74; this.armR.add(hr);
    g.add(this.armL,this.armR);
    this.head=new THREE.Group(); this.head.position.y=1.98;
    const skull=new THREE.Mesh(new THREE.SphereGeometry(.24,12,10),skin); this.head.add(skull);
    this.face=new THREE.Mesh(new THREE.CircleGeometry(.215,20),
      new THREE.MeshLambertMaterial({map:faceTexture,emissiveMap:faceTexture,emissive:0x8f8066}));
    this.face.position.z=.17; this.head.add(this.face);
    const hair=new THREE.Mesh(new THREE.SphereGeometry(.25,10,8,0,Math.PI*2,0,1.2),matDark);
    hair.position.y=.06; hair.position.z=-.05; this.head.add(hair);
    if(Math.random()<.5){
      const brim=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.03,10),matDark);
      brim.position.y=.18; this.head.add(brim);
      const top=new THREE.Mesh(new THREE.CylinderGeometry(.17,.18,.22,10),matDark);
      top.position.y=.3; this.head.add(top);
    }
    g.add(this.head);
    g.traverse(m=>{ if(m.isMesh) m.castShadow=true; });
    const s=R(1,1.14); g.scale.setScalar(s);
    this.mesh=g; scene.add(g);
  }
  remove(){ this.dead=true; scene.remove(this.mesh); }
  hearNoise(x,z){
    if(this.state==='chase'||this.state==='leave') return;
    this.state='investigate'; this.goal={x,z}; this.plan=[]; this.searchT=0;
  }
  canSeePlayer(){
    if(P.hidden&&!P.hidden.comp) return false;
    const d=dist2d(this.x,this.z,P.x,P.z);
    let range = phase()==='NIGHT'?22:14;
    if(P.crouch) range*=.55;
    if(inv.flash) range*=1.6;
    if(d>range&&d>3) return false;
    if(d>3){
      const fdx=Math.sin(this.yaw), fdz=Math.cos(this.yaw);
      const dx=(P.x-this.x)/d, dz=(P.z-this.z)/d;
      if(fdx*dx+fdz*dz<.42) return false;
    }
    const hy=groundH(this.x,this.z)+1.9;
    return !losBlocked(this.x,hy,this.z,P.x,P.eyeY,P.z);
  }
  blockingDoor(dirX,dirZ){
    for(const b of blds){
      const d=b.door;
      if(d.open) continue;
      const ddx=d.cx-this.x, ddz=d.cz-this.z;
      const dd=Math.hypot(ddx,ddz);
      if(dd<2.1 && (ddx*dirX+ddz*dirZ)>0) return d;
    }
    return null;
  }
  routeGoal(tx,tz){
    const mb=inB(this.x,this.z), tb=inB(tx,tz);
    if(mb===tb) return {x:tx,z:tz};
    if(mb!==-1){
      const dd=blds[mb].door;
      return dist2d(this.x,this.z,dd.inP.x,dd.inP.z)<1.4 ? dd.outP : dd.inP;
    }
    const dd=blds[tb].door;
    if(dd.warded) return null;   // can't get in
    return dist2d(this.x,this.z,dd.outP.x,dd.outP.z)<1.4 ? dd.inP : dd.outP;
  }
  newPlan(){
    if(Math.random()<.4){
      const cand=blds.filter(b=>!b.door.warded && b.fy<1);
      if(cand.length){
        const b=cand[RI(0,cand.length-1)];
        this.plan=[b.door.outP,b.door.inP,
          {x:clamp(b.cx+R(-2,2),b.fp.minX+1,b.fp.maxX-1),z:clamp(b.cz+R(-2,2),b.fp.minZ+1,b.fp.maxZ-1),dwell:R(2,5)},
          b.door.inP,b.door.outP];
        this.goal=this.plan.shift();
        return;
      }
    }
    this.goal=WPTS[RI(0,WPTS.length-1)];
  }
  update(dt){
    if(this.dead) return;
    const dP=dist2d(this.x,this.z,P.x,P.z);
    /* perception */
    this.perT=(this.perT||0)+dt;
    if(this.perT>.14 && state==='play'){
      this.perT=0;
      const seen=this.canSeePlayer();
      if(seen){
        this.lastSeen={x:P.x,z:P.z}; this.loseT=0;
        if(this.state!=='chase'&&this.state!=='leave'){
          this.alert+=.35+6/Math.max(dP,3);
          if(this.alert>=1||dP<11){
            this.state='chase'; this.plan=[]; this.frust=0;
            sfx.sting();
            const [pn,vl]=panVol(this.x,this.z);
            sfx.giggle(pn,vl);
            once('firstChase','It’s smiling. It’s been smiling the whole walk.');
          } else if(this.state!=='investigate'){
            this.state='investigate'; this.goal={...this.lastSeen}; this.searchT=0;
          }
        }
      } else {
        this.alert=Math.max(0,this.alert-.04);
        if(this.state==='chase') this.loseT+=.14;
      }
      // hearing
      if(!seen && this.state!=='chase' && this.state!=='leave' && P.noiseR>0 && dP<P.noiseR)
        this.hearNoise(P.x,P.z);
    }
    /* state logic */
    let want=0;
    if(this.state==='stare'){
      this.stareT-=dt;
      this.yaw=Math.atan2(P.x-this.x,P.z-this.z);
      if(this.stareT<=0) this.state='approach';
    }
    else if(this.state==='approach'){
      this.goal=this.entry; want=3.1;
      if(dist2d(this.x,this.z,this.entry.x,this.entry.z)<3){ this.state='roam'; this.goal=null; }
    }
    else if(this.state==='roam'){
      want=1.7;
      if(this.wait>0){ this.wait-=dt; want=0; }
      else if(!this.goal) this.newPlan();
      else if(dist2d(this.x,this.z,this.goal.x,this.goal.z)<1.3){
        if(this.goal.dwell) this.wait=this.goal.dwell;
        this.goal=this.plan.length?this.plan.shift():null;
        if(!this.goal&&!this.wait) this.wait=R(.5,2.5);
      }
    }
    else if(this.state==='investigate'){
      want=2.5;
      if(this.goal&&dist2d(this.x,this.z,this.goal.x,this.goal.z)>1.4){ /* walking */ }
      else{
        this.searchT+=dt; want=1.4;
        if(!this.goal||this.searchT>6){ this.state='roam'; this.goal=null; this.searchT=0; }
        else if(dist2d(this.x,this.z,this.goal.x,this.goal.z)<1.4)
          this.goal={x:this.goal.x+R(-4,4),z:this.goal.z+R(-4,4)};
      }
    }
    else if(this.state==='chase'){
      want=4.7;
      const g=this.routeGoal(P.x,P.z);
      if(g===null){
        // player is behind a warded door — stand and smile
        const tb=inB(P.x,P.z), dd=blds[tb].door;
        this.goal={x:dd.outP.x,z:dd.outP.z};
        if(dist2d(this.x,this.z,dd.outP.x,dd.outP.z)<2){
          want=0; this.frust+=dt;
          this.yaw=Math.atan2(P.x-this.x,P.z-this.z);
          if(this.frust>7){ this.state='roam'; this.goal=null; this.frust=0; this.alert=0; }
        }
      } else this.goal=g;
      if(this.loseT>5&&this.lastSeen&&dist2d(this.x,this.z,this.lastSeen.x,this.lastSeen.z)<3){
        // it reached where you were and you weren't there
        this.state='investigate';
        this.goal={x:this.lastSeen.x+R(-5,5),z:this.lastSeen.z+R(-5,5)};
        this.searchT=0; this.loseT=0; this.alert=0;
      }
      else if(this.loseT>6&&dP>12){
        this.state='investigate';
        this.goal=this.lastSeen?{...this.lastSeen}:null;
        this.searchT=0; this.loseT=0;
      }
    }
    else if(this.state==='leave'){
      want=2.6;
      if(!this.goal){ const a=Math.atan2(this.x,this.z+20); this.goal={x:Math.sin(a)*220,z:Math.cos(a)*220-20}; }
      if(dist2d(this.x,this.z,0,-20)>190) this.remove();
    }
    /* movement + doors */
    if(want>0&&this.goal){
      let dx=this.goal.x-this.x, dz=this.goal.z-this.z;
      const dl=Math.hypot(dx,dz)||.001; dx/=dl; dz/=dl;
      const door=this.blockingDoor(dx,dz);
      if(door){
        if(door.warded){
          want=0; this.frust+=dt;
          if(this.frust>4){
            this.frust=0;
            if(this.state==='chase'){ this.state='roam'; this.alert=0; }
            this.goal=null; this.plan=[];
          }
        } else {
          want=0; this.bangT+=dt;
          if(!this.bangCd||this.bangCd<=0){
            const [pn,vl]=panVol(door.cx,door.cz);
            sfx.bang(pn,Math.max(vl,.15)); this.bangCd=.8;
            if(dP<26) once('bangHeard'+day,'Something is knocking. It isn’t knocking to be let in. It’s counting the hinges.');
          }
          this.bangCd-=dt;
          if(this.bangT>2.4){ this.bangT=0; if(!door.open) toggleDoor(door,true); const [pn,vl]=panVol(door.cx,door.cz); sfx.creak(); }
        }
      }
      if(this.veerT>0){ this.veerT-=dt; const q=dx; dx=dz*this.veerS; dz=-q*this.veerS; }
      if(want>0){
        const nx=this.x+dx*want*dt, nz=this.z+dz*want*dt;
        const [rx,rz]=collideCircle(nx,nz,.42,groundH(this.x,this.z));
        const moved=dist2d(rx,rz,this.x,this.z);
        if(moved<want*dt*.25){ this.stuckT+=dt; if(this.stuckT>.6){ this.veerT=.8; this.veerS=Math.random()<.5?1:-1; this.stuckT=0; } }
        else this.stuckT=0;
        this.x=rx; this.z=rz;
        if(moved>.001){
          const ty=Math.atan2(dx,dz);
          let dy=ty-this.yaw;
          while(dy>Math.PI)dy-=Math.PI*2; while(dy<-Math.PI)dy+=Math.PI*2;
          this.yaw+=dy*clamp(dt*6,0,1);
        }
        this.spd=moved/dt;
      } else this.spd=0;
    } else this.spd=0;
    /* voice */
    this.sndT-=dt;
    if(this.sndT<=0){
      const [pn,vl,d]=panVol(this.x,this.z);
      if(vl>.02){
        if(this.state==='chase') sfx.giggle(pn,vl);
        else sfx.whistle(pn,vl*.8);
      }
      this.sndT=this.state==='chase'?R(2,4):R(6,14);
    }
    /* grab */
    if(state==='play'&&dP<1.6){
      if(P.hidden){ if(P.hidden.comp) kill(this); }
      else{
        const hy=groundH(this.x,this.z)+1.9;
        if(dP<1.05||!losBlocked(this.x,hy,this.z,P.x,P.eyeY,P.z)) kill(this);
      }
    }
    /* animate */
    this.walkT+=this.spd*dt*2.4;
    const sw=Math.sin(this.walkT);
    this.legL.rotation.x=sw*.55; this.legR.rotation.x=-sw*.55;
    this.armL.rotation.x=-sw*.4; this.armR.rotation.x=sw*.4;
    const gy=groundH(this.x,this.z);
    this.mesh.position.set(this.x,gy+Math.abs(Math.cos(this.walkT))*.04,this.z);
    this.mesh.rotation.y=this.yaw;
    // the head finds you
    if(dP<45){
      const ty=Math.atan2(P.x-this.x,P.z-this.z);
      let rel=ty-this.yaw;
      while(rel>Math.PI)rel-=Math.PI*2; while(rel<-Math.PI)rel+=Math.PI*2;
      this.head.rotation.y=lerp(this.head.rotation.y,clamp(rel,-1.15,1.15),clamp(dt*3,0,1));
    } else this.head.rotation.y=lerp(this.head.rotation.y,0,clamp(dt*2,0,1));
  }
}
function monsterCount(d){ return clamp(2+Math.floor((d-1)/6),2,6)+(d>=15?1:0); }
function spawnNight(){
  const n=monsterCount(day);
  for(let i=0;i<n;i++){
    if(day===1&&i===0){
      // the first one arrives on the road ahead, already looking at you
      const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw);
      monsters.push(new Monster(P.x+fx*26,P.z+fz*26,true));
      sfx.sting();
      say('There’s someone on the road.',3);
      say('It isn’t someone.',3.2);
      continue;
    }
    const a=R(0,Math.PI*2), r=R(110,145);
    monsters.push(new Monster(Math.sin(a)*r,Math.cos(a)*r-20,false));
  }
}

/* ───────────────────── player / inventory ───────────────────── */
const SPAWN={x:2,z:112};
const P={x:SPAWN.x,z:SPAWN.z,yaw:0,pitch:0,eyeY:1.62,crouch:false,ch:1.62,
         stam:100,hidden:null,breath:0,noiseR:0,bobT:0,stepAcc:0,building:-1};
const inv={tal:1,stone:2,bat:70,flash:false};
const keys={};
let state='title', forced=false, uiNote=false, uiCine=false;
let day=1, tod=.06, prevTod=.06;
const CYCLE=150;
let deaths=parseInt(localStorage.getItem('from_deaths')||'0',10);
let twistDone=false, whispers=false;
let lastShelter=-1, nightFalls=[], windowT=0, whisperT=0, dayEventT=R(20,50);
let dyingT=0, killer=null;
let currentPrompt=null;
let stones=[];
let hbT=0;

function phase(){
  if(tod<.42) return 'DAY';
  if(tod<.5) return 'DUSK';
  if(tod<.92) return 'NIGHT';
  return 'DAWN';
}
function nightF(){
  if(tod<.42) return clamp(1-(tod)/.06,0,1)*0;   // day
  if(tod<.53) return clamp((tod-.46)/.07,0,1);
  if(tod<.9) return 1;
  return clamp(1-(tod-.9)/.08,0,1);
}

/* environment keyframes */
const STOPS=[
  {t:0,   sky:'#46485a',sun:.5, sunc:'#c9b299',hemi:.35,fog:.012},
  {t:.06, sky:'#8d9793',sun:1.4,sunc:'#e8e4d4',hemi:.55,fog:.0085},
  {t:.38, sky:'#8d9793',sun:1.4,sunc:'#e8e4d4',hemi:.55,fog:.0085},
  {t:.46, sky:'#6e4433',sun:.7, sunc:'#d98d4f',hemi:.35,fog:.012},
  {t:.53, sky:'#0b1019',sun:.34,sunc:'#8da0cc',hemi:.26,fog:.018},
  {t:.9,  sky:'#0b1019',sun:.34,sunc:'#8da0cc',hemi:.26,fog:.018},
  {t:.97, sky:'#3d3f4c',sun:.35,sunc:'#b7a58f',hemi:.28,fog:.014},
  {t:1,   sky:'#46485a',sun:.5, sunc:'#c9b299',hemi:.35,fog:.012},
].map(s=>({...s,sky:new THREE.Color(s.sky),sunc:new THREE.Color(s.sunc)}));
const _sky=new THREE.Color(), _sunc=new THREE.Color();
function applyEnv(){
  let a=STOPS[0], b=STOPS[STOPS.length-1];
  for(let i=0;i<STOPS.length-1;i++)
    if(tod>=STOPS[i].t&&tod<=STOPS[i+1].t){ a=STOPS[i]; b=STOPS[i+1]; break; }
  const t=(tod-a.t)/Math.max(b.t-a.t,1e-6);
  _sky.copy(a.sky).lerp(b.sky,t);
  _sunc.copy(a.sunc).lerp(b.sunc,t);
  scene.background=_sky; scene.fog.color.copy(_sky);
  scene.fog.density=lerp(a.fog,b.fog,t);
  sun.intensity=lerp(a.sun,b.sun,t); sun.color.copy(_sunc);
  hemi.intensity=lerp(a.hemi,b.hemi,t);
  const nf=nightF();
  starMat.opacity=nf*.9; moon.material.opacity=nf*.85;
  moon.position.set(P.x+90,150,P.z-160);
  porchA.intensity=nf*1.3; porchB.intensity=nf*1.5;
  if(windG) windG.gain.value=.04+nf*.045;
  if(droneG) droneG.gain.value=nf*.05;
  const sunDir=nf>.5?{x:-.35,y:.75,z:-.3}:{x:.42,y:.8,z:.3};
  sun.position.set(P.x+sunDir.x*120,sunDir.y*120,P.z+sunDir.z*120);
  sun.target.position.set(P.x,0,P.z);
}

/* ───────────────────── hiding ───────────────────── */
function enterHide(spot){
  if(P.hidden) return;
  spot.comp=false;
  // did anything watch you go in?
  for(const m of monsters){
    if(m.dead) continue;
    const d=dist2d(m.x,m.z,P.x,P.z);
    if(d<30&&m.canSeePlayer()){ spot.comp=true; m.state='chase'; m.lastSeen={x:spot.x,z:spot.z}; }
  }
  P.hidden=spot; P.breath=0; P.prevX=P.x; P.prevZ=P.z;
  P.x=spot.x; P.z=spot.z;
  P.baseYaw=P.yaw;
  if(spot.type==='closet') $('slits').style.display='block';
  once('firstHide','Small. Quiet. Nothing knows you’re here.');
}
function exitHide(){
  if(!P.hidden) return;
  const s=P.hidden;
  P.x=s.exit.x; P.z=s.exit.z; P.hidden=null;
  $('slits').style.display='none';
  $('breathwrap').style.display='none';
}

/* ───────────────────── actions ───────────────────── */
function sleep(){
  fadeTo(1,700,()=>{
    tod=.425; prevTod=.42;
    P.stam=100;
    say('You don’t dream here. You wait with your eyes closed. There’s a difference.',4);
    fadeTo(0,900);
  });
}
function fadeTo(op,ms,cb){
  const f=$('fade');
  f.style.transition=`opacity ${ms}ms`;
  f.style.opacity=op;
  if(cb) setTimeout(cb,ms+30);
}
function hangTalisman(){
  if(inv.tal<=0) return;
  let best=null,bd=3.2;
  for(const b of blds){
    const d=dist2d(P.x,P.z,b.door.cx,b.door.cz);
    if(d<bd&&!b.door.warded){bd=d;best=b.door;}
  }
  if(!best) return;
  best.warded=true; best.ward.visible=true; inv.tal--;
  sfx.pickup();
  once('firstHang','Three figures. Holding hands — or holding each other back.');
}
function throwStone(){
  if(inv.stone<=0||P.hidden) return;
  inv.stone--;
  const f={x:-Math.sin(P.yaw)*Math.cos(P.pitch),y:Math.sin(P.pitch),z:-Math.cos(P.yaw)*Math.cos(P.pitch)};
  const tx=P.x+f.x*16, tz=P.z+f.z*16;
  const m=new THREE.Mesh(new THREE.SphereGeometry(.07,6,5),new THREE.MeshLambertMaterial({color:0x8a8578}));
  scene.add(m);
  stones.push({m,t:0,fx:P.x,fy:P.eyeY,fz:P.z,tx,tz,ty:groundH(tx,tz)+.05});
}
function tickStones(dt){
  for(let i=stones.length-1;i>=0;i--){
    const s=stones[i]; s.t+=dt/.55;
    if(s.t>=1){
      scene.remove(s.m); stones.splice(i,1);
      const [pn,vl]=panVol(s.tx,s.tz);
      sfx.stoneTick(pn,Math.max(vl,.25));
      for(const mo of monsters)
        if(!mo.dead&&dist2d(mo.x,mo.z,s.tx,s.tz)<24) mo.hearNoise(s.tx,s.tz);
      continue;
    }
    const t=s.t;
    s.m.position.set(lerp(s.fx,s.tx,t), lerp(s.fy,s.ty,t)+Math.sin(t*Math.PI)*2.2, lerp(s.fz,s.tz,t));
  }
}

/* notes overlay */
function openNote(n){
  uiNote=true;
  $('notetitle').textContent=n.t;
  $('notebody').textContent=n.b;
  $('note').classList.add('show');
}
function closeNote(){
  uiNote=false;
  $('note').classList.remove('show');
}

/* cinematic overlay */
function cine(lines,cb){
  uiCine=true;
  $('cine').classList.add('show');
  const el=$('cineline');
  let i=0;
  function next(){
    if(i>=lines.length){
      el.style.opacity=0;
      setTimeout(()=>{ $('cine').classList.remove('show'); uiCine=false; if(cb)cb(); },700);
      return;
    }
    el.style.opacity=0;
    setTimeout(()=>{ el.textContent=lines[i++]; el.style.opacity=1; setTimeout(next,3100); },650);
  }
  next();
}

/* ───────────────────── death / win / reset ───────────────────── */
const DEATH_LINES=[
  'It holds you like an old friend.',
  'Teeth. So many teeth for such a small smile.',
  'It doesn’t hurry, even now.',
  'The last thing you see is how happy it is.',
];
function kill(m){
  if(state!=='play') return;
  state='dying'; dyingT=0; killer=m;
  if(P.hidden){ $('slits').style.display='none'; $('breathwrap').style.display='none'; }
  killer.yaw=Math.atan2(P.x-killer.x,P.z-killer.z);
  killer.mesh.rotation.y=killer.yaw;
  killer.head.rotation.y=0;
  sfx.screech();
  $('red').style.opacity=.5;
}
function finishDeath(){
  state='dead';
  deaths++; localStorage.setItem('from_deaths',String(deaths));
  buildGraves();
  $('deathline').textContent=DEATH_LINES[RI(0,DEATH_LINES.length-1)]+' The town keeps what it takes.';
  $('deathstats').textContent=`YOU LASTED ${day-1} NIGHT${day-1===1?'':'S'} · THE TOWN HAS TAKEN YOU ${deaths} TIME${deaths===1?'':'S'}`;
  $('death').classList.add('show');
  $('red').style.opacity=0;
}
function win(){
  state='win';
  $('winline').textContent='The fog opens down the south road like a held breath, let go. You walk. You don’t look back. The town lets you — this time.';
  $('winstats').textContent=`30 NIGHTS SURVIVED · TAKEN ${deaths} TIME${deaths===1?'':'S'} ALONG THE WAY`;
  $('win').classList.add('show');
}
function reset(){
  for(const m of monsters) m.remove();
  monsters.length=0;
  for(const b of blds){
    const d=b.door;
    d.open=false; d.ang=0; d.col.active=true;
    d.warded=d.initWard; d.ward.visible=d.initWard;
    d.grp.rotation.y=d.grp.userData.baseY??d.grp.rotation.y;
  }
  for(const pt of lootPts){ pt.taken=false; pt.mesh.visible=true; pt.glow.visible=true; }
  inv.tal=1; inv.stone=2; inv.bat=70; inv.flash=false; flash.intensity=0;
  Object.assign(P,{x:SPAWN.x,z:SPAWN.z,yaw:0,pitch:0,crouch:false,stam:100,hidden:null,breath:0});
  day=1; tod=.06; prevTod=.06;
  twistDone=false; whispers=false; lastShelter=-1; nightFalls=[];
  for(const k of Object.keys(onceKeys)) delete onceKeys[k];
  subQ=[]; subActive=null; $('subs').style.opacity=0;
  $('slits').style.display='none'; $('breathwrap').style.display='none';
  $('obj').textContent='Survive 30 nights.';
  buildGraves();
  $('death').classList.remove('show'); $('win').classList.remove('show');
  if(deaths>0){ say('The bus again. The same cold engine.',3.4); say('Day 1. Again.',3); }
  else intro();
  state = (forced||document.pointerLockElement) ? 'play' : 'pause';
  if(state==='pause') $('pause').classList.add('show');
}
function intro(){
  say('The detour wasn’t on the map.',3.4);
  say('The town was.',3);
  say('Find shelter before dark. A talisman on the door keeps them out. Thirty nights.',5);
}

/* ───────────────────── the twist ───────────────────── */
function runTwist(){
  twistDone=true;
  cine([
    'DAY 15.',
    'Halfway. You let yourself think the word “halfway.”',
    'There’s a new note nailed to the diner door.',
    'You know the handwriting. It’s yours.',
    '“STOP COUNTING DAYS. COUNT THE GRAVES.”',
  ],()=>{
    whispers=true;
    $('obj').textContent='Count the graves behind Colony House.';
    say('The graves. Behind Colony House. Go and count.',4.5);
    say(deaths>0?'You have read that note before. You will read it again.':'Your hands are steady. That’s the worst part.',4.5);
  });
}
const WHISPERS=[
  '…it knows the name you came with…',
  '…stop counting…',
  '…the door was never locked…',
  '…you buried yourself…',
  '…smile back…',
];
const DAY_EVENTS=[
  'A rotary phone rings in an empty house. Once.',
  'The birds go quiet all at once, like a switch.',
  'Somewhere, the jukebox starts by itself. One song.',
  'A curtain moves in a house you know is empty.',
];

/* ───────────────────── time / schedule ───────────────────── */
function onNightStart(){
  spawnNight();
  say('They’re coming out of the trees.',3.6);
  nightFalls=[];
  const pb=inB(P.x,P.z);
  if(pb!==-1&&pb===lastShelter&&blds[pb].door.warded){
    nightFalls.push({t:R(.6,.82),b:pb});
    once('learnDoor','You slept here last night too. Something outside knows that.');
  }
  lastShelter=pb;
  if(Math.random()<.14){
    const cand=blds.filter(b=>b.door.warded&&!b.door.initWard&&b.id!==pb);
    if(cand.length) nightFalls.push({t:R(.55,.85),b:cand[RI(0,cand.length-1)].id,silent:true});
  }
  windowT=R(20,45); whisperT=R(15,35);
}
function onDawn(){
  for(const m of monsters) if(!m.dead){ m.state='leave'; m.goal=null; }
  say('Dawn. They walk back into the woods like they’re clocking out.',4);
}
function onNewDay(){
  if(day>=30){ win(); return; }
  day++;
  for(const m of monsters) m.remove();
  monsters.length=0;
  // the shelves restock themselves
  for(const pt of lootPts){
    if(!pt.taken||pt.kind==='note') continue;
    const p=pt.kind==='battery'?.55:pt.kind==='stone'?.5:.22;
    if(Math.random()<p){ pt.taken=false; pt.mesh.visible=true; pt.glow.visible=true; }
  }
  dayEventT=R(15,45);
  if(day===15&&!twistDone) runTwist();
  else if(day===8) say('A week. The bread in the diner is fresh again. Nobody baked it.',4.5);
  else if(day===22) say('Eight to go. The whistling sounds almost patient now.',4);
  else if(day===29) say('One more night. They know it too.',4);
}
function tickSchedule(dt){
  prevTod=tod;
  tod+=dt/CYCLE;
  if(prevTod<.4&&tod>=.4){ sfx.sting(); sayNow('The light’s dying. Get inside. Close the door.',4); }
  if(prevTod<.5&&tod>=.5) onNightStart();
  if(prevTod<.92&&tod>=.92) onDawn();
  if(tod>=1){ tod-=1; prevTod=0; onNewDay(); }
  // scheduled talisman failures
  for(let i=nightFalls.length-1;i>=0;i--){
    const ev=nightFalls[i];
    if(tod>=ev.t&&phase()==='NIGHT'){
      nightFalls.splice(i,1);
      const b=blds[ev.b], d=b.door;
      if(!d.warded) continue;
      d.warded=false; d.ward.visible=false;
      mkFallenTalisman(b);
      if(inB(P.x,P.z)===b.id){
        sfx.clatter();
        sayNow('The talisman just fell. The nail didn’t fail. The agreement did.',3.6);
        say('HANG IT BACK. NOW.',2.8);
      }
      let nm=null,nd=1e9;
      for(const m of monsters){ if(m.dead)continue; const dd=dist2d(m.x,m.z,d.cx,d.cz); if(dd<nd){nd=dd;nm=m;} }
      if(nm&&nd<70) nm.hearNoise(d.outP.x,d.outP.z);
    }
  }
  // window faces
  if(phase()==='NIGHT'){
    windowT-=dt;
    if(windowT<=0){
      windowT=R(30,60);
      const pb=inB(P.x,P.z);
      if(pb!==-1&&blds[pb].door.warded&&monsters.length){
        sfx.giggle(R(-.7,.7),.5);
        say('Something’s at the glass. It can wait all night. Can you?',4);
      }
    }
    if(whispers){
      whisperT-=dt;
      if(whisperT<=0){ whisperT=R(20,45); say(WHISPERS[RI(0,WHISPERS.length-1)],3.4,'whisper'); }
    }
  }
  if(phase()==='DAY'){
    dayEventT-=dt;
    if(dayEventT<=0){ dayEventT=R(40,90); say(DAY_EVENTS[RI(0,DAY_EVENTS.length-1)],4); }
  }
}
function mkFallenTalisman(b){
  const d=b.door;
  const x=d.inP.x, z=d.inP.z, y=d.fy+.12;
  const existing=lootPts.find(p=>p.kind==='talisman'&&p.fallen===b.id);
  if(existing){ existing.taken=false; existing.mesh.visible=true; existing.glow.visible=true; return; }
  const pt=mkLoot('talisman',x,y,z);
  pt.fallen=b.id;
  pt.mesh.rotation.x=-Math.PI/2;
}

/* ───────────────────── input ───────────────────── */
addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(e.code==='Space') e.preventDefault();
  if(e.code==='Enter'){
    if(state==='dead'||state==='win'){ fadeTo(1,400,()=>{ reset(); fadeTo(0,800); }); }
    return;
  }
  if(state!=='play') return;
  if(uiNote){ if(e.code==='KeyE'||e.code==='Escape') closeNote(); return; }
  if(uiCine) return;
  if(e.code==='KeyE'){
    if(P.hidden) exitHide();
    else if(currentPrompt) currentPrompt.act();
  }
  if(e.code==='KeyF'){
    if(inv.bat>0){ inv.flash=!inv.flash; sfx.pickup(); }
    else once('deadBat','Dead. The dark leans in.');
  }
  if(e.code==='KeyT') hangTalisman();
  if(e.code==='KeyQ') throwStone();
  if(e.code==='KeyC') P.crouch=!P.crouch;
});
addEventListener('keyup',e=>{ keys[e.code]=false; });
addEventListener('mousemove',e=>{
  if(!document.pointerLockElement||state!=='play') return;
  P.yaw-=e.movementX*.0022;
  P.pitch=clamp(P.pitch-e.movementY*.0022,-1.5,1.5);
  if(P.hidden){
    let rel=P.yaw-P.baseYaw;
    while(rel>Math.PI)rel-=Math.PI*2; while(rel<-Math.PI)rel+=Math.PI*2;
    P.yaw=P.baseYaw+clamp(rel,-.7,.7);
    P.pitch=clamp(P.pitch,-.5,.5);
  }
});
function tryLock(){
  try{ renderer.domElement.requestPointerLock(); }catch(e){}
}
$('title').addEventListener('click',()=>{
  initAudio();
  if(AC&&AC.state==='suspended') AC.resume();
  $('title').classList.remove('show');
  tryLock();
  state='play';
  intro();
});
$('pause').addEventListener('click',()=>{ tryLock(); $('pause').classList.remove('show'); state='play'; });
document.addEventListener('pointerlockchange',()=>{
  if(!document.pointerLockElement&&state==='play'&&!forced){
    state='pause'; $('pause').classList.add('show');
  }
});
renderer.domElement.addEventListener('click',()=>{
  if(state==='play'&&!document.pointerLockElement&&!forced) tryLock();
});

/* ───────────────────── player tick ───────────────────── */
function tickPlayer(dt){
  if(P.hidden){
    P.noiseR=0;
    // breath
    let nearD=1e9;
    for(const m of monsters){ if(m.dead)continue; const d=dist2d(m.x,m.z,P.x,P.z); if(d<nearD)nearD=d; }
    if(nearD<6.5){
      $('breathwrap').style.display='block';
      if(keys.Space) P.breath=Math.max(0,P.breath-dt*.5);
      else P.breath+=dt*.75;
      $('breath').style.width=`${clamp(P.breath*100,0,100)}%`;
      if(P.breath>=1&&!P.hidden.comp){
        P.hidden.comp=true;
        sfx.giggle(0,.7);
        sayNow('You breathed. It heard.',2.6);
        for(const m of monsters){ if(m.dead)continue; if(dist2d(m.x,m.z,P.x,P.z)<14){ m.state='chase'; m.lastSeen={x:P.x,z:P.z}; } }
      }
    } else {
      $('breathwrap').style.display='none';
      P.breath=Math.max(0,P.breath-dt*.4);
    }
    const gy=P.hidden.y;
    camera.position.set(P.x,gy,P.z);
    camera.rotation.y=P.yaw; camera.rotation.x=P.pitch;
    return;
  }
  let mx=0,mz=0;
  if(keys.KeyW)mz-=1; if(keys.KeyS)mz+=1;
  if(keys.KeyA)mx-=1; if(keys.KeyD)mx+=1;
  const moving=(mx||mz)!==0;
  const wantRun=(keys.ShiftLeft||keys.ShiftRight)&&moving&&!P.crouch&&P.stam>1;
  if(wantRun) P.stam=Math.max(0,P.stam-dt*15);
  else P.stam=Math.min(100,P.stam+dt*(moving?11:16));
  const spd=P.crouch?1.7:wantRun?5.7:3.2;
  if(moving){
    const l=Math.hypot(mx,mz); mx/=l; mz/=l;
    const s=Math.sin(P.yaw), c=Math.cos(P.yaw);
    const dx=mx*c+mz*s, dz=-mx*s+mz*c;
    const feet=groundH(P.x,P.z);
    let nx=P.x+dx*spd*dt, nz=P.z+dz*spd*dt;
    [nx,nz]=collideCircle(nx,nz,.36,feet);
    P.x=nx; P.z=nz;
    P.bobT+=spd*dt;
    P.stepAcc+=spd*dt;
    const stride=wantRun?2.6:P.crouch?1.6:2.1;
    if(P.stepAcc>stride){ P.stepAcc=0; sfx.step(wantRun); }
  }
  P.noiseR = !moving?0 : P.crouch?2.5 : wantRun?15 : 7;
  // world loop at the treeline
  const rr=Math.hypot(P.x,P.z+20);
  if(rr>238&&!P.looping){
    P.looping=true;
    fadeTo(1,300,()=>{
      P.x*=-.8; P.z=(P.z+20)*-.8-20;
      fadeTo(0,700);
      setTimeout(()=>{ P.looping=false; },900);
    });
    once('loopWalk','The road bends without bending. You’re walking back into town.');
  }
  // camera
  const targetH=P.crouch?.92:1.62;
  P.ch=lerp(P.ch,targetH,clamp(dt*8,0,1));
  const bob=moving?Math.sin(P.bobT*3.2)*(wantRun?.05:.03):0;
  P.eyeY=groundH(P.x,P.z)+P.ch+bob;
  camera.position.set(P.x,P.eyeY,P.z);
  camera.rotation.y=P.yaw; camera.rotation.x=P.pitch;
  // flashlight
  const fTarget=inv.flash?3.6:0;
  flash.intensity=lerp(flash.intensity,fTarget,clamp(dt*8,0,1));
  if(inv.flash){
    inv.bat=Math.max(0,inv.bat-dt*1.05);
    if(inv.bat<=0){ inv.flash=false; once('batDied','Click. Click. The dark leans in.'); }
  }
  P.building=inB(P.x,P.z);
}

/* ───────────────────── prompt / HUD ───────────────────── */
function findPrompt(){
  if(P.hidden) return {label:()=>'[E] Slip out',act:exitHide};
  let best=null,bd=1e9;
  const fx=-Math.sin(P.yaw), fz=-Math.cos(P.yaw);
  for(const it of interactables){
    if(it.cond&&!it.cond()) continue;
    const dx=it.p.x-P.x, dz=it.p.z-P.z;
    const dy=(it.p.y??P.eyeY)-P.eyeY;
    if(Math.abs(dy)>2.6) continue;
    const d=Math.hypot(dx,dz);
    if(d>it.r) continue;
    if(d>.9){
      const dn=Math.max(d,.001);
      if((dx/dn)*fx+(dz/dn)*fz<.42) continue;
    }
    if(d<bd){bd=d;best=it;}
  }
  return best;
}
const PHASES={DAY:'DAYLIGHT',DUSK:'DUSK — GET INSIDE',NIGHT:'NIGHT',DAWN:'ALMOST DAWN'};
function tickHUD(){
  $('day').textContent=`DAY ${day}`;
  $('phase').textContent=PHASES[phase()];
  $('phase').style.color=phase()==='NIGHT'?'#9a4a40':phase()==='DUSK'?'#c98d4f':'#cfc9b8';
  $('bat').style.width=`${clamp(inv.bat/150*100,0,100)}%`;
  $('bat').style.background=inv.flash?'#e8d060':'#b7a44a';
  $('tal').textContent=`✶ TALISMANS — ${inv.tal}`;
  $('stn').textContent=`● STONES — ${inv.stone}`;
  $('stam').style.width=`${P.stam}%`;
  currentPrompt=state==='play'&&!uiNote&&!uiCine?findPrompt():null;
  const pr=$('prompt');
  if(currentPrompt){ pr.textContent=currentPrompt.label(); pr.style.display='block'; }
  else pr.style.display='none';
  // danger vignette + heartbeat
  let nd=1e9;
  for(const m of monsters){ if(m.dead)continue; const d=dist2d(m.x,m.z,P.x,P.z); if(d<nd)nd=d; }
  if(state==='play') $('red').style.opacity=nd<10?(.3*(1-nd/10)):0;
}

/* ───────────────────── main loop ───────────────────── */
const clock=new THREE.Clock();
let fpsE=60, prAdjT=0;
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  fpsE=lerp(fpsE,1/Math.max(dt,.0001),.05);
  prAdjT+=dt;
  if(prAdjT>4){
    prAdjT=0;
    if(fpsE<27&&curPR>.72){ curPR=Math.max(.72,curPR*.85); renderer.setPixelRatio(curPR); }
    else if(fpsE>52&&curPR<basePR){ curPR=Math.min(basePR,curPR*1.1); renderer.setPixelRatio(curPR); }
  }
  const simming=state==='play'&&!uiNote&&!uiCine;
  if(simming){
    tickSchedule(dt);
    tickPlayer(dt);
    for(const m of monsters) m.update(dt);
    for(let i=monsters.length-1;i>=0;i--) if(monsters[i].dead) monsters.splice(i,1);
    tickStones(dt);
    tickDoors(dt);
    // heartbeat
    hbT-=dt;
    let nd=1e9;
    for(const m of monsters){ if(m.dead)continue; const d=dist2d(m.x,m.z,P.x,P.z); if(d<nd)nd=d; }
    if(nd<16&&hbT<=0){ sfx.thump(clamp(1.2-nd/16,.12,.7)); hbT=clamp(nd/15,.35,1.05); }
  } else if(state==='dying'&&killer){
    dyingT+=dt;
    const s=killer.mesh.scale.x;
    const hy=groundH(killer.x,killer.z)+2.0*s;
    const k=clamp(dt*5,0,1);
    camera.position.x=lerp(camera.position.x,killer.x+Math.sin(killer.yaw)*1.1,k);
    camera.position.z=lerp(camera.position.z,killer.z+Math.cos(killer.yaw)*1.1,k);
    camera.position.y=lerp(camera.position.y,hy,k);
    camera.lookAt(killer.x,hy,killer.z);
    camera.rotation.z=Math.sin(dyingT*22)*.03*(1-clamp(dyingT/1.6,0,1));
    if(dyingT>1.9){ camera.rotation.z=0; finishDeath(); }
  }
  tickSubs(dt);
  applyEnv();
  tickHUD();
  renderer.render(scene,camera);
}
buildGraves();
animate();

/* ───────────────────── debug hooks ───────────────────── */
window.GAME={
  ver:7,
  forceStart(){ forced=true; initAudio(); $('title').classList.remove('show'); state='play'; intro(); },
  look(y,p){ P.yaw=y; P.pitch=p??P.pitch; },
  tp(x,z){ P.x=x; P.z=z; },
  setTod(t){ prevTod=tod=t; },
  night(){ prevTod=tod=.53; spawnNight(); },
  give(){ inv.tal+=5; inv.bat=150; inv.stone=6; },
  key(c,v){ keys[c]=v; },
  pressE(){ if(P.hidden)exitHide(); else if(currentPrompt)currentPrompt.act(); },
  prompt(){ return currentPrompt?currentPrompt.label():null; },
  spawnNear(d=18){ const m=new Monster(P.x-Math.sin(P.yaw)*d,P.z-Math.cos(P.yaw)*d,false); monsters.push(m); return monsters.length; },
  spawnAt(x,z){ const m=new Monster(x,z,false); monsters.push(m); return monsters.length; },
  hunt(){ for(const m of monsters){ m.state='chase'; m.lastSeen={x:P.x,z:P.z}; } },
  monsters(){ return monsters.map(m=>({x:+m.x.toFixed(1),z:+m.z.toFixed(1),state:m.state})); },
  get fps(){ return Math.round(fpsE); },
  get state(){ return state; },
  get day(){ return day; },
  set day(v){ day=v; },
  get tod(){ return tod; },
  get pos(){ return {x:+P.x.toFixed(1),z:+P.z.toFixed(1),b:P.building}; },
  get inv(){ return {...inv}; },
  kill(){ if(monsters[0]) kill(monsters[0]); },
  freeze(){ state='frozen'; camera.rotation.y=P.yaw; camera.rotation.x=P.pitch;
    camera.position.set(P.x, P.hidden?P.hidden.y:groundH(P.x,P.z)+1.62, P.z); },
  unfreeze(){ state='play'; },
  reset(){ reset(); },
  twist(){ runTwist(); },
};
