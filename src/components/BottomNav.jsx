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
    <nav className="fixed bottom-3 left-1/2 z-50 w-[min(calc(100%-1rem),32rem)] sm:w-[min(calc(100%-1.5rem),30rem)] -translate-x-1/2">
      <div className="tab-bar rounded-[2rem] border border-black/5 bg-white/88 backdrop-blur-2xl shadow-[0_16px_36px_rgba(32,32,32,0.12)] px-2 sm:px-2.5 py-2">
        <div className="flex items-center justify-between gap-1">
        {TABS.map(({ id, label, Icon, ActiveIcon }) => {
          const active = activeTab === id
          const Ic = active ? ActiveIcon : Icon
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative flex-1 min-w-0 flex items-center justify-center py-1.5 sm:py-2 transition-transform active:scale-95`}
            >
              {active && (
                <span className="absolute inset-x-2 top-1 bottom-1 rounded-[1.15rem] bg-[#f2f3f7] shadow-[inset_0_0_0_1px_rgba(17,24,39,0.04)]" />
              )}
              <div className="relative flex flex-col items-center justify-center gap-0.5">
                <Ic className={`w-4 h-4 sm:w-5 sm:h-5 ${active ? 'text-ios-blue' : 'text-gray-400'}`} />
                <span className={`text-[9px] sm:text-[10px] font-medium leading-none ${active ? 'text-ios-blue' : 'text-gray-500'}`}>
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
