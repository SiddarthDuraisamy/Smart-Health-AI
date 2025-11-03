'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  HeartIcon, 
  ShieldCheckIcon, 
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  UserGroupIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const features = [
    {
      icon: SparklesIcon,
      title: 'AI Health Assistant',
      description: 'Get personalized health recommendations powered by advanced machine learning models.'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Multilingual Chat',
      description: 'Communicate with our healthcare AI in over 50 languages for better accessibility.'
    },
    {
      icon: ChartBarIcon,
      title: 'Predictive Analytics',
      description: 'Early detection and risk assessment for chronic diseases using AI predictions.'
    },
    {
      icon: UserGroupIcon,
      title: 'Doctor-AI Collaboration',
      description: 'Seamless integration between healthcare professionals and AI assistance.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Blockchain Security',
      description: 'Your health data is secured with blockchain technology and audit trails.'
    },
    {
      icon: HeartIcon,
      title: 'Lifestyle Companion',
      description: 'Real-time health tracking and personalized wellness recommendations.'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <HeartIcon className="h-8 w-8 text-health-primary" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  Smart Health
                </span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-health-primary transition-colors">
                Features
              </Link>
              <Link href="#about" className="text-gray-600 hover:text-health-primary transition-colors">
                About
              </Link>
              <Link href="/auth/login" className="health-button-primary">
                Sign In
              </Link>
              <Link href="/auth/register" className="health-button-secondary">
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 hover:text-gray-900 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="#features" className="block px-3 py-2 text-gray-600 hover:text-health-primary">
                Features
              </Link>
              <Link href="#about" className="block px-3 py-2 text-gray-600 hover:text-health-primary">
                About
              </Link>
              <Link href="/auth/login" className="block px-3 py-2 text-health-primary font-medium">
                Sign In
              </Link>
              <Link href="/auth/register" className="block px-3 py-2 text-health-secondary font-medium">
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              The Future of{' '}
              <span className="bg-gradient-to-r from-health-primary to-health-secondary bg-clip-text text-transparent">
                AI-Driven Healthcare
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Experience personalized medical consulting with AI-assisted diagnostics, 
              predictive analytics, and seamless doctor-AI collaboration for better health outcomes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" className="health-button-primary text-lg px-8 py-3">
                Start Your Health Journey
              </Link>
              <Link href="#features" className="border-2 border-health-primary text-health-primary hover:bg-health-primary hover:text-white font-medium py-3 px-8 rounded-md transition-colors">
                Learn More
              </Link>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mt-4 opacity-10">
          <svg width="404" height="384" fill="none" viewBox="0 0 404 384">
            <defs>
              <pattern id="pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="4" height="4" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="404" height="384" fill="url(#pattern)" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Healthcare Solutions
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform combines cutting-edge AI technology with human expertise 
              to deliver personalized healthcare experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="health-card group hover:scale-105 transition-transform">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <feature.icon className="h-8 w-8 text-health-primary group-hover:text-health-secondary transition-colors" />
                  </div>
                  <h3 className="ml-3 text-xl font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 health-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-100">Languages Supported</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-blue-100">AI Accuracy Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">AI Assistant Available</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">100%</div>
              <div className="text-blue-100">HIPAA Compliant</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Healthcare Experience?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of patients and healthcare professionals who trust 
            our AI-driven platform for better health outcomes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register?role=patient" className="health-button-primary text-lg px-8 py-3">
              Join as Patient
            </Link>
            <Link href="/auth/register?role=doctor" className="health-button-secondary text-lg px-8 py-3">
              Join as Doctor
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <HeartIcon className="h-8 w-8 text-health-primary" />
                <span className="ml-2 text-xl font-bold">Smart Health</span>
              </div>
              <p className="text-gray-400">
                AI-driven healthcare platform for personalized medical consulting 
                and predictive health analytics.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">API Docs</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/hipaa" className="hover:text-white transition-colors">HIPAA Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Smart Health Consulting Services. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
