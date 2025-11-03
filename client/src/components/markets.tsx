
import MarketCard from "./market-card"
import { useRef, useEffect, useState } from "react"
import { ChevronUp, ChevronDown, Search, Bell } from "lucide-react"
import { useAccount } from "@starknet-react/core"
import { Account, RpcProvider, CallData, Signer } from "starknet"
// import Image from "next/image"
import BottomNav from "./bottom-nav"
import { addBetToHistory } from "../utils/betHistory"
import { roundManager } from "../services/roundManager"

interface BetPrompt {
  direction: "up" | "down"
  marketName: string
}

interface ActiveBet {
  amount: string
  direction: "up" | "down"
  marketName: string
}

interface MarketBets {
  [marketName: string]: ActiveBet | null
}

interface BotBet {
  amount: number
  direction: "up" | "down"
}

// HOUSE WALLET - ALL BETS GO HERE
const HOUSE_WALLET = {
  address: '0x055a3cdffef57ab679a15d9e9cfe25e7156bbb4efdb0e23af484f1f3c779579e',
  privateKey: '0x0377dab5abf8685527c990d3137b37c0670983cf660a300ef4db5ef5daecc8f8'
}

// Bot wallet addresses - REAL WALLETS WITH PRIVATE KEYS
const BOT_WALLETS = [
  {
    address: '0x018062335e3d58d9026b4920c0feea2e4d4d0574c528bc08778ad0ed5b5bf146',
    privateKey: '0x0127b891e972feac3fdeec3cff201a43ced9503119232f19d7cb70c4c67113a1',
    name: 'Bot 1'
  },
  {
    address: '0x079c59071f98449ab049673b51569b1770326b1a83f4a1440dd92e6b0fab2968',
    privateKey: '0x07d8e922404b5a8c3e64db46d68f038fe3872acef7a61b6cb0d915913aa99631',
    name: 'Bot 2'
  }
]

