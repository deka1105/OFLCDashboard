/* globe-engine.js — Sphere Earth (orange+blue theme) + ISS + satellites + scroll morph
   Exposes: window.initISSIntro(), window.initHeroGlobe()
*/

/* ── helpers ── */
function lerp(a,b,f){return a+(b-a)*f;}
function easeInOut(t){return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}
function easeOut(t){return 1-Math.pow(1-t,3);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function hexToRgb(h){
  h=(h||'#ff6a00').trim();
  if(!h.startsWith('#'))return'255,106,0';
  const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);
  return`${r},${g},${b}`;
}
function getAccentRgb(){
  return hexToRgb(getComputedStyle(document.documentElement).getPropertyValue('--gold').trim());
}
function prefersReducedMotion(){
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/* ══════════════════════════════════════════════════════════
   CONTINENT DATA
══════════════════════════════════════════════════════════ */
const CONTINENTS = {
  northAmerica:[[-168,71],[-140,70],[-120,68],[-100,72],[-85,68],[-75,63],[-65,60],[-55,47],[-52,47],[-65,44],[-70,42],[-75,35],[-80,25],[-87,16],[-83,10],[-77,8],[-80,0],[-80,8],[-85,11],[-90,14],[-92,19],[-97,19],[-105,19],[-110,24],[-112,29],[-117,32],[-120,37],[-124,41],[-124,49],[-130,55],[-135,58],[-140,59],[-145,61],[-152,58],[-158,58],[-162,60],[-165,64],[-168,66],[-168,71]],
  greenland:[[-52,63],[-44,60],[-42,65],[-40,68],[-24,68],[-18,72],[-15,78],[-20,83],[-45,83],[-55,80],[-55,75],[-50,70],[-52,63]],
  southAmerica:[[-80,10],[-77,2],[-50,5],[-35,5],[-35,-5],[-38,-15],[-40,-22],[-48,-27],[-50,-30],[-52,-34],[-58,-38],[-62,-42],[-65,-46],[-66,-50],[-68,-55],[-75,-55],[-72,-50],[-70,-45],[-72,-40],[-70,-35],[-70,-30],[-70,-22],[-75,-15],[-78,-5],[-78,2],[-80,10]],
  europe:[[-10,36],[0,36],[10,38],[15,38],[20,38],[28,38],[30,42],[36,42],[36,46],[30,48],[25,54],[20,58],[15,58],[10,55],[5,54],[0,50],[-5,48],[-8,44],[-10,40],[-10,36]],
  scandinavia:[[5,58],[8,58],[10,62],[14,65],[18,68],[25,70],[28,71],[30,70],[28,68],[25,64],[22,60],[18,58],[15,57],[12,56],[8,56],[5,58]],
  africa:[[-18,14],[-16,12],[-15,10],[-14,8],[-10,5],[-8,4],[-4,4],[0,6],[3,5],[8,4],[10,2],[14,2],[18,4],[22,2],[26,0],[28,-2],[32,-8],[36,-18],[36,-24],[32,-28],[28,-34],[24,-34],[20,-36],[17,-32],[14,-28],[12,-22],[10,-18],[8,-14],[4,-10],[2,-4],[0,2],[-2,6],[-4,10],[-8,12],[-12,14],[-16,14],[-18,14]],
  eurasia:[[30,42],[35,36],[38,36],[40,36],[42,38],[44,40],[48,40],[50,38],[55,42],[58,44],[60,46],[65,52],[68,54],[72,58],[75,62],[80,68],[90,72],[100,72],[110,70],[120,72],[130,70],[140,68],[145,60],[145,52],[140,46],[135,34],[130,28],[125,22],[120,18],[115,16],[108,14],[105,10],[104,2],[106,-2],[108,-6],[112,-8],[115,-8],[115,-4],[120,2],[124,2],[130,8],[130,14],[120,18],[110,20],[100,22],[95,28],[90,22],[85,24],[80,26],[75,20],[70,22],[65,22],[60,24],[55,22],[50,24],[45,24],[42,18],[43,12],[45,10],[48,8],[50,8],[55,10],[60,10],[65,12],[70,12],[72,14],[68,20],[65,22],[60,24],[55,26],[50,28],[45,28],[40,32],[36,36],[30,42]],
  india:[[68,22],[72,22],[76,22],[80,14],[84,14],[80,10],[78,8],[80,6],[78,4],[76,8],[72,10],[68,14],[66,18],[68,22]],
  australia:[[114,-22],[118,-20],[122,-18],[128,-14],[132,-12],[136,-12],[140,-14],[144,-18],[148,-20],[152,-24],[152,-28],[148,-38],[144,-38],[140,-36],[136,-34],[130,-32],[124,-28],[118,-26],[114,-22]],
  antarctica:[[-180,-70],[-150,-72],[-120,-74],[-90,-76],[-60,-74],[-30,-72],[0,-72],[30,-72],[60,-74],[90,-74],[120,-72],[150,-72],[180,-70],[180,-90],[-180,-90],[-180,-70]],
  madagascar:[[44,-12],[48,-14],[50,-18],[48,-22],[46,-26],[44,-24],[42,-20],[44,-12]],
  japan:[[130,32],[132,32],[134,34],[136,36],[138,38],[140,40],[142,42],[144,44],[142,44],[140,42],[138,40],[136,36],[134,34],[132,32],[130,32]],
  seAsia:[[100,20],[104,16],[106,12],[108,10],[110,8],[112,4],[108,2],[104,2],[100,4],[98,6],[96,10],[98,14],[100,16],[100,20]],
  indonesia:[[95,6],[105,6],[108,4],[112,2],[116,0],[120,-2],[124,-4],[128,-4],[128,-8],[124,-8],[120,-6],[116,-4],[112,-6],[108,-6],[104,-4],[100,-2],[96,2],[95,6]]
};

/* ── Sphere projection ── */
function lonLatToXYZ(lon, lat, R, rotY){
  const phi   = (90-lat)*Math.PI/180;
  const theta = (lon*Math.PI/180)+rotY;
  return{
    x: R*Math.sin(phi)*Math.cos(theta),
    y: R*Math.cos(phi),
    z: R*Math.sin(phi)*Math.sin(theta)
  };
}

function drawContinent(ctx, cx, cy, R, rotY, points, fillStyle, extraAlpha){
  const proj = points.map(([lon,lat])=>{
    const v=lonLatToXYZ(lon,lat,R,rotY);
    return{sx:cx+v.x, sy:cy-v.y, z:v.z};
  });
  const avgZ = proj.reduce((s,p)=>s+p.z,0)/proj.length;
  if(avgZ < -R*0.35) return;
  const alpha = clamp((avgZ+R*0.28)/(R*0.75),0,1)*(extraAlpha||1);
  ctx.beginPath();
  proj.forEach((p,i)=>{ i===0?ctx.moveTo(p.sx,p.sy):ctx.lineTo(p.sx,p.sy); });
  ctx.closePath();
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = fillStyle;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* Cloud noise */
function cloudOpacity(lon, lat, t){
  const l=lon*Math.PI/180, a=lat*Math.PI/180;
  return clamp((
    Math.sin(l*3.1+t*0.0004)*Math.cos(a*2.2)*0.35+
    Math.sin(l*1.7+a*2.8+t*0.0003)*0.30+
    Math.cos(l*4.3-a*1.5+t*0.0005)*0.25+
    Math.sin(a*3.6+t*0.0002)*0.15+0.25)*1.5, 0,1);
}

/* ══════════════════════════════════════════════════════════
   DRAW EARTH — orange+deep blue theme
══════════════════════════════════════════════════════════ */
function drawEarth(ctx, cx, cy, R, rotY, t){
  ctx.save();

  /* 1. Deep space halo — orange tinted to match theme */
  const halo=ctx.createRadialGradient(cx,cy,R*0.95,cx,cy,R*1.40);
  halo.addColorStop(0,  'rgba(255,106,0,0.0)');
  halo.addColorStop(0.4,'rgba(180,60,0,0.08)');
  halo.addColorStop(0.75,'rgba(255,106,0,0.12)');
  halo.addColorStop(1,  'rgba(255,130,20,0.0)');
  ctx.beginPath(); ctx.arc(cx,cy,R*1.40,0,Math.PI*2);
  ctx.fillStyle=halo; ctx.fill();

  /* 2. Ocean — deep navy/indigo matching --bg palette */
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
  const og=ctx.createRadialGradient(cx-R*0.28,cy-R*0.25,R*0.04,cx+R*0.1,cy+R*0.05,R*1.05);
  og.addColorStop(0,  '#1a3a6e');   // lit face — rich navy
  og.addColorStop(0.20,'#102d58');
  og.addColorStop(0.45,'#0a1f42');
  og.addColorStop(0.70,'#060f28');
  og.addColorStop(0.90,'#030818');
  og.addColorStop(1,   '#020510');
  ctx.fillStyle=og; ctx.fill();

  /* 3. Continents — desaturated orange/amber tones */
  const landGrad=ctx.createLinearGradient(cx-R,cy-R,cx+R,cy+R);
  landGrad.addColorStop(0, '#7a4a1a');   // warm sienna lit
  landGrad.addColorStop(0.5,'#5c3610'); // mid amber-brown
  landGrad.addColorStop(1,  '#3d2208'); // dark
  Object.entries(CONTINENTS).forEach(([name,pts])=>{
    let fill=landGrad;
    if(name==='antarctica')   fill='rgba(200,218,240,0.85)';
    else if(name==='greenland') fill='rgba(160,185,210,0.80)';
    else if(name==='scandinavia') fill='#4a3010';
    drawContinent(ctx,cx,cy,R,rotY,pts,fill);
  });

  /* 4. Desert / arid overlays — brighter orange for Sahara etc */
  drawContinent(ctx,cx,cy,R*0.998,rotY,[[-18,30],[0,32],[10,30],[20,28],[28,28],[32,24],[30,20],[28,16],[20,14],[10,14],[0,14],[-8,14],[-14,18],[-16,22],[-18,28],[-18,30]],'#c86010',0.80);
  drawContinent(ctx,cx,cy,R*0.998,rotY,[[36,30],[40,28],[45,22],[50,18],[55,16],[58,20],[56,24],[50,26],[46,28],[42,30],[36,30]],'#c05a0a',0.78);
  drawContinent(ctx,cx,cy,R*0.998,rotY,[[118,-22],[126,-22],[134,-24],[142,-26],[140,-30],[136,-32],[128,-30],[120,-26],[118,-22]],'#a84e0a',0.72);
  // Amazon — slightly darker green-brown
  drawContinent(ctx,cx,cy,R*0.998,rotY,[[-74,-4],[-64,-2],[-52,0],[-48,-4],[-50,-8],[-56,-12],[-64,-10],[-72,-8],[-74,-4]],'#3d2a08',0.90);

  /* 5. City lights — orange/amber glow matching theme */
  const CITIES=[
    {lon:-74,lat:40.7,i:1.0},{lon:-0.1,lat:51.5,i:1.0},{lon:2.3,lat:48.8,i:0.9},
    {lon:37.6,lat:55.7,i:0.9},{lon:72.8,lat:19,i:0.8},{lon:77.2,lat:28.6,i:0.85},
    {lon:103.8,lat:1.3,i:0.75},{lon:121.5,lat:31.2,i:0.9},{lon:139.7,lat:35.7,i:1.0},
    {lon:151.2,lat:-33.9,i:0.8},{lon:-43.2,lat:-22.9,i:0.8},{lon:-99.1,lat:19.4,i:0.85},
    {lon:-87.6,lat:41.9,i:0.85},{lon:-118.2,lat:34.1,i:0.9},{lon:116.4,lat:39.9,i:0.95},
    {lon:13.4,lat:52.5,i:0.85},{lon:55.3,lat:25.2,i:0.75},{lon:126.9,lat:37.5,i:0.85},
    {lon:-80.2,lat:25.8,i:0.8},{lon:28.0,lat:-26.2,i:0.7}
  ];
  CITIES.forEach(c=>{
    const v=lonLatToXYZ(c.lon,c.lat,R,rotY);
    if(v.z>R*0.05) return;
    const n=clamp((-v.z/R-0.05)/0.6,0,1);
    if(n<0.01) return;
    const sx=cx+v.x, sy=cy-v.y, gr=R*0.04*c.i;
    const cg=ctx.createRadialGradient(sx,sy,0,sx,sy,gr);
    cg.addColorStop(0,`rgba(255,160,40,${n*0.95*c.i})`);
    cg.addColorStop(0.35,`rgba(255,100,10,${n*0.55*c.i})`);
    cg.addColorStop(1,'rgba(200,60,0,0)');
    ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(sx,sy,gr,0,Math.PI*2); ctx.fill();
  });

  /* 6. Clouds removed — dot pattern read as artifact */

  /* 7. Specular glint — warm orange-white on lit face */
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.clip();
  const sp=ctx.createRadialGradient(cx-R*0.32,cy-R*0.30,0,cx-R*0.28,cy-R*0.28,R*0.55);
  sp.addColorStop(0,'rgba(255,200,120,0.18)');
  sp.addColorStop(0.4,'rgba(255,160,60,0.07)');
  sp.addColorStop(1,'rgba(255,120,0,0)');
  ctx.fillStyle=sp; ctx.fill(); ctx.restore();

  /* 8. Night shadow — deep and cool against the warm lit side */
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.clip();
  const sh=ctx.createRadialGradient(cx+R*0.55,cy+R*0.08,0,cx+R*0.22,cy,R*1.25);
  sh.addColorStop(0,  'rgba(0,0,20,0.88)');
  sh.addColorStop(0.35,'rgba(0,0,15,0.60)');
  sh.addColorStop(0.6, 'rgba(0,0,10,0.25)');
  sh.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle=sh; ctx.fill(); ctx.restore();

  /* 9. Atmosphere — orange inner rim + blue outer scatter */
  // Inner warm glow (matches gold/orange theme)
  const atm1=ctx.createRadialGradient(cx,cy,R*0.90,cx,cy,R*1.10);
  atm1.addColorStop(0,  'rgba(255,100,0,0.0)');
  atm1.addColorStop(0.3,'rgba(255,80,0,0.08)');
  atm1.addColorStop(0.65,'rgba(255,106,0,0.18)');
  atm1.addColorStop(1,  'rgba(255,130,20,0.0)');
  ctx.beginPath(); ctx.arc(cx,cy,R*1.10,0,Math.PI*2);
  ctx.fillStyle=atm1; ctx.fill();

  // Outer blue scatter
  const atm2=ctx.createRadialGradient(cx,cy,R*1.06,cx,cy,R*1.24);
  atm2.addColorStop(0,  'rgba(30,80,200,0.0)');
  atm2.addColorStop(0.4,'rgba(40,100,220,0.14)');
  atm2.addColorStop(0.75,'rgba(60,130,255,0.22)');
  atm2.addColorStop(1,  'rgba(80,160,255,0.0)');
  ctx.beginPath(); ctx.arc(cx,cy,R*1.24,0,Math.PI*2);
  ctx.fillStyle=atm2; ctx.fill();

  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   WIREFRAME GLOBE
══════════════════════════════════════════════════════════ */
function buildGlobeData(){
  const N=320, dots=[];
  for(let i=0;i<N;i++) dots.push({phi:Math.acos(1-2*(i+0.5)/N),theta:Math.PI*(1+Math.sqrt(5))*i});
  const latLines=[], lonLines=[];
  for(let lat=-75;lat<=75;lat+=25){
    const phi=(90-lat)*Math.PI/180, pts=[];
    for(let lon=0;lon<=360;lon+=4) pts.push({phi,theta:lon*Math.PI/180});
    latLines.push(pts);
  }
  for(let lon=0;lon<180;lon+=25){
    const pts=[];
    for(let lat=-89;lat<=89;lat+=3) pts.push({phi:(90-lat)*Math.PI/180,theta:lon*Math.PI/180});
    lonLines.push(pts);
  }
  return{dots,latLines,lonLines};
}

function drawWireGlobe(ctx, cx, cy, R, angle){
  const rgb=getAccentRgb();
  const{dots,latLines,lonLines}=window.__globeData;
  function proj(phi,theta){
    const x=R*Math.sin(phi)*Math.cos(theta+angle);
    const y=R*Math.cos(phi);
    const z=R*Math.sin(phi)*Math.sin(theta+angle);
    return{x:cx+x,y:cy-y,z};
  }
  const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,R);
  grad.addColorStop(0,`rgba(${rgb},0.08)`); grad.addColorStop(1,'transparent');
  ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=`rgba(${rgb},0.22)`; ctx.lineWidth=0.8;
  [...latLines,...lonLines].forEach(pts=>{
    ctx.beginPath();
    pts.forEach((p,i)=>{ const{x,y}=proj(p.phi,p.theta); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.stroke();
  });
  dots.forEach(d=>{
    const{x,y,z}=proj(d.phi,d.theta);
    const vis=z>0;
    ctx.beginPath(); ctx.arc(x,y,vis?1.6+1.2*(z/R):0.7,0,Math.PI*2);
    ctx.fillStyle=`rgba(${rgb},${vis?0.7+0.3*(z/R):0.08})`; ctx.fill();
  });
  const rim=ctx.createRadialGradient(cx,cy,R*0.82,cx,cy,R*1.06);
  rim.addColorStop(0,'transparent'); rim.addColorStop(1,`rgba(${rgb},0.18)`);
  ctx.fillStyle=rim; ctx.beginPath(); ctx.arc(cx,cy,R*1.06,0,Math.PI*2); ctx.fill();
}

/* ══════════════════════════════════════════════════════════
   ISS — accurate 2D top-view silhouette
══════════════════════════════════════════════════════════ */
function drawISS(ctx, x, y, scale, angle, t){
  ctx.save();
  ctx.translate(x,y); ctx.rotate(angle);
  const s=scale;
  const blink=0.5+0.5*Math.sin(t*0.07);

  // Main truss
  ctx.fillStyle='rgba(200,210,225,0.92)';
  ctx.fillRect(-s*12,-s*0.5,s*24,s*1.0);

  // Solar arrays — port (left)
  ctx.fillStyle='rgba(22,82,165,0.90)';
  ctx.fillRect(-s*11,-s*5.8,s*4.5,s*5.0);
  ctx.fillRect(-s*11, s*0.8,s*4.5,s*5.0);
  // outer port
  ctx.fillStyle='rgba(16,68,152,0.88)';
  ctx.fillRect(-s*11,-s*11.5,s*4.2,s*5.0);
  ctx.fillRect(-s*11, s*6.5, s*4.2,s*5.0);

  // Solar arrays — starboard (right)
  ctx.fillStyle='rgba(22,82,165,0.90)';
  ctx.fillRect(s*6.5,-s*5.8,s*4.5,s*5.0);
  ctx.fillRect(s*6.5, s*0.8,s*4.5,s*5.0);
  ctx.fillStyle='rgba(16,68,152,0.88)';
  ctx.fillRect(s*6.5,-s*11.5,s*4.2,s*5.0);
  ctx.fillRect(s*6.5, s*6.5, s*4.2,s*5.0);

  // Radiators
  ctx.fillStyle='rgba(175,190,210,0.80)';
  ctx.fillRect(-s*3,-s*3.6,s*2.2,s*3.1);
  ctx.fillRect(-s*3, s*0.5,s*2.2,s*3.1);
  ctx.fillRect( s*0.8,-s*3.6,s*2.2,s*3.1);
  ctx.fillRect( s*0.8, s*0.5,s*2.2,s*3.1);

  // Modules
  ctx.fillStyle='rgba(195,205,222,0.94)';
  ctx.beginPath(); ctx.ellipse(0,   0,  s*2.8,s*1.4,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-s*4,0,  s*2.2,s*1.2,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-s*7,0,  s*2.0,s*1.2,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( s*3.5,0,s*2.8,s*1.3,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( s*6.8,0,s*2.4,s*1.2,0,0,Math.PI*2); ctx.fill();

  // Columbus + Kibo
  ctx.fillStyle='rgba(178,192,212,0.85)';
  ctx.beginPath(); ctx.ellipse(-s*1.8, s*2.8,s*1.6,s*1.0, 0.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-s*2.5,-s*2.8,s*2.0,s*1.1,-0.2,0,Math.PI*2); ctx.fill();

  // Canadarm2
  ctx.strokeStyle='rgba(220,230,240,0.7)'; ctx.lineWidth=s*0.4;
  ctx.beginPath(); ctx.moveTo(-s*1,-s*1.8); ctx.lineTo(-s*1,-s*4.5); ctx.lineTo(s*2,-s*6.5); ctx.lineTo(s*4,-s*5.5); ctx.stroke();

  // Nav lights
  ctx.beginPath(); ctx.arc(-s*10.5,0,s*0.55,0,Math.PI*2);
  ctx.fillStyle=`rgba(255,60,60,${blink})`; ctx.fill();
  ctx.beginPath(); ctx.arc( s*10.5,0,s*0.55,0,Math.PI*2);
  ctx.fillStyle=`rgba(60,255,120,${blink})`; ctx.fill();
  ctx.beginPath(); ctx.arc(0,0,s*0.45,0,Math.PI*2);
  ctx.fillStyle=`rgba(255,255,255,${0.3+0.7*Math.pow(Math.sin(t*0.15),2)})`; ctx.fill();

  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   SATELLITES — 11 objects + ISS handled separately
══════════════════════════════════════════════════════════ */
const SAT_DATA=[
  {orbitA:1.22,orbitB:0.32,tiltPhase:0.28, tiltAmp:0.18,speed:0.55,angle:0.5,  size:2.2,type:'comms'},
  {orbitA:1.15,orbitB:0.28,tiltPhase:1.10, tiltAmp:0.12,speed:0.80,angle:2.1,  size:1.6,type:'comms'},
  {orbitA:1.28,orbitB:0.35,tiltPhase:-0.6, tiltAmp:0.22,speed:0.38,angle:4.0,  size:1.7,type:'spy'},
  {orbitA:1.38,orbitB:0.30,tiltPhase:0.80, tiltAmp:0.15,speed:0.62,angle:1.2,  size:1.5,type:'comms'},
  {orbitA:1.32,orbitB:0.38,tiltPhase:-0.4, tiltAmp:0.20,speed:0.42,angle:3.5,  size:2.0,type:'gps'},
  {orbitA:1.45,orbitB:0.34,tiltPhase:0.55, tiltAmp:0.28,speed:0.30,angle:5.1,  size:2.1,type:'gps'},
  {orbitA:1.50,orbitB:0.40,tiltPhase:0.35, tiltAmp:0.32,speed:0.22,angle:2.7,  size:1.8,type:'gps'},
  {orbitA:1.20,orbitB:0.60,tiltPhase:1.57, tiltAmp:0.05,speed:0.88,angle:1.6,  size:1.2,type:'polar'},
  {orbitA:1.24,orbitB:0.62,tiltPhase:1.57, tiltAmp:0.05,speed:0.76,angle:3.3,  size:1.2,type:'polar'},
  {orbitA:1.68,orbitB:0.50,tiltPhase:-0.3, tiltAmp:0.40,speed:0.14,angle:0.2,  size:2.4,type:'weather'},
  {orbitA:1.14,orbitB:0.29,tiltPhase:-0.85,tiltAmp:0.14,speed:0.68,angle:2.4,  size:1.5,type:'spy'},
  {orbitA:1.35,orbitB:0.36,tiltPhase:0.62, tiltAmp:0.18,speed:0.50,angle:4.6,  size:1.8,type:'comms'},
];

// ISS orbit params (distinct, prominent)
const ISS_ORBIT={orbitA:1.30,orbitB:0.28,tiltPhase:0.52,tiltAmp:0.20,speed:0.38,angle:1.1};

function drawSatellite(ctx, ox, oy, R, sat, t){
  const a  =sat.angle+t*sat.speed*0.0008;
  const tilt=Math.sin(a*0.5+sat.tiltPhase)*sat.tiltAmp;
  const sx =ox+Math.cos(a)*sat.orbitA*R;
  const sy =oy+Math.sin(a)*sat.orbitB*R+tilt*R;
  const dx=sx-ox, dy=sy-oy;
  if(Math.sqrt(dx*dx+dy*dy)<R*0.92) return;
  const blink=0.5+0.5*Math.sin(t*0.07*sat.speed+sat.angle);
  const s=sat.size;

  ctx.save(); ctx.translate(sx,sy); ctx.rotate(a);

  if(sat.type==='starlink'){
    ctx.fillStyle=`rgba(190,200,218,${blink*0.88})`;
    ctx.fillRect(-s*1.5,-s*0.5,s*3,s*1.0);
    ctx.fillStyle=`rgba(18,72,165,${blink*0.85})`;
    ctx.fillRect(-s*4.5,-s*0.32,s*2.8,s*0.64);
    ctx.beginPath(); ctx.arc(s*0.2,0,s*0.28,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,160,40,${blink})`; ctx.fill();

  } else if(sat.type==='comms'){
    ctx.fillStyle=`rgba(195,208,225,${blink*0.90})`;
    ctx.fillRect(-s*1.8,-s*0.65,s*3.6,s*1.3);
    ctx.fillStyle=`rgba(20,78,168,${blink*0.88})`;
    ctx.fillRect(-s*5.0,-s*0.42,s*2.9,s*0.84);
    ctx.fillRect( s*2.1,-s*0.42,s*2.9,s*0.84);
    ctx.beginPath(); ctx.arc(s*0.8,-s*1.6,s*0.8,Math.PI,0);
    ctx.strokeStyle=`rgba(210,220,240,0.80)`; ctx.lineWidth=0.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,s*0.38,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,160,40,${blink})`; ctx.fill();

  } else if(sat.type==='gps'){
    ctx.fillStyle=`rgba(188,198,218,${blink*0.86})`;
    ctx.fillRect(-s*1.6,-s*1.6,s*3.2,s*3.2);
    ctx.fillStyle=`rgba(18,70,160,${blink*0.86})`;
    ctx.fillRect(-s*4.5,-s*0.40,s*2.7,s*0.80);
    ctx.fillRect( s*1.8,-s*0.40,s*2.7,s*0.80);
    ctx.fillStyle='rgba(175,188,210,0.78)';
    ctx.beginPath(); ctx.ellipse(0,-s*2.0,s*1.2,s*0.4,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,s*0.35,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,200,60,${blink})`; ctx.fill();

  } else if(sat.type==='polar'){
    ctx.fillStyle=`rgba(185,198,218,${blink*0.82})`;
    ctx.fillRect(-s*1.3,-s*0.45,s*2.6,s*0.9);
    ctx.fillStyle=`rgba(18,72,162,${blink*0.82})`;
    ctx.fillRect(-s*3.5,-s*0.32,s*2.0,s*0.64);
    ctx.fillRect( s*1.5,-s*0.32,s*2.0,s*0.64);
    ctx.fillStyle='rgba(30,35,50,0.90)';
    ctx.fillRect(-s*0.5,-s*0.55,s*1.0,s*0.35);
    ctx.beginPath(); ctx.arc(0,0,s*0.28,0,Math.PI*2);
    ctx.fillStyle=`rgba(100,220,160,${blink})`; ctx.fill();

  } else if(sat.type==='weather'){
    ctx.fillStyle=`rgba(192,204,222,${blink*0.84})`;
    ctx.beginPath(); ctx.arc(0,0,s*1.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=`rgba(18,72,162,${blink*0.84})`;
    ctx.fillRect(-s*4.8,-s*0.38,s*3.0,s*0.76);
    ctx.fillRect( s*1.8,-s*0.38,s*3.0,s*0.76);
    ctx.beginPath(); ctx.arc(0,-s*2.2,s*1.2,Math.PI,0);
    ctx.strokeStyle=`rgba(205,218,238,0.82)`; ctx.lineWidth=s*0.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,s*0.42,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,140,40,${blink})`; ctx.fill();

  } else if(sat.type==='spy'){
    ctx.fillStyle=`rgba(70,78,92,${blink*0.70})`;
    ctx.fillRect(-s*2.8,-s*0.45,s*5.6,s*0.9);
    ctx.fillStyle=`rgba(10,55,130,${blink*0.65})`;
    ctx.fillRect(-s*4.2,-s*0.28,s*1.2,s*0.56);
    ctx.fillRect( s*3.0,-s*0.28,s*1.2,s*0.56);
    ctx.fillStyle='rgba(20,22,30,0.95)';
    ctx.beginPath(); ctx.ellipse(-s*1.0,0,s*0.9,s*0.55,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(s*1.5,0,s*0.24,0,Math.PI*2);
    ctx.fillStyle=`rgba(200,50,50,${blink*0.55})`; ctx.fill();
  }

  ctx.restore();

  // Orbit trail
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,0.05)';
  ctx.lineWidth=sat.type==='comms'||sat.type==='gps'?0.8:0.55;
  ctx.beginPath();
  for(let i=0;i<=80;i++){
    const ta=a+(i/80)*Math.PI*2;
    const tt=Math.sin(ta*0.5+sat.tiltPhase)*sat.tiltAmp;
    i===0?ctx.moveTo(ox+Math.cos(ta)*sat.orbitA*R, oy+Math.sin(ta)*sat.orbitB*R+tt*R)
         :ctx.lineTo(ox+Math.cos(ta)*sat.orbitA*R, oy+Math.sin(ta)*sat.orbitB*R+tt*R);
  }
  ctx.closePath(); ctx.stroke(); ctx.restore();
}

function drawISSInOrbit(ctx, ox, oy, R, t){
  const a   =ISS_ORBIT.angle+t*ISS_ORBIT.speed*0.0008;
  const tilt=Math.sin(a*0.5+ISS_ORBIT.tiltPhase)*ISS_ORBIT.tiltAmp;
  const sx  =ox+Math.cos(a)*ISS_ORBIT.orbitA*R;
  const sy  =oy+Math.sin(a)*ISS_ORBIT.orbitB*R+tilt*R;
  const dx=sx-ox, dy=sy-oy;
  if(Math.sqrt(dx*dx+dy*dy)<R*0.95) return;
  drawISS(ctx,sx,sy,clamp(R*0.022,1.5,7),a,t);
  // ISS orbit trail
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=0.9;
  ctx.beginPath();
  for(let i=0;i<=80;i++){
    const ta=a+(i/80)*Math.PI*2;
    const tt=Math.sin(ta*0.5+ISS_ORBIT.tiltPhase)*ISS_ORBIT.tiltAmp;
    i===0?ctx.moveTo(ox+Math.cos(ta)*ISS_ORBIT.orbitA*R, oy+Math.sin(ta)*ISS_ORBIT.orbitB*R+tt*R)
         :ctx.lineTo(ox+Math.cos(ta)*ISS_ORBIT.orbitA*R, oy+Math.sin(ta)*ISS_ORBIT.orbitB*R+tt*R);
  }
  ctx.closePath(); ctx.stroke(); ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   ISS INTRO — scroll-driven, sphere from frame 1
══════════════════════════════════════════════════════════ */
window.initISSIntro = function(){
  const canvas=document.getElementById('iss-canvas');
  const ctx=canvas.getContext('2d');
  let W, H, DPR=1;
  function resize(){
    DPR=Math.min(window.devicePixelRatio||1, window.__pixelCap||2);
    W=window.innerWidth; H=window.innerHeight;
    canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR);
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  resize(); window.addEventListener('resize',resize,{passive:true});
  window.__resizeISS=resize;

  // Stars (capacity 700; render count is dynamic via __starCount)
  const stars=[];
  for(let i=0;i<700;i++) stars.push({
    x:Math.random(),y:Math.random(),
    r:Math.random()*1.5+0.12,
    a:Math.random()*0.85+0.15,
    tw:Math.random()*4+1.2,
    to:Math.random()*Math.PI*2,
    hue:Math.random()<0.12?(Math.random()<0.5?'warm':'cool'):'white'
  });
  // Subtle nebula wisps
  const nebulas=Array.from({length:4},()=>({
    x:Math.random(),y:Math.random(),
    r:0.10+Math.random()*0.12,
    a:0.02+Math.random()*0.03,
    h:Math.floor(Math.random()*60)+10  // orange-red hues to match theme
  }));

  window.__globeData=buildGlobeData();
  let t=0, heroTriggered=false;
  let cachedHeroRect=null;
  // Invalidate cache on scroll/resize — rect only changes then
  const invalidate=()=>{ if(cachedHeroRect) cachedHeroRect.dirty=true; };
  window.addEventListener('scroll',invalidate,{passive:true});
  window.addEventListener('resize',invalidate,{passive:true});

  // Phase breakpoints (3.5× scroll)
  const P1=0.45;  // 0→P1: full Earth sphere, ISS + sats
  const P2=0.78;  // P1→P2: Earth morphs → wireframe, hero text slides in
  // P2→1.0: wireframe at hero position, hero fully visible

  function getProgress(){
    const driver=document.getElementById('iss-scroll-driver');
    const max=driver.offsetHeight-window.innerHeight;
    return clamp(window.scrollY/max,0,1);
  }

  function getHeroGlobeRect(){
    if(!cachedHeroRect || cachedHeroRect.dirty){
      const hc=document.getElementById('globe-canvas');
      if(!hc){ cachedHeroRect={cx:W*0.72,cy:H*0.5,r:Math.min(W,H)*0.18,dirty:false}; }
      else{
        const rect=hc.getBoundingClientRect();
        cachedHeroRect={cx:rect.left+rect.width/2,cy:rect.top+rect.height/2,r:rect.width/2,dirty:false};
      }
    }
    return cachedHeroRect;
  }

  function frame(){
    // Honor reduced-motion: freeze the autonomous idle animation (rotation,
    // twinkle, orbiting satellites) while still redrawing for scroll morph.
    if(!prefersReducedMotion()) t++;
    // Skip-frame throttle (1=60fps, 2=30fps, 3=20fps)
    const skip=window.__frameSkip||1;
    if(skip>1 && (t%skip)!==0){ requestAnimationFrame(frame); return; }
    // Pause when scrolled past the intro
    const driverEl=document.getElementById('iss-scroll-driver');
    if(driverEl){
      const dy=driverEl.getBoundingClientRect().bottom;
      if(dy<-50){ requestAnimationFrame(frame); return; }
    }
    const p=getProgress();
    ctx.clearRect(0,0,W,H);

    /* Space BG */
    const sg=ctx.createRadialGradient(W*0.5,H*0.42,0,W*0.5,H*0.5,Math.max(W,H)*0.85);
    sg.addColorStop(0,'#080c1c'); sg.addColorStop(0.4,'#050810'); sg.addColorStop(1,'#020408');
    ctx.fillStyle=sg; ctx.fillRect(0,0,W,H);

    /* Orange nebula wisps — matches theme */
    if(window.__nebula!==false){
      nebulas.forEach(n=>{
        const ng=ctx.createRadialGradient(n.x*W,n.y*H,0,n.x*W,n.y*H,n.r*Math.min(W,H));
        ng.addColorStop(0,`hsla(${n.h},80%,55%,${n.a})`);
        ng.addColorStop(1,'transparent');
        ctx.fillStyle=ng; ctx.fillRect(0,0,W,H);
      });
    }

    /* Stars */
    const starFade=p<P1?1:lerp(1,0.18,(p-P1)/(1-P1));
    const starN=Math.min(stars.length, window.__starCount ?? 700);
    for(let i=0;i<starN;i++){ const s=stars[i];
      const tw=0.5+0.5*Math.sin(t*s.tw*0.003+s.to);
      const col=s.hue==='warm'?`rgba(255,220,190,${s.a*tw*starFade})`
               :s.hue==='cool'?`rgba(190,210,255,${s.a*tw*starFade})`
               :`rgba(255,255,255,${s.a*tw*starFade})`;
      ctx.beginPath(); ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);
      ctx.fillStyle=col; ctx.fill();
    }

    const rotY=t*0.006;
    const shortSide=Math.min(W,H);
    const fullR=shortSide*(W<600?0.36:0.42);

    /* ── Phase 0 → P1: full Earth sphere ── */
    if(p<=P1){
      const eX=W*0.5, eY=H*0.5;
      const eR=fullR*(1-p*0.04); // very subtle zoom-out
      drawEarth(ctx,eX,eY,eR,rotY,t);
      // ISS + sats (count tweakable)
      drawISSInOrbit(ctx,eX,eY,eR,t);
      const satN=Math.min(SAT_DATA.length, window.__satCount ?? SAT_DATA.length);
      for(let i=0;i<satN;i++) drawSatellite(ctx,eX,eY,eR,SAT_DATA[i],t);
    }

    /* ── Phase P1 → P2: Earth→wireframe morph, fly to hero ── */
    else if(p<=P2){
      const f  =easeInOut((p-P1)/(P2-P1));
      const hg =getHeroGlobeRect();
      const eR =lerp(fullR,hg.r,easeOut(f));
      const eX =lerp(W*0.5,hg.cx,easeOut(f));
      const eY =lerp(H*0.5,hg.cy,easeOut(f));
      const eA =clamp(lerp(1,0,f*1.9),0,1);
      const wA =clamp((f-0.22)/0.78,0,1);
      const satA=clamp(lerp(1,0,f*2.5),0,1);

      if(eA>0.008){
        ctx.save(); ctx.globalAlpha=eA;
        drawEarth(ctx,eX,eY,eR,rotY,t);
        ctx.restore();
      }
      if(wA>0.008){
        ctx.save(); ctx.globalAlpha=wA;
        drawWireGlobe(ctx,eX,eY,eR,t*(window.__globeSpeed||0.4)*0.004);
        ctx.restore();
      }
      if(satA>0.01){
        ctx.save(); ctx.globalAlpha=satA;
        drawISSInOrbit(ctx,W*0.5,H*0.5,fullR,t);
        const satN=Math.min(SAT_DATA.length, window.__satCount ?? SAT_DATA.length);
        for(let i=0;i<satN;i++) drawSatellite(ctx,W*0.5,H*0.5,fullR,SAT_DATA[i],t);
        ctx.restore();
      }
    }

    /* ── Phase P2 → 1.0: wireframe locked to hero ── */
    else{
      const hg=getHeroGlobeRect();
      drawWireGlobe(ctx,hg.cx,hg.cy,hg.r,t*(window.__globeSpeed||0.4)*0.004);
    }

    /* HUD + hint + caption */
    const hud=document.getElementById('iss-hud');
    if(hud) hud.style.opacity=p<0.20?1:clamp(lerp(1,0,(p-0.20)/0.22),0,1);
    const hint=document.getElementById('iss-scroll-hint');
    if(hint) hint.style.opacity=clamp(1-p*8,0,1);
    const cap=document.getElementById('iss-caption');
    if(cap)  cap.style.opacity=p<0.06?1:clamp(lerp(1,0,(p-0.06)/0.22),0,1);

    /* Sticky fade */
    const sticky=document.getElementById('iss-sticky');
    if(sticky) sticky.style.opacity=p<P2?1:clamp(lerp(1,0,(p-P2)/0.12),0,1);

    /* Hero reveal */
    const heroEl=document.getElementById('hero');
    if(p>=P1+0.15 && !heroTriggered){
      heroTriggered=true;
      if(heroEl) heroEl.classList.add('visible');
      const ht=document.getElementById('hero-title');
      if(ht) ht.classList.add('animate');
    }
    if(p<P1 && heroTriggered) heroTriggered=false;

    requestAnimationFrame(frame);
  }
  frame();
};

/* ══════════════════════════════════════════════════════════
   HERO GLOBE — standalone wireframe
══════════════════════════════════════════════════════════ */
window.initHeroGlobe=function(){
  const canvas=document.getElementById('globe-canvas');
  const ctx=canvas.getContext('2d');
  function resize(){
    const wrap=canvas.parentElement;
    const size=Math.min(wrap.offsetWidth,window.innerHeight*0.5,380);
    canvas.width=size; canvas.height=size;
    canvas.style.width=size+'px'; canvas.style.height=size+'px';
  }
  resize(); window.addEventListener('resize',resize,{passive:true});
  if(!window.__globeData) window.__globeData=buildGlobeData();
  let angle=0;
  function draw(){
    const W=canvas.width,H=canvas.height,R=W*0.45;
    ctx.clearRect(0,0,W,H);
    drawWireGlobe(ctx,W/2,H/2,R,angle);
    // Honor reduced-motion: render one static frame instead of spinning.
    if(prefersReducedMotion()) return;
    angle+=(window.__globeSpeed||0.4)*0.004;
    requestAnimationFrame(draw);
  }
  draw();
};
