import SwissEph from 'https://cdn.jsdelivr.net/gh/prolaxu/swisseph-wasm@v0.1.0/src/swisseph.js';

const SIGNS=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGN_GLYPHS=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const PLANETS=[['Sun','☉'],['Moon','☽'],['Mercury','☿'],['Venus','♀'],['Mars','♂'],['Jupiter','♃'],['Saturn','♄'],['Rahu','☊'],['Ketu','☋'],['Uranus','♅'],['Neptune','♆'],['Pluto','♇']];
const NAKSHATRAS=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAK_LORDS=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury','Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury','Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const DEFAULT_PROFILE={mode:'manual',ascSign:'Virgo',ascDegree:18,ascMinute:42,ascSecond:0,planetRoles:{Mercury:['ASC Lord'],Venus:['5th Lord','12th Lord']},houseRoles:{1:['Self','Body','Life direction'],4:['Home','Mother','Emotional foundation'],10:['Career','Public role']}};

const now=new Date();
const DEFAULT_LAT=36.17, DEFAULT_LON=-115.14;
const defaultTimeZone=lookupTimeZone(DEFAULT_LAT,DEFAULT_LON);
const defaultLocalDateTime=toZonedInput(now,defaultTimeZone);
let state={tab:'climate',scale:'City',selectedPlanet:'Mercury',selectedHouse:1,profile:loadProfile(),engineStatus:'loading',engineMessage:'Loading Swiss Ephemeris…',swe:null,transit:null,latitude:DEFAULT_LAT,longitude:DEFAULT_LON,timeZone:defaultTimeZone,localDateTime:defaultLocalDateTime,useLiveAsc:true,map:null,mapMarker:null,mapPointMarker:null,mapZoom:11,maptilerKey:localStorage.getItem('maptilerKey')||'',searchResults:[],searchStatus:'',selectedMapPoint:null};
const SCALE_ZOOM={World:2,Country:5,State:7,City:11,Neighborhood:15,Street:18};

function loadProfile(){try{return JSON.parse(localStorage.getItem('vedicProfile'))||structuredClone(DEFAULT_PROFILE)}catch{return structuredClone(DEFAULT_PROFILE)}}
function save(){localStorage.setItem('vedicProfile',JSON.stringify(state.profile))}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function norm(x){return ((x%360)+360)%360}
function lookupTimeZone(lat,lon){try{return window.tzlookup?window.tzlookup(+lat,+lon):(Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC')}catch{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}}
function toZonedInput(date,timeZone){const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);const o={};for(const x of parts)if(x.type!=='literal')o[x.type]=x.value;return `${o.year}-${o.month}-${o.day}T${o.hour}:${o.minute}`}
function zoneOffsetMs(date,timeZone){const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);const o={};for(const x of parts)if(x.type!=='literal')o[x.type]=+x.value;const asUTC=Date.UTC(o.year,o.month-1,o.day,o.hour,o.minute,o.second);return asUTC-date.getTime()}
function zonedInputToDate(value,timeZone){const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value||'');if(!m)throw new Error('Invalid local date/time');const wall=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],0);let guess=wall;for(let i=0;i<3;i++){const offset=zoneOffsetMs(new Date(guess),timeZone);guess=wall-offset}return new Date(guess)}
function setTimeZoneFromCoords(preserveInstant=true){const instant=preserveInstant?zonedInputToDate(state.localDateTime,state.timeZone):new Date();state.timeZone=lookupTimeZone(state.latitude,state.longitude);state.localDateTime=toZonedInput(instant,state.timeZone)}
function formatLon(lon){const sign=Math.floor(norm(lon)/30),deg=norm(lon)%30;return `${SIGNS[sign]} ${deg.toFixed(2)}°`}
function nakInfo(lon){const x=norm(lon),size=360/27,index=Math.min(26,Math.floor(x/size)),within=x-index*size,pada=Math.min(4,Math.floor(within/(size/4))+1);return {name:NAKSHATRAS[index],lord:NAK_LORDS[index],pada,index}}
function point(cx,cy,r,deg){const a=(deg-90)*Math.PI/180;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]}
function arcPath(cx,cy,r1,r2,start,end){const p1=point(cx,cy,r2,start),p2=point(cx,cy,r2,end),p3=point(cx,cy,r1,end),p4=point(cx,cy,r1,start);return `M ${p1[0]} ${p1[1]} A ${r2} ${r2} 0 0 1 ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]} A ${r1} ${r1} 0 0 0 ${p4[0]} ${p4[1]} Z`}
function manualAsc(){const p=state.profile;return SIGNS.indexOf(p.ascSign)*30+(+p.ascDegree||0)+(+p.ascMinute||0)/60+(+p.ascSecond||0)/3600}
function activeAsc(){return state.useLiveAsc&&state.transit?state.transit.ascendant:manualAsc()}
function activePlanets(){if(state.transit)return state.transit.planets;return PLANETS.map(([name,glyph],i)=>({name,glyph,longitude:norm(manualAsc()+24+i*27.1),demo:true}))}

