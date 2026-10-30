import { AlertCircle, Check, GraduationCap } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../constants'
import { CEFR_LEVELS, hasExam } from '../data/placementExams'
import LevelExamModal from './LevelExamModal'

// Languages you speak (and can help others with) need at least this level.
const MIN_SPEAK_INDEX = CEFR_LEVELS.indexOf('B1')

function without(obj, key) {
  const copy = { ...obj }
  delete copy[key]
  return copy
}

// Pick languages and a CEFR level for each one (by choice or via the placement exam).
// Any level can be chosen in both modes.
export default function LanguageLevelPicker({ mode, selected, levels, onChange, single = false }) {
  const { t } = useTranslation()
  const [examFor, setExamFor] = useState(null)
  const [notice, setNotice] = useState('')

  const toggle = (lang) => {
    setNotice('')
    // With `single`, choosing a language replaces the previous one (and its level).
    if (single) onChange([lang], selected[0] === lang ? levels : without(levels, selected[0]))
    else if (selected.includes(lang)) onChange(selected.filter((l) => l !== lang), levels)
    else onChange([...selected, lang], levels)
  }

  const speaking = mode === 'speak'
  const allowed = speaking ? CEFR_LEVELS.slice(MIN_SPEAK_INDEX) : CEFR_LEVELS

  const setLevel = (lang, level) => {
    setNotice('')
    if (speaking && level && !allowed.includes(level)) {
      setNotice(t('levelExam.speakMin'))
      onChange(selected, without(levels, lang))
      return
    }
    if (!level) {
      onChange(selected, without(levels, lang))
    } else {
      onChange(selected, { ...levels, [lang]: level })
    }
  }

  const finishExam = (level) => {
    const lang = examFor
    setExamFor(null)
    setLevel(lang, level)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map((l) => {
          const on = selected.includes(l)
          return (
            <button
              key={l}
              type="button"
              onClick={() => toggle(l)}
              aria-pressed={on}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-px"
              style={on
                ? { background: 'var(--gradient-brand)', color: 'var(--accent-ink)', border: '1px solid transparent', boxShadow: '0 8px 18px -10px rgb(20 184 166 / 0.9)' }
                : { background: 'var(--surface)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}
            >
              {on && <Check size={14} strokeWidth={3} />}
              {l}
            </button>
          )
        })}
      </div>

      {notice && (
        <p
          className="mt-3 flex items-start gap-2 text-sm rounded-xl px-3.5 py-2.5"
          style={{ background: 'color-mix(in srgb, #c1443d 10%, var(--surface))', color: '#c1443d' }}
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {notice}
        </p>
      )}

      {selected.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{t('levelExam.yourLevel', 'Your level')}</p>
          {selected.map((lang) => {
            const chosen = allowed.includes(levels[lang])
            return (
              <div
                key={lang}
                className="flex flex-wrap items-center gap-3 rounded-2xl p-3"
                style={{ border: `1px solid ${chosen ? 'var(--line)' : '#e9b8b4'}`, background: 'var(--surface-2)' }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold" style={{ background: 'color-mix(in srgb, var(--accent) 16%, var(--surface))', color: 'var(--accent)' }}>
                  {lang.slice(0, 2)}
                </span>
                <span className="min-w-24 flex-1 text-sm font-bold" style={{ color: 'var(--ink)' }}>{lang}</span>
                <select
                  value={chosen ? levels[lang] : ''}
                  onChange={(e) => setLevel(lang, e.target.value)}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
                >
                  <option value="">{t('levelExam.chooseLevel')}</option>
                  {allowed.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
                </select>
                {hasExam(lang) && (
                  <button type="button" onClick={() => setExamFor(lang)} className="lp-btn-secondary text-xs" style={{ padding: '0.45rem 0.9rem' }}>
                    <GraduationCap size={14} /> {t('levelExam.takeExam')}
                  </button>
                )}
                {!chosen && <span className="basis-full text-xs font-medium" style={{ color: '#c1443d' }}>{t('levelExam.required')}</span>}
              </div>
            )
          })}
        </div>
      )}

      {examFor && <LevelExamModal language={examFor} onClose={() => setExamFor(null)} onFinish={finishExam} />}
    </div>
  )
}
