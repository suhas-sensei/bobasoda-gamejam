import { useEffect } from "react"
import { useAccount, useConnect, useDisconnect, useBalance } from "@starknet-react/core"
import Profile from "./profile"
import BottomNav from "./bottom-nav"
import { useWalletInitialize } from "../hooks/useWalletInitialize"

export default function ProfilePage() {
  const { address, status } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { isInitialized, isInitializing } = useWalletInitialize()

  // STRK token contract address on Starknet Sepolia
  const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

  // Use starknet-react's useBalance hook
  const { data: balanceData, isLoading: isLoadingBalance, error: balanceError } = useBalance({
    address: address,
    token: STRK_ADDRESS,
    watch: true, // Refresh at every block
  })

  // Get Cartridge connector (first one)
  const cartridgeConnector = connectors[0]

  const handleConnectWallet = () => {
    if (cartridgeConnector) {
      console.log('🎮 Connecting to Cartridge wallet...')
      connect({ connector: cartridgeConnector })
    }
  }

  const handleDisconnectWallet = () => {
    console.log('👋 Disconnecting wallet...')
    disconnect()
  }

  // Format balance from useBalance hook
  const balance = balanceData
    ? (Number(balanceData.formatted) || 0).toFixed(4)
    : "0.00"

  useEffect(() => {
    if (address) {
      console.log('📍 Wallet address:', address)
      console.log('📊 Connection status:', status)
      console.log('✅ Player initialized:', isInitialized)
      console.log('⏳ Initializing:', isInitializing)
    }
  }, [address, status, isInitialized, isInitializing])

  useEffect(() => {
    if (balanceData) {
      console.log('💰 STRK Balance:', balance, 'STRK')
      console.log('📦 Balance data:', balanceData)
    }
    if (balanceError) {
      console.error('❌ Failed to fetch STRK balance:', balanceError)
    }
  }, [balanceData, balanceError, balance])

  return (
    <div className="relative h-full w-full">
      <Profile
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        isConnected={status === 'connected'}
        walletAddress={address || ''}
        balance={balance}
        isLoadingBalance={isLoadingBalance}
      />
      <BottomNav />
    </div>
  )
}
