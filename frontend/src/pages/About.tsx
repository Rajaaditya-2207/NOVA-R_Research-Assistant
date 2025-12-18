import React from 'react'

const About: React.FC = () => {
  return (
    <section id="about" className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              About NOVA-R
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              The story behind your intelligent research assistant.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 sm:p-12 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 space-y-8">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
              NOVA-R was born from a simple idea: to make advanced AI accessible and useful for everyone, from students to professional researchers. We believe that by combining powerful language models with intuitive design, we can create a tool that not only answers questions but also accelerates discovery and learning.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
              Our core technology leverages Retrieval-Augmented Generation (RAG) to provide answers that are not only intelligent but also grounded in the context you provide. Whether you're analyzing research papers, legal documents, or class notes, NOVA-R helps you find the information you need, fast.
            </p>
            <div className="text-center pt-6">
              <h4 className="font-semibold text-xl text-gray-900 dark:text-white mb-4">Our Mission</h4>
              <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                To empower curiosity and streamline research through the power of conversational AI, making knowledge more accessible and insights easier to uncover.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
