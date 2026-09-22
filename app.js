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
let state={tab:'climate',scale:'City',selectedPlanet:'Mercury',selectedHouse:1,profile:loadProfile(),engineStatus:'loading',engineMessage:'Loading Swiss Ephemeris…',swe:null,transit:null,latitude:DEFAULT_LAT,longitude:DEFAULT_LON,cityLatitude:DEFAULT_LAT,cityLongitude:DEFAULT_LON,cityName:'Las Vegas',cityRadiusKm:38,timeZone:defaultTimeZone,localDateTime:defaultLocalDateTime,useLiveAsc:true,map:null,mapMarker:null,mapPointMarker:null,mapEpicenterMarker:null,mapWheelMarker:null,mapZoom:11,maptilerKey:safeGet('maptilerKey')||'',searchResults:[],searchStatus:'',selectedMapPoint:null,streetIndex:[],streetIndexStatus:'',streetIndexLoading:false,mapKeyTest:''};
const SCALE_CONFIG={World:{zoom:2,radiusKm:12000},Country:{zoom:5,radiusKm:1200},State:{zoom:7,radiusKm:320},City:{zoom:11,radiusKm:35},Neighborhood:{zoom:15,radiusKm:3.2},Street:{zoom:18,radiusKm:0.35}};

function cloneDefaultProfile(){return JSON.parse(JSON.stringify(DEFAULT_PROFILE))}
function safeGet(key){try{return localStorage.getItem(key)}catch{return null}}
function safeSet(key,value){try{localStorage.setItem(key,value)}catch{}}
function loadProfile(){try{return JSON.parse(safeGet('vedicProfile'))||cloneDefaultProfile()}catch{return cloneDefaultProfile()}}
function save(){safeSet('vedicProfile',JSON.stringify(state.profile))}
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
function scaleConfig(){return SCALE_CONFIG[state.scale]||SCALE_CONFIG.City}
function cityRadiusKm(){return Math.max(1,+state.cityRadiusKm||38)}
function cityRadiusLabel(){const km=cityRadiusKm();return `${km.toFixed(km>=100?0:1)} km`}
function nakHue(index){return (index*360/27+18)%360}
function nakColor(index,alpha=1){return `hsl(${nakHue(index)} 56% 52% / ${alpha})`}
function radialLabel(name,cx,cy,outerR,angle){
  const [x,y]=point(cx,cy,outerR,angle);
  const rotation=angle+90;
  return `<g transform="rotate(${rotation} ${x} ${y})" class="nak-radial"><text x="${x}" y="${y}" dominant-baseline="middle" text-anchor="start" class="nak-inward">${esc(name)}</text></g>`;
}
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
function destinationPoint(lat,lon,bearing,distanceKm){
  const R=6371, br=bearing*Math.PI/180, d=distanceKm/R;
  const p1=lat*Math.PI/180, l1=lon*Math.PI/180;
  const p2=Math.asin(Math.sin(p1)*Math.cos(d)+Math.cos(p1)*Math.sin(d)*Math.cos(br));
  const l2=l1+Math.atan2(Math.sin(br)*Math.sin(d)*Math.cos(p1),Math.cos(d)-Math.sin(p1)*Math.sin(p2));
  return {lat:p2*180/Math.PI,lon:((l2*180/Math.PI+540)%360)-180};
}
function signForLongitude(lon){const x=norm(lon),i=Math.floor(x/30);return {name:SIGNS[i],glyph:SIGN_GLYPHS[i],degree:x%30,index:i}}
function climateHouseForLongitude(lon){return Math.floor(norm(lon-activeAsc())/30)+1}
function cityRadiusFromBBox(bbox,lat,lon){if(!bbox||bbox.length<4)return 38;const pts=[[bbox[1],bbox[0]],[bbox[1],bbox[2]],[bbox[3],bbox[0]],[bbox[3],bbox[2]]];return Math.max(...pts.map(([a,o])=>distanceKm(lat,lon,a,o)))*1.08}
function planetsInNak(index){return activePlanets().filter(p=>nakInfo(p.longitude).index===index)}
function aspectPairs(){const ps=activePlanets(),aspects=[{deg:0,name:'conjunction'},{deg:60,name:'sextile'},{deg:90,name:'square'},{deg:120,name:'trine'},{deg:180,name:'opposition'}],out=[];for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const d=angularDiff(ps[i].longitude,ps[j].longitude);const hit=aspects.find(a=>Math.abs(d-a.deg)<=4);if(hit)out.push({a:ps[i],b:ps[j],type:hit.name,orb:Math.min(...aspects.map(x=>Math.abs(d-x.deg)))})}return out}
function streetIndexHTML(){
  if(!state.maptilerKey)return `<div class="street-index-empty">Save a MapTiler key to load street names.</div>`;
  if(!['City','Neighborhood','Street'].includes(state.scale))return `<div class="street-index-empty">Street sampling is shown at City, Neighborhood, or Street scale.</div>`;
  if(state.streetIndexLoading)return `<div class="street-index-empty">Finding streets along the 27 nakshatra wedges…</div>`;
  if(!state.streetIndex.length)return `<div class="street-index-empty">Enter fullscreen to load the street index.</div>`;
  return state.streetIndex.map(row=>{const gov=planetsInNak(row.index);const house=climateHouseForLongitude(row.longitude);return `<div class="street-index-row"><div class="street-index-color" style="background:${nakColor(row.index,.95)}"></div><div class="street-index-copy"><div class="street-index-head"><b>${row.signGlyph} ${esc(row.sign)} · H${house}</b><span>${esc(row.nakshatra)}</span></div><div class="street-index-governors">${gov.length?gov.map(p=>`${p.glyph} ${esc(p.name)}`).join(' · '):`Traditional lord: ${esc(NAK_LORDS[row.index])}`}</div><div class="street-index-streets">${row.streets.length?row.streets.map(esc).join(' · '):'No named road found at sampled points'}</div></div></div>`}).join('');
}
function extractRoadNames(data){
  const features=data?.features||[];
  const names=[];
  for(const f of features){
    const type=(f?.place_type||[])[0]||f?.properties?.kind||'';
    if(type!=='road' && !/road|street/i.test(String(type)))continue;
    const name=String(f.text||f.place_name||'').split(',')[0].trim();
    if(name && !names.includes(name))names.push(name);
  }
  return names.slice(0,3);
}
async function reverseRoadNames(lat,lon){
  const url=`https://api.maptiler.com/geocoding/${lon.toFixed(6)},${lat.toFixed(6)}.json?types=road&limit=3&language=en&key=${encodeURIComponent(state.maptilerKey)}`;
  const r=await fetch(url);
  if(r.status===403)throw new Error(`MAPTILER_403:${window.location.host}`);
  if(!r.ok)throw new Error(`Reverse geocoding failed (${r.status})`);
  return extractRoadNames(await r.json());
}
async function buildStreetIndex(force=false){
  if(!state.maptilerKey||!['City','Neighborhood','Street'].includes(state.scale)){state.streetIndex=[];state.streetIndexStatus='';updateStreetIndexPanel();return}
  if(state.streetIndexLoading)return;
  if(state.streetIndex.length&&!force){updateStreetIndexPanel();return}
  state.streetIndexLoading=true;state.streetIndexStatus='Finding street names…';updateStreetIndexPanel();
  const asc=activeAsc(), radius=cityRadiusKm();
  const rows=NAKSHATRAS.map((nakshatra,index)=>{const lon=index*(360/27)+(360/54);const bearing=norm(90+lon-asc);const sign=signForLongitude(lon);return {index,nakshatra,longitude:lon,bearing,sign:sign.name,signGlyph:sign.glyph,streets:[]}});
  const jobs=[];
  rows.forEach(row=>[.38,.72].forEach(frac=>jobs.push({row,point:destinationPoint(+state.cityLatitude,+state.cityLongitude,row.bearing,Math.max(.05,radius*frac))})));
  let cursor=0,authError='';
  async function worker(){while(cursor<jobs.length){const job=jobs[cursor++];try{const names=await reverseRoadNames(job.point.lat,job.point.lon);for(const name of names){if(name&&!job.row.streets.includes(name)&&job.row.streets.length<4)job.row.streets.push(name)}}catch(e){if(String(e.message||e).startsWith('MAPTILER_403:'))authError=String(e.message).split(':').slice(1).join(':')}}}
  await Promise.all(Array.from({length:5},()=>worker()));
  state.streetIndex=rows;state.streetIndexLoading=false;
  state.streetIndexStatus=authError?`MapTiler rejected reverse geocoding from ${authError}. Add this exact host to Allowed HTTP Origins in MapTiler, or use your stable Vercel production domain.`:'Street index updated from nearby road results along each wedge centerline.';updateStreetIndexPanel();
}
function updateStreetIndexPanel(){const body=document.querySelector('#streetIndexBody');if(body)body.innerHTML=streetIndexHTML();const status=document.querySelector('#streetIndexStatus');if(status)status.textContent=state.streetIndexStatus||''}
async function enterMapFullscreen(){
  const shell=document.querySelector('#mapFullscreenShell');if(!shell)return;
  try{await shell.requestFullscreen();}catch(e){state.searchStatus=`Fullscreen unavailable: ${e.message}`;render();return}
  setTimeout(()=>{if(state.map)state.map.invalidateSize();buildStreetIndex(false)},120);
}
async function exitMapFullscreen(){if(document.fullscreenElement)await document.exitFullscreen()}
function distanceKm(lat1,lon1,lat2,lon2){
  const R=6371, toRad=Math.PI/180;
  const dLat=(lat2-lat1)*toRad,dLon=(lon2-lon1)*toRad;
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*toRad)*Math.cos(lat2*toRad)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function analyzeMapPoint(lat,lon){
  const bearing=bearingBetween(+state.cityLatitude,+state.cityLongitude,+lat,+lon);
  const zodiacLon=projectedLongitudeForBearing(bearing);
  const nak=nakInfo(zodiacLon), signIndex=Math.floor(zodiacLon/30), signDegree=zodiacLon%30;
  const nearest=activePlanets().map(p=>({...p,separation:angularDiff(p.longitude,zodiacLon)})).sort((a,b)=>a.separation-b.separation)[0];
  const distance=distanceKm(+state.cityLatitude,+state.cityLongitude,+lat,+lon);
  const radiusKm=cityRadiusKm();
  const climateHouse=climateHouseForLongitude(zodiacLon);
  const governors=planetsInNak(nak.index);
  return {lat:+lat,lon:+lon,bearing,zodiacLon,nak,sign:SIGNS[signIndex],signDegree,nearest,distanceKm:distance,radiusKm,insideRadius:distance<=radiusKm,climateHouse,governors};
}
function locationAnalysisCard(){
  const a=state.selectedMapPoint;if(!a)return `<div class="empty-state">Move or click the blue location dot to inspect its climate house, zodiac, nakshatra and current transit governors.</div>`;
  const near=a.nearest&&a.nearest.separation<=6;
  const gov=a.governors?.length?a.governors.map(p=>`${p.glyph} ${p.name}`).join(' · '):'No planet currently transiting this nakshatra';
  return `<div class="location-readout"><div><span>Blue dot</span><b>${a.lat.toFixed(5)}, ${a.lon.toFixed(5)}</b></div><div><span>Climate house</span><b>House ${a.climateHouse}</b></div><div><span>Bearing from city center</span><b>${a.bearing.toFixed(2)}°</b></div><div><span>Distance from epicenter</span><b>${a.distanceKm>=1?`${a.distanceKm.toFixed(2)} km`:`${(a.distanceKm*1000).toFixed(0)} m`}</b></div><div><span>City wheel</span><b>${a.insideRadius?'Inside city wheel':'Outside city wheel'} · radius ${cityRadiusLabel()}</b></div><div><span>Projected zodiac</span><b>${a.sign} ${a.signDegree.toFixed(2)}°</b></div><div><span>Nakshatra</span><b>${a.nak.name} · Pada ${a.nak.pada}</b></div><div><span>Traditional lord</span><b>${a.nak.lord}</b></div><div><span>Transit governor</span><b>${gov}</b></div><div><span>Planetary vicinity</span><b>${near?`${a.nearest.glyph} ${a.nearest.name} · ${a.nearest.separation.toFixed(2)}° away`:`Nearest ${a.nearest?.name||'—'} ${a.nearest?`${a.nearest.separation.toFixed(2)}°`:''}`}</b></div></div>`;
}
async function searchPlace(){
  const key=(state.maptilerKey||'').trim();
  const q=(document.querySelector('#placeSearch')?.value||'').trim();
  if(!key){state.searchStatus='Add your MapTiler key in Settings first.';render();return}
  if(!q){state.searchStatus='Enter a city, street, neighborhood or address.';render();return}
  state.maptilerKey=key;safeSet('maptilerKey',key);state.searchStatus='Searching…';state.searchResults=[];render();
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
  const lat=+r.center[1],lon=+r.center[0];
  const isCity=['place','municipality','city','town'].includes(String(r.type||'').toLowerCase());
  if(isCity){
    state.cityLongitude=lon;state.cityLatitude=lat;state.cityName=r.name.split(',')[0];state.cityRadiusKm=cityRadiusFromBBox(r.bbox,lat,lon);
    state.longitude=lon;state.latitude=lat;state.searchStatus=`City wheel centered on ${r.name}`;
  }else{
    state.longitude=lon;state.latitude=lat;state.searchStatus=`Blue location dot set to ${r.name}`;
  }
  state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);state.streetIndex=[];state.streetIndexStatus='';
  const oldTz=state.timeZone;state.timeZone=lookupTimeZone(state.cityLatitude,state.cityLongitude);try{const instant=zonedInputToDate(state.localDateTime,oldTz);state.localDateTime=toZonedInput(instant,state.timeZone)}catch{}
  state.searchResults=[];calculateTransit();
}