export default function Markets() {
  const markets = ["ETH", "BNB", "STRK"]
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [swipedMarkets, setSwipedMarkets] = useState<Set<string>>(new Set())
  const [betPrompt, setBetPrompt] = useState<BetPrompt | null>(null)
  const [betAmount, setBetAmount] = useState("10")
  const [marketBets, setMarketBets] = useState<MarketBets>({})
  const [botBets, setBotBets] = useState<BotBet[]>([])
  const [botsBetting, setBotsBetting] = useState(false)
  const { account } = useAccount()

  useEffect(() => {
    // Detect if device is mobile
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let scrollTimeout: NodeJS.Timeout

    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        const scrollTop = container.scrollTop
        const itemHeight = container.clientHeight
        const index = Math.round(scrollTop / itemHeight)
        setCurrentIndex(index)

        container.scrollTo({
          top: index * itemHeight,
          behavior: 'smooth'
        })
      }, 150)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [])

  const scrollToMarket = (index: number) => {
    const container = scrollContainerRef.current
    if (!container) return

    const itemHeight = container.clientHeight
    container.scrollTo({
      top: index * itemHeight,
      behavior: 'smooth'
    })
    setCurrentIndex(index)
  }

  const handleSwipeComplete = (direction: "up" | "down", marketName: string) => {
    console.log(`Swiped ${direction.toUpperCase()} on ${marketName}`)
    // Show bet prompt modal
    setBetPrompt({ direction, marketName })
  }

  const handleConfirmBet = async () => {
    if (!betPrompt || !account) return

    if (betAmount && !isNaN(parseFloat(betAmount)) && parseFloat(betAmount) > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('💰 YOUR BET')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`   Amount: ${betAmount} STRK`)
      console.log(`   Market: ${betPrompt.marketName}`)
      console.log(`   Direction: ${betPrompt.direction.toUpperCase()} ${betPrompt.direction === 'up' ? '📈' : '📉'}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

      try {
        // Transfer bet amount to house immediately
        const amountInWei = BigInt(Math.floor(parseFloat(betAmount) * 1e18))

        const transferCall = {
          contractAddress: STRK_ADDRESS,
          entrypoint: 'transfer',
          calldata: [HOUSE_WALLET.address, amountInWei.toString(), '0'], // recipient, amount_low, amount_high
        }

        console.log(`💸 Sending ${betAmount} STRK to house wallet...`)
        const result = await account.execute(transferCall)
        console.log(`✅ TRANSACTION CONFIRMED!`)
        console.log(`   TX Hash: ${result.transaction_hash}`)
        console.log(`   House: ${HOUSE_WALLET.address}\n`)

        // Store the active bet for this specific market
        const newBet = {
          amount: betAmount,
          direction: betPrompt.direction,
          marketName: betPrompt.marketName,
        }
        setMarketBets(prev => ({
          ...prev,
          [betPrompt.marketName]: newBet
        }))

        // Notify round manager about the bet
        roundManager.setBet(betPrompt.marketName, newBet)

        // Mark this market as swiped for this round
        setSwipedMarkets(prev => new Set(prev).add(betPrompt.marketName))
        setBetPrompt(null)
        setBetAmount("10")
      } catch (error) {
        console.error(`\n❌ BET FAILED:`, error)
        alert('Failed to place bet. Please try again.')
      }
    } else {
      console.log(`❌ Invalid bet amount`)
    }
  }

  const handleCancelBet = () => {
    console.log(`❌ Bet cancelled`)
    setBetPrompt(null)
    setBetAmount("10")
  }

  const handleBetSettlement = async (marketName: string, lockPrice: number, closePrice: number) => {
    const activeBet = marketBets[marketName]

    if (!activeBet || !account) {
      console.log(`⚠️ No active bet on ${marketName} to settle`)
      return
    }

    const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
    const diff = closePrice - lockPrice
    const winningDirection = diff > 0 ? 'up' : 'down'

    // Calculate winners and their payouts
    const userBetAmount = parseFloat(activeBet.amount)
    const userWon = activeBet.direction === winningDirection

    // Calculate total winning and losing pools
    const botTotalUp = botBets.filter(b => b.direction === 'up').reduce((sum, b) => sum + b.amount, 0)
    const botTotalDown = botBets.filter(b => b.direction === 'down').reduce((sum, b) => sum + b.amount, 0)

    const userOnUp = activeBet.direction === 'up'
    const totalUp = (userOnUp ? userBetAmount : 0) + botTotalUp
    const totalDown = (!userOnUp ? userBetAmount : 0) + botTotalDown
    const totalPool = totalUp + totalDown

    const winningPool = winningDirection === 'up' ? totalUp : totalDown

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`🏁 ${marketName}/USD ROUND ENDED`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`   Lock Price: $${lockPrice.toFixed(5)}`)
    console.log(`   Close Price: $${closePrice.toFixed(5)}`)
    console.log(`   Price Change: ${diff > 0 ? '+' : ''}${diff.toFixed(5)} (${((diff/lockPrice) * 100).toFixed(2)}%)`)
    console.log(`   Winner: ${winningDirection.toUpperCase()} ${winningDirection === 'up' ? '📈' : '📉'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('💰 POOL BREAKDOWN')
    console.log(`   UP Pool: ${totalUp.toFixed(2)} STRK`)
    console.log(`   DOWN Pool: ${totalDown.toFixed(2)} STRK`)
    console.log(`   Total Pool: ${totalPool.toFixed(2)} STRK`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // AUTOMATED PAYOUTS FROM HOUSE
    try {
      const provider = new RpcProvider({ nodeUrl: 'https://api.cartridge.gg/x/starknet/sepolia' })
      const houseSigner = new Signer(HOUSE_WALLET.privateKey)
      const houseAccount = new Account({
        provider,
        address: HOUSE_WALLET.address,
        signer: houseSigner
      })

      // Get current nonce from the house account
      let currentNonce = await houseAccount.getNonce()
      console.log(`🔧 House account starting nonce: ${currentNonce}\n`)

      // Add small delay based on market to avoid nonce collisions when multiple markets settle simultaneously
      const marketDelays: Record<string, number> = { 'ETH': 0, 'BNB': 500, 'STRK': 1000 }
      const delay = marketDelays[marketName] || 0
      if (delay > 0) {
        console.log(`⏱️ Waiting ${delay}ms to avoid nonce collision...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        // Re-fetch nonce after delay to get updated value
        currentNonce = await houseAccount.getNonce()
        console.log(`🔧 Updated nonce after delay: ${currentNonce}\n`)
      }

      // Pay user if they won
      if (userWon) {
        const userWinnings = (userBetAmount / winningPool) * totalPool
        const profit = userWinnings - userBetAmount
        const amountInWei = BigInt(Math.floor(userWinnings * 1e18))

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🎉 YOU WON!')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`   Your Bet: ${userBetAmount} STRK`)
        console.log(`   Total Payout: ${userWinnings.toFixed(4)} STRK`)
        console.log(`   Net Profit: +${profit.toFixed(4)} STRK 💰`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        console.log(`💸 Sending ${userWinnings.toFixed(4)} STRK from house to your wallet...`)

        const transferCalldata = CallData.compile({
          recipient: account.address,
          amount: {
            low: amountInWei.toString(),
            high: '0'
          }
        })

        const result = await houseAccount.execute(
          {
            contractAddress: STRK_ADDRESS,
            entrypoint: 'transfer',
            calldata: transferCalldata
          },
          { nonce: currentNonce }
        )

        console.log(`✅ PAYOUT CONFIRMED!`)
        console.log(`   TX Hash: ${result.transaction_hash}`)
        console.log(`   To: ${account.address}`)
        console.log(`   Nonce used: ${currentNonce}\n`)

        // Save to history
        const historyEntry = {
          id: `${Date.now()}-${marketName}-${Math.random()}`,
          marketName,
          timestamp: Date.now(),
          betAmount: userBetAmount,
          direction: activeBet.direction,
          lockPrice,
          closePrice,
          priceChange: diff,
          priceChangePercent: (diff / lockPrice) * 100,
          result: 'win' as const,
          payout: userWinnings,
          profit,
          txHash: result.transaction_hash
        }
        console.log('💾 Saving win to history:', historyEntry)
        addBetToHistory(historyEntry)

        // Increment nonce for next transaction (convert back to hex format)
        currentNonce = "0x" + (BigInt(currentNonce) + 1n).toString(16)
      } else {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('😢 YOU LOST')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`   Your Bet: ${userBetAmount} STRK`)
        console.log(`   You bet ${activeBet.direction.toUpperCase()} but price went ${winningDirection.toUpperCase()}`)
        console.log(`   Loss: -${userBetAmount} STRK 📉`)
        console.log(`   House keeps your bet`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        // Save to history
        const historyEntry = {
          id: `${Date.now()}-${marketName}-${Math.random()}`,
          marketName,
          timestamp: Date.now(),
          betAmount: userBetAmount,
          direction: activeBet.direction,
          lockPrice,
          closePrice,
          priceChange: diff,
          priceChangePercent: (diff / lockPrice) * 100,
          result: 'loss' as const,
          payout: 0,
          profit: -userBetAmount
        }
        console.log('💾 Saving loss to history:', historyEntry)
        addBetToHistory(historyEntry)
      }

      // Pay winning bots
      console.log('🤖 BOT PAYOUTS')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      for (let i = 0; i < botBets.length; i++) {
        const botBet = botBets[i]
        const bot = BOT_WALLETS[i]

        if (botBet.direction === winningDirection) {
          const botWinnings = (botBet.amount / winningPool) * totalPool
          const amountInWei = BigInt(Math.floor(botWinnings * 1e18))

          console.log(`   ${bot.name}: WON ${botWinnings.toFixed(4)} STRK (bet ${botBet.amount} STRK)`)

          const transferCalldata = CallData.compile({
            recipient: bot.address,
            amount: {
              low: amountInWei.toString(),
              high: '0'
            }
          })

          const result = await houseAccount.execute(
            {
              contractAddress: STRK_ADDRESS,
              entrypoint: 'transfer',
              calldata: transferCalldata
            },
            { nonce: currentNonce }
          )

          console.log(`   ✅ TX: ${result.transaction_hash} (nonce: ${currentNonce})`)

          // Increment nonce for next transaction (convert back to hex format)
          currentNonce = "0x" + (BigInt(currentNonce) + 1n).toString(16)
        } else {
          console.log(`   ${bot.name}: LOST ${botBet.amount} STRK (bet ${botBet.direction.toUpperCase()}, price went ${winningDirection.toUpperCase()})`)
        }
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    } catch (error) {
      console.error(`\n❌ PAYOUT FAILED:`, error)
    }

    // Clear the bet for this specific market
    setMarketBets(prev => ({
      ...prev,
      [marketName]: null
    }))
  }

  const generateBotBets = useRef(async () => {
    // Prevent duplicate bets if already betting
    if (botsBetting) {
      console.log('⚠️ Bots already betting, skipping...')
      return
    }

    setBotsBetting(true)

    // Generate random bets for each bot (0.1 STRK, random direction)
    const newBotBets: BotBet[] = BOT_WALLETS.map(() => ({
      amount: 0.1, // Fixed 0.1 STRK per bot
      direction: Math.random() > 0.5 ? 'up' : 'down' as "up" | "down"
    }))

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🤖 BOT BETS - NEW ROUND')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    newBotBets.forEach((bet, index) => {
      console.log(`   ${BOT_WALLETS[index].name}: ${bet.amount} STRK on ${bet.direction.toUpperCase()} ${bet.direction === 'up' ? '📈' : '📉'}`)
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // REAL TRANSACTIONS: Bots send STRK to house
    const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

    const provider = new RpcProvider({
      nodeUrl: 'https://api.cartridge.gg/x/starknet/sepolia'
    })

    for (let i = 0; i < BOT_WALLETS.length; i++) {
      const bot = BOT_WALLETS[i]
      const bet = newBotBets[i]

      try {
        console.log(`🔧 ${bot.name}: Initializing account...`)

        // Create account with signer
        const botSigner = new Signer(bot.privateKey)
        const account = new Account({
          provider,
          address: bot.address,
          signer: botSigner
        })

        const amountInWei = BigInt(Math.floor(bet.amount * 1e18))

        // Use CallData to format the transfer properly
        const transferCalldata = CallData.compile({
          recipient: HOUSE_WALLET.address,
          amount: {
            low: amountInWei.toString(),
            high: '0'
          }
        })

        console.log(`💸 ${bot.name}: Sending ${bet.amount} STRK to house...`)
        const result = await account.execute({
          contractAddress: STRK_ADDRESS,
          entrypoint: 'transfer',
          calldata: transferCalldata
        })

        console.log(`✅ ${bot.name}: TRANSACTION CONFIRMED`)
        console.log(`   TX Hash: ${result.transaction_hash}\n`)
      } catch (error: any) {
        // Ignore duplicate transaction errors (transaction already in mempool)
        if (error?.message?.includes('already exists in the mempool')) {
          console.log(`⚠️ ${bot.name}: Transaction already pending in mempool`)
        } else {
          console.error(`❌ ${bot.name}: BET FAILED`, error)
        }
      }
    }

    setBotBets(newBotBets)
    // Notify round manager about bot bets
    roundManager.setBotBets(newBotBets)
    setBotsBetting(false)
  }).current

  const handleTimerReset = () => {
    // Clear all swipes when timer resets (new round begins)
    setSwipedMarkets(new Set())
    // Clear all market bets
    setMarketBets({})
    setBotsBetting(false)
    // Generate new bot bets for next round
    generateBotBets()
  }

  // Generate bot bets on mount
  useEffect(() => {
    generateBotBets()
  }, [])

  // Calculate pool and multiplier for a specific market
  const calculateMarketStats = (marketName: string) => {
    const activeBet = marketBets[marketName]

    if (!activeBet) {
      return { totalPool: 0, userMultiplier: 1 }
    }

    const userBetAmount = parseFloat(activeBet.amount)
    const botTotalUp = botBets.filter(b => b.direction === 'up').reduce((sum, b) => sum + b.amount, 0)
    const botTotalDown = botBets.filter(b => b.direction === 'down').reduce((sum, b) => sum + b.amount, 0)

    const userOnUp = activeBet.direction === 'up'
    const totalUp = (userOnUp ? userBetAmount : 0) + botTotalUp
    const totalDown = (!userOnUp ? userBetAmount : 0) + botTotalDown
    const totalPool = totalUp + totalDown

    if (totalUp === 0 || totalDown === 0) {
      return { totalPool, userMultiplier: 1 }
    }

    const userMultiplier = userOnUp ? totalPool / totalUp : totalPool / totalDown

    return { totalPool, userMultiplier }
  }

  // Log pool status when bets change
  useEffect(() => {
    Object.keys(marketBets).forEach(marketName => {
      const activeBet = marketBets[marketName]
      if (activeBet) {
        const { totalPool, userMultiplier } = calculateMarketStats(marketName)
        const userBetAmount = parseFloat(activeBet.amount)
        const botTotalUp = botBets.filter(b => b.direction === 'up').reduce((sum, b) => sum + b.amount, 0)
        const botTotalDown = botBets.filter(b => b.direction === 'down').reduce((sum, b) => sum + b.amount, 0)
        const userOnUp = activeBet.direction === 'up'
        const totalUp = (userOnUp ? userBetAmount : 0) + botTotalUp
        const totalDown = (!userOnUp ? userBetAmount : 0) + botTotalDown

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`📊 ${marketName} POOL STATUS`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`   UP Pool: ${totalUp.toFixed(2)} STRK 📈`)
        console.log(`   DOWN Pool: ${totalDown.toFixed(2)} STRK 📉`)
        console.log(`   Total Prize Pool: ${totalPool.toFixed(2)} STRK`)
        console.log(`   Your bet: ${userBetAmount} STRK on ${activeBet.direction.toUpperCase()}`)
        console.log(`   Your multiplier: ${userMultiplier.toFixed(2)}x`)
        console.log(`   Potential payout: ${(userMultiplier * userBetAmount).toFixed(4)} STRK`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      }
    })
  }, [marketBets, botBets])

  return (
    <div className="relative h-full w-full">
      {/* Fixed Header - Always on top */}
      <div
        className="absolute z-50 flex items-center justify-between pointer-events-none"
        style={{
          top: 'calc(2rem + env(safe-area-inset-top, 0px))',
          left: '2rem',
          right: '2rem',
        }}
      >
        <div className="pointer-events-auto">
          <img
            src="/bobasoda-logo.png"
            alt="BobaSoda"
            className="h-10 sm:h-12 w-auto"
          />
        </div>
        <div className="flex gap-2 sm:gap-3 pointer-events-auto">
          <button className="p-1.5 sm:p-2 hover:bg-yellow-500 rounded-full transition">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-black opacity-75" />
          </button>
          <button className="p-1.5 sm:p-2 hover:bg-yellow-500 rounded-full transition">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-black opacity-75" />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'y mandatory',
          scrollSnapStop: 'always',
        }}
      >
        {markets.map((market) => {
          const { totalPool, userMultiplier } = calculateMarketStats(market)
          return (
            <div
              key={market}
              className="h-full w-full snap-start snap-always flex-shrink-0"
              style={{
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
              }}
            >
              <MarketCard
                marketName={market}
                onSwipeComplete={handleSwipeComplete}
                hasSwipedThisRound={swipedMarkets.has(market)}
                onTimerReset={handleTimerReset}
                activeBet={marketBets[market]}
                onBetSettlement={handleBetSettlement}
                totalPool={totalPool}
                userMultiplier={userMultiplier}
              />
            </div>
          )
        })}
      </div>

      {/* Desktop Navigation Arrows */}
      {!isMobile && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={() => scrollToMarket(currentIndex - 1)}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-30 p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition"
              style={{ top: '-60px' }}
            >
              <ChevronUp className="w-6 h-6 text-gray-800" />
            </button>
          )}

          {currentIndex < markets.length - 1 && (
            <button
              onClick={() => scrollToMarket(currentIndex + 1)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition"
              style={{ bottom: '-60px' }}
            >
              <ChevronDown className="w-6 h-6 text-gray-800" />
            </button>
          )}
        </>
      )}

      {/* Bet Amount Modal */}
      {betPrompt && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-yellow-400 rounded-2xl p-6 mx-4 w-full max-w-sm border-2 border-yellow-500 shadow-xl">
            <h3 className="text-black font-bold text-2xl mb-4 text-center">
              Enter Bet Amount
            </h3>

            <div className="mb-4">
              <p className="text-black text-sm mb-2 opacity-75">
                {betPrompt.marketName} - {betPrompt.direction === "up" ? "UP ↑" : "DOWN ↓"}
              </p>
              <div className="flex items-center gap-2 bg-white rounded-xl p-3">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="flex-1 bg-transparent text-black text-2xl font-bold outline-none"
                  placeholder="10"
                  min="0"
                  step="0.01"
                  autoFocus
                />
                <span className="text-black font-bold text-xl">STRK</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelBet}
                className="flex-1 bg-white text-black px-6 py-3 rounded-xl font-bold text-lg hover:bg-gray-100 transition border-2 border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBet}
                className="flex-1 bg-black text-yellow-400 px-6 py-3 rounded-xl font-bold text-lg hover:bg-gray-800 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
