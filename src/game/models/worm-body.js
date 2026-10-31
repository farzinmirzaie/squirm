// ---------- the worm's body: a tube rebuilt every frame through the segment anchors ----------
const tubePool=[], capPool=[];
function tubeGeo(geo,pts,rads,cols,extra,gs){
  const S=pts.length, RS=20, verts=S*RS;
  let pos=geo.getAttribute('position');
  if(!pos||pos.count!==verts){
    geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(verts*3),3));
    geo.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(verts*3),3));
    geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(verts*3),3));
    geo.setAttribute('pg',new THREE.BufferAttribute(new Float32Array(verts*3),3));
    const idx=[]; for(let j=0;j<S-1;j++) for(let r=0;r<RS;r++){ const a=j*RS+r, b=j*RS+(r+1)%RS, c=(j+1)*RS+r, d=(j+1)*RS+(r+1)%RS; idx.push(a,c,b, b,c,d); }
    geo.setIndex(idx); pos=geo.getAttribute('position');
  }
  const nor=geo.getAttribute('normal'), col=geo.getAttribute('color'), pg=geo.getAttribute('pg');
  const up=new THREE.Vector3(0,1,0), T=new THREE.Vector3(), side=new THREE.Vector3(), prev=new THREE.Vector3(1,0,0), U=new THREE.Vector3();
  for(let j=0;j<S;j++){
    const p=pts[j]; if(j<S-1) T.subVectors(pts[j+1],p); else T.subVectors(p,pts[j-1]); T.normalize();
    side.crossVectors(T,up); if(side.lengthSq()<1e-4) side.copy(prev); side.normalize(); prev.copy(side); U.crossVectors(side,T).normalize();
    const r=rads[j]+extra;
    for(let k=0;k<RS;k++){ const an=k/RS*Math.PI*2, ca=Math.cos(an), sa=Math.sin(an); const i=(j*RS+k)*3;
      const nx=side.x*ca+U.x*sa, ny=side.y*ca+U.y*sa, nz=side.z*ca+U.z*sa;
      pos.array[i]=p.x+nx*r; pos.array[i+1]=p.y+ny*r; pos.array[i+2]=p.z+nz*r;
      nor.array[i]=nx; nor.array[i+1]=ny; nor.array[i+2]=nz;
      if(cols){ col.array[i]=cols[j].r; col.array[i+1]=cols[j].g; col.array[i+2]=cols[j].b; }
      if(gs){ pg.array[i]=gs[j]; pg.array[i+1]=ca*r; pg.array[i+2]=sa*r; } }
  }
  pos.needsUpdate=true; nor.needsUpdate=true; col.needsUpdate=true; if(gs) pg.needsUpdate=true; geo.computeBoundingSphere();
}
function getTube(i){ if(!tubePool[i]){ const body=new THREE.Mesh(new THREE.BufferGeometry(),tubeMat), line=new THREE.Mesh(new THREE.BufferGeometry(),lineMat);
    body.castShadow=true; body.frustumCulled=false; line.frustumCulled=false; wormG.add(body,line); tubePool[i]={body,line}; } return tubePool[i]; }
function getCap(i){ if(!capPool[i]){ const c=new THREE.Mesh(sph(1,24,16),capMat.clone()); c.castShadow=true; const o=new THREE.Mesh(c.geometry,lineMat);
  c.add(o); c.userData.o=o; wormG.add(c); capPool[i]=c; } return capPool[i]; }
const WHITE=new THREE.Color(0xffffff), SUNSET=new THREE.Color(0xFF9A7A), SUNROSE=new THREE.Color(0xFF8FA8), RAINBOW=[0xFFB3C8,0xFFE08A,0x7FD9B0,0xA9D8F5,0xCDB8F5].map(c=>new THREE.Color(c));
let curPat='plain';
// a tint that turns round the colour wheel the short way, so Sunset on Mint or Sky glows instead of going muddy;
// a little paler and softer on the way, so the colours in between stay pastel. hk: how far the hue turns
const hsA={}, hsB={};
function hueMix(c,to,k,hk=k){ c.getHSL(hsA); to.getHSL(hsB); let dh=hsB.h-hsA.h; dh-=Math.round(dh); const w=Math.sin(Math.PI*hk)*Math.min(1,Math.abs(dh)*4);
  return c.setHSL((hsA.h+dh*hk+1)%1,(hsA.s+(hsB.s-hsA.s)*k)*(1-.45*w),hsA.l+(hsB.l-hsA.l)*k+.05*w); }
