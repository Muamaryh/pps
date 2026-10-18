import React, { useState, useEffect } from "react";

export default function PizzaLoader() {
  const [flavorTextIndex, setFlavorTextIndex] = useState(0);

  const flavorTexts = [
    "Menyiapkan potongan pizza hangat...",
    "Sedang memuat data lapangan Sandy Shores...",
    "Menghubungkan ke arsip database Paguyuban...",
    "Sebentar lagi siap disajikan..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setFlavorTextIndex((prev) => (prev + 1) % flavorTexts.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="py-16 sm:py-24 flex flex-col items-center justify-center w-full px-4 select-none">
      {/* Neo-brutalist Outer Card */}
      <div className="card-brutal p-6 sm:p-8 max-w-md w-full bg-[var(--card-bg)] border-[3px] border-[#1A1A1A] dark:border-[#475569] shadow-[8px_8px_0px_0px_#000000] flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Decorative Top Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#FACC15] text-[#111827] border-2 border-black font-heading font-black text-xs uppercase tracking-wider mb-5 shadow-[2px_2px_0px_#000]">        
          <span>MEMUAT PORTAL PPS</span>
        </div>

        {/* Animated Pizza Eating Scene (SVG) */}
        <div className="w-52 h-44 sm:w-60 sm:h-48 relative flex items-center justify-center my-2">
          <svg
            viewBox="0 0 240 180"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id="brutal-shadow" x="0" y="0" width="200%" height="200%">
                <feDropShadow dx="3" dy="3" stdDeviation="0" floodColor="#000000" floodOpacity="1" />
              </filter>
              <pattern id="loader-stripes" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="10" height="20" fill="#FACC15" />
                <rect x="10" width="10" height="20" fill="#DC2626" />
              </pattern>
            </defs>

            {/* Steaming Smoke (Rises when fresh slice arrives) */}
            <g className="animate-steam opacity-75">
              <path
                d="M 175 45 Q 170 30 178 20 T 172 5"
                stroke="#FACC15"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 188 48 Q 183 35 190 25 T 185 10"
                stroke="#DC2626"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* Crumb particles that burst when biting */}
            <g className="animate-crumbs">
              <circle cx="135" cy="95" r="2.5" fill="#D97706" stroke="#1A1A1A" strokeWidth="1" />
              <circle cx="130" cy="115" r="3" fill="#DC2626" stroke="#1A1A1A" strokeWidth="1" />
              <circle cx="140" cy="125" r="2" fill="#FACC15" stroke="#1A1A1A" strokeWidth="1" />
            </g>

            {/* Sparkles / Bite Stars */}
            <g className="animate-star">
              <path
                d="M 132 80 L 135 86 L 141 89 L 135 92 L 132 98 L 129 92 L 123 89 L 129 86 Z"
                fill="#FACC15"
                stroke="#1A1A1A"
                strokeWidth="1.5"
              />
            </g>

            {/* ========================================================
                MASCOT / EATER CHARACTER (Left Side)
               ======================================================== */}
            <g className="animate-mascot-chew">
              {/* Back Ear */}
              <circle cx="50" cy="95" r="10" fill="#FDE047" stroke="#1A1A1A" strokeWidth="3" />

              {/* Head Base */}
              <circle
                cx="90"
                cy="95"
                r="44"
                fill="#FACC15"
                stroke="#1A1A1A"
                strokeWidth="3.5"
              />

              {/* Red Beanie / PPS Cap */}
              <path
                d="M 52 75 C 55 42 125 42 128 75 Z"
                fill="#DC2626"
                stroke="#1A1A1A"
                strokeWidth="3.5"
              />
              {/* Beanie Brim */}
              <rect
                x="48"
                y="70"
                width="84"
                height="12"
                rx="4"
                fill="#B91C1C"
                stroke="#1A1A1A"
                strokeWidth="3"
              />
              {/* Beanie Pom-Pom */}
              <circle cx="90" cy="40" r="9" fill="#FFFDF9" stroke="#1A1A1A" strokeWidth="3" />

              {/* Cheek Blush */}
              <circle cx="68" cy="108" r="8" fill="#F87171" opacity="0.6" />

              {/* Excited / Chewing Eyes */}
              <g className="animate-eyes">
                {/* Normal Eye (Open) */}
                <ellipse cx="80" cy="85" rx="5" ry="7" fill="#1A1A1A" />
                <circle cx="78" cy="83" r="2" fill="#FFFFFF" />
              </g>
              <g className="animate-eyes-happy">
                {/* Happy Squint (When Chomping) */}
                <path
                  d="M 74 86 Q 80 80 86 86"
                  stroke="#1A1A1A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>

              {/* Mouth & Cheeks (Switches between open and chomping) */}
              {/* Wide Open Mouth (Waiting to bite) */}
              <path
                className="animate-mouth-open"
                d="M 98 100 Q 128 100 120 122 Q 100 130 96 112 Z"
                fill="#991B1B"
                stroke="#1A1A1A"
                strokeWidth="3"
              />
              {/* Red Tongue inside open mouth */}
              <path
                className="animate-mouth-open"
                d="M 104 116 Q 115 110 118 122 Q 108 126 104 116 Z"
                fill="#F43F5E"
              />

              {/* Closed / Chomping Mouth (Chewing with puffy cheeks) */}
              <path
                className="animate-mouth-closed"
                d="M 100 110 Q 115 118 126 108"
                stroke="#1A1A1A"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />

              {/* Cute Hand Holding the Pizza */}
              <circle cx="145" cy="130" r="11" fill="#FACC15" stroke="#1A1A1A" strokeWidth="3" />
            </g>

            {/* ========================================================
                PIZZA SLICE (Moves toward mouth, gets bitten!)
               ======================================================== */}
            <g className="animate-pizza-feed">
              {/* Full Pizza Slice (Before Bite) */}
              <g className="animate-slice-full">
                {/* Pizza Crust */}
                <path
                  d="M 190 70 Q 210 95 198 125 L 182 120 Q 194 95 178 72 Z"
                  fill="#B45309"
                  stroke="#1A1A1A"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                {/* Crust Bumps */}
                <path
                  d="M 188 68 C 215 95 205 125 196 128 C 185 120 195 95 175 70 Z"
                  fill="#D97706"
                  stroke="#1A1A1A"
                  strokeWidth="3"
                />

                {/* Melted Cheese Slice Body */}
                <path
                  d="M 182 73 L 132 105 L 186 118 Q 192 95 182 73 Z"
                  fill="#FACC15"
                  stroke="#1A1A1A"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                {/* Tomato Sauce Border Layer */}
                <path
                  d="M 180 76 Q 188 95 183 115"
                  stroke="#DC2626"
                  strokeWidth="3"
                  fill="none"
                />

                {/* Pepperoni Slices */}
                <circle cx="168" cy="88" r="6" fill="#DC2626" stroke="#1A1A1A" strokeWidth="2" />
                <circle cx="168" cy="88" r="4.5" fill="#B91C1C" />
                
                <circle cx="152" cy="102" r="5.5" fill="#DC2626" stroke="#1A1A1A" strokeWidth="2" />
                <circle cx="152" cy="102" r="4" fill="#B91C1C" />

                <circle cx="172" cy="108" r="5" fill="#DC2626" stroke="#1A1A1A" strokeWidth="2" />

                {/* Herb / Oregano Flecks */}
                <circle cx="160" cy="85" r="1.2" fill="#15803D" />
                <circle cx="144" cy="102" r="1.2" fill="#15803D" />
                <circle cx="162" cy="112" r="1.2" fill="#15803D" />
              </g>

              {/* Bitten Pizza Slice (Tip is eaten with chomp marks + stretching cheese) */}
              <g className="animate-slice-bitten">
                {/* Pizza Crust */}
                <path
                  d="M 188 68 C 215 95 205 125 196 128 C 185 120 195 95 175 70 Z"
                  fill="#D97706"
                  stroke="#1A1A1A"
                  strokeWidth="3"
                />

                {/* Cheese Slice Body with Chomp Cutout */}
                <path
                  d="M 182 73 L 148 93 Q 142 98 147 104 Q 140 110 148 114 L 186 118 Q 192 95 182 73 Z"
                  fill="#FACC15"
                  stroke="#1A1A1A"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                {/* Tomato Sauce Border Layer */}
                <path
                  d="M 180 76 Q 188 95 183 115"
                  stroke="#DC2626"
                  strokeWidth="3"
                  fill="none"
                />

                {/* Pepperoni Slices (One half bitten) */}
                <circle cx="168" cy="88" r="6" fill="#DC2626" stroke="#1A1A1A" strokeWidth="2" />
                <circle cx="172" cy="108" r="5" fill="#DC2626" stroke="#1A1A1A" strokeWidth="2" />

                {/* Gooey Cheese Strings Stretching from the bite */}
                <path
                  d="M 145 98 C 130 102 120 106 114 110"
                  stroke="#FACC15"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 146 106 C 135 110 125 114 118 116"
                  stroke="#FDE047"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            </g>
          </svg>
        </div>

        {/* Dynamic Fun Flavor Text */}
        <p className="font-heading font-black text-sm sm:text-base text-slate-900 dark:text-slate-100 min-h-[24px] mb-4 transition-all duration-300">
          {flavorTexts[flavorTextIndex]}
        </p>

        {/* Neo-brutalist Striped Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded h-4 border-2 border-black dark:border-[#475569] shadow-[3px_3px_0px_#000000] overflow-hidden p-[2px]">
          <div className="h-full rounded-sm bg-gradient-to-r from-[#FACC15] via-[#DC2626] to-[#FACC15] bg-[length:40px_40px] animate-stripe-slide w-full" />
        </div>

        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2.5 uppercase tracking-wider">
          Paguyuban Pizza Sandy Shores
        </span>
      </div>

      {/* Embedded CSS Animations for the Pizza Chomp */}
      <style>{`
        /* 1. Mascot Head Movement (Nods & chews) */
        @keyframes mascotChew {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-3px) rotate(-1.5deg); }
          45% { transform: translateY(3px) rotate(1deg); }
          55% { transform: translateY(-2px) scaleY(1.02); }
          65% { transform: translateY(2px) scaleY(0.98); }
          75% { transform: translateY(-1px) scaleY(1.01); }
        }
        .animate-mascot-chew {
          animation: mascotChew 2.4s ease-in-out infinite;
          transform-origin: 90px 95px;
        }

        /* 2. Pizza Feeding Animation (Approaches mouth, chomped, pulls away) */
        @keyframes pizzaFeed {
          0%, 100% { transform: translate(15px, 0px) rotate(0deg); }
          25% { transform: translate(-12px, 0px) rotate(-4deg); }
          42% { transform: translate(-22px, 2px) rotate(-6deg); }
          50% { transform: translate(-8px, 6px) rotate(3deg); }
          75% { transform: translate(6px, 4px) rotate(2deg); }
          90% { transform: translate(15px, -2px) rotate(0deg); }
        }
        .animate-pizza-feed {
          animation: pizzaFeed 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          transform-origin: 160px 100px;
        }

        /* 3. Slice Full vs Bitten Visibility Switch */
        @keyframes sliceFullSwitch {
          0%, 41% { opacity: 1; }
          42%, 92% { opacity: 0; }
          93%, 100% { opacity: 1; }
        }
        .animate-slice-full {
          animation: sliceFullSwitch 2.4s step-end infinite;
        }

        @keyframes sliceBittenSwitch {
          0%, 41% { opacity: 0; }
          42%, 92% { opacity: 1; }
          93%, 100% { opacity: 0; }
        }
        .animate-slice-bitten {
          animation: sliceBittenSwitch 2.4s step-end infinite;
        }

        /* 4. Mouth Open vs Closed Switch */
        @keyframes mouthOpenSwitch {
          0%, 20% { opacity: 0; }
          22%, 41% { opacity: 1; }
          42%, 100% { opacity: 0; }
        }
        .animate-mouth-open {
          animation: mouthOpenSwitch 2.4s step-end infinite;
        }

        @keyframes mouthClosedSwitch {
          0%, 20% { opacity: 1; }
          22%, 41% { opacity: 0; }
          42%, 100% { opacity: 1; }
        }
        .animate-mouth-closed {
          animation: mouthClosedSwitch 2.4s step-end infinite;
        }

        /* 5. Eyes Blink / Squint Switch */
        @keyframes eyesSwitch {
          0%, 41% { opacity: 1; }
          42%, 78% { opacity: 0; }
          79%, 100% { opacity: 1; }
        }
        .animate-eyes {
          animation: eyesSwitch 2.4s step-end infinite;
        }

        @keyframes eyesHappySwitch {
          0%, 41% { opacity: 0; }
          42%, 78% { opacity: 1; }
          79%, 100% { opacity: 0; }
        }
        .animate-eyes-happy {
          animation: eyesHappySwitch 2.4s step-end infinite;
        }

        /* 6. Crumb Particles Burst on Bite */
        @keyframes crumbBurst {
          0%, 41% { opacity: 0; transform: scale(0.3) translate(0, 0); }
          43% { opacity: 1; transform: scale(1.1) translate(-2px, -3px); }
          55% { opacity: 0.8; transform: scale(1) translate(-8px, 12px); }
          65%, 100% { opacity: 0; transform: scale(0.5) translate(-12px, 20px); }
        }
        .animate-crumbs {
          animation: crumbBurst 2.4s ease-out infinite;
          transform-origin: 135px 105px;
        }

        /* 7. Star Sparkle on Satisfied Bite */
        @keyframes starPop {
          0%, 44% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(45deg); }
          65% { opacity: 0; transform: scale(0.2) rotate(90deg); }
          100% { opacity: 0; }
        }
        .animate-star {
          animation: starPop 2.4s ease-out infinite;
          transform-origin: 132px 89px;
        }

        /* 8. Steam Rising */
        @keyframes steamRise {
          0% { opacity: 0; transform: translateY(4px); }
          50% { opacity: 0.8; transform: translateY(-4px); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .animate-steam {
          animation: steamRise 1.8s ease-in-out infinite;
        }

        /* 9. Striped Loading Bar Slide */
        @keyframes stripeSlide {
          0% { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
        .animate-stripe-slide {
          animation: stripeSlide 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
