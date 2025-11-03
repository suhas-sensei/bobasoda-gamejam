import { useEffect, useState } from 'react'
import { ArrowUp, ArrowDown, X } from 'lucide-react'
import { getBetHistory, getTotalProfit, getWinRate, type BetHistoryEntry } from '../utils/betHistory'

export default function BetHistoryList() {
  const [history, setHistory] = useState<BetHistoryEntry[]>([])
  const [filter, setFilter] = useState<'all' | 'win' | 'loss'>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    // Initial load with 5 second delay to allow all markets to settle
    const initialLoad = async () => {
      setIsRefreshing(true)
      console.log('⏱️ Waiting 5 seconds for all markets to settle...')
      await new Promise(resolve => setTimeout(resolve, 5000))
      setHistory(getBetHistory())
      setIsRefreshing(false)
      console.log('✅ History loaded')
    }
    initialLoad()

    // Refresh every 10 seconds to catch new bets
    // Increased from 5s to 10s to give more time for settlements
    const interval = setInterval(() => {
      console.log('🔄 Refreshing history...')
      setHistory(getBetHistory())
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const filteredHistory = history.filter(entry => {
    if (filter === 'all') return true
    return entry.result === filter
  })

  const totalProfit = getTotalProfit()
  const winRate = getWinRate()

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#27262c]">
      {/* Header */}
      <div className="flex-shrink-0 pt-8 pb-4 px-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-4">
          Bet History
        </h1>

        {/* Stats */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 bg-black/30 rounded-lg p-3 border border-yellow-400/20">
            <p className="text-yellow-400/60 text-xs mb-1">Total P/L</p>
            <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} STRK
            </p>
          </div>
          <div className="flex-1 bg-black/30 rounded-lg p-3 border border-yellow-400/20">
            <p className="text-yellow-400/60 text-xs mb-1">Win Rate</p>
            <p className="text-lg font-bold text-yellow-400">
              {winRate.toFixed(1)}%
            </p>
          </div>
          <div className="flex-1 bg-black/30 rounded-lg p-3 border border-yellow-400/20">
            <p className="text-yellow-400/60 text-xs mb-1">Total Bets</p>
            <p className="text-lg font-bold text-yellow-400">
              {history.length}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-2xl font-medium transition-all ${
              filter === 'all'
                ? 'bg-yellow-400 text-black'
                : 'bg-black/30 text-yellow-400/60 border border-yellow-400/20'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('win')}
            className={`px-4 py-2 rounded-2xl font-medium transition-all ${
              filter === 'win'
                ? 'bg-yellow-400 text-black'
                : 'bg-black/30 text-yellow-400/60 border border-yellow-400/20'
            }`}
          >
            Wins
          </button>
          <button
            onClick={() => setFilter('loss')}
            className={`px-4 py-2 rounded-2xl font-medium transition-all ${
              filter === 'loss'
                ? 'bg-yellow-400 text-black'
                : 'bg-black/30 text-yellow-400/60 border border-yellow-400/20'
            }`}
          >
            Losses
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide">
        {isRefreshing ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 border-[5px] border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-yellow-400/60 text-center">
              No bet history yet.<br />
              Start betting to see your results here!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((entry) => (
              <div
                key={entry.id}
                className="bg-black/30 rounded-lg p-4 border border-yellow-400/20 hover:border-yellow-400/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    entry.result === 'win'
                      ? 'bg-green-400/20'
                      : 'bg-red-400/20'
                  }`}>
                    {entry.result === 'win' ? (
                      entry.direction === 'up' ? (
                        <ArrowUp className="w-5 h-5 text-green-400" />
                      ) : (
                        <ArrowDown className="w-5 h-5 text-green-400" />
                      )
                    ) : (
                      <X className="w-5 h-5 text-red-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-yellow-400 font-bold">
                        {entry.marketName}/USD
                      </p>
                      <p className={`font-bold ${
                        entry.result === 'win' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {entry.profit >= 0 ? '+' : ''}{entry.profit.toFixed(4)} STRK
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-yellow-400/60">
                        <span className="uppercase font-medium">{entry.direction}</span>
                        <span>•</span>
                        <span>{entry.betAmount} STRK</span>
                      </div>
                      <p className="text-xs text-yellow-400/60">
                        {formatDate(entry.timestamp)}
                      </p>
                    </div>

                    {/* Price info */}
                    <div className="mt-2 pt-2 border-t border-yellow-400/10">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-yellow-400/60">
                          ${entry.lockPrice.toFixed(5)} → ${entry.closePrice.toFixed(5)}
                        </span>
                        <span className={`font-medium ${
                          entry.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {entry.priceChange >= 0 ? '+' : ''}{entry.priceChangePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
