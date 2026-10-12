export interface DollarRateResponse {
  rate: number
  timestamp: number
}

/**
 * Fetch current dollar rate in Toman from edge function
 */
export async function fetchDollarRate(): Promise<DollarRateResponse> {
  try {
    const response = await fetch('/api/dollar-rate', {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`Dollar API error: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('[v0] Dollar rate fetch error:', error)
    throw error
  }
}
