/** Choose a period inside the selected year without activating a future school year. */
export function selectPlanningTerm(terms:any[]):string {
 const current=terms.find(t=>t.isCurrent);if(current)return current.id;
 const today=new Date().toISOString().slice(0,10);
 const started=terms.filter(t=>t.startDate<=today).sort((a,b)=>b.startDate.localeCompare(a.startDate)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))||a.id.localeCompare(b.id));
 return started[0]?.id||[...terms].sort((a,b)=>a.startDate.localeCompare(b.startDate))[0]?.id||'';
}
export function rememberedPlanningScope(user:any):any {
 try{return JSON.parse(sessionStorage.getItem(`smartshule-planning:${user?.userId||user?.id}:${user?.schoolId}`)||'{}');}catch{return {};}
}
export function rememberPlanningScope(user:any,scope:any){
 try{sessionStorage.setItem(`smartshule-planning:${user?.userId||user?.id}:${user?.schoolId}`,JSON.stringify(scope));}catch{/* Period selectors remain usable when browser storage is unavailable. */}
}
