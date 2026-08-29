// Сборка лендинга «КриптоНавигатор» из locales/*.json.
// Запуск: node landing2/tools/build.mjs
// Выход: landing2/index.html, landing2/{en,es,pt}/index.html
// Рантайм страниц — чистый HTML/CSS/JS без внешних вызовов.
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(import.meta.dirname, '..');
const LOCALES = ['ru', 'en', 'es', 'pt'];
const DOMAIN = 'https://cryptonavigator.app';
const GITHUB = 'https://github.com/AlexZander85/crypto';

const load = (l) => JSON.parse(fs.readFileSync(path.join(DIR, 'locales', `${l}.json`), 'utf8'));
const L = Object.fromEntries(LOCALES.map((l) => [l, load(l)]));

// --- валидация полноты локалей (сборка падает при расхождении) ---
const flatKeys = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flatKeys(v, p + k + '.') : [p + k]);
const ref = flatKeys(L.ru).sort();
for (const l of LOCALES) {
  const keys = flatKeys(L[l]).sort();
  const miss = ref.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !ref.includes(k));
  if (miss.length || extra.length) {
    console.error(`[${l}] missing: ${miss.join(',')} | extra: ${extra.join(',')}`);
    process.exit(1);
  }
}
console.log('locales OK:', ref.length, 'keys ×', LOCALES.length);

// --- helpers ---
const esc = (s) => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const get = (o, dot) => dot.split('.').reduce((a, c) => a?.[c], o);
const rawFields = new Set(['changelog.c1_text', 'changelog.c2_text', 'changelog.c3_text']);
// t(L[lang])('hero.h1') — экранирует всё, кроме whitelist rawHTML
const tr = (loc) => (dot) => rawFields.has(dot) ? get(loc, dot) : esc(get(loc, dot));

const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230B1220'/%3E%3Crect x='13' y='9' width='6' height='14' rx='1.5' fill='%2322C55E'/%3E%3Crect x='15' y='4' width='2' height='6' rx='1' fill='%2322C55E'/%3E%3Crect x='15' y='22' width='2' height='6' rx='1' fill='%2322C55E'/%3E%3C/svg%3E";

