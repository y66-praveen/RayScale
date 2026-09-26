const MCOLORS=["#ff9f43","#2ecc71","#e879b9","#a78bfa","#ff6b6b","#f4d35e"];
const UNITS={cm:{f:1,l:'cm'},m:{f:0.01,l:'m'},ft:{f:1/30.48,l:'ft'},in:{f:1/2.54,l:'in'}};
let unit='cm';
function fmt(v,dec=1){ if(!isFinite(v)) return '∞'; const u=UNITS[unit]; return (v*u.f).toFixed(dec)+u.l; }
document.querySelectorAll('#unitGrp button').forEach(b=>b.addEventListener('click',()=>{
  unit=b.dataset.u; document.querySelectorAll('#unitGrp button').forEach(x=>x.classList.toggle('active',x===b));
  renderCards(); draw();
}));

let obj={x:0,h:40}; let mirrors=[]; let idcM=0;
let camera={ppcm:1.3,originX:70,axisY:230};
let handles=[]; let drag=null; let pan=null; let selected=null;

function resetBench(){ obj={x:0,h:40}; mirrors=[]; idcM=0; selected=null; autoFit(); renderCards(); draw(); }
function addMirror(type){
  idcM++;
  const lastX = mirrors.length? Math.max(...mirrors.map(m=>m.x+m.diameter/2))+70 : 150;
  mirrors.push({id:idcM,type,name:null,color:MCOLORS[(idcM-1)%MCOLORS.length],x:lastX,R:160,diameter:90,showRays:true});
  renderCards(); draw();
}
function duplicateMirror(id){
  const m=mirrors.find(x=>x.id===id); if(!m) return;
  idcM++; mirrors.push({...m,id:idcM,name:m.name?m.name+' copy':null,x:m.x+m.diameter+20,color:MCOLORS[(idcM-1)%MCOLORS.length]});
  selected={kind:'mirror',id:idcM}; renderCards(); draw();
}
function removeMirror(id){ mirrors=mirrors.filter(m=>m.id!==id); if(selected&&selected.kind==='mirror'&&selected.id===id) selected=null; renderCards(); draw(); }
function mirrorLabel(m){ return m.name || (m.type[0].toUpperCase()+m.type.slice(1)+' Mirror #'+m.id); }
function clampGeom(m){ if(m.type!=='plane'){ const maxD=Math.abs(m.R)*1.9; if(m.diameter>maxD) m.diameter=maxD; } }

function field(el,model,key,minCm,maxCm){
  const range=el.querySelector(`input.range[data-k="${key}"]`), num=el.querySelector(`input.numinput[data-k="${key}"]`);
  const push=()=>{ range.value=model[key]; num.value=(model[key]*UNITS[unit].f).toFixed(unit==='cm'?0:2); };
  range.addEventListener('input',()=>{ model[key]=+range.value; push(); draw(); });
  num.addEventListener('change',()=>{
    let v=parseFloat(num.value); if(isNaN(v)) v=model[key]*UNITS[unit].f;
    let cm=v/UNITS[unit].f; cm=Math.max(minCm,Math.min(maxCm,cm));
    model[key]=cm; push(); draw();
  });
  push();
}
function wireGeom(el,m){
  const rRange=el.querySelector('[data-k="R"].range'), rNum=el.querySelector('[data-k="R"].numinput');
  const dRange=el.querySelector('[data-k="diameter"].range'), dNum=el.querySelector('[data-k="diameter"].numinput');
  const pushAll=()=>{
    if(rRange){ rRange.value=m.R; rNum.value=(m.R*UNITS[unit].f).toFixed(unit==='cm'?0:2); }
    dRange.value=m.diameter; dNum.value=(m.diameter*UNITS[unit].f).toFixed(unit==='cm'?0:2);
  };
  const apply=()=>{ clampGeom(m); pushAll(); draw(); };
  if(rRange){
    rRange.addEventListener('input',()=>{ m.R=+rRange.value; apply(); });
    rNum.addEventListener('change',()=>{ let v=parseFloat(rNum.value); if(!isNaN(v)) m.R=Math.max(5,Math.min(2000,v/UNITS[unit].f)); apply(); });
  }
  dRange.addEventListener('input',()=>{ m.diameter=+dRange.value; apply(); });
  dNum.addEventListener('change',()=>{ let v=parseFloat(dNum.value); if(!isNaN(v)) m.diameter=Math.max(10,Math.min(2000,v/UNITS[unit].f)); apply(); });
  pushAll();
}

