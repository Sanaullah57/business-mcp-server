/**
 * Central audit log. Every consequential action, once real integrations exist,
 * must call recordAudit() — read-only YouTube calls are exempt by design
 * (per TOOL_PERMISSIONS, they're READ_ONLY and non-destructive).
 * Never pass secrets/tokens in `parameters` or `result`.
 */

export interface AuditEntry {
  actor?: string;
  agent?: string;
  integration: string;
  toolName: string;
  action: string;
  parameters?: Record<string, unknown>;
  result?: string;
  success: boolean;
  error?: string;
  approvalId?: string;
}

export interface BusinessDbEnv {
  BUSINESS_DB: D1Database;
}

function newId(): string {
  return crypto.randomUUID();
}

export async function recordAudit(env: BusinessDbEnv, entry: AuditEntry): Promise<void> {
  await env.BUSINESS_DB.prepare(
    `INSERT INTO audit_logs (id, actor, agent, integration, tool_name, action, parameters_json, result, success, error, approval_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      newId(),
      entry.actor ?? null,
      entry.agent ?? null,
      entry.integration,
      entry.toolName,
      entry.action,
      entry.parameters ? JSON.stringify(entry.parameters) : null,
      entry.result ?? null,
      entry.success ? 1 : 0,
      entry.error ?? null,
      entry.approvalId ?? null,
    )
    .run();
}