async function initEngine(){
  try{
    state.engineStatus='loading';state.engineMessage='Loading Swiss Ephemeris…';
    const mod=await import('https://cdn.jsdelivr.net/gh/prolaxu/swisseph-wasm@v0.1.0/src/swisseph.js');
    const SwissEph=mod.default;
    if(!SwissEph)throw new Error('Swiss Ephemeris module did not provide a default export');
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
    const houses=swe.houses(jd,+state.cityLatitude,+state.cityLongitude,'P');
    const tropicalAsc=houses?.ascmc?.[0] ?? houses?.ascendant ?? houses?.cusps?.[1] ?? houses?.cusps?.[0];
    if(!Number.isFinite(tropicalAsc))throw new Error('Could not calculate Ascendant');
    const ascendant=norm(tropicalAsc-aya);
    const wholeSignStart=Math.floor(ascendant/30)*30;
    const wholeSignCusps=Array.from({length:12},(_,i)=>norm(wholeSignStart+i*30));
    state.transit={jd,utc:d.toISOString(),ayanamsa:aya,ascendant,descendant:norm(ascendant+180),mc:houses?.ascmc?.[1],wholeSignCusps,planets};
    state.engineStatus='ready';state.engineMessage='Swiss Ephemeris ready · Lahiri sidereal · mean node';state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);
  }catch(err){console.error(err);state.engineStatus='error';state.engineMessage=`Calculation error: ${err.message}`}
  render();
}

