export const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"] as const;
export const SIGN_LORDS = ["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"] as const;
export const NAKSHATRAS = [
"Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha",
"Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
"Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"
] as const;
export const NAKSHATRA_LORDS = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury","Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury","Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"] as const;

export type BodyRow = {
  name: string;
  longitude: number;
  speed: number;
};

export function norm(v:number){ return ((v % 360) + 360) % 360; }

export function placement(longitude:number){
  const lon = norm(longitude);
  const signIndex = Math.floor(lon / 30);
  const degree = lon % 30;
  const nakSize = 360 / 27;
  const padaSize = nakSize / 4;
  const nakIndex = Math.floor(lon / nakSize);
  const withinNak = lon - nakIndex * nakSize;
  const pada = Math.floor(withinNak / padaSize) + 1;
  return {
    longitude: lon,
    signIndex,
    sign: SIGNS[signIndex],
    degree,
    nakshatra: NAKSHATRAS[nakIndex],
    nakshatraLord: NAKSHATRA_LORDS[nakIndex],
    pada
  };
}

export function houseFromAsc(longitude:number, ascLongitude:number){
  const pSign = Math.floor(norm(longitude)/30);
  const aSign = Math.floor(norm(ascLongitude)/30);
  return ((pSign - aSign + 12) % 12) + 1;
}

export function formatDeg(v:number){
  const d = Math.floor(v);
  const mFloat = (v-d)*60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat-m)*60);
  return `${d}° ${m}′ ${s}″`;
}

export function buildInterpretation(ascLongitude:number, bodies:BodyRow[]){
  const asc = placement(ascLongitude);
  const rows = bodies.map(b => ({...b, ...placement(b.longitude), house: houseFromAsc(b.longitude, ascLongitude)}));
  const byName = Object.fromEntries(rows.map(r=>[r.name,r]));
  const lagnaLord = SIGN_LORDS[asc.signIndex];
  const lagnaLordRow = byName[lagnaLord];
  const moon = byName["Moon"];
  const saturn = byName["Saturn"];
  const jupiter = byName["Jupiter"];
  const rahu = byName["Rahu"];
  const ketu = byName["Ketu"];

  const themes:string[] = [];
  if(lagnaLordRow) themes.push(`The Ascendant is ${asc.sign}, ruled by ${lagnaLord}. Its lord occupies house ${lagnaLordRow.house} in ${lagnaLordRow.sign}, making that house a primary life-development arena.`);
  if(moon) themes.push(`The Moon is in ${moon.nakshatra} pada ${moon.pada}, ruled by ${moon.nakshatraLord}, and occupies house ${moon.house}. Mental processing and day-to-day experience repeatedly return to that house's subjects.`);
  if(jupiter) themes.push(`Jupiter occupies house ${jupiter.house}. Traditional Jyotish treats Jupiter as an enlarging, teaching and protective influence, modified by sign lordship and strength that will be added in the deeper engine.`);
  if(saturn) themes.push(`Saturn occupies house ${saturn.house}. This area tends to demand structure, endurance, realism and delayed mastery rather than effortless results.`);
  if(rahu && ketu) themes.push(`Rahu–Ketu activate the ${rahu.house}/${ketu.house} axis, creating a recurring tension between expansion, appetite and unfamiliar experience on one side and detachment or prior familiarity on the other.`);

  const evidence = [
    `Lagna: ${asc.sign} ${formatDeg(asc.degree)}`,
    lagnaLordRow ? `Lagna lord ${lagnaLord}: house ${lagnaLordRow.house}, ${lagnaLordRow.sign} ${formatDeg(lagnaLordRow.degree)}` : "",
    moon ? `Moon: ${moon.nakshatra} pada ${moon.pada}, house ${moon.house}` : "",
    jupiter ? `Jupiter: house ${jupiter.house}` : "",
    saturn ? `Saturn: house ${saturn.house}` : "",
    rahu ? `Rahu: house ${rahu.house}` : "",
    ketu ? `Ketu: house ${ketu.house}` : ""
  ].filter(Boolean);

  return { asc, rows, lagnaLord, themes, evidence };
}
