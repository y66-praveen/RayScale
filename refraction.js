const ECOLORS=["#5b6dff","#2dd4bf","#e879b9","#f9a03f","#8fd694","#f4d35e"];
const UNITS={cm:{f:1,l:'cm'},m:{f:0.01,l:'m'},ft:{f:1/30.48,l:'ft'},in:{f:1/2.54,l:'in'}};
let unit='cm';
function fmt(v,dec=1){ if(!isFinite(v)) return '∞'; const u=UNITS[unit]; return (v*u.f).toFixed(dec)+u.l; }
document.querySelectorAll('#unitGrp button').forEach(b=>b.addEventListener('click',()=>{
  unit=b.dataset.u; document.querySelectorAll('#unitGrp button').forEach(x=>x.classList.toggle('active',x===b));
  renderCards(); draw();
}));

let obj={x:0,h:40}; let els=[]; let idcM=0;
let camera={ppcm:1.3,originX:70,axisY:230};
let handles=[]; let drag=null; let pan=null; let selected=null;

function resetBench(){ obj={x:0,h:40}; els=[]; idcM=0; selected=null; autoFit(); renderCards(); draw(); }
function addEl(type){
  idcM++;
  const lastX = els.length? Math.max(...els.map(m=>m.x+(m.diameter||m.thickness)/2))+70 : 150;
  const base={id:idcM,type,name:null,color:ECOLORS[(idcM-1)%ECOLORS.length],x:lastX,diameter:90,showRays:true};
  if(type==='slab') els.push({...base,n:1.5,thickness:60});
  else els.push({...base,R:160,n:1.5});
  renderCards(); draw();
}
function duplicateEl(id){
  const m=els.find(x=>x.id===id); if(!m) return;
  idcM++; els.push({...m,id:idcM,name:m.name?m.name+' copy':null,x:m.x+(m.diameter||m.thickness)+20,color:ECOLORS[(idcM-1)%ECOLORS.length]});
  selected={id:idcM}; renderCards(); draw();
}
function removeEl(id){ els=els.filter(m=>m.id!==id); if(selected&&selected.id===id) selected=null; renderCards(); draw(); }
function typeName(t){ return t==='convexlens'?'Convex Lens':t==='concavelens'?'Concave Lens':'Glass Slab'; }
function elLabel(m){ return m.name || (typeName(m.type)+' #'+m.id); }

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
function clampLensGeom(m){ if(m.type!=='slab'){ const maxD=Math.abs(m.R)*1.9; if(m.diameter>maxD) m.diameter=maxD; } }
function wireLensGeom(el,m){
  const rRange=el.querySelector('[data-k="R"].range'), rNum=el.querySelector('[data-k="R"].numinput');
  const dRange=el.querySelector('[data-k="diameter"].range'), dNum=el.querySelector('[data-k="diameter"].numinput');
  const pushAll=()=>{
    rRange.value=m.R; rNum.value=(m.R*UNITS[unit].f).toFixed(unit==='cm'?0:2);
    dRange.value=m.diameter; dNum.value=(m.diameter*UNITS[unit].f).toFixed(unit==='cm'?0:2);
  };
  const apply=()=>{ clampLensGeom(m); pushAll(); draw(); };
  rRange.addEventListener('input',()=>{ m.R=+rRange.value; apply(); });
  rNum.addEventListener('change',()=>{ let v=parseFloat(rNum.value); if(!isNaN(v)) m.R=Math.max(10,Math.min(2000,v/UNITS[unit].f)); apply(); });
  dRange.addEventListener('input',()=>{ m.diameter=+dRange.value; apply(); });
  dNum.addEventListener('change',()=>{ let v=parseFloat(dNum.value); if(!isNaN(v)) m.diameter=Math.max(10,Math.min(2000,v/UNITS[unit].f)); apply(); });
  pushAll();
}
function fieldFloat(el,model,key,min,max,step){
  const range=el.querySelector(`input.range[data-k="${key}"]`), num=el.querySelector(`input.numinput[data-k="${key}"]`);
  const push=()=>{ range.value=model[key]; num.value=model[key].toFixed(2); };
  range.addEventListener('input',()=>{ model[key]=+range.value; push(); draw(); });
  num.addEventListener('change',()=>{ let v=parseFloat(num.value); if(!isNaN(v)) model[key]=Math.max(min,Math.min(max,v)); push(); draw(); });
  push();
}

