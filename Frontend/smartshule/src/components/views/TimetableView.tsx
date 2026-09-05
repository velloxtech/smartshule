import React, { useState } from 'react';

export const TimetableView: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState('Grade 4');

  const schedule = [
    { time: '08:00 - 08:40', mon: 'Mathematics', tue: 'English', wed: 'Mathematics', thu: 'Science & Tech', fri: 'Agriculture' },
    { time: '08:40 - 09:20', mon: 'English', tue: 'Mathematics', wed: 'Kiswahili', thu: 'Social Studies', fri: 'English' },
    { time: '09:20 - 09:50', mon: 'Short Break / Milk', tue: 'Short Break / Milk', wed: 'Short Break / Milk', thu: 'Short Break / Milk', fri: 'Short Break / Milk', isBreak: true },
    { time: '09:50 - 10:30', mon: 'Science & Tech', tue: 'Kiswahili', wed: 'Science & Tech', thu: 'Mathematics', fri: 'Creative Arts' },
    { time: '10:30 - 11:10', mon: 'Social Studies', tue: 'Creative Arts', wed: 'Agriculture', thu: 'English', fri: 'Physical Ed' },
    { time: '11:10 - 12:40', mon: 'Lunch & Free Play', tue: 'Lunch & Free Play', wed: 'Lunch & Free Play', thu: 'Lunch & Free Play', fri: 'Lunch & Free Play', isBreak: true },
    { time: '12:40 - 01:20', mon: 'Kiswahili', tue: 'Science & Tech', wed: 'Creative Arts', thu: 'Agriculture', fri: 'Pastoral / PPI' },
    { time: '01:20 - 02:00', mon: 'Creative Arts', tue: 'Social Studies', wed: 'Physical Ed', thu: 'Guidance & Values', fri: 'Clubs & Societies' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Operations</span>
            <span>/</span>
            <span className="text-primary font-semibold">Timetable Builder</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Weekly Instructional Master Timetable
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Synchronized KICD lesson allocations, teacher clash detection, and room schedules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-on-surface-variant">Select Class:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-1.5 px-3 text-xs font-semibold text-on-surface shadow-xs"
          >
            <option value="PP1">PP1</option>
            <option value="PP2">PP2</option>
            <option value="Grade 1">Grade 1</option>
            <option value="Grade 2">Grade 2</option>
            <option value="Grade 3">Grade 3</option>
            <option value="Grade 4">Grade 4</option>
            <option value="Grade 5">Grade 5</option>
            <option value="Grade 6">Grade 6</option>
          </select>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-outline-variant/30">
              <tr>
                <th className="py-3 px-4 w-32 border-r border-surface-container">Time Slot</th>
                <th className="py-3 px-4">Monday</th>
                <th className="py-3 px-4">Tuesday</th>
                <th className="py-3 px-4">Wednesday</th>
                <th className="py-3 px-4">Thursday</th>
                <th className="py-3 px-4">Friday</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {schedule.map((row, i) => (
                <tr
                  key={i}
                  className={row.isBreak ? 'bg-surface-container-low/70 font-semibold' : 'hover:bg-surface-container-low/30'}
                >
                  <td className="py-3 px-4 font-data-mono font-bold text-primary border-r border-surface-container">
                    {row.time}
                  </td>
                  <td className={`py-3 px-4 ${row.isBreak ? 'text-outline italic' : 'text-on-surface font-medium'}`}>
                    {row.mon}
                  </td>
                  <td className={`py-3 px-4 ${row.isBreak ? 'text-outline italic' : 'text-on-surface font-medium'}`}>
                    {row.tue}
                  </td>
                  <td className={`py-3 px-4 ${row.isBreak ? 'text-outline italic' : 'text-on-surface font-medium'}`}>
                    {row.wed}
                  </td>
                  <td className={`py-3 px-4 ${row.isBreak ? 'text-outline italic' : 'text-on-surface font-medium'}`}>
                    {row.thu}
                  </td>
                  <td className={`py-3 px-4 ${row.isBreak ? 'text-outline italic' : 'text-on-surface font-medium'}`}>
                    {row.fri}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
