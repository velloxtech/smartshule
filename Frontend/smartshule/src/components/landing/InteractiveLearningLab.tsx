import React, { useState } from 'react';
import {
  Brain,
  Trophy,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  Calculator,
  Compass,
  Palette,
  Lightbulb,
  Award,
  Star,
  Users,
} from 'lucide-react';

interface InteractiveLearningLabProps {
  onNavigateApplySlot?: (grade?: string) => void;
  onNavigateProgrammes?: () => void;
}

interface Question {
  id: number;
  area: string;
  badgeColor: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  funFact: string;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    area: 'Foundational Numeracy',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    question: 'A learner at Grace Seeds has 8 storybooks in the library. She shares 3 with her friend. How many books does she have left?',
    options: ['4 books', '5 books', '6 books', '11 books'],
    correctIndex: 1,
    explanation: '8 minus 3 equals 5! Sharing books is a wonderful Grace Seeds value of kindness and collaboration.',
    funFact: 'Our learners engage in daily hands-on counting and mental math games using real-life objects!',
  },
  {
    id: 2,
    area: 'Science & Environment',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    question: 'Which vital part of a green plant captures sunlight to make its own food through photosynthesis?',
    options: ['The Roots', 'The Leaves', 'The Bark', 'The Flower Petals'],
    correctIndex: 1,
    explanation: 'Green leaves contain chlorophyll, which traps sunlight to create nourishment for the plant!',
    funFact: 'Grace Seeds learners cultivate their own school garden plot to observe how seeds flourish into food.',
  },
  {
    id: 3,
    area: 'Language & Phonics',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    question: 'In Kiswahili, what is the polite morning greeting we teach our learners when greeting their teachers and elders?',
    options: ['Habari za asubuhi / Shikamoo', 'Kwaheri', 'Lala salama', 'Karibu chakula'],
    correctIndex: 0,
    explanation: '"Habari za asubuhi" and "Shikamoo" are respectful morning greetings that build strong character and cultural reverence.',
    funFact: 'Grace Seeds embraces bilingual CBE fluency in English and Kiswahili Sanifu from Playgroup upwards.',
  },
  {
    id: 4,
    area: 'CBC Core Values',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    question: 'When scouts work together to pitch a tent and clean their campsite, which CBC core competency are they developing?',
    options: ['Selfishness', 'Collaboration & Teamwork', 'Competition', 'Carelessness'],
    correctIndex: 1,
    explanation: 'Teamwork & Collaboration teaches children to listen, support each other, and achieve great milestones together.',
    funFact: 'Our accredited Junior Scouts troop practices weekly drills, empathy, and outdoor teamwork.',
  },
  {
    id: 5,
    area: 'Creative Arts & Music',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    question: 'Which of the following is a traditional Kenyan percussion instrument that creates rhythm by beating with hands or sticks?',
    options: ['Flute', 'Ngoma (Drum)', 'Violin', 'Trumpet'],
    correctIndex: 1,
    explanation: 'The Ngoma (drum) is an iconic percussion instrument used in African music, storytelling, and cultural dance.',
    funFact: 'Music, percussion, and creative movement are integrated into our daily CBC psychomotor activities!',
  },
];

