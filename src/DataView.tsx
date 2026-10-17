import {memo,useState} from 'react';
import type {AppState} from './domain';
import TravelDiary from './TravelDiary';
import SessionHistory from './SessionHistory';
import {deleteSession} from './sessionLifecycle';

function DataView({state,onSave,storageOk,onDiaryEditing,onHistoryEditing}:{state:AppState;onSave:(state:AppState)=>Promise<boolean>;storageOk:boolean;onDiaryEditing:(editing:boolean)=>void;onHistoryEditing:(editing:boolean)=>void}) {
 const [section,setSection]=useState<'rides'|'charges'|null>(null);
 // Both components stay mounted while folded, so switching sections never discards a draft.
 return <><TravelDiary state={state} onSave={onSave} onEditingChange={onDiaryEditing} expanded={section==='rides'} onExpandedChange={open=>setSection(open?'rides':null)}/><SessionHistory sessions={state.sessions} rideDays={state.rideDays??[]} storageOk={storageOk} expanded={section==='charges'} onExpandedChange={open=>setSection(open?'charges':null)} onEditingChange={onHistoryEditing} onDelete={async id=>onSave(deleteSession(state,id))} onTestChange={async(id,isTest)=>{await onSave({...state,sessions:state.sessions.map(s=>s.id===id?{...s,isTest}:s)});}}/></>;
}

// Timer ticks in App must not rebuild large, unchanged history lists.
export default memo(DataView);
