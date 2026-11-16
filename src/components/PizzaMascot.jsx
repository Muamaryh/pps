import React from "react";

export default function PizzaMascot({
  size = "md",
  variant = "eating", // "eating" | "thankyou" | "waving"
  animated = true,
  speechBubble,
  className = "",
}) {
  const sizeClasses = {
    xs: "w-11 h-9 sm:w-13 sm:h-10",
    sm: "w-20 h-16 sm:w-24 sm:h-18",
    md: "w-32 h-26 sm:w-40 sm:h-32",
    lg: "w-48 h-38 sm:w-56 sm:h-44",
  };

  const selectedSize = sizeClasses[size] || size;

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
      {/* Optional Speech Bubble */}
      {speechBubble && (
        <div className="relative mb-1.5 px-3 py-1 rounded-xl bg-white dark:bg-[#1E2330] text-slate-900 dark:text-slate-100 border border-black/15 dark:border-white/15 shadow-sm text-[11px] font-heading font-black uppercase tracking-tight text-center">
          <span>{speechBubble}</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-[#1E2330] border-r border-b border-black/15 dark:border-white/15 rotate-45" />
        </div>
      )}

      <div className={`${selectedSize} relative flex items-center justify-center shrink-0`}>
        <svg
          viewBox="0 0 240 180"
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ========================================================
              VARIANT: THANK YOU (Berterima Kasih di Modal Donasi)
             ======================================================== */}
          {variant === "thankyou" && (
            <>
              {/* Floating Hearts & Appreciation Sparkles */}
              {animated && (
                <>
                  <g className="animate-heart-rise-1">
                    <path
                      d="M 148 65 C 148 56 137 56 137 65 C 137 74 148 83 148 83 C 148 83 159 74 159 65 C 159 56 148 56 148 65 Z"
                      fill="#DC2626"
                      stroke="#1A1A1A"
                      strokeWidth="2"
                    />
                  </g>
                  <g className="animate-heart-rise-2">
                    <path
                      d="M 166 45 C 166 38 157 38 157 45 C 157 52 166 59 166 59 C 166 59 175 52 175 45 C 175 38 166 38 166 45 Z"
                      fill="#FACC15"
                      stroke="#1A1A1A"
                      strokeWidth="1.8"
                    />
                  </g>
                  <g className="animate-star">
                    <path
                      d="M 45 65 L 48 71 L 54 74 L 48 77 L 45 83 L 42 77 L 36 74 L 42 71 Z"
                      fill="#FACC15"
                      stroke="#1A1A1A"
                      strokeWidth="1.5"
                    />
                  </g>
                </>
              )}

              {/* Thankful Mascot Character with Polite Bow */}
              <g className={animated ? "animate-mascot-bow" : ""}>
                {/* Back Ear */}
                <circle cx="50" cy="95" r="10" fill="#FDE047" stroke="#1A1A1A" strokeWidth="3" />

                {/* Head Base */}
                <circle cx="95" cy="95" r="44" fill="#FACC15" stroke="#1A1A1A" strokeWidth="3.5" />

                {/* Red Beanie Cap */}
                <path d="M 57 75 C 60 42 130 42 133 75 Z" fill="#DC2626" stroke="#1A1A1A" strokeWidth="3.5" />
                <rect x="53" y="70" width="84" height="12" rx="4" fill="#B91C1C" stroke="#1A1A1A" strokeWidth="3" />
                <circle cx="95" cy="40" r="9" fill="#FFFDF9" stroke="#1A1A1A" strokeWidth="3" />

                {/* Happy Grateful Blushing Cheeks */}
                <circle cx="72" cy="104" r="8" fill="#F87171" opacity="0.65" />
                <circle cx="118" cy="104" r="8" fill="#F87171" opacity="0.65" />

                {/* Happy Crescent Grateful Eyes (^ _ ^) */}
                <path
                  d="M 72 87 Q 80 79 88 87"
                  stroke="#1A1A1A"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 102 87 Q 110 79 118 87"
                  stroke="#1A1A1A"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />

                {/* Warm Thankful Open Smile */}
                <path
                  d="M 87 101 Q 95 116 103 101 Z"
                  fill="#991B1B"
                  stroke="#1A1A1A"
                  strokeWidth="3"
                />
                <path
                  d="M 90 108 Q 95 104 100 108 Q 95 114 90 108 Z"
                  fill="#F43F5E"
                />

                {/* Clasped Hands in Front (Salam Hormat & Terima Kasih) */}
                <g className="animate-hands-pulse">
                  <ellipse cx="90" cy="124" rx="9" ry="14" transform="rotate(-18 90 124)" fill="#FACC15" stroke="#1A1A1A" strokeWidth="3" />
                  <ellipse cx="100" cy="124" rx="9" ry="14" transform="rotate(18 100 124)" fill="#FDE047" stroke="#1A1A1A" strokeWidth="3" />
                </g>
              </g>
            </>
          )}

          {/* ========================================================
              VARIANT: WAVING (Lambaikan Tangan ke Atas di Kiri Bawah)
             ======================================================== */}
          {variant === "waving" && (
            <>
              {/* Upward Guide Chevrons / Motion Sparks */}
              {animated && (
                <g className="animate-up-arrow">
                  <path
                    d="M 172 26 L 180 18 L 188 26"
                    stroke="#FACC15"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 180 34 L 188 26 L 196 34"
                    stroke="#DC2626"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}

              {/* Cheerful Mascot with Upward Gaze and Waving Hand */}
              <g className={animated ? "animate-mascot-cheer" : ""}>
                {/* Back Ear */}
                <circle cx="48" cy="98" r="10" fill="#FDE047" stroke="#1A1A1A" strokeWidth="3" />

                {/* Head Base (Looking slightly up) */}
                <circle cx="88" cy="98" r="44" fill="#FACC15" stroke="#1A1A1A" strokeWidth="3.5" />

                {/* Red Beanie Cap (Tilted back) */}
                <path d="M 50 78 C 53 45 123 45 126 78 Z" fill="#DC2626" stroke="#1A1A1A" strokeWidth="3.5" />
                <rect x="46" y="73" width="84" height="12" rx="4" fill="#B91C1C" stroke="#1A1A1A" strokeWidth="3" />
                <circle cx="86" cy="43" r="9" fill="#FFFDF9" stroke="#1A1A1A" strokeWidth="3" />

                {/* Cheek Blush */}
                <circle cx="68" cy="110" r="8" fill="#F87171" opacity="0.6" />

                {/* Excited Eyes Looking Upwards */}
                <ellipse cx="78" cy="90" rx="5.5" ry="7.5" fill="#1A1A1A" />
                <circle cx="80" cy="87" r="2.5" fill="#FFFFFF" />

                <ellipse cx="98" cy="92" rx="5" ry="7" fill="#1A1A1A" />
                <circle cx="100" cy="89" r="2.2" fill="#FFFFFF" />

                {/* Cheerful Open Mouth Calling to the Top */}
                <path
                  d="M 85 107 Q 98 126 110 109 Z"
                  fill="#991B1B"
                  stroke="#1A1A1A"
                  strokeWidth="3"
                />
                <path
                  d="M 90 117 Q 98 113 105 117"
                  fill="#F43F5E"
                />

                {/* Left hand on hip / side */}
                <circle cx="50" cy="126" r="9" fill="#FACC15" stroke="#1A1A1A" strokeWidth="3" />

                {/* Right Arm & Hand Waving Upwards */}
                <g className={animated ? "animate-arm-wave" : ""}>
                  {/* Raised Arm */}
                  <path
                    d="M 112 108 Q 136 78 152 50"
                    stroke="#FACC15"
                    strokeWidth="18"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 112 108 Q 136 78 152 50"
                    stroke="#1A1A1A"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Waving Hand & Palm */}
                  <circle cx="155" cy="44" r="13" fill="#FACC15" stroke="#1A1A1A" strokeWidth="3" />
                  {/* Fingers Waving to Top */}
                  <path
                    d="M 148 37 L 151 21 Q 154 18 157 21 L 159 36"
                    stroke="#1A1A1A"
                    strokeWidth="2.5"
                    fill="#FDE047"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 159 36 L 165 25 Q 168 23 170 26 L 167 39"
                    stroke="#1A1A1A"
                    strokeWidth="2.5"
                    fill="#FDE047"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 167 39 L 176 32 Q 179 30 180 34 L 171 44"
                    stroke="#1A1A1A"
                    strokeWidth="2.5"
                    fill="#FDE047"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 145 42 Q 137 38 139 32 Q 142 29 146 34 L 149 40"
                    stroke="#1A1A1A"
                    strokeWidth="2.5"
                    fill="#FDE047"
                    strokeLinejoin="round"
                  />
                </g>
              </g>
            </>
          )}

          {/* ========================================================
              VARIANT: EATING (Default Makan Pizza)
             ======================================================== */}
          {variant === "eating" && (
            <>
              {/* Steaming Smoke */}
              {animated && (
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
              )}

              {/* Crumb particles */}
              {animated && (
                <g className="animate-crumbs">
                  <circle cx="135" cy="95" r="2.5" fill="#D97706" stroke="#1A1A1A" strokeWidth="1" />
                  <circle cx="130" cy="115" r="3" fill="#DC2626" stroke="#1A1A1A" strokeWidth="1" />
                  <circle cx="140" cy="125" r="2" fill="#FACC15" stroke="#1A1A1A" strokeWidth="1" />
                </g>
              )}

              {/* Sparkles / Bite Stars */}
              {animated && (
                <g className="animate-star">
                  <path
                    d="M 132 80 L 135 86 L 141 89 L 135 92 L 132 98 L 129 92 L 123 89 L 129 86 Z"
                    fill="#FACC15"
                    stroke="#1A1A1A"
                    strokeWidth="1.5"
                  />
                </g>
              )}

              {/* Mascot Eater Character */}
              <g className={animated ? "animate-mascot-chew" : ""}>
                {/* Back Ear */}
                <circle cx="50" cy="95" r="10" fill="#FDE047" stroke="#1A1A1A" strokeWidth="3" />

                {/* Head Base */}
                <circle cx="90" cy="95" r="44" fill="#FACC15" stroke="#1A1A1A" strokeWidth="3.5" />

                {/* Red Beanie Cap */}
                <path d="M 52 75 C 55 42 125 42 128 75 Z" fill="#DC2626" stroke="#1A1A1A" strokeWidth="3.5" />
                <rect x="48" y="70" width="84" height="12" rx="4" fill="#B91C1C" stroke="#1A1A1A" strokeWidth="3" />
                <circle cx="90" cy="40" r="9" fill="#FFFDF9" stroke="#1A1A1A" strokeWidth="3" />

                {/* Cheek Blush */}
                <circle cx="68" cy="108" r="8" fill="#F87171" opacity="0.6" />

                {/* Excited / Chewing Eyes */}
                {animated ? (
                  <>
                    <g className="animate-eyes">
                      <ellipse cx="80" cy="85" rx="5" ry="7" fill="#1A1A1A" />
                      <circle cx="78" cy="83" r="2" fill="#FFFFFF" />
                    </g>
                    <g className="animate-eyes-happy">
                      <path
                        d="M 74 86 Q 80 80 86 86"
                        stroke="#1A1A1A"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </g>
                  </>
                ) : (
                  <g>
                    <ellipse cx="80" cy="85" rx="5" ry="7" fill="#1A1A1A" />
                    <circle cx="78" cy="83" r="2" fill="#FFFFFF" />
                  </g>
                )}

                {/* Mouth */}
                {animated ? (
                  <>
                    <path
                      className="animate-mouth-open"
                      d="M 98 100 Q 128 100 120 122 Q 100 130 96 112 Z"
                      fill="#991B1B"
                      stroke="#1A1A1A"
                      strokeWidth="3"
                    />
                    <path
                      className="animate-mouth-open"
                      d="M 104 116 Q 115 110 118 122 Q 108 126 104 116 Z"
                      fill="#F43F5E"
                    />
                    <path
                      className="animate-mouth-closed"
                      d="M 100 110 Q 115 118 126 108"
                      stroke="#1A1A1A"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </>
                ) : (
                  <path
                    d="M 100 110 Q 115 118 126 108"
                    stroke="#1A1A1A"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                  />
                )}

                {/* Hand Holding Pizza */}
                <circle cx="145" cy="130" r="11" fill="#FACC15" stroke="#1A1A1A" strokeWidth="3" />
              </g>

              {/* Pizza Slice */}
              <g className={animated ? "animate-pizza-feed" : ""}>
                {/* Full Slice */}
                <g className={animated ? "animate-slice-full" : "hidden"}>
                  <path
                    d="M 190 70 Q 210 95 198 125 L 182 120 Q 194 95 178 72 Z"
                    fill="#B45309"
                    stroke="#1A1A1A"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 188 68 C 215 95 205 125 196 128 C 185 120 195 95 175 70 Z"
                    fill="#D97706"
                    stroke="#1A1A1A"
                    strokeWidth="3"
                  />
                  <path
                    d="M 182 73 L 132 105 L 186 118 Q 192 95 182 73 Z"
                    fill="#FACC15"
                    stroke="#1A1A1A"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 180 76 Q 188 95 183 115"
                    stroke="#DC2626"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle cx="168" cy="88" r="6" fill="#DC2626" stroke="#1A1A1A" strokeWidth="2" />
                  <circle cx="168" cy="88" r="4.5" fill="#B91C1C" />
                  <circle cx="152" cy="102" r="5.5" fill="#DC2626" stroke="#1A1A1A" strokeWidth="2" />
                  <circle cx="152" cy="102" r="4" fill="#B91C1C" />
                  <circle cx="172" cy="108" r="5" fill="#DC2626" stroke="#1A1A1A" strokeWidth="2" />
                </g>

                {/* Bitten Slice */}
                <g className={animated ? "animate-slice-bitten" : ""}>
                  <path
                    d="M 188 68 C 215 95 205 125 196 128 C 185 120 195 95 175 70 Z"
                    fill="#D97706"
                    stroke="#1A1A1A"
                    strokeWidth="3"
                  />
                  <path
                    d="M 182 73 L 148 93 Q 142 98 147 104 Q 140 110 148 114 L 186 118 Q 192 95 182 73 Z"
                    fill="#FACC15"
                    stroke="#1A1A1A"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 180 76 Q 188 95 183 115"
                    stroke="#DC2626"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle cx="168" cy="88" r="6" fill="#DC2626" stroke="#1A1A1A" strokeWidth="2" />
                  <circle cx="172" cy="108" r="5" fill="#DC2626" stroke="#1A1A1A" strokeWidth="2" />
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
            </>
          )}
        </svg>
      </div>

      {animated && (
        <style>{`
          /* Eating Animations */
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
          @keyframes steamRise {
            0% { opacity: 0; transform: translateY(4px); }
            50% { opacity: 0.8; transform: translateY(-4px); }
            100% { opacity: 0; transform: translateY(-10px); }
          }
          .animate-steam {
            animation: steamRise 1.8s ease-in-out infinite;
          }

          /* Thank-You Animations (Bowing & Heart Rise) */
          @keyframes mascotBow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            35% { transform: translateY(5px) rotate(3deg); }
            65% { transform: translateY(4px) rotate(2deg); }
            80% { transform: translateY(1px) rotate(0.5deg); }
          }
          .animate-mascot-bow {
            animation: mascotBow 2.2s ease-in-out infinite;
            transform-origin: 95px 125px;
          }
          @keyframes handsPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          .animate-hands-pulse {
            animation: handsPulse 1.6s ease-in-out infinite;
            transform-origin: 95px 124px;
          }
          @keyframes heartRise1 {
            0% { opacity: 0; transform: translate(0, 10px) scale(0.5); }
            30% { opacity: 0.9; transform: translate(-3px, -5px) scale(1.1); }
            70% { opacity: 0.8; transform: translate(-6px, -20px) scale(1); }
            100% { opacity: 0; transform: translate(-8px, -35px) scale(0.7); }
          }
          .animate-heart-rise-1 {
            animation: heartRise1 2.2s ease-out infinite;
          }
          @keyframes heartRise2 {
            0% { opacity: 0; transform: translate(0, 8px) scale(0.4); }
            40% { opacity: 0.85; transform: translate(4px, -8px) scale(1); }
            80% { opacity: 0.6; transform: translate(8px, -24px) scale(0.85); }
            100% { opacity: 0; transform: translate(10px, -36px) scale(0.6); }
          }
          .animate-heart-rise-2 {
            animation: heartRise2 2.2s 0.6s ease-out infinite;
          }

          /* Waving Animations (Arm Wave & Cheer) */
          @keyframes armWave {
            0%, 100% { transform: rotate(-8deg); }
            50% { transform: rotate(16deg); }
          }
          .animate-arm-wave {
            animation: armWave 1.4s ease-in-out infinite;
            transform-origin: 112px 108px;
          }
          @keyframes mascotCheer {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-4px) rotate(1deg); }
          }
          .animate-mascot-cheer {
            animation: mascotCheer 1.4s ease-in-out infinite;
            transform-origin: 88px 120px;
          }
          @keyframes upArrowMove {
            0%, 100% { transform: translateY(0px); opacity: 0.4; }
            50% { transform: translateY(-8px); opacity: 1; }
          }
          .animate-up-arrow {
            animation: upArrowMove 1.4s ease-in-out infinite;
          }
        `}</style>
      )}
    </div>
  );
}
