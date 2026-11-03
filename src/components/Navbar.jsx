import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, Menu, X, Sparkles, PhoneCall } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview-section', label: 'HOME' },
  { id: 'deepfakes-section', label: 'SERVICES' },
  { id: 'scanbay-section', label: 'SCAN BAY' },
  { id: 'telemetry-section', label: 'REVIEWS' },
  { id: 'footer-section', label: 'CONTACT' }
];

export default function Navbar() {
  const [activeSection, setActiveSection] = useState('overview-section');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 30);

      const sections = NAV_ITEMS.map((item) => ({
        id: item.id,
        el: document.getElementById(item.id)
      }));

      if (scrollY < 200) {
        setActiveSection('overview-section');
        return;
      }

      const scrollCenter = scrollY + window.innerHeight * 0.35;
      for (let i = sections.length - 1; i >= 0; i--) {
        const { id, el } = sections[i];
        if (el) {
          const top = el.offsetTop;
          if (scrollCenter >= top) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    if (id === 'overview-section') {
      if (window.lenis) {
        window.lenis.scrollTo(0, { duration: 1.4 });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      if (window.lenis) {
        window.lenis.scrollTo(el, { offset: -30, duration: 1.4 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#0B1519]/90 backdrop-blur-xl border-b border-[#1E333C] py-3 shadow-2xl shadow-black/60' 
          : 'bg-transparent py-5 sm:py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto w-full px-5 sm:px-8 lg:px-12 flex items-center justify-between">
        
        {/* Brand Monogram Squircle Badge (Matching reference image top-left badge) */}
        <div 
          className="flex items-center gap-3 group cursor-pointer" 
          onClick={() => scrollToSection('overview-section')}
        >
          <div className="relative w-10 h-10 rounded-2xl bg-[#0F1D22] border border-[#273F49] group-hover:border-[#EE8656]/60 flex items-center justify-center shadow-lg transition-all">
            <span className="font-editorial text-xl font-bold text-[#EE8656] tracking-tight">
              R
            </span>
            <div className="absolute inset-0 rounded-2xl bg-[#EE8656]/5 group-hover:bg-[#EE8656]/15 transition-colors" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wider uppercase text-white font-sans flex items-center gap-1.5">
              TRUSTLENS <span className="text-[#EE8656] text-[10px] px-1.5 py-0.5 rounded-full bg-[#EE8656]/15 border border-[#EE8656]/30">ARC</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-tight hidden sm:block">
              Neural Media Forensics
            </span>
          </div>
        </div>

        {/* Center/Right Capsule Pill Navigation (Exact match to reference image) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#0E1A1E]/80 backdrop-blur-xl p-1.5 rounded-full border border-[#20363F] shadow-2xl">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`px-4 sm:px-5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#EE8656] text-[#0B1519] shadow-[0_0_20px_rgba(238,134,86,0.4)] scale-100'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Quick Action: Hotline or Lab Portal */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => scrollToSection('deepfakes-section')}
            className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-[#112127] hover:bg-[#182E36] border border-[#27404A] hover:border-[#EE8656]/50 text-slate-200 text-xs font-medium tracking-wide transition-all shadow-md group cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#EE8656] group-hover:scale-110 transition-transform" />
            <span className="font-mono text-xs text-[#EE8656] font-semibold">01632 960 112</span>
          </button>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-[#0F1D22] border border-[#273F49] text-slate-300 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#EE8656]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0B1519]/98 backdrop-blur-2xl border-b border-[#1E333C] px-6 py-4 flex flex-col gap-2 shadow-2xl">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-left text-xs font-bold tracking-wider uppercase py-2.5 px-4 rounded-xl flex items-center justify-between transition-all ${
                  isActive 
                    ? 'bg-[#EE8656] text-[#0B1519] font-bold shadow-[0_0_15px_rgba(238,134,86,0.4)]' 
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{item.label}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-[#0B1519]" />}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
