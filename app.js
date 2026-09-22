import SwissEph from 'https://cdn.jsdelivr.net/gh/prolaxu/swisseph-wasm@v0.1.0/src/swisseph.js';

const SIGNS=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGN_GLYPHS=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const PLANETS=[['Sun','☉'],['Moon','☽'],['Mercury','☿'],['Venus','♀'],['Mars','♂'],['Jupiter','♃'],['Saturn','♄'],['Rahu','☊'],['Ketu','☋'],['Uranus','♅'],['Neptune','♆'],['Pluto','♇']];
const NAKSHATRAS=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAK_LORDS=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury','Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury','Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const DEFAULT_PROFILE={mode:'manual',ascSign:'Virgo',ascDegree:18,ascMinute:42,ascSecond:0,planetRoles:{Mercury:['ASC Lord'],Venus:['5th Lord','12th Lord']},houseRoles:{1:['Self','Body','Life direction'],4:['Home','Mother','Emotional foundation'],10:['Career','Public role']}};

const now=new Date();
const defaultUTC=toUTCInput(now);
let state={tab:'climate',scale:'City',selectedPlanet:'Mercury',selectedHouse:1,profile:loadProfile(),engineStatus:'loading',engineMessage:'Loading Swiss Ephemeris…',swe:null,transit:null,latitude:36.17,longitude:-115.14,utcDateTime:defaultUTC,useLiveAsc:true};

function loadProfile(){try{return JSON.parse(localStorage.getItem('vedicProfile'))||structuredClone(DEFAULT_PROFILE)}catch{return structuredClone(DEFAULT_PROFILE)}}
function save(){localStorage.setItem('vedicProfile',JSON.stringify(state.profile))}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function norm(x){return ((x%360)+360)%360}
function toUTCInput(d){return new Date(d.getTime()).toISOString().slice(0,16)}
function formatLon(lon){const sign=Math.floor(norm(lon)/30),deg=norm(lon)%30;return `${SIGNS[sign]} ${deg.toFixed(2)}°`}
function nakInfo(lon){const x=norm(lon),size=360/27,index=Math.min(26,Math.floor(x/size)),within=x-index*size,pada=Math.min(4,Math.floor(within/(size/4))+1);return {name:NAKSHATRAS[index],lord:NAK_LORDS[index],pada,index}}
function point(cx,cy,r,deg){const a=(deg-90)*Math.PI/180;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]}
function arcPath(cx,cy,r1,r2,start,end){const p1=point(cx,cy,r2,start),p2=point(cx,cy,r2,end),p3=point(cx,cy,r1,end),p4=point(cx,cy,r1,start);return `M ${p1[0]} ${p1[1]} A ${r2} ${r2} 0 0 1 ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]} A ${r1} ${r1} 0 0 0 ${p4[0]} ${p4[1]} Z`}
function manualAsc(){const p=state.profile;return SIGNS.indexOf(p.ascSign)*30+(+p.ascDegree||0)+(+p.ascMinute||0)/60+(+p.ascSecond||0)/3600}
function activeAsc(){return state.useLiveAsc&&state.transit?state.transit.ascendant:manualAsc()}
function activePlanets(){if(state.transit)return state.transit.planets;return PLANETS.map(([name,glyph],i)=>({name,glyph,longitude:norm(manualAsc()+24+i*27.1),demo:true}))}

async function initEngine(){
  try{
    const swe=new SwissEph();
    await swe.initSwissEph();
    swe.set_sid_mode(swe.SE_SIDM_LAHIRI,0,0);
    state.swe=swe;state.engineStatus='ready';state.engineMessage='Swiss Ephemeris ready · Lahiri sidereal';
    await calculateTransit(false);
  }catch(err){
    console.error(err);state.engineStatus='error';state.engineMessage='Astronomy engine could not load. Manual profile mode still works.';render();
  }
}