// =====================================================================
// CSS
// =====================================================================
const CSS = `
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
 --paper:#F5F1E6;--paper2:#EDE7D6;--paper3:#E5DECB;
 --ink:#1F2933;--ink2:#4A5560;--mut:#57616C;
 --red:#A93226;--green:#1B6B44;--amber:#8C5E14;--blue:#1D4F8A;
 --line:#D8D0BC;--line2:#C4BBA2;
 --r-s:10px;--r-m:14px;
 --font:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
 --serif:Georgia,'Times New Roman',serif;
 --mono:ui-monospace,'Cascadia Code',Consolas,'Courier New',monospace;
}
html{scroll-behavior:smooth}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{background:var(--paper);color:var(--ink);font-family:var(--font);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;
 background-image:linear-gradient(rgba(43,108,176,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(43,108,176,.05) 1px,transparent 1px);
 background-size:44px 44px}
img{display:block;max-width:100%;height:auto}
a{color:inherit;text-decoration:none}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
section{padding:96px 0}
.mono{font-family:var(--mono)}
.eyebrow{display:block;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--red);margin-bottom:16px}
h1{font-family:var(--serif);font-size:clamp(32px,4.6vw,52px);font-weight:700;line-height:1.12;letter-spacing:-.01em}
h2{font-family:var(--serif);font-size:clamp(28px,4vw,40px);font-weight:700;line-height:1.15;letter-spacing:-.005em;margin-bottom:16px}
h3{font-family:var(--serif);font-size:20px;font-weight:700;line-height:1.3}
.lead{font-size:18px;color:var(--ink2);max-width:640px}
.small{font-size:13px;color:var(--mut)}
:focus-visible{outline:2px solid var(--red);outline-offset:2px;border-radius:4px}
.letter a,.f-grid a:hover,a[href^="#"]:hover{text-decoration:underline;text-underline-offset:3px}

/* header */
header{position:sticky;top:0;z-index:40;background:rgba(245,241,230,.92);backdrop-filter:blur(8px);border-bottom:2px solid var(--ink)}
.nav{display:flex;align-items:center;gap:24px;height:60px}
.logo{font-family:var(--serif);font-weight:700;letter-spacing:-.01em;font-size:18px;white-space:nowrap}
.nav-links{display:flex;gap:20px;margin-left:auto}
.nav-links a{color:var(--ink2);font-size:14px;transition:color .15s}
.nav-links a:hover{color:var(--ink);text-decoration:underline;text-underline-offset:3px}
.langs{display:flex;gap:10px;font-family:var(--mono);font-size:12px}
.langs a{color:var(--mut);padding:2px 4px;border-radius:4px}
.langs a[aria-current]{color:var(--red);font-weight:700;text-decoration:underline;text-underline-offset:3px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;cursor:pointer;font-family:var(--font);font-weight:700;font-size:15px;border-radius:var(--r-s);padding:12px 24px;transition:transform .15s ease-out,box-shadow .15s ease-out;background:var(--ink);color:var(--paper);box-shadow:3px 3px 0 var(--line2)}
.btn:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 var(--line2)}
.btn:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--line2)}
.btn-ghost{background:transparent;color:var(--ink);border:1.5px solid var(--ink)}
.btn-ghost:hover{box-shadow:3px 3px 0 var(--line2)}
.btn-sm{padding:8px 16px;font-size:14px}

/* hero */
.hero{padding:72px 0 96px;position:relative;overflow:hidden}
.hero-depth{position:absolute;inset:0;pointer-events:none}
.hero-depth svg{width:100%;height:100%}
.hero .wrap{position:relative;z-index:1}
.hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center}
.hero .sub{margin:24px 0 32px;font-size:18px;color:var(--ink2);max-width:520px}
.accent-line{color:var(--ink);background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 12' preserveAspectRatio='none'%3E%3Cpath d='M4 8 C 60 2, 140 11, 296 5' fill='none' stroke='%23C0392B' stroke-width='4' stroke-linecap='round' opacity='.85'/%3E%3C/svg%3E") no-repeat bottom/100% .16em;padding-bottom:.14em}
.cta-row{display:flex;flex-wrap:wrap;gap:16px;align-items:center}
.cta-note{margin-top:12px}
.trust{margin-top:16px;font-family:var(--mono);font-size:13px;color:var(--ink2)}
.shot{background:#fff;border:1.5px solid var(--ink);border-radius:var(--r-m);overflow:hidden;box-shadow:5px 5px 0 rgba(31,41,51,.12)}
.shot img{width:100%}
.numbers{display:flex;flex-wrap:wrap;gap:12px 40px;margin-top:56px;padding-top:24px;border-top:2px solid var(--ink)}
.numbers b{display:block;font-family:var(--mono);font-size:31px;font-weight:700;color:var(--ink);line-height:1.2}
.numbers span{font-size:13px;color:var(--ink2)}

/* карточки: бумажные карточки */
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
.card{background:#FDFBF4;border:1.5px solid var(--ink);border-radius:var(--r-m);padding:24px;box-shadow:4px 4px 0 rgba(31,41,51,.08)}
.card p{color:var(--ink2);font-size:15px;margin-top:8px}
.split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.split .lead{margin-bottom:24px}

/* problem */
.problem-closing{margin-top:32px;padding-left:16px;border-left:4px solid var(--red);color:var(--ink);font-size:18px;max-width:640px;font-family:var(--serif);font-style:italic}

/* До→После: красный карандаш → зелёная ручка */
.tf-row{display:grid;grid-template-columns:1fr 32px 1fr;gap:12px;align-items:center;padding:16px 0;border-bottom:1px dashed var(--line2)}
.tf-row:last-of-type{border-bottom:none}
.tf-before{color:var(--ink2);padding-left:16px;border-left:3px solid var(--red)}
.tf-after{padding-left:16px;border-left:3px solid var(--green);font-weight:600}
.tf-arrow{color:var(--red);text-align:center;font-weight:700}
.tf-labels{display:grid;grid-template-columns:1fr 32px 1fr;gap:12px;font-family:var(--mono);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2);margin-bottom:8px}

/* программа */
.ph-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.ph-num{font-family:var(--mono);font-size:13px;font-weight:700;color:var(--red);margin-bottom:8px;display:block}
.ph-tag{font-family:var(--mono);font-size:12px;color:var(--ink2);display:block;margin-bottom:8px}
.ph-free{color:var(--green)}
.ph-grid .card p{font-size:14px}
.attest{margin-top:24px;font-size:14px;color:var(--ink2);display:flex;gap:8px;align-items:baseline}
.ladder{margin-top:40px;padding-top:24px;border-top:2px solid var(--ink)}
.ladder-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.chip{font-family:var(--mono);font-size:13px;color:var(--ink2);border:1.5px solid var(--ink);border-radius:999px;padding:6px 14px;background:#FDFBF4}
.chip:last-child{color:var(--paper);background:var(--ink);border-color:var(--ink);font-weight:700}

/* тренажёры */
.tr-list{list-style:none;margin-top:8px}
.tr-list li{padding:12px 0;border-bottom:1px dashed var(--line2);font-size:15px;color:var(--ink2)}
.tr-list li:last-child{border-bottom:none}
.tr-list b{color:var(--ink);font-weight:700}

/* демо-стакан: тёмный экспонат на бумаге */
.ob-wrap{background:#141B26;border:1.5px solid var(--ink);border-radius:var(--r-m);padding:20px;box-shadow:5px 5px 0 rgba(31,41,51,.15)}
.ob-label{display:flex;justify-content:space-between;align-items:center;font-family:var(--mono);font-size:12px;color:#9AA7B8;margin-bottom:12px;gap:8px;flex-wrap:wrap}
.ob-live{display:inline-block;width:7px;height:7px;border-radius:50%;background:#22C55E;margin-right:6px}
.ob-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px;font-family:var(--mono);font-size:13px}
.ob-h{color:#8A97A8;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
.ob-row{display:flex;justify-content:space-between;padding:2px 6px;border-radius:4px;margin-bottom:2px;position:relative}
.ob-row i{position:absolute;inset:0;border-radius:4px;opacity:.12;font-style:normal}
.ob-bid i{background:#22C55E}.ob-ask i{background:#F43F5E}
.ob-row span{position:relative}
.ob-bid span:nth-child(2){color:#4ADE80}.ob-ask span:nth-child(2){color:#FB7185}
.ob-row span:last-child{color:#9AA7B8}
.detector{margin-top:16px;border-left:3px solid #F59E0B;background:rgba(245,158,11,.08);padding:10px 14px;font-size:14px;color:#E7EDF5;border-radius:0 8px 8px 0;min-height:44px;transition:border-color .3s}
.detector.calm{border-left-color:#4A5568;color:#9AA7B8;background:rgba(154,167,184,.06)}

/* Криптик: заметки на полях */
.kq{background:#FDFBF4;border:1.5px solid var(--ink);border-left:5px solid var(--red);border-radius:var(--r-s);padding:24px;font-family:var(--serif);font-style:italic;font-size:17px;line-height:2;color:var(--ink)}
.kq b{color:var(--red)}

/* breath-абзацы: рукописный ритм */
.breath{font-family:var(--serif);font-style:italic;font-size:clamp(17px,2.4vw,22px);line-height:1.9;color:var(--ink);max-width:880px}
.breath b{color:var(--red);font-weight:700}

/* цена: тарифный лист с печатями */
.price-grid{display:grid;grid-template-columns:repeat(2,minmax(0,420px));gap:24px;justify-content:start;margin-top:48px}
.price-card{background:#FDFBF4;border:1.5px solid var(--ink);border-radius:var(--r-m);padding:32px;position:relative}
.price-card.hl{border-width:2.5px;box-shadow:6px 6px 0 rgba(192,57,43,.18)}
.badge{position:absolute;top:-14px;left:32px;background:var(--red);color:#FDFBF4;font-size:12px;font-weight:700;padding:4px 12px;border-radius:4px;transform:rotate(-2deg);box-shadow:2px 2px 0 rgba(31,41,51,.2)}
.price-name{font-size:15px;color:var(--ink2);font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em}
.price-val{font-family:var(--mono);font-size:39px;font-weight:700;margin:8px 0 2px}
.price-period{font-size:13px;color:var(--ink2);margin-bottom:24px;display:block}
.plist{list-style:none;margin-bottom:28px}
.plist li{padding:8px 0 8px 28px;position:relative;color:var(--ink2);font-size:15px}
.plist li::before{content:'';position:absolute;left:2px;top:11px;width:15px;height:8px;border-left:2.5px solid var(--green);border-bottom:2.5px solid var(--green);transform:rotate(-45deg)}
.stamp{position:absolute;top:18px;right:18px;font-family:var(--mono);font-size:12px;font-weight:700;letter-spacing:.08em;color:var(--red);border:2.5px double var(--red);border-radius:6px;padding:6px 10px;transform:rotate(6deg);text-transform:uppercase;background:rgba(169,50,38,.05)}
.stamp.blue{color:var(--blue);border-color:var(--blue);background:rgba(29,79,138,.05);transform:rotate(-4deg)}
.price-note{margin-top:24px;font-size:14px;color:var(--ink2)}

/* письмо */
.letter{background:#FDFBF4;border:1.5px solid var(--ink);border-radius:var(--r-m);padding:32px;max-width:720px;box-shadow:4px 4px 0 rgba(31,41,51,.08);position:relative}
.letter::before{content:'';position:absolute;top:-10px;left:40px;right:40px;height:22px;background:repeating-linear-gradient(90deg,transparent 0 10px,var(--line2) 10px 14px);opacity:.5;border-radius:4px}
.letter p{margin-bottom:16px;color:var(--ink)}
.letter .sign{color:var(--ink2);margin-top:24px;margin-bottom:0;font-family:var(--serif);font-style:italic}

/* changelog: журнал */
.cl-row{display:grid;grid-template-columns:140px 1fr;gap:24px;padding:20px 0;border-bottom:1px dashed var(--line2);max-width:720px}
.cl-date{font-family:var(--mono);font-size:13px;color:var(--red);font-weight:700}

/* faq */
details{border:1.5px solid var(--ink);border-radius:var(--r-s);background:#FDFBF4;margin-bottom:8px}
summary{cursor:pointer;list-style:none;padding:18px 20px;font-weight:700;font-size:16px;display:flex;justify-content:space-between;gap:16px;font-family:var(--serif)}
summary::-webkit-details-marker{display:none}
summary::after{content:'+';font-family:var(--mono);color:var(--red);transition:transform .15s;font-weight:700}
details[open] summary::after{transform:rotate(45deg)}
details .a{padding:0 20px 18px;color:var(--ink2);font-size:15px;max-width:70ch}

/* мобильная версия */
.mobile-shot{width:min(300px,80%);margin:0 auto}

/* footer */
footer{border-top:2px solid var(--ink);padding:48px 0 40px;background:var(--paper2)}
.f-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:24px}
.f-grid h3{font-size:13px;font-family:var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--red);margin-bottom:12px;font-weight:700}
.f-grid a{display:block;color:var(--ink2);font-size:14px;padding:3px 0}
.f-grid a:hover{color:var(--ink)}
.f-status{font-family:var(--mono);font-size:12px;color:var(--ink2);display:flex;gap:8px;align-items:center;margin-top:24px}
.f-status .ok-dot{width:7px;height:7px;border-radius:50%;background:var(--green)}
.disclaimer{margin-top:40px;padding-top:24px;border-top:1.5px solid var(--line2);font-size:13px;color:var(--ink2);max-width:820px}

/* модалка: бумажная карточка */
dialog{border:1.5px solid var(--ink);border-radius:var(--r-m);background:var(--paper);color:var(--ink);padding:0;width:min(420px,calc(100vw - 32px));box-shadow:8px 8px 0 rgba(31,41,51,.2)}
dialog::backdrop{background:rgba(31,41,51,.45)}
.m-head{padding:24px 24px 0}
.m-body{padding:20px 24px 24px;display:flex;flex-direction:column;gap:14px}
label{font-size:13px;color:var(--ink2);display:block;margin-bottom:6px}
input[type=email],input[type=password]{width:100%;background:#FDFBF4;border:1.5px solid var(--line2);border-radius:var(--r-s);color:var(--ink);font-size:15px;padding:12px 14px;font-family:var(--font)}
input:focus{border-color:var(--ink);outline:none}
.err{color:var(--red);font-size:13px;min-height:18px;display:block;font-weight:600}
.consent{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:var(--ink)}
.consent input{margin-top:3px;accent-color:var(--red)}
.consent details{margin:0;background:none;border:none;margin-top:6px}
.consent summary{padding:0;font-size:13px;font-weight:400;color:var(--ink2);display:inline;font-family:var(--font)}
.consent summary::after{content:''}
.consent .a{padding:8px 0 0;font-size:13px}
.m-msg{font-size:14px;border-radius:8px;padding:10px 12px;display:none}
.m-msg.ok{display:block;background:rgba(31,122,77,.1);color:var(--green)}
.m-msg.warn{display:block;background:rgba(183,121,31,.12);color:var(--amber)}
.m-close{background:none;border:none;color:var(--ink2);font-size:14px;cursor:pointer;padding:8px 0;text-decoration:underline;text-underline-offset:3px}
/* тикерная лента: бумажная телеграфная лента */
.tape{overflow:hidden;border-top:1.5px dashed var(--line2);border-bottom:1.5px dashed var(--line2);background:var(--paper2);user-select:none;
 background-image:radial-gradient(circle at 8px 0,transparent 4px,var(--paper2) 4px);padding:2px 0}
.tape-track{display:inline-flex;gap:36px;white-space:nowrap;padding:7px 0;width:max-content;animation:tape 48s linear infinite;font-family:var(--mono);font-size:12px;color:var(--ink)}
@keyframes tape{to{transform:translateX(-50%)}}
.tape b{font-weight:700;color:var(--ink)}
.tape .up{color:var(--green);font-weight:700}
.tape .dn{color:var(--red);font-weight:700}
.tape .syn{color:var(--mut);letter-spacing:.08em}
@media(prefers-reduced-motion:reduce){.tape-track{animation:none}}

/* свечные разделители: чернильный набросок */
.candles{display:flex;justify-content:center;overflow:hidden;padding:8px 0;opacity:.7;user-select:none}
.candles svg{min-width:1152px}

/* подпись скриншота: подпись экспоната */
.shot-cap{font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--ink2);padding:8px 14px;border-bottom:1.5px solid var(--ink);display:flex;justify-content:space-between;text-transform:uppercase;background:var(--paper)}
.shot-cap::after{content:'●';color:var(--red)}

/* responsive */
@media(max-width:960px){
 .hero-grid,.split{grid-template-columns:1fr;gap:32px}
 .grid3,.ph-grid{grid-template-columns:1fr 1fr}
 .nav-links a:not(.keep){display:none}
 .price-grid{grid-template-columns:1fr}
 .f-grid{grid-template-columns:1fr 1fr}
}
@media(max-width:600px){
 .nav{gap:12px}
 .logo{font-size:15px}
 .langs{gap:6px;font-size:11px}
 .nav .btn{display:none}
 section{padding:64px 0}
 .hero{padding:48px 0 64px}
 .grid3,.ph-grid,.grid2{grid-template-columns:1fr}
 .tf-row{grid-template-columns:1fr;gap:8px}
 .tf-arrow{display:none}
 .tf-labels{display:none}
 .cl-row{grid-template-columns:1fr;gap:4px}
 .numbers{gap:16px 24px}
 .numbers b{font-size:25px}
 .cta-row .btn{width:100%}
}
@media(prefers-reduced-motion:reduce){
 *{animation:none!important;transition:none!important}
 .ob-live{animation:none}
}
`;