function angularDiff(a,b){let d=Math.abs(norm(a)-norm(b));return d>180?360-d:d}
function bearingBetween(lat1,lon1,lat2,lon2){
  const r=Math.PI/180, p1=lat1*r,p2=lat2*r,dl=(lon2-lon1)*r;
  const y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
  return norm(Math.atan2(y,x)/r);
}
function projectedLongitudeForBearing(bearing){return norm(activeAsc()+bearing-90)}
function analyzeMapPoint(lat,lon){
  const bearing=bearingBetween(+state.latitude,+state.longitude,+lat,+lon);
  const zodiacLon=projectedLongitudeForBearing(bearing);
  const nak=nakInfo(zodiacLon), signIndex=Math.floor(zodiacLon/30), signDegree=zodiacLon%30;
  const nearest=activePlanets().map(p=>({...p,separation:angularDiff(p.longitude,zodiacLon)})).sort((a,b)=>a.separation-b.separation)[0];
  return {lat:+lat,lon:+lon,bearing,zodiacLon,nak,sign:SIGNS[signIndex],signDegree,nearest};
}
function locationAnalysisCard(){
  const a=state.selectedMapPoint;if(!a)return `<div class="empty-state">Click a point inside the wheel to inspect its projected zodiac, nakshatra and nearest planetary influence.</div>`;
  const near=a.nearest&&a.nearest.separation<=6;
  return `<div class="location-readout"><div><span>Map point</span><b>${a.lat.toFixed(5)}, ${a.lon.toFixed(5)}</b></div><div><span>Bearing from epicenter</span><b>${a.bearing.toFixed(2)}°</b></div><div><span>Projected zodiac</span><b>${a.sign} ${a.signDegree.toFixed(2)}°</b></div><div><span>Nakshatra</span><b>${a.nak.name} · Pada ${a.nak.pada}</b></div><div><span>Nakshatra lord</span><b>${a.nak.lord}</b></div><div><span>Planetary vicinity</span><b>${near?`${a.nearest.glyph} ${a.nearest.name} · ${a.nearest.separation.toFixed(2)}° away`:`No planet within 6° · nearest ${a.nearest?.name||'—'} ${a.nearest?`${a.nearest.separation.toFixed(2)}°`:''}`}</b></div></div>`;
}
async function searchPlace(){
  const key=(document.querySelector('#maptilerKey')?.value||state.maptilerKey||'').trim();
  const q=(document.querySelector('#placeSearch')?.value||'').trim();
  if(!key){state.searchStatus='Enter your MapTiler API key first.';render();return}
  if(!q){state.searchStatus='Enter a city, street, neighborhood or address.';render();return}
  state.maptilerKey=key;localStorage.setItem('maptilerKey',key);state.searchStatus='Searching…';state.searchResults=[];render();
  try{
    const url=`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?limit=6&autocomplete=false&key=${encodeURIComponent(key)}`;
    const r=await fetch(url);if(!r.ok)throw new Error(r.status===403?'API key rejected or restricted for this site.':`Search failed (${r.status})`);
    const data=await r.json();state.searchResults=(data.features||[]).map(f=>({name:f.place_name||f.text||q,center:f.center||f.geometry?.coordinates,bbox:f.bbox||null,type:f.place_type?.[0]||''})).filter(x=>x.center&&x.center.length>=2);
    state.searchStatus=state.searchResults.length?`${state.searchResults.length} result${state.searchResults.length===1?'':'s'} found.`:'No matching places found.';
  }catch(e){console.error(e);state.searchStatus=e.message||'Place search failed.'}
  render();
}
function selectSearchResult(i){
  const r=state.searchResults[i];if(!r)return;
  state.longitude=+r.center[0];state.latitude=+r.center[1];state.selectedMapPoint=null;setTimeZoneFromCoords(true);
  const zoom=r.type==='address'?18:r.type==='neighbourhood'?15:r.type==='place'?11:SCALE_ZOOM[state.scale]||11;
  state.mapZoom=zoom;state.searchStatus=`Epicenter set to ${r.name}`;state.searchResults=[];
  calculateTransit();
}

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
    const d=zonedInputToDate(state.localDateTime,state.timeZone);
    if(Number.isNaN(d.getTime()))throw new Error('Invalid local date/time');
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
  let s=`<svg class="wheel" viewBox="0 0 700 700">${defs}<circle cx="350" cy="350" r="336" fill="url(#core)" stroke="#606a8d" stroke-opacity=".50" stroke-width="2"/>`;
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

