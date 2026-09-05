import React, { useState } from 'react';

export const StrandsView: React.FC = () => {
  const [selectedArea, setSelectedArea] = useState('Mathematics Activities');

  const strandsData: Record<string, { strand: string; subStrands: string[] }[]> = {
    'Mathematics Activities': [
      {
        strand: '1.0 Numbers',
        subStrands: ['1.1 Number Concept & Counting (1-1000)', '1.2 Whole Numbers & Place Value', '1.3 Operations: Addition & Subtraction', '1.4 Fractions: Halves, Quarters & Eighths'],
      },
      {
        strand: '2.0 Measurement',
        subStrands: ['2.1 Length (Metres & Centimetres)', '2.2 Mass (Kilograms & Grams)', '2.3 Capacity (Litres & Millilitres)', '2.4 Time & Money (Kenyan Shillings currency recognition)'],
      },
      {
        strand: '3.0 Geometry',
        subStrands: ['3.1 Lines and Angles', '3.2 2D Geometric Shapes (Triangles, Rectangles)', '3.3 3D Solids (Cylinders, Spheres)'],
      },
      {
        strand: '4.0 Data Handling',
        subStrands: ['4.1 Data Collection & Tallying', '4.2 Pictographs and Bar Graphs'],
      },
    ],
    'Science & Technology': [
      {
        strand: '1.0 Living Things & Their Environment',
        subStrands: ['1.1 Human Body: Digestive & Respiratory Systems', '1.2 Plants: Flowering & Non-flowering', '1.3 Animals: Invertebrates & Vertebrates'],
      },
      {
        strand: '2.0 Matter and Energy',
        subStrands: ['2.1 States of Matter (Solids, Liquids, Gases)', '2.2 Sources and Uses of Heat Energy', '2.3 Light and Reflection'],
      },
      {
        strand: '3.0 Digital Technology',
        subStrands: ['3.1 Digital Devices and Safety', '3.2 Interactive Learning Software & Coding Scratch'],
      },
    ],
    'English Language': [
      {
        strand: '1.0 Listening and Speaking',
        subStrands: ['1.1 Active Listening and Dialogue', '1.2 Pronunciation, Intonation and Stress', '1.3 Storytelling and Oral Presentations'],
      },
      {
        strand: '2.0 Reading Comprehension',
        subStrands: ['2.1 Fluency and Phonemic Awareness', '2.2 Intensive and Extensive Reading', '2.3 Inferential Comprehension'],
      },
      {
        strand: '3.0 Language Structures & Writing',
        subStrands: ['3.1 Parts of Speech (Nouns, Verbs, Adjectives)', '3.2 Punctuation and Capitalization', '3.3 Narrative & Descriptive Compositions'],
      },
    ],
  };

  const areas = Object.keys(strandsData);
  const activeStrands = strandsData[selectedArea] || strandsData['Mathematics Activities'];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
          <span>Home</span>
          <span>/</span>
          <span>CBC Competencies</span>
          <span>/</span>
          <span className="text-primary font-semibold">Strands & Sub-strands</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
          KICD Curriculum Strands & Learning Outcomes
        </h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Competency-Based Curriculum framework, specific learning outcomes, and assessment rubrics
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3 overflow-x-auto">
        {areas.map((a) => (
          <button
            key={a}
            onClick={() => setSelectedArea(a)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedArea === a
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeStrands.map((st) => (
          <div
            key={st.strand}
            className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-surface-container pb-2">
              <h3 className="font-bold text-sm text-primary">{st.strand}</h3>
              <span className="text-[11px] font-semibold text-secondary bg-secondary-container px-2 py-0.5 rounded">
                KICD Verified
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                Approved Sub-strands
              </span>
              <ul className="space-y-1.5 text-xs text-on-surface">
                {st.subStrands.map((sub, idx) => (
                  <li key={idx} className="flex items-center gap-2 p-2 rounded bg-surface-container-low">
                    <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                    <span>{sub}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
