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
let state={tab:'climate',scale:'City',selectedPlanet:'Mercury',selectedHouse:1,profile:loadProfile(),engineStatus:'loading',engineMessage:'Loading Swiss Ephemeris…',swe:null,transit:null,latitude:DEFAULT_LAT,longitude:DEFAULT_LON,cityLatitude:DEFAULT_LAT,cityLongitude:DEFAULT_LON,cityName:'Las Vegas',cityRadiusKm:38,timeZone:defaultTimeZone,localDateTime:defaultLocalDateTime,useLiveAsc:true,map:null,mapMarker:null,mapPointMarker:null,mapEpicenterMarker:null,mapWheelMarker:null,mapZoom:11,maptilerKey:safeGet('maptilerKey')||'',searchResults:[],searchStatus:'',selectedMapPoint:null,streetIndex:[],streetIndexStatus:'',streetIndexLoading:false,roadWays:[],roadNetwork:[],roadNetworkStatus:'',roadNetworkLoading:false,roadNetworkLayer:null,roadNetworkCount:0,mapKeyTest:'',horoscopeArea:'Overview'};
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
const GANDANTA_JUNCTIONS=[
  {boundary:0,label:'Revati → Ashwini',waterSign:'Pisces',fireSign:'Aries',waterNak:'Revati',fireNak:'Ashwini'},
  {boundary:120,label:'Ashlesha → Magha',waterSign:'Cancer',fireSign:'Leo',waterNak:'Ashlesha',fireNak:'Magha'},
  {boundary:240,label:'Jyeshtha → Mula',waterSign:'Scorpio',fireSign:'Sagittarius',waterNak:'Jyeshtha',fireNak:'Mula'}
];
const GANDANTA_CORE_DEG=0.8;
const GANDANTA_BROAD_DEG=10/3;
function signedDelta(lon,boundary){let d=norm(lon-boundary);if(d>180)d-=360;return d}
function gandantaInfo(lon){
  const x=norm(lon);let best=null;
  for(const j of GANDANTA_JUNCTIONS){const delta=signedDelta(x,j.boundary),abs=Math.abs(delta);if(abs<=GANDANTA_BROAD_DEG&&(!best||abs<best.distance)){best={...j,delta,distance:abs,core:abs<=GANDANTA_CORE_DEG,broad:true,side:delta<0?'water-end':'fire-start'}}}
  return best;
}
function gandantaAdvice(g){
  if(!g)return null;
  if(g.core)return `Core Gandanta: treat this as a concentrated transition zone. Favor review, closure, contingency planning, and extra verification before irreversible moves.`;
  return `Gandanta transition band: allow more transition time, double-check logistics and communication, and avoid forcing a clean outcome before conditions settle.`;
}
function direction8(bearing){const dirs=['N','NE','E','SE','S','SW','W','NW'];return dirs[Math.round(norm(bearing)/45)%8]}
function bearingForLongitude(lon){return norm(lon-activeAsc()+90)}
function cityRadiusFromBBox(bbox,lat,lon){if(!bbox||bbox.length<4)return 38;const pts=[[bbox[1],bbox[0]],[bbox[1],bbox[2]],[bbox[3],bbox[0]],[bbox[3],bbox[2]]];return Math.max(...pts.map(([a,o])=>distanceKm(lat,lon,a,o)))*1.08}
function planetsInNak(index){return activePlanets().filter(p=>nakInfo(p.longitude).index===index)}
function aspectPairs(){const ps=activePlanets(),aspects=[{deg:0,name:'conjunction'},{deg:60,name:'sextile'},{deg:90,name:'square'},{deg:120,name:'trine'},{deg:180,name:'opposition'}],out=[];for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const d=angularDiff(ps[i].longitude,ps[j].longitude);const hit=aspects.find(a=>Math.abs(d-a.deg)<=4);if(hit)out.push({a:ps[i],b:ps[j],type:hit.name,orb:Math.min(...aspects.map(x=>Math.abs(d-x.deg)))})}return out}
function directedArc(from,to){return norm(to-from)}
function vedicAspectAngles(name){
  const base=[{deg:180,name:'7th aspect'}];
  if(name==='Mars')return [...base,{deg:90,name:'4th aspect'},{deg:210,name:'8th aspect'}];
  if(name==='Jupiter')return [...base,{deg:120,name:'5th aspect'},{deg:240,name:'9th aspect'}];
  if(name==='Saturn')return [...base,{deg:60,name:'3rd aspect'},{deg:270,name:'10th aspect'}];
  return base
}
function vedicDrishtiForPlanet(name,orb=5){
  const source=planetByName(name);if(!source)return {casts:[],receives:[]};
  const ps=activePlanets(),casts=[],receives=[];
  for(const target of ps){
    if(target.name===name)continue;
    for(const asp of vedicAspectAngles(name)){const d=directedArc(source.longitude,target.longitude),o=Math.abs(d-asp.deg);if(o<=orb)casts.push({from:source,to:target,type:asp.name,orb:o})}
    for(const asp of vedicAspectAngles(target.name)){const d=directedArc(target.longitude,source.longitude),o=Math.abs(d-asp.deg);if(o<=orb)receives.push({from:target,to:source,type:asp.name,orb:o})}
  }
  return {casts:casts.sort((a,b)=>a.orb-b.orb),receives:receives.sort((a,b)=>a.orb-b.orb)}
}

