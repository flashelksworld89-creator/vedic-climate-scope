"use client";

import { useState } from "react";
import {
  SwissEphemeris,
  Planet,
  LunarPoint,
  HouseSystem,
  SiderealMode,
  CalculationFlag
} from "@swisseph/browser";
import { buildInterpretation, formatDeg, norm } from "../lib/jyotish";

type ChartResult = ReturnType<typeof buildInterpretation> & {
  ayanamsa:number;
  utc:string;
};

export default function Home(){
  const now = new Date();
  const [form,setForm] = useState({
    name:"",
    place:"Las Vegas, Nevada",
    date: now.toISOString().slice(0,10),
    time: now.toTimeString().slice(0,5),
    utcOffset:"-7",
    latitude:"36.1716",
    longitude:"-115.1391"
  });
  const [chart,setChart] = useState<ChartResult|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  const update=(key:string,value:string)=>setForm(p=>({...p,[key]:value}));

  async function calculate(){
    setLoading(true); setError("");
    let swe: SwissEphemeris | null = null;
    try{
      const lat=Number(form.latitude), lon=Number(form.longitude), off=Number(form.utcOffset);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(off)) throw new Error("Latitude, longitude and UTC offset must be numbers.");

      const [y,m,d]=form.date.split("-").map(Number);
      const [hh,mm]=form.time.split(":").map(Number);
      const utcMs=Date.UTC(y,m-1,d,hh,mm)-off*3600000;
      const date=new Date(utcMs);

      swe = new SwissEphemeris();
      await swe.init();
      swe.setSiderealMode(SiderealMode.Lahiri);

      const jd=swe.dateToJulianDay(date);
      const ayanamsa=swe.getAyanamsa(jd);
      const flags=CalculationFlag.MoshierEphemeris | CalculationFlag.Speed | CalculationFlag.Sidereal;
      const bodyDefs=[
        ["Sun",Planet.Sun],["Moon",Planet.Moon],["Mercury",Planet.Mercury],["Venus",Planet.Venus],
        ["Mars",Planet.Mars],["Jupiter",Planet.Jupiter],["Saturn",Planet.Saturn],["Rahu",LunarPoint.TrueNode]
      ] as const;

      const bodies=bodyDefs.map(([name,id])=>{
        const p=swe!.calculatePosition(jd,id,flags);
        return {name,longitude:norm(p.longitude),speed:p.longitudeSpeed};
      });

      const rahu=bodies.find(b=>b.name==="Rahu")!;
      bodies.push({name:"Ketu",longitude:norm(rahu.longitude+180),speed:rahu.speed});

      const houses=swe.calculateHouses(jd,lat,lon,HouseSystem.WholeSign);
      const siderealAsc=norm(houses.ascendant-ayanamsa);
      const interpreted=buildInterpretation(siderealAsc,bodies);
      setChart({...interpreted,ayanamsa,utc:date.toISOString()});
    }catch(e){
      setError(e instanceof Error ? e.message : "Calculation failed.");
    }finally{
      if(swe) swe.close();
      setLoading(false);
    }
  }

  return <main>
    <header className="hero">
      <div className="eyebrow">JYOTISH • LAHIRI SIDEREAL • DIAGNOSTIC V1</div>
      <h1>Deep Vedic Horoscope</h1>
      <p>Exact astronomical placements first. Classical interpretation second. Every interpretation shows the chart factors used to produce it.</p>
    </header>

    <section className="panel formPanel">
      <h2>Birth data</h2>
      <div className="grid">
        <label>Name<input value={form.name} onChange={e=>update("name",e.target.value)} placeholder="Optional"/></label>
        <label>Place label<input value={form.place} onChange={e=>update("place",e.target.value)}/></label>
        <label>Date<input type="date" value={form.date} onChange={e=>update("date",e.target.value)}/></label>
        <label>Local time<input type="time" value={form.time} onChange={e=>update("time",e.target.value)}/></label>
        <label>UTC offset<input type="number" step="0.25" value={form.utcOffset} onChange={e=>update("utcOffset",e.target.value)}/></label>
        <label>Latitude<input type="number" step="0.0001" value={form.latitude} onChange={e=>update("latitude",e.target.value)}/></label>
        <label>Longitude<input type="number" step="0.0001" value={form.longitude} onChange={e=>update("longitude",e.target.value)}/></label>
      </div>
      <button onClick={calculate} disabled={loading}>{loading?"Calculating…":"Generate sidereal chart"}</button>
      <p className="fine">V1 uses explicit coordinates and UTC offset so no geocoder or timezone guess can silently alter the Ascendant.</p>
      {error && <div className="error">{error}</div>}
    </section>

    {chart && <>
      <section className="metrics">
        <div className="metric"><span>Ascendant</span><strong>{chart.asc.sign} {formatDeg(chart.asc.degree)}</strong></div>
        <div className="metric"><span>Lagna lord</span><strong>{chart.lagnaLord}</strong></div>
        <div className="metric"><span>Ayanamsa</span><strong>{chart.ayanamsa.toFixed(6)}°</strong></div>
        <div className="metric"><span>UTC used</span><strong>{chart.utc.replace(".000Z","Z")}</strong></div>
      </section>

      <section className="panel">
        <div className="sectionHead"><div><div className="eyebrow">RAW CHART STATE</div><h2>Sidereal placements</h2></div><span className="badge">Lahiri</span></div>
        <div className="tableWrap"><table>
          <thead><tr><th>Graha</th><th>Sign</th><th>Degree</th><th>Nakshatra</th><th>Pada</th><th>Lord</th><th>House</th><th>Motion</th></tr></thead>
          <tbody>{chart.rows.map(r=><tr key={r.name}>
            <td><strong>{r.name}</strong></td><td>{r.sign}</td><td>{formatDeg(r.degree)}</td><td>{r.nakshatra}</td><td>{r.pada}</td><td>{r.nakshatraLord}</td><td>{r.house}</td><td>{r.speed<0?"Retrograde":"Direct"}</td>
          </tr>)}</tbody>
        </table></div>
      </section>

      <section className="twoCol">
        <div className="panel">
          <div className="eyebrow">CLASSICAL RULE LAYER</div>
          <h2>First-pass interpretation</h2>
          {chart.themes.map((t,i)=><p className="theme" key={i}>{t}</p>)}
          <div className="notice">This version deliberately stops short of claiming a fully synthesized life prediction. Dasha, Shadbala, Ashtakavarga, yogas, vargas and cancellation rules are the next layers.</div>
        </div>
        <div className="panel evidence">
          <div className="eyebrow">WHY THE ENGINE SAID IT</div>
          <h2>Evidence</h2>
          {chart.evidence.map((x,i)=><div className="evidenceRow" key={i}><span>{String(i+1).padStart(2,"0")}</span><p>{x}</p></div>)}
        </div>
      </section>
    </>}

    <footer>
      <strong>Calculation policy:</strong> Lahiri sidereal zodiac, true lunar node, whole-sign house assignment for Jyotish interpretation. Astrology is a traditional interpretive system, not a scientifically validated prediction method.
    </footer>
  </main>;
}
