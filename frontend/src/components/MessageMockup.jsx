import { avatarUrl } from '../utils/images'

const thread = [
  { mine: false, text: 'Hey! Saw you\'re learning Arabic 👋' },
  { mine: true, text: 'Yes! Would love to practice sometime this week' },
  { mine: false, text: 'Let\'s do Thursday evening?' },
]

export default function MessageMockup() {
  return (
    <div className="rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/5 p-5 max-w-sm">
      <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-slate-100">
        <img src={avatarUrl('mockup-partner', 60)} alt="" className="h-8 w-8 rounded-full object-cover" />
        <div>
          <p className="text-sm font-semibold text-slate-900 leading-tight">Sara</p>
          <p className="text-xs text-emerald-600">Online now</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {thread.map((m, i) => (
          <div key={i} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[220px] px-3.5 py-2 rounded-2xl text-sm ${
                m.mine ? 'bg-slate-900 text-white rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div className="flex justify-start">
          <div className="flex items-center gap-1 px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-slate-100">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  )
}
