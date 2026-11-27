import type {CBCReportCardData} from '../types';

export function isValidReportDocumentSerial(serial:string):boolean {
  const short=/^[A-Z0-9]{7,9}$/i.test(serial)&&(serial.match(/[A-Z]/gi)||[]).length===3&&(serial.match(/[0-9]/g)||[]).length>=4&&(serial.match(/[0-9]/g)||[]).length<=6;
  const legacy=/^SS-[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(serial);
  return short||legacy;
}

export interface ReportDocumentScope {studentId:string;termId:string;academicYearId:string}
export async function resolveReportDocumentSerial(
  current:CBCReportCardData|null,
  scope:ReportDocumentScope,
  fetchReport:()=>Promise<{success:boolean;data?:CBCReportCardData}>,
):Promise<CBCReportCardData>{
  const matches=(report?:CBCReportCardData|null)=>report?.studentId===scope.studentId&&report.termId===scope.termId&&report.academicYearId===scope.academicYearId;
  let report=current;
  if(!matches(report)||!report?.documentSerial){
    const response=await fetchReport();
    report=response.success?response.data||null:null;
  }
  if(!matches(report)||!isValidReportDocumentSerial(report?.documentSerial||'')){
    throw new Error('The report’s document serial could not be issued. Please refresh the report and try again.');
  }
  return report!;
}
