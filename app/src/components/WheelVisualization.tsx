import type { Dot } from "@/lib/types";
import { calculateDTE } from "@/lib/state-machine";

/**
 * The Wheel — the visual soul of Wheelhouse.
 *
 * The ring represents the full wheel cycle:
 *   CSPs: 12 o'clock → 6 o'clock (right arc, descending)
 *   CCs:  6 o'clock → 12 o'clock (left arc, ascending)
 *
 * One full visual rotation = one full wheel cycle.
 * Assignment happens at 6 o'clock. Called away happens at 12 o'clock.
 *
 * Dots move along their arc based on time-to-expiry.
 * Idle dots sit on the sideline below.
 */

const RING_SIZE = 260;
const RING_CX = RING_SIZE / 2;
const RING_CY = RING_SIZE / 2;
const RING_RADIUS = 95;
const DOT_RADIUS = 16;

const STATE_COLORS: Record<string, string> = {
  "idle-cash": "#94a3b8",
  "idle-shares": "#38bdf8",
  "csp-active": "#a78bfa",
  "cc-active": "#34d399",
};

const STATE_LABELS: Record<string, string> = {
  "idle-cash": "$",
  "idle-shares": "S",
  "csp-active": "CSP",
  "cc-active": "CC",
};

interface WheelVisualizationProps {
  dots: Dot[];
  onDotClick?: (dot: Dot) => void;
  onStartWheeling?: () => void;
  onAddContract?: () => void;
}

/**
 * Position a dot on its half of the ring based on DTE.
 *
 * CSP: starts at 12 o'clock (-π/2), moves clockwise to 6 o'clock (π/2)
 * CC:  starts at 6 o'clock (π/2), moves clockwise to 12 o'clock (3π/2 = -π/2)
 *
 * Fresh contract (full DTE) → start of its arc
 * Near expiry (0 DTE) → end of its arc
 */
function dotToAngle(dot: Dot): number {
  const maxDte = 60;
  const dte = dot.currentExpiry ? calculateDTE(dot.currentExpiry) : maxDte;
  // progress: 0 = just opened, 1 = at expiry
  const progress = 1 - Math.max(0, Math.min(dte, maxDte)) / maxDte;

  if (dot.state === "csp-active") {
    // 12 o'clock (-π/2) → 6 o'clock (π/2) — right side arc
    return -Math.PI / 2 + progress * Math.PI;
  }
  // cc-active: 6 o'clock (π/2) → 12 o'clock (3π/2) — left side arc
  return Math.PI / 2 + progress * Math.PI;
}

