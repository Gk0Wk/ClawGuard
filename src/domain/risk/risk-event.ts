import type { RunRef, SessionRef, ToolCallRef } from '../shared/index.js';
import {
  ResponseAction,
  RiskDomain,
  RiskEventStatus,
  RiskEventType,
  RiskSeverity,
  RiskTriggerSource,
} from '../shared/index.js';

export interface RiskEvent {
  readonly event_id: string;
  readonly decision_id: string;
  readonly event_type: RiskEventType;
  readonly risk_domain: RiskDomain;
  readonly trigger_source: RiskTriggerSource;
  readonly summary: string;
  readonly explanation: string;
  readonly severity: RiskSeverity;
  readonly recommended_action: ResponseAction;
  readonly status: RiskEventStatus;
  readonly session_ref: SessionRef;
  readonly run_ref: RunRef;
  readonly tool_call_ref: ToolCallRef;
}
