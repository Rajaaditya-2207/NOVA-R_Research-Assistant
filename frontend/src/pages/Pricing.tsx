import React from 'react'

const Pricing: React.FC = () => {
  const tiers = [
    {
      name: 'Hobby',
      price: '$0',
      description: 'For personal use and exploration.',
      features: [
        'Basic AI model access',
        'Up to 3 document uploads',
        'Community support',
      ],
      cta: 'Start for Free',
      primary: false,
    },
    {
      name: 'Pro',
      price: '$10',
      description: 'For power users and researchers.',
      features: [
        'Advanced AI model access',
        'Up to 10 document uploads',
        'Priority email support',
        'Early access to new features',
      ],
      cta: 'Get Started',
      primary: true,
    },
    {
      name: 'Enterprise',
      price: 'Contact Us',
      description: 'For teams and organizations.',
      features: [
        'Custom AI models',
        'Unlimited document uploads',
        'Dedicated support & SLA',
        'On-premise deployment option',
      ],
      cta: 'Contact Sales',
      primary: false,
    },
  ]

  return (
    <section id="pricing" className="py-20 sm:py-32 bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Flexible Pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose a plan that fits your needs.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-8 border ${
                tier.primary
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-2xl'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg'
              }`}
            >
              <h3 className={`text-2xl font-semibold ${tier.primary ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {tier.name}
              </h3>
              <p className={`mt-4 text-4xl font-bold ${tier.primary ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {tier.price}
                {tier.name !== 'Enterprise' && <span className="text-base font-medium">/ month</span>}
              </p>
              <p className={`mt-2 ${tier.primary ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                {tier.description}
              </p>
              <ul className="mt-8 space-y-4">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 ${tier.primary ? 'text-white' : 'text-blue-500'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`w-full mt-10 py-3 px-6 rounded-lg font-semibold transition-transform duration-200 ${
                  tier.primary
                    ? 'bg-white text-blue-600 hover:bg-gray-100'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Pricing
