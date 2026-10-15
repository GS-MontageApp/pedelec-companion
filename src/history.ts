import type {Session} from './domain.ts';
import {chronological} from './charging.ts';

export function completedSessions(sessions: Session[]): Session[] {
  return sessions.filter(s=>s.endedAt!==undefined)
    .sort((a,b)=>b.startedAt-a.startedAt || b.endedAt!-a.endedAt!);
}

export function sessionSummary(session: Session) {
  const points=chronological(session.measurements);
  return {points,start:points[0],end:points.find(m=>m.id===session.endMeasurementId)};
}