const HOUSE_THEMES={
1:['self-direction','initiative','identity'],2:['money-values','resources','speech'],3:['communication','short travel','neighbors'],4:['home-family','roots','emotional security'],5:['creativity-romance','children','speculation'],6:['work-routines','service','obstacles'],7:['relationships-partnerships','agreements','other people'],8:['shared resources','private matters','change'],9:['long travel','beliefs','higher learning'],10:['career-public life','responsibility','status'],11:['income-gains','networks','goals'],12:['retreat-expenses','foreign places','closure']
};
const SIGN_LORDS={Aries:'Mars',Taurus:'Venus',Gemini:'Mercury',Cancer:'Moon',Leo:'Sun',Virgo:'Mercury',Libra:'Venus',Scorpio:'Mars',Sagittarius:'Jupiter',Capricorn:'Saturn',Aquarius:'Saturn',Pisces:'Jupiter'};
const OWN_SIGNS={Sun:['Leo'],Moon:['Cancer'],Mars:['Aries','Scorpio'],Mercury:['Gemini','Virgo'],Jupiter:['Sagittarius','Pisces'],Venus:['Taurus','Libra'],Saturn:['Capricorn','Aquarius']};
const MOOLATRIKONA={Sun:'Leo',Moon:'Taurus',Mars:'Aries',Mercury:'Virgo',Jupiter:'Sagittarius',Venus:'Libra',Saturn:'Aquarius'};
const EXALTATION={Sun:{sign:'Aries',degree:10},Moon:{sign:'Taurus',degree:3},Mars:{sign:'Capricorn',degree:28},Mercury:{sign:'Virgo',degree:15},Jupiter:{sign:'Cancer',degree:5},Venus:{sign:'Pisces',degree:27},Saturn:{sign:'Libra',degree:20}};
const DEBILITATION={Sun:{sign:'Libra',degree:10},Moon:{sign:'Scorpio',degree:3},Mars:{sign:'Cancer',degree:28},Mercury:{sign:'Pisces',degree:15},Jupiter:{sign:'Capricorn',degree:5},Venus:{sign:'Virgo',degree:27},Saturn:{sign:'Aries',degree:20}};
const NATURAL_RELATIONSHIPS={
Sun:{friends:['Moon','Mars','Jupiter'],neutral:['Mercury'],enemies:['Venus','Saturn']},
Moon:{friends:['Sun','Mercury'],neutral:['Mars','Jupiter','Venus','Saturn'],enemies:[]},
Mars:{friends:['Sun','Moon','Jupiter'],neutral:['Venus','Saturn'],enemies:['Mercury']},
Mercury:{friends:['Sun','Venus'],neutral:['Mars','Jupiter','Saturn'],enemies:['Moon']},
Jupiter:{friends:['Sun','Moon','Mars'],neutral:['Saturn'],enemies:['Mercury','Venus']},
Venus:{friends:['Mercury','Saturn'],neutral:['Mars','Jupiter'],enemies:['Sun','Moon']},
Saturn:{friends:['Mercury','Venus'],neutral:['Jupiter'],enemies:['Sun','Moon','Mars']}
};
const PLANET_NATURES={
Sun:{nature:'authoritative',keywords:['visibility','leadership','authority','clarity']},
Moon:{nature:'responsive',keywords:['public mood','movement','care','changeability']},
Mars:{nature:'forceful',keywords:['action','competition','heat','cutting through']},
Mercury:{nature:'analytical',keywords:['messages','commerce','traffic','coordination']},
Jupiter:{nature:'expansive',keywords:['growth','guidance','opportunity','institutions']},
Venus:{nature:'harmonizing',keywords:['attraction','exchange','comfort','social activity']},
Saturn:{nature:'restrictive',keywords:['delay','structure','labor','durability']},
Rahu:{nature:'amplifying',keywords:['novelty','intensity','technology','disruption']},
Ketu:{nature:'separating',keywords:['release','specialization','withdrawal','sharp insight']},
Uranus:{nature:'disruptive',keywords:['sudden change','innovation','breaks in routine']},
Neptune:{nature:'diffuse',keywords:['uncertainty','idealization','blurred boundaries']},
Pluto:{nature:'intensifying',keywords:['power','purging','deep change','pressure']}
};
const NAKSHATRA_DATA={
Ashwini:{deity:'Ashwini Kumaras',symbol:'Horse head',motivation:'Dharma',quality:'swift healing and initiation'},
Bharani:{deity:'Yama',symbol:'Yoni',motivation:'Artha',quality:'bearing pressure, restraint, and consequences'},
Krittika:{deity:'Agni',symbol:'Razor / flame',motivation:'Kama',quality:'purification, separation, and decisive clarity'},
Rohini:{deity:'Brahma',symbol:'Cart',motivation:'Moksha',quality:'growth, attraction, and material development'},
Mrigashira:{deity:'Soma',symbol:'Deer head',motivation:'Moksha',quality:'searching, curiosity, and movement'},
Ardra:{deity:'Rudra',symbol:'Teardrop',motivation:'Kama',quality:'disruption, release, and rebuilding'},
Punarvasu:{deity:'Aditi',symbol:'Bow / quiver',motivation:'Artha',quality:'return, restoration, and renewed opportunity'},
Pushya:{deity:'Brihaspati',symbol:'Udder / flower',motivation:'Dharma',quality:'support, nourishment, and duty'},
Ashlesha:{deity:'Nagas',symbol:'Serpent',motivation:'Dharma',quality:'binding, strategy, and concealed complexity'},
Magha:{deity:'Pitris',symbol:'Throne',motivation:'Artha',quality:'authority, legacy, and inherited structures'},
'Purva Phalguni':{deity:'Bhaga',symbol:'Hammock / bed',motivation:'Kama',quality:'pleasure, creativity, and social exchange'},
'Uttara Phalguni':{deity:'Aryaman',symbol:'Bed / patronage',motivation:'Moksha',quality:'agreements, patronage, and durable commitments'},
Hasta:{deity:'Savitar',symbol:'Hand',motivation:'Moksha',quality:'skill, handling, and practical control'},
Chitra:{deity:'Vishvakarma',symbol:'Jewel',motivation:'Kama',quality:'design, construction, and visible refinement'},
Swati:{deity:'Vayu',symbol:'Young shoot',motivation:'Artha',quality:'independence, movement, and negotiation'},
Vishakha:{deity:'Indra-Agni',symbol:'Triumphal arch',motivation:'Dharma',quality:'focus, competition, and goal pursuit'},
Anuradha:{deity:'Mitra',symbol:'Lotus',motivation:'Dharma',quality:'alliances, loyalty, and persistence'},
Jyeshtha:{deity:'Indra',symbol:'Earring / talisman',motivation:'Artha',quality:'seniority, protection, and high-stakes decisions'},
Mula:{deity:'Nirriti',symbol:'Roots',motivation:'Kama',quality:'root causes, dismantling, and deep investigation'},
'Purva Ashadha':{deity:'Apas',symbol:'Fan / tusk',motivation:'Moksha',quality:'advocacy, cleansing, and conviction'},
'Uttara Ashadha':{deity:'Vishvadevas',symbol:'Elephant tusk',motivation:'Moksha',quality:'endurance, responsibility, and lasting outcomes'},
Shravana:{deity:'Vishnu',symbol:'Ear',motivation:'Artha',quality:'listening, learning, routes, and information flow'},
Dhanishta:{deity:'Vasus',symbol:'Drum',motivation:'Dharma',quality:'resources, rhythm, coordination, and groups'},
Shatabhisha:{deity:'Varuna',symbol:'Empty circle',motivation:'Dharma',quality:'systems, isolation, diagnosis, and repair'},
'Purva Bhadrapada':{deity:'Aja Ekapada',symbol:'Front of bier',motivation:'Artha',quality:'intensity, ideals, and sharp transitions'},
'Uttara Bhadrapada':{deity:'Ahir Budhnya',symbol:'Back of bier',motivation:'Kama',quality:'depth, stabilization, and long-range consequences'},
Revati:{deity:'Pushan',symbol:'Fish / drum',motivation:'Moksha',quality:'guidance, completion, protection, and passage'}
};
const SIGN_TONES={Aries:'direct and fast-moving',Taurus:'steady and practical',Gemini:'mobile and information-heavy',Cancer:'protective and emotionally responsive',Leo:'visible and expressive',Virgo:'analytical and detail-focused',Libra:'relational and balance-seeking',Scorpio:'private and intense',Sagittarius:'expansive and exploratory',Capricorn:'structured and duty-focused',Aquarius:'social and unconventional',Pisces:'reflective and porous'};
const NAK_TONES={Ashwini:'quick starts and recovery',Bharani:'pressure, limits, and decisive choices',Krittika:'sorting, cutting away, and clarity',Rohini:'growth, comfort, and attraction',Mrigashira:'searching, movement, and curiosity',Ardra:'disruption, intensity, and clearing',Punarvasu:'return, repair, and renewal',Pushya:'support, nourishment, and responsibility',Ashlesha:'strategy, entanglement, and subtle motives',Magha:'authority, ancestry, and status','Purva Phalguni':'pleasure, creativity, and social ease','Uttara Phalguni':'agreements, support, and durable commitments',Hasta:'skill, handling, and practical control',Chitra:'design, refinement, and visible results',Swati:'independence, movement, and negotiation',Vishakha:'focus, ambition, and competing goals',Anuradha:'alliances, persistence, and loyalty',Jyeshtha:'seniority, protection, and high-pressure decisions',Mula:'root causes, removal, and deep change','Purva Ashadha':'advocacy, momentum, and conviction','Uttara Ashadha':'endurance, responsibility, and lasting outcomes',Shravana:'listening, learning, and information flow',Dhanishta:'resources, rhythm, and group activity',Shatabhisha:'distance, systems, and problem-solving','Purva Bhadrapada':'intensity, ideals, and sharp transitions','Uttara Bhadrapada':'stability, depth, and long-range perspective',Revati:'completion, guidance, and safe passage'};
const AREA_RULES={
'Overview':{houses:[1,4,7,10],label:'general activity'},
'Home':{houses:[4],label:'home and family'},
'Work':{houses:[10,6],label:'work and career'},
'Relationships':{houses:[7,5],label:'relationships'},
'Money':{houses:[2,11],label:'money and gains'},
'Travel':{houses:[3,9,12],label:'travel and movement'},
'Neighborhood':{houses:[3,4],label:'neighborhood activity'},
'Personal Climate':{houses:[1,4,7,10],label:'personal climate'}
};
function bhavatBhavamHouse(h){return ((h+h-2)%12)+1}
function uniquePhrases(items){const seen=new Set();return items.filter(x=>{const k=String(x).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(!k||seen.has(k))return false;seen.add(k);return true})}
function planetByName(name){return activePlanets().find(p=>p.name===name)}
function aspectsForPlanet(name){
  return aspectPairs().filter(x=>x.a.name===name||x.b.name===name).sort((a,b)=>a.orb-b.orb)
}
function planetClimateRecord(name){
  const p=planetByName(name); if(!p)return null;
  const sign=signForLongitude(p.longitude),nak=nakInfo(p.longitude),house=climateHouseForLongitude(p.longitude);
  return {...p,sign:sign.name,signDegree:sign.degree,nak,climateHouse:house,aspects:aspectsForPlanet(name),drishti:vedicDrishtiForPlanet(name)}
}
function strongestAspectForNames(names){
  const set=new Set(names.filter(Boolean));
  return aspectPairs().filter(x=>set.has(x.a.name)||set.has(x.b.name)).sort((x,y)=>x.orb-y.orb)[0]||null
}
function relationshipBetween(a,b){
  if(!a||!b||a===b)return null;
  const hit=aspectPairs().find(x=>(x.a.name===a&&x.b.name===b)||(x.a.name===b&&x.b.name===a));
  return hit||null
}
function strongestVedicDrishti(names){
  const wanted=new Set(names.filter(Boolean)),hits=[];
  for(const name of wanted){const d=vedicDrishtiForPlanet(name);hits.push(...d.casts.filter(x=>wanted.has(x.from.name)||wanted.has(x.to.name)),...d.receives.filter(x=>wanted.has(x.from.name)||wanted.has(x.to.name)))}
  const uniq=[];const seen=new Set();
  for(const h of hits.sort((a,b)=>a.orb-b.orb)){const k=`${h.from.name}|${h.to.name}|${h.type}`;if(!seen.has(k)){seen.add(k);uniq.push(h)}}
  return uniq[0]||null
}
function relationshipStatus(planet,hostLord){
  const rel=NATURAL_RELATIONSHIPS[planet];
  if(!rel||!hostLord||planet===hostLord)return planet===hostLord?'own':'unclassified';
  if(rel.friends.includes(hostLord))return 'friend';
  if(rel.enemies.includes(hostLord))return 'enemy';
  return 'neutral';
}
function dignityForRecord(rec){
  if(!rec||!OWN_SIGNS[rec.name])return {level:'supplemental',score:0,label:'supplemental planet'};
  const ex=EXALTATION[rec.name],de=DEBILITATION[rec.name],mt=MOOLATRIKONA[rec.name];
  if(ex?.sign===rec.sign)return {level:'exalted',score:4,label:`exalted in ${rec.sign}`};
  if(de?.sign===rec.sign)return {level:'debilitated',score:-4,label:`debilitated in ${rec.sign}`};
  if(mt===rec.sign)return {level:'moolatrikona',score:3,label:`moolatrikona sign ${rec.sign}`};
  if(OWN_SIGNS[rec.name].includes(rec.sign))return {level:'own',score:2,label:`own sign ${rec.sign}`};
  const host=SIGN_LORDS[rec.sign],rel=relationshipStatus(rec.name,host);
  if(rel==='friend')return {level:'friendly',score:1,label:`friend ${host}'s sign`};
  if(rel==='enemy')return {level:'enemy',score:-1,label:`enemy ${host}'s sign`};
  return {level:'neutral',score:0,label:`neutral ${host}'s sign`};
}
function angularClosenessToPeak(rec,table){
  const rule=table[rec?.name];if(!rule||rule.sign!==rec.sign)return null;
  return Math.abs(rec.signDegree-rule.degree);
}
function placementStrength(rec){
  if(!rec)return {score:0,reasons:[]};
  const dignity=dignityForRecord(rec),reasons=[dignity.label];
  let score=dignity.score;
  const exOrb=angularClosenessToPeak(rec,EXALTATION),deOrb=angularClosenessToPeak(rec,DEBILITATION);
  if(exOrb!==null&&exOrb<=5){score+=1;reasons.push(`near exaltation peak (${exOrb.toFixed(1)}°)`)}
  if(deOrb!==null&&deOrb<=5){score-=1;reasons.push(`near debilitation peak (${deOrb.toFixed(1)}°)`)}
  if(rec.retrograde){score+=.25;reasons.push('retrograde: intensified/reworked expression')}
  return {score,reasons,dignity};
}
function temporaryRelationship(a,b){
  if(!a||!b||a.name===b.name)return null;
  const signDistance=(Math.floor(norm(b.longitude-a.longitude)/30)+1);
  return [2,3,4,10,11,12].includes(signDistance)?'temporary friend':'temporary enemy';
}
function compoundRelationship(a,b){
  if(!a||!b||a.name===b.name)return 'same planet';
  const nat=relationshipStatus(a.name,b.name),temp=temporaryRelationship(a,b);
  const map={
    'friend|temporary friend':'great friend','friend|temporary enemy':'neutral',
    'neutral|temporary friend':'friend','neutral|temporary enemy':'enemy',
    'enemy|temporary friend':'neutral','enemy|temporary enemy':'bitter enemy',
    'own|temporary friend':'great friend','own|temporary enemy':'neutral'
  };
  return map[`${nat}|${temp}`]||`${nat}, ${temp}`;
}
function classicalInfluenceScore(rec){
  if(!rec)return 0;
  const strength=placementStrength(rec).score;
  const d=rec.drishti||{casts:[],receives:[]};
  const aspectWeight=(d.casts?.length||0)*.35+(d.receives?.length||0)*.25;
  return strength+aspectWeight+(rec.retrograde?.2:0);
}
function nakshatraDetail(name){return NAKSHATRA_DATA[name]||{deity:'—',symbol:'—',motivation:'—',quality:NAK_TONES[name]||'changing conditions'}}
function rankKeyPlanets(records){return records.filter(Boolean).map(rec=>({rec,score:classicalInfluenceScore(rec)})).sort((a,b)=>Math.abs(b.score)-Math.abs(a.score))}
function keyPlanetSummary(rec,label){
  if(!rec)return null;
  const cast=rec.drishti?.casts?.[0],received=rec.drishti?.receives?.[0],strength=placementStrength(rec);
  let tail=` · ${strength.dignity.label}`;
  if(cast)tail+=` · casts ${cast.type} to ${cast.to.name}`;
  if(received)tail+=` · receives ${received.type} from ${received.from.name}`;
  return `${label}: ${rec.name} in ${rec.sign} ${rec.signDegree.toFixed(1)}° · ${rec.nak.name} · Climate House ${rec.climateHouse}${rec.retrograde?' ℞':''}${tail}`
}
function areaEmphasis(a,area){
  const rule=AREA_RULES[area]||AREA_RULES.Overview, focus=rule.houses;
  if(focus.includes(a.climateHouse))return `This location directly activates the ${rule.label} houses in the climate wheel.`;
  const derived=bhavatBhavamHouse(a.climateHouse);
  if(focus.includes(derived))return `Bhavat Bhavam links Climate House ${a.climateHouse} back to ${rule.label} through House ${derived}.`;
  return `For ${rule.label}, this zone works indirectly through Climate House ${a.climateHouse} and its derived House ${derived}.`;
}
function manifestationPool(a,area){
  const h=a.climateHouse, tone=NAK_TONES[a.nak.name]||'changing circumstances', items=[];
  const houseMap={1:['taking initiative','changing your approach','being more visible'],2:['money decisions','purchases or resources','important conversations about value'],3:['messages or calls','short trips','neighbor or sibling interactions'],4:['home matters','family conversations','changes in comfort or living conditions'],5:['creative activity','romantic attention','children or leisure plans'],6:['work tasks','scheduling issues','problem-solving around obligations'],7:['meetings or agreements','relationship dynamics','other people taking the lead'],8:['shared-money matters','private information','a situation requiring deeper investigation'],9:['travel planning','study or guidance','big-picture decisions'],10:['career decisions','public responsibilities','contact with authority'],11:['income opportunities','friends or networks','progress toward a goal'],12:['expenses or delays','quiet work behind the scenes','foreign or distant connections']};
  items.push(...(houseMap[h]||[]));
  if(area==='Home')items.unshift('a home or family matter becoming more noticeable');
  if(area==='Work')items.unshift('a work responsibility or decision becoming more active');
  if(area==='Relationships')items.unshift('a conversation, agreement, or boundary with another person');
  if(area==='Money')items.unshift('a decision involving money, income, or shared resources');
  if(area==='Travel')items.unshift('movement, routing, timing, or travel planning');
  if(area==='Neighborhood')items.unshift('more activity in nearby streets, messages, or local encounters');
  if(area==='Personal Climate')items.unshift(`situations colored by ${tone}`);
  return uniquePhrases(items).slice(0,3)
}

