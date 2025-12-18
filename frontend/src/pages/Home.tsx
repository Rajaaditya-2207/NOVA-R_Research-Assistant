import React from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Zap } from 'lucide-react'

const Home: React.FC = () => {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative text-center py-20 sm:py-32 lg:py-40 px-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat [mask-image:linear-gradient(to_bottom,white_20%,transparent_100%)] dark:[mask-image:linear-gradient(to_bottom,white_10%,transparent_100%)]"></div>
        <div className="relative max-w-4xl mx-auto">
          <img 
            src="/nova-avatar.png" 
            alt="NOVA-R" 
            className="inline-block w-16 h-16 rounded-2xl shadow-xl mb-6 object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className = 'inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl text-white font-bold text-2xl shadow-xl mb-6';
              fallback.textContent = 'N';
              e.currentTarget.parentElement?.appendChild(fallback);
            }}
          />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            NOVA‑R
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Your intelligent AI research assistant. Ask questions, upload documents, and get comprehensive answers powered by advanced AI technology.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <MessageCircle className="w-5 h-5" />
              Get Started
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Zap className="w-5 h-5" />
              Explore Features
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home