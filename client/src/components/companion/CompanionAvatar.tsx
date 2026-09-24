import {
  motion,
  type TargetAndTransition,
  useReducedMotion,
} from "motion/react";
import React, { useId } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { COMPANION_STATES, type CompanionStateId } from "./companionStates";

export interface CompanionAvatarProps {
  stateId?: CompanionStateId;
  species?: "dog" | "cat" | string;
  size?: number; // default 80
  animated?: boolean; // default true
  className?: string;
  animalName?: string;
}

export const CompanionAvatar = React.memo(function CompanionAvatar({
  stateId = "calm",
  species = "dog",
  size = 80,
  animated = true,
  className = "",
  animalName,
}: CompanionAvatarProps) {
  const { t, language } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && !prefersReducedMotion;
  const filterId = useId();

  const isCat = species?.toLowerCase() === "cat";
  const config = COMPANION_STATES[stateId] || COMPANION_STATES.calm;

  // Accessible label
  const namePlaceholder =
    animalName || (language === "pt" ? "O teu animal" : "Your pet");
  const ariaLabel = (
    t(config.ariaLabelKey as any) ||
    (language === "pt"
      ? `Companheiro emocional: ${namePlaceholder} está ${config.fallbackLabelPt.toLowerCase()}`
      : `Emotional companion: ${namePlaceholder} is ${config.fallbackLabelEn.toLowerCase()}`)
  ).replace("{{name}}", namePlaceholder);

  // Micro-motion variants depending on emotional state
  const headMotion: TargetAndTransition = shouldAnimate
    ? stateId === "calm"
      ? {
          scale: [1, 1.025, 1],
          transition: {
            duration: 3.2,
            repeat: Infinity,
            ease: "easeInOut" as const,
          },
        }
      : stateId === "curious"
        ? {
            rotate: [0, -3.5, 3.5, 0],
            transition: {
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut" as const,
            },
          }
        : stateId === "alert"
          ? {
              x: [-0.8, 0.8, -0.8],
              transition: {
                duration: 0.4,
                repeat: Infinity,
                ease: "linear" as const,
              },
            }
          : stateId === "worried"
            ? {
                rotate: [0, -6, 0],
                transition: {
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "easeInOut" as const,
                },
              }
            : stateId === "sleeping"
              ? {
                  y: [0, 1.2, 0],
                  transition: {
                    duration: 3.5,
                    repeat: Infinity,
                    ease: "easeInOut" as const,
                  },
                }
              : {}
    : {};

  const earMotion: TargetAndTransition = shouldAnimate
    ? stateId === "curious"
      ? {
          rotate: [0, -7, 0],
          transition: {
            duration: 1.4,
            repeat: Infinity,
            ease: "easeInOut" as const,
          },
        }
      : stateId === "alert"
        ? {
            scale: [1, 1.06, 1],
            transition: {
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut" as const,
            },
          }
        : {}
    : {};

  const eyeBlinkMotion: TargetAndTransition =
    shouldAnimate && stateId !== "sleeping"
      ? {
          scaleY: [1, 1, 0.1, 1, 1],
          transition: {
            duration: stateId === "attentive" ? 4.5 : 3.5,
            repeat: Infinity,
            times: [0, 0.9, 0.93, 0.96, 1],
            ease: "easeInOut" as const,
          },
        }
      : {};

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="w-full h-full overflow-visible"
        style={{
          // Use CSS token for the accent color
          color: config.colorVar,
        }}
      >
        <defs>
          <filter
            id={`soft-glow-${filterId}`}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="4"
              floodColor="currentColor"
              floodOpacity="0.18"
            />
          </filter>
        </defs>

        {/* Ambient Halo / Glow */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="currentColor"
          fillOpacity="0.08"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.25"
          strokeDasharray={stateId === "sleeping" ? "4 4" : undefined}
        />

        {/* Main Animated Character Head Container */}
        <motion.g animate={headMotion} style={{ transformOrigin: "50px 60px" }}>
          {/* Ears Layer */}
          {isCat ? (
            /* Cat triangular ears */
            <motion.g
              animate={earMotion}
              style={{ transformOrigin: "50px 35px" }}
            >
              {/* Left ear */}
              <polygon
                points="24,36 18,12 40,26"
                fill="var(--card)"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <polygon
                points="26,33 21,17 37,26"
                fill="currentColor"
                fillOpacity="0.15"
              />

              {/* Right ear */}
              <polygon
                points="76,36 82,12 60,26"
                fill="var(--card)"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <polygon
                points="74,33 79,17 63,26"
                fill="currentColor"
                fillOpacity="0.15"
              />
            </motion.g>
          ) : (
            /* Dog floppy / semi-perked ears */
            <motion.g
              animate={earMotion}
              style={{ transformOrigin: "50px 35px" }}
            >
              {/* Left ear */}
              <path
                d="M 27 30 C 14 36 10 54 18 64 C 24 70 30 62 30 48 Z"
                fill="var(--card)"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M 25 36 C 17 42 15 54 21 60 C 24 62 27 56 27 46 Z"
                fill="currentColor"
                fillOpacity="0.14"
              />

              {/* Right ear */}
              <path
                d="M 73 30 C 86 36 90 54 82 64 C 76 70 70 62 70 48 Z"
                fill="var(--card)"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M 75 36 C 83 42 85 54 79 60 C 76 62 73 56 73 46 Z"
                fill="currentColor"
                fillOpacity="0.14"
              />
            </motion.g>
          )}

          {/* Head Body */}
          <rect
            x="24"
            y="26"
            width="52"
            height="50"
            rx="24"
            fill="var(--card)"
            stroke="currentColor"
            strokeWidth="2.5"
            filter={`url(#soft-glow-${filterId})`}
          />

          {/* Facial Features */}
          {stateId === "sleeping" ? (
            /* Sleeping: Closed serene eyes */
            <g
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            >
              <path d="M 34 49 Q 39 45 44 49" />
              <path d="M 56 49 Q 61 45 66 49" />
            </g>
          ) : (
            /* Awake Eyes (with gentle blink) */
            <motion.g
              animate={eyeBlinkMotion}
              style={{ transformOrigin: "50px 48px" }}
            >
              {/* Left Eye */}
              <circle cx="39" cy="48" r="4.2" fill="currentColor" />
              <circle cx="40.5" cy="46.5" r="1.3" fill="var(--card)" />

              {/* Right Eye */}
              <circle cx="61" cy="48" r="4.2" fill="currentColor" />
              <circle cx="62.5" cy="46.5" r="1.3" fill="var(--card)" />
            </motion.g>
          )}

          {/* Nose */}
          {isCat ? (
            <polygon
              points="50,57 46,53 54,53"
              fill="currentColor"
              strokeLinejoin="round"
            />
          ) : (
            <ellipse cx="50" cy="56" rx="4.5" ry="3.2" fill="currentColor" />
          )}

          {/* Mouth */}
          <g
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          >
            {stateId === "worried" ? (
              // Slight downturned empathetic mouth
              <path d="M 45 65 Q 50 61 55 65" />
            ) : stateId === "curious" || stateId === "calm" ? (
              // Gentle sweet smile
              <>
                <path d="M 50 58 Q 45 64 42 62" />
                <path d="M 50 58 Q 55 64 58 62" />
              </>
            ) : (
              // Neutral serene mouth
              <path d="M 46 62 Q 50 64 54 62" />
            )}
          </g>

          {/* Cheeks blush (calm, curious) */}
          {(stateId === "calm" || stateId === "curious") && (
            <>
              <circle
                cx="32"
                cy="55"
                r="3"
                fill="currentColor"
                fillOpacity="0.16"
              />
              <circle
                cx="68"
                cy="55"
                r="3"
                fill="currentColor"
                fillOpacity="0.16"
              />
            </>
          )}
        </motion.g>

        {/* State-specific Overlays */}
        {stateId === "sleeping" && (
          /* Floating Zzz */
          <motion.g
            initial={{ opacity: 0.3, y: 0 }}
            animate={
              shouldAnimate
                ? {
                    opacity: [0.2, 0.9, 0.2],
                    y: [-1, -5, -1],
                    transition: {
                      duration: 2.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }
                : {}
            }
            fill="currentColor"
            fontSize="10"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            <text x="70" y="24" opacity="0.8">
              z
            </text>
            <text x="77" y="16" opacity="0.6" fontSize="8">
              z
            </text>
          </motion.g>
        )}

        {stateId === "hungry" && (
          /* Minimalist Food Bowl at bottom */
          <motion.g
            animate={
              shouldAnimate
                ? {
                    scale: [1, 1.1, 1],
                    transition: {
                      duration: 1.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }
                : {}
            }
            style={{ transformOrigin: "50px 84px" }}
          >
            <path
              d="M 43 82 L 57 82 C 56 86 44 86 43 82 Z"
              fill="currentColor"
              stroke="var(--card)"
              strokeWidth="1"
            />
          </motion.g>
        )}
      </svg>
    </div>
  );
});
