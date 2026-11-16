// Source-only styling migration. No app bootstrap, databases, network or native packages.
// Default is a review report; --write applies only colour classes/display-style values.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),ts=require('typescript');
const root='Frontend/smartshule/src',write=process.argv.includes('--write');
const out='/tmp/smartshule-interface-consistency-20261117';fs.mkdirSync(out,{recursive:true});
const files=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(file.endsWith('.tsx'))files.push(file);}}walk(root);
const skip=/AppSyllabusCoveragePlanView|landing\/(InteractiveLearningLab|CloudSky)/;
const cool='blue|sky|indigo|violet|purple|fuchsia|cyan|teal';
const all=cool+'|emerald|green|lime|amber|orange|yellow|pink';
const hues=new RegExp(`(?<![\\w-])(bg|text|border|ring|outline|accent|decoration|from|via|to)-(${all})-(950|900|800|700|600|500|400|300|200|100|50)(/[\\d.]+)?(?![\\w-])`,'g');
const neutral=/(?<![\w-])bg-(?:slate|gray|zinc)-(50|100|200|300)(\/[\d.]+)?/g;
const brandHex=/(?<![\w-])(bg|text|border|ring|outline|from|via|to)-\[#(7a1228|800000|7b1c35|7b1230|961a35|9b1d36|9e2644|5a1226|5e0d1e|651022|450a15|4a0010|550000|660000|600000|330000|075e54|128c7e|25d366|004d47|006a63|f9eef1|f0d8df|901530|961732|5c0a1a|600e1f|630d1f|5f0d1e|500b1a|103b2b|600e20|006a40|005a36)\]/gi;
const semantic=/\b(status|isPending|isPaid|isFeeCleared|isClockedIn|isConnected|isVerified|hasRegisterToday|severity|priority|risk|performance|rating|rubric|gradeLevel|achievement|score)\b/i;
const rubric=/\b(?:performance|rating|rubric|gradeLevel|achievement|score)\b|(?:performance|rating|rubric)(?:Level|Color|Colour|Style|Badge)|\b(?:EE|ME|AE|BE)\b/;
const directStatus=/\b(?:success|failed|failure|error|warning|pending|approved|rejected|overdue|paid|received|offline|online|connected|disconnected|verified|exceeding|meeting|approaching|ending|ended|draft|submitted|completed|closed|exempt)\b/i;
function opening(element){return ts.isJsxElement(element)?element.openingElement:ts.isJsxSelfClosingElement(element)?element:null;}
function owner(attr){return attr.parent.parent;}
function elementOf(attr){const o=owner(attr);return ts.isJsxOpeningElement(o)?o.parent:o;}
function ancestors(node){const list=[];for(let p=node.parent;p;p=p.parent)if(ts.isJsxElement(p)||ts.isJsxSelfClosingElement(p))list.push(p);return list;}
function getClass(e,sf){return opening(e)?.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(sf)==='className')?.initializer?.getText(sf)||'';}
function text(e,sf){return ts.isJsxElement(e)?e.children.filter(c=>ts.isJsxText(c)||ts.isJsxExpression(c)).map(c=>c.getText(sf)).join(' '):'';}
function explicitStatus(e,sf){return opening(e)?.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.getText(sf)==='role'&&/['"](?:alert|status)['"]/.test(a.initializer?.getText(sf)||''));}
function isIcon(e,sf){return /material-symbols/.test(getClass(e,sf))||/^(?:[A-Z].*(?:Icon|Circle|Check|Calendar)|svg)$/.test(opening(e)?.tagName.getText(sf)||'');}
function meaningfulIcon(e,sf){return /check_circle|verified|warning|error|cancel|wifi|signal_cellular|cloud_done/.test(text(e,sf));}
function isIconBox(e,sf){return ts.isJsxElement(e)&&e.children.some(c=>(ts.isJsxElement(c)||ts.isJsxSelfClosingElement(c))&&isIcon(c,sf)&&!meaningfulIcon(c,sf))&&/\b[w|h]-(?:8|9|10|11|12)\b/.test(getClass(e,sf));}
function dataVisual(e,sf){const c=getClass(e,sf);const style=opening(e)?.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(sf)==='style')?.initializer?.getText(sf)||'';return (/\bbg-/.test(c)&&/\bw-(?:1(?:\.5)?|2(?:\.5)?|3(?:\.5)?|4)\b/.test(c)&&/\bh-(?:1(?:\.5)?|2(?:\.5)?|3(?:\.5)?|4)\b/.test(c))||(/width\s*:/.test(style)&&/%/.test(style));}
function hasFunction(node,name,sf){for(let p=node.parent;p;p=p.parent){if(ts.isVariableDeclaration(p)&&p.name.getText(sf).match(name))return true;if(ts.isFunctionDeclaration(p)&&p.name?.getText(sf).match(name))return true;}return false;}
function oldSemanticTokens(value,action=false){return value.replace(/(?<![\w-])((?:bg|text|border|ring|outline|accent|from|via|to)-)(on-)?(secondary|tertiary)(-container|-fixed-dim|-fixed|-variant)?/g,(whole,prefix,on,kind,suffix='')=>{
 if(action){if(on)return prefix+'on-primary'+(suffix==='-container'?'-fixed':'');if(suffix==='-container'||suffix==='-fixed')return prefix+(prefix==='bg-'?'primary-fixed':'primary');return prefix+'primary';}
 return prefix+(on?'on-':'')+(kind==='secondary'?'success':'warning')+suffix;
 });}
function recolour(value,{allHues=false,gradient=false,hover=false}={}){
 return value.replace(hues,(whole,kind,hue,shade,opacity='',offset)=>{
  if(!allHues&&!new RegExp('^(?:'+cool+')$').test(hue))return whole;
  const n=Number(shade);let token;
  if(['from','via','to'].includes(kind))token=n<=200?'primary-fixed':kind==='from'?'primary-container':kind==='to'?'maroon-light':'primary';
  else if(kind==='bg')token=n<=100?'primary-fixed':n<=300?'primary-fixed-dim':n>=800||hover||/(?:hover|active):$/.test(value.slice(0,offset))?'primary-container':'primary';
  else if(kind==='text')token=n<=200?'on-primary':n===300?'primary-fixed-dim':n>=800?'on-primary-fixed':'primary';
  else token='primary';
  return kind+'-'+token+opacity;
 }).replace(brandHex,(_,kind,hex,offset)=>kind+'-'+(/^f/i.test(hex)?'primary-fixed':/^(?:5|4|3|6)/.test(hex)||(kind==='bg'&&/(?:hover|active):$/.test(value.slice(0,offset)))?'primary-container':/^(?:9)/.test(hex)?'maroon-light':'primary'));
}
const colourClass=/(?<![\w-])(bg|text|border|ring|outline|accent|decoration|from|via|to)-(?:\[[^\]]+\]|[\w-]+)(?:\/[\d.]+)?/g;
function fingerprint(source,file){const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let items=[];function visit(n){if(ts.isStringLiteralLike(n)||ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n)){items.push([n.kind,n.text.replace(colourClass,'THEME_COLOUR')]);return;}if(ts.isIdentifier(n)||ts.isJsxText(n)||ts.isNumericLiteral(n))items.push([n.kind,n.getText(sf)]);else items.push(n.kind);ts.forEachChild(n,visit);}visit(sf);return crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex');}
const result={mode:write?'write':'review',reviewed:files.length,excluded:[],files:[],attributes:0,styleConstants:0,nonStylingAstPreserved:true};
for(const file of files){if(skip.test(file)){result.excluded.push(file);continue;}const source=fs.readFileSync(file,'utf8'),sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[],ranges=[];
 function visit(n){if(ts.isJsxAttribute(n)&&n.name.getText(sf)==='className'&&n.initializer){const value=n.initializer.getText(sf),el=elementOf(n),tag=opening(el)?.tagName.getText(sf)||'',parents=ancestors(el).slice(0,4),chain=[el,...parents];
  const control=['button','a','input','select','textarea'].includes(tag);
  const inheritedAction=parents.some(p=>['button','a'].includes(opening(p)?.tagName.getText(sf)));
  const protectedStatus=chain.some(p=>explicitStatus(p,sf))||semantic.test(value)||directStatus.test(text(el,sf))||dataVisual(el,sf);
  const protectedRubric=rubric.test(value)||rubric.test(text(el,sf))||hasFunction(n,/(?:Performance|Rating|Rubric|Grade|Level)(?:Colou?r|Badge|Style)/i,sf);
  const decorative=(isIcon(el,sf)&&!meaningfulIcon(el,sf))||isIconBox(el,sf)||/^h[1-6]$/.test(tag);
  const gradient=/\bbg-gradient/.test(value)&&!protectedStatus;
  let updated=value;
  if(dataVisual(el,sf))updated=oldSemanticTokens(updated,false);
  else if(!protectedRubric){
   const action=control||(!protectedStatus&&(decorative||inheritedAction));
   updated=oldSemanticTokens(updated,action);
   if(control&&/\bbg-secondary\b/.test(value)&&/\btext-white\b/.test(value))updated=updated.replace(/hover:bg-primary-fixed\b/g,'hover:bg-primary-container');
   if(action||gradient||!protectedStatus)updated=recolour(updated,{allHues:action||gradient});
   updated=updated.replace(neutral,(_,shade,opacity='')=>'bg-'+({'50':'surface','100':'surface-container-low','200':'surface-container','300':'surface-container-high'}[shade])+opacity);
   if(control&&/text-white/.test(value))updated=updated.replace(/(?<![\w-])bg-(?:slate|gray|zinc|neutral|stone)-(?:700|800|900|950)(?![\w-])/g,(m,offset)=>/(?:hover|active):$/.test(updated.slice(0,offset))?'bg-primary-container':'bg-primary');
  }else updated=oldSemanticTokens(updated,false);
  if(updated!==value){edits.push({start:n.initializer.getStart(sf),end:n.initializer.end,value:updated});result.attributes++;}ranges.push([n.getStart(sf),n.end]);return;
 }ts.forEachChild(n,visit);}visit(sf);
 function constants(n){if(ts.isStringLiteralLike(n)&&!ranges.some(([a,b])=>n.pos>=a&&n.end<=b)){const value=n.getText(sf);let updated=oldSemanticTokens(value,false);
  if((file.endsWith('SuperAdminDashboardView.tsx')&&ts.isPropertyAssignment(n.parent)&&n.parent.name.getText(sf)==='color')||hasFunction(n,/^getRoleBadge$|^VOTE_HEAD_CONFIG$/,sf))updated=recolour(updated,{allHues:true});
  if(updated!==value){edits.push({start:n.getStart(sf),end:n.end,value:updated});result.styleConstants++;}
 }ts.forEachChild(n,constants);}constants(sf);
 if(!edits.length)continue;let after=source;for(const e of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,e.start)+e.value+after.slice(e.end);
 const same=fingerprint(source,file)===fingerprint(after,file);if(!same)throw Error('Non-styling AST changed: '+file);
 result.files.push({file,edits:edits.length,nonStylingAstPreserved:same});
 if(write){const backup=path.join(out,'before',file);fs.mkdirSync(path.dirname(backup),{recursive:true});if(!fs.existsSync(backup))fs.writeFileSync(backup,source,{mode:0o600});fs.writeFileSync(file,after);}
}
if(process.argv.includes('--verify-before')){
 const before=path.join(out,'before');const backed=fs.readdirSync(before,{recursive:true}).filter(f=>f.endsWith('.tsx'));
 for(const file of backed){if(fingerprint(fs.readFileSync(path.join(before,file),'utf8'),file)!==fingerprint(fs.readFileSync(file,'utf8'),file))throw Error('Original non-styling AST differs: '+file);}
 result.originalFilesVerified=backed.length;result.originalNonStylingAstPreserved=true;
}
fs.writeFileSync(path.join(out,write?'applied.json':'review.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
