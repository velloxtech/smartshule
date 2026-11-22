import {wordDocument} from './WordDocument';
const escapeXML=(value:unknown)=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const value=(input:any)=>Array.isArray(input)?input.join('; '):String(input??'');
const schemeHead=['Week','Date / Period','Lesson','Strand','Sub-strand','Learning outcomes','Learning experiences','Resources','Assessment evidence','Lesson statuses'];
export const monitoringHead=['Week','Planned lessons','Taught / verified','Content covered / not covered','Reason for variance / catch-up plan','Teacher','HOD verification'];
const schemeRows=(data:any)=>data.weeks.flatMap((week:any)=>week.lessons.map((lesson:any)=>[String(week.weekNumber),`${lesson.date} / P${lesson.periodNumber}\n${lesson.startTime}-${lesson.endTime}`,String(lesson.lessonNumber),lesson.entry?.strandTitle||'Not allocated',lesson.entry?.subStrandTitle||'Not allocated',value(lesson.entry?.specificLearningOutcomes),value(lesson.entry?.learningExperiences),value(lesson.entry?.learningResources),value(lesson.entry?.assessmentMethods),`Planned: ${lesson.statuses.planned?'Yes':'No'}; Reported: ${lesson.statuses.reported?'Yes':'No'}; Verified: ${lesson.statuses.taught?'Yes':'No'}; Reflection: ${lesson.statuses.reflection?'Yes':'No'}`]));
export const monitoringRows=(data:any)=>(data.monitoringRegister||[]).map((week:any)=>[String(week.weekNumber),String(week.plannedLessons),String(week.taughtLessons),week.noInstruction?'No scheduled instruction':[`Covered: ${week.contentCovered||'Not yet verified'}`,`Not yet verified: ${week.contentNotCovered||'None'}`].join('\n'),week.varianceReason||'',week.teacher||'',week.hodVerification||'']);
const title=(monitoring:boolean)=>monitoring?'Weekly Syllabus Monitoring Register':'Schemes of Work';
const context=(data:any)=>[data.className,data.learningAreaName,data.academicYearName,data.termName,data.streamName||'Whole class'].filter(Boolean).join(' · ');
function document(data:any,monitoring:boolean):Buffer {
  const head:string[]=monitoring?monitoringHead:schemeHead,rows:string[][]=monitoring?monitoringRows(data):schemeRows(data);
  const widths=monitoring?[600,750,850,3900,3000,1400,1500]:[500,1700,500,1200,1400,1800,1900,1200,1500,1800];
  const paragraph=(text:unknown,bold=false,color='000000')=>`<w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>${bold?'<w:b/>':''}<w:color w:val="${color}"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${escapeXML(text)}</w:t></w:r></w:p>`;
  const row=(cells:any[],header=false)=>`<w:tr><w:trPr>${header?'<w:tblHeader/>':''}<w:cantSplit/></w:trPr>${cells.map((cell,index)=>`<w:tc><w:tcPr><w:tcW w:w="${widths[index]}" w:type="dxa"/>${header?'<w:shd w:fill="7A1228"/>':''}</w:tcPr>${String(cell).split('\n').map(line=>paragraph(line,header,header?'FFFFFF':'000000')).join('')}</w:tc>`).join('')}</w:tr>`;
  const borders=['top','left','bottom','right','insideH','insideV'].map(side=>`<w:${side} w:val="single" w:sz="4" w:color="000000"/>`).join('');
  const note=monitoring?'The teacher updates this register weekly. School leadership verifies coverage against schemes, lesson plans, learner work and assessment evidence. Reported work is not yet verified coverage.':'Lesson dates and durations follow the saved school calendar and timetable. Preparation is distinct from verified teaching.';
  return wordDocument(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(data.school?.name||'School',true,'7A1228')}${paragraph(data.school?.motto||'The Future Begins Here')}${paragraph(title(monitoring),true,'7A1228')}${paragraph(context(data))}${paragraph(note)}${data.scheduleChanged?paragraph('Schedule changed. Review retained allocations before teaching moved lessons.'):''}<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a,b)=>a+b,0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${borders}</w:tblBorders></w:tblPr><w:tblGrid>${widths.map(width=>`<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${row(head,true)}${rows.map((cells:any[])=>row(cells)).join('')}</w:tbl><w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="680" w:bottom="680" w:left="680" w:right="680"/></w:sectPr></w:body></w:document>`);
}

