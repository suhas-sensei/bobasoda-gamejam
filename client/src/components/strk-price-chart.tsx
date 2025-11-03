
import { useEffect, useState } from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis, ReferenceLine } from 'recharts'

interface StrkPriceChartProps {
  currentPrice: number | null
  lockPrice: number | null
}

interface PriceDataPoint {
  time: number
  price: number
}

export default function StrkPriceChart({ currentPrice, lockPrice }: StrkPriceChartProps) {
  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([])

  // Initialize with current price
  useEffect(() => {
    if (!currentPrice || priceHistory.length > 0) return

    // Create initial data points for smoother chart appearance
    const initialData: PriceDataPoint[] = []
    const now = Date.now()

    for (let i = 0; i < 30; i++) {
      initialData.push({
        time: now - (30 - i) * 2000,
        price: currentPrice,
      })
    }

    setPriceHistory(initialData)
  }, [currentPrice, priceHistory.length])

  // Update chart data when price changes
  useEffect(() => {
    if (!currentPrice) return

    setPriceHistory((prev) => {
      // Don't add if history is empty (not initialized yet)
      if (prev.length === 0) return prev

      const now = Date.now()

      const newDataPoint: PriceDataPoint = {
        time: now,
        price: currentPrice,
      }

      // Keep last 60 data points (about 2 minutes at 2s intervals)
      const updated = [...prev, newDataPoint].slice(-60)
      return updated
    })
  }, [currentPrice])

  if (priceHistory.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-black opacity-50 text-sm">Loading chart...</p>
      </div>
    )
  }

  // Calculate dynamic margin based on price range (2% of average price)
  const avgPrice = currentPrice || 0.1
  const margin = avgPrice * 0.02

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={priceHistory} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <YAxis domain={[(dataMin: number) => dataMin - margin, (dataMax: number) => dataMax + margin]} hide />

          {/* Reference line showing lock price (captured at 30s mark) */}
          {lockPrice !== null && (
            <ReferenceLine
              y={lockPrice}
              stroke="#000000"
              strokeDasharray="4 4"
              strokeWidth={2}
              opacity={0.5}
            />
          )}

          <Line
            type="monotone"
            dataKey="price"
            stroke="#000000"
            strokeWidth={4}
            dot={(props) => {
              const { cx, cy, index } = props
              // Only show dot on the last (current) data point
              if (index === priceHistory.length - 1) {
                return (
                  <g>
                    {/* Outer pulse ring */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill="#000000"
                      opacity={0.2}
                    />
                    {/* Inner solid dot */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill="#000000"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  </g>
                )
              }
              return <></>
            }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
