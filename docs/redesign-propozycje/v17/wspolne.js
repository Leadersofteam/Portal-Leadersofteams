// V17 PRO Portalu — wspólny skrypt makiet (kopia z LoT App 19.11, menu Portalu; „worker” w kodzie = gość)
// Feniks v17 pro — wspólny skrypt makiet (wydzielony 18.11 z feniks-v17.html bez zmian w wyglądzie).
// Wstawia „ramę” każdego ekranu: tło siatki liderów, menu szyna↔panel (sekcje jak nav-items.ts), podpowiedź,
// dolny pasek i arkusz modułów (telefon), przełącznik motywu. Strona zawiera tylko <div class="app">…</div>.
// Aktywny moduł: <body data-ekran="CRM">. Parametry adresu: ?motyw=dark|light, ?menu=open, ?arkusz=1, ?stan=<stan>.
// Globalne dla skryptu strony: q (URLSearchParams), H (<html>), ikona(n), V17.stan (bieżący stan makiety).
const q=new URLSearchParams(location.search);
try{if(q.get('motyw'))document.documentElement.dataset.theme=q.get('motyw');}catch(e){}
// ── MENU PORTALU (V17 PRO, 19.11): sekcje Portalu; trasy z apps/web/app/*, dolny pasek jak components/bottom-nav.tsx ──
// Ostateczny podział sekcji zatwierdza Maciej na makiecie P0 — zmieniasz TU, nie w każdej makiecie.
const MENU_LIDER=[
 {t:'',i:[['squares-four','Panel'],['bell','Powiadomienia',3]]},
 {t:'Rynek',i:[['briefcase','Zlecenia'],['storefront','Usługi'],['buildings','Firmy'],['magnifying-glass','Szukaj']]},
 {t:'Liderzy',i:[['users-three','Liderzy'],['ladder','Drabinka'],['path','Droga Lidera']]},
 {t:'Społeczność',i:[['rss','Feed'],['question','Pytania'],['users-four','Grupy'],['hash','Tematy']]},
 {t:'Moje',i:[['tag','Moje oferty'],['bookmark-simple','Zapisane'],['star','Punkty'],['gear-six','Konto']]},
];
// dolny pasek telefonu (bottom-nav.tsx): Feed, Usługi, [środek = Dodaj → create-sheet], Powiadomienia, Panel + „Więcej” = arkusz
const DOL_LIDER=[['rss','Feed'],['storefront','Usługi'],['plus-circle','Dodaj','tel'],['bell','Powiadomienia']];
// gość (niezalogowany): <body data-rola="gosc"> — prawe sloty jak GUEST_RIGHT_SLOTS (Dla firm, Zaloguj)
const MENU_WORKER=[{t:'Rynek',i:[['briefcase','Zlecenia'],['storefront','Usługi'],['buildings','Firmy']]},{t:'Liderzy',i:[['users-three','Liderzy'],['ladder','Drabinka']]},{t:'Społeczność',i:[['rss','Feed'],['question','Pytania']]},{t:'',i:[['handshake','Dla firm'],['sign-in','Zaloguj']]}];
const DOL_WORKER=[['rss','Feed'],['storefront','Usługi'],['handshake','Dla firm','tel'],['sign-in','Zaloguj']];
// <body data-rola="worker"> → menu pracownika; <body data-rama="publiczna"> → bez menu (np. karta QR /k/:token, logowanie)
const ROLA=document.body.dataset.rola==='gosc'?'worker':(document.body.dataset.rola||'lider'),PUBL=document.body.dataset.rama==='publiczna';
const MENU=ROLA==='worker'?MENU_WORKER:MENU_LIDER,DOL=ROLA==='worker'?DOL_WORKER:DOL_LIDER;
if(ROLA==='worker')document.documentElement.classList.add('rola-worker');
if(PUBL)document.documentElement.classList.add('rama-publiczna');
const ikona=n=>`<i class="ph-duotone ph-${n}"></i>`;
const H=document.documentElement;
const V17={stan:q.get('stan')||'',ekran:document.body.dataset.ekran||'Pulpit'};
(function rama(){
  const E=V17.ekran,B=document.body,app=B.querySelector('.app');
  const przed=`<canvas id="siec" aria-hidden="true"></canvas>
<nav class="nav" id="nav" aria-label="Główne">
  <div class="top"><div class="logo" role="img" aria-label="Feniks"></div><span class="marka">Leaders of Teams</span></div>
  <div class="scroll" id="navlista"></div>
  <button class="zwin" id="zwin" aria-expanded="false"><i class="ph-bold ph-caret-double-right"></i><span class="lb">Zwiń menu</span></button>
</nav>
<div class="tip" id="tip"></div>`;
  const wDol=DOL.some(d=>d[1]===E);
  const po=`<div class="tlo" id="tlo"></div>
<div class="arkusz" id="arkusz" aria-label="Wszystkie moduły"><div class="uch"></div><div id="arklista"></div></div>
<nav class="dol" aria-label="Główne (telefon)">${DOL.map(([ic,l,k])=>k==='tel'
    ?`<a class="tel${l===E?' on':''}" aria-label="${ROLA==='worker'?'Dla firm':'Dodaj'}"><i class="ph-duotone ph-${ic}" style="font-size:24px"></i></a>`
    :`<a${l===E?' class="on"':''}>${ikona(ic)}${l}</a>`).join('')}<a id="wiecej"${wDol?'':' class="on"'}><i class="ph-duotone ph-dots-nine"></i>Więcej</a></nav>
<button class="pill motyw" style="cursor:pointer" onclick="var d=document.documentElement;d.dataset.theme=d.dataset.theme==='dark'?'light':'dark'"><i class="ph-duotone ph-moon-stars"></i>Motyw</button>`;
  if(PUBL){app.insertAdjacentHTML('beforebegin','<canvas id="siec" aria-hidden="true"></canvas><div class="tip" id="tip"></div><button class="zwin" id="zwin" hidden><span class="lb"></span></button>');app.insertAdjacentHTML('afterend','<div class="tlo" id="tlo"></div><a id="wiecej" hidden></a>'+po.slice(po.indexOf('<button class="pill motyw"')));return;}
  app.insertAdjacentHTML('beforebegin',przed);
  app.insertAdjacentHTML('afterend',po);
  document.getElementById('navlista').innerHTML=MENU.map(s=>`<div class="sek">${s.t?`<div class="t"><span>${s.t}</span></div>`:''}${s.i.map(([ic,l,n])=>`<a class="it${l===E?' on':''}" data-l="${l}">${ikona(ic)}<span class="lb">${l}</span>${n?`<span class="n${n>2?' cz':''}">${n}</span><span class="kr"></span>`:''}</a>`).join('')}</div>`).join('');
  document.getElementById('arklista').innerHTML=MENU.map(s=>`<div class="sek">${s.t?`<div class="t"><span>${s.t}</span></div>`:''}<div class="siatka">${s.i.map(([ic,l])=>`<a>${ikona(ic)}${l}</a>`).join('')}</div></div>`).join('');
})();
// rozsuwanie w poziomie: przycisk (zapamiętane) + podpowiedź po najechaniu w trybie szyny
const zwin=document.getElementById('zwin'),tip=document.getElementById('tip');
function nav(o){H.dataset.nav=o?'open':'';zwin.setAttribute('aria-expanded',o);zwin.querySelector('.lb').textContent=o?'Zwiń menu':'Rozwiń menu';try{localStorage.setItem('nav17',o?'1':'')}catch(e){}}
let start=q.get('menu')?q.get('menu')==='open':false;try{if(!q.get('menu'))start=localStorage.getItem('nav17')==='1'}catch(e){}
nav(start);zwin.onclick=()=>nav(H.dataset.nav!=='open');
document.querySelectorAll('.nav .it').forEach(a=>{a.addEventListener('mouseenter',()=>{if(H.dataset.nav==='open')return;const r=a.getBoundingClientRect();tip.textContent=a.dataset.l;tip.style.left=(r.right+14)+'px';tip.style.top=(r.top+r.height/2-15)+'px';tip.classList.add('on')});a.addEventListener('mouseleave',()=>tip.classList.remove('on'))});
addEventListener('keydown',e=>{if(e.key==='['&&!e.target.closest('input'))nav(H.dataset.nav!=='open')});
document.getElementById('wiecej').onclick=()=>H.dataset.arkusz='on';document.getElementById('tlo').onclick=()=>H.dataset.arkusz='';
if(q.get('arkusz'))H.dataset.arkusz='on';
if(q.get('szkic'))H.dataset.pokazSzkic='1'; // ?szkic=1 → obrysowuje pola oznaczone data-szkic (backend ich dziś nie liczy)

