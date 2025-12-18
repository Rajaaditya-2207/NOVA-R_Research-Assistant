import React from 'react'
import { FileText, Brain, Users, Shield, Smartphone, Zap } from 'lucide-react'

const features = [
  {
    icon: <Brain className="w-8 h-8 text-blue-500" />,
    title: "AI-Powered Conversations",
    description: "Chat with advanced NVIDIA AI models that understand context and provide detailed, helpful responses."
  },
  {
    icon: <FileText className="w-8 h-8 text-blue-500" />,
    title: "Document Intelligence",
    description: "Upload up to 5 documents per session and ask questions based on your content using RAG technology."
  },
  {
    icon: <Users className="w-8 h-8 text-blue-500" />,
    title: "Session Memory",
    description: "Maintains conversation context throughout your session for more coherent and relevant interactions."
  },
  {
    icon: <Zap className="w-8 h-8 text-blue-500" />,
    title: "Adaptive Interface",
    description: "Beautiful light and dark themes that adapt to your preferences with smooth transitions."
  },
  {
    icon: <Shield className="w-8 h-8 text-blue-500" />,
    title: "Privacy First",
    description: "Temporary sessions with no permanent data storage. Your conversations remain private and secure."
  },
  {
    icon: <Smartphone className="w-8 h-8 text-blue-500" />,
    title: "Responsive Design",
    description: "Works seamlessly across all devices - desktop, tablet, and mobile with optimized user experience."
  }
]

const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Powerful Features
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover what makes NOVA-R the perfect AI research companion
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group hover:-translate-y-2"
            >
              <div className="mb-6">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-xl mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