// the rainbow starts at the band nearest the body colour, so it grows out of the body without a grey blend
function rainbowFrom(base){ let b=0, bd=9; RAINBOW.forEach((c,i)=>{ const d=(c.r-base.r)**2+(c.g-base.g)**2+(c.b-base.b)**2; if(d<bd){ bd=d; b=i; } });
  return b; }
// sunset ends in coral, or in rose on a body that is already coral-ish (Peach, Cocoa) so it still shows
function sunsetTo(base){ base.getHSL(hsA); SUNSET.getHSL(hsB); const dh=Math.abs(hsA.h-hsB.h); return Math.min(dh,1-dh)<.05?SUNROSE:SUNSET; }
// body colour at place g (0 head, n-1 tail tip) as vertex colours: the tints that run along the body. Edges
// (rings, stripes, bands, spots, glitter) are drawn per pixel by tubeMat
function colorAt(g,n,pat=curPat,base=COL_A){ const c=base.clone(); if(n<=1) return c; const t=Math.min(1,Math.max(0,g/(n-1)));
  if(pat==='fade') c.lerp(WHITE,.6*t);
  else if(pat==='sunset') hueMix(c,sunsetTo(base),.75*t,t);
  else if(pat==='rainbow'){ const g0=(n-1)*.4; if(g>g0){ const u=(g-g0)*2, k=rainbowFrom(base)+Math.floor(u);
    c.lerp(tmpC.copy(RAINBOW[k%5]).lerp(RAINBOW[(k+1)%5],u%1),Math.min(1,(g-g0)*1.5)); } }
  return c; }
let crawlK=-1;
function radAt(g,n,anchors){ const i=Math.min(Math.floor(g),anchors.length-2), f=g-i;
  const sc=anchors[Math.max(0,i)].scale.x*(1-f)+anchors[Math.min(i+1,anchors.length-1)].scale.x*f;
  let r=(i===0? segR(0,n)+(segR(1,n)-segR(0,n))*f*f*(3-2*f) : segR(i,n)*(1-f)+segR(i+1,n)*f);
  if(g>.4) r*=1+.04*Math.cos(g*4*Math.PI);
  if(crawlK>=0 && n>1){ const pos=(1-crawlK)*(n-1); r*=1+.15*Math.sin(Math.PI*crawlK)*Math.exp(-((g-pos)*(g-pos))/.35); }
  return r*sc; }
