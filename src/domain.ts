export interface Battery { id: string; name: string; nominalWh: number; soh?: number; cycles?: number; kilometers?: number; recordedAt: string; source: string }
export interface Configuration { id: string; bikeId: string; batteryIds: string[]; validFrom: string; validUntil?: string }
export interface Bike { id: string; name: string; manufacturer: string; system: string }
export interface Charger { id: string; name: string; amps: number }
export interface MeasurementIssue {
  code: 'soc-decrease' | 'rapid-rise';
  relatedMeasurementId: string;
  message: string;
  // Reserved for a future, empirically justified rise-rate rule.
  deltaSoc?: number;
  elapsedMs?: number;
  ratePercentPerHour?: number;
}
export interface MeasurementQuality {
  status: 'valid' | 'flagged' | 'unreviewed';
  issues: MeasurementIssue[];
  checkedAt: number;
  ruleVersion: 'soc-order-v1';
  confirmedAt?: number;
}
export interface Measurement { id: string; soc: number; measuredAt: number; recordedAt: number; quality?: MeasurementQuality }
export interface Session { id: string; startedAt: number; endedAt?: number; endSoc?: number | null; endMeasurementId?: string; isTest?: boolean; snapshot: { bike: Bike; configuration: Configuration; batteries: Battery[]; charger: Charger }; measurements: Measurement[] }
export interface Catalog {bikes:Bike[];batteries:Battery[];chargers:Charger[];configurations:Configuration[]}
export interface GpxSummary {distanceKm:number;ascentM?:number;descentM?:number;startedAt?:number;endedAt?:number;elapsedMs?:number;pauseMs:number;pauseCount:number;pointCount:number;discardedPoints:number;warnings:string[];algorithm:'gpx-v1'}
export interface TourLink {id:string;rideDayId:string;url?:string;komootId?:string;gpx?:GpxSummary}
export interface BoschDayStats {id:string;rideDayId:string;motorPercent?:number;riderPercent?:number;averageRiderWatts?:number;modes:Partial<Record<'Eco'|'Tour'|'Sport'|'eMTB'|'Turbo',number>>;loadNotes?:string;source:'manuell'}
export interface RideSocPoint {id:string;soc:number;measuredAt:number;recordedAt:number;updatedAt?:number;kind:'start'|'checkpoint'|'end';note?:string}
export interface RideDay {id:string;date:string;bikeId:string;configuration:Configuration;batteries:Battery[];startSoc:number;endSoc?:number;status?:'active'|'completed';socMeasurements?:RideSocPoint[];notes:string;sessionIds:string[];isTest?:boolean;startedAt?:number;endedAt?:number;socBasis?:'combined' | 'unknown'}
export interface AppState { activeBikeId: string; chargerId: string; sessions: Session[];catalog?:Catalog;rideDays?:RideDay[];tourLinks?:TourLink[];boschStats?:BoschDayStats[];revision?:number;showDataNav?:boolean }
export const bikes: Bike[] = [{id:'rm',name:'Supercharger2',manufacturer:'Riese & Müller',system:'Bosch · Nyon 2 (BUI350)'},{id:'yamaha',name:'Touring Hybrid',manufacturer:'Mein zweites Pedelec',system:'Yamaha'}];
export const batteries: Battery[] = [{id:'akku-001',name:'PowerTube · Akku 1',nominalWh:500,soh:94,cycles:128,kilometers:4820,recordedAt:'2026-10-01',source:'Manuelle Demoangabe'},{id:'akku-002',name:'PowerTube · Akku 2',nominalWh:500,recordedAt:'2026-10-01',source:'Manuelle Demoangabe'},{id:'akku-003',name:'Touring · Akku 3',nominalWh:625,recordedAt:'2026-10-01',source:'Manuelle Demoangabe'}];
export const configurations: Configuration[] = [{id:'rm-config-1',bikeId:'rm',batteryIds:['akku-001','akku-002'],validFrom:'2026-01-01'},{id:'yamaha-config-1',bikeId:'yamaha',batteryIds:['akku-003'],validFrom:'2026-01-01'}];
export const chargers: Charger[] = [{id:'compact',name:'Compact Charger',amps:2},{id:'fast',name:'Fast Charger',amps:6}];
export function validSoc(value: string): boolean { return /^\d{1,3}$/.test(value) && Number(value)<=100; }
export function elapsed(start: number, end: number): string { const s=Math.max(0,Math.floor((end-start)/1000)); return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(v=>String(v).padStart(2,'0')).join(':'); }
