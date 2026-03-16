import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ClawGuardState } from '../services/state.js';
import { DASHBOARD_ROUTE_PATH, INSTALL_DEMO, SETTINGS_ROUTE_PATH, renderClawGuardNav } from './shared.js';

export function createSettingsRoute(state: ClawGuardState) {
  return (req: IncomingMessage, res: ServerResponse): true | void => {
    const url = new URL(req.url ?? SETTINGS_ROUTE_PATH, 'http://localhost');
    if (url.pathname !== SETTINGS_ROUTE_PATH) {
      return undefined;
    }

    res.statusCode = 200;
    if (url.searchParams.get('format') === 'json') {
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify(
          {
            approvalTtlSeconds: state.config.approvalTtlSeconds,
            pendingActionLimit: state.config.pendingActionLimit,
            allowOnceGrantLimit: state.config.allowOnceGrantLimit,
            installDemo: INSTALL_DEMO,
          },
          null,
          2,
        ),
      );
      return true;
    }

    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ClawGuard settings</title>
  </head>
  <body>
    <h1>ClawGuard settings</h1>
    <p>Start at <a href="${DASHBOARD_ROUTE_PATH}">${DASHBOARD_ROUTE_PATH}</a> for the unified Alpha overview.</p>
    ${renderClawGuardNav(SETTINGS_ROUTE_PATH)}
    <p>Approval TTL: ${state.config.approvalTtlSeconds} seconds</p>
    <p>Pending action limit: ${state.config.pendingActionLimit}</p>
    <p>Allow-once grant limit: ${state.config.allowOnceGrantLimit}</p>
    <p><strong>${INSTALL_DEMO.title}</strong> — ${INSTALL_DEMO.releaseStatus} The package name <code>${INSTALL_DEMO.packageName}</code> is <strong>not published</strong> and remains a compatibility placeholder.</p>
    <p>Recommended install: use <code>${INSTALL_DEMO.recommendedCommand}</code> from the repo root.</p>
    <p>Optional single-artifact demo only: run <code>${INSTALL_DEMO.optionalPackedArtifactHint}</code> first, then install the generated local tarball manually. This does not imply any registry publish.</p>
    <p>After install, ${INSTALL_DEMO.reloadRequirement}</p>
    <p>Smoke paths: <code>${INSTALL_DEMO.smokePaths.join('</code>, <code>')}</code></p>
    <p>Coverage: ${INSTALL_DEMO.coverage}</p>
    <p>Current limitation: ${INSTALL_DEMO.limitations}</p>
    <p>Operator notes: <code>${INSTALL_DEMO.readmePath}</code> and <code>${INSTALL_DEMO.docsPath}</code></p>
    <p>This spike currently requires one manual retry after approval.</p>
  </body>
</html>`);
    return true;
  };
}
