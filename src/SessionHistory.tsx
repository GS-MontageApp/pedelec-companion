import {BatteryCharging,ChevronRight,Clock} from 'lucide-react';
import type {Session} from './domain';
import {elapsed} from './domain';
import {completedSessions,sessionSummary} from './history';
import {testSuggestion} from './travel';

const date=(n:number)=>new Date(n).toLocaleDateString('de-DE');
const time=(n:number)=>new Date(n).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
const exactTime=(n:number)=>new Date(n).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

export default function SessionHistory({sessions,storageOk,onTestChange}:{sessions:Session[];storageOk:boolean;onTestChange:(id:string,isTest:boolean)=>Promise<void>}) {
  const completed=completedSessions(sessions);
  return <section className="history card completed-history" id="ladehistorie" aria-labelledby="history-title">
    <div className="section-title"><h2 id="history-title">Bisherige Ladevorgänge</h2><span className="count">{completed.length}</span></div>
    <p className="subtitle">Deine abgeschlossenen Ladepausen. Neueste zuerst.</p>
    <p className="history-storage">{storageOk?'In diesem Browser gespeichert · nach Neuladen verfügbar':'Aktueller Stand nur in dieser geöffneten App · Speichern fehlgeschlagen'}</p>
    {!completed.length&&<div className="empty"><Clock size={23}/><p>Noch kein abgeschlossener Ladevorgang.<br/><small>Nach „Beenden“ findest du deine Sitzung hier.</small></p></div>}
    {completed.map(session=>{
      const {points,start,end}=sessionSummary(session);
      const {bike,configuration,batteries,charger}=session.snapshot;
      return <details className="session-record" key={session.id} data-session-id={session.id}>
        <summary>
          <div className="session-heading"><span><strong>{date(session.startedAt)}</strong>{session.isTest&&<span className="badge test-badge">TEST · nicht für Prognosen</span>}<small>{time(session.startedAt)} – {time(session.endedAt!)} Uhr{date(session.startedAt)!==date(session.endedAt!)?` · Ende ${date(session.endedAt!)}`:''}</small></span><ChevronRight size={20}/></div>
          <div className="session-stats"><span><small>Dauer</small><b>{elapsed(session.startedAt,session.endedAt!)}</b></span><span><small>Start-SOC</small><b>{start?`${start.soc} %`:'Nicht erfasst'}</b></span><span><small>End-SOC</small><b>{session.endSoc!=null?`${session.endSoc} %`:'Nicht erfasst'}</b></span></div>
          <div className="session-setup"><strong>{bike.manufacturer} · {bike.name}</strong><span><BatteryCharging size={15}/>{batteries.map(b=>`${b.nominalWh} Wh`).join(' + ')} · {configuration.id}</span><span>{charger.name} · {charger.amps} A</span></div>
          <span className="session-open">Alle {points.length} Messwerte und Setup ansehen</span>
        </summary>
        <div className="session-details">
          {!session.isTest&&testSuggestion(session)&&<p className="notice">{testSuggestion(session)} Es wird nichts automatisch gelöscht.</p>}
          <label className="unknown-soc"><input type="checkbox" checked={!!session.isTest} onChange={e=>{void onTestChange(session.id,e.target.checked);}}/>Test-Ladevorgang · von Lern-/Prognosedaten ausschließen</label>
          <p className="history-footnote">{session.endSoc!=null?`Bestätigter End-SOC${end?` · Messung vom ${date(end.measuredAt)} um ${exactTime(end.measuredAt)} Uhr`:''}.`:'End-SOC nicht erfasst. Frühere Zwischenstände werden nicht als Endwert übernommen.'}</p>
          <h3>Damals verwendetes Setup</h3>
          <dl className="snapshot-list"><dt>Fahrrad</dt><dd>{bike.manufacturer} · {bike.name}<small>{bike.system} · ID {bike.id}</small></dd><dt>Akkukonfiguration</dt><dd>{configuration.id}<small>Gültig ab {date(new Date(configuration.validFrom).getTime())}{configuration.validUntil?` bis ${date(new Date(configuration.validUntil).getTime())}`:''}</small></dd><dt>Physische Akkus</dt><dd>{batteries.map(b=><span key={b.id}>{b.name} · {b.nominalWh} Wh<small>ID {b.id}{b.soh!==undefined?` · SOH ${b.soh} %`:''}</small></span>)}</dd><dt>Ladegerät</dt><dd>{charger.name} · {charger.amps} A<small>ID {charger.id}</small></dd></dl>
          <p className="history-footnote">Gespeicherter Snapshot vom Ladestart. Spätere Profiländerungen verändern diesen Eintrag nicht.</p>
          <h3 className="history-measurements-title">Sämtliche Messwerte</h3>
          {points.length===0&&<p className="history-footnote">Keine Messwerte erfasst.</p>}
          {points.map((m,index)=><div className="measurement" key={m.id}><span className="measurement-dot"/><div><strong>{m.id===session.endMeasurementId?'Abschlusswert':index===0?'Ladestart':'Zwischenstand'}</strong><small>Gemessen {date(m.measuredAt)} · {exactTime(m.measuredAt)} Uhr</small><small>Erfasst {date(m.recordedAt)} · {exactTime(m.recordedAt)} Uhr</small>{m.quality?.status==='flagged'?<><small className="quality-flag">Auffällig · {m.quality.confirmedAt?'bestätigt · ':''}für Prognosen gesperrt</small>{m.quality.issues.map((issue,i)=><small className="quality-flag" key={i}>{issue.message}</small>)}</>:(!m.quality||m.quality.status==='unreviewed')?<small>Ungeprüft · für Prognosen gesperrt</small>:null}</div><b>{m.soc} %</b></div>)}
        </div>
      </details>;
    })}
  </section>;
}
