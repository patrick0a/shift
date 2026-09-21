'use client'

import type { ClientState } from '@/game/redact'
import type { Player, Role, Team } from '@/game/types'

const ROLE_LABEL: Record<Role, string> = {
  spymaster: 'قائد تجسس',
  operative: 'عميل ميداني',
  both: 'مزدوج',
}

/** نص مختصر يصلح لأزرار ضيّقة بثلاثة أعمدة. */
const ROLE_SHORT: Record<Role, string> = {
  spymaster: 'قائد',
  operative: 'عميل',
  both: 'مزدوج',
}

const TEAM_LABEL: Record<Team, string> = {
  red: 'الفريق الأحمر',
  blue: 'الفريق الأزرق',
}

function Roster({ players, team }: { players: Player[]; team: Team }) {
  if (players.length === 0) {
    return <p className="px-1 py-2 text-[13px] text-muted/70">لا يوجد عملاء بعد</p>
  }
  const order: Role[] = ['spymaster', 'both', 'operative']
  const sorted = [...players].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))

  return (
    <ul className="flex flex-col gap-1">
      {sorted.map((p) => {
        const keyHolder = p.role === 'spymaster' || p.role === 'both'
        return (
          <li key={p.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[13.5px]">
            <span
              aria-hidden
              title={p.connected ? 'متصل' : 'غير متصل'}
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                p.connected ? (team === 'red' ? 'bg-flame' : 'bg-aqua') : 'bg-muted/40'
              }`}
            />
            <span className={`truncate font-medium ${p.connected ? 'text-ink' : 'text-muted/60'}`}>
              {p.name}
              {p.host && (
                <span className="ms-1 text-[11px] text-gold" title="المضيف">
                  ★
                </span>
              )}
            </span>
            <span
              className={`ms-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                keyHolder
                  ? team === 'red'
                    ? 'bg-flame-mist text-flame'
                    : 'bg-aqua-mist text-aqua'
                  : 'bg-ink/6 text-muted'
              }`}
            >
              {ROLE_LABEL[p.role]}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function SeatButtons({
  team,
  you,
  disabled,
  onSeat,
}: {
  team: Team
  you: Player | undefined
  disabled: boolean
  onSeat: (team: Team | null, role: Role) => void
}) {
  const roles: Role[] = ['spymaster', 'operative', 'both']
  const accent =
    team === 'red'
      ? 'border-flame/45 bg-flame-mist text-flame'
      : 'border-aqua/45 bg-aqua-mist text-aqua'

  return (
    <div className="mt-2.5 grid grid-cols-3 gap-1">
      {roles.map((role) => {
        const mine = you?.team === team && you.role === role
        return (
          <button
            key={role}
            disabled={disabled}
            onClick={() => onSeat(mine ? null : team, role)}
            title={
              role === 'both'
                ? 'تلعب دور قائد التجسس والعميل معًا — مناسب لمواجهة ١ ضد ١'
                : `انضم بصفة ${ROLE_LABEL[role]}`
            }
            className={[
              'rounded-lg border px-1 py-1.5 text-[11.5px] font-bold transition',
              mine ? accent : 'border-white bg-white/70 text-muted hover:bg-white hover:text-ink',
              disabled ? 'cursor-not-allowed opacity-45' : 'active:scale-[0.96]',
            ].join(' ')}
          >
            {ROLE_SHORT[role]}
          </button>
        )
      })}
    </div>
  )
}

export function Squads({
  state,
  onSeat,
}: {
  state: ClientState
  onSeat: (team: Team | null, role: Role) => void
}) {
  const you = state.players.find((p) => p.id === state.youId)
  const locked = state.phase === 'clue' || state.phase === 'guess'
  const spectators = state.players.filter((p) => p.team === null)

  return (
    <div className="flex flex-col gap-2.5">
      {(['red', 'blue'] as Team[]).map((team) => {
        const roster = state.players.filter((p) => p.team === team)
        const active = locked && state.turn === team
        return (
          <section
            key={team}
            className={[
              'glass rounded-2xl p-3 transition-all duration-300',
              active ? (team === 'red' ? 'glow-flame' : 'glow-aqua') : '',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className={`h-2.5 w-2.5 rounded-full ${
                  team === 'red' ? 'bg-flame' : 'bg-aqua'
                }`}
              />
              <h3
                className={`font-display text-[14px] font-extrabold ${
                  team === 'red' ? 'text-flame' : 'text-aqua'
                }`}
              >
                {TEAM_LABEL[team]}
              </h3>
              {locked && (
                <span className="ms-auto text-[12px] font-bold text-muted">
                  بقي {state.remaining[team]}
                </span>
              )}
            </div>

            <div className="mt-2">
              <Roster players={roster} team={team} />
            </div>

            <SeatButtons team={team} you={you} disabled={locked} onSeat={onSeat} />
          </section>
        )
      })}

      {spectators.length > 0 && (
        <section className="glass rounded-2xl px-3 py-2.5">
          <h3 className="text-[12px] font-bold text-muted">
            يتابعون · {spectators.length}
          </h3>
          <p className="mt-1 truncate text-[13px] text-ink-soft">
            {spectators.map((p) => p.name).join('، ')}
          </p>
        </section>
      )}
    </div>
  )
}