// =====================================================================
// Клиентский JS (общий для всех языков; строки берутся из data-* атрибутов)
// =====================================================================
function clientJS(pageLang, siteRoot, appUrl, isRootPage) {
  return `(function(){
"use strict";
var LANG=${JSON.stringify(pageLang)}, ROOT=${JSON.stringify(siteRoot)}, APP=${JSON.stringify(appUrl)}, IS_ROOT=${isRootPage};
function $(s,c){return (c||document).querySelector(s)}
function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))}
function track(n,o){try{if(window.plausible)window.plausible(n,{props:o||{}})}catch(e){}}

/* язык браузера один раз при первом визите (только корневая страница) */
try{
 var saved=localStorage.getItem('cn_lang');
 if(IS_ROOT&&saved&&saved!=='ru'&&saved!==''){location.replace(ROOT+saved+'/');return}
 if(IS_ROOT&&!saved&&!sessionStorage.getItem('cn_redir')){
   var nav=(navigator.language||'').slice(0,2).toLowerCase();
   if(nav!=='ru'&&['en','es','pt'].indexOf(nav)>-1){sessionStorage.setItem('cn_redir','1');location.replace(ROOT+nav+'/');return}
 }
}catch(e){}
$$('.langs a').forEach(function(a){a.addEventListener('click',function(){try{localStorage.setItem('cn_lang',a.getAttribute('data-lang'))}catch(e){}})});

track('view_hero');

/* глубина скролла */
var s50=false,s90=false;
window.addEventListener('scroll',function(){
 var h=document.documentElement,p=h.scrollTop/(h.scrollHeight-h.clientHeight);
 if(!s50&&p>=.5){s50=true;track('scroll_50')}
 if(!s90&&p>=.9){s90=true;track('scroll_90')}
},{passive:true});

/* price_view */
var price=$('#price');
if(price&&'IntersectionObserver' in window){
 new IntersectionObserver(function(en,obs){if(en[0].isIntersecting){track('price_view');obs.disconnect()}},{threshold:.3}).observe(price);
}

/* FAQ */
$$('details .faq-item').forEach(function(d){
 d.addEventListener('toggle',function(){if(d.open)track('faq_open')});
});

/* модалка регистрации */
var dlg=$('#signup'),firstField=null,lastFocus=null;
function openModal(){lastFocus=document.activeElement;dlg.showModal();$('#f-email').focus();track('signup_open')}
function closeModal(){dlg.close();if(lastFocus)lastFocus.focus()}
$$('.js-signup').forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();openModal()})});
$('#m-x').addEventListener('click',closeModal);
dlg.addEventListener('click',function(e){if(e.target===dlg)closeModal()});
dlg.addEventListener('keydown',function(e){
 if(e.key!=='Tab')return;
 var f=$$('button,input,a[href]',dlg).filter(function(el){return !el.disabled&&el.offsetParent!==null});
 if(!f.length)return;
 var first=f[0],last=f[f.length-1];
 if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault()}
 else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault()}
});

/* демо-стакан: синтетические данные */
var ob=$('#ob');
if(ob){
 var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var bids=$('#ob-bids'),asks=$('#ob-asks'),det=$('#ob-detector');
 var DET_ON=ob.getAttribute('data-detector')||'',DET_OFF=ob.getAttribute('data-detector-off')||'';
 var fmt=new Intl.NumberFormat(${JSON.stringify(pageLang==='ru'?'ru-RU':pageLang==='pt'?'pt-BR':'en-US')},{minimumFractionDigits:2,maximumFractionDigits:2});
 var mid=64231.4,timer=null,running=false;
 function levels(side){
  var out='',step=.5;
  for(var i=0;i<7;i++){
   var px=mid+(side==='bid'?-(i+1):i+1)*step*8;
   var sz=(Math.random()*1.8+.15);
   var w=Math.min(100,Math.round(sz/2*100));
   out+='<div class="ob-row ob-'+side+'"><i style="width:'+w+'%"></i><span>'+fmt.format(px)+'</span><span>'+sz.toFixed(3)+'</span></div>';
  }
  return out;
 }
 function tick(){
  mid+=(Math.random()-.5)*14;
  $('#ob-spread').textContent=fmt.format(mid)+' ±';
  bids.innerHTML=levels('bid');asks.innerHTML=levels('ask');
  var nervous=Math.random()<.22;
  det.textContent=nervous?DET_ON:DET_OFF;
  det.classList.toggle('calm',!nervous);
 }
 function start(){if(running)return;running=true;tick();timer=setInterval(tick,900)}
 function stop(){running=false;if(timer){clearInterval(timer);timer=null}}
 if(reduce){tick();det.classList.add('calm')}
 else if('IntersectionObserver' in window){
  new IntersectionObserver(function(en){en[0].isIntersecting?start():stop()},{threshold:.2}).observe(ob);
 } else start();
 document.addEventListener('visibilitychange',function(){document.hidden?stop():(!reduce&&start())});
}

/* форма регистрации */
var form=$('#f-form'),msg=$('#f-msg');
function setErr(id,text){$(id).textContent=text||''}
form.addEventListener('submit',function(e){
 e.preventDefault();
 var email=$('#f-email').value.trim(),pass=$('#f-pass').value,consent=$('#f-consent').checked,ok=true;
 setErr('#e-email');setErr('#e-pass');setErr('#e-consent');
 if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)){setErr('#e-email',$('#m-t').getAttribute('data-err-email'));ok=false}
 if(pass.length<8){setErr('#e-pass',$('#m-t').getAttribute('data-err-pass'));ok=false}
 if(!consent){setErr('#e-consent',$('#m-t').getAttribute('data-err-consent'));ok=false}
 if(!ok)return;
 var btn=$('#f-submit');btn.disabled=true;
 fetch('/api/auth/register',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email:email,password:pass}),
  signal:AbortSignal.timeout?AbortSignal.timeout(5000):undefined
 }).then(function(r){
  if(r.ok){track('signup_success');location.href=APP;return}
  if(r.status===409){setErr('#e-email',$('#m-t').getAttribute('data-err-exists'));btn.disabled=false;return}
  throw new Error('unavailable');
 }).catch(function(){
  /* API нет — честный лист ожидания, никакой имитации успеха */
  var n=1;try{n=parseInt(localStorage.getItem('cn_waitlist_n')||'0',10)+1;localStorage.setItem('cn_waitlist_n',String(n))}catch(err){}
  msg.className='m-msg warn';msg.textContent=$('#m-t').getAttribute('data-waitlist')+' №'+n;
  btn.disabled=false;btn.style.display='none';
 });
});
})();
`;
}

