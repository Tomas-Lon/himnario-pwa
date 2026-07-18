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
    <nav className="fixed bottom-0 left-1/2 z-50 w-[min(calc(100%-1rem),32rem)] sm:w-[min(calc(100%-1.5rem),30rem)] -translate-x-1/2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
      <div className="rounded-[2rem] border border-black/5 bg-white/90 backdrop-blur-2xl shadow-[0_12px_30px_rgba(32,32,32,0.12)] px-2 sm:px-2.5 py-2">
        <div className="flex items-center justify-between gap-1">
        {TABS.map(({ id, label, Icon, ActiveIcon }) => {
          const active = activeTab === id
          const Ic = active ? ActiveIcon : Icon
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="relative flex-1 min-w-0 flex items-center justify-center py-1.5 transition-transform active:scale-95"
            >
              {active && (
                <span className="absolute inset-x-2 top-1 bottom-1 rounded-[1.15rem] bg-[#f2f3f7] shadow-[inset_0_0_0_1px_rgba(17,24,39,0.04)]" />
              )}
              <div className="relative flex flex-col items-center justify-center gap-[2px] leading-none text-center">
                <Ic className={`w-6 h-6 sm:w-[1.55rem] sm:h-[1.55rem] shrink-0 ${active ? 'text-ios-blue' : 'text-gray-400'}`} />
                <span className={`text-[10px] sm:text-[11px] font-medium ${active ? 'text-ios-blue' : 'text-gray-500'}`}>
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