function wheel(){
  const asc=activeAsc(),rot=90-asc,cx=350,cy=350;
  let defs=`<defs><radialGradient id="core"><stop offset="0" stop-color="#161b2b" stop-opacity=".50"/><stop offset="1" stop-color="#090b12" stop-opacity=".28"/></radialGradient><filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  let s=`<svg class="wheel" viewBox="0 0 700 700">${defs}<circle cx="350" cy="350" r="336" fill="url(#core)" stroke="#606a8d" stroke-opacity=".40" stroke-width="2"/>`;
  const hues=[8,31,56,108,145,174,201,229,255,278,309,338];
  SIGNS.forEach((n,i)=>{const st=i*30+rot,en=st+30,mid=st+15,[x,y]=point(cx,cy,286,mid);s+=`<path d="${arcPath(cx,cy,248,325,st,en)}" fill="hsl(${hues[i]} 74% 48% / .29)" stroke="#d7dcf2" stroke-opacity=".10"/><text x="${x}" y="${y-7}" text-anchor="middle" class="sign-glyph">${SIGN_GLYPHS[i]}</text><text x="${x}" y="${y+18}" text-anchor="middle" class="sign-name">${n}</text>`});
  NAKSHATRAS.forEach((n,i)=>{const st=i*(360/27)+rot,en=st+360/27,hue=nakHue(i),mid=(st+en)/2,gov=planetsInNak(i);s+=`<path d="${arcPath(cx,cy,164,246,st,en)}" fill="hsl(${hue} 56% 38% / ${gov.length?'.38':(i%2?'.24':'.20')})" stroke="#d6dcf5" stroke-opacity=".19" stroke-width=".8"/>`;s+=radialLabel(n,cx,cy,236,mid);if(gov.length){const [gx,gy]=point(cx,cy,210,mid);s+=`<g class="nak-governors" transform="translate(${gx} ${gy})"><rect x="-${Math.max(12,gov.length*10)}" y="-10" width="${Math.max(24,gov.length*20)}" height="20" rx="10" fill="#080b12" fill-opacity=".76" stroke="${nakColor(i,.92)}" stroke-width="1"/>${gov.map((p,k)=>`<text x="${(k-(gov.length-1)/2)*17}" y="6" text-anchor="middle" class="governor-glyph" style="fill:${nakColor(i,.98)}">${p.glyph}</text>`).join('')}</g>`}});
  for(let i=0;i<108;i++){const a=i*(360/108)+rot,p1=point(cx,cy,154,a),p2=point(cx,cy,i%4===0?164:160,a);s+=`<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#d9def0" stroke-opacity="${i%4===0?'.32':'.13'}" stroke-width="${i%4===0?'.8':'.42'}"/>`}
  for(let i=0;i<12;i++){const a=i*30+90,p1=point(cx,cy,80,a),p2=point(cx,cy,164,a),[hx,hy]=point(cx,cy,108,a+15);s+=`<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#dfe6ff" stroke-opacity=".48" stroke-width="1.2"/><text x="${hx}" y="${hy+5}" text-anchor="middle" class="house-number">H${i+1}</text>`}
  s+=`<circle cx="350" cy="350" r="162" fill="#080a10" fill-opacity=".15" stroke="#8d98bd" stroke-opacity=".24"/><circle cx="350" cy="350" r="78" fill="#111827" fill-opacity=".13" stroke="#aab5d9" stroke-opacity=".22"/><circle cx="350" cy="350" r="5" fill="#ffd166" filter="url(#softGlow)"/>`;
  for(const asp of aspectPairs()){const a1=asp.a.longitude+rot,a2=asp.b.longitude+rot,[x1,y1]=point(cx,cy,128,a1),[x2,y2]=point(cx,cy,128,a2);s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="aspect-line aspect-${asp.type}"/>`}
  ['N','NE','E','SE','S','SW','W','NW'].forEach((d,i)=>{const[x,y]=point(cx,cy,346,i*45);s+=`<text x="${x}" y="${y+6}" text-anchor="middle" class="${d==='E'?'dir east':'dir'}">${d}</text>`});
  s+=`<text x="637" y="338" text-anchor="middle" class="asc-label">ASC</text><text x="63" y="338" text-anchor="middle" class="dsc-label">DSC</text>`;
  activePlanets().forEach((p)=>{const angle=p.longitude+rot,[x,y]=point(cx,cy,128,angle),nak=nakInfo(p.longitude),color=nakColor(nak.index,.98);s+=`<g class="planet-node" data-title="${esc(p.name)} ${esc(formatLon(p.longitude))} · ${esc(nak.name)}"><circle cx="${x}" cy="${y}" r="15" fill="#101521" fill-opacity=".76" stroke="${color}" stroke-width="2"/><text x="${x}" y="${y+7}" text-anchor="middle" class="planet-glyph" style="fill:${color}">${p.glyph}</text></g>`});
  return s+'</svg>';
}

function transitTable(){
  if(!state.transit)return `<div class="empty-state">Calculate a live transit to replace the demonstration planet placements.</div>`;
  return `<div class="transit-table">${state.transit.planets.map(p=>`<div class="transit-row"><b>${p.glyph} ${p.name}${p.retrograde?' ℞':''}</b><span>${formatLon(p.longitude)}</span><span>${p.name==='Rahu'||p.name==='Ketu'?p.name:p.name} · ${p.name?`${p.name}`:''}</span><span>${p.name==='Rahu'||p.name==='Ketu'?`${p.name==='Rahu'?'Mean node':'Opposite mean node'}`:`${p.speed.toFixed(3)}°/day`}</span><small>${p.name==='Rahu'||p.name==='Ketu'?`${nakInfo(p.longitude).name} · Pada ${nakInfo(p.longitude).pada}`:`${p.name?`${nakInfo(p.longitude).name} · Pada ${nakInfo(p.longitude).pada}`:''}`}</small></div>`).join('')}</div>`;
}

function profileView(){const p=state.profile,pr=p.planetRoles[state.selectedPlanet]||[],hr=p.houseRoles[state.selectedHouse]||[];return `<div class="grid two"><section class="panel"><span class="eyebrow">PROFILE MODE</span><h2>Build your astrology profile</h2><div class="segmented">${[['automatic','Calculate My Chart'],['manual','Build Manually'],['quick','Quick Reading']].map(([m,l])=>`<button data-mode="${m}" class="${p.mode===m?'active':''}">${l}</button>`).join('')}</div><h3>Manual Ascendant</h3><div class="form-grid"><label>Sign<select id="ascSign">${SIGNS.map(x=>`<option ${x===p.ascSign?'selected':''}>${x}</option>`).join('')}</select></label><label>Degree<input id="ascDegree" type="number" min="0" max="29" value="${p.ascDegree}"></label><label>Minute<input id="ascMinute" type="number" min="0" max="59" value="${p.ascMinute}"></label><label>Second<input id="ascSecond" type="number" min="0" max="59" value="${p.ascSecond}"></label></div><div class="status-line">Manual ASC: <b>${p.ascSign} ${p.ascDegree}° ${p.ascMinute}′ ${p.ascSecond}″</b></div></section><section class="panel"><span class="eyebrow">PERSONAL MEANINGS</span><h2>Planet & house roles</h2><div class="planet-picker">${PLANETS.map(([n,g])=>`<button data-planet="${n}" class="${state.selectedPlanet===n?'selected':''}"><span>${g}</span>${n}</button>`).join('')}</div><div class="tag-editor"><div class="tag-title">${state.selectedPlanet} roles</div><div class="tags">${pr.map((x,i)=>`<button class="tag" data-remove-planet="${i}">${esc(x)} ×</button>`).join('')}</div><div class="add-row"><input id="planetRoleInput" placeholder="e.g. ASC Lord, 5th Lord"><button id="addPlanetRole">+ Add</button></div></div><div class="house-picker top-gap">${Array.from({length:12},(_,i)=>i+1).map(n=>`<button data-house="${n}" class="${state.selectedHouse===n?'selected':''}">H${n}</button>`).join('')}</div><div class="tag-editor"><div class="tag-title">House ${state.selectedHouse} meanings</div><div class="tags">${hr.map((x,i)=>`<button class="tag" data-remove-house="${i}">${esc(x)} ×</button>`).join('')}</div><div class="add-row"><input id="houseRoleInput" placeholder="e.g. home business, children"><button id="addHouseRole">+ Add</button></div></div></section></div>`}

function climateView(){const p=state.profile,t=state.transit;return `<div class="climate-layout"><section class="panel controls"><span class="eyebrow">PERSONAL CLIMATE SCOPE</span><h2>Fixed city climate wheel</h2><div class="engine ${state.engineStatus}"><span class="engine-dot"></span>${esc(state.engineMessage)}</div>${state.maptilerKey?'':`<div class="notice">Map search is not configured. Add your MapTiler key under <b>Settings</b>.</div>`}<div class="search-row"><input id="placeSearch" placeholder="Choose a city, neighborhood, street or address"><button id="searchPlace" class="action primary compact">Search</button></div>${state.searchStatus?`<div class="search-status">${esc(state.searchStatus)}</div>`:''}${state.searchResults.length?`<div class="search-results">${state.searchResults.map((r,i)=>`<button data-search-result="${i}"><b>${esc(r.name)}</b><small>${['place','municipality','city','town'].includes(String(r.type).toLowerCase())?'sets city epicenter':'moves blue location dot'} · ${esc(r.type||'place')}</small></button>`).join('')}</div>`:''}<label>Blue-dot latitude<input id="latitude" type="number" step="0.000001" min="-90" max="90" value="${state.latitude}"></label><label>Blue-dot longitude<input id="longitude" type="number" step="0.000001" min="-180" max="180" value="${state.longitude}"></label><button id="useLocation" class="action secondary">Use device location for blue dot</button><button id="centerMap" class="action secondary">Move blue dot to coordinates</button><label>Location local date & time<input id="localDateTime" type="datetime-local" value="${state.localDateTime}"></label><div class="help-note">Time zone: ${esc(state.timeZone)} · UTC used internally: ${state.transit?esc(state.transit.utc.replace('T',' ').slice(0,16)+' UTC'):'calculated on transit'}</div><button id="useNow" class="action secondary">Use current local time</button><button id="calculate" class="action primary" ${state.engineStatus==='loading'?'disabled':''}>Calculate Live Transit</button><label>Wheel Ascendant<select id="ascSource"><option value="live" ${state.useLiveAsc?'selected':''}>Live calculated ASC</option><option value="manual" ${!state.useLiveAsc?'selected':''}>Manual profile ASC</option></select></label><label>View mode<select id="scale">${['City','Neighborhood','Street'].map(x=>`<option ${x===state.scale?'selected':''}>${x}</option>`).join('')}</select></label><div class="metric"><span>City epicenter</span><b>${esc(state.cityName)} · ${(+state.cityLatitude).toFixed(5)}, ${(+state.cityLongitude).toFixed(5)}</b></div><div class="metric"><span>Fixed city-wheel radius</span><b>${cityRadiusLabel()}</b></div><div class="metric"><span>Active Ascendant</span><b>${formatLon(activeAsc())}</b></div>${t?`<div class="metric"><span>Lahiri ayanamsa</span><b>${t.ayanamsa.toFixed(4)}°</b></div><div class="metric"><span>Node</span><b>Mean Rahu/Ketu</b></div>`:''}<div class="metric"><span>Blue location dot</span><b>${(+state.latitude).toFixed(5)}, ${(+state.longitude).toFixed(5)}</b></div><div class="metric"><span>Compass rule</span><b>ASC East · DSC West</b></div><div class="notice">The wheel is geographically anchored to the city center and keeps the same physical span. City / Neighborhood / Street now change only the map zoom. The blue dot moves independently through the fixed wheel.</div></section><section class="panel wheel-panel"><div class="map-toolbar"><button id="fullscreenMap" class="action secondary compact">⛶ Fullscreen map</button></div><div id="mapFullscreenShell" class="fullscreen-shell"><aside class="fullscreen-street-index"><div class="street-index-title"><div><span class="eyebrow">NAKSHATRA STREET INDEX</span><b>Zodiac · Nakshatra · Transit governors · Streets</b></div><button id="refreshStreetIndex" class="mini-button" title="Refresh streets">↻</button></div><div id="streetIndexStatus" class="street-index-status">${esc(state.streetIndexStatus||'')}</div><div id="streetIndexBody" class="street-index-body">${streetIndexHTML()}</div></aside><div class="map-wheel-stage"><div id="climateMap" class="climate-map" aria-label="Personal Climate map"></div><button id="exitFullscreenMap" class="fullscreen-exit" title="Exit fullscreen">×</button></div></div><div class="wheel-status">Fixed city wheel · ${esc(state.cityName)} · radius ${cityRadiusLabel()} · ${state.scale} view</div></section></div><section class="panel transit-panel"><div class="panel-head"><div><span class="eyebrow">BLUE DOT ANALYSIS</span><h2>Current geographic climate sector</h2></div></div><div id="locationAnalysis">${locationAnalysisCard()}</div></section><section class="panel transit-panel"><div class="panel-head"><div><span class="eyebrow">CALCULATED POSITIONS</span><h2>Transit details</h2></div></div>${transitTable()}</section>`}

function horoscopeView(){return `<div class="grid two"><section class="panel hero-panel"><span class="eyebrow">DAILY HOROSCOPE</span><h1>Structured Vedic forecasting</h1><p>The forecast layer will consume calculated transit facts, your custom planet/house roles, nakshatras, house lords, Vedic aspects and Bhavat Bhavam. We are keeping interpretation downstream from the astronomy so the prose cannot invent planet positions.</p></section><section class="panel"><h2>Life areas</h2><div class="life-grid">${['Daily Overview','Self & Direction','Home & Family','Relationships','Career & Work','Money & Earning','Health & Vitality','Travel','Neighbors & Local Activity','Creativity & Children','Spiritual Life','Personal Climate'].map((x,i)=>`<button><span>${String(i+1).padStart(2,'0')}</span>${x}</button>`).join('')}</div></section></div>`}

async function testMapKey(){
  if(!state.maptilerKey){state.mapKeyTest='No key saved.';render();return}
  state.mapKeyTest='Testing this deployment…';render();
  try{
    const fwd=`https://api.maptiler.com/geocoding/Las%20Vegas.json?limit=1&key=${encodeURIComponent(state.maptilerKey)}`;
    const rev=`https://api.maptiler.com/geocoding/-115.1398,36.1699.json?types=road&limit=1&key=${encodeURIComponent(state.maptilerKey)}`;
    const [a,b]=await Promise.all([fetch(fwd),fetch(rev)]);
    if(a.ok&&b.ok)state.mapKeyTest=`Key works for search and street lookup from ${window.location.host}.`;
    else state.mapKeyTest=`Key test failed: search HTTP ${a.status}, street lookup HTTP ${b.status}. Current host: ${window.location.host}.`;
  }catch(e){state.mapKeyTest=`Key test error: ${e.message}`}
  render();
}