function calcBody(swe,jd,id,name,glyph){
  const flags=swe.SEFLG_SWIEPH|swe.SEFLG_SIDEREAL|swe.SEFLG_SPEED;
  const r=swe.calc_ut(jd,id,flags);
  if(!r)throw new Error(`No result for ${name}`);
  const lon=norm(r[0]);
  return {name,glyph,longitude:lon,latitude:r[1]||0,speed:r[3]||0,retrograde:(r[3]||0)<0,...nakInfo(lon)};
}

async function calculateTransit(doRender=true){
  if(!state.swe)return;
  try{
    state.engineStatus='calculating'; if(doRender)render();
    const swe=state.swe;
    const d=new Date(`${state.utcDateTime}:00Z`);
    if(Number.isNaN(d.getTime()))throw new Error('Invalid UTC date/time');
    const hour=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;
    const jd=swe.julday(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),hour);
    swe.set_sid_mode(swe.SE_SIDM_LAHIRI,0,0);
    const bodies=[
      [swe.SE_SUN,'Sun','☉'],[swe.SE_MOON,'Moon','☽'],[swe.SE_MERCURY,'Mercury','☿'],[swe.SE_VENUS,'Venus','♀'],[swe.SE_MARS,'Mars','♂'],[swe.SE_JUPITER,'Jupiter','♃'],[swe.SE_SATURN,'Saturn','♄'],[swe.SE_URANUS,'Uranus','♅'],[swe.SE_NEPTUNE,'Neptune','♆'],[swe.SE_PLUTO,'Pluto','♇']
    ];
    const planets=bodies.map(([id,n,g])=>calcBody(swe,jd,id,n,g));
    const rahu=calcBody(swe,jd,swe.SE_MEAN_NODE,'Rahu','☊');
    const ketu={...rahu,name:'Ketu',glyph:'☋',longitude:norm(rahu.longitude+180),speed:rahu.speed,...nakInfo(norm(rahu.longitude+180))};
    planets.splice(7,0,rahu,ketu);
    const aya=norm(swe.get_ayanamsa(jd));
    const houses=swe.houses(jd,+state.latitude,+state.longitude,'P');
    const tropicalAsc=houses?.ascmc?.[0] ?? houses?.ascendant ?? houses?.cusps?.[1] ?? houses?.cusps?.[0];
    if(!Number.isFinite(tropicalAsc))throw new Error('Could not calculate Ascendant');
    const ascendant=norm(tropicalAsc-aya);
    const wholeSignStart=Math.floor(ascendant/30)*30;
    const wholeSignCusps=Array.from({length:12},(_,i)=>norm(wholeSignStart+i*30));
    state.transit={jd,utc:d.toISOString(),ayanamsa:aya,ascendant,descendant:norm(ascendant+180),mc:houses?.ascmc?.[1],wholeSignCusps,planets};
    state.engineStatus='ready';state.engineMessage='Swiss Ephemeris ready · Lahiri sidereal · mean node';
  }catch(err){console.error(err);state.engineStatus='error';state.engineMessage=`Calculation error: ${err.message}`}
  render();
}