function renderCards(){
  const oWrap=document.getElementById('objCards'), mWrap=document.getElementById('mirCards');
  oWrap.innerHTML=`<div class="card"><h3><span class="dot" style="background:#5fc9f8"></span>Object</h3>
    <div class="row">Height <input class="range" type="range" min="-80" max="80" data-k="h"><input class="numinput" data-k="h"></div>
    <div class="row">Position <input class="range" type="range" min="-40" max="300" data-k="x"><input class="numinput" data-k="x"></div></div>`;
  const oc=oWrap.firstElementChild; field(oc,obj,'h',-80,80); field(oc,obj,'x',-40,300);

  mWrap.innerHTML='';
  if(els.length===0) mWrap.innerHTML='<div class="empty">No lenses or slabs yet — add one above.</div>';
  els.forEach(m=>{
    if(m.type!=='slab') clampLensGeom(m);
    const el=document.createElement('div'); el.className='card'+(selected&&selected.id===m.id?' selected':'');
    const isLens=m.type!=='slab';
    el.innerHTML=`<h3><span class="dot" style="background:${m.color}"></span>
      <input class="nameinput" value="${elLabel(m)}">
      <button class="iconbtn" title="Duplicate" onclick="duplicateEl(${m.id})">⧉</button>
      <button class="iconbtn del" title="Delete" onclick="removeEl(${m.id})">✕</button></h3>
      <div class="row">Distance <input class="range" type="range" min="5" max="420" data-k="x"><input class="numinput" data-k="x"></div>
      ${isLens ? `<div class="row">Radius of Curvature <input class="range" type="range" min="10" max="400" data-k="R"><input class="numinput" data-k="R"></div>
      <div class="row">Diameter <input class="range" type="range" min="10" max="${Math.round(m.R*1.9)}" data-k="diameter"><input class="numinput" data-k="diameter"></div>`
      : `<div class="row">Thickness <input class="range" type="range" min="5" max="200" data-k="thickness"><input class="numinput" data-k="thickness"></div>
      <div class="row">Height <input class="range" type="range" min="20" max="300" data-k="diameter"><input class="numinput" data-k="diameter"></div>`}
      <div class="row">Refractive Index (n) <input class="range" type="range" min="1.1" max="2.4" step="0.01" data-k="n"><input class="numinput" data-k="n"></div>
      <label class="row" style="cursor:pointer"><input type="checkbox" ${m.showRays!==false?'checked':''} data-k="showRays" style="flex:none"> Show rays</label>
      <div class="readout" data-out="${m.id}"></div>`;
    field(el,m,'x',3,2000);
    if(isLens){ wireLensGeom(el,m); }
    else { field(el,m,'thickness',5,2000); field(el,m,'diameter',20,2000); }
    fieldFloat(el,m,'n',1.1,2.4,0.01);
    el.querySelector('.nameinput').addEventListener('change',e=>{ m.name=e.target.value.trim()||null; draw(); });
    el.querySelector('[data-k="showRays"]').addEventListener('change',e=>{ m.showRays=e.target.checked; draw(); });
    el.addEventListener('click',ev=>{ if(!['INPUT','BUTTON'].includes(ev.target.tagName)){ selected={id:m.id}; renderCards(); draw(); } });
    mWrap.appendChild(el);
  });
}

function computeLensImage(objH,objX,m){
  const do_=m.x-objX;
  const sign=m.type==='convexlens'?1:-1;
  const f=sign*m.R/(2*Math.max(0.11,m.n-1));
  if(Math.abs(do_-f)<0.5) return {do_, di:Infinity, hi:NaN, real:true, f, atInf:true};
  const di=(f*do_)/(do_-f);
  const hi=-di/do_*objH;
  return {do_, di, hi, real:di>0, f};
}
function computeSlab(objH,objX,m){
  const halfT=m.thickness/2, x1=m.x-halfT, x2=m.x+halfT;
  const th1=Math.atan2(0-objH,x1-objX);
  const s2=Math.sin(th1)/m.n; const th2=Math.asin(Math.max(-1,Math.min(1,s2)));
  const critAngle=Math.asin(1/m.n)*180/Math.PI;
  const shift=(x2-x1)*Math.sin(th1-th2)/Math.cos(th2||0.0001);
  return {x1,x2,th1,th2,critAngle,shift,apparentT:m.thickness/m.n};
}

