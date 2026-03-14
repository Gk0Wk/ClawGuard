export type LivePendingActionStatus = 'pending' | 'approved_waiting_retry';

export type PendingActionLifecycleStatus =
  | LivePendingActionStatus
  | 'denied'
  | 'expired'
  | 'consumed'
  | 'evicted';

export interface PendingAction {
  readonly pending_action_id: string;
  readonly session_key: string;
  readonly session_id?: string;
  readonly agent_id?: string;
  readonly run_id: string;
  readonly tool_call_id?: string;
  readonly tool_name: string;
  readonly params: Record<string, unknown>;
  readonly action_fingerprint: string;
  readonly decision?: 'approve_required' | 'block';
  readonly reason_summary: string;
  readonly reason_code?: string;
  readonly risk_level?: string;
  readonly impact_scope?: string;
  readonly guidance_summary?: string;
  readonly status: LivePendingActionStatus;
  readonly created_at: string;
  readonly expires_at: string;
  readonly approved_at?: string;
}

export interface AllowOnceGrant {
  readonly grant_id: string;
  readonly pending_action_id: string;
  readonly session_key: string;
  readonly tool_name: string;
  readonly action_fingerprint: string;
  readonly issued_at: string;
  readonly expires_at: string;
}

export type AllowOnceGrantStatus = 'issued' | 'consumed' | 'expired' | 'evicted' | 'revoked';

export type AuditEntryKind =
  | 'risk_hit'
  | 'pending_action_created'
  | 'approved'
  | 'denied'
  | 'allow_once_issued'
  | 'allow_once_revoked'
  | 'allow_once_consumed'
  | 'expired'
  | 'evicted'
  | 'allowed'
  | 'failed'
  | 'blocked'
  | 'invalid_transition'
  | 'recovery_error'
  | 'persistence_error';

export interface AuditEntry {
  readonly record_id: string;
  readonly kind: AuditEntryKind;
  readonly timestamp: string;
  readonly session_key?: string;
  readonly run_id?: string;
  readonly tool_call_id?: string;
  readonly tool_name?: string;
  readonly pending_action_id?: string;
  readonly action_fingerprint?: string;
  readonly detail: string;
}

export interface HookDecision {
  readonly block: boolean;
  readonly blockReason?: string;
}

export interface MessageSendingSnapshot {
  readonly to: string;
  readonly content: string;
  readonly channelId: string;
  readonly accountId?: string;
  readonly conversationId?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface MessageSendingDecision {
  readonly cancel: boolean;
}

export interface MessageSentSnapshot extends MessageSendingSnapshot {
  readonly success: boolean;
  readonly error?: string;
}

export interface Clock {
  now(): Date;
}
