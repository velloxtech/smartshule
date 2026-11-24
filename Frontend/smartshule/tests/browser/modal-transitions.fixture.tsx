import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider} from '../../src/context/AuthContext';
import {AppErrorBoundary} from '../../src/components/common/AppErrorBoundary';
import {RecordPaymentModal} from '../../src/components/modals/RecordPaymentModal';
import {ViewCurriculumTrackerModal} from '../../src/components/modals/ViewCurriculumTrackerModal';
import type {CurriculumTracker} from '../../src/types';

const tracker={id:'fixture-tracker',subjectName:'Fixture learning area',className:'Fixture class',items:[],dailyLogs:[]} as unknown as CurriculumTracker;
function Fixture(){
 const [payment,setPayment]=useState(false),[details,setDetails]=useState(false);
 return <><button data-test="payment" onClick={()=>setPayment(v=>!v)}>Toggle payment</button><button data-test="tracker" onClick={()=>setDetails(v=>!v)}>Toggle tracker</button>
 <AppErrorBoundary><AuthProvider><RecordPaymentModal isOpen={payment} onClose={()=>setPayment(false)} students={[]}/><ViewCurriculumTrackerModal tracker={details?tracker:null} onClose={()=>setDetails(false)}/></AuthProvider></AppErrorBoundary></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