// --- терминальный декор ---

// детерминированный псевдорандом (без ГСЧ-дрожания между сборками)
function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ряд свечей: 48 свечей, детерминированный ряд
function candlesSVG(seed) {
  const rnd = mulberry(seed);
  let price = 32;
  const W = 48 * 24, H = 64;
  let out = '';
  for (let i = 0; i < 48; i++) {
    const open = price;
    const drift = (rnd() - 0.48) * 16;
    price = Math.max(8, Math.min(56, open + drift));
    const close = price;
    const hi = Math.min(60, Math.max(open, close) + rnd() * 7);
    const lo = Math.max(4, Math.min(open, close) - rnd() * 7);
    const x = i * 24 + 6;
    const up = close >= open;
    const col = up ? '#1F7A4D' : '#C0392B';
    const top = Math.min(open, close), bh = Math.max(3, Math.abs(close - open));
    out += `<rect x="${x + 6}" y="${(H - hi).toFixed(1)}" width="2" height="${(hi - lo).toFixed(1)}" fill="${col}" opacity=".45"/>` +
      `<rect x="${x}" y="${(H - top - bh).toFixed(1)}" width="13" height="${bh.toFixed(1)}" fill="${col}" opacity=".8"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${out}</svg>`;
}

// ступенчатая depth-кривая (фон героя)
function depthSVG() {
  const rnd = mulberry(777);
  const steps = 26, W = 1200, H = 520;
  let x = 0, y = 300;
  let d = `M0 ${H} L0 ${y.toFixed(0)}`;
  for (let i = 0; i < steps; i++) {
    const w = 20 + rnd() * 40;
    y = Math.max(60, Math.min(430, y + (rnd() - 0.52) * 70));
    x += w;
    d += ` L${x.toFixed(0)} ${y.toFixed(0)} L${x.toFixed(0)} ${y.toFixed(0)}`;
  }
  d += ` L${W} ${y.toFixed(0)} L${W} ${H} Z`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="${d}" fill="none" stroke="#1F2933" stroke-width="1.5" opacity=".12"/><path d="${d}" fill="url(#dg)" opacity=".5"/><defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F2933" stop-opacity=".05"/><stop offset="1" stop-color="#F5F1E6" stop-opacity="0"/></linearGradient></defs></svg>`;
}

// синтетический тикер: помечен как demo, цены — декоративный ряд
function tapeHTML() {
  const pairs = [
    ['BTC/USDT', '64 231', 1.2], ['ETH/USDT', '3 148', 0.8], ['SOL/USDT', '146.2', -2.1],
    ['BNB/USDT', '587.4', 0.3], ['XRP/USDT', '0.524', -0.6], ['DOGE/USDT', '0.158', 3.4],
    ['ADA/USDT', '0.462', -1.1], ['AVAX/USDT', '36.90', 0.9], ['LINK/USDT', '14.85', 2.2],
    ['TON/USDT', '5.410', -0.4]
  ];
  const item = () =>
    `<span class="syn">SYNTHETIC FEED</span>` +
    pairs.map(([s, p, ch]) => `<span><b>${s}</b> ${p} <span class="${ch >= 0 ? 'up' : 'dn'}">${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%</span></span>`).join('');
  return `<div class="tape" aria-hidden="true"><div class="tape-track">${item()}${item()}</div></div>`;
}

// =====================================================================
// Страница
// =====================================================================
function pageHTML(lang) {
  const loc = L[lang];
  const t = tr(loc);
  const depth = lang === 'ru' ? 0 : 1;
  const A = depth === 0 ? 'assets/' : '../assets/';
  const ROOT = depth === 0 ? './' : '../';
  const APP = depth === 0 ? 'index.html?welcome=phase0' : '../index.html?welcome=phase0';
  const url = lang === 'ru' ? `${DOMAIN}/` : `${DOMAIN}/${lang}/`;
  const ogImg = `${DOMAIN}/assets/01-home.png`;
  const altLangs = [['ru', DOMAIN + '/'], ['en', `${DOMAIN}/en/`], ['es', `${DOMAIN}/es/`], ['pt', `${DOMAIN}/pt/`]];

  const langLinks = LOCALES.map((l) =>
    `<a href="${l === 'ru' ? ROOT : ROOT + l + '/'}" data-lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${l.toUpperCase()}</a>`).join('');

  let figN = 0;
  const shot = (file, w, h, cls, eager) => {
    figN++;
    return `<div class="shot"><div class="shot-cap" aria-hidden="true">${t('ui.fig')} ${figN} · ${file}.png<span>${w}×${h}</span></div>` +
      `<img src="${A}${file}.png" alt="${t('meta.og_title')}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"${cls ? ` class="${cls}"` : ''}></div>`;
  };

  // До→После
  const tfRows = [1, 2, 3, 4, 5].map((i) =>
    `<div class="tf-row"><p class="tf-before">${t(`transform.p${i}_before`)}</p><div class="tf-arrow">→</div><p class="tf-after">${t(`transform.p${i}_after`)}</p></div>`).join('');

  // Программа
  const phases = [0, 1, 2, 3, 4, 5].map((i) => `
    <div class="card">
      <span class="ph-num">0${i}</span>
      <span class="ph-tag">${t(`program.ph${i}_tag`)}</span>
      <h3>${t(`program.ph${i}_title`)}</h3>
      <p>${t(`program.ph${i}_desc`)}</p>
    </div>`).join('');

  const ladderChips = loc.program.ladder_ranks.map((r) => `<span class="chip">${esc(r)}</span>`).join('');

  // Тренажёры психологии
  const trainers = [1, 2, 3, 4].map((i) =>
    `<li><b>${t(`psychology.tr${i}_name`)}</b> — ${t(`psychology.tr${i}_text`)}</li>`).join('');

  // Квесты
  const quests = [1, 2, 3].map((i) => `
    <div class="card">
      <h3>${t(`quests.q${i}_title`)}</h3>
      <p>${t(`quests.q${i}_text`)}</p>
      <p style="margin-top:12px;color:var(--ink);font-weight:600">${t(`quests.q${i}_trains`)}</p>
    </div>`).join('');

  // 14 фич + 10 адаптаций
  const feats = Array.from({ length: 14 }, (_, i) => i + 1).map((i) => `
    <div class="card"><h3 style="font-size:16px">${t(`features.f${i}_title`)}</h3><p style="font-size:14px">${t(`features.f${i}_text`)}</p></div>`).join('');
  const adapt = Array.from({ length: 10 }, (_, i) => i + 1).map((i) => `
    <div class="card"><h3 style="font-size:16px">${t(`adaptation.a${i}_title`)}</h3><p style="font-size:14px">${t(`adaptation.a${i}_text`)}</p></div>`).join('');

  // FAQ
  const faqItems = [1, 2, 3, 4, 5, 6].map((i) => `
    <details class="faq-item"><summary>${t(`faq.q${i}`)}</summary><div class="a">${t(`faq.a${i}`)}</div></details>`).join('');

  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: [1, 2, 3, 4, 5, 6].map((i) => ({
          '@type': 'Question',
          name: String(get(loc, `faq.q${i}`)),
          acceptedAnswer: { '@type': 'Answer', text: String(get(loc, `faq.a${i}`)).replace(/<[^>]+>/g, '') }
        }))
      },
      {
        '@type': 'SoftwareApplication',
        name: 'CryptoNavigator',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Any (web browser)',
        inLanguage: lang,
        description: String(get(loc, 'meta.description')),
        offers: { '@type': 'AggregateOffer', lowPrice: '0', highPrice: '990', priceCurrency: 'RUB', offerCount: '2' }
      }
    ]
  }, null, 0);

  return `<!DOCTYPE html>
<html lang="${lang === 'en' ? 'en' : lang === 'es' ? 'es' : lang === 'pt' ? 'pt-BR' : 'ru'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t('meta.title')}</title>
<meta name="description" content="${t('meta.description')}">
<link rel="canonical" href="${url}">
${altLangs.map(([l, u]) => `<link rel="alternate" hreflang="${l === 'pt' ? 'pt-BR' : l}" href="${u}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${DOMAIN}/">
<link rel="icon" href="${FAVICON}">
<meta property="og:type" content="website">
<meta property="og:title" content="${t('meta.og_title')}">
<meta property="og:description" content="${t('meta.og_description')}">
<meta property="og:image" content="${ogImg}">
<meta property="og:url" content="${url}">
<style>${CSS}</style>
<script type="application/ld+json">${jsonld}</script>
</head>
<body>