function climateView(){const p=state.profile,t=state.transit;return `<div class="climate-layout"><section class="panel controls"><span class="eyebrow">PERSONAL CLIMATE SCOPE</span><h2>Live sidereal wheel</h2><div class="engine ${state.engineStatus}"><span class="engine-dot"></span>${esc(state.engineMessage)}</div><label>MapTiler API key<input id="maptilerKey" type="password" autocomplete="off" placeholder="Paste key once" value="${esc(state.maptilerKey)}"></label><div class="help-note">Stored only in this browser. Restrict the key to your Vercel domain in MapTiler.</div><div class="search-row"><input id="placeSearch" placeholder="City, neighborhood, street or address"><button id="searchPlace" class="action primary compact">Search</button></div>${state.searchStatus?`<div class="search-status">${esc(state.searchStatus)}</div>`:''}${state.searchResults.length?`<div class="search-results">${state.searchResults.map((r,i)=>`<button data-search-result="${i}"><b>${esc(r.name)}</b><small>${esc(r.type||'place')}</small></button>`).join('')}</div>`:''}<label>Latitude<input id="latitude" type="number" step="0.000001" min="-90" max="90" value="${state.latitude}"></label><label>Longitude<input id="longitude" type="number" step="0.000001" min="-180" max="180" value="${state.longitude}"></label><button id="useLocation" class="action secondary">Use device location</button><button id="centerMap" class="action secondary">Center map on coordinates</button><label>Location local date & time<input id="localDateTime" type="datetime-local" value="${state.localDateTime}"></label><div class="help-note">Time zone: ${esc(state.timeZone)} · UTC used internally: ${state.transit?esc(state.transit.utc.replace('T',' ').slice(0,16)+' UTC'):'calculated on transit'}</div><button id="useNow" class="action secondary">Use current local time</button><button id="calculate" class="action primary" ${state.engineStatus==='loading'?'disabled':''}>Calculate Live Transit</button><label>Wheel Ascendant<select id="ascSource"><option value="live" ${state.useLiveAsc?'selected':''}>Live calculated ASC</option><option value="manual" ${!state.useLiveAsc?'selected':''}>Manual profile ASC</option></select></label><label>Projection scale<select id="scale">${['World','Country','State','City','Neighborhood','Street'].map(x=>`<option ${x===state.scale?'selected':''}>${x}</option>`).join('')}</select></label><div class="metric"><span>Active Ascendant</span><b>${formatLon(activeAsc())}</b></div>${t?`<div class="metric"><span>Lahiri ayanamsa</span><b>${t.ayanamsa.toFixed(4)}°</b></div><div class="metric"><span>Node</span><b>Mean Rahu/Ketu</b></div>`:''}<div class="metric"><span>Epicenter</span><b>${(+state.latitude).toFixed(5)}, ${(+state.longitude).toFixed(5)}</b></div><div class="metric"><span>Compass rule</span><b>ASC East · DSC West</b></div><div class="notice">Search sets the epicenter. Click another point on the map to identify which projected zodiac sign, nakshatra and pada falls there. This is an astrological geographic projection, not a claim that a physical street is astronomically located beneath a planet.</div></section><section class="panel wheel-panel"><div class="map-wheel-stage"><div id="climateMap" class="climate-map" aria-label="Personal Climate map"></div><div class="wheel-wrap map-wheel-overlay">${wheel()}</div><div class="epicenter-pin" title="Epicenter"></div></div><div class="wheel-status">${t?'Live sidereal transit positions':'Demonstration planet positions'} · Whole Sign house framework · ${state.scale} scale</div></section></div><section class="panel transit-panel"><div class="panel-head"><div><span class="eyebrow">LOCATION ANALYSIS</span><h2>Selected map sector</h2></div></div><div id="locationAnalysis">${locationAnalysisCard()}</div></section><section class="panel transit-panel"><div class="panel-head"><div><span class="eyebrow">CALCULATED POSITIONS</span><h2>Transit details</h2></div></div>${transitTable()}</section>`}

