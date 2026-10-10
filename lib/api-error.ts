import { NextResponse } from 'next/server'

export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'INVALID_INPUT'
  | 'ORGANIZATION_NOT_FOUND'
  | 'INVITE_LIMIT_REACHED'
  | 'INVITE_NOT_FOUND'
  | 'INVITE_EXPIRED'
  | 'INVITE_ALREADY_USED'
  | 'PAYMENT_CONFIGURATION_ERROR'
  | 'PAYMENT_PROVIDER_ERROR'
  | 'INTERNAL_SERVER_ERROR'

export function apiError(code: ApiErrorCode, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: { code, message, ...(details ? { details } : {}) } }, { status })
}

export function apiSuccess<T extends Record<string, unknown>>(data: T) {
  return NextResponse.json({ ok: true, ...data })
}

export function internalApiError(error: unknown) {
  console.error('[v0] API request failed:', error)
  return apiError('INTERNAL_SERVER_ERROR', 'The server could not complete this request.', 500)
}

export function getApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback
  const value = payload as { error?: unknown }
  if (typeof value.error === 'object' && value.error && 'message' in value.error) {
    const message = (value.error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  if (typeof value.error === 'string') return value.error
  return fallback
}
