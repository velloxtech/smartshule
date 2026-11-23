import React from 'react';
import { WebSyllabusCoveragePlanView } from './WebSyllabusCoveragePlanView';
import { SchemesOfWorkView } from './SchemesView';

type PageProps = { onNavigateTab?: (tab: string) => void };

// Use the same responsive workflow on the web, desktop and mobile apps.
export function SyllabusCoveragePlanView(props: PageProps) {
  return <WebSyllabusCoveragePlanView {...props} mode="coverage" />;
}
export function CoverageTrackingView(props: PageProps) {
  return <WebSyllabusCoveragePlanView {...props} mode="monitoring" />;
}
export function SchemeOfWorkBuilderView(props: PageProps) {
  return <SchemesOfWorkView {...props} initialCreateOpen />;
}
