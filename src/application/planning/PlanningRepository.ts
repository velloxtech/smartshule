import { Pool } from 'pg';
import { ConflictError } from '../../core/domain/shared/Errors';
export interface PlanningDocument { key: string; schoolId: string; kind: 'CALENDAR'|'SEQUENCE'; revision: number; data: any }
export interface PlanningRepository { get(key: string): Promise<PlanningDocument|null>; save(doc: PlanningDocument, expectedRevision: number): Promise<void> }
export class MemoryPlanningRepository implements PlanningRepository {
  private records = new Map<string, PlanningDocument>();
  async get(key:string) { const d=this.records.get(key);return d ? JSON.parse(JSON.stringify(d)) : null; }
  async save(doc:PlanningDocument, expected:number) { if((this.records.get(doc.key)?.revision || 0)!==expected) throw new ConflictError('Planning configuration changed; reload before saving.');this.records.set(doc.key,JSON.parse(JSON.stringify(doc))); }
}
export class PostgresPlanningRepository implements PlanningRepository {
  constructor(private pool: Pool) {}
  async get(key:string) { let r;try{r=await this.pool.query('SELECT * FROM curriculum_planning_config WHERE key=$1',[key]);}catch(e:any){if(e.code==='42P01')throw new ConflictError('Planning configuration is not yet available. Contact the school administrator.');throw e;}return r.rows[0] ? {key:r.rows[0].key,schoolId:r.rows[0].school_id,kind:r.rows[0].kind,revision:r.rows[0].revision,data:r.rows[0].data} : null; }
  async save(d:PlanningDocument,expected:number) {
    const r=await this.pool.query(`INSERT INTO curriculum_planning_config(key,school_id,kind,revision,data) SELECT $1,$2,$3,$4,$5 WHERE $6=0 ON CONFLICT(key) DO UPDATE SET revision=$4,data=$5,updated_at=now() WHERE curriculum_planning_config.revision=$6 RETURNING key`,[d.key,d.schoolId,d.kind,d.revision,JSON.stringify(d.data),expected]);
    // Existing documents need an UPDATE when the insert SELECT is intentionally empty.
    if(!r.rowCount && expected>0){const u=await this.pool.query('UPDATE curriculum_planning_config SET revision=$1,data=$2,updated_at=now() WHERE key=$3 AND revision=$4',[d.revision,JSON.stringify(d.data),d.key,expected]);if(u.rowCount)return;}
    if(!r.rowCount)throw new ConflictError('Planning configuration changed; reload before saving.');
  }
}
