export default function Footer({ onContactClick }) {
  return (
    <footer className="hidden sm:block border-t border-gray-100 bg-white mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-gray-400">
        <span>© {new Date().getFullYear()} FindThisForMe</span>
        <button
          onClick={onContactClick}
          className="hover:text-primary-600 transition"
        >
          Contact us
        </button>
      </div>
    </footer>
  )
}