function wheel(){
  const asc=activeAsc(),rot=90-asc,cx=350,cy=350;
  let defs=`<defs><radialGradient id="core"><stop offset="0" stop-color="#161b2b" stop-opacity=".70"/><stop offset="1" stop-color="#090b12" stop-opacity=".48"/></radialGradient><filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  NAKSHATRAS.forEach((n,i)=>{const st=i*(360/27)+rot,en=st+360/27,mid=(st+en)/2,labelRadius=210;let a1=st+1.2,a2=en-1.2;const upright=((mid%360)+360)%360;if(upright>90&&upright<270){const t=a1;a1=a2;a2=t}const p1=point(cx,cy,labelRadius,a1),p2=point(cx,cy,labelRadius,a2),sweep=(upright>90&&upright<270)?0:1;defs+=`<path id="nakArc${i}" d="M ${p1[0]} ${p1[1]} A ${labelRadius} ${labelRadius} 0 0 ${sweep} ${p2[0]} ${p2[1]}"/>`});
  defs+='</defs>';
  let s=`<div class="map-underlay"><div class="map-grid"></div><div class="map-road road-a"></div><div class="map-road road-b"></div><div class="map-road road-c"></div></div><svg class="wheel" viewBox="0 0 700 700">${defs}<circle cx="350" cy="350" r="336" fill="url(#core)" stroke="#606a8d" stroke-opacity=".50" stroke-width="2"/>`;
  const hues=[8,31,56,108,145,174,201,229,255,278,309,338];
  SIGNS.forEach((n,i)=>{const st=i*30+rot,en=st+30,mid=st+15,[x,y]=point(cx,cy,282,mid);s+=`<path d="${arcPath(cx,cy,245,325,st,en)}" fill="hsl(${hues[i]} 74% 48% / .44)" stroke="#d7dcf2" stroke-opacity=".13"/><text x="${x}" y="${y-7}" text-anchor="middle" class="sign-glyph">${SIGN_GLYPHS[i]}</text><text x="${x}" y="${y+18}" text-anchor="middle" class="sign-name">${n}</text>`});
  NAKSHATRAS.forEach((n,i)=>{const st=i*(360/27)+rot,en=st+360/27,hue=(i*360/27+18)%360;s+=`<path d="${arcPath(cx,cy,171,243,st,en)}" fill="hsl(${hue} 52% 34% / ${i%2?'.34':'.29'})" stroke="#d6dcf5" stroke-opacity=".22" stroke-width=".8"/><text class="nak-name"><textPath href="#nakArc${i}" startOffset="50%" text-anchor="middle">${n}</textPath></text>`});
  for(let i=0;i<108;i++){const a=i*(360/108)+rot,p1=point(cx,cy,160,a),p2=point(cx,cy,i%4===0?171:166,a);s+=`<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#d9def0" stroke-opacity="${i%4===0?'.34':'.16'}" stroke-width="${i%4===0?'.8':'.45'}"/>`}
  for(let i=0;i<12;i++){const a=i*30+rot,p1=point(cx,cy,94,a),p2=point(cx,cy,171,a);s+=`<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#cbd3ef" stroke-opacity=".36"/>`}
  s+=`<circle cx="350" cy="350" r="169" fill="#080a10" fill-opacity=".34" stroke="#8d98bd" stroke-opacity=".28"/><circle cx="350" cy="350" r="92" fill="#111827" fill-opacity=".28" stroke="#aab5d9" stroke-opacity=".28"/><circle cx="350" cy="350" r="5" fill="#ffd166" filter="url(#softGlow)"/>`;
  ['N','NE','E','SE','S','SW','W','NW'].forEach((d,i)=>{const[x,y]=point(cx,cy,346,i*45);s+=`<text x="${x}" y="${y+6}" text-anchor="middle" class="${d==='E'?'dir east':'dir'}">${d}</text>`});
  s+=`<text x="637" y="338" text-anchor="middle" class="asc-label">ASC</text><text x="63" y="338" text-anchor="middle" class="dsc-label">DSC</text>`;
  activePlanets().forEach((p)=>{const angle=p.longitude+rot,[x,y]=point(cx,cy,132,angle);s+=`<g class="planet-node" data-title="${esc(p.name)} ${esc(formatLon(p.longitude))}"><circle cx="${x}" cy="${y}" r="15" fill="#121724" fill-opacity=".78" stroke="#e1e6f5" stroke-opacity=".60"/><text x="${x}" y="${y+7}" text-anchor="middle" class="planet-glyph">${p.glyph}</text></g>`});
  return s+'</svg>';
}

