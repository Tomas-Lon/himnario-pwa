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
    <nav className="tab-bar bg-white border-t border-ios-separator">
      <div className="flex">
        {TABS.map(({ id, label, Icon, ActiveIcon }) => {
          const active = activeTab === id
          const Ic = active ? ActiveIcon : Icon
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-0.5 
                transition-colors active:opacity-60
                ${active ? 'text-ios-blue' : 'text-ios-gray'}`}
            >
              <Ic className="w-6 h-6" />
              <span className={`text-[10px] font-medium ${active ? 'text-ios-blue' : 'text-ios-gray'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
