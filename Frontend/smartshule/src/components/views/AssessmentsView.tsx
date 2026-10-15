import React from 'react';
import { FormativeAssessmentsView } from './FormativeAssessmentsView';
import { AssessmentRecord, Student, BackendLearningArea } from '../../types';

interface AssessmentsViewProps {
  assessments: AssessmentRecord[];
  students?: Student[];
  learningAreas?: BackendLearningArea[];
  onOpenNewAssessment: () => void;
  onDeleteAssessment?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const AssessmentsView: React.FC<AssessmentsViewProps> = (props) => {
  return <FormativeAssessmentsView {...props} />;
};
