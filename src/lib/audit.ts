import { isSupabaseAdminConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";

export type AuditActorType = "admin" | "student" | "system" | "anonymous";

export interface AuditEventParams {
  eventType: string;
  actorType: AuditActorType;
  actorId?: string | null;
  ipAddress?: string | null;
  details?: Record<string, unknown>;
}

/**
 * Registra eventos de segurança críticos na tabela public.audit_logs e no log do servidor.
 * A execução é não-bloqueante para não degradar a performance das requisições.
 */
export async function logSecurityEvent({
  eventType,
  actorType,
  actorId = null,
  ipAddress = null,
  details = {},
}: AuditEventParams): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] [${timestamp}] [${eventType}] [${actorType}:${actorId || "unknown"}] IP: ${ipAddress || "N/A"}`);

  if (!isSupabaseAdminConfigured) {
    return;
  }

  try {
    const admin = getSupabaseAdmin();
    // Fire-and-forget: grava no banco de forma assíncrona
    void Promise.resolve(
      admin.from("audit_logs").insert({
        event_type: eventType,
        actor_type: actorType,
        actor_id: actorId,
        ip_address: ipAddress,
        details,
      })
    )
      .then((res) => {
        if (res && res.error) {
          console.warn("[AUDIT] Falha ao persistir evento de auditoria no Supabase:", res.error.message);
        }
      })
      .catch((err: unknown) => {
        console.warn("[AUDIT] Exceção ao gravar auditoria:", err);
      });
  } catch (err) {
    console.warn("[AUDIT] Exceção no cliente de auditoria:", err);
  }
}
