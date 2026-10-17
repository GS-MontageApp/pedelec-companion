import {ChevronRight} from 'lucide-react';
import type {SyntheticEvent} from 'react';

export function AccordionHeading({id,title,count,expanded,onToggle,controls}:{id:string;title:string;count:number;expanded:boolean;onToggle:()=>void;controls:string}) {
 return <h2 id={id}><button type="button" className="accordion-heading" aria-label={title} aria-expanded={expanded} aria-controls={controls} onClick={onToggle}><span>{title}</span><span className="count">{count}</span><ChevronRight size={20} aria-hidden="true" className={expanded?'rotated':''}/></button></h2>;
}

// Identical row behaviour for both lists, including programmatic opening by ID.
// Native name groups handle modern browsers; this fallback also supports older ones.
export function singleRecordToggle(event:SyntheticEvent<HTMLDetailsElement>) {
 const record=event.currentTarget;
 if(event.target!==record||!record.open)return;
 const group=record.getAttribute('name');
 record.parentElement?.querySelectorAll<HTMLDetailsElement>('details[name]').forEach(other=>{if(other!==record&&other.getAttribute('name')===group)other.open=false;});
}