const AGE_MILESTONES = [
  {
    age: 2,
    level: 'Playgroup',
    ageRange: 'Ages 2 – 3',
    icon: Sparkles,
    focus: 'Sensory Exploration & Socialization',
    desc: 'Toddlers develop fine motor skills, language imitation, toilet routine confidence, and joyful social play in a gentle, warm space.',
    sampleActivity: 'Water & sand play, animal rhymes, finger painting, and building block towers.',
    keySkill: 'Early verbal expression & cooperative sharing',
  },
  {
    age: 4,
    level: 'PP1 (Pre-Primary 1)',
    ageRange: 'Age 4',
    icon: Palette,
    focus: 'Foundational CBE Readiness',
    desc: 'Children learn letter sounds (phonics), number sense, environmental care, and psychomotor coordination.',
    sampleActivity: 'Tracing phonics with sensory clay, sorting colors, and singing counting rhythms.',
    keySkill: 'Phonemic awareness & pencil grip mastery',
  },
  {
    age: 5,
    level: 'PP2 (Pre-Primary 2)',
    ageRange: 'Age 5',
    icon: BookOpen,
    focus: 'Reading Fluency & Early Numeracy',
    desc: 'Bridging into formal primary education with word blending, basic additions, hygiene & nutrition awareness, and creative crafts.',
    sampleActivity: 'Reading 3-letter CVC story cards, measuring water volumes, and nature walks.',
    keySkill: 'Independent early reading & basic numeracy',
  },
  {
    age: 7,
    level: 'Lower Primary (Grades 1 – 3)',
    ageRange: 'Ages 6 – 8',
    icon: Calculator,
    focus: 'CBE Foundational Key Stage 1',
    desc: 'Core CBE learning areas: Literacy, English, Kiswahili, Mathematics, Hygiene, Religious Education, and Movement & Creative Arts.',
    sampleActivity: 'Community garden project, mental math relay, and mini-science experiments on water & soil.',
    keySkill: 'Critical thinking, bilingual reading & problem-solving',
  },
  {
    age: 10,
    level: 'Upper Primary (Grades 4 – 6)',
    ageRange: 'Ages 9 – 11',
    icon: Brain,
    focus: 'CBE Key Stage 2 & Analytical Growth',
    desc: 'Advanced inquiry: Science & Technology, Social Studies, Digital Literacy, Agriculture & Nutrition, and active Junior Scouting.',
    sampleActivity: 'Robotics & digital literacy basics, nature classification, debate club, and scout drills.',
    keySkill: 'Independent research, digital skills & leadership',
  },
];

const COMPETENCIES = [
  {
    id: 'critical',
    title: 'Critical Thinking',
    icon: Lightbulb,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    desc: 'We train children not just to memorize facts, but to question, hypothesize, analyze cause-and-effect, and solve real-world problems.',
    classroomExample: 'Solving real-life puzzle challenges and designing water filtration models from local materials.',
  },
  {
    id: 'creativity',
    title: 'Creativity & Imagination',
    icon: Palette,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    desc: 'Every child is born an artist. We provide endless canvases in painting, pottery, music, drama, and expressive creative writing.',
    classroomExample: 'Original puppet theatre storytelling and crafting recycled art for campus exhibitions.',
  },
  {
    id: 'collaboration',
    title: 'Collaboration & Citizenship',
    icon: Users,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    desc: 'Our accredited Junior Scouts troop and group projects instill mutual respect, leadership, teamwork, and pride in community.',
    classroomExample: 'Scouts parade drills on the red carpet, team tree-planting, and student council activities.',
  },
  {
    id: 'communication',
    title: 'Bilingual Communication',
    icon: BookOpen,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    desc: 'Fluency in English and Kiswahili Sanifu is cultivated through daily dialogue, debate, poetry recitals, and public presentations.',
    classroomExample: 'Weekly Friday assembly learner presentations and bilingual spelling bees.',
  },
];

