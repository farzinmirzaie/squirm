// Builds the game into dist/, ready for any static host (GitHub Pages included):
//   dist/index.html          page, styles and game code (src/ joined together)
//   dist/vendor/three.min.js three.js r128, self-hosted so the game works offline
//   dist/fonts/              Grandstander and Nunito (latin subset)
//   dist/icons/, manifest    PWA install metadata (from public/)
//   dist/sw.js               service worker that precaches all of the above
// usage: node tools/build.js [--debug] [--out <dir>]
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const root=path.join(__dirname,'..'), outArg=process.argv.indexOf('--out');
const dist=outArg>0?path.resolve(process.argv[outArg+1]):path.join(root,'dist');
const src=f=>fs.readFileSync(path.join(root,'src',f),'utf8');
const stripExports=s=>s.replace(/if\(typeof module!=='undefined'\)[^\n]*\n?/,'');

const FONTS=[['Grandstander','grandstander',[600,800]],['Nunito','nunito',[600,700,800]]];

fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(path.join(dist,'vendor'),{recursive:true});
fs.mkdirSync(path.join(dist,'fonts'),{recursive:true});

// static files
fs.cpSync(path.join(root,'public'),dist,{recursive:true});
fs.copyFileSync(require.resolve('three/build/three.min.js'),path.join(dist,'vendor','three.min.js'));
let fontCss='';
for(const [family,pkg,weights] of FONTS) for(const w of weights){
  const file=`${pkg}-latin-${w}-normal.woff2`;
  fs.copyFileSync(require.resolve(`@fontsource/${pkg}/files/${file}`),path.join(dist,'fonts',file));
  fontCss+=`@font-face{font-family:"${family}";font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${file}) format("woff2")}\n`;
}
// third-party licenses travel with the files they cover
fs.copyFileSync(require.resolve('three/LICENSE'),path.join(dist,'vendor','three-LICENSE.txt'));
for(const [,pkg] of FONTS) fs.copyFileSync(require.resolve(`@fontsource/${pkg}/LICENSE`),path.join(dist,'fonts',`${pkg}-LICENSE.txt`));

// the page
// the game script: the files in src/game/, joined in tools/game-files.js order inside one function wrapper
let game='(function(){\n'+require('./game-files').map(f=>src('game/'+f)).join('')+'})();\n';
// --debug exposes a few hooks for browser automation, inserted just before the wrapper closes
if(process.argv.includes('--debug')) game=game.replace(/\}\)\(\);\s*$/,"window.__squirm={load:(i,intro)=>{hideAll(); loadLevel(i,!!intro);},move:k=>tryMove(k),busy:()=>animating>0||queue.length>0,names:()=>LEVELS.map(l=>l.name),dir:(x,y)=>dirFromScreen(x,y),mem:()=>({...renderer.info.memory,programs:renderer.info.programs.length,calls:renderer.info.render.calls,tris:renderer.info.render.triangles}),st:()=>JSON.stringify({s:state.segs,st:state.status,m:state.moves})};\n})();\n");
let sha=(process.env.GITHUB_SHA||'').slice(0,7);
if(!sha){ try{ sha=require('child_process').execSync('git rev-parse --short HEAD',{cwd:root,stdio:['ignore','pipe','ignore']}).toString().trim(); }catch(e){ sha='dev'; } }
const build=`v${require('../package.json').version} · ${sha}`;
const html=src('shell.html').replace('__BUILD__',build).replace('/*__FONTS__*/',()=>fontCss.trim()).replace('/*__LOGIC__*/',()=>stripExports(src('logic.js')))
  .replace('/*__LEVELS__*/',()=>stripExports(src('levels.js'))).replace('/*__GAME__*/',()=>game);
new Function(html.split('<script>')[1].split('</script>')[0]); // syntax check
fs.writeFileSync(path.join(dist,'index.html'),html);

// service worker: precache every file, versioned by a hash of their contents
const files=[];
(function walk(d){ for(const f of fs.readdirSync(d).sort()){ const p=path.join(d,f); fs.statSync(p).isDirectory()?walk(p):files.push(path.relative(dist,p).split(path.sep).join('/')); } })(dist);
const hash=crypto.createHash('sha256'); for(const f of files){ hash.update(f); hash.update(fs.readFileSync(path.join(dist,f))); }
const version=hash.digest('hex').slice(0,12);
const assets=['./',...files];
fs.writeFileSync(path.join(dist,'sw.js'),src('sw.js').replace('__VERSION__',version).replace('__ASSETS__',()=>JSON.stringify(assets)));

const kb=f=>Math.round(fs.statSync(path.join(dist,f)).size/1024);
const shown=path.relative(root,dist); console.log(`built ${shown.startsWith('..')?dist:shown}/ (${files.length+1} files, index.html ${kb('index.html')}KB, version ${version})`);