<header>
  <div class="wrap nav">
    <a class="logo" href="${depth === 0 ? './' : '../'}">◆ ${t('nav.logo')}</a>
    <nav class="nav-links" aria-label="${t('nav.logo')}">
      <a href="#program">${t('nav.program')}</a>
      <a href="#psychology">${t('nav.psychology')}</a>
      <a href="#price">${t('nav.price')}</a>
      <a href="#faq">${t('nav.faq')}</a>
    </nav>
    <div class="langs" aria-label="${t('footer.lang_col')}">${langLinks}</div>
    <button class="btn btn-sm js-signup keep">${t('nav.cta')}</button>
  </div>
</header>
${tapeHTML()}

<main>
<!-- HERO -->
<section class="hero" id="top">
  <div class="hero-depth">${depthSVG()}</div>
  <div class="wrap">
    <div class="hero-grid">
      <div>
        <span class="eyebrow">${t('hero.eyebrow')}</span>
        <h1>${t('hero.h1_line1')}<br><span class="accent-line">${t('hero.h1_accent')}</span></h1>
        <p class="sub">${t('hero.sub')}</p>
        <div class="cta-row">
          <button class="btn js-signup">${t('hero.cta_primary')}</button>
          <a class="btn btn-ghost" href="#demo">${t('hero.cta_secondary')}</a>
        </div>
        <p class="small cta-note">${t('hero.cta_primary_note')}</p>
        <p class="trust">${t('hero.trust_row')}</p>
      </div>
      <div>${shot('01-home', 1280, 800, '', true)}</div>
    </div>
    <div class="numbers">
      <div><b>134</b><span>${t('numbers.n_lessons_label')}</span></div>
      <div><b>145</b><span>${t('numbers.n_widgets_label')}</span></div>
      <div><b>21</b><span>${t('numbers.n_games_label')}</span></div>
      <div><b>205</b><span>${t('numbers.n_terms_label')}</span></div>
    </div>
    <p class="small" style="margin-top:12px">${t('numbers.footnote')}</p>
  </div>
