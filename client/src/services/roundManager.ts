import { Account, AccountInterface, RpcProvider, CallData, Signer } from "starknet"
import { addBetToHistory } from "../utils/betHistory"

const HOUSE_WALLET = {
  address: '0x055a3cdffef57ab679a15d9e9cfe25e7156bbb4efdb0e23af484f1f3c779579e',
  privateKey: '0x0377dab5abf8685527c990d3137b37c0670983cf660a300ef4db5ef5daecc8f8'
}

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

const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
const ROUND_DURATION = 60000 // 60 seconds

interface ActiveBet {
  amount: string
  direction: "up" | "down"
  marketName: string
}

interface BotBet {
  amount: number
  direction: "up" | "down"
}

interface MarketPrices {
  ETH: number | null
  BNB: number | null
  STRK: number | null
}

class RoundManager {
  private static instance: RoundManager
  private marketBets: Record<string, ActiveBet | null> = {}
  private botBets: BotBet[] = []
  private lockPrices: Record<string, number | null> = { ETH: null, BNB: null, STRK: null }
  private hasSettled: Record<string, boolean> = { ETH: false, BNB: false, STRK: false }
  private currentPrices: MarketPrices = { ETH: null, BNB: null, STRK: null }
  private userAccount: AccountInterface | null = null
  private timerInterval: NodeJS.Timeout | null = null
  private priceInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.startTimer()
  }

  public static getInstance(): RoundManager {
    if (!RoundManager.instance) {
      RoundManager.instance = new RoundManager()
    }
    return RoundManager.instance
  }

  public setUserAccount(account: AccountInterface | null) {
    this.userAccount = account
  }

  public setBet(marketName: string, bet: ActiveBet | null) {
    this.marketBets[marketName] = bet
    console.log(`🎯 Round Manager: Bet set for ${marketName}:`, bet)
  }

  public setBotBets(bets: BotBet[]) {
    this.botBets = bets
  }

  public updatePrice(marketName: string, price: number | null) {
    this.currentPrices[marketName as keyof MarketPrices] = price
  }

  private async fetchAllPrices() {
    try {
      // Fetch ETH price
      const ethResponse = await fetch('https://hermes.pyth.network/v2/updates/price/latest?ids[]=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace')
      const ethData = await ethResponse.json()
      const ethPrice = parseFloat(ethData.parsed[0].price.price) * Math.pow(10, ethData.parsed[0].price.expo)
      this.currentPrices.ETH = ethPrice

      // Fetch BNB price
      const bnbResponse = await fetch('https://hermes.pyth.network/v2/updates/price/latest?ids[]=0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f')
      const bnbData = await bnbResponse.json()
      const bnbPrice = parseFloat(bnbData.parsed[0].price.price) * Math.pow(10, bnbData.parsed[0].price.expo)
      this.currentPrices.BNB = bnbPrice

      // Fetch STRK price
      const strkResponse = await fetch('https://hermes.pyth.network/v2/updates/price/latest?ids[]=0x6a182399ff70ccf3e06024898942028204125a819e519a335ffa4579e66cd870')
      const strkData = await strkResponse.json()
      const strkPrice = parseFloat(strkData.parsed[0].price.price) * Math.pow(10, strkData.parsed[0].price.expo)
      this.currentPrices.STRK = strkPrice
    } catch (error) {
      console.error('❌ Round Manager: Failed to fetch prices:', error)
    }
  }

  private startTimer() {
    console.log('🎮 Round Manager: Starting global timer')

    // Fetch prices immediately and then every 2 seconds
    this.fetchAllPrices()
    this.priceInterval = setInterval(() => {
      this.fetchAllPrices()
    }, 2000)

    this.timerInterval = setInterval(() => {
      const stored = localStorage.getItem('global_round_start')
      if (!stored) return

      const timerStart = parseInt(stored, 10)
      const elapsed = Date.now() - timerStart
      const progress = Math.min((elapsed / ROUND_DURATION) * 100, 100)

      // Lock prices at 50% (30 seconds)
      if (progress >= 50 && progress < 100) {
        Object.keys(this.currentPrices).forEach((market) => {
          if (this.lockPrices[market] === null && this.currentPrices[market as keyof MarketPrices] !== null) {
            this.lockPrices[market] = this.currentPrices[market as keyof MarketPrices]
            console.log(`\n🔒 Round Manager: Lock price for ${market}/USD: $${this.lockPrices[market]?.toFixed(5)}`)
          }
        })
      }

      // Settle bets at 100% (60 seconds)
      if (progress >= 100) {
        const marketsToSettle = Object.keys(this.marketBets).filter(
          market => !this.hasSettled[market] && this.marketBets[market]
        )

        if (marketsToSettle.length > 0) {
          console.log(`\n🎯 Round Manager: Settling ${marketsToSettle.length} market(s): ${marketsToSettle.join(', ')}`)
          marketsToSettle.forEach((market) => {
            console.log(`   -> Starting settlement for ${market}`)
            this.hasSettled[market] = true
            this.settleBet(market)
          })
        }

        // Reset for next round after settlement
        if (elapsed >= ROUND_DURATION + 2000) { // Give 2 second buffer for all settlements
          console.log('🔄 Round Manager: Resetting for next round')
          this.lockPrices = { ETH: null, BNB: null, STRK: null }
          this.hasSettled = { ETH: false, BNB: false, STRK: false }
          this.marketBets = {}
          this.botBets = []
        }
      }
    }, 100) // Check every 100ms
  }

  private async settleBet(marketName: string) {
    const activeBet = this.marketBets[marketName]
    if (!activeBet || !this.userAccount) {
      console.log(`⚠️ Round Manager: No active bet or account for ${marketName}`)
      return
    }

    const lockPrice = this.lockPrices[marketName]
    const closePrice = this.currentPrices[marketName as keyof MarketPrices]

    if (lockPrice === null || closePrice === null) {
      console.log(`⚠️ Round Manager: Missing prices for ${marketName}`)
      return
    }

    const diff = closePrice - lockPrice
    const winningDirection = diff > 0 ? 'up' : 'down'

    const userBetAmount = parseFloat(activeBet.amount)
    const userWon = activeBet.direction === winningDirection

    // Calculate pools
    const botTotalUp = this.botBets.filter(b => b.direction === 'up').reduce((sum, b) => sum + b.amount, 0)
    const botTotalDown = this.botBets.filter(b => b.direction === 'down').reduce((sum, b) => sum + b.amount, 0)

    const userOnUp = activeBet.direction === 'up'
    const totalUp = (userOnUp ? userBetAmount : 0) + botTotalUp
    const totalDown = (!userOnUp ? userBetAmount : 0) + botTotalDown
    const totalPool = totalUp + totalDown

    const winningPool = winningDirection === 'up' ? totalUp : totalDown

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`🏁 Round Manager: ${marketName}/USD ROUND ENDED`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`   Lock Price: $${lockPrice.toFixed(5)}`)
    console.log(`   Close Price: $${closePrice.toFixed(5)}`)
    console.log(`   Price Change: ${diff > 0 ? '+' : ''}${diff.toFixed(5)} (${((diff/lockPrice) * 100).toFixed(2)}%)`)
    console.log(`   Winner: ${winningDirection.toUpperCase()} ${winningDirection === 'up' ? '📈' : '📉'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Process payout
    try {
      const provider = new RpcProvider({ nodeUrl: 'https://api.cartridge.gg/x/starknet/sepolia' })
      const houseSigner = new Signer(HOUSE_WALLET.privateKey)
      const houseAccount = new Account({
        provider,
        address: HOUSE_WALLET.address,
        signer: houseSigner
      })

      let currentNonce = await houseAccount.getNonce()
      console.log(`🔧 House account starting nonce: ${currentNonce}\n`)

      // Add delay based on market to avoid nonce collisions
      const marketDelays: Record<string, number> = { 'ETH': 0, 'BNB': 500, 'STRK': 1000 }
      const delay = marketDelays[marketName] || 0
      if (delay > 0) {
        console.log(`⏱️ Waiting ${delay}ms to avoid nonce collision...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        currentNonce = await houseAccount.getNonce()
        console.log(`🔧 Updated nonce after delay: ${currentNonce}\n`)
      }

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

        const transferCalldata = CallData.compile({
          recipient: this.userAccount.address,
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
        console.log(`   TX Hash: ${result.transaction_hash}\n`)

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
        console.log('💾 Round Manager: Saving win to history:', historyEntry)
        addBetToHistory(historyEntry)
      } else {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('😢 YOU LOST')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`   Your Bet: ${userBetAmount} STRK`)
        console.log(`   You bet ${activeBet.direction.toUpperCase()} but price went ${winningDirection.toUpperCase()}`)
        console.log(`   Loss: -${userBetAmount} STRK 📉`)
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
        console.log('💾 Round Manager: Saving loss to history:', historyEntry)
        addBetToHistory(historyEntry)
      }

      // Pay bots (simplified - not including full logic here)
      console.log('🤖 BOT PAYOUTS')
      for (let i = 0; i < this.botBets.length; i++) {
        const botBet = this.botBets[i]
        const bot = BOT_WALLETS[i]

        if (botBet.direction === winningDirection) {
          const botWinnings = (botBet.amount / winningPool) * totalPool
          const amountInWei = BigInt(Math.floor(botWinnings * 1e18))

          console.log(`   ${bot.name}: WON ${botWinnings.toFixed(4)} STRK`)

          const transferCalldata = CallData.compile({
            recipient: bot.address,
            amount: {
              low: amountInWei.toString(),
              high: '0'
            }
          })

          currentNonce = "0x" + (BigInt(currentNonce) + 1n).toString(16)

          await houseAccount.execute(
            {
              contractAddress: STRK_ADDRESS,
              entrypoint: 'transfer',
              calldata: transferCalldata
            },
            { nonce: currentNonce }
          )
        }
      }
    } catch (error) {
      console.error(`\n❌ Round Manager: Settlement failed for ${marketName}:`, error)
    }
  }

  public cleanup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }
    if (this.priceInterval) {
      clearInterval(this.priceInterval)
    }
  }
}

export const roundManager = RoundManager.getInstance()
