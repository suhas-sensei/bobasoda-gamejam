import { ArrowUp, ArrowDown } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useEthPrice } from "../hooks/useEthPrice"
import { useBnbPrice } from "../hooks/useBnbPrice"
import { useStrkPrice } from "../hooks/useStrkPrice"
import EthPriceChart from "./eth-price-chart"
import BnbPriceChart from "./bnb-price-chart"
import StrkPriceChart from "./strk-price-chart"
import { useDojoContext } from "../dojo/useDojoContext"
import { roundManager } from "../services/roundManager"

interface ActiveBet {
  amount: string
  direction: "up" | "down"
  marketName: string
}

interface MarketCardProps {
  marketName: string
  onSwipeComplete: (direction: "up" | "down", marketName: string) => void
  hasSwipedThisRound: boolean
  onTimerReset: () => void
  activeBet: ActiveBet | null
  onBetSettlement: (marketName: string, lockPrice: number, closePrice: number) => void
  totalPool: number
  userMultiplier: number
}

export default function MarketCard({ marketName, onSwipeComplete, hasSwipedThisRound, onTimerReset, activeBet, onBetSettlement, totalPool, userMultiplier }: MarketCardProps) {
  // Fetch price based on market type
  const { price: ethPrice, isLoading: isEthLoading } = marketName === "ETH" ? useEthPrice() : { price: null, isLoading: false }
  const { price: bnbPrice, isLoading: isBnbLoading } = marketName === "BNB" ? useBnbPrice() : { price: null, isLoading: false }
  const { price: strkPrice, isLoading: isStrkLoading } = marketName === "STRK" ? useStrkPrice() : { price: null, isLoading: false }

  // Use appropriate price and loading state
  const currentPrice = marketName === "ETH" ? ethPrice : marketName === "BNB" ? bnbPrice : strkPrice
  const isPriceLoading = marketName === "ETH" ? isEthLoading : marketName === "BNB" ? isBnbLoading : isStrkLoading

  // Get Dojo contract actions
  const { actions, account } = useDojoContext()
  // Hardcoded round configuration (60 second rounds)
  const intervalSeconds = 30 // 30 seconds per phase (betting + lock)
  const bufferSeconds = 0 // No buffer
  const [currentCardId, setCurrentCardId] = useState(1)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [isMagnetized, setIsMagnetized] = useState(false)
  const [timerProgress, setTimerProgress] = useState(0)
  const [lockPrice, setLockPrice] = useState<number | null>(null)
  const [hasLockedPrice, setHasLockedPrice] = useState(false)
  const [hasCalledStartGame, setHasCalledStartGame] = useState(false)
  const [hasCalledEndGame, setHasCalledEndGame] = useState(false)
  const dragStartX = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)

  // Initialize timer from localStorage to persist across tab changes
  const getInitialTimerStart = () => {
    const stored = localStorage.getItem('global_round_start')
    if (stored) {
      return parseInt(stored, 10)
    }
    const now = Date.now()
    localStorage.setItem('global_round_start', now.toString())
    return now
  }

  const timerStartRef = useRef<number>(getInitialTimerStart())

  // Initialize states on mount based on current progress (in case returning mid-round)
  useEffect(() => {
    const ROUND_DURATION = (intervalSeconds * 2) * 1000
    const currentElapsed = Date.now() - timerStartRef.current
    const currentProgress = Math.min((currentElapsed / ROUND_DURATION) * 100, 100)

    if (currentElapsed >= 1000) {
      setHasCalledStartGame(true)
    }
    if (currentProgress >= 50) {
      setHasLockedPrice(true)
      if (currentPrice !== null) {
        setLockPrice(currentPrice)
      }
    }
    if (currentElapsed >= 59000) {
      setHasCalledEndGame(true)
    }
  }, []) // Only run once on mount

  useEffect(() => {
    // 60 second rounds (30s betting + 30s lock)
    const ROUND_DURATION = (intervalSeconds * 2) * 1000 // Convert to milliseconds

    const updateTimer = () => {
      const elapsed = Date.now() - timerStartRef.current
      const progress = Math.min((elapsed / ROUND_DURATION) * 100, 100)
      setTimerProgress(progress)

      // Call start_game at 1 second
      if (elapsed >= 1000 && !hasCalledStartGame && actions && account) {
        setHasCalledStartGame(true)
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🎮 NEW ROUND STARTED')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`   Duration: 60 seconds`)
        console.log(`   Betting Phase: 0-30s`)
        console.log(`   Lock Phase: 30-60s`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        actions.startGame(account)
          .then(() => {
            console.log('✅ start_game called successfully!\n')
          })
          .catch((error) => {
            console.error('❌ Failed to call start_game:', error)
          })
      }

      // Capture lock price at 50% (30s mark) - this is what determines winners
      if (progress >= 50 && !hasLockedPrice && currentPrice !== null) {
        setLockPrice(currentPrice)
        setHasLockedPrice(true)
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🔒 LOCK PRICE CAPTURED')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`   ${marketName}/USD Lock Price: $${currentPrice.toFixed(5)}`)
        console.log(`   Time: 30 seconds (50% progress)`)
        console.log(`   🚫 Betting is now CLOSED`)
        console.log(`   ⏳ Waiting for close price at 60s...`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      }

      // Call end_game at 59 seconds
      if (elapsed >= 59000 && !hasCalledEndGame && actions && account) {
        setHasCalledEndGame(true)
        console.log('🏁 Calling end_game at 59 seconds...')
        actions.endGame(account)
          .then(() => {
            console.log('✅ end_game called successfully!\n')
          })
          .catch((error) => {
            console.error('❌ Failed to call end_game:', error)
          })
      }

      // Reset for next round at 100%
      if (progress >= 100) {
        // Settlement is now handled by the global round manager
        // which works even when this component is unmounted (user on different tab)
        // if (lockPrice !== null && currentPrice !== null) {
        //   if (activeBet) {
        //     onBetSettlement(marketName, lockPrice, currentPrice)
        //   }
        // }
        // Reset for next round
        const newStartTime = Date.now()
        timerStartRef.current = newStartTime
        localStorage.setItem('global_round_start', newStartTime.toString())
        setHasLockedPrice(false)
        setHasCalledStartGame(false)
        setHasCalledEndGame(false)
        onTimerReset() // Clear swipe tracking for new round
      }
    }

    const interval = setInterval(updateTimer, 50) // Update every 50ms for smooth animation

    return () => clearInterval(interval)
  }, [onTimerReset, intervalSeconds, bufferSeconds, currentPrice, marketName, hasLockedPrice, lockPrice, hasCalledStartGame, hasCalledEndGame, actions, account, activeBet, onBetSettlement])

  // Send price updates to round manager (runs even when component unmounts/remounts)
  useEffect(() => {
    roundManager.updatePrice(marketName, currentPrice)
  }, [currentPrice, marketName])

  useEffect(() => {
    // Initialize audio on client side with mobile-friendly settings and volume boost
    if (typeof window !== 'undefined') {
      const audio = new Audio('/sounds/game-start.mp3')
      audio.preload = 'auto'
      audio.volume = 1.0 // Max browser volume
      audio.load()
      audioRef.current = audio

      // Create Web Audio API context for volume amplification
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContext) {
        const audioContext = new AudioContext()
        const gainNode = audioContext.createGain()
        gainNode.gain.value = 2.0 // 200% volume boost

        const source = audioContext.createMediaElementSource(audio)
        source.connect(gainNode)
        gainNode.connect(audioContext.destination)

        audioContextRef.current = audioContext
        gainNodeRef.current = gainNode
        sourceNodeRef.current = source
      }

      // Unlock audio on first touch/click for iOS
      const unlockAudio = () => {
        if (audioRef.current) {
          audioRef.current.play().then(() => {
            audioRef.current?.pause()
            audioRef.current!.currentTime = 0
          }).catch(() => {})
        }
        // Resume audio context on iOS
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume()
        }
        document.removeEventListener('touchstart', unlockAudio)
        document.removeEventListener('click', unlockAudio)
      }

      document.addEventListener('touchstart', unlockAudio, { once: true })
      document.addEventListener('click', unlockAudio, { once: true })
    }
  }, [])

  const cards = [currentCardId, currentCardId + 1, currentCardId + 2]

  const handleDragStart = (clientX: number) => {
    if (isSwipeBlocked) return
    setIsDragging(true)
    setIsMagnetized(false)
    dragStartX.current = clientX
  }

  const handleDragMove = (clientX: number) => {
    if (!isDragging || isMagnetized || isSwipeBlocked) return
    const rawOffset = clientX - dragStartX.current
    const dragCoefficient = 0.5
    const offset = rawOffset * dragCoefficient
    const iconFullyVisibleThreshold = 80

    if (Math.abs(offset) >= iconFullyVisibleThreshold) {
      setIsMagnetized(true)
      setIsDragging(false)
      const direction = offset > 0 ? 1 : -1
      setDragOffset(direction * 500)
      setRotation(direction * 12)

      // Play sound on swipe
      if (audioRef.current) {
        // Resume audio context if suspended (iOS requirement)
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume()
        }

        audioRef.current.currentTime = 0
        const playPromise = audioRef.current.play()

        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.log('Audio play failed:', err)
            // Retry once on mobile
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.play().catch(() => {})
              }
            }, 100)
          })
        }
      }

      setTimeout(() => {
        setCurrentCardId(prev => prev + 1)
        setDragOffset(0)
        setRotation(0)
        setIsMagnetized(false)
        // Trigger commit popup
        onSwipeComplete(direction > 0 ? "up" : "down", marketName)
      }, 400)
    } else {
      setDragOffset(offset)
      setRotation(offset / 20)
    }
  }

  const handleDragEnd = () => {
    if (isMagnetized) return
    setIsDragging(false)
    setDragOffset(0)
    setRotation(0)
  }

  const iconOpacity = Math.min(Math.abs(dragOffset) / 80, 0.6)
  const iconScale = Math.min(Math.abs(dragOffset) / 80, 1)

  // Calculate lock threshold: 30 seconds for 60s round (50% = when lock price is captured)
  const lockThresholdPercent = 50

  // Block swiping when in lock phase OR if already swiped this round
  const isSwipeBlocked = timerProgress >= lockThresholdPercent || hasSwipedThisRound

  // Show "Round Locked" popup during lock phase only (50%-100%)
  const showLockedPopup = timerProgress >= lockThresholdPercent && timerProgress < 100

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      {/* Round Locked Popup - Shows during lock phase only (30s-60s) */}
      {showLockedPopup && (
        <div className="absolute inset-0 z-[20] flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-2xl px-8 py-6 mx-4 border-2 border-yellow-400">
            <p className="text-yellow-400 font-bold text-2xl sm:text-3xl text-center">
              🔒 ROUND LOCKED
            </p>
            <p className="text-white text-base sm:text-lg text-center mt-2 opacity-90">
              No more bets accepted
            </p>
          </div>
        </div>
      )}

      {/* Already Swiped Warning - Shows when user already swiped this round */}
      {hasSwipedThisRound && !showLockedPopup && (
        <div className="absolute inset-0 z-[20] flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-2xl px-6 py-4 mx-4">
            <p className="text-yellow-400 font-bold text-lg sm:text-xl text-center">
              Already Swiped
            </p>
            <p className="text-white text-sm sm:text-base text-center mt-1 opacity-90">
              One swipe per round
            </p>
          </div>
        </div>
      )}
      {/* Swipe Feedback Icons */}
      {dragOffset > 0 && (
        <div
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-[15]"
          style={{
            opacity: iconOpacity,
            transform: `translateY(-50%) scale(${iconScale})`,
            transition: isMagnetized ? 'all 0.4s ease-out' : 'none',
          }}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <ArrowUp className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={3} />
          </div>
        </div>
      )}

      {dragOffset < 0 && (
        <div
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-[15]"
          style={{
            opacity: iconOpacity,
            transform: `translateY(-50%) scale(${iconScale})`,
            transition: isMagnetized ? 'all 0.4s ease-out' : 'none',
          }}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
            <ArrowDown className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={3} />
          </div>
        </div>
      )}

      {/* Card Stack */}
      {cards.reverse().map((cardId, reverseIndex) => {
        const index = cards.length - 1 - reverseIndex
        const isTopCard = index === 0
        const opacity = 1 - (index * 0.15)

        return (
          <div
            key={cardId}
            className="absolute inset-4 sm:inset-6 bg-yellow-400 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col border border-yellow-500 select-none"
            style={{
              transform: isTopCard
                ? `translateX(${dragOffset}px) rotate(${rotation}deg)`
                : 'none',
              transition: isTopCard && (isDragging && !isMagnetized)
                ? 'none'
                : isTopCard && isMagnetized
                ? 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                : 'all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)',
              zIndex: 10 - index,
              opacity: opacity,
              cursor: isTopCard ? (isSwipeBlocked ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab')) : 'default',
            }}
            onMouseDown={isTopCard ? (e) => handleDragStart(e.clientX) : undefined}
            onMouseMove={isTopCard ? (e) => handleDragMove(e.clientX) : undefined}
            onMouseUp={isTopCard ? handleDragEnd : undefined}
            onMouseLeave={isTopCard ? handleDragEnd : undefined}
            onTouchStart={isTopCard ? (e) => handleDragStart(e.touches[0].clientX) : undefined}
            onTouchMove={isTopCard ? (e) => handleDragMove(e.touches[0].clientX) : undefined}
            onTouchEnd={isTopCard ? handleDragEnd : undefined}
          >
        {/* Header Spacer */}
        <div
          className="mb-4 sm:mb-6"
          style={{
            height: 'calc(3rem + env(safe-area-inset-top, 0px))',
          }}
        />

        {/* Wallet Value */}
        <div className="mb-4 sm:mb-6">
          <p className="text-black opacity-90 mb-1 sm:mb-2 text-3xl sm:text-4xl md:text-5xl">{marketName}/USD</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black">
            {isPriceLoading ? (
              <span className="opacity-50">Loading...</span>
            ) : currentPrice !== null ? (
              `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 })}`
            ) : (
              <span className="opacity-50">--</span>
            )}
          </h2>
        </div>

        {/* Time Period Selector */}


        {/* Chart Area */}
        <div className="flex-1 mb-4 sm:mb-6 relative">
          {marketName === "ETH" ? (
            <EthPriceChart currentPrice={ethPrice} lockPrice={lockPrice} />
          ) : marketName === "BNB" ? (
            <BnbPriceChart currentPrice={bnbPrice} lockPrice={lockPrice} />
          ) : marketName === "STRK" ? (
            <StrkPriceChart currentPrice={strkPrice} lockPrice={lockPrice} />
          ) : (
            <>
              <div className="absolute inset-0 flex items-end justify-center gap-0.5">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-yellow-500 opacity-60 rounded-t"
                    style={{
                      height: `${Math.sin(i / 10) * 30 + 40}%`,
                    }}
                  />
                ))}
              </div>
              {/* Trend line */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <polyline
                  points={Array.from({ length: 60 })
                    .map((_, i) => `${(i / 59) * 100}% ${100 - (Math.sin(i / 10) * 30 + 40)}%`)
                    .join(" ")}
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.8)"
                  strokeWidth="2"
                />
              </svg>
            </>
          )}
        </div>

        {/* Profit/Loss Info */}
        <div
          className="bg-yellow-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 relative overflow-hidden"
        >
          {/* Timer Overlay - Fills from left to right over 2 minutes */}
          <div
            className="absolute inset-0 bg-black pointer-events-none transition-all duration-75 ease-linear"
            style={{
              width: `${timerProgress}%`,
              opacity: 0.15,
            }}
          />

          <div className="relative z-10">
            <div className="mb-4 sm:mb-5">
              <p className="text-black text-xs sm:text-sm opacity-75 mb-1">NEXT ROUND</p>
              <p className="text-black font-bold text-2xl sm:text-3xl">{totalPool.toFixed(2)} STRK</p>
              <p className="text-black text-xs sm:text-sm opacity-60">PRIZE POOL</p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p className="text-black text-xs sm:text-sm opacity-75 mb-1">Your Stake</p>
                <p className="font-bold text-3xl sm:text-4xl" style={{ color: '#ed4b9e' }}>{activeBet ? activeBet.amount : '0'}</p>
                <p className="text-black text-[10px] sm:text-xs opacity-60">STRK</p>
              </div>
              <div className="text-right">
                <p className="text-black text-xs sm:text-sm opacity-75 mb-1">Multiplier</p>
                <p className="font-bold text-3xl sm:text-4xl" style={{ color: '#2e8656' }}>{userMultiplier.toFixed(2)}x</p>
                <p className="text-black text-[10px] sm:text-xs opacity-60">payout</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transaction */}


        {/* Bottom Navigation Spacer */}
        <div
          style={{
            height: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
          }}
        />
          </div>
        )
      })}
    </div>
  )
}
