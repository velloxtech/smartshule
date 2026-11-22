import React from 'react';
import { WebSyllabusCoveragePlanView } from './WebSyllabusCoveragePlanView';

type PageProps = { onNavigateTab?: (tab: string) => void };

// Use the same responsive workflow on the web, desktop and mobile apps.
export function SyllabusCoveragePlanView(props: PageProps) {
  return <WebSyllabusCoveragePlanView {...props} mode="coverage" />;
}
export function CoverageTrackingView(props: PageProps) {
  return <WebSyllabusCoveragePlanView {...props} mode="monitoring" />;
}
export function SchemeOfWorkBuilderView(props: PageProps) {
  return <div className="space-y-4"><button type="button" className="ui-button" onClick={()=>props.onNavigateTab?.('schemes-lesson-plans')}>← Back to Schemes of Work</button><WebSyllabusCoveragePlanView {...props} mode="scheme-builder" /></div>;
}
