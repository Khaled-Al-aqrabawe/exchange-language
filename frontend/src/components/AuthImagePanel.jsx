import { Languages } from 'lucide-react'
import { avatarUrl } from '../utils/images'

const chipSeeds = ['auth-1', 'auth-2', 'auth-3']

export default function AuthImagePanel({ quote }) {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 bg-dots p-10">
      <div className="pointer-events-none absolute -top-32 -right-20 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />

      <div className="relative flex items-center gap-2 text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
          <Languages size={18} />
        </span>
        <span className="font-bold tracking-tight">Language Partner</span>
      </div>

      <div className="relative">
        <div className="flex -space-x-3 mb-6">
          {chipSeeds.map((seed) => (
            <img key={seed} src={avatarUrl(seed, 64)} alt="" className="h-10 w-10 rounded-full ring-2 ring-slate-950 object-cover" />
          ))}
        </div>
        <p className="text-white text-2xl font-medium leading-snug max-w-sm tracking-tight">
          {quote}
        </p>
      </div>
    </div>
  )
}
