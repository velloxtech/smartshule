import assert from 'node:assert/strict';
import {test} from 'node:test';
import {safeStorage} from '../src/utils/safeStorage.ts';
import {recoverModuleLoad,installModuleRecovery} from '../src/utils/chunkRecovery.ts';

test('storage-denied browsers can keep a tab session and logout without throwing',()=>{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Storage denied');}});
  assert.equal(safeStorage.getItem('blocked-token'),null);
  safeStorage.setItem('blocked-token','tab-token');assert.equal(safeStorage.getItem('blocked-token'),'tab-token');
  safeStorage.removeItem('blocked-token');assert.equal(safeStorage.getItem('blocked-token'),null);
});
test('a failed storage removal never revives an old persistent token',()=>{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=> 'old-token',setItem(){throw new Error('Quota exceeded');},removeItem(){throw new Error('Denied');}}});
  safeStorage.setItem('quota-token','new-token');assert.equal(safeStorage.getItem('quota-token'),'new-token');
  safeStorage.removeItem('quota-token');assert.equal(safeStorage.getItem('quota-token'),null);
});
test('stale module recovery reloads once, preserves the URL and authentication, and avoids loops',()=>{
  const values=new Map<string,string>();const navigations:string[]=[];const listeners=new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)}});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
  Object.assign(globalThis,{window:{location:{href:'https://school.example/?view=school#/lessons',replace:(url:string)=>navigations.push(url)},addEventListener:(name:string,fn:any)=>listeners.set(name,fn)}});
  safeStorage.setItem('smartshule_token','keep-me');
  const error=new TypeError('Failed to fetch dynamically imported module: https://school.example/assets/old.js');
  assert.equal(recoverModuleLoad(error),true);assert.equal(navigations.length,1);
  assert.equal(new URL(navigations[0]).hash,'#/lessons');assert.equal(new URL(navigations[0]).searchParams.get('view'),'school');
  assert.equal(safeStorage.getItem('smartshule_token'),'keep-me');
  assert.equal(recoverModuleLoad(error),false);assert.equal(recoverModuleLoad(new Error('A render failure')),false);
  safeStorage.setItem('smartshule:last-module-recovery','0');Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:false}});
  assert.equal(recoverModuleLoad(error),false);
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
  installModuleRecovery();let prevented=false;listeners.get('vite:preloadError')({payload:error,preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(navigations.length,2);
});

test('the URL marker prevents reload loops even when storage is unavailable after a reload',()=>{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Blocked');}});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
  Object.assign(globalThis,{window:{location:{href:'https://school.example/?_app_refresh=1',replace(){throw new Error('Must not reload again');}}}});
  assert.equal(recoverModuleLoad(new Error('Failed to fetch dynamically imported module')),false);
});
