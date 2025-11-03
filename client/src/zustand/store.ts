import { create } from 'zustand'

export enum GamePhase {
  LOBBY = 'LOBBY',
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZED = 'INITIALIZED',
  PLAYING = 'PLAYING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  GAME_OVER = 'GAME_OVER'
}

interface AppState {
  gamePhase: GamePhase
  setGamePhase: (phase: GamePhase) => void
  setError: (error: string | null) => void
  setActionInProgress: (inProgress: boolean) => void
  setLastTransaction: (txHash: string | null) => void
  setLoading: (loading: boolean) => void
  actionInProgress: boolean
  player: any
  canMove: () => boolean
  position: any
  updatePosition: (position: any) => void
  raceStarted: boolean
  isPlayerInitialized: boolean
  currentRoom: any
  setNearbyDoors: (doors: any[]) => void
  canTakeActions: () => boolean
  canAttack: () => boolean
  getEntitiesInCurrentRoom: () => any[]
  getEntityById: (id: string) => any
  getShardsInCurrentRoom: () => any[]
  gameSession: any
  endGame: () => void
  playerStats: any
  gameConfig: any
  gameStats: any
  setPlayer: (player: any) => void
  setPlayerStats: (stats: any) => void
  setGameSession: (session: any) => void
  setGameConfig: (config: any) => void
  setCurrentRoom: (room: any) => void
  setRooms: (rooms: any[]) => void
  setEntities: (entities: any[]) => void
  setShardLocations: (locations: any[]) => void
  resetGame: () => void
}

const useAppStore = create<AppState>((set) => ({
  gamePhase: GamePhase.LOBBY,
  setGamePhase: (phase: GamePhase) => set({ gamePhase: phase }),
  setError: () => {},
  setActionInProgress: () => {},
  setLastTransaction: () => {},
  setLoading: () => {},
  actionInProgress: false,
  player: null,
  canMove: () => false,
  position: null,
  updatePosition: () => {},
  raceStarted: false,
  isPlayerInitialized: false,
  currentRoom: null,
  setNearbyDoors: () => {},
  canTakeActions: () => false,
  canAttack: () => false,
  getEntitiesInCurrentRoom: () => [],
  getEntityById: () => null,
  getShardsInCurrentRoom: () => [],
  gameSession: null,
  endGame: () => {},
  playerStats: null,
  gameConfig: null,
  gameStats: null,
  setPlayer: () => {},
  setPlayerStats: () => {},
  setGameSession: () => {},
  setGameConfig: () => {},
  setCurrentRoom: () => {},
  setRooms: () => {},
  setEntities: () => {},
  setShardLocations: () => {},
  resetGame: () => {},
}))

export default useAppStore
