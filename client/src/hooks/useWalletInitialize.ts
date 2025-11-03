import { useEffect, useState } from 'react'
import { useAccount } from '@starknet-react/core'
import { useDojoContext } from '../dojo/useDojoContext'

/**
 * Hook to automatically initialize player when wallet connects
 */
export function useWalletInitialize() {
  const { address } = useAccount()
  const { actions, account } = useDojoContext()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  useEffect(() => {
    async function initializePlayer() {
      // Only initialize if wallet is connected, we have an account, actions available, and not already initialized/initializing
      if (!address || !account || !actions || isInitialized || isInitializing) {
        return
      }

      console.log('🎮 Wallet connected, initializing player...')
      setIsInitializing(true)

      try {
        await actions.initializePlayer(account)
        console.log('✅ Player initialized successfully!')
        setIsInitialized(true)
      } catch (error) {
        console.error('❌ Failed to initialize player:', error)
        // Don't set isInitialized to true on error, so it can retry
      } finally {
        setIsInitializing(false)
      }
    }

    initializePlayer()
  }, [address, account, actions, isInitialized, isInitializing])

  return {
    isInitialized,
    isInitializing,
  }
}