export function WheelVisualization({
  dots,
  onDotClick,
  onStartWheeling,
  onAddContract,
}: WheelVisualizationProps) {
  const activeDots = dots.filter(
    (d) => d.state === "csp-active" || d.state === "cc-active"
  );
  const idleDots = dots.filter(
    (d) => d.state === "idle-cash" || d.state === "idle-shares"
  );
  const isEmpty = dots.length === 0;
  const hasAnyDots = dots.length > 0;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="overflow-visible"
      >
        {/* Ring outline */}
        <circle
          cx={RING_CX}
          cy={RING_CY}
          r={RING_RADIUS}
          fill="none"
          stroke={isEmpty ? "#334155" : "#475569"}
          strokeWidth={isEmpty ? 1 : 2}
          strokeDasharray={isEmpty ? "6 4" : "none"}
          opacity={isEmpty ? 0.5 : 1}
        />

        {/* Phase labels at 12 and 6 o'clock */}
        {!isEmpty && (
          <>
            {/* 12 o'clock — where CCs complete / CSPs begin */}
            <text
              x={RING_CX}
              y={RING_CY - RING_RADIUS - 14}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={9}
              opacity={0.6}
            >
              CASH
            </text>

            {/* 6 o'clock — where CSPs complete (assignment) / CCs begin */}
            <text
              x={RING_CX}
              y={RING_CY + RING_RADIUS + 20}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={9}
              opacity={0.6}
            >
              SHARES
            </text>

            {/* Right arc label — CSP territory */}
            <text
              x={RING_CX + RING_RADIUS + 16}
              y={RING_CY + 3}
              textAnchor="start"
              fill="#a78bfa"
              fontSize={8}
              opacity={0.4}
            >
              CSP ↓
            </text>

            {/* Left arc label — CC territory */}
            <text
              x={RING_CX - RING_RADIUS - 16}
              y={RING_CY + 3}
              textAnchor="end"
              fill="#34d399"
              fontSize={8}
              opacity={0.4}
            >
              ↑ CC
            </text>
          </>
        )}

        {/* Tick marks at 12 and 6 o'clock */}
        {!isEmpty && [0, 180].map((deg) => {
          const rad = (deg - 90) * (Math.PI / 180);
          const innerR = RING_RADIUS - 5;
          const outerR = RING_RADIUS + 5;
          return (
            <line
              key={deg}
              x1={RING_CX + innerR * Math.cos(rad)}
              y1={RING_CY + innerR * Math.sin(rad)}
              x2={RING_CX + outerR * Math.cos(rad)}
              y2={RING_CY + outerR * Math.sin(rad)}
              stroke="#64748b"
              strokeWidth={2}
              opacity={0.3}
            />
          );
        })}

        {/* Center content */}
        {isEmpty ? (
          <text
            x={RING_CX}
            y={RING_CY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94a3b8"
            fontSize={13}
            opacity={0.6}
          >
            No active contracts
          </text>
        ) : (
          <>
            <text
              x={RING_CX}
              y={RING_CY - 8}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#f1f5f9"
              fontSize={22}
              fontWeight="bold"
            >
              {activeDots.length}
            </text>
            <text
              x={RING_CX}
              y={RING_CY + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#94a3b8"
              fontSize={11}
            >
              active
            </text>
          </>
        )}

        {/* Active dots on the ring */}
        {activeDots.map((dot) => {
          const angle = dotToAngle(dot);
          const x = RING_CX + RING_RADIUS * Math.cos(angle);
          const y = RING_CY + RING_RADIUS * Math.sin(angle);
          const color = STATE_COLORS[dot.state];
          const dte = dot.currentExpiry ? calculateDTE(dot.currentExpiry) : null;

          return (
            <g
              key={dot.id}
              onClick={() => onDotClick?.(dot)}
              className="cursor-pointer"
            >
              <circle cx={x} cy={y} r={DOT_RADIUS + 3} fill={color} opacity={0.15} />
              <circle
                cx={x}
                cy={y}
                r={DOT_RADIUS}
                fill={color}
                opacity={0.9}
                className="transition-all hover:opacity-100"
              />
              <text
                x={x}
                y={y - 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#0f172a"
                fontSize={9}
                fontWeight="700"
              >
                {STATE_LABELS[dot.state]}
              </text>
              {dte !== null && (
                <text
                  x={x}
                  y={y + DOT_RADIUS + 12}
                  textAnchor="middle"
                  fill={color}
                  fontSize={9}
                  fontWeight="500"
                >
                  {dte}d
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Sideline — idle dots */}
      {idleDots.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-center text-xs text-wh-text-muted">
            Sideline
          </div>
          <div className="flex gap-2">
            {idleDots.map((dot) => {
              const color = STATE_COLORS[dot.state];
              const isShares = dot.state === "idle-shares";
              return (
                <button
                  key={dot.id}
                  onClick={() => onDotClick?.(dot)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all hover:scale-110"
                  style={{
                    borderColor: color,
                    backgroundColor: isShares ? color : "transparent",
                    color: isShares ? "#0f172a" : color,
                  }}
                >
                  {isShares ? "S" : "$"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        {isEmpty && onStartWheeling && (
          <button
            onClick={onStartWheeling}
            className="rounded-lg bg-wh-accent px-6 py-2.5 text-sm font-medium text-wh-bg transition-colors hover:bg-wh-accent-hover"
          >
            Start Wheeling
          </button>
        )}
        {hasAnyDots && onAddContract && (
          <button
            onClick={onAddContract}
            className="rounded-lg border border-wh-accent/50 px-4 py-2 text-sm text-wh-accent transition-colors hover:bg-wh-accent/10"
          >
            + Add Contract
          </button>
        )}
      </div>
    </div>
  );
}