</section>

<!-- ПРОБЛЕМА -->
<section id="problem">
  <div class="wrap">
    <span class="eyebrow">${t('problem.eyebrow')}</span>
    <h2>${t('problem.h2')}</h2>
    <p class="lead">${t('problem.lead')}</p>
    <div class="grid3" style="margin-top:40px">
      <div class="card"><h3>${t('problem.t1_title')}</h3><p>${t('problem.t1_text')}</p></div>
      <div class="card"><h3>${t('problem.t2_title')}</h3><p>${t('problem.t2_text')}</p></div>
      <div class="card"><h3>${t('problem.t3_title')}</h3><p>${t('problem.t3_text')}</p></div>
    </div>
    <p class="problem-closing">${t('problem.closing')}</p>
  </div>
</section>
<div class="candles" aria-hidden="true">${candlesSVG(42)}</div>

<!-- ДО → ПОСЛЕ -->
<section id="transform">
  <div class="wrap">
    <span class="eyebrow">${t('transform.eyebrow')}</span>
    <h2>${t('transform.h2')}</h2>
    <div class="tf-labels"><span>${t('transform.before_label')}</span><span></span><span>${t('transform.after_label')}</span></div>
    ${tfRows}
  </div>
</section>

<!-- ПРОГРАММА -->
<section id="program">
  <div class="wrap">
    <span class="eyebrow">${t('program.eyebrow')}</span>
    <h2>${t('program.h2')}</h2>
    <div class="ph-grid">${phases}</div>
    <p class="attest">✓ ${t('program.attest_note')}</p>
    <div class="ladder">
      <span class="eyebrow">${t('program.ladder_label')}</span>
      <div class="ladder-chips">${ladderChips}</div>
    </div>
  </div>