function horoscopeView(){return `<div class="grid two"><section class="panel hero-panel"><span class="eyebrow">DAILY HOROSCOPE</span><h1>Structured Vedic forecasting</h1><p>The forecast layer will consume calculated transit facts, your custom planet/house roles, nakshatras, house lords, Vedic aspects and Bhavat Bhavam. We are keeping interpretation downstream from the astronomy so the prose cannot invent planet positions.</p></section><section class="panel"><h2>Life areas</h2><div class="life-grid">${['Daily Overview','Self & Direction','Home & Family','Relationships','Career & Work','Money & Earning','Health & Vitality','Travel','Neighbors & Local Activity','Creativity & Children','Spiritual Life','Personal Climate'].map((x,i)=>`<button><span>${String(i+1).padStart(2,'0')}</span>${x}</button>`).join('')}</div></section></div>`}

function settingsView(){return `<section class="panel"><span class="eyebrow">CALCULATION SPECIFICATION</span><h2>Current rules</h2><div class="settings-grid"><div><span>Zodiac</span><b>Sidereal</b></div><div><span>Ayanamsa</span><b>Lahiri</b></div><div><span>Nodes</span><b>Mean Rahu/Ketu</b></div><div><span>Houses</span><b>Whole Sign</b></div><div><span>Outer planets</span><b>Uranus · Neptune · Pluto</b></div><div><span>Wheel orientation</span><b>ASC East · DSC West</b></div></div></section>`}

function initClimateMap(){
  if(state.tab!=='climate'||!window.L)return;
  const el=document.querySelector('#climateMap');
  if(!el)return;
  if(state.map){try{state.map.remove()}catch{} state.map=null;state.mapMarker=null}
  const zoom=SCALE_ZOOM[state.scale]??11;
  state.mapZoom=zoom;
  const map=L.map(el,{zoomControl:true,attributionControl:true,worldCopyJump:true}).setView([state.latitude,state.longitude],zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);
  const marker=L.circleMarker([state.latitude,state.longitude],{radius:5,weight:2,fillOpacity:.9}).addTo(map);
  state.map=map;state.mapMarker=marker;
  map.on('click',e=>{
    state.selectedMapPoint=analyzeMapPoint(e.latlng.lat,e.latlng.lng);
    if(state.mapPointMarker){try{state.mapPointMarker.remove()}catch{}}
    state.mapPointMarker=L.circleMarker(e.latlng,{radius:6,weight:2,fillOpacity:.75}).addTo(map);
    const target=document.querySelector('#locationAnalysis');
    if(target) target.innerHTML=locationAnalysisCard();
  });
  setTimeout(()=>map.invalidateSize(),0);
}

function moveMapToState(){
  if(!state.map)return;
  state.map.setView([state.latitude,state.longitude],SCALE_ZOOM[state.scale]??state.map.getZoom());
  if(state.mapMarker)state.mapMarker.setLatLng([state.latitude,state.longitude]);
}

function render(){document.querySelector('#app').innerHTML=`<div class="app-shell"><aside><div class="brand"><div class="brand-mark">☸</div><div><b>VEDIC</b><span>CLIMATE SCOPE</span></div></div><nav>${[['climate','◉','Climate Scope'],['horoscope','✦','Daily Horoscope'],['profile','◎','Profile'],['settings','⚙','Settings']].map(([t,i,l])=>`<button data-tab="${t}" class="${state.tab===t?'active':''}"><span>${i}</span>${l}</button>`).join('')}</nav><button id="reset" class="reset">Reset saved profile</button></aside><main><header><div><span class="eyebrow">SIDEREAL ASTROLOGY PLATFORM</span><h1>${state.tab==='climate'?'Personal Climate Scope':state.tab==='profile'?'Personal Astrology Profile':state.tab==='horoscope'?'Daily Vedic Horoscope':'Calculation Settings'}</h1></div><div class="pill">Lahiri · 27 Nakshatras · Bhavat Bhavam</div></header>${state.tab==='profile'?profileView():state.tab==='climate'?climateView():state.tab==='horoscope'?horoscopeView():settingsView()}</main></div>`;bind();initClimateMap()}

