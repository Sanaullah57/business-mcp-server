import type { RiskLevel } from "./permissions";
import type { BusinessDbEnv } from "./audit";

export interface CreateApprovalInput {
  toolName: string;
  integration: string;
  riskLevel: RiskLevel;
  parameters?: Record<string, unknown>;
  reason: string;
  estimatedImpact?: string;
  expiresInMinutes?: number;
}

export interface ApprovalRecord {
  id: string;
  toolName: string;
  integration: string;
  riskLevel: RiskLevel;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  requestedAt: string;
  expiresAt: string | null;
  decidedAt: string | null;
}

/** Creates a PENDING approval request. Does NOT execute anything. */
export async function createApprovalRequest(
  env: BusinessDbEnv,
  input: CreateApprovalInput,
): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = input.expiresInMinutes
    ? new Date(Date.now() + input.expiresInMinutes * 60_000).toISOString()
    : null;

  await env.BUSINESS_DB.prepare(
    `INSERT INTO approval_requests (id, tool_name, integration, risk_level, parameters_json, reason, estimated_impact, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      input.toolName,
      input.integration,
      input.riskLevel,
      input.parameters ? JSON.stringify(input.parameters) : null,
      input.reason,
      input.estimatedImpact ?? null,
      expiresAt,
    )
    .run();

  return id;
}

/** Returns true only if a real, unexpired APPROVED record exists. Never trust client-claimed approval. */
export async function isApproved(env: BusinessDbEnv, approvalId: string): Promise<boolean> {
  const row = await env.BUSINESS_DB.prepare(
    `SELECT status, expires_at FROM approval_requests WHERE id = ?`,
  )
    .bind(approvalId)
    .first<{ status: string; expires_at: string | null }>();

  if (!row || row.status !== "APPROVED") return false;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return false;
  return true;
}

export async function decideApproval(
  env: BusinessDbEnv,
  approvalId: string,
  decision: "APPROVED" | "REJECTED",
): Promise<void> {
  await env.BUSINESS_DB.prepare(
    `UPDATE approval_requests SET status = ?, decided_at = datetime('now') WHERE id = ? AND status = 'PENDING'`,
  )
    .bind(decision, approvalId)
    .run();
  }