function settingsView(){
  return `<div class="grid two">
    <section class="panel">
      <span class="eyebrow">CALCULATION SPECIFICATION</span>
      <h2>Current rules</h2>
      <div class="settings-grid">
        <div><span>Zodiac</span><b>Sidereal</b></div>
        <div><span>Ayanamsa</span><b>Lahiri</b></div>
        <div><span>Nodes</span><b>Mean Rahu/Ketu</b></div>
        <div><span>Houses</span><b>Whole Sign</b></div>
        <div><span>Outer planets</span><b>Uranus · Neptune · Pluto</b></div>
        <div><span>Wheel orientation</span><b>ASC East · DSC West</b></div>
      </div>
    </section>
    <section class="panel">
      <span class="eyebrow">MAP SETTINGS</span>
      <h2>Map key</h2>
      ${state.maptilerKey
        ? `<div class="status-line"><b>Map key saved in this browser.</b></div><button id="testMapKey" class="action primary">Test key on this deployment</button><button id="changeMapKey" class="action secondary">Replace saved key</button>`
        : `<label>MapTiler API key<input id="maptilerKey" type="password" autocomplete="off" placeholder="Paste MapTiler key"></label><button id="saveMapKey" class="action primary">Save map key</button>`}
      ${state.mapKeyTest?`<div class="status-line">${esc(state.mapKeyTest)}</div>`:''}
      <div class="status-line">Allowed HTTP Origin hostname:<br><b>${esc(window.location.host)}</b></div>
      <p>Add this exact hostname to MapTiler Allowed HTTP Origins. A stable production domain is better than a one-off deployment hostname.</p>
    </section>
  </div>`;
}