export const InteractiveLearningLab: React.FC<InteractiveLearningLabProps> = ({
  onNavigateApplySlot,
  onNavigateProgrammes,
}) => {
  const [activeTab, setActiveTab] = useState<'quest' | 'milestones' | 'competencies'>('quest');

  // Quest State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  // Milestone State
  const [selectedAge, setSelectedAge] = useState<number>(4);

  // Competency State
  const [selectedCompetency, setSelectedCompetency] = useState<string>('critical');

  const currentQ = QUESTIONS[currentQIndex];

  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(index);
    setIsAnswerSubmitted(true);
    setAnsweredCount(prev => prev + 1);
    if (index === currentQ.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setCurrentQIndex((prev) => (prev + 1) % QUESTIONS.length);
  };

  const handleResetQuest = () => {
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setAnsweredCount(0);
  };

  const currentMilestone = AGE_MILESTONES.find(m => m.age === selectedAge) || AGE_MILESTONES[1];
  const activeComp = COMPETENCIES.find(c => c.id === selectedCompetency) || COMPETENCIES[0];

  return (
    <div className="bg-white rounded-3xl border border-[#f0d8df] shadow-xl overflow-hidden">
      {/* Top Interactive Mode Switcher */}
      <div className="bg-[#5a1226] text-white p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[#f5c84a] text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Interactive CBC Experience
          </span>
          <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl sm:text-2xl font-bold text-white">
            The Grace Seeds Discovery Lab
          </h3>
        </div>

        <div className="flex bg-black/25 p-1 rounded-2xl border border-white/15">
          <button
            onClick={() => setActiveTab('quest')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'quest'
                ? 'bg-[#e8a92a] text-[#5a1226] shadow-md scale-105'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Brain Quest</span>
          </button>
          <button
            onClick={() => setActiveTab('milestones')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'milestones'
                ? 'bg-[#e8a92a] text-[#5a1226] shadow-md scale-105'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Age Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('competencies')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'competencies'
                ? 'bg-[#e8a92a] text-[#5a1226] shadow-md scale-105'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Core Competencies</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Body */}
      <div className="p-6 sm:p-8 lg:p-10 bg-gradient-to-b from-[#fdfaf6] to-white min-h-[420px] flex flex-col justify-between">
        {/* TAB 1: BRAIN QUEST (INTERACTIVE LEARNING CHALLENGE) */}
        {activeTab === 'quest' && (
          <div className="animate-fadeIn space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0d8df] pb-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${currentQ.badgeColor}`}>
                  {currentQ.area}
                </span>
                <span className="text-xs text-[#8a6470] font-medium">
                  Challenge {currentQIndex + 1} of {QUESTIONS.length}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-[#f9eef1] px-3.5 py-1.5 rounded-full border border-[#f0d8df]">
                  <Trophy className="w-4 h-4 text-[#e8a92a]" />
                  <span className="text-xs font-bold text-[#5a1226]">
                    Score: {score}/{answeredCount}
                  </span>
                </div>
                {answeredCount > 0 && (
                  <button
                    onClick={handleResetQuest}
                    className="text-xs text-[#8a6470] hover:text-[#5a1226] flex items-center gap-1 cursor-pointer"
                    title="Restart Challenge"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Question Card */}
            <div>
              <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl sm:text-2xl font-bold text-[#5a1226] leading-snug mb-5">
                {currentQ.question}
              </h4>

              {/* Options Grid */}
              <div className="grid sm:grid-cols-2 gap-3.5 mb-5">
                {currentQ.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentQ.correctIndex;

                  let btnStyle = 'bg-white hover:bg-[#f9eef1] border-[#f0d8df] text-[#1f0a10]';

                  if (isAnswerSubmitted) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-md ring-2 ring-emerald-300';
                    } else if (isSelected && !isCorrect) {
                      btnStyle = 'bg-rose-50 border-rose-400 text-rose-900 opacity-80';
                    } else {
                      btnStyle = 'bg-white/50 border-[#f0d8df] text-gray-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={option}
                      disabled={isAnswerSubmitted}
                      onClick={() => handleSelectOption(idx)}
                      className={`p-4 rounded-2xl border-2 text-left text-sm font-semibold transition-all cursor-pointer flex items-center justify-between group shadow-sm ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-black/5 text-[#5a1226] text-xs font-bold flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </div>

                      {isAnswerSubmitted && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {isAnswerSubmitted && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Feedback Banner */}
              {isAnswerSubmitted && (
                <div
                  className={`p-4 rounded-2xl border transition-all animate-fadeIn ${
                    selectedOption === currentQ.correctIndex
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/90 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {selectedOption === currentQ.correctIndex ? (
                      <div className="p-1.5 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                        <Star className="w-4 h-4 fill-white" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-xl bg-amber-600 text-white shrink-0 mt-0.5">
                        <Lightbulb className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-sm mb-1">
                        {selectedOption === currentQ.correctIndex
                          ? 'Spot On! Excellent Thinking! ⭐'
                          : 'Good try! Here is how we learn it:'}
                      </p>
                      <p className="text-xs leading-relaxed mb-2">
                        {currentQ.explanation}
                      </p>
                      <p className="text-[11px] font-semibold text-emerald-800 bg-white/70 p-2 rounded-xl inline-block border border-emerald-200/50">
                        💡 <strong>Grace Seeds Classroom Reality:</strong> {currentQ.funFact}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Next Button Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[#f0d8df]">
              <span className="text-xs text-[#8a6470] italic">
                Interactive CBC Assessment Demonstration
              </span>
              {isAnswerSubmitted && (
                <button
                  onClick={handleNextQuestion}
                  className="inline-flex items-center gap-2 bg-[#7b1c35] hover:bg-[#5a1226] text-white font-bold px-6 py-2.5 rounded-full text-xs shadow-md transition-all cursor-pointer hover:scale-105"
                >
                  <span>Next Challenge</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LEARNING MILESTONE SIMULATOR */}
        {activeTab === 'milestones' && (
          <div className="animate-fadeIn space-y-6">
            <div>
              <p className="text-xs font-bold text-[#7b1c35] uppercase tracking-wider mb-2">
                Select Child's Age to Preview Developmental Focus:
              </p>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { age: 2, label: 'Age 2 – 3 (Playgroup)' },
                  { age: 4, label: 'Age 4 (PP1)' },
                  { age: 5, label: 'Age 5 (PP2)' },
                  { age: 7, label: 'Ages 6 – 8 (Grade 1 – 3)' },
                  { age: 10, label: 'Ages 9 – 11 (Grade 4 – 6)' },
                ].map((item) => (
                  <button
                    key={item.age}
                    onClick={() => setSelectedAge(item.age)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                      selectedAge === item.age
                        ? 'bg-[#7b1c35] text-white border-[#7b1c35] shadow-md scale-105'
                        : 'bg-white text-[#5a1226] border-[#f0d8df] hover:bg-[#f9eef1]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Display Selected Stage */}
            <div className="bg-[#f9eef1]/60 rounded-3xl p-6 sm:p-8 border border-[#f0d8df] shadow-inner grid md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full bg-[#e8a92a] text-[#5a1226] font-extrabold text-xs">
                    {currentMilestone.ageRange}
                  </span>
                  <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#5a1226]">
                    {currentMilestone.level}
                  </h4>
                </div>
                <p className="text-sm font-semibold text-[#7b1c35]">
                  Focus: {currentMilestone.focus}
                </p>
                <p className="text-sm text-[#8a6470] leading-relaxed">
                  {currentMilestone.desc}
                </p>

                <div className="space-y-2 pt-2 border-t border-[#f0d8df]">
                  <div className="flex items-start gap-2 text-xs text-[#1f0a10]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Hands-On Activity:</strong> {currentMilestone.sampleActivity}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#1f0a10]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Core Skill Gained:</strong> {currentMilestone.keySkill}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#f0d8df] shadow-md text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#7b1c35] text-white flex items-center justify-center shadow-lg">
                  <currentMilestone.icon className="w-7 h-7 text-[#f5c84a]" />
                </div>
                <div>
                  <p className="text-xs text-[#8a6470] font-bold uppercase tracking-wider">Teacher Ratio</p>
                  <p style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#5a1226]">1 : 15</p>
                  <p className="text-[11px] text-emerald-700 font-semibold">Small class attention</p>
                </div>
                {onNavigateApplySlot && (
                  <button
                    onClick={() => onNavigateApplySlot(currentMilestone.level)}
                    className="w-full bg-[#e8a92a] hover:bg-[#f5c84a] text-[#5a1226] font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow"
                  >
                    Apply for {currentMilestone.level} →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CBC CORE COMPETENCIES */}
        {activeTab === 'competencies' && (
          <div className="animate-fadeIn space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {COMPETENCIES.map((comp) => {
                const isSelected = selectedCompetency === comp.id;
                return (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedCompetency(comp.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#7b1c35] text-white border-[#7b1c35] shadow-lg scale-105'
                        : 'bg-white hover:bg-[#f9eef1] border-[#f0d8df] text-[#5a1226]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20 text-[#f5c84a]' : comp.color}`}>
                        <comp.icon className="w-5 h-5" />
                      </div>
                      {isSelected && <Star className="w-4 h-4 fill-[#f5c84a] text-[#f5c84a]" />}
                    </div>
                    <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-[#5a1226]'}`}>
                      {comp.title}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Selected Competency Detail Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#f0d8df] shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl ${activeComp.color}`}>
                  <activeComp.icon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#e8a92a] uppercase tracking-wider">CBC Essential Pillar</span>
                  <h4 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-bold text-[#5a1226]">
                    {activeComp.title}
                  </h4>
                </div>
              </div>

              <p className="text-sm text-[#8a6470] leading-relaxed mb-4">
                {activeComp.desc}
              </p>

              <div className="bg-[#fdfaf6] border border-[#f0d8df] rounded-2xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#e8a92a] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#5a1226] mb-0.5">Real Classroom Experience at Grace Seeds:</p>
                  <p className="text-xs text-[#8a6470] leading-relaxed">{activeComp.classroomExample}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#8a6470]">
                Aligned with Kenya Institute of Curriculum Development (KICD) CBC Guidelines
              </span>
              {onNavigateProgrammes && (
                <button
                  onClick={onNavigateProgrammes}
                  className="text-xs font-bold text-[#7b1c35] hover:text-[#e8a92a] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  View Full Academic Curricula →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveLearningLab;
