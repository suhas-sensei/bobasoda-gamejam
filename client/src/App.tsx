import { BrowserRouter, Routes, Route } from 'react-router-dom'
import StarknetProvider from './dojo/starknet-provider'
import Providers from './components/providers'
import Markets from './components/markets'
import ProfilePage from './components/profile-page'
import BottomNav from './components/bottom-nav'
import BetHistoryList from './components/bet-history-list'
import { useViewportHeight } from './hooks/useViewportHeight'
import './globals.css'

// Page wrapper component matching original Frontend
function PageWrapper({ children }: { children: React.ReactNode }) {
  const viewportHeight = useViewportHeight()

  return (
    <main
      className="w-screen overflow-hidden"
      style={{
        height: viewportHeight ? `${viewportHeight}px` : '100vh',
        backgroundColor: '#27262c',
      }}
    >
      <div
        className="w-full max-w-md md:max-w-xl mx-auto relative"
        style={{
          height: '100%',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {children}
      </div>
    </main>
  )
}

// History page - Real bet history
function History() {
  return (
    <PageWrapper>
      <div className="relative h-full w-full">
        <BetHistoryList />
        <BottomNav />
      </div>
    </PageWrapper>
  )
}

// AI page - matching Frontend exactly
function AI() {
  return (
    <PageWrapper>
      <div className="relative h-full w-full">
        <div className="h-full w-full flex flex-col items-center justify-center p-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-yellow-400 mb-4">
            AI Assistant
          </h1>
          <p className="text-yellow-400 opacity-75 text-lg text-center">
            Coming soon...
          </p>
        </div>
        <BottomNav />
      </div>
    </PageWrapper>
  )
}

function App() {
  return (
    <StarknetProvider>
      <Providers>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PageWrapper><ProfilePage /></PageWrapper>} />
            <Route path="/markets" element={<PageWrapper><Markets /></PageWrapper>} />
            <Route path="/profile" element={<PageWrapper><ProfilePage /></PageWrapper>} />
            <Route path="/history" element={<History />} />
            <Route path="/ai" element={<AI />} />
          </Routes>
        </BrowserRouter>
      </Providers>
    </StarknetProvider>
  )
}

export default App
