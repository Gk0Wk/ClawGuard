import { execFixture } from './exec.js';
import { outboundFixture } from './outbound.js';
import { workspaceMutationFixture } from './workspace-mutation.js';

export { execFixture, outboundFixture, workspaceMutationFixture };

export const sprint0Fixtures = [execFixture, outboundFixture, workspaceMutationFixture] as const;
