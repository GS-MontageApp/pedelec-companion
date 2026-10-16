import type {AppState} from './domain.ts';
// Explicit single-record deletion, persisted by the caller in one transaction.
export function deleteSession(state:AppState,id:string):AppState {
 const selected=state.sessions.find(s=>s.id===id);
 if(!selected)throw new Error('Dieser Ladevorgang wurde nicht gefunden. Bitte neu laden.');
 if(selected.endedAt===undefined)throw new Error('Bitte den laufenden Ladevorgang zuerst abschließen.');
 return {...state,sessions:state.sessions.filter(s=>s.id!==id),rideDays:state.rideDays?.map(day=>day.sessionIds.includes(id)?{...day,sessionIds:day.sessionIds.filter(link=>link!==id)}:day)};
}
