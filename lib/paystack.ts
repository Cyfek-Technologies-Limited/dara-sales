export type PaystackPlan = 'STARTER' | 'GROWTH'

const paystackApi = 'https://api.paystack.co'

type PaystackEnvelope<T> = {
  status: boolean
  message: string
  data: T
}

type PaystackPlanResponse = {
  plan_code: string
  amount: number
  interval: string
  currency: string
}

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('Paystack is not configured. Set PAYSTACK_SECRET_KEY.')
  return key
}

async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${paystackApi}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  })
  const result = (await response.json()) as PaystackEnvelope<T>
  if (!response.ok || !result.status) {
    throw new Error(result.message || 'Paystack request failed.')
  }
  return result.data
}

export async function getOrCreateMonthlyPlan(plan: PaystackPlan, amount: number) {
  const query = new URLSearchParams({ amount: String(amount), interval: 'monthly', perPage: '100' })
  const existing = await paystackRequest<PaystackPlanResponse[]>(`/plan?${query}`)
  const matchingPlan = existing.find((item) => item.amount === amount && item.interval === 'monthly' && item.currency === 'NGN')
  if (matchingPlan) return matchingPlan.plan_code

  const created = await paystackRequest<PaystackPlanResponse>('/plan', {
    method: 'POST',
    body: JSON.stringify({
      name: `Dara ${plan} monthly`,
      amount,
      interval: 'monthly',
      currency: 'NGN',
      send_invoices: true,
      send_sms: false,
    }),
  })
  return created.plan_code
}

export async function initializePaystackTransaction(input: {
  email: string
  planCode: string
  reference: string
  callbackUrl: string
  metadata: Record<string, string>
}) {
  return paystackRequest<{ authorization_url: string; access_code: string; reference: string }>(
    '/transaction/initialize',
    {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        plan: input.planCode,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    },
  )
}

export async function verifyPaystackTransaction(reference: string) {
  return paystackRequest<{
    status: string
    reference: string
    amount: number
    currency: string
    metadata: Record<string, string> | string | null
    customer?: { customer_code?: string; email?: string }
  }>(`/transaction/verify/${encodeURIComponent(reference)}`)
}

export function parsePaystackMetadata(metadata: unknown): Record<string, unknown> {
  if (typeof metadata === 'string') {
    try {
      const parsed: unknown = JSON.parse(metadata)
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
    } catch {
      return {}
    }
  }
  return metadata && typeof metadata === 'object' ? metadata as Record<string, unknown> : {}
}