// v2.8 confirmation-gated geographic forecast engine
const FORECAST_THEMES={
  movement:{label:'Movement & routing',best:'favor flexible routing, errands, short trips, and adaptable timing',watch:'leave extra time for changing routes or timing'},
  communication:{label:'Communication & information',best:'favor messages, coordination, comparison, and information gathering',watch:'verify details before acting on incomplete information'},
  commerce:{label:'Commerce & resources',best:'favor practical exchange, pricing, resource decisions, and measurable gains',watch:'avoid assuming that activity automatically means profit'},
  authority:{label:'Authority & visibility',best:'favor clear leadership, formal decisions, and visible responsibilities',watch:'avoid unnecessary contests over control or status'},
  relationships:{label:'Agreements & relationships',best:'favor negotiation, meetings, cooperation, and boundary-setting',watch:'do not force agreement when signals remain mixed'},
  support:{label:'Support & stabilization',best:'favor maintenance, protection, repair, and strengthening what already works',watch:'do not confuse caution with stagnation'},
  research:{label:'Research & hidden matters',best:'favor investigation, diagnosis, confidential work, and root-cause analysis',watch:'avoid overinterpreting incomplete or private information'},
  pressure:{label:'Pressure & decisive action',best:'favor focused problem-solving and necessary action with clear limits',watch:'avoid rushing irreversible choices under pressure'},
  structure:{label:'Structure & long-term work',best:'favor planning, disciplined work, scheduling, and durable systems',watch:'expect slower progress where structure or correction is required'},
  creativity:{label:'Creativity & attraction',best:'favor design, presentation, social activity, and constructive experimentation',watch:'avoid prioritizing appearance over substance'},
  expansion:{label:'Growth & opportunity',best:'favor learning, guidance, institutions, networking, and broader options',watch:'avoid overpromising or expanding faster than conditions support'},
  transition:{label:'Transition & release',best:'favor closure, re-routing, review, and contingency planning',watch:'avoid treating a transition signal as a guarantee of loss or danger'},
  disruption:{label:'Disruption & change',best:'favor troubleshooting, innovation, and plans that can adapt quickly',watch:'build redundancy before relying on one fragile plan'},
  quiet:{label:'Quiet & withdrawal',best:'favor behind-the-scenes work, reflection, recovery, and low-noise tasks',watch:'avoid making major assumptions from limited outward activity'}
};
const HOUSE_THEME_MAP={
  1:['authority','movement'],2:['commerce','communication'],3:['movement','communication'],4:['support','relationships'],
  5:['creativity','relationships'],6:['structure','research'],7:['relationships','communication'],8:['research','transition'],
  9:['expansion','movement'],10:['authority','structure'],11:['expansion','commerce'],12:['quiet','transition']
};
const SIGN_THEME_MAP={
  Aries:['pressure','movement'],Taurus:['commerce','support'],Gemini:['communication','movement'],Cancer:['support','relationships'],
  Leo:['authority','creativity'],Virgo:['research','communication'],Libra:['relationships','commerce'],Scorpio:['research','pressure'],
  Sagittarius:['expansion','movement'],Capricorn:['structure','authority'],Aquarius:['disruption','expansion'],Pisces:['quiet','transition']
};
const NAK_THEME_MAP={
  Ashwini:['movement','support'],Bharani:['pressure','transition'],Krittika:['pressure','research'],Rohini:['commerce','creativity'],Mrigashira:['research','movement'],
  Ardra:['disruption','transition'],Punarvasu:['support','expansion'],Pushya:['support','structure'],Ashlesha:['research','pressure'],Magha:['authority','structure'],
  'Purva Phalguni':['creativity','relationships'],'Uttara Phalguni':['relationships','support'],Hasta:['research','structure'],Chitra:['creativity','structure'],
  Swati:['movement','relationships'],Vishakha:['pressure','expansion'],Anuradha:['relationships','support'],Jyeshtha:['authority','research'],Mula:['research','transition'],
  'Purva Ashadha':['expansion','pressure'],'Uttara Ashadha':['structure','authority'],Shravana:['communication','movement'],Dhanishta:['commerce','relationships'],
  Shatabhisha:['research','quiet'],'Purva Bhadrapada':['pressure','transition'],'Uttara Bhadrapada':['support','quiet'],Revati:['movement','transition']
};
const PLANET_THEME_MAP={
  Sun:['authority'],Moon:['relationships','support'],Mars:['pressure','movement'],Mercury:['communication','commerce'],Venus:['relationships','creativity'],
  Jupiter:['expansion','support'],Saturn:['structure','pressure'],Rahu:['disruption','expansion'],Ketu:['transition','research'],
  Uranus:['disruption'],Neptune:['quiet','transition'],Pluto:['research','pressure']
};
function addEvidence(ledger,kind,theme,weight,text,polarity='support'){
  if(!theme||!FORECAST_THEMES[theme])return;ledger.push({kind,theme,weight:+weight||0,text,polarity});
}
function confirmedThemeSummary(ledger){
  const grouped={};
  for(const e of ledger){
    if(!grouped[e.theme])grouped[e.theme]={theme:e.theme,score:0,kinds:new Set(),support:[],counter:[]};
    const g=grouped[e.theme];
    if(e.polarity==='counter'){g.score-=Math.abs(e.weight);g.counter.push(e)}else{g.score+=e.weight;g.support.push(e);g.kinds.add(e.kind)}
  }
  return Object.values(grouped).map(g=>({...g,kinds:[...g.kinds],confirmed:g.kinds.size>=2&&g.score>0})).sort((a,b)=>b.score-a.score);
}
function buildEvidenceLedger(a,area){
  const ledger=[];
  (HOUSE_THEME_MAP[a.climateHouse]||[]).forEach((t,i)=>addEvidence(ledger,'climate_house',t,1.05-i*.15,`Climate House ${a.climateHouse} supports ${FORECAST_THEMES[t].label.toLowerCase()}.`));
  (SIGN_THEME_MAP[a.sign]||[]).forEach((t,i)=>addEvidence(ledger,'zodiac',t,.9-i*.15,`${a.sign} contributes ${FORECAST_THEMES[t].label.toLowerCase()}.`));
  (NAK_THEME_MAP[a.nak.name]||[]).forEach((t,i)=>addEvidence(ledger,'nakshatra',t,1.15-i*.15,`${a.nak.name} supports ${FORECAST_THEMES[t].label.toLowerCase()}.`));
  const signLord=planetClimateRecord(SIGN_LORDS[a.sign]);
  const nakLord=planetClimateRecord(a.nak.lord);
  const governors=(a.governors||[]).map(g=>planetClimateRecord(g.name)).filter(Boolean);
  const moon=planetClimateRecord('Moon');
  for(const [label,kind,rec,base] of [['Sign lord','sign_lord',signLord,.85],['Nakshatra lord','nakshatra_lord',nakLord,1.05]]){
    if(!rec)continue;const strength=placementStrength(rec).score;
    for(const t of PLANET_THEME_MAP[rec.name]||[])addEvidence(ledger,kind,t,base+Math.max(-.25,Math.min(.5,strength*.12)),`${label} ${rec.name} is in ${rec.sign} / ${rec.nak.name} (${placementStrength(rec).dignity.label}).`);
  }
  for(const rec of governors){for(const t of PLANET_THEME_MAP[rec.name]||[])addEvidence(ledger,'transit_governor',t,1.25,`${rec.name} is physically transiting this nakshatra zone.`)}
  if(moon){for(const t of [...(PLANET_THEME_MAP.Moon||[]),...(NAK_THEME_MAP[moon.nak.name]||[]).slice(0,1)])addEvidence(ledger,'moon',t,.65,`Moon is in ${moon.sign} / ${moon.nak.name}, Climate House ${moon.climateHouse}.`)}
  const names=[signLord?.name,nakLord?.name,...governors.map(x=>x.name)].filter(Boolean);
  const dr=strongestVedicDrishti(names),ang=strongestAspectForNames(names);
  const asp=dr||ang;
  if(asp){const tense=/square|opposition|Mars|Saturn/.test(`${asp.type} ${asp.from?.name||asp.a?.name||''}`);const p1=asp.from||asp.a,p2=asp.to||asp.b;
    const themes=uniquePhrases([...(PLANET_THEME_MAP[p1?.name]||[]),...(PLANET_THEME_MAP[p2?.name]||[])]).slice(0,2);
    themes.forEach(t=>addEvidence(ledger,'aspect',t,tense?.95:.75,`${p1?.name||'Planet'} ${asp.type} ${p2?.name||'planet'} modifies the zone.`,tense&&t==='support'?'counter':'support'));
    if(tense)addEvidence(ledger,'aspect','pressure',1.05,`${p1?.name||'Planet'} ${asp.type} ${p2?.name||'planet'} adds pressure.`);
  }
  if(a.gandanta)addEvidence(ledger,'gandanta','transition',a.gandanta.core?1.5:1.0,`${a.gandanta.core?'Core':'Broad'} ${a.gandanta.label} Gandanta transition.`);
  const derived=bhavatBhavamHouse(a.climateHouse);
  const focus=AREA_RULES[area]?.houses||[];
  if(focus.includes(a.climateHouse)||focus.includes(derived)){for(const t of HOUSE_THEME_MAP[a.climateHouse]||[])addEvidence(ledger,'bhavat_bhavam',t,.55,`Bhavat Bhavam reinforces the selected ${area.toLowerCase()} lens.`)}
  return ledger;
}
function gatedForecastForLocation(area=state.horoscopeArea){
  const a=state.selectedMapPoint||analyzeMapPoint(state.latitude,state.longitude);if(!a)return null;
  const ledger=buildEvidenceLedger(a,area),ranked=confirmedThemeSummary(ledger),confirmed=ranked.filter(x=>x.confirmed);
  const primary=confirmed[0],secondary=confirmed[1];
  const withheld=ranked.filter(x=>!x.confirmed&&x.score>.65).slice(0,4);
  if(!primary){
    return {withheld:true,theme:'No dominant city-climate theme cleared the confirmation gate for this location.',manifestations:['The current factors are mixed rather than converging on one outcome.'],bestUse:'Best use: treat this area as neutral or exploratory until more than one independent factor agrees.',caution:'Watch for: avoid forcing a prediction from a single isolated placement.',why:ledger.map(e=>e.text).slice(0,10),confidence:0,confirmed:[],withheldTopics:withheld.map(x=>FORECAST_THEMES[x.theme].label)};
  }
  const P=FORECAST_THEMES[primary.theme],S=secondary?FORECAST_THEMES[secondary.theme]:null;
  const support=uniquePhrases(primary.support.map(e=>e.text));
  const manifestations=[`Conditions favor ${P.label.toLowerCase()} because ${primary.kinds.length} independent factor types agree.`,S?`${S.label} is the strongest secondary theme.`:null].filter(Boolean);
  if(a.governors?.length)manifestations.push(`Current transit governor${a.governors.length>1?'s':''}: ${a.governors.map(g=>g.name).join(', ')}.`);
  let caution=`Watch for: ${P.watch}.`;
  if(a.gandanta)caution=`Watch for: this is a ${a.gandanta.core?'core':'broad'} Gandanta transition. ${FORECAST_THEMES.transition.watch}.`;
  const theme=`${P.label} is the leading confirmed theme for ${a.sign} / ${a.nak.name} in Climate House ${a.climateHouse}${S?`; ${S.label.toLowerCase()} is secondary`:''}.`;
  const why=[`Confirmation gate: ${primary.kinds.length} independent factor types · score ${primary.score.toFixed(2)}`,...support.slice(0,6)];
  if(secondary)why.push(`Secondary: ${S.label} · ${secondary.kinds.length} factor types · score ${secondary.score.toFixed(2)}`);
  if(withheld.length)why.push(`Withheld (insufficient confirmation): ${withheld.map(x=>FORECAST_THEMES[x.theme].label).join(', ')}`);
  return {withheld:false,theme,manifestations:uniquePhrases(manifestations).slice(0,3),bestUse:`Best use: ${P.best}.`,caution,why,confidence:primary.kinds.length,confirmed:confirmed.slice(0,3).map(x=>FORECAST_THEMES[x.theme].label),withheldTopics:withheld.map(x=>FORECAST_THEMES[x.theme].label)};
}
function forecastForLocation(area=state.horoscopeArea){
  const a=state.selectedMapPoint||analyzeMapPoint(state.latitude,state.longitude);
  if(!a)return null;
  const signLordName=SIGN_LORDS[a.sign],nakLordName=a.nak.lord,governors=a.governors||[];
  const signLord=planetClimateRecord(signLordName),nakLord=planetClimateRecord(nakLordName),governorRecords=governors.map(g=>planetClimateRecord(g.name)).filter(Boolean),moon=planetClimateRecord('Moon');
  const derived=bhavatBhavamHouse(a.climateHouse),nakData=nakshatraDetail(a.nak.name);
  const coreRecords=uniquePhrases([signLordName,nakLordName,...governors.map(g=>g.name),'Moon']).map(planetClimateRecord).filter(Boolean);
  const ranked=rankKeyPlanets(coreRecords),dominant=ranked[0]?.rec||governorRecords[0]||nakLord||signLord;
  const strongest=strongestAspectForNames(coreRecords.map(r=>r.name)),strongestDrishti=strongestVedicDrishti(coreRecords.map(r=>r.name));
  const lordConnection=relationshipBetween(signLordName,nakLordName),lordCompound=signLord&&nakLord?compoundRelationship(signLord,nakLord):null;
  const signTone=SIGN_TONES[a.sign]||'mixed conditions';

  let theme=`${a.sign} / ${a.nak.name} gives this area a ${signTone} field shaped by ${nakData.quality}.`;
  if(a.gandanta)theme+=` It is inside the ${a.gandanta.core?'core ':'broader '}${a.gandanta.label} Gandanta transition zone.`;
  if(dominant){const st=placementStrength(dominant);theme+=` ${dominant.name} carries the strongest current weight${st.score>1?' from a strong placement':st.score<0?' despite a pressured placement':''}.`}

  const manifestations=manifestationPool(a,area);
  if(lordCompound&&signLordName!==nakLordName){
    if(/enemy/.test(lordCompound))manifestations.unshift(`${signLordName} and ${nakLordName} are operating through a strained compound relationship, so the area may show mixed signals or require more adjustment.`);
    else if(/friend/.test(lordCompound))manifestations.unshift(`${signLordName} and ${nakLordName} are operating through a supportive compound relationship, helping the sign and nakshatra themes reinforce one another.`);
  }
  if(dominant){const nat=PLANET_NATURES[dominant.name];if(nat?.keywords?.length)manifestations.push(`${dominant.name} emphasizes ${nat.keywords.slice(0,2).join(' and ')} in this zone.`)}
  const compactManifestations=uniquePhrases(manifestations).slice(0,3);

  const bestMap={Aries:'direct action and quick decisions',Taurus:'steady practical work and resource-building',Gemini:'communication, comparison, and flexible movement',Cancer:'supportive activity and protection',Leo:'visible leadership and decisive coordination',Virgo:'planning, sorting, and careful execution',Libra:'negotiation, balance, and agreements',Scorpio:'research, discretion, and focused problem-solving',Sagittarius:'exploration, learning, and wider perspective',Capricorn:'structured effort and long-range planning',Aquarius:'systems thinking, networks, and experimentation',Pisces:'reflection, guidance, and adaptable pacing'};
  const bestUse=`Best use: favor ${bestMap[a.sign]||'actions that fit the location’s main theme'} rather than forcing unrelated activity.`;

  let caution=`Watch for: ${['Ardra','Ashlesha','Jyeshtha','Mula','Purva Bhadrapada'].includes(a.nak.name)?'intensity, overreaction, or hidden complications':'scattering attention or overinterpreting minor signals'}.`;
  if(a.gandanta)caution=`Watch for: this is a Gandanta transition zone. Build in extra time, verify directions and communications, and avoid rushing irreversible choices.`;
  else if(dominant&&placementStrength(dominant).score<=-2)caution=`Watch for: ${dominant.name} is under a weakened dignity condition, so its themes may require extra patience or correction.`;
  if(strongestDrishti)caution=`Watch for: ${strongestDrishti.from.name} casts its ${strongestDrishti.type} to ${strongestDrishti.to.name}, strongly modifying the area climate.`;
  else if(strongest&&['square','opposition'].includes(strongest.type))caution=`Watch for: ${strongest.a.name} ${strongest.type} ${strongest.b.name} can create competing pressures around this zone.`;

  const why=[
    `Climate House ${a.climateHouse} → Bhavat Bhavam House ${derived}`,
    `${a.sign} ${a.signDegree.toFixed(2)}° · sign lord ${signLordName}`,
    `${a.nak.name} Pada ${a.nak.pada} · lord ${nakLordName} · deity ${nakData.deity} · ${nakData.motivation}`,
    governors.length?`Transit governor${governors.length>1?'s':''}: ${governors.map(g=>g.name).join(', ')}`:'No planet currently occupies this nakshatra',
    keyPlanetSummary(signLord,'Sign lord'),keyPlanetSummary(nakLord,'Nakshatra lord'),
    governorRecords[0]?keyPlanetSummary(governorRecords[0],'Transit governor'):null,
    moon?`Moon: ${moon.sign} ${moon.signDegree.toFixed(1)}° · ${moon.nak.name} · Climate House ${moon.climateHouse} · ${placementStrength(moon).dignity.label}`:null,
    lordCompound&&signLordName!==nakLordName?`${signLordName} ↔ ${nakLordName}: ${lordCompound}`:null,
    a.gandanta?`${a.gandanta.core?'Core':'Broad'} Gandanta · ${a.gandanta.label} · ${a.gandanta.distance.toFixed(2)}° from junction`:null,
    areaEmphasis(a,area)
  ].filter(Boolean);
  if(lordConnection)why.push(`${signLordName} ${lordConnection.type} ${nakLordName} · orb ${lordConnection.orb.toFixed(2)}°`);
  if(strongestDrishti)why.push(`${strongestDrishti.from.name} casts ${strongestDrishti.type} to ${strongestDrishti.to.name} · orb ${strongestDrishti.orb.toFixed(2)}°`);
  return {theme,manifestations:compactManifestations,bestUse,caution,why:uniquePhrases(why)}
}
function forecastHTML(area=state.horoscopeArea){
  const f=gatedForecastForLocation(area);if(!f)return `<div class="empty-state">Select a location on the map to generate this forecast.</div>`;
  const badge=f.withheld?`<span class="gate-badge withheld">Withheld · insufficient confirmation</span>`:`<span class="gate-badge confirmed">Confirmed · ${f.confidence} factor types</span>`;
  return `<div class="compact-forecast gated-forecast">${badge}<p class="forecast-theme">${esc(f.theme)}</p><div class="forecast-block"><span>What may show up</span><ul>${f.manifestations.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><p class="forecast-best">${esc(f.bestUse)}</p><p class="forecast-caution">${esc(f.caution)}</p><details class="forecast-details"><summary>Evidence ledger</summary><ul>${f.why.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details></div>`
}