function wheelPixelDiameter(map){
  const center=L.latLng(state.cityLatitude,state.cityLongitude);
  const edge=destinationPoint(state.cityLatitude,state.cityLongitude,90,cityRadiusKm());
  const a=map.latLngToLayerPoint(center),b=map.latLngToLayerPoint([edge.lat,edge.lon]);
  return Math.max(140,Math.min(5000,Math.abs(b.x-a.x)*2));
}
function updateGeographicWheel(){
  if(!state.map||!window.L)return;
  const diameter=wheelPixelDiameter(state.map);
  const icon=L.divIcon({className:'geo-wheel-icon',html:`<div class="geo-wheel-svg" style="width:${diameter}px;height:${diameter}px">${wheel()}</div>`,iconSize:[diameter,diameter],iconAnchor:[diameter/2,diameter/2]});
  if(state.mapWheelMarker){state.mapWheelMarker.setLatLng([state.cityLatitude,state.cityLongitude]);state.mapWheelMarker.setIcon(icon)}else{state.mapWheelMarker=L.marker([state.cityLatitude,state.cityLongitude],{icon,interactive:false,pane:'overlayPane'}).addTo(state.map)}
}
function viewCenter(){return state.scale==='City'?[state.cityLatitude,state.cityLongitude]:[state.latitude,state.longitude]}
function initClimateMap(){
  if(state.tab!=='climate'||!window.L)return;
  const el=document.querySelector('#climateMap');if(!el)return;
  if(state.map){try{state.map.remove()}catch{}state.map=null;state.mapMarker=null;state.mapPointMarker=null;state.mapEpicenterMarker=null;state.mapWheelMarker=null}
  const zoom=scaleConfig().zoom;state.mapZoom=zoom;
  const map=L.map(el,{zoomControl:true,attributionControl:true,worldCopyJump:true}).setView(viewCenter(),zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  state.map=map;
  state.mapEpicenterMarker=L.circleMarker([state.cityLatitude,state.cityLongitude],{radius:5,weight:2,color:'#ffd166',fillColor:'#ffd166',fillOpacity:.9}).addTo(map).bindTooltip(`${state.cityName} epicenter`);
  state.mapPointMarker=L.circleMarker([state.latitude,state.longitude],{radius:7,weight:2,color:'#7ec8ff',fillColor:'#3b82f6',fillOpacity:1}).addTo(map).bindTooltip('Blue location dot');
  state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);
  updateGeographicWheel();
  map.on('zoomend moveend',()=>updateGeographicWheel());
  map.on('click',e=>{
    state.latitude=+e.latlng.lat;state.longitude=+e.latlng.lng;state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);
    state.mapPointMarker.setLatLng(e.latlng);
    const target=document.querySelector('#locationAnalysis');if(target)target.innerHTML=locationAnalysisCard();
  });
  setTimeout(()=>{map.invalidateSize();updateGeographicWheel()},50);
}
function moveMapToState(){
  if(!state.map)return;
  state.map.setView(viewCenter(),scaleConfig().zoom??state.map.getZoom());
  if(state.mapPointMarker)state.mapPointMarker.setLatLng([state.latitude,state.longitude]);
  if(state.mapEpicenterMarker)state.mapEpicenterMarker.setLatLng([state.cityLatitude,state.cityLongitude]);
  updateGeographicWheel();
}

