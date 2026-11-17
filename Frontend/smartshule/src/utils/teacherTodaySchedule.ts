interface TeachingSlot {dayOfWeek:string;startTime:string;endTime:string;isBreak?:boolean;isLunch?:boolean}

const minutes=(time?:string)=>{
  const match=time?.match(/^(\d{1,2}):(\d{2})/);
  return match?Number(match[1])*60+Number(match[2]):undefined;
};

export function teacherTodaySchedule<T extends TeachingSlot>(slots:T[],now:Date,term?:{startDate?:string;endDate?:string}){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit',weekday:'long',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const part=(name:string)=>parts.find(p=>p.type===name)?.value||'';
  const date=`${part('year')}-${part('month')}-${part('day')}`;
  const inTerm=Boolean(term?.startDate&&term.endDate&&date>=term.startDate.slice(0,10)&&date<=term.endDate.slice(0,10));
  const currentMinutes=Number(part('hour'))*60+Number(part('minute'));
  const today=inTerm?slots.filter(slot=>!slot.isBreak&&!slot.isLunch&&String(slot.dayOfWeek).toUpperCase()===part('weekday').toUpperCase()).sort((a,b)=>(minutes(a.startTime)??0)-(minutes(b.startTime)??0)):[];
  const upcoming=today.filter(slot=>(minutes(slot.endTime)??1440)>currentMinutes);
  return {date,inTerm,today,upcoming};
}