const CORNER=.25, TIP_LEN=.17, TIP_K=.55;
function portalAt(p){ const c=tileAt(state,p[0],p[1]); return c>='1'&&c<='9'; }
function updateWorm(){
  const anchors=segMeshes.concat(tailExtras); const n=anchors.length; let ti=0, ci=0;
  if(wormG.visible && n){
    const idle = !animating && state.status==='play' && !reduceMotion;
    // under soft soil the body (never the head) sinks out of sight, and the heap on the tile hides it
    const P=anchors.map((a,i)=>{ const v=a.position.clone(); if(idle) v.y+=Math.sin(idleT*3-i*.8)*.02; if(i) v.y-=soilDepth(v)*.5; return v; });
    // the length the tints are spread over follows a growing or shrinking tail, so fade, sunset and rainbow glide
    const nP=anchors.reduce((a,s,i)=>a+(i?Math.min(1,s.scale.x):1),0);
    let chains=[], cur=[0];
    for(let i=1;i<n;i++){ if(P[i].distanceTo(P[i-1])>1.3){ chains.push(cur); cur=[i]; } else cur.push(i); }
    chains.push(cur);
    const segs=state.segs;
    for(const ch of chains){
      // control points with their position along the worm (G for the radius, Gp for the pattern, which keeps
      // running through a dive and down the tail tip so spots and glitter never stretch); ends next to a portal dive into it
      let pts=ch.map(i=>P[i]), G=ch.map(i=>i), Gp=G.slice(), diveFront=false, diveBack=false;
      const f=ch[0], l=ch[ch.length-1];
      // round the bends: each inner anchor is pulled a little toward its neighbours, so a corner or a U-turn
      // curves wider than the body is thick instead of pinching into a crease on its inside
      if(pts.length>=3) pts=pts.map((p,j)=>{ if(j===0||j===pts.length-1) return p; const a=pts[j-1], b=pts[j+1];
        return p.clone().set(p.x+((a.x+b.x)/2-p.x)*CORNER,p.y,p.z+((a.z+b.z)/2-p.z)*CORNER); });
      if(f>0 && f<segs.length && portalAt(segs[f-1])){ const q=partner(state,segs[f-1][0],segs[f-1][1]);
        if(q && Math.abs(q[0]-segs[f][0])+Math.abs(q[1]-segs[f][1])===1){ pts=[wp(q[0],q[1],-.3),wp(q[0],q[1],.12),...pts]; G=[f,f,...G]; Gp=[f-.9,f-.6,...Gp];
          diveFront=true; } }
      if(l>0 && l<segs.length-1 && l+1<n && portalAt(segs[l]) && P[l+1].distanceTo(P[l])>1.3){ pts=[...pts,wp(segs[l][0],segs[l][1],-.3)]; G=[...G,l];
        Gp=[...Gp,l+.4]; diveBack=true; }
      // out of a tunnel, one tile on and straight back into the same tunnel: a hairpin, the strand coming up
      // beside the one going down, instead of one tube folding back on itself
      // (the tail end too, when the tail is the bit still coming out of that tunnel)
      if(diveFront && ch.length===2 && l<segs.length){ const q=partner(state,segs[f-1][0],segs[f-1][1]);
        if(q && q[0]===segs[l][0] && q[1]===segs[l][1]){ diveBack=true;
          const a=P[l], b=P[f], dx=b.x-a.x, dz=b.z-a.z, dl=Math.hypot(dx,dz)||1, ux=dx/dl, uz=dz/dl, w=.16;
          const v=(o,y,sd,k)=>new THREE.Vector3(o.x-uz*w*sd+ux*k,y,o.z+ux*w*sd+uz*k);
          pts=[v(a,-.3,1,0),v(a,.12,1,0),v(b,b.y,.85,-.06),v(b,b.y,0,.13),v(b,b.y,-.85,-.06),v(a,a.y,-1,0),v(a,-.3,-1,0)];
          G=[f,f,f,f+.3,f+.6,l,l]; Gp=[f-.9,f-.6,f-.2,f+.1,f+.4,l,l+.4]; } }
      // the tail tapers to a soft point a little past the last anchor, resting on the ground
      let tipP=null, tipR=0; const tip=l===n-1 && !diveBack && ch.length>=2;
      if(tip){ const a=P[l], b=P[l-1], dx=a.x-b.x, dz=a.z-b.z, dl=Math.hypot(dx,dz)||1, rl=radAt(l,n,anchors);
        tipR=rl*TIP_K; tipP=new THREE.Vector3(a.x+dx/dl*TIP_LEN*anchors[l].scale.x,a.y-(rl-tipR),a.z+dz/dl*TIP_LEN*anchors[l].scale.x); pts=[...pts,tipP];
          G=[...G,l]; Gp=[...Gp,l+tipP.distanceTo(a)]; }
      if(pts.length>=2){
        // the neck starts low inside the head: its top stays under a hat's brim and its sides behind the cheeks
        if(ch[0]===0 && !diveFront) pts[0]=pts[0].clone().setY(pts[0].y-.08);
        const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
        const S=(pts.length-1)*9+1, sp=[], rr=[], cc=[], gs=[];
        for(let j=0;j<S;j++){ const u=j/(S-1); sp.push(curve.getPoint(u)); const fi=u*(pts.length-1), i0=Math.floor(Math.min(fi,pts.length-1.0001)), t=fi-i0;
          const gg=G[i0]*(1-t)+G[i0+1]*t, gp=Gp[i0]*(1-t)+Gp[i0+1]*t; rr.push(radAt(gg,n,anchors)*(tip&&i0===pts.length-2?1-(1-TIP_K)*t*t:1));
            cc.push(dusty(colorAt(gp,nP))); gs.push(gp); }
        const tb=getTube(ti++); tb.body.visible=tb.line.visible=true; tubeGeo(tb.body.geometry,sp,rr,cc,0,gs);
          tubeGeo(tb.line.geometry,sp,rr.map(r=>r+.03*Math.min(1,r/.15)),null,0);
      }
      const ends=[]; if(!diveFront && f!==0) ends.push(f); if(!diveBack && (l!==f || ch.length===1) && l!==0) ends.push(l);
      for(const end of ends){ const c=getCap(ci++); const atTip=tip&&end===l, r=atTip?Math.max(.001,tipR):Math.max(.001,radAt(Math.min(end,n-1),n,anchors));
        c.visible=true; c.position.copy(atTip?tipP:P[end]); c.scale.setScalar(r); c.userData.o.scale.setScalar(1+.03*Math.min(1,r/.15)/r);
          c.material.color.copy(dusty(colorAt(atTip?Gp[Gp.length-1]:end,nP))); }
    }
  }
  for(let i=ti;i<tubePool.length;i++){ tubePool[i].body.visible=tubePool[i].line.visible=false; }
  for(let i=ci;i<capPool.length;i++) capPool[i].visible=false;
}
