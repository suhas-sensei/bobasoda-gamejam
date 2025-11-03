import { useEffect, useState } from 'react'
import { useAccount } from '@starknet-react/core'
import { DojoProvider } from '@dojoengine/core'
import { setupWorld } from './contracts.gen'
import { dojoConfig } from './dojoConfig'

export function useDojoContext() {
  const { account: starknetAccount, address } = useAccount()
  const [actions, setActions] = useState<ReturnType<typeof setupWorld>['actions'] | null>(null)

  useEffect(() => {
    async function initDojo() {
      try {
        // Initialize Dojo provider
        const dojoProvider = new DojoProvider(
          dojoConfig.manifest,
          dojoConfig.rpcUrl
        )

        const worldActions = setupWorld(dojoProvider)
        setActions(worldActions.actions)

        console.log('✅ Dojo provider initialized')
      } catch (error) {
        console.error('❌ Failed to initialize Dojo:', error)
      }
    }

    initDojo()
  }, [])

  return {
    actions,
    account: starknetAccount,
    address,
  }
}