function bind(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render()});
  const reset=document.querySelector('#reset');if(reset)reset.onclick=()=>{state.profile=structuredClone(DEFAULT_PROFILE);save();render()};
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.profile.mode=b.dataset.mode;save();render()});
  document.querySelectorAll('[data-planet]').forEach(b=>b.onclick=()=>{state.selectedPlanet=b.dataset.planet;render()});
  document.querySelectorAll('[data-house]').forEach(b=>b.onclick=()=>{state.selectedHouse=+b.dataset.house;render()});
  ['ascSign','ascDegree','ascMinute','ascSecond'].forEach(id=>{const e=document.querySelector('#'+id);if(e)e.onchange=()=>{state.profile[id]=e.value;save();render()}});
  const scale=document.querySelector('#scale');if(scale)scale.onchange=()=>{state.scale=scale.value;render()};
  const ascSource=document.querySelector('#ascSource');if(ascSource)ascSource.onchange=()=>{state.useLiveAsc=ascSource.value==='live';render()};
  const lat=document.querySelector('#latitude');if(lat)lat.onchange=()=>{state.latitude=+lat.value;setTimeZoneFromCoords(true);moveMapToState();render()};
  const lon=document.querySelector('#longitude');if(lon)lon.onchange=()=>{state.longitude=+lon.value;setTimeZoneFromCoords(true);moveMapToState();render()};
  const dt=document.querySelector('#localDateTime');if(dt)dt.onchange=()=>state.localDateTime=dt.value;
  const nowBtn=document.querySelector('#useNow');if(nowBtn)nowBtn.onclick=()=>{state.localDateTime=toZonedInput(new Date(),state.timeZone);render()};
  const keyInput=document.querySelector('#maptilerKey');if(keyInput)keyInput.onchange=()=>{state.maptilerKey=keyInput.value.trim();localStorage.setItem('maptilerKey',state.maptilerKey)};
  const searchBtn=document.querySelector('#searchPlace');if(searchBtn)searchBtn.onclick=searchPlace;
  const searchInput=document.querySelector('#placeSearch');if(searchInput)searchInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchPlace()}};
  document.querySelectorAll('[data-search-result]').forEach(b=>b.onclick=()=>selectSearchResult(+b.dataset.searchResult));
  const loc=document.querySelector('#useLocation');if(loc)loc.onclick=()=>{if(!navigator.geolocation){state.engineMessage='Browser geolocation is unavailable.';render();return}loc.disabled=true;loc.textContent='Locating…';navigator.geolocation.getCurrentPosition(pos=>{state.latitude=+pos.coords.latitude.toFixed(6);state.longitude=+pos.coords.longitude.toFixed(6);setTimeZoneFromCoords(true);render()},err=>{state.engineMessage=`Location not available: ${err.message}`;render()},{enableHighAccuracy:true,timeout:10000})};
  const centerMap=document.querySelector('#centerMap');if(centerMap)centerMap.onclick=()=>{const a=document.querySelector('#latitude'),o=document.querySelector('#longitude');state.latitude=+a.value;state.longitude=+o.value;setTimeZoneFromCoords(true);moveMapToState();render()};
  const calc=document.querySelector('#calculate');if(calc)calc.onclick=()=>{const a=document.querySelector('#latitude'),o=document.querySelector('#longitude'),d=document.querySelector('#localDateTime');state.latitude=+a.value;state.longitude=+o.value;state.localDateTime=d.value;calculateTransit()};
  const ap=document.querySelector('#addPlanetRole');if(ap)ap.onclick=()=>{const e=document.querySelector('#planetRoleInput'),v=e.value.trim();if(v){(state.profile.planetRoles[state.selectedPlanet]??=[]).push(v);save();render()}};
  document.querySelectorAll('[data-remove-planet]').forEach(b=>b.onclick=()=>{state.profile.planetRoles[state.selectedPlanet].splice(+b.dataset.removePlanet,1);save();render()});
  const ah=document.querySelector('#addHouseRole');if(ah)ah.onclick=()=>{const e=document.querySelector('#houseRoleInput'),v=e.value.trim();if(v){(state.profile.houseRoles[state.selectedHouse]??=[]).push(v);save();render()}};
  document.querySelectorAll('[data-remove-house]').forEach(b=>b.onclick=()=>{state.profile.houseRoles[state.selectedHouse].splice(+b.dataset.removeHouse,1);save();render()});
}

render();
initEngine();