function zoneRecord(index){
  const longitude=index*(360/27)+(360/54),sign=signForLongitude(longitude),house=climateHouseForLongitude(longitude),governors=planetsInNak(index),nak={name:NAKSHATRAS[index],lord:NAK_LORDS[index],index};
  const signLord=planetClimateRecord(SIGN_LORDS[sign.name]),nakLord=planetClimateRecord(nak.lord);
  const govRecords=governors.map(p=>planetClimateRecord(p.name)).filter(Boolean);
  const edgeGandanta=['Ashwini','Magha','Mula','Ashlesha','Jyeshtha','Revati'].includes(nak.name);
  const streetRow=state.streetIndex.find(r=>r.index===index);
  const strength=[signLord,nakLord,...govRecords].filter(Boolean).reduce((s,r)=>s+Math.abs(classicalInfluenceScore(r)),0);
  const score=governors.length*3+strength+(edgeGandanta?1.2:0)+Math.min(2,(streetRow?.streetCount||0)/30);
  return {index,longitude,sign,house,nak,governors,signLord,nakLord,govRecords,edgeGandanta,streetCount:streetRow?.streetCount||0,streets:streetRow?.streets||[],score,bearing:bearingForLongitude(longitude),direction:direction8(bearingForLongitude(longitude))};
}
function gandantaStreetSummary(){
  const core=new Map(),broad=new Map();
  for(const seg of state.roadNetwork){const g=seg.gandanta||gandantaInfo(seg.longitude);if(!g)continue;const target=g.core?core:broad;const k=g.label;if(!target.has(k))target.set(k,new Set());target.get(k).add(seg.name)}
  return {core:[...core].map(([label,set])=>({label,streets:[...set].sort()})),broad:[...broad].map(([label,set])=>({label,streets:[...set].sort()}))};
}
function cityForecastData(){
  const zones=NAKSHATRAS.map((_,i)=>zoneRecord(i)).sort((a,b)=>b.score-a.score);
  const aspects=aspectPairs();
  const tense=aspects.filter(a=>['square','opposition'].includes(a.type)).sort((a,b)=>a.orb-b.orb);
  const supportive=aspects.filter(a=>['trine','sextile'].includes(a.type)).sort((a,b)=>a.orb-b.orb);
  const gstreets=gandantaStreetSummary();
  const houseActivity=Array.from({length:12},(_,i)=>({house:i+1,planets:activePlanets().filter(p=>climateHouseForLongitude(p.longitude)===i+1),segments:state.roadNetwork.filter(s=>s.house===i+1).length})).sort((a,b)=>(b.planets.length*5+b.segments/50)-(a.planets.length*5+a.segments/50));
  return {zones,tense,supportive,gstreets,houseActivity};
}
function zoneAdvice(z){
  if(z.edgeGandanta)return `Use this as a transition zone: keep plans flexible, verify timing and directions, and favor review or completion over unnecessary escalation.`;
  if(z.house===10||z.house===11)return `Good for visible work, coordination, networking, and goal-oriented movement when the local transit governor is supported.`;
  if(z.house===8||z.house===12)return `Better for research, private work, cleanup, and cautious movement than for forcing quick public outcomes.`;
  if(z.house===3||z.house===9)return `Useful for movement, errands, communication, learning, and route planning; confirm details before committing.`;
  return `Match activity to the zone’s house and nakshatra theme; use the strongest governor as the timing modifier rather than treating the area as uniformly good or bad.`;
}
function cityForecastDashboard(){
  const d=cityForecastData(),top=d.zones.slice(0,4),tense=d.tense[0],support=d.supportive[0];
  const coreCount=d.gstreets.core.reduce((n,x)=>n+x.streets.length,0),broadCount=d.gstreets.broad.reduce((n,x)=>n+x.streets.length,0);
  return `<section id="cityForecastDashboard" class="panel city-dashboard">
    <div class="panel-head"><div><span class="eyebrow">CITY FORECAST DASHBOARD</span><h2>${esc(state.cityName)} climate overview</h2></div><div class="dashboard-status">${state.roadNetwork.length?`${state.roadNetworkCount.toLocaleString()} roads indexed`:'Build streets in fullscreen for road-level counts'}</div></div>
    <div class="dashboard-grid">
      ${top.map((z,i)=>`<article class="zone-card"><div class="zone-rank">${i+1}</div><div><span>${z.direction} · H${z.house}</span><h3>${z.sign.glyph} ${esc(z.sign.name)} / ${esc(z.nak.name)}</h3><p>${z.governors.length?`Transit governor: ${z.governors.map(g=>`${g.glyph} ${esc(g.name)}`).join(' · ')}`:`Nakshatra lord: ${esc(z.nak.lord)}`}</p><p>${z.streetCount?`${z.streetCount} named streets cross this zone.`:'Street count available after city network build.'}</p><small>${esc(zoneAdvice(z))}</small></div></article>`).join('')}
    </div>
    <div class="dashboard-secondary">
      <div class="dashboard-card"><span>Strongest tense axis</span><b>${tense?`${tense.a.glyph} ${esc(tense.a.name)} ${tense.type} ${tense.b.glyph} ${esc(tense.b.name)}`:'No tight square/opposition in current major-aspect scan'}</b>${tense?`<small>${direction8(bearingForLongitude(tense.a.longitude))} H${climateHouseForLongitude(tense.a.longitude)} ↔ ${direction8(bearingForLongitude(tense.b.longitude))} H${climateHouseForLongitude(tense.b.longitude)} · orb ${tense.orb.toFixed(2)}°</small>`:''}</div>
      <div class="dashboard-card"><span>Supportive flow</span><b>${support?`${support.a.glyph} ${esc(support.a.name)} ${support.type} ${support.b.glyph} ${esc(support.b.name)}`:'No tight trine/sextile in current major-aspect scan'}</b>${support?`<small>Use sectors touched by this aspect for lower-friction coordination; orb ${support.orb.toFixed(2)}°.</small>`:''}</div>
      <div class="dashboard-card"><span>Most activated Climate House</span><b>H${d.houseActivity[0]?.house||'—'}${d.houseActivity[0]?.planets?.length?` · ${d.houseActivity[0].planets.map(p=>`${p.glyph} ${esc(p.name)}`).join(' · ')}`:''}</b><small>${d.houseActivity[0]?.segments?`${d.houseActivity[0].segments} classified street segments currently fall in this house.`:'Street-segment count available after network build.'}</small></div>
      <div class="dashboard-card gandanta-card"><span>Gandanta transitions</span><b>${coreCount} core street names · ${broadCount} broader-band street names</b><small>Core = ±0°48′ around the water→fire junction. Broad transition band = ±3°20′. These are sensitivity flags, not automatic negative outcomes.</small></div>
    </div>
    <details class="gandanta-details"><summary>Gandanta zones & practical advice</summary>
      <div class="gandanta-grid">${GANDANTA_JUNCTIONS.map(j=>{const core=d.gstreets.core.find(x=>x.label===j.label),broad=d.gstreets.broad.find(x=>x.label===j.label);const names=[...(core?.streets||[]),...(broad?.streets||[])].filter((x,i,a)=>a.indexOf(x)===i).slice(0,12);return `<div><b>${esc(j.label)}</b><span>${esc(j.waterSign)} → ${esc(j.fireSign)}</span><p>${esc(gandantaAdvice({core:true,label:j.label}))}</p><small>${names.length?`Indexed streets: ${names.map(esc).join(' · ')}`:'Build the street network to list roads crossing this junction.'}</small></div>`}).join('')}</div>
    </details>
  </section>`;
}
function updateCityDashboardPanel(){const el=document.querySelector('#cityForecastDashboard');if(!el)return;const fresh=cityForecastDashboard();const box=document.createElement('div');box.innerHTML=fresh;const next=box.firstElementChild;if(next)el.replaceWith(next)}
function cityBBox(){
  const lat=+state.cityLatitude,lon=+state.cityLongitude,r=cityRadiusKm();
  const dLat=r/111.32,dLon=r/(111.32*Math.max(.25,Math.cos(lat*Math.PI/180)));
  return {south:lat-dLat,west:lon-dLon,north:lat+dLat,east:lon+dLon};
}
function splitBBoxGrid(box,rows=3,cols=3){
  const out=[];const dLat=(box.north-box.south)/rows,dLon=(box.east-box.west)/cols;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)out.push({south:box.south+y*dLat,west:box.west+x*dLon,north:box.south+(y+1)*dLat,east:box.west+(x+1)*dLon});
  return out;
}
const OVERPASS_ENDPOINTS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter'];
async function overpassRoadChunk(box,endpointIndex=0){
  const q=`[out:json][timeout:35];way["highway"]["name"](${box.south.toFixed(6)},${box.west.toFixed(6)},${box.north.toFixed(6)},${box.east.toFixed(6)});out tags geom qt;`;
  let lastErr=null;
  for(let i=0;i<OVERPASS_ENDPOINTS.length;i++){
    const url=OVERPASS_ENDPOINTS[(endpointIndex+i)%OVERPASS_ENDPOINTS.length];
    try{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),45000);
      const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(q),signal:controller.signal});
      clearTimeout(timer);
      if(!r.ok)throw new Error(`${new URL(url).hostname} returned HTTP ${r.status}`);
      const data=await r.json();
      if(!data||!Array.isArray(data.elements))throw new Error(`${new URL(url).hostname} returned an invalid response`);
      return data.elements;
    }catch(e){lastErr=e}
  }
  throw lastErr||new Error('Road network request failed');
}
function classifyRoadWay(way){
  const name=way?.tags?.name||'',geom=way?.geometry||[];if(!name||geom.length<2)return [];
  const out=[];let run=null;
  function flush(){if(run&&run.coords.length>1)out.push(run);run=null}
  for(let i=0;i<geom.length-1;i++){
    const a=geom[i],b=geom[i+1],lat=(a.lat+b.lat)/2,lon=(a.lon+b.lon)/2;
    if(distanceKm(+state.cityLatitude,+state.cityLongitude,lat,lon)>cityRadiusKm()*1.08){flush();continue}
    const info=analyzeMapPoint(lat,lon),key=`${info.nak.index}|${info.climateHouse}|${info.sign}`;
    if(!run||run.key!==key){flush();run={key,nakIndex:info.nak.index,nakshatra:info.nak.name,sign:info.sign,signGlyph:SIGN_GLYPHS[SIGNS.indexOf(info.sign)],house:info.climateHouse,longitude:info.zodiacLon,gandanta:gandantaInfo(info.zodiacLon),coords:[[a.lat,a.lon],[b.lat,b.lon]],name,highway:way.tags.highway||'',osmId:way.id}}
    else run.coords.push([b.lat,b.lon]);
  }
  flush();return out;
}
function buildStreetIndexFromNetwork(){
  const rows=NAKSHATRAS.map((nakshatra,index)=>{const longitude=index*(360/27)+(360/54),sign=signForLongitude(longitude);return {index,nakshatra,longitude,sign:sign.name,signGlyph:sign.glyph,streets:[],streetCount:0}});
  const sets=rows.map(()=>new Set());
  for(const seg of state.roadNetwork)sets[seg.nakIndex].add(seg.name);
  rows.forEach((r,i)=>{const names=[...sets[i]].sort((a,b)=>a.localeCompare(b));r.streetCount=names.length;r.streets=names});
  state.streetIndex=rows;
}
function reclassifyRoadNetwork(){const segments=[];for(const way of state.roadWays)segments.push(...classifyRoadWay(way));state.roadNetwork=segments;buildStreetIndexFromNetwork();drawRoadNetworkLayer();updateCityDashboardPanel()}
function clearRoadNetworkLayer(){if(state.roadNetworkLayer&&state.map){try{state.roadNetworkLayer.remove()}catch{}}state.roadNetworkLayer=null}
function drawRoadNetworkLayer(){
  clearRoadNetworkLayer();if(!state.map||!state.roadNetwork.length)return;
  const layer=L.layerGroup();
  const major=new Set(['motorway','trunk','primary','secondary','tertiary']);
  let drawn=0;
  for(const seg of state.roadNetwork){
    if(!major.has(seg.highway))continue;
    L.polyline(seg.coords,{color:nakColor(seg.nakIndex,.9),weight:2.2,opacity:.62,interactive:false}).addTo(layer);drawn++;if(drawn>1800)break;
  }
  layer.addTo(state.map);state.roadNetworkLayer=layer;
}
async function buildCityRoadNetwork(force=false){
  if(state.roadNetworkLoading)return;
  if(state.roadNetwork.length&&!force){buildStreetIndexFromNetwork();drawRoadNetworkLayer();updateStreetIndexPanel();return}
  state.roadNetworkLoading=true;state.streetIndexLoading=true;state.roadNetworkStatus='Connecting to OpenStreetMap road servers…';state.streetIndexStatus=state.roadNetworkStatus;updateStreetIndexPanel();
  const boxes=splitBBoxGrid(cityBBox(),5,5),byId=new Map();let cursor=0,done=0,failures=0;const errors=[];
  async function worker(workerIndex){
    while(cursor<boxes.length){
      const idx=cursor++;
      try{
        const els=await overpassRoadChunk(boxes[idx],workerIndex);
        for(const el of els)if(el.type==='way'&&el.tags?.name&&el.geometry?.length>1)byId.set(el.id,el);
      }catch(e){
        failures++;if(errors.length<4)errors.push(e?.message||String(e));
      }
      done++;
      state.roadNetworkStatus=`Loading streets… ${done}/${boxes.length} sections · ${byId.size.toLocaleString()} roads found${failures?` · ${failures} failed`:''}`;
      state.streetIndexStatus=state.roadNetworkStatus;updateStreetIndexPanel();
    }
  }
  try{
    await Promise.all([worker(0),worker(1)]);
    if(!byId.size){
      const detail=errors.length?` ${errors.join(' | ')}`:'';
      throw new Error(`No road data could be loaded.${detail}`);
    }
    state.roadWays=[...byId.values()];const segments=[];for(const way of state.roadWays)segments.push(...classifyRoadWay(way));
    state.roadNetwork=segments;state.roadNetworkCount=byId.size;
    buildStreetIndexFromNetwork();drawRoadNetworkLayer();
    state.roadNetworkStatus=`Indexed ${byId.size.toLocaleString()} named road ways into ${segments.length.toLocaleString()} astrological street sectors${failures?` · ${failures} of ${boxes.length} sections unavailable`:''}.`;
  }catch(e){
    console.error('Street network build failed',e);
    state.roadWays=[];state.roadNetwork=[];state.streetIndex=[];state.roadNetworkCount=0;
    state.roadNetworkStatus=`Street network could not be built: ${e?.message||e}`;
  }finally{
    state.roadNetworkLoading=false;state.streetIndexLoading=false;state.streetIndexStatus=state.roadNetworkStatus;updateStreetIndexPanel();updateCityDashboardPanel();
  }
}
function streetIndexHTML(){
  if(state.roadNetworkLoading)return `<div class="street-index-empty">${esc(state.roadNetworkStatus||'Loading city street network…')}</div>`;
  if(!state.streetIndex.length)return `<div class="street-index-empty"><b>City street network not loaded.</b><br>Use “Build streets” to classify named OpenStreetMap roads across the fixed city wheel. If a public road server rejects the request, the exact error will appear here.</div>`;
  return state.streetIndex.map(row=>{const gov=planetsInNak(row.index);const house=climateHouseForLongitude(row.longitude);const shown=row.streets.slice(0,14),more=Math.max(0,row.streetCount-shown.length);const g=['Ashwini','Magha','Mula','Ashlesha','Jyeshtha','Revati'].includes(row.nakshatra);return `<div class="street-index-row ${g?'gandanta-row':''}"><div class="street-index-color" style="background:${nakColor(row.index,.95)}"></div><div class="street-index-copy"><div class="street-index-head"><b>${row.signGlyph} ${esc(row.sign)} · H${house}</b><span>${esc(row.nakshatra)}${g?' · Gandanta edge':''}</span></div><div class="street-index-governors">${gov.length?gov.map(p=>`${p.glyph} ${esc(p.name)}`).join(' · '):`Traditional lord: ${esc(NAK_LORDS[row.index])}`}</div><div class="street-index-streets">${shown.length?shown.map(esc).join(' · '):'No named streets indexed'}${more?` <em>+${more} more</em>`:''}</div></div></div>`}).join('');
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
async function buildStreetIndex(force=false){return buildCityRoadNetwork(force)}
function updateStreetIndexPanel(){const body=document.querySelector('#streetIndexBody');if(body)body.innerHTML=streetIndexHTML();const status=document.querySelector('#streetIndexStatus');if(status)status.textContent=state.streetIndexStatus||''}
async function enterMapFullscreen(){
  const shell=document.querySelector('#mapFullscreenShell');if(!shell)return;
  try{await shell.requestFullscreen();}catch(e){state.searchStatus=`Fullscreen unavailable: ${e.message}`;render();return}
  setTimeout(()=>{if(state.map)state.map.invalidateSize();if(state.roadNetwork.length)buildStreetIndex(false)},120);
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
  return {lat:+lat,lon:+lon,bearing,zodiacLon,nak,sign:SIGNS[signIndex],signDegree,nearest,distanceKm:distance,radiusKm,insideRadius:distance<=radiusKm,climateHouse,governors,gandanta:gandantaInfo(zodiacLon)};
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
    state.streetIndex=[];state.streetIndexStatus='';state.roadWays=[];state.roadNetwork=[];state.roadNetworkCount=0;state.roadNetworkStatus='';clearRoadNetworkLayer();
  }else{
    state.longitude=lon;state.latitude=lat;state.searchStatus=`Blue location dot set to ${r.name}`;
  }
  state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);
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
    state.engineStatus='ready';state.engineMessage='Swiss Ephemeris ready · Lahiri sidereal · mean node';state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);if(state.roadWays.length)reclassifyRoadNetwork();
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
  GANDANTA_JUNCTIONS.forEach(j=>{const a=j.boundary+rot,p1=point(cx,cy,150,a),p2=point(cx,cy,326,a),[gx,gy]=point(cx,cy,252,a);s+=`<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" class="gandanta-boundary"/><text x="${gx}" y="${gy+4}" text-anchor="middle" class="gandanta-glyph">G</text>`});
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