function render(){document.querySelector('#app').innerHTML=`<div class="app-shell"><aside><div class="brand"><div class="brand-mark">☸</div><div><b>VEDIC</b><span>CLIMATE SCOPE</span></div></div><nav>${[['climate','◉','Climate Scope'],['horoscope','✦','Daily Horoscope'],['profile','◎','Profile'],['settings','⚙','Settings']].map(([t,i,l])=>`<button data-tab="${t}" class="${state.tab===t?'active':''}"><span>${i}</span>${l}</button>`).join('')}</nav><button id="reset" class="reset">Reset saved profile</button></aside><main><header><div><span class="eyebrow">SIDEREAL ASTROLOGY PLATFORM</span><h1>${state.tab==='climate'?'Personal Climate Scope':state.tab==='profile'?'Personal Astrology Profile':state.tab==='horoscope'?'Daily Vedic Horoscope':'Calculation Settings'}</h1></div><div class="pill">Lahiri · 27 Nakshatras · Bhavat Bhavam</div></header>${state.tab==='profile'?profileView():state.tab==='climate'?climateView():state.tab==='horoscope'?horoscopeView():settingsView()}</main></div>`;bind();initClimateMap()}

function bind(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render()});
  const reset=document.querySelector('#reset');if(reset)reset.onclick=()=>{state.profile=cloneDefaultProfile();save();render()};
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.profile.mode=b.dataset.mode;save();render()});
  document.querySelectorAll('[data-planet]').forEach(b=>b.onclick=()=>{state.selectedPlanet=b.dataset.planet;render()});
  document.querySelectorAll('[data-house]').forEach(b=>b.onclick=()=>{state.selectedHouse=+b.dataset.house;render()});
  ['ascSign','ascDegree','ascMinute','ascSecond'].forEach(id=>{const e=document.querySelector('#'+id);if(e)e.onchange=()=>{state.profile[id]=e.value;save();render()}});
  const scale=document.querySelector('#scale');if(scale)scale.onchange=()=>{state.scale=scale.value;state.streetIndex=[];state.streetIndexStatus='';render()};
  const ascSource=document.querySelector('#ascSource');if(ascSource)ascSource.onchange=()=>{state.useLiveAsc=ascSource.value==='live';render()};
  const lat=document.querySelector('#latitude');if(lat)lat.onchange=()=>{state.latitude=+lat.value;state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);moveMapToState();render()};
  const lon=document.querySelector('#longitude');if(lon)lon.onchange=()=>{state.longitude=+lon.value;state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);moveMapToState();render()};
  const dt=document.querySelector('#localDateTime');if(dt)dt.onchange=()=>state.localDateTime=dt.value;
  const nowBtn=document.querySelector('#useNow');if(nowBtn)nowBtn.onclick=()=>{state.localDateTime=toZonedInput(new Date(),state.timeZone);render()};
  const saveKey=document.querySelector('#saveMapKey');if(saveKey)saveKey.onclick=()=>{const e=document.querySelector('#maptilerKey');const v=(e?.value||'').trim();if(v){state.maptilerKey=v;safeSet('maptilerKey',v);render()}};
  const changeKey=document.querySelector('#changeMapKey');if(changeKey)changeKey.onclick=()=>{state.maptilerKey='';state.mapKeyTest='';try{localStorage.removeItem('maptilerKey')}catch{};render()};
  const testKey=document.querySelector('#testMapKey');if(testKey)testKey.onclick=testMapKey;
  const searchBtn=document.querySelector('#searchPlace');if(searchBtn)searchBtn.onclick=searchPlace;
  const searchInput=document.querySelector('#placeSearch');if(searchInput)searchInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchPlace()}};
  const fs=document.querySelector('#fullscreenMap');if(fs)fs.onclick=enterMapFullscreen;
  const fsExit=document.querySelector('#exitFullscreenMap');if(fsExit)fsExit.onclick=exitMapFullscreen;
  const refreshStreet=document.querySelector('#refreshStreetIndex');if(refreshStreet)refreshStreet.onclick=()=>buildStreetIndex(true);
  document.onfullscreenchange=()=>{if(state.map)setTimeout(()=>state.map.invalidateSize(),80);if(document.fullscreenElement?.id==='mapFullscreenShell')buildStreetIndex(false)};
  document.querySelectorAll('[data-search-result]').forEach(b=>b.onclick=()=>selectSearchResult(+b.dataset.searchResult));
  const loc=document.querySelector('#useLocation');if(loc)loc.onclick=()=>{if(!navigator.geolocation){state.engineMessage='Browser geolocation is unavailable.';render();return}loc.disabled=true;loc.textContent='Locating…';navigator.geolocation.getCurrentPosition(pos=>{state.latitude=+pos.coords.latitude.toFixed(6);state.longitude=+pos.coords.longitude.toFixed(6);state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);render()},err=>{state.engineMessage=`Location not available: ${err.message}`;render()},{enableHighAccuracy:true,timeout:10000})};
  const centerMap=document.querySelector('#centerMap');if(centerMap)centerMap.onclick=()=>{const a=document.querySelector('#latitude'),o=document.querySelector('#longitude');state.latitude=+a.value;state.longitude=+o.value;state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);moveMapToState();render()};
  const calc=document.querySelector('#calculate');if(calc)calc.onclick=()=>{const a=document.querySelector('#latitude'),o=document.querySelector('#longitude'),d=document.querySelector('#localDateTime');state.latitude=+a.value;state.longitude=+o.value;state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);state.localDateTime=d.value;calculateTransit()};
  const ap=document.querySelector('#addPlanetRole');if(ap)ap.onclick=()=>{const e=document.querySelector('#planetRoleInput'),v=e.value.trim();if(v){(state.profile.planetRoles[state.selectedPlanet]??=[]).push(v);save();render()}};
  document.querySelectorAll('[data-remove-planet]').forEach(b=>b.onclick=()=>{state.profile.planetRoles[state.selectedPlanet].splice(+b.dataset.removePlanet,1);save();render()});
  const ah=document.querySelector('#addHouseRole');if(ah)ah.onclick=()=>{const e=document.querySelector('#houseRoleInput'),v=e.value.trim();if(v){(state.profile.houseRoles[state.selectedHouse]??=[]).push(v);save();render()}};
  document.querySelectorAll('[data-remove-house]').forEach(b=>b.onclick=()=>{state.profile.houseRoles[state.selectedHouse].splice(+b.dataset.removeHouse,1);save();render()});
}

try{render()}catch(err){console.error('Initial render failed',err);const root=document.querySelector('#app');if(root)root.innerHTML=`<main style="padding:24px;font-family:Arial,sans-serif;color:#fff;background:#0b0e17;min-height:100vh"><h1>Vedic Climate Scope</h1><p>The interface hit a browser startup error.</p><pre style="white-space:pre-wrap;color:#ffb4b4">${esc(err?.message||err)}</pre></main>`}
initEngine();
