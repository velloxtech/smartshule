import React from 'react';
import jsPDF from 'jspdf';
export const documentMaroon: [number,number,number] = [122,18,40];
export type DocumentSchool = {name?:string;logoUrl?:string;logoDataUrl?:string;motto?:string;address?:string;phone?:string;email?:string;website?:string};
export async function loadDocumentSchool(school?:DocumentSchool):Promise<DocumentSchool|undefined> {
  if(!school)return school;
  for(const url of [school.logoUrl,'/logo.png','/logo.jpg'].filter(Boolean) as string[]){
    try{const data=await new Promise<string>((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';const timer=setTimeout(()=>reject(new Error('Logo timed out')),5000);img.onload=()=>{clearTimeout(timer);try{const canvas=document.createElement('canvas');const scale=Math.min(1,512/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/png'));}catch(e){reject(e);}};img.onerror=()=>{clearTimeout(timer);reject(new Error('Logo unavailable'));};img.src=url;});return{...school,logoDataUrl:data};}catch{}
  }return school;
}
const contact=(school?:DocumentSchool)=>[school?.phone&&`Tel: ${school.phone}`,school?.email&&`Email: ${school.email}`,school?.website&&`Web: ${school.website}`].filter(Boolean).join(' | ');
export function SchoolDocumentHeader({school,title}:{school?:DocumentSchool;title:string}) {
  return <header className="mb-4 font-sans"><div className="flex items-center gap-5 pb-4"><img src={school?.logoDataUrl||school?.logoUrl||'/logo.png'} alt="School logo" className="h-20 w-20 shrink-0 object-contain" onError={e=>{const img=e.currentTarget;if(!img.src.endsWith('/logo.jpg'))img.src='/logo.jpg';else img.style.visibility='hidden';}}/><div className="min-w-0 flex-1"><h2 className="text-2xl font-bold uppercase text-primary">{school?.name||'School name not recorded'}</h2>{school?.address&&<p className="mt-1 text-xs">{school.address}</p>}{contact(school)&&<p className="mt-1 break-words text-xs">{contact(school)}</p>}{school?.motto&&<p className="mt-1 text-sm italic text-primary">“{school.motto}”</p>}</div></div><h3 className="bg-primary px-4 py-2 text-center text-sm font-bold uppercase text-white">{title}</h3></header>;
}
export function drawSchoolDocumentHeader(doc:jsPDF,school:DocumentSchool|undefined,title:string) {
  const width=doc.internal.pageSize.getWidth(),left=14,right=width-14;
  if(school?.logoDataUrl){try{doc.addImage(school.logoDataUrl,'PNG',left,10,22,22);}catch{}}
  const x=school?.logoDataUrl?40:left,available=right-x;
  doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(...documentMaroon);
  let y=15;const lines=doc.splitTextToSize((school?.name||'School name not recorded').toUpperCase(),available);doc.text(lines,x,y);y+=lines.length*5.5;
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(40,40,40);
  for(const line of [school?.address,contact(school),school?.motto&&`"${school.motto}"`].filter(Boolean) as string[]){const parts=doc.splitTextToSize(line,available);doc.text(parts,x,y);y+=parts.length*4;}
  y=Math.max(y+3,37);doc.setFillColor(...documentMaroon);doc.rect(left,y,right-left,8,'F');doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(255,255,255);doc.text(title.toUpperCase(),width/2,y+5.5,{align:'center'});doc.setTextColor(0,0,0);return y+12;
}
