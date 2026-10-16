import {Delete} from 'lucide-react';
import {validSoc} from './domain';

export function keypadValue(value:string,key:string){
 if(key==='clear')return '';
 if(key==='delete')return value.slice(0,-1);
 if(!/^\d$/.test(key))return value;
 const next=value==='0'?key:value+key;
 return validSoc(next)?next:value;
}
export default function SocKeypad({value,onChange}:{value:string;onChange:(value:string)=>void}){
 return <div className="keypad">{['1','2','3','4','5','6','7','8','9','clear','0','delete'].map(key=><button type="button" key={key} aria-label={key==='delete'?'Letzte Ziffer löschen':key==='clear'?'Eingabe löschen':key} onClick={()=>onChange(keypadValue(value,key))}>{key==='delete'?<Delete/>:key==='clear'?'C':key}</button>)}</div>;
}
