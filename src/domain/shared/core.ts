export type IsoTimestamp = string;

export enum RiskDomain {
  FundsSafety = 'funds_safety',
  DataPrivacy = 'data_privacy',
  Execution = 'execution',
  SupplyChain = 'supply_chain',
  VisibilityControl = 'visibility_control',
}

export enum RiskSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

export enum ResponseAction {
  Allow = 'allow',
  Warn = 'warn',
  ApproveRequired = 'approve_required',
  Block = 'block',
  Constrain = 'constrain',
}

export enum RiskEventType {
  Neutral = 'neutral',
  Exec = 'exec',
  Outbound = 'outbound',
  WorkspaceMutation = 'workspace_mutation',
}

export enum RiskTriggerSource {
  BeforeToolCall = 'before_tool_call',
  AfterToolCall = 'after_tool_call',
  AgentEvent = 'agent_event',
  Manual = 'manual',
}

export enum RiskEventStatus {
  Detected = 'detected',
  PendingApproval = 'pending_approval',
  Approved = 'approved',
  Denied = 'denied',
  Blocked = 'blocked',
  Allowed = 'allowed',
  Logged = 'logged',
  Failed = 'failed',
}

export enum RunStatus {
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export enum ToolPhase {
  Before = 'before',
  After = 'after',
}

export enum ToolStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Blocked = 'blocked',
  Failed = 'failed',
}

export enum ApprovalResultStatus {
  Pending = 'pending',
  Approved = 'approved',
  Denied = 'denied',
  Expired = 'expired',
  Bypassed = 'bypassed',
}

export enum ApprovalCategory {
  Exec = 'exec',
  Outbound = 'outbound',
  WorkspaceMutation = 'workspace_mutation',
  Generic = 'generic',
}

export enum PolicyDecisionReasonCode {
  SessionExecPolicy = 'session_exec_policy',
  SessionSendPolicy = 'session_send_policy',
  FastPathCommand = 'fast_path_command',
  FastPathPath = 'fast_path_path',
  FastPathSecret = 'fast_path_secret',
  FastPathDestination = 'fast_path_destination',
  DefaultAllow = 'default_allow',
}

export enum ExecutionStatus {
  Allowed = 'allowed',
  Blocked = 'blocked',
  Constrained = 'constrained',
  Failed = 'failed',
}

export enum AuditRecordFinalStatus {
  Logged = 'logged',
  Allowed = 'allowed',
  Blocked = 'blocked',
  Constrained = 'constrained',
  Failed = 'failed',
}

export interface SessionRef {
  readonly session_key: string;
  readonly session_id?: string;
  readonly agent_id?: string;
  readonly origin_channel?: string;
  readonly origin_to?: string;
  readonly origin_thread?: string;
  readonly send_policy?: string;
  readonly exec_host?: string;
  readonly exec_security?: string;
  readonly exec_ask?: boolean;
  readonly elevated_level?: string;
}

export interface RunRef {
  readonly run_id: string;
  readonly session_key: SessionRef['session_key'];
  readonly started_at: IsoTimestamp;
  readonly ended_at?: IsoTimestamp;
  readonly run_status: RunStatus;
}

export interface ToolCallRef {
  readonly tool_call_id: string;
  readonly tool_name: string;
  readonly run_id: RunRef['run_id'];
  readonly tool_phase: ToolPhase;
  readonly tool_status: ToolStatus;
}
