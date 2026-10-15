import Dexie, {type Table} from 'dexie';
import type {Bike,Battery,Charger,Configuration,Session,Measurement,RideDay,TourLink,BoschDayStats} from './domain.ts';
type StoredSession=Omit<Session,'measurements'>;
export class CompanionDB extends Dexie {
  bikes!:Table<Bike,string>;batteries!:Table<Battery,string>;chargers!:Table<Charger,string>;configurations!:Table<Configuration,string>;
  sessions!:Table<StoredSession,string>;measurements!:Table<Measurement & {sessionId:string;order:number},string>;
  rideDays!:Table<RideDay,string>;tourLinks!:Table<TourLink,string>;boschStats!:Table<BoschDayStats,string>;
  meta!:Table<{id:string;activeBikeId:string;chargerId:string;revision:number},string>;
  constructor(name='pedelec-companion-v2') {
    super(name);
    this.version(1).stores({bikes:'id',batteries:'id',chargers:'id',configurations:'id,bikeId',sessions:'id,startedAt,endedAt',measurements:'id,sessionId',rideDays:'id,date,bikeId',tourLinks:'id,rideDayId',boschStats:'id,&rideDayId',meta:'id'});
  }
}
export const db=new CompanionDB();
