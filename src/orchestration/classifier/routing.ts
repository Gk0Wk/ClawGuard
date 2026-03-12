import { RiskDomain, RiskEventType } from '../../domain/shared/index.js';

export enum PipelineKind {
  Neutral = 'neutral',
  Exec = 'exec',
  Outbound = 'outbound',
  WorkspaceMutation = 'workspace_mutation',
}

export interface ToolRoutingMetadata {
  readonly event_type: RiskEventType;
  readonly risk_domain: RiskDomain;
  readonly pipeline_kind: PipelineKind;
  readonly is_supported: boolean;
}

const SUPPORTED_TOOL_ROUTES = {
  exec: {
    event_type: RiskEventType.Exec,
    risk_domain: RiskDomain.Execution,
    pipeline_kind: PipelineKind.Exec,
  },
  message: {
    event_type: RiskEventType.Outbound,
    risk_domain: RiskDomain.DataPrivacy,
    pipeline_kind: PipelineKind.Outbound,
  },
  sessions_send: {
    event_type: RiskEventType.Outbound,
    risk_domain: RiskDomain.DataPrivacy,
    pipeline_kind: PipelineKind.Outbound,
  },
  write: {
    event_type: RiskEventType.WorkspaceMutation,
    risk_domain: RiskDomain.Execution,
    pipeline_kind: PipelineKind.WorkspaceMutation,
  },
  apply_patch: {
    event_type: RiskEventType.WorkspaceMutation,
    risk_domain: RiskDomain.Execution,
    pipeline_kind: PipelineKind.WorkspaceMutation,
  },
} satisfies Record<string, Omit<ToolRoutingMetadata, 'is_supported'>>;

const UNSUPPORTED_TOOL_ROUTE: Omit<ToolRoutingMetadata, 'is_supported'> = {
  event_type: RiskEventType.Neutral,
  risk_domain: RiskDomain.VisibilityControl,
  pipeline_kind: PipelineKind.Neutral,
};

export function classifyToolRouting(toolName: string): ToolRoutingMetadata {
  const normalizedToolName = toolName.trim().toLowerCase();
  const supportedRoute = SUPPORTED_TOOL_ROUTES[normalizedToolName as keyof typeof SUPPORTED_TOOL_ROUTES];

  if (supportedRoute) {
    return {
      ...supportedRoute,
      is_supported: true,
    };
  }

  return {
    ...UNSUPPORTED_TOOL_ROUTE,
    is_supported: false,
  };
}
