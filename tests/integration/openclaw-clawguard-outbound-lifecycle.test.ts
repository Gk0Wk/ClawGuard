import { describe, expect, it } from 'vitest';

import { createAfterToolCallHandler } from '../../plugins/openclaw-clawguard/src/hooks/after-tool.js';
import { createBeforeToolCallHandler } from '../../plugins/openclaw-clawguard/src/hooks/before-tool.js';
import { createMessageSentHandler } from '../../plugins/openclaw-clawguard/src/hooks/message-sent.js';
import { createMessageSendingHandler } from '../../plugins/openclaw-clawguard/src/hooks/message-sending.js';
import { createClawGuardState } from '../../plugins/openclaw-clawguard/src/services/state.js';

function createOutboundEvent({
  toolName = 'message',
  to = 'ops-room',
  message = 'all clear',
}: {
  toolName?: string;
  to?: string;
  message?: string;
} = {}) {
  return {
    event: {
      toolName,
      params: {
        to,
        message,
      },
      runId: 'run-outbound-1',
      toolCallId: 'tool-outbound-1',
    },
    context: {
      sessionKey: 'session-outbound-1',
      sessionId: 'session-outbound-id-1',
      agentId: 'agent-outbound-1',
    },
  };
}

function createHostOutboundMessageEvent({
  to = 'C123',
  content = 'all clear',
  channelId = 'slack',
  accountId = 'default',
  conversationId = 'C123',
  metadata,
}: {
  to?: string;
  content?: string;
  channelId?: string;
  accountId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
} = {}) {
  return {
    event: {
      to,
      content,
      metadata,
    },
    context: {
      channelId,
      accountId,
      conversationId,
    },
  };
}

function getLatestAuditByKind(state: ReturnType<typeof createClawGuardState>, kind: string) {
  return state.audit.list().find((entry) => entry.kind === kind);
}

describe('OpenClaw ClawGuard outbound lifecycle', () => {
  it('closes the audit loop with an allowed outcome after an approved outbound retry completes', () => {
    const state = createClawGuardState();
    const beforeHandler = createBeforeToolCallHandler(state);
    const afterHandler = createAfterToolCallHandler(state);
    const { event, context } = createOutboundEvent({
      to: 'public-room',
      message: 'Authorization: Bearer github_pat_1234567890_abcdefghijklmnopqrstuvwxyz',
    });

    expect(beforeHandler(event, context)).toMatchObject({ block: true });
    const pending = state.pendingActions.list()[0];
    state.approvePendingAction(pending.pending_action_id);

    expect(beforeHandler(event, context)).toBeUndefined();
    afterHandler(
      {
        ...event,
        result: 'message delivered',
      },
      context,
    );

    expect(getLatestAuditByKind(state, 'allowed')).toMatchObject({
      pending_action_id: pending.pending_action_id,
      run_id: 'run-outbound-1',
      tool_call_id: 'tool-outbound-1',
      tool_name: 'message',
    });
    expect(getLatestAuditByKind(state, 'allowed')?.detail).toContain(
      'Final outcome allowed after execution.',
    );
  });

  it('closes the audit loop with a failed outcome when an approved outbound retry fails', () => {
    const state = createClawGuardState();
    const beforeHandler = createBeforeToolCallHandler(state);
    const afterHandler = createAfterToolCallHandler(state);
    const { event, context } = createOutboundEvent({
      toolName: 'sessions_send',
      to: 'public-room',
      message: 'Bearer abcdefghijklmnopqrstuvwxyz123456',
    });

    expect(beforeHandler(event, context)).toMatchObject({ block: true });
    const pending = state.pendingActions.list()[0];
    state.approvePendingAction(pending.pending_action_id);

    expect(beforeHandler(event, context)).toBeUndefined();
    afterHandler(
      {
        ...event,
        error: 'delivery timeout',
      },
      context,
    );

    expect(getLatestAuditByKind(state, 'failed')).toMatchObject({
      pending_action_id: pending.pending_action_id,
      run_id: 'run-outbound-1',
      tool_call_id: 'tool-outbound-1',
      tool_name: 'sessions_send',
    });
    expect(getLatestAuditByKind(state, 'failed')?.detail).toContain(
      'Final outcome failed after execution.',
    );
  });

  it('closes direct host outbound with an allowed outcome after message_sent success', () => {
    const state = createClawGuardState();
    const sendingHandler = createMessageSendingHandler(state);
    const sentHandler = createMessageSentHandler(state);
    const { event, context } = createHostOutboundMessageEvent({
      content: 'daily build finished successfully',
    });

    expect(sendingHandler(event, context)).toBeUndefined();
    sentHandler(
      {
        to: event.to,
        content: event.content,
        success: true,
      },
      context,
    );

    expect(state.pendingActions.list()).toHaveLength(0);
    expect(getLatestAuditByKind(state, 'allowed')).toMatchObject({
      tool_name: 'message_sending',
    });
    expect(getLatestAuditByKind(state, 'allowed')?.detail).toContain(
      'Final outbound outcome allowed after host delivery.',
    );
    expect(getLatestAuditByKind(state, 'allowed')?.detail).toContain('Route mode=explicit.');
  });

  it('hard-blocks direct host outbound when the content would otherwise require approval', () => {
    const state = createClawGuardState();
    const sendingHandler = createMessageSendingHandler(state);
    const sentHandler = createMessageSentHandler(state);
    const { event, context } = createHostOutboundMessageEvent({
      content: 'Bearer abcdefghijklmnopqrstuvwxyz123456',
    });

    expect(sendingHandler(event, context)).toEqual({ cancel: true });
    expect(state.pendingActions.list()).toHaveLength(0);
    expect(getLatestAuditByKind(state, 'blocked')?.detail).toContain(
      'Direct host outbound cannot enter the pending approval loop',
    );

    sentHandler(
      {
        to: event.to,
        content: event.content,
        success: true,
      },
      context,
    );

    expect(getLatestAuditByKind(state, 'allowed')).toBeUndefined();
  });

  it('closes direct host outbound with a failed outcome after message_sent failure', () => {
    const state = createClawGuardState();
    const sendingHandler = createMessageSendingHandler(state);
    const sentHandler = createMessageSentHandler(state);
    const { event, context } = createHostOutboundMessageEvent({
      content: 'daily build finished successfully',
    });

    expect(sendingHandler(event, context)).toBeUndefined();
    sentHandler(
      {
        to: event.to,
        content: event.content,
        success: false,
        error: 'delivery timeout',
      },
      context,
    );

    expect(state.pendingActions.list()).toHaveLength(0);
    expect(getLatestAuditByKind(state, 'failed')).toMatchObject({
      tool_name: 'message_sending',
    });
    expect(getLatestAuditByKind(state, 'failed')?.detail).toContain(
      'Final outbound outcome failed after host delivery.',
    );
    expect(getLatestAuditByKind(state, 'failed')?.detail).toContain('Route mode=explicit.');
  });
});