function selectedPointSummary(){
  const a=state.selectedMapPoint||analyzeMapPoint(state.latitude,state.longitude);
  if(!a)return `<div class="compact-empty">Move the blue dot to inspect this location.</div>`;
  const gov=a.governors?.length?a.governors.map(p=>`${p.glyph} ${esc(p.name)}`).join(' · '):`No current transit governor`;
  return `<div class="selected-summary">
    <div><span>Climate house</span><b>H${a.climateHouse}</b></div>
    <div><span>Zodiac</span><b>${esc(a.sign)} ${a.signDegree.toFixed(2)}°</b></div>
    <div><span>Nakshatra</span><b>${esc(a.nak.name)} · P${a.nak.pada}</b></div>
    <div><span>Gandanta</span><b>${a.gandanta?(a.gandanta.core?'Core · ':'Transition · ')+esc(a.gandanta.label):'No'}</b></div>
    <div><span>Sign lord</span><b>${esc(SIGN_LORDS[a.sign])}</b></div><div><span>Nakshatra lord</span><b>${esc(a.nak.lord)}</b></div>
    <div class="wide"><span>Transit governor</span><b>${gov}</b></div>
  </div>`;
}
function locationHoroscopePanel(){
  const areas=['Overview','Home','Work','Relationships','Money','Travel','Neighborhood','Personal Climate'];
  const a=state.selectedMapPoint||analyzeMapPoint(state.latitude,state.longitude);
  const gov=a?.governors?.length?a.governors.map(p=>`${p.glyph} ${esc(p.name)}`).join(' · '):'No planet currently occupying this nakshatra';
  return `<section class="panel location-horoscope">
    <div class="horoscope-head"><div><span class="eyebrow">LOCATION HOROSCOPE</span><h2>${esc(state.horoscopeArea)} forecast</h2></div><div class="horoscope-place">${esc(state.cityName)} · H${a?.climateHouse||'—'} · ${a?esc(a.nak.name):'—'}</div></div>
    <div class="horoscope-tabs">${areas.map(x=>`<button data-horoscope-area="${x}" class="${state.horoscopeArea===x?'active':''}">${x}</button>`).join('')}</div>
    <div id="locationHoroscopeBody" class="horoscope-body">
      ${forecastHTML(state.horoscopeArea)}
    </div>
  </section>`;
}
function climateView(){
  return `<div class="climate-workspace">
    <section class="left-stack">
      <div class="panel compact-module">
        <span class="eyebrow">LOCATION</span>
        <div class="search-row"><input id="placeSearch" placeholder="City, neighborhood, street or address"><button id="searchPlace" class="action primary compact">Search</button></div>
        ${state.searchStatus?`<div class="search-status">${esc(state.searchStatus)}</div>`:''}
        ${state.searchResults.length?`<div class="search-results">${state.searchResults.map((r,i)=>`<button data-search-result="${i}"><b>${esc(r.name)}</b><small>${['place','municipality','city','town'].includes(String(r.type).toLowerCase())?'sets city epicenter':'moves blue dot'} · ${esc(r.type||'place')}</small></button>`).join('')}</div>`:''}
        <div class="module-fact"><span>City</span><b>${esc(state.cityName)}</b></div>
        <div class="module-fact"><span>Blue dot</span><b>${(+state.latitude).toFixed(5)}, ${(+state.longitude).toFixed(5)}</b></div>
        <button id="useLocation" class="action secondary">Use device location</button>
      </div>
      <div class="panel compact-module">
        <span class="eyebrow">VIEW</span>
        <label>Mode<select id="scale">${['City','Neighborhood','Street'].map(x=>`<option ${x===state.scale?'selected':''}>${x}</option>`).join('')}</select></label>
      </div>
      <div class="panel compact-module">
        <span class="eyebrow">ASTROLOGY</span>
        <div class="engine ${state.engineStatus}"><span class="engine-dot"></span>${esc(state.engineMessage)}</div>
        <label>Ascendant source<select id="ascSource"><option value="live" ${state.useLiveAsc?'selected':''}>Live calculated ASC</option><option value="manual" ${!state.useLiveAsc?'selected':''}>Manual profile ASC</option></select></label>
        <div class="module-fact"><span>ASC</span><b>${formatLon(activeAsc())}</b></div>
        <div class="module-fact"><span>Local time</span><b>${esc(state.localDateTime.replace('T',' '))}</b></div>
        <div class="module-actions"><button id="useNow" class="action secondary compact">Now</button><button id="calculate" class="action primary compact" ${state.engineStatus==='loading'?'disabled':''}>Refresh transit</button></div>
      </div>
      <div class="panel compact-module">
        <span class="eyebrow">SELECTED POINT</span>
        <div id="selectedPointSummary">${selectedPointSummary()}</div>
      </div>
      ${state.maptilerKey?'':`<div class="panel compact-module"><span class="eyebrow">MAP SEARCH</span><div class="notice">Add your MapTiler key under Settings to enable place search and the street index.</div></div>`}
    </section>
    <section class="panel wheel-panel primary-map-panel">
      <div class="map-toolbar persistent-map-toolbar"><button id="fullscreenMap" class="action secondary compact">⛶ Fullscreen map</button></div>
      <div id="mapFullscreenShell" class="fullscreen-shell"><aside class="fullscreen-street-index"><div class="street-index-title"><div><span class="eyebrow">NAKSHATRA STREET INDEX</span><b>Zodiac · Nakshatra · Transit governors · Streets</b></div><div class="street-index-actions"><button id="buildRoadNetwork" class="mini-button wide" title="Build city street network">Build streets</button><button id="refreshStreetIndex" class="mini-button" title="Refresh streets">↻</button></div></div><div id="streetIndexStatus" class="street-index-status">${esc(state.streetIndexStatus||'')}</div><div id="streetIndexBody" class="street-index-body">${streetIndexHTML()}</div></aside><div class="map-wheel-stage"><div id="climateMap" class="climate-map" aria-label="Personal Climate map"></div><button id="exitFullscreenMap" class="fullscreen-exit" title="Exit fullscreen">×</button></div></div>
      <div class="map-caption"><span>${esc(state.cityName)} fixed wheel</span><span>${state.scale} view</span><span>${cityRadiusLabel()} city radius</span><span>${state.roadNetworkCount?`${state.roadNetworkCount.toLocaleString()} named roads indexed`:'street network not indexed'}</span></div>
    </section>
  </div>
  ${cityForecastDashboard()}
  ${locationHoroscopePanel()}`;
}