function updateReadouts(){
  els.forEach(m=>{
    const out=document.querySelector(`[data-out="${m.id}"]`); if(!out) return;
    if(m.type==='slab'){
      const r=computeSlab(obj.h,obj.x,m);
      out.innerHTML=`<div>Angle of Incidence <b>${(Math.abs(r.th1)*180/Math.PI).toFixed(1)}°</b></div>
        <div>Angle of Refraction <b>${(Math.abs(r.th2)*180/Math.PI).toFixed(1)}°</b></div>
        <div>Lateral Shift <b>${fmt(Math.abs(r.shift),1)}</b></div>
        <div>Critical Angle <b>${r.critAngle.toFixed(1)}°</b></div>
        <div style="grid-column:1/-1">Apparent Thickness (viewed through) <b>${fmt(r.apparentT,1)}</b></div>`;
      return;
    }
    const r=computeLensImage(obj.h,obj.x,m);
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
  cv.width=rect.width*devicePixelRatio; cv.height=480*devicePixelRatio;
  cv.style.height='480px'; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
}
window.addEventListener('resize',()=>{fit();draw();});
function autoFit(){
  const W=cv.width/devicePixelRatio, H=cv.height/devicePixelRatio;
  const maxX=Math.max(300, obj.x+80, ...els.map(m=>m.x+(m.diameter||m.thickness)/2+50), 300);
  const minXw=Math.min(-30, obj.x-40);
  const maxY=Math.max(Math.abs(obj.h), ...els.map(m=>m.diameter/2), 40)*1.4;
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

function lensSag(m,yWorld,halfDw){
  const R=Math.abs(m.R), h=Math.min(Math.abs(yWorld),R*0.98,halfDw*0.98);
  return R-Math.sqrt(R*R-h*h);
}
function lensHalfWidthWorld(m,yWorld,halfDw){
  const edgeSag=lensSag(m,halfDw,halfDw), ySag=lensSag(m,yWorld,halfDw);
  return m.type==='convexlens' ? Math.max(0.3,edgeSag-ySag) : (Math.max(2,halfDw*0.06)+ySag);
}
function drawLensBody(m,halfDw){
  const N=20;
  ctx.save(); ctx.filter='blur(7px)';
  ctx.beginPath();
  for(let i=0;i<=N;i++){ const y=-halfDw+2*halfDw*i/N; const w=lensHalfWidthWorld(m,y,halfDw); const sx=wx(m.x+w), sy=wy(y); i===0?ctx.moveTo(sx,sy):ctx.lineTo(sx,sy); }
  for(let i=N;i>=0;i--){ const y=-halfDw+2*halfDw*i/N; const w=lensHalfWidthWorld(m,y,halfDw); const sx=wx(m.x-w), sy=wy(y); ctx.lineTo(sx,sy); }
  ctx.closePath();
  ctx.fillStyle=m.color+'30'; ctx.fill();
  ctx.restore();
  ctx.strokeStyle=m.color; ctx.lineWidth=2.2;
  ctx.beginPath();
  for(let i=0;i<=N;i++){ const y=-halfDw+2*halfDw*i/N; const w=lensHalfWidthWorld(m,y,halfDw); const sx=wx(m.x+w), sy=wy(y); i===0?ctx.moveTo(sx,sy):ctx.lineTo(sx,sy); }
  ctx.stroke();
  ctx.beginPath();
  for(let i=0;i<=N;i++){ const y=-halfDw+2*halfDw*i/N; const w=lensHalfWidthWorld(m,y,halfDw); const sx=wx(m.x-w), sy=wy(y); i===0?ctx.moveTo(sx,sy):ctx.lineTo(sx,sy); }
  ctx.stroke();
}
function drawSlabBody(m,halfD){
  const x1=wx(m.x-m.thickness/2), x2=wx(m.x+m.thickness/2);
  ctx.save(); ctx.filter='blur(8px)';
  ctx.fillStyle=m.color+'28';
  ctx.fillRect(x1,camera.axisY-halfD,x2-x1,halfD*2);
  ctx.restore();
  ctx.strokeStyle=m.color; ctx.lineWidth=2.2;
  ctx.strokeRect(x1,camera.axisY-halfD,x2-x1,halfD*2);
}

function draw(){
  const W=cv.width/devicePixelRatio, H=cv.height/devicePixelRatio;
  ctx.clearRect(0,0,W,H); updateReadouts(); handles=[];
  window.wx=x=>camera.originX+x*camera.ppcm; window.wy=y=>camera.axisY-y*camera.ppcm;
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

  const ox=wx(obj.x), oy1=camera.axisY, oy2=wy(obj.h);
  drawArrow(ox,oy1,ox,oy2,'#5fc9f8',false);
  ctx.fillStyle='#5fc9f8'; ctx.font='11px Inter,sans-serif'; ctx.fillText('Object',ox-16,oy1+16);
  handles.push({target:{id:0},minX:ox-16,maxX:ox+16,minY:Math.min(oy1,oy2)-8,maxY:Math.max(oy1,oy2)+8,move:true});

  const boxesUsed=[];
  els.forEach((m,idx)=>{
    const halfDw=m.diameter/2, halfD=halfDw*camera.ppcm, mx=wx(m.x);
    const isSel=selected&&selected.id===m.id;
    if(isSel){ ctx.shadowColor=m.color; ctx.shadowBlur=14; }
    if(m.type==='slab') drawSlabBody(m,halfD); else drawLensBody(m,halfDw);
    ctx.shadowBlur=0;
    ctx.fillStyle=m.color; ctx.font='11px Inter,sans-serif';
    ctx.fillText(elLabel(m), mx-30, camera.axisY-halfD-8);
    handles.push({target:{id:m.id},minX:mx-Math.max(16,halfDw*camera.ppcm*0.1),maxX:mx+Math.max(16,halfDw*camera.ppcm*0.1),minY:camera.axisY-halfD-8,maxY:camera.axisY+halfD+8,move:true});
    if(isSel) drawActionBtns(mx,camera.axisY-halfD-24,m.id);
    if(m.type!=='slab'){
      const ffval=Math.abs(computeLensImage(obj.h,obj.x,m).f);
      const pts=[[m.x-ffval,'F'],[m.x+ffval,'F'],[m.x-2*ffval,'C'],[m.x+2*ffval,'C']];
      const merged=[];
      pts.forEach(([wxv,lbl])=>{
        const existing=merged.find(p=>Math.abs(p.wxv-wxv)<2);
        if(existing) existing.lbl = [...new Set((existing.lbl+lbl).split(''))].join('');
        else merged.push({wxv,lbl});
      });
      merged.forEach(({wxv,lbl})=>{
        const px=wx(wxv);
        if(px>0&&px<W){ ctx.fillStyle=m.color; ctx.beginPath(); ctx.arc(px,camera.axisY,3,0,7); ctx.fill(); ctx.font='bold 11px Inter,sans-serif'; ctx.fillText(lbl,px-4,camera.axisY-9); }
      });
    }
    if(!m.showRays){ return; }

    if(m.type==='slab'){
      const r=computeSlab(obj.h,obj.x,m);
      const x1s=wx(r.x1), x2s=wx(r.x2);
      const entryY=wy(0), sgn=Math.sign(obj.h)||1;
      const exitYw = 0 - (r.x2-r.x1)*Math.tan(r.th2)*sgn;
      const exitY=wy(exitYw);
      ctx.strokeStyle=m.color; ctx.lineWidth=1.4; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(ox,oy2); ctx.lineTo(x1s,entryY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1s,entryY); ctx.lineTo(x2s,exitY); ctx.stroke();
      const bx2=wx(r.x2+(r.x2-r.x1)*2), by2=wy(exitYw - ((r.x2-r.x1)*2)*Math.tan(r.th1)*sgn);
      ctx.beginPath(); ctx.moveTo(x2s,exitY); ctx.lineTo(bx2,by2); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.setLineDash([3,3]);
      const ux2=wx(r.x2+(r.x2-r.x1)*2), uy2=wy(0-((r.x2-r.x1)*3)*Math.tan(r.th1)*sgn);
      ctx.beginPath(); ctx.moveTo(ox,oy2); ctx.lineTo(ux2,uy2); ctx.stroke(); ctx.setLineDash([]);
    } else {
      const r=computeLensImage(obj.h,obj.x,m);
      if(r.atInf) return;
      const ix=wx(m.x+r.di), iy=wy(r.hi);
      [halfD,-halfD].forEach(edge=>{
        const py=camera.axisY-edge;
        ctx.strokeStyle=m.color; ctx.globalAlpha=.85; ctx.lineWidth=1; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(ox,oy2); ctx.lineTo(mx,py); ctx.stroke();
        ctx.beginPath(); if(!r.real) ctx.setLineDash([3,3]);
        ctx.moveTo(mx,py); ctx.lineTo(ix,iy); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha=1;
      });
      drawArrow(ix,camera.axisY,ix,iy,m.color,!r.real);
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
    }
  });
}
function drawActionBtns(cx,topY,id){
  const w=24,h=20,gap=4, totalW=w*2+gap, startX=cx-totalW/2;
  [['⧉','#5b6dff','dup'],['✕','#ff6b6b','del']].forEach(([icon,col,act],i)=>{
    const bx=startX+i*(w+gap);
    ctx.fillStyle='rgba(15,15,28,0.95)'; ctx.strokeStyle=col; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.roundRect?ctx.roundRect(bx,topY-h,w,h,5):ctx.rect(bx,topY-h,w,h); ctx.fill(); ctx.stroke();
    ctx.fillStyle=col; ctx.font='12px Inter,sans-serif'; ctx.textAlign='center'; ctx.fillText(icon,bx+w/2,topY-h/2+4); ctx.textAlign='left';
    handles.push({kind:act,target:{id},minX:bx,maxX:bx+w,minY:topY-h,maxY:topY});
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
  for(let i=handles.length-1;i>=0;i--){ const h=handles[i]; if(h.kind && cx>=h.minX&&cx<=h.maxX&&cy>=h.minY&&cy<=h.maxY) return h; }
  for(let i=handles.length-1;i>=0;i--){ const h=handles[i]; if(h.move && cx>=h.minX&&cx<=h.maxX&&cy>=h.minY&&cy<=h.maxY) return h; }
  return null;
}
let downPos=null, moved=false;
cv.addEventListener('pointerdown',e=>{
  const {cx,cy}=toLocal(e); const h=findHandle(cx,cy);
  cv.setPointerCapture(e.pointerId); downPos={cx,cy}; moved=false;
  if(h&&h.kind==='dup'){ duplicateEl(h.target.id); return; }
  if(h&&h.kind==='del'){ removeEl(h.target.id); return; }
  if(h&&h.move){ drag=h.target; if(drag.id!==0){ selected=drag; renderCards(); } cv.style.cursor='grabbing'; draw(); }
  else { pan={x:cx,y:cy,ox:camera.originX,oy:camera.axisY}; cv.style.cursor='grabbing'; }
  e.preventDefault();
});
cv.addEventListener('pointermove',e=>{
  const {cx,cy}=toLocal(e);
  if(downPos&&Math.hypot(cx-downPos.cx,cy-downPos.cy)>4) moved=true;
  if(drag){
    const worldX=(cx-camera.originX)/camera.ppcm, worldY=(camera.axisY-cy)/camera.ppcm;
    if(drag.id===0){ obj.x=Math.round(worldX); obj.h=Math.round(worldY)||1; }
    else { const m=els.find(x=>x.id===drag.id); if(m) m.x=Math.round(Math.max(3,worldX)); }
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

const SESSION_KEY='rayscale_refraction_state';
function serializeState(){ return JSON.stringify({obj,els,idcM}); }
function persist(){ try{ sessionStorage.setItem(SESSION_KEY, serializeState()); }catch(e){} }
function restoreFrom(json){
  try{ const d=JSON.parse(json); obj=d.obj; els=d.els; idcM=d.idcM; selected=null; renderCards(); autoFit(); draw(); return true; }catch(e){ return false; }
}
function saveToFile(){
  const blob=new Blob([serializeState()],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='refraction-scene.json'; a.click();
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