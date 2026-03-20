import path from 'node:path';

import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/core';
import { createAfterToolCallHandler } from './hooks/after-tool.js';
import { createBeforeToolCallHandler } from './hooks/before-tool.js';
import { createMessageSentHandler } from './hooks/message-sent.js';
import { createMessageSendingHandler } from './hooks/message-sending.js';
import { createToolResultPersistHandler } from './hooks/tool-result-persist.js';
import { createApprovalsRoute } from './routes/approvals.js';
import { createAuditRoute } from './routes/audit.js';
import { createCheckupRoute } from './routes/checkup.js';
import { createDashboardRoute } from './routes/dashboard.js';
import { createPublicShellRoute, PUBLIC_SHELL_ROUTE_BASE_PATH } from './routes/public-shell.js';
import { createSettingsRoute } from './routes/settings.js';
import {
  APPROVALS_ROUTE_PATH,
  AUDIT_ROUTE_PATH,
  CHECKUP_ROUTE_PATH,
  DASHBOARD_ROUTE_PATH,
  SETTINGS_ROUTE_PATH,
} from './routes/shared.js';
import { createClawGuardState } from './services/state.js';

function readApprovalTtlSeconds(pluginConfig: Record<string, unknown> | undefined): number {
  const raw = pluginConfig?.approvalTtlSeconds;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 30 && raw <= 3600) {
    return raw;
  }

  return 900;
}

function readCapacityLimit(
  pluginConfig: Record<string, unknown> | undefined,
  key: 'pendingActionLimit' | 'allowOnceGrantLimit',
  fallback: number,
): number {
  const raw = pluginConfig?.[key];
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0 && raw <= 512) {
    return raw;
  }

  return fallback;
}

const plugin = {
  id: 'clawguard',
  name: 'ClawGuard',
  description: 'Install-demo ClawGuard approval plugin for OpenClaw.',
  register(api: OpenClawPluginApi) {
    const state = createClawGuardState({
      approvalTtlSeconds: readApprovalTtlSeconds(api.pluginConfig),
      pendingActionLimit: readCapacityLimit(api.pluginConfig, 'pendingActionLimit', 64),
      allowOnceGrantLimit: readCapacityLimit(api.pluginConfig, 'allowOnceGrantLimit', 64),
      snapshotFilePath: path.join(
        api.runtime.state.resolveStateDir(),
        'plugins',
        api.id,
        'live-state.json',
      ),
    });

    api.on('before_tool_call', createBeforeToolCallHandler(state));
    api.on('after_tool_call', createAfterToolCallHandler(state));
    // Workspace mutations can also close through tool_result_persist when the
    // host persists a concrete tool result before or instead of after_tool_call.
    api.on('tool_result_persist', createToolResultPersistHandler(state));
    // Host-level direct sends use message_sending/message_sent; tool-originated
    // message/sessions_send keeps approval ownership on before/after_tool_call.
    api.on('message_sending', createMessageSendingHandler(state));
    api.on('message_sent', createMessageSentHandler(state));
    api.registerHttpRoute({
      path: PUBLIC_SHELL_ROUTE_BASE_PATH,
      auth: 'plugin',
      match: 'prefix',
      handler: createPublicShellRoute(state),
    });
    api.registerHttpRoute({
      path: DASHBOARD_ROUTE_PATH,
      auth: 'gateway',
      match: 'prefix',
      handler: createDashboardRoute(state),
    });
    api.registerHttpRoute({
      path: CHECKUP_ROUTE_PATH,
      auth: 'gateway',
      match: 'prefix',
      handler: createCheckupRoute(state),
    });
    api.registerHttpRoute({
      path: APPROVALS_ROUTE_PATH,
      auth: 'gateway',
      match: 'prefix',
      handler: createApprovalsRoute(state),
    });
    api.registerHttpRoute({
      path: AUDIT_ROUTE_PATH,
      auth: 'gateway',
      match: 'exact',
      handler: createAuditRoute(state),
    });
    api.registerHttpRoute({
      path: SETTINGS_ROUTE_PATH,
      auth: 'gateway',
      match: 'exact',
      handler: createSettingsRoute(state),
    });

    api.logger.info(`ClawGuard demo plugin loaded. Start at ${DASHBOARD_ROUTE_PATH} for the Alpha dashboard.`);
  },
};

export default plugin;
