const SIGNS=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGN_GLYPHS=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const PLANETS=[['Sun','☉'],['Moon','☽'],['Mercury','☿'],['Venus','♀'],['Mars','♂'],['Jupiter','♃'],['Saturn','♄'],['Rahu','☊'],['Ketu','☋'],['Uranus','♅'],['Neptune','♆'],['Pluto','♇']];
const NAKSHATRAS=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const DEFAULT_PROFILE={mode:'manual',ascSign:'Virgo',ascDegree:18,ascMinute:42,ascSecond:0,planetRoles:{Mercury:['ASC Lord'],Venus:['5th Lord','12th Lord']},houseRoles:{1:['Self','Body','Life direction'],4:['Home','Mother','Emotional foundation'],10:['Career','Public role']}};
let state={tab:'climate',scale:'City',selectedPlanet:'Mercury',selectedHouse:1,profile:loadProfile()};
function loadProfile(){try{return JSON.parse(localStorage.getItem('vedicProfile'))||structuredClone(DEFAULT_PROFILE)}catch{return structuredClone(DEFAULT_PROFILE)}}
function save(){localStorage.setItem('vedicProfile',JSON.stringify(state.profile))}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function point(cx,cy,r,deg){const a=(deg-90)*Math.PI/180;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]}
function arcPath(cx,cy,r1,r2,start,end){const p1=point(cx,cy,r2,start),p2=point(cx,cy,r2,end),p3=point(cx,cy,r1,end),p4=point(cx,cy,r1,start);return `M ${p1[0]} ${p1[1]} A ${r2} ${r2} 0 0 1 ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]} A ${r1} ${r1} 0 0 0 ${p4[0]} ${p4[1]} Z`}
function wheel(){
  const p=state.profile;
  const asc=SIGNS.indexOf(p.ascSign)*30+(+p.ascDegree||0)+(+p.ascMinute||0)/60+(+p.ascSecond||0)/360;
  const rot=90-asc;
  const cx=350,cy=350;
  let defs=`<defs>
    <radialGradient id="core"><stop offset="0" stop-color="#161b2b" stop-opacity=".88"/><stop offset="1" stop-color="#090b12" stop-opacity=".72"/></radialGradient>
    <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  NAKSHATRAS.forEach((n,i)=>{
    const st=i*(360/27)+rot;
    const en=st+360/27;
    const mid=(st+en)/2;
    const labelRadius=210;
    let a1=st+1.2,a2=en-1.2;
    const upright=((mid%360)+360)%360;
    if(upright>90 && upright<270){ const t=a1;a1=a2;a2=t; }
    const p1=point(cx,cy,labelRadius,a1),p2=point(cx,cy,labelRadius,a2);
    const sweep=(upright>90 && upright<270)?0:1;
    defs+=`<path id="nakArc${i}" d="M ${p1[0]} ${p1[1]} A ${labelRadius} ${labelRadius} 0 0 ${sweep} ${p2[0]} ${p2[1]}"/>`;
  });
  defs+='</defs>';
  let s=`<div class="map-underlay"><div class="map-grid"></div><div class="map-road road-a"></div><div class="map-road road-b"></div><div class="map-road road-c"></div><div class="map-label map-label-a">CITY CENTER</div><div class="map-label map-label-b">NEIGHBORHOOD</div></div><svg class="wheel" viewBox="0 0 700 700">${defs}<circle cx="350" cy="350" r="336" fill="url(#core)" stroke="#606a8d" stroke-opacity=".55" stroke-width="2"/>`;

  const hues=[8,31,56,108,145,174,201,229,255,278,309,338];
  SIGNS.forEach((n,i)=>{
    const st=i*30+rot,en=st+30,mid=st+15,[x,y]=point(cx,cy,282,mid);
    s+=`<path d="${arcPath(cx,cy,245,325,st,en)}" fill="hsl(${hues[i]} 74% 48% / .54)" stroke="#d7dcf2" stroke-opacity=".13"/>
    <text x="${x}" y="${y-7}" text-anchor="middle" class="sign-glyph">${SIGN_GLYPHS[i]}</text>
    <text x="${x}" y="${y+18}" text-anchor="middle" class="sign-name">${n}</text>`;
  });

  NAKSHATRAS.forEach((n,i)=>{
    const st=i*(360/27)+rot,en=st+360/27;
    const hue=(i*360/27+18)%360;
    s+=`<path d="${arcPath(cx,cy,171,243,st,en)}" fill="hsl(${hue} 52% 34% / ${i%2?'.40':'.34'})" stroke="#d6dcf5" stroke-opacity=".20" stroke-width=".8"/>
      <text class="nak-name"><textPath href="#nakArc${i}" startOffset="50%" text-anchor="middle">${n}</textPath></text>`;
  });

  for(let i=0;i<108;i++){
    const a=i*(360/108)+rot,p1=point(cx,cy,160,a),p2=point(cx,cy,i%4===0?171:166,a);
    s+=`<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#d9def0" stroke-opacity="${i%4===0?'.34':'.16'}" stroke-width="${i%4===0?'.8':'.45'}"/>`;
  }
  for(let i=0;i<12;i++){
    const a=i*30+rot,p1=point(cx,cy,94,a),p2=point(cx,cy,171,a);
    s+=`<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#cbd3ef" stroke-opacity=".38"/>`;
  }

  s+=`<circle cx="350" cy="350" r="169" fill="#080a10" fill-opacity=".46" stroke="#8d98bd" stroke-opacity=".32"/>
  <circle cx="350" cy="350" r="92" fill="#111827" fill-opacity=".62" stroke="#aab5d9" stroke-opacity=".35"/>
  <circle cx="350" cy="350" r="5" fill="#ffd166" filter="url(#softGlow)"/>
  <text x="350" y="335" text-anchor="middle" class="center-title">PERSONAL</text><text x="350" y="360" text-anchor="middle" class="center-title">CLIMATE</text><text x="350" y="383" text-anchor="middle" class="center-sub">EPICENTER</text>`;

  ['N','NE','E','SE','S','SW','W','NW'].forEach((d,i)=>{
    const[x,y]=point(cx,cy,346,i*45);
    s+=`<text x="${x}" y="${y+6}" text-anchor="middle" class="${d==='E'?'dir east':'dir'}">${d}</text>`;
  });
  s+=`<text x="637" y="338" text-anchor="middle" class="asc-label">ASC</text><text x="63" y="338" text-anchor="middle" class="dsc-label">DSC</text>`;

  PLANETS.forEach(([n,g],i)=>{
    const angle=((asc+24+i*27.1)%360)+rot,[x,y]=point(cx,cy,132,angle);
    s+=`<circle cx="${x}" cy="${y}" r="15" fill="#121724" fill-opacity=".72" stroke="#e1e6f5" stroke-opacity=".55"/><text x="${x}" y="${y+7}" text-anchor="middle" class="planet-glyph">${g}</text>`;
  });
  return s+'</svg><div class="legend-note">The wheel is now deliberately translucent for map overlay. Planet positions remain demonstration placements until the sidereal ephemeris engine is connected.</div>';
}
function profileView(){const p=state.profile,pr=p.planetRoles[state.selectedPlanet]||[],hr=p.houseRoles[state.selectedHouse]||[];return `<div class="grid two"><section class="panel"><span class="eyebrow">PROFILE MODE</span><h2>Build your astrology profile</h2><div class="segmented">${[['automatic','Calculate My Chart'],['manual','Build Manually'],['quick','Quick Reading']].map(([m,l])=>`<button data-mode="${m}" class="${p.mode===m?'active':''}">${l}</button>`).join('')}</div><h3>Manual Ascendant</h3><div class="form-grid"><label>Sign<select id="ascSign">${SIGNS.map(x=>`<option ${x===p.ascSign?'selected':''}>${x}</option>`).join('')}</select></label><label>Degree<input id="ascDegree" type="number" min="0" max="29" value="${p.ascDegree}"></label><label>Minute<input id="ascMinute" type="number" min="0" max="59" value="${p.ascMinute}"></label><label>Second<input id="ascSecond" type="number" min="0" max="59" value="${p.ascSecond}"></label></div><div class="status-line">Manual ASC: <b>${p.ascSign} ${p.ascDegree}° ${p.ascMinute}′ ${p.ascSecond}″</b></div></section><section class="panel"><span class="eyebrow">PERSONAL MEANINGS</span><h2>Planet & house roles</h2><div class="planet-picker">${PLANETS.map(([n,g])=>`<button data-planet="${n}" class="${state.selectedPlanet===n?'selected':''}"><span>${g}</span>${n}</button>`).join('')}</div><div class="tag-editor"><div class="tag-title">${state.selectedPlanet} roles</div><div class="tags">${pr.map((x,i)=>`<button class="tag" data-remove-planet="${i}">${esc(x)} ×</button>`).join('')}</div><div class="add-row"><input id="planetRoleInput" placeholder="e.g. ASC Lord, 5th Lord"><button id="addPlanetRole">+ Add</button></div></div><div class="house-picker top-gap">${Array.from({length:12},(_,i)=>i+1).map(n=>`<button data-house="${n}" class="${state.selectedHouse===n?'selected':''}">H${n}</button>`).join('')}</div><div class="tag-editor"><div class="tag-title">House ${state.selectedHouse} meanings</div><div class="tags">${hr.map((x,i)=>`<button class="tag" data-remove-house="${i}">${esc(x)} ×</button>`).join('')}</div><div class="add-row"><input id="houseRoleInput" placeholder="e.g. home business, children"><button id="addHouseRole">+ Add</button></div></div></section></div>`}
function climateView(){const p=state.profile;return `<div class="climate-layout"><section class="panel controls"><span class="eyebrow">PERSONAL CLIMATE SCOPE</span><h2>Geographic astrology</h2><label>Location or address<input placeholder="Enter a city, neighborhood, street or address"></label><label>Projection scale<select id="scale">${['World','Country','State','City','Neighborhood','Street'].map(x=>`<option ${x===state.scale?'selected':''}>${x}</option>`).join('')}</select></label><div class="notice">No API keys are used in this static build. Map/geocoding can later use open-data services, and astronomical calculations can run locally on our own backend.</div><div class="metric"><span>Epicenter mode</span><b>${state.scale} center</b></div><div class="metric"><span>Ascendant</span><b>${p.ascSign} ${p.ascDegree}°${p.ascMinute}′</b></div><div class="metric"><span>Compass rule</span><b>ASC East · DSC West</b></div></section><section class="panel wheel-panel"><div class="wheel-wrap">${wheel()}</div></section></div>`}
function horoscopeView(){return `<div class="grid two"><section class="panel hero-panel"><span class="eyebrow">DAILY HOROSCOPE</span><h1>Structured Vedic forecasting</h1><p>Forecasts will combine manually entered or calculated roles, transits, nakshatras, house lords, aspects, Bhavat Bhavam and Personal Climate.</p></section><section class="panel"><h2>Life areas</h2><div class="life-grid">${['Daily Overview','Self & Direction','Home & Family','Relationships','Career & Work','Money & Earning','Health & Vitality','Travel','Neighbors & Local Activity','Creativity & Recreation'].map((x,i)=>`<button><span>${String(i+1).padStart(2,'0')}</span>${x}</button>`).join('')}</div></section></div>`}
function render(){document.querySelector('#app').innerHTML=`<div class="app-shell"><aside><div class="brand"><div class="brand-mark">ॐ</div><div><b>VEDIC</b><span>CLIMATE SCOPE</span></div></div><nav>${[['horoscope','Horoscope'],['climate','Climate Scope'],['profile','Profile'],['settings','Settings']].map(([id,l])=>`<button data-tab="${id}" class="${state.tab===id?'active':''}">${l}</button>`).join('')}</nav><button class="reset" id="reset">↻ Reset demo profile</button></aside><main><header><div><span class="eyebrow">SIDEREAL ASTROLOGY PLATFORM</span><h1>${state.tab==='climate'?'Personal Climate Scope':state.tab==='profile'?'Personal Astrology Profile':state.tab==='horoscope'?'Daily Vedic Horoscope':'Calculation Settings'}</h1></div><div class="pill">Lahiri · 27 Nakshatras · Bhavat Bhavam</div></header>${state.tab==='profile'?profileView():state.tab==='climate'?climateView():state.tab==='horoscope'?horoscopeView():'<section class="panel"><h2>Calculation specification</h2><p>This page will hold ayanamsa, node type, house method, aspect rules, outer-planet rules and projection settings.</p></section>'}</main></div>`;bind()}
function bind(){document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render()});const reset=document.querySelector('#reset');if(reset)reset.onclick=()=>{state.profile=structuredClone(DEFAULT_PROFILE);save();render()};document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.profile.mode=b.dataset.mode;save();render()});document.querySelectorAll('[data-planet]').forEach(b=>b.onclick=()=>{state.selectedPlanet=b.dataset.planet;render()});document.querySelectorAll('[data-house]').forEach(b=>b.onclick=()=>{state.selectedHouse=+b.dataset.house;render()});['ascSign','ascDegree','ascMinute','ascSecond'].forEach(id=>{const e=document.querySelector('#'+id);if(e)e.onchange=()=>{state.profile[id]=e.value;save();render()}});const scale=document.querySelector('#scale');if(scale)scale.onchange=()=>{state.scale=scale.value;render()};const ap=document.querySelector('#addPlanetRole');if(ap)ap.onclick=()=>{const e=document.querySelector('#planetRoleInput'),v=e.value.trim();if(v){(state.profile.planetRoles[state.selectedPlanet]??=[]).push(v);save();render()}};document.querySelectorAll('[data-remove-planet]').forEach(b=>b.onclick=()=>{state.profile.planetRoles[state.selectedPlanet].splice(+b.dataset.removePlanet,1);save();render()});const ah=document.querySelector('#addHouseRole');if(ah)ah.onclick=()=>{const e=document.querySelector('#houseRoleInput'),v=e.value.trim();if(v){(state.profile.houseRoles[state.selectedHouse]??=[]).push(v);save();render()}};document.querySelectorAll('[data-remove-house]').forEach(b=>b.onclick=()=>{state.profile.houseRoles[state.selectedHouse].splice(+b.dataset.removeHouse,1);save();render()})}
render();
