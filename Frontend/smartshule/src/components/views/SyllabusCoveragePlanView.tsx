import React from 'react';
import {AppSyllabusCoveragePlanView} from './AppSyllabusCoveragePlanView';
import {WebSyllabusCoveragePlanView} from './WebSyllabusCoveragePlanView';

export function SyllabusCoveragePlanView(props:{onNavigateTab?:(tab:string)=>void;mode?:'coverage'|'scheme-builder'}){
 const packaged=Boolean((window as any).Capacitor?.isNativePlatform?.()||(window as any).electronAPI||navigator.userAgent.includes('Electron')||['file:','capacitor:'].includes(window.location.protocol)||(window.location.hostname==='localhost'&&window.location.protocol==='https:'&&!window.location.port));
 return packaged?<AppSyllabusCoveragePlanView {...props}/>:<WebSyllabusCoveragePlanView {...props}/>;
}

export function SchemeOfWorkBuilderView(props:{onNavigateTab?:(tab:string)=>void}){
 return <SyllabusCoveragePlanView {...props} mode="scheme-builder"/>;
}
