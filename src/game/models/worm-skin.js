const tubeMat=new THREE.MeshToonMaterial({color:0xffffff,vertexColors:true,gradientMap:gradTex});
// patterns with edges are drawn per pixel from 'pg' (place along the worm, then the ring direction scaled by the
// radius), so they stay crisp and keep their size on the stage and in a patch, at any length: the soft groove
// between body rings (every pattern), Stripes, Bands, Spots (round pale spots on the back, alternating left and
// right of the spine, two to a segment) and Glitter (specks a fixed size in the world, a whole number of them
// around the body so there's no seam). fwidth(g) is about one pixel on the body, for edges that don't shimmer
const patU={value:0}, PAT_ID={stripes:1,spots:2,bands:3,glitter:4};
tubeMat.extensions={derivatives:true};
tubeMat.onBeforeCompile=sh=>{ sh.uniforms.uPat=patU;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 pg; varying vec3 vPg;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPg=pg;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uPat; varying vec3 vPg;').replace('#include <color_fragment>',`#include <color_fragment>
    float g=vPg.x, r=max(length(vPg.yz),.001), an=atan(vPg.z,vPg.y), px=max(fwidth(g),.0005), q=abs(fract(g*2.+.5)-.5)*.5, m=abs(.25-q);
    if(g>.4) diffuseColor.rgb*=1.-.07*(1.-smoothstep(0.,.05+px,q));
    if(g>.55 && uPat>.5 && uPat<1.5) diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),.5*(1.-smoothstep(.085-.012-px,.085+.012+px,m)));
    if(g>.55 && uPat>2.5 && uPat<3.5) diffuseColor.rgb*=1.-.18*(1.-smoothstep(.026-px,.026+px,m));
    if(uPat>1.5 && uPat<2.5){ float k=floor(g*2.+.5); if(k>1.5){ float a=an-1.5708-(mod(k,2.)>.5?.7:-.7); a=abs(mod(a+3.14159,6.28318)-3.14159);
      float d=length(vec2(g-k*.5,a*r)), R=.36*r; diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),.6*(1.-smoothstep(R-px,R+px,d))); } }
    if(uPat>3.5){ vec2 c=vec2(g*8.,an*1.909859), id=floor(c), fr=fract(c)-.5; float h=fract(sin(dot(id,vec2(12.9898,78.233)))*43758.5453);
      if(id.x>3.5 && h>.55){ vec2 o=vec2(fract(h*7.31),fract(h*13.7))-.5, cs=vec2(.125,r*.5236); float R=min(.016+.008*fract(h*3.7),.3*cs.y), d=length((fr-o*.4)*cs);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),.9*(1.-smoothstep(R-px,R+px,d))); } }`); };
const capMat=new THREE.MeshToonMaterial({color:0xffffff,gradientMap:gradTex});
const COL_A=new THREE.Color(0xFFB3C8), tmpC=new THREE.Color();
// the worm's blush, one per colour (WORM_COLS); kept in MC so disposeTree never frees it
const cheekMat=MC.wormCheek=new THREE.MeshBasicMaterial({color:C.cheek,transparent:true,opacity:.7});
// worm colours, earned with garden stars: [name, body, head, stars needed, cheek blush].
// Head and body share a hex: the head's toon sphere and the body's vertex colours render the same
// colour under the same light, so any difference shows as a seam at the neck.
