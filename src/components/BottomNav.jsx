import {
  BookOpenIcon,
  FunnelIcon,
  MusicalNoteIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline'
import {
  BookOpenIcon as BookOpenSolid,
  FunnelIcon as FunnelSolid,
  MusicalNoteIcon as MusicalNoteSolid,
  QueueListIcon as QueueListSolid,
} from '@heroicons/react/24/solid'

const TABS = [
  { id: 'home',      label: 'Himnos',   Icon: BookOpenIcon,    ActiveIcon: BookOpenSolid    },
  { id: 'lists',     label: 'Listas',   Icon: QueueListIcon,   ActiveIcon: QueueListSolid   },
  { id: 'musicians', label: 'Músicos',  Icon: MusicalNoteIcon, ActiveIcon: MusicalNoteSolid },
  { id: 'filter',    label: 'Filtros',  Icon: FunnelIcon,      ActiveIcon: FunnelSolid      },
]

export default function BottomNav({ activeTab, onChange }) {
  return (
    <nav className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2">
      <div className="tab-bar rounded-[1.75rem] border border-white/20 bg-[#2d1f1a]/85 backdrop-blur-xl shadow-[0_18px_40px_rgba(0,0,0,0.18)] px-2 py-2">
        <div className="flex items-center justify-between gap-1">
        {TABS.map(({ id, label, Icon, ActiveIcon }) => {
          const active = activeTab === id
          const Ic = active ? ActiveIcon : Icon
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative flex-1 min-w-0 flex items-center justify-center py-2 transition-transform active:scale-95`}
            >
              {active && (
                <span className="absolute inset-x-2 top-1 bottom-1 rounded-[1.1rem] bg-white/15" />
              )}
              <div className="relative flex flex-col items-center justify-center gap-0.5">
                <Ic className={`w-6 h-6 ${active ? 'text-white' : 'text-white/70'}`} />
                <span className={`text-[10px] font-medium leading-none ${active ? 'text-white' : 'text-white/60'}`}>
                  {label}
                </span>
              </div>
            </button>
          )
        })}
        </div>
      </div>
    </nav>
  )
}
