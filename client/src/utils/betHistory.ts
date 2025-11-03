export interface BetHistoryEntry {
  id: string
  marketName: string
  timestamp: number
  betAmount: number
  direction: 'up' | 'down'
  lockPrice: number
  closePrice: number
  priceChange: number
  priceChangePercent: number
  result: 'win' | 'loss'
  payout: number
  profit: number
  txHash?: string
}

const STORAGE_KEY = 'bet_history'
const MAX_HISTORY_ITEMS = 100

export const getBetHistory = (): BetHistoryEntry[] => {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Failed to load bet history:', error)
    return []
  }
}

export const addBetToHistory = (entry: BetHistoryEntry): void => {
  if (typeof window === 'undefined') return

  try {
    const history = getBetHistory()

    // Add new entry at the beginning
    history.unshift(entry)

    // Keep only the most recent entries
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory))
  } catch (error) {
    console.error('Failed to save bet history:', error)
  }
}

export const clearBetHistory = (): void => {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear bet history:', error)
  }
}

export const getTotalProfit = (): number => {
  const history = getBetHistory()
  return history.reduce((sum, entry) => sum + entry.profit, 0)
}

export const getWinRate = (): number => {
  const history = getBetHistory()
  if (history.length === 0) return 0

  const wins = history.filter(entry => entry.result === 'win').length
  return (wins / history.length) * 100
}
