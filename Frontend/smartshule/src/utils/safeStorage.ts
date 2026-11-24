// Some private browsers and embedded webviews deny storage access or writes.
// Keep the current tab usable without reviving persisted tokens after logout.
const fallback=new Map<string,string|null>();
export const safeStorage={
  getItem(key:string):string|null{
    if(fallback.has(key))return fallback.get(key)??null;
    try{return globalThis.localStorage.getItem(key);}catch{return null;}
  },
  setItem(key:string,value:string){
    try{globalThis.localStorage.setItem(key,value);fallback.delete(key);}catch{fallback.set(key,value);}
  },
  removeItem(key:string){
    try{globalThis.localStorage.removeItem(key);fallback.delete(key);}catch{fallback.set(key,null);}
  },
};