function renderCards(){
  const oWrap=document.getElementById('objCards'), mWrap=document.getElementById('mirCards');
  oWrap.innerHTML=`<div class="card"><h3><span class="dot" style="background:#5fc9f8"></span>Object</h3>
    <div class="row">Height <input class="range" type="range" min="-80" max="80" data-k="h"><input class="numinput" data-k="h"></div>
    <div class="row">Position <input class="range" type="range" min="-40" max="300" data-k="x"><input class="numinput" data-k="x"></div></div>`;
  const oc=oWrap.firstElementChild; field(oc,obj,'h',-80,80); field(oc,obj,'x',-40,300);

  mWrap.innerHTML='';
  if(mirrors.length===0) mWrap.innerHTML='<div class="empty">No mirrors — add one above.</div>';
  mirrors.forEach(m=>{
    clampGeom(m);
    const el=document.createElement('div'); el.className='card'+(selected&&selected.kind==='mirror'&&selected.id===m.id?' selected':'');
    el.innerHTML=`<h3><span class="dot" style="background:${m.color}"></span>
      <input class="nameinput" value="${mirrorLabel(m)}">
      <button class="iconbtn" title="Duplicate" onclick="duplicateMirror(${m.id})">⧉</button>
      <button class="iconbtn del" title="Delete" onclick="removeMirror(${m.id})">✕</button></h3>
      <div class="row">Distance <input class="range" type="range" min="5" max="420" data-k="x"><input class="numinput" data-k="x"></div>
      ${m.type!=='plane' ? `<div class="row">Radius <input class="range" type="range" min="5" max="400" data-k="R"><input class="numinput" data-k="R"></div>` : ''}
      <div class="row">Diameter <input class="range" type="range" min="10" max="${m.type!=='plane'?Math.round(m.R*1.9):160}" data-k="diameter"><input class="numinput" data-k="diameter"></div>
      <label class="row" style="cursor:pointer"><input type="checkbox" ${m.showRays!==false?'checked':''} data-k="showRays" style="flex:none"> Show construction rays</label>
      <div class="readout" data-out="${m.id}"></div>`;
    field(el,m,'x',3,2000);
    wireGeom(el,m);
    el.querySelector('.nameinput').addEventListener('change',e=>{ m.name=e.target.value.trim()||null; draw(); });
    el.querySelector('[data-k="showRays"]').addEventListener('change',e=>{ m.showRays=e.target.checked; draw(); });
    el.addEventListener('click',ev=>{ if(!['INPUT','BUTTON'].includes(ev.target.tagName)){ selected={kind:'mirror',id:m.id}; renderCards(); draw(); } });
    mWrap.appendChild(el);
  });
}

