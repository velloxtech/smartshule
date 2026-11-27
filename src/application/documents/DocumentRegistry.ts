import {createHash, randomUUID, randomInt} from 'crypto';

export interface SerializedDocument {
  serial: string; schoolId: string; documentType: string; documentId: string;
  contentHash: string; title: string; issuedAt: string; snapshot: any;
}
export interface DocumentRegistry {
  issue(schoolId:string, documentType:string, snapshot:any):Promise<SerializedDocument>;
  find(schoolId:string,serial:string):Promise<SerializedDocument|null>;
  list(schoolId:string):Promise<SerializedDocument[]>;
}
function canonical(value:any):any {
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>!['documentSerial','documentHash'].includes(k)).map(k=>[k,canonical(value[k])]));
  return value;
}
export function serializeDocument(schoolId:string,documentType:string,snapshot:any):SerializedDocument {
  const clean=canonical(JSON.parse(JSON.stringify(snapshot)));
  return {serial:`SS-${randomUUID().toUpperCase()}`,schoolId,documentType,documentId:snapshot.id,
    contentHash:createHash('sha256').update(JSON.stringify(clean)).digest('hex'),
    title:snapshot.title||snapshot.lessonTopic||snapshot.subjectAndGrade||documentType.replace(/_/g,' '),issuedAt:new Date().toISOString(),snapshot:clean};
}
/** Public serials contain three letters interspersed with six digits. */
export function generateShortDocumentSerial():string {
  const letters='ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digit=()=>String(randomInt(10));
  const letter=()=>letters[randomInt(letters.length)];
  return `${digit()}${letter()}${digit()}${digit()}${letter()}${digit()}${letter()}${digit()}${digit()}`;
}
/** Original issuance records remain immutable; short aliases preserve old printed serials. */
export class MemoryDocumentRegistry implements DocumentRegistry {
  private rows:SerializedDocument[]=[];
  private aliases=new Map<string,string>();
  private aliasesByDocument=new Map<string,string>();
  constructor(private nextSerial:()=>string=generateShortDocumentSerial){}
  private expose(row:SerializedDocument):SerializedDocument {
    let serial=this.aliasesByDocument.get(row.serial);
    if(!serial){
      for(let attempt=0;attempt<20;attempt++){
        const candidate=this.nextSerial();
        if(this.aliases.has(candidate))continue;
        serial=candidate;this.aliases.set(serial,row.serial);this.aliasesByDocument.set(row.serial,serial);break;
      }
      if(!serial)throw new Error('Could not allocate a unique document serial. Please try again.');
    }
    return {...structuredClone(row),serial};
  }
  async issue(schoolId:string,type:string,snapshot:any){
    const row=serializeDocument(schoolId,type,snapshot);
    const old=this.rows.find(r=>r.schoolId===schoolId&&r.documentType===type&&r.documentId===row.documentId&&r.contentHash===row.contentHash);
    if(old)return this.expose(old);
    this.rows.push(row);return this.expose(row);
  }
  async find(schoolId:string,serial:string){
    const original=this.aliases.get(serial)||serial;
    const row=this.rows.find(r=>r.schoolId===schoolId&&r.serial===original);
    return row?this.expose(row):null;
  }
  async list(schoolId:string){return this.rows.filter(r=>r.schoolId===schoolId).slice(-200).reverse().map(row=>this.expose(row));}
}