// ── Stany makiety (pusty / ładowanie / błąd / własne): <html data-stan="…">; przełącznik w rogu (tylko gdy strona
// deklaruje <body data-stany="dane,pusty,ladowanie,blad">). Element z data-tylko-stan="dane pusty" jest widoczny tylko w tych stanach.
(function(){
  const lista=(document.body.dataset.stany||'').split(',').filter(Boolean); if(!lista.length) return;
  const NAZ={dane:'Dane',pusty:'Pusty',ladowanie:'Ładowanie',blad:'Błąd'};
  const ustaw=s=>{V17.stan=s==='dane'?'':s;H.dataset.stan=V17.stan;document.querySelectorAll('[data-tylko-stan]').forEach(el=>{el.hidden=!el.dataset.tylkoStan.split(' ').includes(s)});document.querySelectorAll('.stany button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.s===s));document.dispatchEvent(new CustomEvent('v17stan',{detail:V17.stan}));};
  const el=document.createElement('div');el.className='stany';el.setAttribute('role','group');el.setAttribute('aria-label','Stan makiety');
  el.innerHTML=lista.map(s=>{const [k,n]=s.split(':');return `<button data-s="${k}">${n||NAZ[k]||k}</button>`}).join('');
  el.addEventListener('click',e=>{const b=e.target.closest('button');if(b)ustaw(b.dataset.s)});
  document.body.appendChild(el);ustaw(V17.stan||'dane');
})();

// ── Tło „siatka liderów”: lekka siatka (CSS) + liderzy na węzłach; impuls biegnie po liniach siatki od lidera do lidera
// (najpierw w poziomie, potem w pionie) i zostawia gasnący ślad. Ruch wyłączony przy reduced-motion, pauza w tle.
(function(){
  const cv=document.getElementById('siec'),ctx=cv.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W,H,K,L=[],imp=[],dpr=Math.min(1.5,devicePixelRatio||1),zywy=true,ost=0;
  const ciem=()=>document.documentElement.dataset.theme==='dark';
  function init(){W=innerWidth;H=innerHeight;K=W<600?36:48;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    const kol=Math.ceil(W/K),wier=Math.ceil(H/K),ile=Math.round(kol*wier*(W<600?.035:.03));L=[];
    for(let i=0;i<ile;i++)L.push({c:1+Math.floor(Math.random()*(kol-1)),r:1+Math.floor(Math.random()*(wier-1)),em:Math.random()<.12,ph:Math.random()*6.28});
    imp=[];if(reduce)rys(0);}
  function rys(t){ctx.clearRect(0,0,W,H);const d=ciem(),fi=d?'199,180,255':'106,69,232',em='244,169,59';
    // ślady i impulsy
    for(const m of imp){const q=Math.min(1,(t-m.t0)/m.dl),dl=m.pts.length-1;
      const poz=f=>{const s=f*dl,i=Math.min(dl-1,Math.floor(s)),u=s-i;return[m.pts[i][0]+(m.pts[i+1][0]-m.pts[i][0])*u,m.pts[i][1]+(m.pts[i+1][1]-m.pts[i][1])*u]};
      const g0=Math.max(0,q-.35);ctx.lineCap='round';
      for(let k=0;k<14;k++){const f1=g0+(q-g0)*k/14,f2=g0+(q-g0)*(k+1)/14,[x1,y1]=poz(f1),[x2,y2]=poz(f2);ctx.strokeStyle=`rgba(${m.em?em:fi},${(k/14)*(d?.55:.45)*(1-Math.max(0,(t-m.t0-m.dl)/700))})`;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
      if(q<1){const[x,y]=poz(q),g=ctx.createRadialGradient(x,y,0,x,y,7);g.addColorStop(0,`rgba(${m.em?em:fi},.8)`);g.addColorStop(1,`rgba(${m.em?em:fi},0)`);ctx.fillStyle=g;ctx.fillRect(x-7,y-7,14,14);}}
    imp=imp.filter(m=>t-m.t0<m.dl+700);
    // liderzy na węzłach: kropka + delikatna aureola, lekkie „oddychanie”
    for(const l of L){const x=l.c*K,y=l.r*K,o=reduce?1:.75+.25*Math.sin(t/1400+l.ph),c=l.em?em:fi;
      ctx.fillStyle=`rgba(${c},${(d?.12:.09)*o})`;ctx.beginPath();ctx.arc(x,y,7,0,6.29);ctx.fill();
      ctx.fillStyle=`rgba(${c},${(d?.6:.45)*o})`;ctx.beginPath();ctx.arc(x,y,2,0,6.29);ctx.fill();}
    if(!reduce&&L.length>1&&t-ost>1800&&imp.length<2){const a=L[Math.floor(Math.random()*L.length)];let b=L[Math.floor(Math.random()*L.length)];
      if(b!==a&&Math.abs(a.c-b.c)+Math.abs(a.r-b.r)<9){const pts=[[a.c*K,a.r*K],[b.c*K,a.r*K],[b.c*K,b.r*K]];imp.push({pts,t0:t,dl:(Math.abs(a.c-b.c)+Math.abs(a.r-b.r))*170+300,em:a.em||b.em});ost=t;}}
  }
  function petla(t){if(!zywy)return;rys(t);requestAnimationFrame(petla);}
  init();if(!reduce)requestAnimationFrame(petla);
  addEventListener('resize',()=>{clearTimeout(cv._r);cv._r=setTimeout(init,150)});
  document.addEventListener('visibilitychange',()=>{zywy=document.visibilityState==='visible';if(zywy&&!reduce)requestAnimationFrame(petla)});
  new MutationObserver(()=>reduce&&rys(0)).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  document.documentElement.style.setProperty('--kratka',(innerWidth<600?36:48)+'px');
})();
// ── Reflektor na kartach: delikatna poświata pod kursorem ──
document.addEventListener('pointermove',e=>{const k=e.target.closest&&e.target.closest('.k');if(!k)return;const r=k.getBoundingClientRect();k.style.setProperty('--mx',(e.clientX-r.left)+'px');k.style.setProperty('--my',(e.clientY-r.top)+'px');});

// ── Feniks z postępem (dla ekranów, gdzie postęp wynika z danych: poziom prowizji, wygrane wyceny…) ──
// Ten sam ptak z cząstek co „Feniks dnia” na Pulpicie (obraz z --feniks): cząstki dosadzane od ogona do głowy do wartości `p` (0…1);
// niedosadzone = blady kontur. Reduced-motion = statycznie. Użycie: V17.feniks(document.getElementById('cv'), 0.66, {kolor:'205,150,255'})
V17.feniks=function(cv,p,opt){if(!cv)return;cv.setAttribute('data-szkic','Feniks z postępu — wartość p wynika z danych; do sprawdzenia, czy backend liczy');const ctx=cv.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,dpr=Math.min(2,devicePixelRatio||1);
  const img=new Image();img.src=getComputedStyle(document.documentElement).getPropertyValue('--feniks').trim().replace(/^url\(["']?/,'').replace(/["']?\)$/,'');
  img.onload=()=>{const r=cv.getBoundingClientRect(),W=r.width,H=r.height;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);const d=x.getImageData(0,0,c.width,c.height).data;
    const r0=img.height/img.width,prawa=opt&&opt.prawa,bw=prawa?Math.min(W*.5,(H*.6)/r0,250):Math.min(W,H/r0),bh=bw*r0,ox=prawa?W-bw-10:(W-bw)/2,oy=prawa?10:(H-bh)/2,k=W<200?3:2,pts=[];
    for(let y=0;y<img.height;y+=k)for(let xx=0;xx<img.width;xx+=k){const i=(y*img.width+xx)*4;if(d[i+3]>140){const nx=xx/img.width,ny=y/img.height;pts.push({x:ox+nx*bw,y:oy+ny*bh,c:d[i]+','+d[i+1]+','+d[i+2],o:nx*0.8+(1-ny)*0.2});}}
    pts.sort((a,b)=>a.o-b.o);const n=pts.length;let t0=0;
    const rys=(t)=>{ctx.clearRect(0,0,W,H);const q=reduce?1:Math.min(1,(t-t0)/900),pp=p*q;
      pts.forEach((pt,i)=>{const dom=i/n<pp;if(dom){const dr=reduce?0:Math.sin(t/900+i)*.3;ctx.fillStyle=`rgba(${pt.c},1)`;ctx.fillRect(pt.x+dr-1,pt.y+dr-1,2,2);}else if(i%2===0){ctx.fillStyle=`rgba(${pt.c},.14)`;ctx.fillRect(pt.x-.8,pt.y-.8,1.6,1.6);}});
      if(!reduce&&q<1)requestAnimationFrame(rys);else if(!reduce)requestAnimationFrame(rys);};
    t0=performance.now();reduce?rys(0):requestAnimationFrame(rys);};
};

// ── Wspólne wykresy v17 (te same, co na Pulpicie): słupki z gradientem + linia z punktami; lejek poziomych słupków; sparkline ──
// V17.wykres(svg, {mies:['VI',…], slupki:[…], linia:[…], max:150, ticks:[0,50,100,150], etSl:'Przychód', fmt:v=>v})
V17.wykres=function(svg,o){const M=o.mies,P=o.slupki,K=o.linia||[],W=Math.max(300,Math.round(svg.getBoundingClientRect().width)||400),Hh=o.wys||170,b=24,mx=o.max,x=i=>34+i*((W-50)/M.length),y=v=>Hh-b-(v/mx)*(Hh-b-10),id='g'+Math.random().toString(36).slice(2,7),bw=(W-50)/M.length;
 let s='';(o.ticks||[0,mx/2,mx]).forEach(v=>{s+=`<line x1="30" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--ln)"/><text x="0" y="${y(v)+4}">${v}</text>`});
 P.forEach((v,i)=>{s+=`<rect x="${x(i)+6}" y="${y(v)}" width="${bw-16}" height="${y(0)-y(v)}" rx="6" fill="url(#${id})" opacity="${i===P.length-1?1:.55}"/><text x="${x(i)+bw/2-6}" y="${Hh-6}" text-anchor="middle">${M[i]}</text>`});
 if(K.length){s+=`<path d="${K.map((v,i)=>`${i?'L':'M'}${x(i)+bw/2-2} ${y(v)}`).join(' ')}" fill="none" stroke="var(--ember)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;K.forEach((v,i)=>s+=`<circle cx="${x(i)+bw/2-2}" cy="${y(v)}" r="3" fill="var(--bg)" stroke="var(--ember)" stroke-width="2"/>`);}
 const l=P.length-1;s+=`<text x="${x(l)+bw/2-6}" y="${y(P[l])-8}" text-anchor="middle" style="fill:var(--tx);font-weight:700">${(o.fmt||(v=>v))(P[l])}</text>`;
 svg.setAttribute('viewBox',`0 0 ${W} ${Hh}`);svg.setAttribute('data-szkic','wykres 6 miesięcy — do sprawdzenia, czy backend liczy serię');svg.innerHTML=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ac2)"/><stop offset="1" stop-color="var(--ac)"/></linearGradient></defs>`+s;};
// V17.lejek(el, [[etykieta, liczba, wartość-tekst, szerokość%, kolor?]]) — klasy .lejek/.w/.p z wspolne.css
V17.lejek=function(el,rows){el.innerHTML=rows.map(([n,c,v,w,col])=>`<div class="w"><span>${n}</span><div class="p"><i style="width:${Math.max(13,w)}%${col?`;background:${col}`:''}"></i><b class="num">${c}</b></div><b class="num">${v}</b></div>`).join('');};
V17.spark=function(pts,c){const mx=Math.max(...pts),mn=Math.min(...pts),d=pts.map((v,i)=>`${i?'L':'M'}${(i/(pts.length-1)*84).toFixed(1)} ${(28-(v-mn)/(mx-mn||1)*24).toFixed(1)}`).join(' ');return `<svg data-szkic="mini-wykres trendu — do sprawdzenia, czy backend liczy serię" viewBox="0 0 84 30" fill="none" preserveAspectRatio="none"><path d="${d} V30 H0Z" fill="${c}" opacity=".12"/><path d="${d}" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`};
