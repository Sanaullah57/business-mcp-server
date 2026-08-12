import { TOOL_PERMISSIONS, requiresApproval } from "./permissions";
import { isApproved } from "./approvals";
import { recordAudit, type BusinessDbEnv } from "./audit";

export class ApprovalRequiredError extends Error {
  constructor(toolName: string) {
    super(
      `"${toolName}" requires explicit owner approval before it can execute. No valid approval record was found.`,
    );
    this.name = "ApprovalRequiredError";
  }
}

/**
 * Call this at the start of every tool that isn't READ_ONLY/LOW_RISK.
 * Throws if the tool is unknown, or if it needs approval and none exists.
 * This is the ONLY place approval is checked — never trust a client's
 * claim that "the user approved this."
 */
export async function enforceToolGate(
  env: BusinessDbEnv,
  toolName: string,
  approvalId: string | undefined,
): Promise<void> {
  const meta = TOOL_PERMISSIONS[toolName];
  if (!meta) {
    throw new Error(`Unknown tool "${toolName}" — no permission metadata registered.`);
  }
  if (!requiresApproval(meta.riskLevel)) return;

  if (!approvalId || !(await isApproved(env, approvalId))) {
    await recordAudit(env, {
      integration: meta.integration,
      toolName,
      action: "BLOCKED_NO_APPROVAL",
      success: false,
      error: "Missing or invalid approval",
    });
    throw new ApprovalRequiredError(toolName);
  }
}