/** Bounded A4 landscape columns, repeated headers and continuation rows for long content. */
function pdf(data:any,monitoring:boolean):Buffer {
  const pdfText=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[–—·]/g,'-').replace(/[^\x20-\x7e\xa0-\xff]/g,' ').replace(/[\\()]/g,'\\$&');
  // Conservative Helvetica widths at 8pt keep both ordinary words and long tokens inside cells.
  const textWidth=(text:string)=>[...text].reduce((sum,char)=>sum+(/[WM@%]/.test(char)?7.56:/[mw]/.test(char)?6.67:/[A-Z]/.test(char)?6.3:/[ilI.,:;'!| ]/.test(char)?2.3:/[frt()\[\]]/.test(char)?3.2:4.7),0);
  const wrap=(text:string,width:number)=>String(text).split('\n').flatMap(line=>{
    const parts:string[]=[];let current='';
    for(const word of line.split(/\s+/)){
      if(current&&textWidth(current+' '+word)>width){parts.push(current);current='';}
      if(textWidth(word)<=width){if(word)current+=(current?' ':'')+word;continue;}
      for(const char of word){if(current&&textWidth(current+char)>width){parts.push(current);current='';}current+=char;}
    }
    return [...parts,...(current?[current]:[])].length?[...parts,...(current?[current]:[])]:[''];
  });
  const weights=monitoring?[30,42,48,210,175,100,125]:[28,100,30,72,72,95,105,65,78,140];
  const head:string[]=monitoring?monitoringHead:schemeHead,rows:string[][]=monitoring?monitoringRows(data):schemeRows(data);
  const margin=28,total=842-margin*2,sum=weights.reduce((a,b)=>a+b,0),widths=weights.map(weight=>weight/sum*total);
  const pages:string[]=[];let commands='',y=0;
  const text=(content:string,x:number,at:number,size=8)=>{commands+=`BT /F1 ${size} Tf ${x.toFixed(2)} ${at.toFixed(2)} Td (${pdfText(content)}) Tj ET\n`;};
  const draw=(lines:string[][],header=false)=>{
    const height=Math.max(...lines.map(cell=>cell.length))*10+10;let x=margin;
    if(header)commands+=`0.48 0.07 0.16 rg ${margin} ${(y-height).toFixed(2)} ${total} ${height} re f 1 1 1 rg\n`;else commands+='0 0 0 rg\n';
    for(let index=0;index<lines.length;index++){commands+=`0.65 G ${x.toFixed(2)} ${(y-height).toFixed(2)} ${widths[index].toFixed(2)} ${height} re S\n`;lines[index].forEach((line,n)=>text(line,x+3,y-12-n*10));x+=widths[index];}
    commands+='0 0 0 rg\n';y-=height;
  };
  const start=()=>{
    commands='';y=563;commands+='0.48 0.07 0.16 rg\n';for(const line of wrap(`${data.school?.name||'School'} - ${title(monitoring)}`,total*8/13)){text(line,margin,y,13);y-=18;}commands+='0 0 0 rg\n';y-=2;
    for(const line of wrap(context(data),total*8/9)){text(line,margin,y,9);y-=12;}
    text(monitoring?'Only approved completed Records of Work count as verified teaching.':'Dates and durations follow the school calendar and timetable.',margin,y,8);y-=18;
    draw(head.map((cell,index)=>wrap(cell,widths[index]-6)),true);
  };
  start();
  const pageCapacity=Math.floor((y-margin-10)/10);
  for(const cells of rows){
    const lines=cells.map((cell:string,index:number)=>wrap(cell,widths[index]-6));
    let offset=0;const count=Math.max(...lines.map(cell=>cell.length));
    if(count<=pageCapacity&&count>Math.floor((y-margin-10)/10)){pages.push(commands);start();}
    while(offset<count){
      let capacity=Math.floor((y-margin-10)/10);
      if(capacity<1){pages.push(commands);start();capacity=Math.floor((y-margin-10)/10);}
      const size=Math.min(capacity,count-offset);
      draw(lines.map(cell=>cell.slice(offset,offset+size)));offset+=size;
      if(offset<count){pages.push(commands);start();}
    }
  }
  pages.push(commands);
  const objects:string[]=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];const kids:string[]=[];
  pages.forEach((page,index)=>{const pageId=objects.length+1,streamId=pageId+1;kids.push(`${pageId} 0 R`);const footer=`BT /F1 8 Tf 740 14 Td (Page ${index+1} of ${pages.length}) Tj ET\n`;const stream=page+footer;objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`);objects.push(`<< /Length ${Buffer.byteLength(stream,'latin1')} >>\nstream\n${stream}endstream`);});
  objects[1]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;let out='%PDF-1.4\n';const offsets=[0];objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(out,'latin1'));out+=`${index+1} 0 obj\n${object}\nendobj\n`;});const xref=Buffer.byteLength(out,'latin1');out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(out,'latin1');
}
export const weeklySchemeDoc=(data:any)=>document(data,false);
export const weeklySchemePDF=(data:any)=>pdf(data,false);
export const weeklyMonitoringDoc=(data:any)=>document(data,true);
export const weeklyMonitoringPDF=(data:any)=>pdf(data,true);