function transitTable(){
  if(!state.transit)return `<div class="empty-state">Calculate a live transit to replace the demonstration planet placements.</div>`;
  return `<div class="transit-table">${state.transit.planets.map(p=>`<div class="transit-row"><b>${p.glyph} ${p.name}${p.retrograde?' ℞':''}</b><span>${formatLon(p.longitude)}</span><span>${p.name==='Rahu'||p.name==='Ketu'?p.name:p.name} · ${p.name?`${p.name}`:''}</span><span>${p.name==='Rahu'||p.name==='Ketu'?`${p.name==='Rahu'?'Mean node':'Opposite mean node'}`:`${p.speed.toFixed(3)}°/day`}</span><small>${p.name==='Rahu'||p.name==='Ketu'?`${nakInfo(p.longitude).name} · Pada ${nakInfo(p.longitude).pada}`:`${p.name?`${nakInfo(p.longitude).name} · Pada ${nakInfo(p.longitude).pada}`:''}`}</small></div>`).join('')}</div>`;
}

function profileView(){const p=state.profile,pr=p.planetRoles[state.selectedPlanet]||[],hr=p.houseRoles[state.selectedHouse]||[];return `<div class="grid two"><section class="panel"><span class="eyebrow">PROFILE MODE</span><h2>Build your astrology profile</h2><div class="segmented">${[['automatic','Calculate My Chart'],['manual','Build Manually'],['quick','Quick Reading']].map(([m,l])=>`<button data-mode="${m}" class="${p.mode===m?'active':''}">${l}</button>`).join('')}</div><h3>Manual Ascendant</h3><div class="form-grid"><label>Sign<select id="ascSign">${SIGNS.map(x=>`<option ${x===p.ascSign?'selected':''}>${x}</option>`).join('')}</select></label><label>Degree<input id="ascDegree" type="number" min="0" max="29" value="${p.ascDegree}"></label><label>Minute<input id="ascMinute" type="number" min="0" max="59" value="${p.ascMinute}"></label><label>Second<input id="ascSecond" type="number" min="0" max="59" value="${p.ascSecond}"></label></div><div class="status-line">Manual ASC: <b>${p.ascSign} ${p.ascDegree}° ${p.ascMinute}′ ${p.ascSecond}″</b></div></section><section class="panel"><span class="eyebrow">PERSONAL MEANINGS</span><h2>Planet & house roles</h2><div class="planet-picker">${PLANETS.map(([n,g])=>`<button data-planet="${n}" class="${state.selectedPlanet===n?'selected':''}"><span>${g}</span>${n}</button>`).join('')}</div><div class="tag-editor"><div class="tag-title">${state.selectedPlanet} roles</div><div class="tags">${pr.map((x,i)=>`<button class="tag" data-remove-planet="${i}">${esc(x)} ×</button>`).join('')}</div><div class="add-row"><input id="planetRoleInput" placeholder="e.g. ASC Lord, 5th Lord"><button id="addPlanetRole">+ Add</button></div></div><div class="house-picker top-gap">${Array.from({length:12},(_,i)=>i+1).map(n=>`<button data-house="${n}" class="${state.selectedHouse===n?'selected':''}">H${n}</button>`).join('')}</div><div class="tag-editor"><div class="tag-title">House ${state.selectedHouse} meanings</div><div class="tags">${hr.map((x,i)=>`<button class="tag" data-remove-house="${i}">${esc(x)} ×</button>`).join('')}</div><div class="add-row"><input id="houseRoleInput" placeholder="e.g. home business, children"><button id="addHouseRole">+ Add</button></div></div></section></div>`}

