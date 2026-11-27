import React from 'react';
import { WebSyllabusCoveragePlanView } from './WebSyllabusCoveragePlanView';
import { SchemesOfWorkView } from './SchemesView';

type PageProps = { onNavigateTab?: (tab: string) => void };

export const SyllabusCoveragePlanView = (props: PageProps) => (
  <WebSyllabusCoveragePlanView {...props} mode="coverage" />
);

export const CoverageTrackingView = (props: PageProps) => (
  <WebSyllabusCoveragePlanView {...props} mode="monitoring" />
);

export const SchemeOfWorkBuilderView = (props: PageProps) => (
  <SchemesOfWorkView {...props} initialCreateOpen />
);