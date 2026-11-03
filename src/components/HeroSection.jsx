import React from 'react';
import { 
  ArrowRight, 
  PhoneCall, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  ExternalLink 
} from 'lucide-react';
import InteractiveRobotSentinel from './InteractiveRobotSentinel.jsx';

export default function HeroSection({ onEnterDashboard }) {
  const handleScrollToSection = (id) => {
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
    <section 
      id="overview-section"
      className="relative w-full min-h-screen bg-[#0B1519] bg-petrol-grid pt-28 sm:pt-36 lg:pt-40 pb-20 sm:pb-28 px-5 sm:px-8 lg:px-12 flex flex-col justify-between overflow-hidden"
    >
      {/* Soft Ambient Radial Vignettes */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] sm:w-[1000px] h-[500px] bg-gradient-to-b from-[#EE8656]/5 via-[#18313A]/20 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-10 right-10 w-96 h-96 bg-[#EE8656]/5 blur-[120px] pointer-events-none rounded-full" />

      {/* Main Hero Container */}
      <div className="max-w-7xl mx-auto w-full relative z-10 flex-1 flex flex-col justify-between">
        
        {/* Top Half: Left Headline + Right Bezeled 3D Robot Window */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Column: Bold Typography Matching Reference Image */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            
            {/* Terracotta Sub-dash Eyebrow */}
            <div className="flex items-center gap-2.5 mb-4 text-[#EE8656] text-xs sm:text-sm font-mono font-bold uppercase tracking-[0.22em]">
              <span className="w-7 h-[2px] bg-[#EE8656] inline-block" />
              <span>WELCOME TO</span>
            </div>

            {/* High-Impact Headline matching Riverside format */}
            <h1 className="text-4xl sm:text-6xl lg:text-[66px] font-extrabold text-white font-sans leading-[1.04] tracking-tight uppercase mb-5">
              TRUSTLENS FORENSIC<br />
              <span className="text-[#EE8656]">SERVICES</span>
            </h1>

            {/* Sub-paragraph */}
            <p className="text-slate-300 text-sm sm:text-base lg:text-lg font-normal leading-relaxed max-w-lg mb-8 text-slate-300/90">
              Autonomous neural forensic engine detecting generative deepfakes, synthetic voice clones, and biometric tampering since 2024.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={onEnterDashboard || (() => handleScrollToSection('deepfakes-section'))}
                className="px-7 py-3.5 rounded-full bg-[#EE8656] hover:bg-[#FA9C72] text-[#0B1519] font-bold text-xs tracking-wider uppercase shadow-[0_0_30px_rgba(238,134,86,0.38)] hover:shadow-[0_0_40px_rgba(238,134,86,0.55)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Launch Analysis Lab</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                onClick={() => handleScrollToSection('scanbay-section')}
                className="px-6 py-3.5 rounded-full bg-[#112127] hover:bg-[#192E36] text-slate-200 border border-[#27404A] hover:border-[#EE8656]/50 font-semibold text-xs tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Scan Bay 3D</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Right Column: Signature Bezeled Window housing Interactive 3D Mascot */}
          <div className="lg:col-span-6 w-full flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg lg:max-w-xl aspect-[4/3] sm:aspect-[16/11] rounded-[28px] sm:rounded-[36px] p-3 sm:p-4 bg-gradient-to-b from-[#14262D] via-[#0E1A1F] to-[#0A1417] border-2 border-[#223942] shadow-[0_24px_60px_rgba(0,0,0,0.85),_inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden group">
              
              {/* Inner Bezel Screen */}
              <div className="w-full h-full rounded-[20px] sm:rounded-[26px] overflow-hidden bg-gradient-to-b from-[#0D181C] to-[#081013] border border-[#1A2E35] relative shadow-inner">
                
                {/* Embedded Interactive 3D Robot Sentinel */}
                <InteractiveRobotSentinel status="idle" className="w-full h-full" />
                
                {/* Subtle Viewport Corner Brackets */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#EE8656]/40 pointer-events-none rounded-tl-sm" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#EE8656]/40 pointer-events-none rounded-tr-sm" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#EE8656]/40 pointer-events-none rounded-bl-sm" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#EE8656]/40 pointer-events-none rounded-br-sm" />
              </div>

            </div>
          </div>

        </div>

        {/* Bottom Half: 3 Bimodal Cards Cutting Across the Fold (Exact match to reference) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mt-14 sm:mt-20">
          
          {/* Card 1: Warm Porcelain Cream (Left) */}
          <div className="bg-[#FAF7F0] text-[#111A1D] rounded-3xl p-7 sm:p-8 shadow-2xl flex flex-col justify-between border border-[#EBE4D6] hover:shadow-[0_20px_45px_rgba(0,0,0,0.4)] transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#EFE8DC] border border-[#DFD6C6] flex items-center justify-center mb-6 text-[#EE8656] shadow-sm">
              <Layers className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold leading-snug text-[#111A1D] tracking-tight">
                We detect generative deepfakes, synthetic voices, and forged biometric credentials.
              </p>
            </div>
          </div>

          {/* Card 2: Dark Petrol Glass (Center) */}
          <div className="bg-gradient-to-b from-[#122228] to-[#0C161A] text-[#E5ECED] rounded-3xl p-7 sm:p-8 shadow-2xl border border-[#233B44] flex flex-col justify-between relative overflow-hidden group hover:border-[#EE8656]/50 transition-all">
            <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#EE8656]/15 blur-2xl pointer-events-none" />
            
            <div className="w-12 h-12 rounded-2xl bg-[#1A2E35] border border-[#2B4652] flex items-center justify-center mb-6 text-[#EE8656] shadow-inner group-hover:scale-105 transition-transform">
              <PhoneCall className="w-6 h-6 stroke-[2.2]" />
            </div>
            
            <div>
              <p className="text-base sm:text-lg font-bold leading-snug text-white tracking-tight">
                Call us any time on{' '}
                <a 
                  href="tel:01632960112"
                  className="text-[#EE8656] underline underline-offset-4 decoration-[#EE8656]/60 hover:text-[#FA9C72] transition-colors"
                >
                  01632 960 112
                </a>{' '}
                for a free forensic audit.
              </p>
            </div>
          </div>

          {/* Card 3: Warm Porcelain Cream (Right) */}
          <div className="bg-[#FAF7F0] text-[#111A1D] rounded-3xl p-7 sm:p-8 shadow-2xl flex flex-col justify-between border border-[#EBE4D6] hover:shadow-[0_20px_45px_rgba(0,0,0,0.4)] transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#EFE8DC] border border-[#DFD6C6] flex items-center justify-center mb-6 text-[#EE8656] shadow-sm">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold leading-snug text-[#111A1D] tracking-tight">
                Zero false-positive SLA on tamper analysis. All forensic reports cryptographically signed.
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