function climateView(){const p=state.profile,t=state.transit;return `<div class="climate-layout"><section class="panel controls"><span class="eyebrow">PERSONAL CLIMATE SCOPE</span><h2>Live sidereal wheel</h2><div class="engine ${state.engineStatus}"><span class="engine-dot"></span>${esc(state.engineMessage)}</div><label>Latitude<input id="latitude" type="number" step="0.000001" min="-90" max="90" value="${state.latitude}"></label><label>Longitude<input id="longitude" type="number" step="0.000001" min="-180" max="180" value="${state.longitude}"></label><button id="useLocation" class="action secondary">Use device location</button><label>UTC date & time<input id="utcDateTime" type="datetime-local" value="${state.utcDateTime}"></label><button id="useNow" class="action secondary">Use current UTC time</button><button id="calculate" class="action primary" ${state.engineStatus==='loading'?'disabled':''}>Calculate Live Transit</button><label>Wheel Ascendant<select id="ascSource"><option value="live" ${state.useLiveAsc?'selected':''}>Live calculated ASC</option><option value="manual" ${!state.useLiveAsc?'selected':''}>Manual profile ASC</option></select></label><label>Projection scale<select id="scale">${['World','Country','State','City','Neighborhood','Street'].map(x=>`<option ${x===state.scale?'selected':''}>${x}</option>`).join('')}</select></label><div class="metric"><span>Active Ascendant</span><b>${formatLon(activeAsc())}</b></div>${t?`<div class="metric"><span>Lahiri ayanamsa</span><b>${t.ayanamsa.toFixed(4)}°</b></div><div class="metric"><span>Node</span><b>Mean Rahu/Ketu</b></div>`:''}<div class="metric"><span>Compass rule</span><b>ASC East · DSC West</b></div><div class="notice">Time is entered in UTC in this version. Address lookup and city time-zone conversion come next; neither will require a paid map key.</div></section><section class="panel wheel-panel"><div class="wheel-wrap">${wheel()}</div><div class="wheel-status">${t?'Live sidereal transit positions':'Demonstration planet positions'} · Whole Sign house framework</div></section></div><section class="panel transit-panel"><div class="panel-head"><div><span class="eyebrow">CALCULATED POSITIONS</span><h2>Transit details</h2></div></div>${transitTable()}</section>`}

function horoscopeView(){return `<div class="grid two"><section class="panel hero-panel"><span class="eyebrow">DAILY HOROSCOPE</span><h1>Structured Vedic forecasting</h1><p>The forecast layer will consume calculated transit facts, your custom planet/house roles, nakshatras, house lords, Vedic aspects and Bhavat Bhavam. We are keeping interpretation downstream from the astronomy so the prose cannot invent planet positions.</p></section><section class="panel"><h2>Life areas</h2><div class="life-grid">${['Daily Overview','Self & Direction','Home & Family','Relationships','Career & Work','Money & Earning','Health & Vitality','Travel','Neighbors & Local Activity','Creativity & Children','Spiritual Life','Personal Climate'].map((x,i)=>`<button><span>${String(i+1).padStart(2,'0')}</span>${x}</button>`).join('')}</div></section></div>`}

function settingsView(){return `<section class="panel"><span class="eyebrow">CALCULATION SPECIFICATION</span><h2>Current rules</h2><div class="settings-grid"><div><span>Zodiac</span><b>Sidereal</b></div><div><span>Ayanamsa</span><b>Lahiri</b></div><div><span>Nodes</span><b>Mean Rahu/Ketu</b></div><div><span>Houses</span><b>Whole Sign</b></div><div><span>Outer planets</span><b>Uranus · Neptune · Pluto</b></div><div><span>Wheel orientation</span><b>ASC East · DSC West</b></div></div></section>`}

function render(){document.querySelector('#app').innerHTML=`<div class="app-shell"><aside><div class="brand"><div class="brand-mark">☸</div><div><b>VEDIC</b><span>CLIMATE SCOPE</span></div></div><nav>${[['climate','◉','Climate Scope'],['horoscope','✦','Daily Horoscope'],['profile','◎','Profile'],['settings','⚙','Settings']].map(([t,i,l])=>`<button data-tab="${t}" class="${state.tab===t?'active':''}"><span>${i}</span>${l}</button>`).join('')}</nav><button id="reset" class="reset">Reset saved profile</button></aside><main><header><div><span class="eyebrow">SIDEREAL ASTROLOGY PLATFORM</span><h1>${state.tab==='climate'?'Personal Climate Scope':state.tab==='profile'?'Personal Astrology Profile':state.tab==='horoscope'?'Daily Vedic Horoscope':'Calculation Settings'}</h1></div><div class="pill">Lahiri · 27 Nakshatras · Bhavat Bhavam</div></header>${state.tab==='profile'?profileView():state.tab==='climate'?climateView():state.tab==='horoscope'?horoscopeView():settingsView()}</main></div>`;bind()}