function mirrorX(m,yWorld){
  if(m.type==='plane') return m.x;
  const R=Math.abs(m.R), h=Math.min(Math.abs(yWorld),R*0.98);
  const sag=R-Math.sqrt(R*R-h*h);
  return m.x + (m.type==='concave'?-1:1)*sag;
}
function computeImage(objH,objX,m){
  const do_=m.x-objX;
  if(m.type==='plane') return {do_, di:-do_, hi:objH, real:false, f:Infinity};
  const f=m.type==='concave'?m.R/2:-m.R/2;
  if(Math.abs(do_-f)<0.5) return {do_, di:Infinity, hi:NaN, real:true, f, atInf:true};
  const di=(f*do_)/(do_-f);
  const hi=-di/do_*objH;
  return {do_, di, hi, real:di>0, f};
}
function updateReadouts(){
  mirrors.forEach(m=>{
    const out=document.querySelector(`[data-out="${m.id}"]`); if(!out) return;
    const r=computeImage(obj.h,obj.x,m);
    if(r.atInf){ out.innerHTML=`<div>Object Distance <b>${fmt(r.do_,0)}</b></div><div style="grid-column:1/-1"><b>Image forms at infinity</b></div>`; return; }
    const upright=r.hi*obj.h>0;
    out.innerHTML=`<div>Focal Length <b>${fmt(r.f,0)}</b></div><div>Object Distance <b>${fmt(r.do_,0)}</b></div>
      <div>Image Distance <b>${fmt(r.di,0)}</b></div><div>Image Height <b>${fmt(r.hi)}</b></div>
      <div>Magnification <b>${(r.hi/obj.h).toFixed(2)}×</b></div><div><b>${r.real?'Real Image':'Virtual Image'}</b></div>
      <div style="grid-column:1/-1"><b>${upright?'Upright':'Inverted'}</b></div>`;
  });
}

const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
function fit(){
  const rect=cv.parentElement.getBoundingClientRect();
  const H = window.innerWidth<760 ? (window.innerWidth<420?300:360) : 480;
  cv.width=rect.width*devicePixelRatio; cv.height=H*devicePixelRatio;
  cv.style.height=H+'px'; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
}
window.addEventListener('resize',()=>{fit();draw();});
function autoFit(){
  const W=cv.width/devicePixelRatio, H=cv.height/devicePixelRatio;
  const maxX=Math.max(300, obj.x+80, ...mirrors.map(m=>m.x+m.diameter/2+50), 300);
  const minXw=Math.min(-30, obj.x-40);
  const maxY=Math.max(Math.abs(obj.h), ...mirrors.map(m=>m.diameter/2), 40)*1.4;
  const sx=(W-140)/(maxX-minXw), sy=(H-70)/(2*maxY);
  camera.ppcm=Math.min(sx,sy,6); camera.originX=70-minXw*camera.ppcm; camera.axisY=H/2;
}
function zoomBtn(f){
  const W=cv.width/devicePixelRatio,H=cv.height/devicePixelRatio, cx=W/2, cy=H/2;
  const old=camera.ppcm, next=Math.min(30,Math.max(0.05,old*f));
  const wxp=(cx-camera.originX)/old, wyp=(camera.axisY-cy)/old;
  camera.ppcm=next; camera.originX=cx-wxp*next; camera.axisY=cy+wyp*next; draw();
}
function niceStep(unitsPerPx){
  const opts=[0.1,0.2,0.5,1,2,5,10,20,50,100,200,500,1000,2000,5000];
  for(const o of opts) if(o/unitsPerPx>=48) return o;
  return 5000;
}