function horoscopeView(){return `<div class="grid two"><section class="panel hero-panel"><span class="eyebrow">DAILY HOROSCOPE</span><h1>Structured Vedic forecasting</h1><p>The forecast layer uses the geographic Climate House, sign lord, nakshatra lord, transit governor, current Moon, planetary positions, aspects, and Bhavat Bhavam. Personal natal roles are intentionally excluded from this city-climate forecast layer.</p></section><section class="panel"><h2>Life areas</h2><div class="life-grid">${['Daily Overview','Self & Direction','Home & Family','Relationships','Career & Work','Money & Earning','Health & Vitality','Travel','Neighbors & Local Activity','Creativity & Children','Spiritual Life','Personal Climate'].map((x,i)=>`<button><span>${String(i+1).padStart(2,'0')}</span>${x}</button>`).join('')}</div></section></div>`}

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
  updateGeographicWheel();if(state.roadNetwork.length)drawRoadNetworkLayer();
  map.on('zoomend moveend',()=>updateGeographicWheel());
  map.on('click',e=>{
    state.latitude=+e.latlng.lat;state.longitude=+e.latlng.lng;state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);
    state.mapPointMarker.setLatLng(e.latlng);
    const target=document.querySelector('#selectedPointSummary');if(target)target.innerHTML=selectedPointSummary();
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
  const scale=document.querySelector('#scale');if(scale)scale.onchange=()=>{state.scale=scale.value;render()};
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
  const buildRoad=document.querySelector('#buildRoadNetwork');if(buildRoad)buildRoad.onclick=()=>buildCityRoadNetwork(false);const refreshStreet=document.querySelector('#refreshStreetIndex');if(refreshStreet)refreshStreet.onclick=()=>buildCityRoadNetwork(true);
  document.onfullscreenchange=()=>{if(state.map)setTimeout(()=>state.map.invalidateSize(),80);if(document.fullscreenElement?.id==='mapFullscreenShell'&&state.roadNetwork.length)buildStreetIndex(false)};
  document.querySelectorAll('[data-search-result]').forEach(b=>b.onclick=()=>selectSearchResult(+b.dataset.searchResult));
  document.querySelectorAll('[data-horoscope-area]').forEach(b=>b.onclick=()=>{state.horoscopeArea=b.dataset.horoscopeArea;render()});
  const loc=document.querySelector('#useLocation');if(loc)loc.onclick=()=>{if(!navigator.geolocation){state.engineMessage='Browser geolocation is unavailable.';render();return}loc.disabled=true;loc.textContent='Locating…';navigator.geolocation.getCurrentPosition(pos=>{state.latitude=+pos.coords.latitude.toFixed(6);state.longitude=+pos.coords.longitude.toFixed(6);state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);render()},err=>{state.engineMessage=`Location not available: ${err.message}`;render()},{enableHighAccuracy:true,timeout:10000})};
  const centerMap=document.querySelector('#centerMap');if(centerMap)centerMap.onclick=()=>{const a=document.querySelector('#latitude'),o=document.querySelector('#longitude');state.latitude=+a.value;state.longitude=+o.value;state.selectedMapPoint=analyzeMapPoint(state.latitude,state.longitude);moveMapToState();render()};
  const calc=document.querySelector('#calculate');if(calc)calc.onclick=()=>calculateTransit();
  const ap=document.querySelector('#addPlanetRole');if(ap)ap.onclick=()=>{const e=document.querySelector('#planetRoleInput'),v=e.value.trim();if(v){(state.profile.planetRoles[state.selectedPlanet]??=[]).push(v);save();render()}};
  document.querySelectorAll('[data-remove-planet]').forEach(b=>b.onclick=()=>{state.profile.planetRoles[state.selectedPlanet].splice(+b.dataset.removePlanet,1);save();render()});
  const ah=document.querySelector('#addHouseRole');if(ah)ah.onclick=()=>{const e=document.querySelector('#houseRoleInput'),v=e.value.trim();if(v){(state.profile.houseRoles[state.selectedHouse]??=[]).push(v);save();render()}};
  document.querySelectorAll('[data-remove-house]').forEach(b=>b.onclick=()=>{state.profile.houseRoles[state.selectedHouse].splice(+b.dataset.removeHouse,1);save();render()});
}

try{render()}catch(err){console.error('Initial render failed',err);const root=document.querySelector('#app');if(root)root.innerHTML=`<main style="padding:24px;font-family:Arial,sans-serif;color:#fff;background:#0b0e17;min-height:100vh"><h1>Vedic Climate Scope</h1><p>The interface hit a browser startup error.</p><pre style="white-space:pre-wrap;color:#ffb4b4">${esc(err?.message||err)}</pre></main>`}
initEngine();
