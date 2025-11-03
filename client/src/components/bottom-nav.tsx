import { useLocation, useNavigate } from "react-router-dom"

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname

  return (
    <div
      className="absolute inset-x-4 bottom-0 z-50 flex items-center justify-between bg-white rounded-t-3xl py-2 px-2 sm:p-4 px-6 sm:px-8"
      style={{
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <button
        onClick={() => navigate("/profile")}
        className={`p-3 sm:p-4 rounded-full transition ${
          pathname === "/profile" || pathname === "/" ? "bg-yellow-400" : "hover:bg-gray-100"
        }`}
      >
        <img
          src="/icons/user-square.svg"
          alt="Profile"
          className={`w-8 h-8 sm:w-10 sm:h-10 ${
            pathname === "/profile" || pathname === "/" ? "[filter:brightness(0)]" : "[filter:brightness(0)_saturate(100%)_invert(45%)_sepia(0%)_saturate(0%)_hue-rotate(0deg)_brightness(95%)_contrast(92%)]"
          }`}
        />
      </button>
      <button
        onClick={() => navigate("/markets")}
        className={`p-4 sm:p-5 rounded-full transition ${
          pathname === "/markets" ? "bg-yellow-400 text-black" : "hover:bg-gray-100 text-gray-600"
        }`}
      >
        <img
          src="/icons/video-console.svg"
          alt="Markets"
          className={`w-8 h-8 sm:w-10 sm:h-10 ${
            pathname === "/markets" ? "[filter:brightness(0)]" : "[filter:brightness(0)_saturate(100%)_invert(45%)_sepia(0%)_saturate(0%)_hue-rotate(0deg)_brightness(95%)_contrast(92%)]"
          }`}
        />
      </button>
      <button
        onClick={() => navigate("/history")}
        className={`p-3 sm:p-4 rounded-full transition ${
          pathname === "/history" ? "bg-yellow-400" : "hover:bg-gray-100"
        }`}
      >
        <img
          src="/icons/transaction-history.svg"
          alt="History"
          className={`w-8 h-8 sm:w-10 sm:h-10 ${
            pathname === "/history" ? "[filter:brightness(0)]" : "[filter:brightness(0)_saturate(100%)_invert(45%)_sepia(0%)_saturate(0%)_hue-rotate(0deg)_brightness(95%)_contrast(92%)]"
          }`}
        />
      </button>
      <button
        onClick={() => navigate("/ai")}
        className={`p-3 sm:p-4 rounded-full transition ${
          pathname === "/ai" ? "bg-yellow-400" : "hover:bg-gray-100"
        }`}
      >
        <img
          src="/icons/brain-02.svg"
          alt="AI"
          className={`w-8 h-8 sm:w-10 sm:h-10 ${
            pathname === "/ai" ? "[filter:brightness(0)]" : "[filter:brightness(0)_saturate(100%)_invert(45%)_sepia(0%)_saturate(0%)_hue-rotate(0deg)_brightness(95%)_contrast(92%)]"
          }`}
        />
      </button>
    </div>
  )
}
