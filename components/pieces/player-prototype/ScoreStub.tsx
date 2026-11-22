"use client";

// PROTOTYPE (PER-458): a fake following score. Staves, bar numbers and
// made-up noteheads, a cursor that follows the clock, the A–B passage shaded,
// and bars you can tap to mark a passage. Stands in for alphaTab.

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import type { PlayerState } from "./usePlayerState";

const LINE = 5;
const STAFF_H = LINE * 4;
const W = 360;
const LEFT = 34;

function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function stavesOf(state: PlayerState) {
  const staves: { name: string; partIds: string[] }[] = [];
  for (const part of state.fixture.parts) {
    const name = part.staff ?? part.label;
    const staff = staves.find((s) => s.name === name);
    if (staff) staff.partIds.push(part.id);
    else staves.push({ name, partIds: [part.id] });
  }
  return staves;
}

const SYLLABLES = ["Stef", "fan", "var", "en", "stal", "le", "dräng", "vi", "tac", "ka", "nu", "så", "väl"];

export function ScoreStub({
  state,
  barsPerSystem = 4,
  only,
  className,
}: {
  state: PlayerState;
  barsPerSystem?: number;
  /** Show only the system holding the cursor (a one-line strip). */
  only?: "current";
  className?: string;
}) {
  const { fixture } = state;
  const staves = stavesOf(state);
  const lyricH = fixture.verses * 11;
  const staffGap = 16;
  const systemH = 18 + staves.length * (STAFF_H + staffGap) + lyricH;
  const barW = (W - LEFT - 6) / barsPerSystem;
  const systems = Math.ceil(fixture.bars / barsPerSystem);
  const cursorBarFloat = state.position / state.barSeconds;
  const currentSystem = Math.min(systems - 1, Math.floor(cursorBarFloat / barsPerSystem));

  const refs = useRef<(SVGSVGElement | null)[]>([]);
  useEffect(() => {
    if (!state.playing || only) return;
    refs.current[currentSystem]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentSystem, state.playing, only]);

  const loopA = state.loop ? state.loop.a / state.barSeconds : null;
  const loopB = state.loop?.b != null ? state.loop.b / state.barSeconds : null;

  const indices = only ? [currentSystem] : Array.from({ length: systems }, (_, i) => i);

  return (
    <div className={cn("space-y-1", className)}>
      {indices.map((sys) => {
        const firstBar = sys * barsPerSystem;
        const barsHere = Math.min(barsPerSystem, fixture.bars - firstBar);
        return (
          <svg
            key={sys}
            ref={(el) => {
              refs.current[sys] = el;
            }}
            viewBox={`0 0 ${W} ${systemH}`}
            className="block w-full select-none text-foreground"
          >
            {/* A–B passage */}
            {loopA !== null ? (
              (() => {
                const end = loopB ?? loopA + 1;
                const from = Math.max(loopA, firstBar);
                const to = Math.min(end, firstBar + barsHere);
                if (to <= from) return null;
                return (
                  <rect
                    x={LEFT + (from - firstBar) * barW}
                    y={4}
                    width={(to - from) * barW}
                    height={systemH - 8}
                    className={loopB === null ? "fill-amber-300/30" : "fill-amber-300/45"}
                  />
                );
              })()
            ) : null}

            {staves.map((staff, si) => {
              const top = 18 + si * (STAFF_H + staffGap) + (si > 0 ? lyricH : 0);
              const level =
                staff.partIds.reduce((sum, id) => sum + (state.audible[id] ?? 80), 0) / staff.partIds.length;
              return (
                <g key={staff.name} opacity={0.25 + 0.75 * (level / 100)}>
                  <text x={0} y={top + STAFF_H / 2 + 3} className="fill-muted-foreground text-[7px]">
                    {staff.name.slice(0, 6)}
                  </text>
                  {Array.from({ length: LINE }, (_, l) => (
                    <line
                      key={l}
                      x1={LEFT}
                      x2={LEFT + barsHere * barW}
                      y1={top + l * 4 * (STAFF_H / 16)}
                      y2={top + l * 4 * (STAFF_H / 16)}
                      stroke="currentColor"
                      strokeWidth={0.4}
                    />
                  ))}
                  {Array.from({ length: barsHere + 1 }, (_, b) => (
                    <line
                      key={b}
                      x1={LEFT + b * barW}
                      x2={LEFT + b * barW}
                      y1={top}
                      y2={top + STAFF_H}
                      stroke="currentColor"
                      strokeWidth={0.6}
                    />
                  ))}
                  {Array.from({ length: barsHere }, (_, b) =>
                    Array.from({ length: fixture.beatsPerBar }, (_, beat) =>
                      staff.partIds.map((id, vi) => {
                        const seed = (firstBar + b) * 31 + beat * 7 + si * 101 + vi * 13;
                        const y = top + 2 + rand(seed) * (STAFF_H - 4) + (vi === 1 ? 4 : 0);
                        const x =
                          LEFT + b * barW + 8 + (beat * (barW - 12)) / fixture.beatsPerBar + (vi === 1 ? 3 : 0);
                        const up = vi === 0;
                        const heard = (state.audible[id] ?? 80) > 0;
                        return (
                          <g key={`${b}-${beat}-${id}`} opacity={heard ? 1 : 0.3}>
                            <ellipse cx={x} cy={y} rx={2.4} ry={1.7} fill="currentColor" />
                            <line
                              x1={up ? x + 2.3 : x - 2.3}
                              x2={up ? x + 2.3 : x - 2.3}
                              y1={y}
                              y2={up ? y - 10 : y + 10}
                              stroke="currentColor"
                              strokeWidth={0.5}
                            />
                          </g>
                        );
                      })
                    )
                  )}
                  {si === 0 && fixture.verses > 0
                    ? Array.from({ length: fixture.verses }, (_, v) =>
                        Array.from({ length: barsHere * fixture.beatsPerBar }, (_, k) => (
                          <text
                            key={`${v}-${k}`}
                            x={LEFT + 6 + (k * barW) / fixture.beatsPerBar}
                            y={top + STAFF_H + 9 + v * 11}
                            className="fill-foreground text-[6.5px]"
                          >
                            {k === 0 && firstBar === 0 ? `${v + 1}. ` : ""}
                            {SYLLABLES[(firstBar * 3 + k + v * 5) % SYLLABLES.length]}
                          </text>
                        ))
                      )
                    : null}
                </g>
              );
            })}

            {/* bar numbers and tap targets */}
            {Array.from({ length: barsHere }, (_, b) => (
              <g key={b}>
                <text x={LEFT + b * barW + 1} y={11} className="fill-muted-foreground text-[7px]">
                  {firstBar + b + 1}
                </text>
                <rect
                  x={LEFT + b * barW}
                  y={0}
                  width={barW}
                  height={systemH}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => state.tapBar(firstBar + b + 1)}
                  onDoubleClick={() => state.seek((firstBar + b) * state.barSeconds)}
                />
              </g>
            ))}

            {sys === currentSystem ? (
              <line
                x1={LEFT + (cursorBarFloat - firstBar) * barW}
                x2={LEFT + (cursorBarFloat - firstBar) * barW}
                y1={6}
                y2={systemH - 4}
                className="stroke-primary"
                strokeWidth={1.4}
                pointerEvents="none"
              />
            ) : null}
          </svg>
        );
      })}
    </div>
  );
}