function draw(){
  const W=cv.width/devicePixelRatio, H=cv.height/devicePixelRatio;
  ctx.clearRect(0,0,W,H); updateReadouts(); handles=[];
  const wx=x=>camera.originX+x*camera.ppcm, wy=y=>camera.axisY-y*camera.ppcm;
  const f=UNITS[unit].f, pxPerUnit=camera.ppcm/f;
  const step=niceStep(1/pxPerUnit);
  const xMinD=(0-camera.originX)/camera.ppcm*f, xMaxD=(W-camera.originX)/camera.ppcm*f;
  const yMaxD=(camera.axisY-0)/camera.ppcm*f, yMinD=(camera.axisY-H)/camera.ppcm*f;
  const dec=step<1?2:(step<10?1:0);
  ctx.lineWidth=1; ctx.font='10px Inter,sans-serif';
  for(let k=Math.floor(xMinD/step); k*step<=xMaxD; k++){
    const dv=k*step, sx=wx(dv/f);
    ctx.strokeStyle= Math.abs(dv)<1e-6 ? 'rgba(91,109,255,.35)':'rgba(255,255,255,.06)';
    ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx,H); ctx.stroke();
    ctx.fillStyle='#8189a0'; ctx.fillText(dv.toFixed(dec)+UNITS[unit].l,sx+3,H-6);
  }
  for(let k=Math.floor(yMinD/step); k*step<=yMaxD; k++){
    const dv=k*step, sy=wy(dv/f);
    ctx.strokeStyle= Math.abs(dv)<1e-6 ? 'rgba(45,212,191,.35)':'rgba(255,255,255,.06)';
    ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(W,sy); ctx.stroke();
  }
  drawFrontHint(H);

  const ox=wx(obj.x), oy1=camera.axisY, oy2=wy(obj.h);
  drawArrow(ox,oy1,ox,oy2,'#5fc9f8',false);
  ctx.fillStyle='#5fc9f8'; ctx.font='11px Inter,sans-serif'; ctx.fillText('Object',ox-16,oy1+16);
  handles.push({kind:'move',target:{kind:'object',id:0},minX:ox-16,maxX:ox+16,minY:Math.min(oy1,oy2)-8,maxY:Math.max(oy1,oy2)+8});

  const boxesUsed=[];
  mirrors.forEach((m,idx)=>{
    const halfDw=m.diameter/2, halfD=halfDw*camera.ppcm, mx=wx(m.x);
    const isSel=selected&&selected.kind==='mirror'&&selected.id===m.id;
    if(isSel){ ctx.shadowColor=m.color; ctx.shadowBlur=14; }
    ctx.strokeStyle=m.color; ctx.lineWidth=2.6; ctx.beginPath();
    const N=22;
    for(let i=0;i<=N;i++){ const yw=-halfDw+2*halfDw*i/N; const sx=wx(mirrorX(m,yw)), sy=wy(yw); i===0?ctx.moveTo(sx,sy):ctx.lineTo(sx,sy); }
    ctx.stroke(); ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(210,216,226,.55)'; ctx.lineWidth=1;
    for(let yy=-halfDw; yy<=halfDw; yy+=13/camera.ppcm){
      const sx=wx(mirrorX(m,yy)), sy=wy(yy);
      ctx.beginPath(); ctx.moveTo(sx+3,sy); ctx.lineTo(sx+10,sy-7); ctx.stroke();
    }
    ctx.fillStyle=m.color; ctx.font='11px Inter,sans-serif';
    ctx.fillText(mirrorLabel(m), mx-30, camera.axisY-halfD-8);
    handles.push({kind:'move',target:{kind:'mirror',id:m.id},minX:mx-16,maxX:mx+16,minY:camera.axisY-halfD-8,maxY:camera.axisY+halfD+8});
    if(isSel) drawActionBtns(mx,camera.axisY-halfD-24,{kind:'mirror',id:m.id});

    if(m.type!=='plane'){
      const ff=(m.type==='concave'?m.R/2:-m.R/2);
      [[m.x-ff,'F'],[m.x-2*ff,'C']].forEach(([wxv,lbl])=>{
        const px=wx(wxv);
        if(px>0&&px<W){ ctx.fillStyle=m.color; ctx.beginPath(); ctx.arc(px,camera.axisY,3,0,7); ctx.fill(); ctx.font='bold 11px Inter,sans-serif'; ctx.fillText(lbl,px-4,camera.axisY-9); }
      });
    }
    const r=computeImage(obj.h,obj.x,m);
    if(r.atInf) return;
    const ix=wx(m.x-r.di), iy=wy(r.hi), showRays=m.showRays!==false;
    const edgeTopX=wx(mirrorX(m,halfDw)), edgeBotX=wx(mirrorX(m,-halfDw));
    if(showRays){
      [[edgeTopX,camera.axisY-halfD],[edgeBotX,camera.axisY+halfD]].forEach(([ex,ey])=>{
        ctx.strokeStyle=m.color; ctx.globalAlpha=.85; ctx.lineWidth=1; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(ox,oy2); ctx.lineTo(ex,ey); ctx.stroke();
        ctx.beginPath(); if(!r.real) ctx.setLineDash([3,3]);
        ctx.moveTo(ex,ey); ctx.lineTo(ix,iy); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha=1;
      });
    }
    drawArrow(ix,camera.axisY,ix,iy,m.color,!r.real);
    if(!showRays) return;
    const upright=r.hi*obj.h>0;
    const lines=[`Object Distance: ${fmt(r.do_,0)}`,`Image Distance: ${fmt(r.di,0)}`,`Image Height: ${fmt(r.hi)}`,`Magnification: ${(r.hi/obj.h).toFixed(2)}×`,`${r.real?'Real':'Virtual'} · ${upright?'Upright':'Inverted'}`];
    const bw=172,bh=lines.length*13+10;
    let bx=Math.min(Math.max(ix-bw/2,4),W-bw-4);
    let by=idx%2===0?22:H-bh-24;
    boxesUsed.forEach(prev=>{ if(Math.abs(prev.bx-bx)<bw&&prev.by===by) by+=(by<H/2?bh+6:-(bh+6)); });
    boxesUsed.push({bx,by});
    ctx.fillStyle='rgba(15,15,28,0.92)'; ctx.strokeStyle=m.color; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.roundRect?ctx.roundRect(bx,by,bw,bh,7):ctx.rect(bx,by,bw,bh); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#eef0f7'; ctx.font='10.5px Inter,sans-serif';
    lines.forEach((ln,li)=>ctx.fillText(ln,bx+7,by+15+li*13));
    ctx.strokeStyle=m.color; ctx.globalAlpha=.5; ctx.setLineDash([2,2]); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(bx+bw/2,by<H/2?by+bh:by); ctx.lineTo(ix,iy); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha=1;
  });
}
function drawFrontHint(H){
  ctx.fillStyle='#8b96a5'; ctx.font='italic 11px Inter,sans-serif'; ctx.fillText('front',10,H/2-30);
  ctx.strokeStyle='#8b96a5'; ctx.beginPath(); ctx.moveTo(10,H/2-18); ctx.lineTo(34,H/2-18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(34,H/2-18); ctx.lineTo(29,H/2-22); ctx.lineTo(29,H/2-14); ctx.closePath(); ctx.fillStyle='#8b96a5'; ctx.fill();
}
function drawActionBtns(cx,topY,target){
  const w=24,h=20,gap=4, totalW=w*2+gap, startX=cx-totalW/2;
  [['⧉','#5b6dff','dup'],['✕','#ff6b6b','del']].forEach(([icon,col,act],i)=>{
    const bx=startX+i*(w+gap);
    ctx.fillStyle='rgba(15,15,28,0.95)'; ctx.strokeStyle=col; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.roundRect?ctx.roundRect(bx,topY-h,w,h,5):ctx.rect(bx,topY-h,w,h); ctx.fill(); ctx.stroke();
    ctx.fillStyle=col; ctx.font='12px Inter,sans-serif'; ctx.textAlign='center'; ctx.fillText(icon,bx+w/2,topY-h/2+4); ctx.textAlign='left';
    handles.push({kind:act,target,minX:bx,maxX:bx+w,minY:topY-h,maxY:topY});
  });
}
function drawArrow(x1,y1,x2,y2,color,dashed){
  ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=2; ctx.setLineDash(dashed?[5,4]:[]);
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.setLineDash([]);
  const ang=Math.atan2(y2-y1,x2-x1), size=7;
  ctx.beginPath(); ctx.moveTo(x2,y2);
  ctx.lineTo(x2-size*Math.cos(ang-0.4),y2-size*Math.sin(ang-0.4));
  ctx.lineTo(x2-size*Math.cos(ang+0.4),y2-size*Math.sin(ang+0.4));
  ctx.closePath(); ctx.fill();
}
function toLocal(e){ const rect=cv.getBoundingClientRect(); return {cx:(e.touches?e.touches[0].clientX:e.clientX)-rect.left, cy:(e.touches?e.touches[0].clientY:e.clientY)-rect.top}; }
function findHandle(cx,cy){
  for(let i=handles.length-1;i>=0;i--){ const h=handles[i]; if(h.kind!=='move' && cx>=h.minX&&cx<=h.maxX&&cy>=h.minY&&cy<=h.maxY) return h; }
  for(let i=handles.length-1;i>=0;i--){ const h=handles[i]; if(h.kind==='move' && cx>=h.minX&&cx<=h.maxX&&cy>=h.minY&&cy<=h.maxY) return h; }
  return null;
}
let downPos=null, moved=false;
cv.addEventListener('pointerdown',e=>{
  const {cx,cy}=toLocal(e); const h=findHandle(cx,cy);
  cv.setPointerCapture(e.pointerId); downPos={cx,cy}; moved=false;
  if(h&&h.kind==='dup'){ duplicateMirror(h.target.id); return; }
  if(h&&h.kind==='del'){ removeMirror(h.target.id); return; }
  if(h&&h.kind==='move'){ drag=h.target; if(drag.kind==='mirror'){ selected=drag; renderCards(); } cv.style.cursor='grabbing'; draw(); }
  else { pan={x:cx,y:cy,ox:camera.originX,oy:camera.axisY}; cv.style.cursor='grabbing'; }
  e.preventDefault();
});
cv.addEventListener('pointermove',e=>{
  const {cx,cy}=toLocal(e);
  if(downPos&&Math.hypot(cx-downPos.cx,cy-downPos.cy)>4) moved=true;
  if(drag){
    const worldX=(cx-camera.originX)/camera.ppcm, worldY=(camera.axisY-cy)/camera.ppcm;
    if(drag.kind==='object'){ obj.x=Math.round(worldX); obj.h=Math.round(worldY)||1; }
    else { const m=mirrors.find(x=>x.id===drag.id); if(m) m.x=Math.round(Math.max(3,worldX)); }
    renderCards(); draw();
  } else if(pan){ camera.originX=pan.ox+(cx-pan.x); camera.axisY=pan.oy+(cy-pan.y); draw(); }
});
['pointerup','pointercancel'].forEach(ev=>cv.addEventListener(ev,()=>{
  if(pan&&!moved){ selected=null; renderCards(); draw(); }
  drag=null; pan=null; downPos=null; cv.style.cursor='grab';
}));
cv.addEventListener('wheel',e=>{
  e.preventDefault(); const {cx,cy}=toLocal(e);
  const old=camera.ppcm, factor=Math.exp(-e.deltaY*0.0015);
  const next=Math.min(30,Math.max(0.05,old*factor));
  const wxp=(cx-camera.originX)/old, wyp=(camera.axisY-cy)/old;
  camera.ppcm=next; camera.originX=cx-wxp*next; camera.axisY=cy+wyp*next; draw();
},{passive:false});

const SESSION_KEY='rayscale_reflection_state';
function serializeState(){ return JSON.stringify({obj,mirrors,idcM}); }
function persist(){ try{ sessionStorage.setItem(SESSION_KEY, serializeState()); }catch(e){} }
function restoreFrom(json){
  try{ const d=JSON.parse(json); obj=d.obj; mirrors=d.mirrors; idcM=d.idcM; selected=null; renderCards(); autoFit(); draw(); return true; }catch(e){ return false; }
}
function saveToFile(){
  const blob=new Blob([serializeState()],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='reflection-scene.json'; a.click();
}
function loadFromFile(e){
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{ restoreFrom(reader.result); };
  reader.readAsText(file); e.target.value='';
}
const _origDraw=draw;
draw=function(){ _origDraw(); persist(); };

fit();
const saved = (()=>{ try{ return sessionStorage.getItem(SESSION_KEY); }catch(e){ return null; } })();
if(saved && restoreFrom(saved)){ /* restored */ } else { resetBench(); }
fit(); autoFit(); draw();