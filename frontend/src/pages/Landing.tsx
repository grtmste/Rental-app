import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CubeIcon,
  UsersIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CheckCircleIcon,
  StarIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const features = [
  { icon: CubeIcon, title: 'Equipment Tracking', desc: 'Real-time inventory management with QR codes, check-in/out logs, and availability calendar.' },
  { icon: UsersIcon, title: 'Crew Scheduling', desc: 'Assign technicians and crew to projects, track availability, and manage hourly rates.' },
  { icon: DocumentTextIcon, title: 'Smart Invoicing', desc: 'Generate professional quotes and invoices with automatic VAT calculation and PDF export.' },
]

const alternatingFeatures = [
  {
    title: 'Powerful Equipment Management',
    desc: 'Keep track of every item in your inventory with our intuitive equipment management system. Monitor availability in real-time, scan QR codes for instant identification, and view detailed usage logs for each piece of gear.',
    bullets: ['QR code generation for every item', 'Real-time availability tracking', 'Condition monitoring and maintenance logs', 'Category-based organization'],
    img: 'https://placehold.co/600x400/1A3C6E/white?text=Equipment+Management',
    imgLeft: false,
  },
  {
    title: 'Visual Project Planning',
    desc: 'Plan and manage every project from one central dashboard. Assign equipment, schedule crew, track budgets, and monitor progress with our intuitive project management tools.',
    bullets: ['Drag-and-drop task boards', 'Budget tracking and forecasting', 'Equipment assignment with conflict detection', 'Project timeline visualization'],
    img: 'https://placehold.co/600x400/F97316/white?text=Project+Planning',
    imgLeft: true,
  },
  {
    title: 'Efficient Crew Scheduling',
    desc: 'Build and manage your team with ease. Track crew availability, assign roles to projects, and manage hourly rates all in one place.',
    bullets: ['Skills and certification tracking', 'Availability calendar', 'Hourly rate management', 'Project assignment workflow'],
    img: 'https://placehold.co/600x400/1A3C6E/white?text=Crew+Scheduling',
    imgLeft: false,
  },
  {
    title: 'Professional Quoting & Invoicing',
    desc: 'Create stunning professional quotes and invoices in minutes. Auto-populate from project equipment lists, apply European VAT rates, and send directly to clients.',
    bullets: ['Auto-populate from project data', 'European VAT compliance', 'PDF export and email delivery', 'Payment status tracking'],
    img: 'https://placehold.co/600x400/F97316/white?text=Invoicing',
    imgLeft: true,
  },
  {
    title: 'Deep Analytics & Reports',
    desc: 'Make data-driven decisions with comprehensive analytics. Track revenue trends, equipment utilization, top clients, and crew productivity all in one place.',
    bullets: ['Revenue trend analysis', 'Equipment utilization rates', 'Top client insights', 'Crew productivity metrics'],
    img: 'https://placehold.co/600x400/1A3C6E/white?text=Analytics',
    imgLeft: false,
  },
]

const useCases = [
  { title: 'Event Production', desc: 'Manage audio/visual equipment for corporate events, conferences, and exhibitions.', icon: '🎤' },
  { title: 'Concerts & Festivals', desc: 'Scale up for large-scale concerts with complex stage equipment and touring gear.', icon: '🎸' },
  { title: 'Film Production', desc: 'Track cameras, lighting, and grip equipment across multiple shooting locations.', icon: '🎬' },
  { title: 'Corporate AV', desc: 'Serve corporate clients with reliable AV equipment for meetings and presentations.', icon: '📽️' },
  { title: 'Weddings & Events', desc: 'Deliver perfect sound and lighting for weddings and private celebrations.', icon: '💒' },
  { title: 'Theater & Performing Arts', desc: 'Manage stage equipment, lighting rigs, and audio systems for theater productions.', icon: '🎭' },
]

const whyUs = [
  { title: 'Real-time Availability', desc: 'Always know what equipment is available, assigned, or under maintenance.' },
  { title: 'Mobile Ready', desc: 'Access your rental management system from any device, anywhere.' },
  { title: 'PDF Export', desc: 'Generate professional PDF quotes, invoices, and equipment lists with one click.' },
  { title: 'Multi-user Access', desc: 'Invite your team with role-based permissions for admins and staff.' },
  { title: 'European VAT', desc: 'Built-in VAT compliance for European businesses with configurable rates.' },
  { title: 'Secure & Reliable', desc: 'Enterprise-grade security with 99.9% uptime guarantee and daily backups.' },
]

