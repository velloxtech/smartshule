import {Response,NextFunction} from 'express';
import {AuthenticatedRequest} from './authMiddleware';
import {DocumentRegistry} from '../../../application/documents/DocumentRegistry';

/** Register only server-produced documents after their normal authorization has succeeded. */
export function documentSerialization(registry:DocumentRegistry) {
  return (req:AuthenticatedRequest,res:Response,next:NextFunction)=>{
    const report=/^\/CBC\/report-cards(?:\/generate)?\/?$/i.test(req.path);
    const receipt=req.path.match(/^\/finance\/payments\/([^/]+)\/receipt\/?$/);
    const match=req.path.match(/^\/(schemes|lesson-plans|records-of-work)(?:\/[^/]+(?:\/(?:export|print))?)?\/?$/);
    if((!match&&!report&&!receipt)||!req.user?.schoolId||req.method==='DELETE')return next();
    const type=report?'REPORT_CARD':receipt?'PAYMENT_RECEIPT':({'schemes':'SCHEME_OF_WORK','lesson-plans':'LESSON_PLAN','records-of-work':'RECORD_OF_WORK'} as Record<string,string>)[match![1]];
    const schoolId=req.user.schoolId;
    const json=res.json.bind(res);
    res.json=((body:any)=>{
      if(res.statusCode>=400||!body?.success)return json(body);
      const enrich=async(row:any)=>{
        if(receipt&&row?.receipt){const issued=await registry.issue(schoolId,type,{...row.receipt,id:receipt[1],title:`Payment receipt ${row.receipt.receiptNumber||receipt[1]}`});return {...row,receipt:{...row.receipt,documentSerial:issued.serial,documentHash:issued.contentHash}};}
        if(!row?.id||(!report&&!row.teacherId))return row;
        const issued=await registry.issue(schoolId,type,row);
        return {...row,documentSerial:issued.serial,documentHash:issued.contentHash};
      };
      void (async()=>{
        const data=Array.isArray(body.data)?await Promise.all(body.data.map(enrich)):await enrich(body.data);
        json({...body,data});
      })().catch(error=>{res.json=json;next(error);});
      return res;
    }) as typeof res.json;
    next();
  };
}