function bind(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render()});
  const reset=document.querySelector('#reset');if(reset)reset.onclick=()=>{state.profile=structuredClone(DEFAULT_PROFILE);save();render()};
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.profile.mode=b.dataset.mode;save();render()});
  document.querySelectorAll('[data-planet]').forEach(b=>b.onclick=()=>{state.selectedPlanet=b.dataset.planet;render()});
  document.querySelectorAll('[data-house]').forEach(b=>b.onclick=()=>{state.selectedHouse=+b.dataset.house;render()});
  ['ascSign','ascDegree','ascMinute','ascSecond'].forEach(id=>{const e=document.querySelector('#'+id);if(e)e.onchange=()=>{state.profile[id]=e.value;save();render()}});
  const scale=document.querySelector('#scale');if(scale)scale.onchange=()=>{state.scale=scale.value;render()};
  const ascSource=document.querySelector('#ascSource');if(ascSource)ascSource.onchange=()=>{state.useLiveAsc=ascSource.value==='live';render()};
  const lat=document.querySelector('#latitude');if(lat)lat.onchange=()=>state.latitude=+lat.value;
  const lon=document.querySelector('#longitude');if(lon)lon.onchange=()=>state.longitude=+lon.value;
  const dt=document.querySelector('#utcDateTime');if(dt)dt.onchange=()=>state.utcDateTime=dt.value;
  const nowBtn=document.querySelector('#useNow');if(nowBtn)nowBtn.onclick=()=>{state.utcDateTime=toUTCInput(new Date());render()};
  const loc=document.querySelector('#useLocation');if(loc)loc.onclick=()=>{if(!navigator.geolocation){state.engineMessage='Browser geolocation is unavailable.';render();return}loc.disabled=true;loc.textContent='Locating…';navigator.geolocation.getCurrentPosition(pos=>{state.latitude=+pos.coords.latitude.toFixed(6);state.longitude=+pos.coords.longitude.toFixed(6);render()},err=>{state.engineMessage=`Location not available: ${err.message}`;render()},{enableHighAccuracy:true,timeout:10000})};
  const calc=document.querySelector('#calculate');if(calc)calc.onclick=()=>{const a=document.querySelector('#latitude'),o=document.querySelector('#longitude'),d=document.querySelector('#utcDateTime');state.latitude=+a.value;state.longitude=+o.value;state.utcDateTime=d.value;calculateTransit()};
  const ap=document.querySelector('#addPlanetRole');if(ap)ap.onclick=()=>{const e=document.querySelector('#planetRoleInput'),v=e.value.trim();if(v){(state.profile.planetRoles[state.selectedPlanet]??=[]).push(v);save();render()}};
  document.querySelectorAll('[data-remove-planet]').forEach(b=>b.onclick=()=>{state.profile.planetRoles[state.selectedPlanet].splice(+b.dataset.removePlanet,1);save();render()});
  const ah=document.querySelector('#addHouseRole');if(ah)ah.onclick=()=>{const e=document.querySelector('#houseRoleInput'),v=e.value.trim();if(v){(state.profile.houseRoles[state.selectedHouse]??=[]).push(v);save();render()}};
  document.querySelectorAll('[data-remove-house]').forEach(b=>b.onclick=()=>{state.profile.houseRoles[state.selectedHouse].splice(+b.dataset.removeHouse,1);save();render()});
}

render();
initEngine();
