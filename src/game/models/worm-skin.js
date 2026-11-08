// ---------- the worm's skin: the body tube's material, pattern shader and blush ----------
const tubeMat=new THREE.MeshToonMaterial({color:0xffffff,vertexColors:true,gradientMap:gradTex});
// patterns with edges are drawn per pixel from 'pg' (place along the worm, then the ring direction scaled by the
// radius), so they stay crisp and keep their size on the stage and in a patch, at any length: the soft groove
// between body rings with a faint sheen on top of each ring and a paler belly (every pattern), Stripes, Bands, Spots (round pale spots on the back, alternating left and
// right of the spine, two to a segment), Glitter (specks a fixed size in the world, a whole number of them
// around the body so there's no seam) and Candy stripe (two spirals, a wide white one and a thin rose one, winding
// down the body; its edges are smoothed with the angle's own derivative, so atan's seam never shows). Four move with
// uT (seconds, held still under reduced motion): Shimmer (a gloss that sweeps from head to tail), Glow worm (warm
// lights on the back twinkling down the body in turn), Prism (soft rainbow hues flowing along the body) and Starry
// (little five-pointed stars scattered over the back, each twinkling in its own time). fwidth(g) is about one pixel on the body, for edges that don't shimmer
const patU={value:0}, patT={value:0}, PAT_ID={stripes:1,spots:2,bands:3,glitter:4,shimmer:5,glow:6,prism:7,candy:8,starry:9};
tubeMat.extensions={derivatives:true};
tubeMat.onBeforeCompile=sh=>{ sh.uniforms.uPat=patU; sh.uniforms.uT=patT;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 pg; varying vec3 vPg;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPg=pg;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uPat; uniform float uT; varying vec3 vPg;').replace('#include <color_fragment>',`#include <color_fragment>
    float g=vPg.x, r=max(length(vPg.yz),.001), an=atan(vPg.z,vPg.y), px=max(fwidth(g),.0005), q=abs(fract(g*2.+.5)-.5)*.5, m=abs(.25-q);
    float up=vPg.z/r;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),.16*(1.-smoothstep(-.75,-.2,up)));
    if(g>.4) diffuseColor.rgb*=(1.-.07*(1.-smoothstep(0.,.05+px,q)))*(1.+.05*smoothstep(.1,.25,q)*max(up,0.));
    if(g>.55 && uPat>.5 && uPat<1.5) diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),.5*(1.-smoothstep(.085-.012-px,.085+.012+px,m)));
    if(g>.55 && uPat>2.5 && uPat<3.5) diffuseColor.rgb*=1.-.18*(1.-smoothstep(.026-px,.026+px,m));
    if(uPat>1.5 && uPat<2.5){ float k=floor(g*2.+.5); if(k>1.5){ float a=an-1.5708-(mod(k,2.)>.5?.7:-.7); a=abs(mod(a+3.14159,6.28318)-3.14159);
      float d=length(vec2(g-k*.5,a*r)), R=.36*r; diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),.6*(1.-smoothstep(R-px,R+px,d))); } }
    if(uPat>4.5 && uPat<5.5){ float s=fract(g*.24-uT*.45), b=exp(-pow((s-.5)*8.,2.));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),.68*b*smoothstep(.3,.9,g)*(.55+.45*max(up,0.))); }
    if(uPat>5.5 && uPat<6.5 && g>.6){ float lit=0.;
      for(int j=0;j<3;j++){ float off=j==0?0.:.5, ang=j==0?0.:(j==1?1.45:-1.45), kk=floor(g-off+.5)+off;
        float a=abs(mod(an-1.5708-ang+3.14159,6.28318)-3.14159), d=length(vec2(g-kk,a*r)), R=.34*r;
        float p=pow(.5+.5*sin(uT*2.4-kk*1.1+float(j)*.9),4.);
        lit=max(lit,(1.-smoothstep(R-px,R+px,d))*(.3+.7*p)+.45*(1.-smoothstep(R,R*2.6,d))*p); }
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.94,.58),.92*min(lit,1.)); }
    if(uPat>6.5 && uPat<7.5){ vec3 hu=clamp(abs(mod(fract(g*.11-uT*.07)*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);
      float lum=max(max(diffuseColor.r,diffuseColor.g),diffuseColor.b);
      diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(1.),hu,.42)*lum,.75*smoothstep(.4,1.4,g)); }
    if(uPat>7.5 && uPat<8.5){ float y=vPg.y, z=vPg.z, da=(abs(y*dFdx(z)-z*dFdx(y))+abs(y*dFdy(z)-z*dFdy(y)))/(r*r);
      float s=g*1.25+an*.31831, sw=px*1.25+da*.31831+.002, q=fract(s), bd=smoothstep(-sw,sw,q)-smoothstep(.42-sw,.42+sw,q)+smoothstep(1.-sw,1.+sw,q);
      float th=smoothstep(.6-sw,.6+sw,q)-smoothstep(.76-sw,.76+sw,q), k=smoothstep(.45,.8,g);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),.62*bd*k); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.96,.4,.55),.38*th*k); }
    if(uPat>8.5 && g>.6){ float lit=0., glo=0.;
      for(int j=0;j<2;j++){ float off=j==0?0.:.31, kk=floor((g-off)*1.6)+.5, h=fract(sin(kk*12.9898+float(j)*78.233)*43758.5453), h2=fract(h*7.13);
        float gc=kk/1.6+off+(h2-.5)*.18, a=an-1.5708-(h-.5)*2.6; a=mod(a+3.14159,6.28318)-3.14159;
        vec2 p=vec2(g-gc,a*r); float d=length(p), tw=.5+.5*sin(uT*1.9+h*40.), R=(.3+.12*h2)*r*(.82+.28*tw);
        float th=atan(p.y,p.x)+h*6.28, rr=R*(.42+.58*pow(abs(cos(2.5*th)),3.));
        lit=max(lit,(1.-smoothstep(rr-px,rr+px,d))*(.6+.4*tw)); glo=max(glo,(1.-smoothstep(R*.6,R*2.,d))*tw*.3); }
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.98,.86),min(1.,glo)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.95,.62),.95*lit); }
    if(uPat>3.5 && uPat<4.5){ vec2 c=vec2(g*8.,an*1.909859), id=floor(c), fr=fract(c)-.5; float h=fract(sin(dot(id,vec2(12.9898,78.233)))*43758.5453);
      if(id.x>3.5 && h>.55){ vec2 o=vec2(fract(h*7.31),fract(h*13.7))-.5, cs=vec2(.125,r*.5236);
        float R=min(.016+.008*fract(h*3.7),.3*cs.y), d=length((fr-o*.4)*cs);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),.9*(1.-smoothstep(R-px,R+px,d))); } }`); };
const capMat=new THREE.MeshToonMaterial({color:0xffffff,gradientMap:gradTex});
const COL_A=new THREE.Color(0xFFB3C8), tmpC=new THREE.Color();
// the worm's blush, one per colour (WORM_COLS); kept in MC so disposeTree never frees it
const cheekMat=MC.wormCheek=new THREE.MeshBasicMaterial({color:C.cheek,transparent:true,opacity:.7});
