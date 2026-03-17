export const DASHBOARD_ROUTE_PATH = '/plugins/clawguard/dashboard';
export const CHECKUP_ROUTE_PATH = '/plugins/clawguard/checkup';
export const APPROVALS_ROUTE_PATH = '/plugins/clawguard/approvals';
export const AUDIT_ROUTE_PATH = '/plugins/clawguard/audit';
export const SETTINGS_ROUTE_PATH = '/plugins/clawguard/settings';

type ControlSurfacePage = {
  readonly href: string;
  readonly label: string;
  readonly role: string;
  readonly intro: string;
};

export const INSTALL_DEMO = {
  title: 'ClawGuard for OpenClaw install demo',
  releaseStatus: 'Install demo only. Not a formal release.',
  published: false,
  demoPosture:
    'Alpha install-demo only. Unpublished and fake-only. This remains a plugin-owned page rather than a stock Control UI Security tab.',
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
    DASHBOARD_ROUTE_PATH,
    CHECKUP_ROUTE_PATH,
    APPROVALS_ROUTE_PATH,
    AUDIT_ROUTE_PATH,
    SETTINGS_ROUTE_PATH,
  ],
  coverage:
    'Risky exec approvals, minimal outbound checks, and limited workspace mutation heuristics for write / edit / apply_patch. This alpha UI stays fake-only and does not claim broad outbound or workspace coverage.',
  limitations:
    'Host-level outbound keeps hard blocks on message_sending and closes allowed or failed delivery on message_sent, while tool-level approvals stay on message / sessions_send.',
  navigationPosture:
    'There is no stock Control UI Security tab for this alpha, and ClawGuard does not depend on a patched nav hack.',
} as const;

const CONTROL_SURFACE_POSTURE =
  'Alpha control surface only. Plugin-owned, install-demo only, unpublished, fake-only, and not a stock Control UI Security tab.';
const CONTROL_SURFACE_SCOPE =
  'These pages reorganize the same bounded approval, posture, and audit signals only. They do not add new hooks, broader outbound coverage, or extra workspace capture.';
const CONTROL_SURFACE_RELATIONSHIP =
  'Dashboard = status · Checkup = explanation · Approvals = action · Audit = replay.';

const NAV_ITEMS: readonly ControlSurfacePage[] = [
  {
    href: DASHBOARD_ROUTE_PATH,
    label: 'Dashboard',
    role: 'status',
    intro:
      'Start here for the current Alpha status, the main drag, and the first fix. Then use Checkup for explanation, Approvals for action, and Audit for replay.',
  },
  {
    href: CHECKUP_ROUTE_PATH,
    label: 'Checkup',
    role: 'explanation',
    intro:
      'Use this page to explain why the current status looks the way it does. Dashboard gives the summary, Approvals handles the live decision, and Audit shows the replay.',
  },
  {
    href: APPROVALS_ROUTE_PATH,
    label: 'Approvals',
    role: 'action',
    intro:
      'Use this page to take the live approve-or-deny action on risky requests. Dashboard shows the current status, Checkup explains the posture, and Audit replays what happened afterward.',
  },
  {
    href: AUDIT_ROUTE_PATH,
    label: 'Audit',
    role: 'replay',
    intro:
      'Use this page to replay how a risky flow unfolded over time. Dashboard shows the current status, Checkup explains why, and Approvals is where the human action happens.',
  },
  {
    href: SETTINGS_ROUTE_PATH,
    label: 'Settings',
    role: 'limits',
    intro:
      'Use this page to inspect install-demo limits and metadata without changing the control-surface scope.',
  },
] as const;

function getControlSurfacePage(currentPath: string): ControlSurfacePage {
  return NAV_ITEMS.find((item) => item.href === currentPath) ?? NAV_ITEMS[0];
}

export function renderControlSurfaceIntro(currentPath: string): string {
  const page = getControlSurfacePage(currentPath);

  return `<p><strong>${CONTROL_SURFACE_POSTURE}</strong> ${CONTROL_SURFACE_SCOPE}</p>
<p><strong>${page.label} = ${page.role}</strong>. ${page.intro}</p>`;
}

export function renderClawGuardNav(currentPath: string): string {
  const pageLinks = NAV_ITEMS.map((item) =>
    item.href === currentPath
      ? `<strong>${item.label}</strong> <small aria-current="page">${item.role}</small>`
      : `<a href="${item.href}">${item.label}</a> <small>${item.role}</small>`,
  ).join(' · ');

  return `<nav aria-label="ClawGuard alpha control surface">
<p><strong>Alpha control surface</strong> — ${CONTROL_SURFACE_RELATIONSHIP}</p>
<p>${pageLinks}</p>
</nav>`;
}

export function renderInstallDemoPostureNote(): string {
  return `<p><strong>${INSTALL_DEMO.demoPosture}</strong> ${INSTALL_DEMO.navigationPosture}</p>`;
}
