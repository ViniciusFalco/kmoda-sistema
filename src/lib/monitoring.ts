import { supabase, isSupabaseConfigured } from './supabase'
import type {
  AppActivityType,
  AppPauseRisk,
  KmodaStorageUsage,
  MonitoringPauseRisk,
  MonitoringSpaceStatus,
} from '../types/database'

function getClient() {
  if (!supabase) {
    throw new Error('Supabase não configurado.')
  }

  return supabase
}

function normalizeNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function firstRow<T>(data: T | T[] | null | undefined) {
  if (!data) {
    return null
  }

  return Array.isArray(data) ? data[0] ?? null : data
}

export function getMonitoringSpaceLabel(status: MonitoringSpaceStatus) {
  const labels: Record<MonitoringSpaceStatus, string> = {
    normal: 'Normal',
    attention: 'Atenção',
    warning: 'Alerta',
    critical: 'Crítico',
  }

  return labels[status]
}

export function getMonitoringPauseLabel(status: MonitoringPauseRisk) {
  const labels: Record<MonitoringPauseRisk, string> = {
    baixo: 'Baixo',
    médio: 'Médio',
    alto: 'Alto',
    crítico: 'Crítico',
  }

  return labels[status]
}

export function getOverallMonitoringStatus(
  spaceStatus?: MonitoringSpaceStatus | null,
  pauseRisk?: MonitoringPauseRisk | null,
) {
  const severity: Record<string, number> = {
    normal: 1,
    baixo: 1,
    attention: 2,
    médio: 2,
    warning: 3,
    alto: 3,
    critical: 4,
    crítico: 4,
  }

  const worst = Math.max(severity[spaceStatus ?? 'normal'] ?? 1, severity[pauseRisk ?? 'baixo'] ?? 1)

  if (worst >= 4) {
    return 'critical' as const
  }

  if (worst === 3) {
    return 'warning' as const
  }

  if (worst === 2) {
    return 'attention' as const
  }

  return 'normal' as const
}

export async function loadKmodaStorageUsage() {
  if (!isSupabaseConfigured) {
    return null
  }

  const client = getClient()
  const { data, error } = await client.rpc('get_kmoda_storage_usage')

  if (error) {
    throw new Error(error.message)
  }

  const row = firstRow(data)

  if (!row) {
    return null
  }

  return {
    used_bytes: normalizeNumber((row as Record<string, unknown>).used_bytes),
    used_mb: normalizeNumber((row as Record<string, unknown>).used_mb),
    limit_mb: normalizeNumber((row as Record<string, unknown>).limit_mb),
    percent_used: normalizeNumber((row as Record<string, unknown>).percent_used),
    status: (row as Record<string, unknown>).status as MonitoringSpaceStatus,
  } satisfies KmodaStorageUsage
}

export async function loadAppPauseRisk() {
  if (!isSupabaseConfigured) {
    return null
  }

  const client = getClient()
  const { data, error } = await client.rpc('get_app_pause_risk')

  if (error) {
    throw new Error(error.message)
  }

  const row = firstRow(data)

  if (!row) {
    return null
  }

  const mappedRow = row as Record<string, unknown>

  return {
    last_activity_at: (mappedRow.last_activity_at as string | null) ?? null,
    estimated_pause_at: (mappedRow.estimated_pause_at as string | null) ?? null,
    estimated_days_until_pause:
      mappedRow.estimated_days_until_pause === null || mappedRow.estimated_days_until_pause === undefined
        ? null
        : normalizeNumber(mappedRow.estimated_days_until_pause),
    pause_risk: (mappedRow.pause_risk as MonitoringPauseRisk) ?? 'crítico',
  } satisfies AppPauseRisk
}

export async function recordAppActivity(
  activityType: AppActivityType,
  actorUserId?: string | null,
  metadata: Record<string, unknown> = {},
) {
  if (!isSupabaseConfigured) {
    return
  }

  const client = getClient()
  const { error } = await client.rpc('record_app_activity', {
    p_activity_type: activityType,
    p_actor_user_id: actorUserId ?? null,
    p_metadata: metadata,
  } as never)

  if (error) {
    throw new Error(error.message)
  }
}
