import {
  PipelineKind,
  ResponseAction,
  RiskDomain,
  RiskEventType,
  buildOpenClawEvaluationArtifacts,
  classifyToolRouting,
} from '../../src/index.js';

import { describe, expect, it } from 'vitest';

describe('tool routing', () => {
  it.each([
    {
      tool_name: ' exec ',
      expected: {
        event_type: RiskEventType.Exec,
        risk_domain: RiskDomain.Execution,
        pipeline_kind: PipelineKind.Exec,
      },
    },
    {
      tool_name: ' message ',
      expected: {
        event_type: RiskEventType.Outbound,
        risk_domain: RiskDomain.DataPrivacy,
        pipeline_kind: PipelineKind.Outbound,
      },
    },
    {
      tool_name: ' sessions_send ',
      expected: {
        event_type: RiskEventType.Outbound,
        risk_domain: RiskDomain.DataPrivacy,
        pipeline_kind: PipelineKind.Outbound,
      },
    },
    {
      tool_name: ' write ',
      expected: {
        event_type: RiskEventType.WorkspaceMutation,
        risk_domain: RiskDomain.Execution,
        pipeline_kind: PipelineKind.WorkspaceMutation,
      },
    },
    {
      tool_name: ' apply_patch ',
      expected: {
        event_type: RiskEventType.WorkspaceMutation,
        risk_domain: RiskDomain.Execution,
        pipeline_kind: PipelineKind.WorkspaceMutation,
      },
    },
  ])('classifies $tool_name into stable routing metadata', ({ tool_name, expected }) => {
    expect(classifyToolRouting(tool_name)).toEqual({
      ...expected,
      is_supported: true,
    });
  });

  it('classifies unsupported tools as neutral routing metadata', () => {
    expect(classifyToolRouting(' browser_open ')).toEqual({
      event_type: RiskEventType.Neutral,
      risk_domain: RiskDomain.VisibilityControl,
      pipeline_kind: PipelineKind.Neutral,
      is_supported: false,
    });
  });

  it('threads routing metadata into evaluation artifacts', () => {
    const artifacts = buildOpenClawEvaluationArtifacts({
      before_tool_call: {
        event: {
          toolName: 'apply_patch',
          params: {
            path: '.env',
            patch: '*** Begin Patch\n*** Update File: .env\n+API_KEY=demo-key\n*** End Patch\n',
          },
          runId: 'run-apply-patch-1',
          toolCallId: 'tool-apply-patch-1',
        },
      },
      session_policy: {
        sessionKey: 'session-apply-patch',
      },
    });

    expect(artifacts.routing).toEqual({
      event_type: RiskEventType.WorkspaceMutation,
      risk_domain: RiskDomain.Execution,
      pipeline_kind: PipelineKind.WorkspaceMutation,
      is_supported: true,
    });
    expect(artifacts.risk_event.event_type).toBe(artifacts.routing.event_type);
    expect(artifacts.risk_event.risk_domain).toBe(artifacts.routing.risk_domain);
  });

  it('keeps unsupported tool calls neutral instead of reusing exec fallback behavior', () => {
    const artifacts = buildOpenClawEvaluationArtifacts({
      before_tool_call: {
        event: {
          toolName: 'browser_open',
          params: {
            url: 'https://example.com',
          },
          runId: 'run-browser-open-1',
          toolCallId: 'tool-browser-open-1',
        },
      },
      session_policy: {
        sessionKey: 'session-browser-open',
        execAsk: true,
      },
    });

    expect(artifacts.routing).toEqual({
      event_type: RiskEventType.Neutral,
      risk_domain: RiskDomain.VisibilityControl,
      pipeline_kind: PipelineKind.Neutral,
      is_supported: false,
    });
    expect(artifacts.rule_matches).toEqual([]);
    expect(artifacts.policy_decision.decision).toBe(ResponseAction.Allow);
    expect(artifacts.approval_request).toBeUndefined();
    expect(artifacts.risk_event.event_type).toBe(RiskEventType.Neutral);
    expect(artifacts.risk_event.risk_domain).toBe(RiskDomain.VisibilityControl);
  });
});