const logos = ['SoundWave Co', 'EventPro Ltd', 'Nordic AV', 'StageRight', 'TechRent GmbH', 'ProLight OÜ']

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary">RentPro</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-primary font-medium">Features</a>
              <a href="#pricing" className="text-sm text-gray-600 hover:text-primary font-medium">Pricing</a>
              <a href="#about" className="text-sm text-gray-600 hover:text-primary font-medium">About</a>
              <a href="#contact" className="text-sm text-gray-600 hover:text-primary font-medium">Contact</a>
              <Link to="/login" className="text-sm font-medium text-primary hover:text-primary-dark">Login</Link>
              <Link
                to="/register"
                className="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button className="md:hidden p-2 text-gray-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100 space-y-3">
              <a href="#features" className="block text-sm text-gray-600 hover:text-primary font-medium py-2">Features</a>
              <a href="#pricing" className="block text-sm text-gray-600 hover:text-primary font-medium py-2">Pricing</a>
              <a href="#about" className="block text-sm text-gray-600 hover:text-primary font-medium py-2">About</a>
              <a href="#contact" className="block text-sm text-gray-600 hover:text-primary font-medium py-2">Contact</a>
              <Link to="/login" className="block text-sm font-medium text-primary py-2">Login</Link>
              <Link to="/register" className="block bg-accent text-white text-sm font-medium px-4 py-2 rounded-lg text-center">Start Free Trial</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-primary-light text-white py-20 px-4">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Manage Equipment Rentals<br />
              <span className="text-accent">Like a Pro</span>
            </h1>
            <p className="text-lg sm:text-xl text-blue-200 mb-8 max-w-xl mx-auto lg:mx-0">
              Streamline your rental operations with real-time equipment tracking, crew scheduling, professional invoicing, and powerful analytics — all in one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                to="/register"
                className="bg-accent hover:bg-accent-dark text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg"
              >
                Start Free Trial
              </Link>
              <button className="bg-white bg-opacity-10 hover:bg-opacity-20 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors border border-white border-opacity-30">
                ▶ Watch Demo
              </button>
            </div>
            <p className="mt-4 text-blue-300 text-sm">No credit card required · 14-day free trial</p>
          </div>
          <div className="flex-1 flex justify-center">
            <img
              src="https://placehold.co/800x500/0F2447/white?text=RentPro+Dashboard"
              alt="RentPro Dashboard"
              className="rounded-2xl shadow-2xl max-w-full"
            />
          </div>
        </div>
      </section>

      {/* Customer Logo Bar */}
      <section className="py-10 bg-gray-50 border-y border-gray-200 overflow-hidden">
        <p className="text-center text-sm text-gray-500 mb-6 font-medium uppercase tracking-wider">Trusted by leading rental companies</p>
        <div className="flex gap-12 animate-marquee whitespace-nowrap">
          {[...logos, ...logos].map((logo, i) => (
            <span key={i} className="text-gray-400 font-semibold text-lg grayscale hover:grayscale-0 transition-all cursor-default">
              {logo}
            </span>
          ))}
        </div>
      </section>

      {/* 3-Column Feature Highlights */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything you need to run your rental business</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">RentPro brings together all the tools you need in one powerful, easy-to-use platform.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center p-8 rounded-2xl border border-gray-200 hover:border-primary hover:shadow-lg transition-all">
                <div className="inline-flex p-4 bg-primary bg-opacity-10 rounded-2xl mb-4">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alternating Feature Sections */}
      <section className="py-10 px-4">
        <div className="max-w-7xl mx-auto space-y-24">
          {alternatingFeatures.map(({ title, desc, bullets, img, imgLeft }) => (
            <div
              key={title}
              className={`flex flex-col lg:flex-row items-center gap-12 ${imgLeft ? 'lg:flex-row-reverse' : ''}`}
            >
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
                <p className="text-gray-500 mb-6 text-lg">{desc}</p>
                <ul className="space-y-3">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-center gap-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1">
                <img src={img} alt={title} className="rounded-2xl shadow-lg w-full" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Industry Use-Case Cards */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Built for every industry</h2>
            <p className="text-lg text-gray-500">From intimate weddings to massive festivals — RentPro scales with your business.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map(({ title, desc, icon }) => (
              <div key={title} className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all">
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Why choose RentPro?</h2>
            <p className="text-lg text-gray-500">We've built everything rental professionals need, nothing they don't.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyUs.map(({ title, desc }) => (
              <div key={title} className="flex gap-4 p-6 bg-white rounded-xl border border-gray-200 hover:border-primary transition-colors">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <StarIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-gray-500 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-20 px-4 bg-primary text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ready to transform your rental business?</h2>
          <p className="text-blue-200 text-lg mb-8">Join hundreds of rental companies who trust RentPro to manage their operations. Start your free 14-day trial today.</p>
          <Link
            to="/register"
            className="inline-block bg-accent hover:bg-accent-dark text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-xl"
          >
            Sign Up Free — No Credit Card Required
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <span className="text-white font-bold text-xl">RentPro</span>
              <p className="mt-2 text-sm">Professional rental management software for equipment rental companies across Europe.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Changelog</a></li>
                <li><a href="#" className="hover:text-white">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#contact" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">GDPR</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2024 RentPro. All rights reserved. Built for Stereo Sound OÜ.</p>
            <div className="flex gap-4">
              {['Twitter', 'LinkedIn', 'GitHub', 'YouTube'].map((s) => (
                <a key={s} href="#" className="text-sm hover:text-white transition-colors">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
