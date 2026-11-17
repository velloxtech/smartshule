import { deflateRawSync } from 'zlib';
/** Minimal OOXML package using the standard ZIP container; no client or reference images. */
export function wordDocument(documentXML:string):Buffer {
 const files:{name:string;data:string}[]=[
  {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'},
  {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'},
  {name:'word/document.xml',data:documentXML}
 ];
 const table=Array.from({length:256},(_,n)=>{let v=n;for(let i=0;i<8;i++)v=v&1?0xedb88320^(v>>>1):v>>>1;return v>>>0;});
 const crc=(data:Buffer)=>{let value=0xffffffff;for(const b of data)value=table[(value^b)&255]^(value>>>8);return (value^0xffffffff)>>>0;};
 const local:Buffer[]=[],central:Buffer[]=[];let offset=0;
 for(const f of files){
  const name=Buffer.from(f.name),plain=Buffer.from(f.data,'utf8'),compressed=deflateRawSync(plain),checksum=crc(plain);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);header.writeUInt32LE(checksum,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(plain.length,22);header.writeUInt16LE(name.length,26);
  local.push(header,name,compressed);
  const record=Buffer.alloc(46);record.writeUInt32LE(0x02014b50,0);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);record.writeUInt16LE(8,10);record.writeUInt16LE(33,14);record.writeUInt32LE(checksum,16);record.writeUInt32LE(compressed.length,20);record.writeUInt32LE(plain.length,24);record.writeUInt16LE(name.length,28);record.writeUInt32LE(offset,42);central.push(record,name);offset+=header.length+name.length+compressed.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,directory,end]);
}
