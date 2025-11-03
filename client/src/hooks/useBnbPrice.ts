"use client"

import { useEffect, useState } from 'react'

// Pyth Network Hermes API - provides real-time prices
const PYTH_HERMES_API = 'https://hermes.pyth.network/v2/updates/price/latest'
const BNB_USD_PRICE_ID = '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f'

export function useBnbPrice() {
  const [price, setPrice] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`${PYTH_HERMES_API}?ids[]=${BNB_USD_PRICE_ID}`)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (!data.parsed || data.parsed.length === 0) {
          throw new Error('No price data received')
        }

        const priceData = data.parsed[0].price

        // Calculate actual price: price * 10^expo
        const formattedPrice = parseFloat(priceData.price) * Math.pow(10, priceData.expo)

        setPrice(formattedPrice)
        setIsLoading(false)
        setError(null)
      } catch (err) {
        setError('Failed to fetch price')
        setIsLoading(false)
      }
    }

    // Fetch immediately
    fetchPrice()

    // Update every 2 seconds for real-time updates
    const interval = setInterval(fetchPrice, 2000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  return { price, isLoading, error }
}