</section>

<!-- ПСИХОЛОГИЯ -->
<section id="psychology">
  <div class="wrap split">
    <div>
      <span class="eyebrow">${t('psychology.eyebrow')}</span>
      <h2>${t('psychology.h2')}</h2>
      <p class="lead">${t('psychology.body')}</p>
      <ul class="tr-list">${trainers}</ul>
    </div>
    <figure>
      ${shot('05-psychology', 1280, 800)}
      <figcaption class="small" style="margin-top:8px">${t('psychology.shot_caption')}</figcaption>
    </figure>
  </div>
</section>

<!-- ЖИВОЙ РЫНОК + ДЕМО-СТАКАН -->
<section id="demo">
  <div class="wrap split">
    <div>
      <span class="eyebrow">${t('livemarket.eyebrow')}</span>
      <h2>${t('livemarket.h2')}</h2>
      <p class="lead">${t('livemarket.body')}</p>
      <div style="margin-top:24px">${shot('04-simulator', 1280, 800)}</div>
    </div>
    <div class="ob-wrap" id="ob" data-detector="${t('livemarket.detector')}" data-detector-off="${t('livemarket.detector_calm')}">
      <div class="ob-label">
        <span><span class="ob-live"></span>${t('livemarket.demo_label')}</span>
        <span class="mono" id="ob-spread">—</span>
      </div>
      <div class="ob-cols">
        <div><div class="ob-h"><span>BID · ${t('livemarket.bid')}</span></div><div id="ob-bids"></div></div>
        <div><div class="ob-h"><span>ASK · ${t('livemarket.ask')}</span></div><div id="ob-asks"></div></div>
      </div>
      <div class="detector" id="ob-detector"></div>
    </div>
  </div>
</section>

<!-- НОВОСТИ -->
<section id="news">
  <div class="wrap">
    <span class="eyebrow">${t('news.eyebrow')}</span>
    <div class="split">
      <div>
        <h2>${t('news.h2')}</h2>
        <p class="lead">${t('news.body')}</p>
        <p class="trust" style="margin-top:16px">${t('news.exercises')}</p>
      </div>
      <div class="card" style="padding:28px">
        <ol style="list-style:none;counter-reset:ns;display:flex;flex-direction:column;gap:14px;margin:0;padding:0">
          ${[1, 2, 3, 4].map((i) => `<li style="counter-increment:ns;display:flex;gap:14px;align-items:baseline"><span style="font-family:var(--mono);font-weight:700;color:var(--red)">0${i}</span><span style="font-family:var(--serif);font-size:17px">${esc(loc.newsSteps[i - 1])}</span></li>`).join('\n          ')}
        </ol>
        <p class="small" style="margin-top:18px;border-top:1px dashed var(--line2);padding-top:12px">${t('news.exercises')}</p>
      </div>
    </div>
  </div>
</section>

<!-- AI МАКС -->
<section id="aimax">
  <div class="wrap">
    <span class="eyebrow">${t('aimax.eyebrow')}</span>
    <h2>${t('aimax.h2')}</h2>
    <p class="breath">${t('aimax.actions')}</p>
    <p class="small" style="margin-top:24px">${t('aimax.adaptive')}</p>
  </div>
</section>

<!-- КОНСТРУКТОРЫ -->
<section id="builders">
  <div class="wrap">
    <span class="eyebrow">${t('builders.eyebrow')}</span>
    <h2>${t('builders.h2')}</h2>
    <p class="breath">${t('builders.list')}</p>
  </div>
</section>

<!-- КРИПТИК -->
<section id="kryptik">
  <div class="wrap split">
    <div>
      <span class="eyebrow">${t('kryptik.eyebrow')}</span>
      <h2>${t('kryptik.h2')}</h2>
      <p class="lead">${t('kryptik.body')}</p>
    </div>
    <div>
      <div class="kq">
        <div>${t('kryptik.q1')}</div>
        <div>${t('kryptik.q2')}</div>
        <div>${t('kryptik.q3')}</div>
      </div>
      <p class="small" style="margin-top:16px">${t('kryptik.closing')}</p>
    </div>
  </div>
</section>

<!-- КВЕСТЫ -->
<section id="quests">
  <div class="wrap">
    <span class="eyebrow">${t('quests.eyebrow')}</span>
    <h2>${t('quests.h2')}</h2>
    <div class="grid3">${quests}</div>
    <p class="small" style="margin-top:24px">${t('quests.footer_note')}</p>
  </div>
</section>
<div class="candles" aria-hidden="true">${candlesSVG(1337)}</div>

<!-- СОСТАВ -->
<section id="features">
  <div class="wrap">
    <span class="eyebrow">${t('features.eyebrow')}</span>
    <h2>${t('features.h2')}</h2>
    <div class="grid3" style="margin-top:40px">${feats}</div>
    <p class="breath" style="margin-top:40px">${t('features.widgets_breath')}</p>
    <p class="small">${t('features.widgets_more')}</p>
    <div style="margin-top:40px">${shot('03-lesson', 1280, 800)}</div>
  </div>
</section>

<!-- АДАПТАЦИЯ -->
<section id="adaptation">
  <div class="wrap">
    <span class="eyebrow">${t('adaptation.eyebrow')}</span>
    <h2>${t('adaptation.h2')}</h2>
    <div class="grid3" style="margin-top:40px">${adapt}</div>
  </div>
</section>

<!-- МОБИЛЬНАЯ ВЕРСИЯ -->
<section id="mobile">
  <div class="wrap split">
    <div>
      <span class="eyebrow">${t('mobile.eyebrow')}</span>
      <h2>${t('mobile.h2')}</h2>
      <p class="lead">${t('mobile.body')}</p>
    </div>
    <div class="mobile-shot">${shot('08-mobile', 780, 1688)}</div>
  </div>
</section>

