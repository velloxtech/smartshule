import {safeStorage} from './safeStorage';
const recoveryKey='smartshule:last-module-recovery';
export const isModuleLoadError=(error:unknown)=>/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|Failed to load module script|Unable to preload CSS|dynamically imported module/i.test(error instanceof Error?error.message:String(error));
export function recoverModuleLoad(error:unknown):boolean{
  if(!isModuleLoadError(error)||typeof window==='undefined'||navigator.onLine===false)return false;
  const url=new URL(window.location.href);
  if(url.searchParams.has('_app_refresh'))return false;
  const now=Date.now(),last=Number(safeStorage.getItem(recoveryKey)||0);
  if(now-last<60000)return false;
  safeStorage.setItem(recoveryKey,String(now));
  url.searchParams.set('_app_refresh',String(now));
  window.location.replace(url.toString());return true;
}
export function installModuleRecovery(){
  window.addEventListener('vite:preloadError',(event:any)=>{if(recoverModuleLoad(event.payload))event.preventDefault();});
}
