import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ClawGuardState } from '../services/state.js';

const INSTALL_DEMO = {
  title: 'ClawGuard for OpenClaw install demo',
  releaseStatus: 'Install demo only. Not a formal release.',
  published: false,
  packageName: '@clawguard/openclaw-clawguard',
  packageNamePosture: 'Metadata and future compatibility placeholder only.',
  recommendedMethod: 'Local path install from the repo root.',
  recommendedCommand: 'openclaw plugins install .\\plugins\\openclaw-clawguard',
  optionalMethod: 'Local tarball install only. No registry implication.',
  optionalPackedArtifactHint: 'pnpm --dir plugins\\openclaw-clawguard pack',
  readmePath: 'plugins/openclaw-clawguard/README.md',
  docsPath: 'docs/v1-installer-demo-strategy.md',
  reloadRequirement: 'Restart OpenClaw after install; hot reload is not assumed for the demo.',
  smokePaths: [
    '/plugins/clawguard/settings',
    '/plugins/clawguard/approvals',
    '/plugins/clawguard/audit',
  ],
  coverage:
    'Risky exec, minimal outbound, and workspace mutation coverage for write / edit / apply_patch actions, including alpha-safe checks for key config files, repo automation metadata, and obvious out-of-workspace writes, plus plugin-hosted approvals, audit, and settings pages.',
  limitations:
    'Host-level outbound keeps hard blocks on message_sending and closes allowed or failed delivery on message_sent, while tool-level approvals stay on message / sessions_send.',
};

export function createSettingsRoute(state: ClawGuardState) {
  return (req: IncomingMessage, res: ServerResponse): true | void => {
    const url = new URL(req.url ?? '/plugins/clawguard/settings', 'http://localhost');
    if (url.pathname !== '/plugins/clawguard/settings') {
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
    <nav>
      <a href="/plugins/clawguard/approvals">Approvals</a>
      <a href="/plugins/clawguard/audit">Audit</a>
      <a href="/plugins/clawguard/settings">Settings</a>
    </nav>
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