<!-- ЦЕНА -->
<section id="price">
  <div class="wrap">
    <span class="eyebrow">${t('pricing.eyebrow')}</span>
    <h2>${t('pricing.h2')}</h2>
    <div class="price-grid">
      <div class="price-card">
        <span class="stamp blue">${t('pricing.free_price')} · ${t('pricing.free_period')}</span>
        <div class="price-name">${t('pricing.free_name')}</div>
        <div class="price-val">${t('pricing.free_price')}</div>
        <span class="price-period">${t('pricing.free_period')}</span>
        <ul class="plist">
          <li>${t('pricing.free_f1')}</li>
          <li>${t('pricing.free_f2')}</li>
          <li>${t('pricing.free_f3')}</li>
          <li>${t('pricing.free_f4')}</li>
        </ul>
        <button class="btn js-signup" style="width:100%">${t('pricing.free_cta')}</button>
      </div>
      <div class="price-card hl">
        <span class="badge">${t('pricing.full_badge')}</span>
        <span class="stamp">${t('pricing.full_period')}</span>
        <div class="price-name">${t('pricing.full_name')}</div>
        <div class="price-val">${t('pricing.full_price')}</div>
        <span class="price-period">${t('pricing.full_period')}</span>
        <ul class="plist">
          <li>${t('pricing.full_f1')}</li>
          <li>${t('pricing.full_f2')}</li>
          <li>${t('pricing.full_f3')}</li>
          <li>${t('pricing.full_f4')}</li>
          <li>${t('pricing.full_f5')}</li>
        </ul>
        <button class="btn js-signup" style="width:100%">${t('nav.cta')}</button>
      </div>
    </div>
    <p class="price-note">${t('pricing.note')}</p>
  </div>
</section>

<!-- ПИСЬМО -->
<section id="letter">
  <div class="wrap">
    <h2>${t('letter.h2')}</h2>
    <div class="letter">
      <p>${t('letter.body_p1')}</p>
      <p>${t('letter.body_p2')}</p>
      <p>${t('letter.body_p3')} <a href="${GITHUB}" style="color:var(--blue)" rel="noopener">${t('letter.github_link')} ↗</a></p>
      <p class="sign">— ${t('letter.sign')}</p>
    </div>
  </div>
</section>

<!-- ЧТО НОВОГО -->
<section id="changelog">
  <div class="wrap">
    <h2>${t('changelog.title')}</h2>
    <div class="cl-row"><span class="cl-date">${t('changelog.c1_date')}</span><div>${t('changelog.c1_text')}</div></div>
    <div class="cl-row"><span class="cl-date">${t('changelog.c2_date')}</span><div>${t('changelog.c2_text')}</div></div>
    <div class="cl-row"><span class="cl-date">${t('changelog.c3_date')}</span><div>${t('changelog.c3_text')}</div></div>
  </div>
</section>

<!-- FAQ -->
<section id="faq">
  <div class="wrap" style="max-width:800px">
    <h2>${t('faq.h2')}</h2>
    ${faqItems}
  </div>
</section>

<!-- ФИНАЛЬНЫЙ CTA -->
<section id="start">
  <div class="wrap" style="text-align:center">
    <h2>${t('final_cta.h2')}</h2>
    <p class="lead" style="margin:0 auto 32px">${t('final_cta.body')}</p>
    <button class="btn js-signup">${t('final_cta.button')}</button>
  </div>
</section>
</main>

<footer>
  <div class="wrap">
    <div class="f-grid">
      <div>
        <span class="logo">◆ ${t('nav.logo')}</span>
        <p class="small" style="margin-top:12px">${t('footer.made_note')}</p>
      </div>
      <div>
        <h3>${t('footer.product_col')}</h3>
        <a href="#program">${t('nav.program')}</a>
        <a href="#price">${t('nav.price')}</a>
        <a href="#faq">${t('nav.faq')}</a>
      </div>
      <div>
        <h3>${t('footer.project_col')}</h3>
        <a href="${GITHUB}" rel="noopener">GitHub ↗</a>
        <a href="#changelog">${t('changelog.title')}</a>
      </div>
      <div>
        <h3>${t('footer.lang_col')}</h3>
        ${LOCALES.map((l) => `<a href="${l === 'ru' ? ROOT : ROOT + l + '/'}" data-lang-x="${l}">${l.toUpperCase()}</a>`).join('')}
      </div>
    </div>
    <div class="f-status"><span class="ok-dot"></span>v7.0 · 2026-08 · 134/145/21/205</div>
    <p class="disclaimer">${t('disclaimer.text')}<br>${t('footer.copyright')}</p>
  </div>
</footer>

<dialog id="signup" aria-labelledby="m-t">
  <div class="m-head">
    <h3 id="m-t" data-err-email="${t('modal.err_email')}" data-err-pass="${t('modal.err_password')}" data-err-consent="${t('modal.err_consent')}" data-err-exists="${t('modal.err_exists')}" data-waitlist="${t('modal.waitlist_msg')}">${t('modal.title')}</h3>
    <p class="small" style="margin-top:4px">${t('modal.sub')}</p>
  </div>
  <form class="m-body" id="f-form" novalidate>
    <div>
      <label for="f-email">${t('modal.email_label')}</label>
      <input type="email" id="f-email" name="email" autocomplete="email" placeholder="${t('modal.email_placeholder')}" required>
      <span class="err" id="e-email" role="alert"></span>
    </div>
    <div>
      <label for="f-pass">${t('modal.password_label')}</label>
      <input type="password" id="f-pass" name="password" autocomplete="new-password" minlength="8" required>
      <span class="small">${t('modal.password_hint')}</span>
      <span class="err" id="e-pass" role="alert"></span>
    </div>
    <div class="consent">
      <input type="checkbox" id="f-consent" required>
      <div>
        <label for="f-consent" style="margin:0">${t('modal.consent_label')}</label>
        <details><summary>${t('modal.consent_label')}</summary><div class="a">${t('modal.consent_details')}</div></details>
      </div>
    </div>
    <span class="err" id="e-consent" role="alert"></span>
    <div class="m-msg" id="f-msg" role="status"></div>
    <button type="submit" class="btn" id="f-submit" style="width:100%">${t('modal.submit')}</button>
    <button type="button" class="m-close" id="m-x">${t('modal.cancel')}</button>
  </form>
</dialog>

<script>${clientJS(lang, ROOT, APP, lang === 'ru')}</script>
</body>
</html>`;
}

// --- запись ---
for (const lang of LOCALES) {
  const dir = lang === 'ru' ? DIR : path.join(DIR, lang);
  fs.mkdirSync(dir, { recursive: true });
  const html = pageHTML(lang);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log(`${lang}: ${(html.length / 1024).toFixed(1)}KB -> ${path.relative(process.cwd(), path.join(dir, 'index.html'))}`);
}
