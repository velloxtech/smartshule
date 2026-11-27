import {Pool} from 'pg';
import {DocumentRegistry,SerializedDocument,serializeDocument,generateShortDocumentSerial} from '../../../application/documents/DocumentRegistry';

export class PostgresDocumentRegistry implements DocumentRegistry {
  constructor(private pool:Pool,private nextSerial:()=>string=generateShortDocumentSerial){}
  private async expose(row:any):Promise<SerializedDocument>{
    const record=this.map(row);
    const existing=await this.pool.query('SELECT serial FROM document_serial_aliases WHERE document_serial=$1',[record.serial]);
    if(existing.rows[0])return {...record,serial:existing.rows[0].serial};
    for(let attempt=0;attempt<20;attempt++){
      const serial=this.nextSerial();
      const inserted=await this.pool.query('INSERT INTO document_serial_aliases (serial,document_serial) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING serial',[serial,record.serial]);
      if(inserted.rows[0])return {...record,serial:inserted.rows[0].serial};
      // Another request may have issued this document's alias, or the short code collided.
      const concurrent=await this.pool.query('SELECT serial FROM document_serial_aliases WHERE document_serial=$1',[record.serial]);
      if(concurrent.rows[0])return {...record,serial:concurrent.rows[0].serial};
    }
    throw new Error('Could not allocate a unique document serial. Please try again.');
  }
  private map(row:any):SerializedDocument{return {...row.payload,issuedAt:new Date(row.issued_at).toISOString()};}
  async issue(schoolId:string,type:string,snapshot:any){
    const row=serializeDocument(schoolId,type,snapshot);
    await this.pool.query('INSERT INTO document_serial_registry (serial,school_id,document_type,document_id,content_hash,payload) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (school_id,document_type,document_id,content_hash) DO NOTHING',[row.serial,schoolId,type,row.documentId,row.contentHash,JSON.stringify(row)]);
    const result=await this.pool.query('SELECT * FROM document_serial_registry WHERE school_id=$1 AND document_type=$2 AND document_id=$3 AND content_hash=$4',[schoolId,type,row.documentId,row.contentHash]);
    return this.expose(result.rows[0]);
  }
  async find(schoolId:string,serial:string){const r=await this.pool.query('SELECT r.* FROM document_serial_registry r LEFT JOIN document_serial_aliases a ON a.document_serial=r.serial WHERE r.school_id=$1 AND (r.serial=$2 OR a.serial=$2)',[schoolId,serial]);return r.rows[0]?this.expose(r.rows[0]):null;}
  async list(schoolId:string){const r=await this.pool.query('SELECT * FROM document_serial_registry WHERE school_id=$1 ORDER BY issued_at DESC LIMIT 200',[schoolId]);return Promise.all(r.rows.map(row=>this.expose(row)));}
}
