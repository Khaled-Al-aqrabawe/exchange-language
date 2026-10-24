import { AlertCircle, GraduationCap } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../constants'
import { CEFR_LEVELS, hasExam } from '../data/placementExams'
import LevelExamModal from './LevelExamModal'

function without(obj, key) {
  const copy = { ...obj }
  delete copy[key]
  return copy
}

// Pick languages and a CEFR level for each one (by choice or via the placement exam).
// Any level can be chosen in both modes.
export default function LanguageLevelPicker({ mode, selected, levels, onChange }) {
  const { t } = useTranslation()
  const [examFor, setExamFor] = useState(null)
  const [notice, setNotice] = useState('')

  const toggle = (lang) => {
    setNotice('')
    if (selected.includes(lang)) onChange(selected.filter((l) => l !== lang), levels)
    else onChange([...selected, lang], levels)
  }

  const setLevel = (lang, level) => {
    setNotice('')
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
              className="rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
              style={on
                ? { background: 'var(--gradient-brand)', color: 'var(--accent-ink)', border: '1px solid transparent' }
                : { background: 'var(--surface)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}
            >
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
        <div className="mt-4 space-y-2">
          {selected.map((lang) => (
            <div
              key={lang}
              className="flex flex-wrap items-center gap-3 rounded-xl px-3.5 py-2.5"
              style={{ border: '1px solid var(--line)', background: 'var(--surface-2)' }}
            >
              <span className="font-medium text-sm min-w-24" style={{ color: 'var(--ink)' }}>{lang}</span>
              <select
                value={levels[lang] || ''}
                onChange={(e) => setLevel(lang, e.target.value)}
                className="rounded-lg px-3 py-1.5 text-sm"
                style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
              >
                <option value="">{t('levelExam.chooseLevel')}</option>
                {CEFR_LEVELS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
              </select>
              {hasExam(lang) && (
                <button type="button" onClick={() => setExamFor(lang)} className="lp-btn-secondary text-xs" style={{ padding: '0.4rem 0.8rem' }}>
                  <GraduationCap size={14} /> {t('levelExam.takeExam')}
                </button>
              )}
              {!levels[lang] && <span className="text-xs" style={{ color: '#c1443d' }}>{t('levelExam.required')}</span>}
            </div>
          ))}
        </div>
      )}

      {examFor && <LevelExamModal language={examFor} onClose={() => setExamFor(null)} onFinish={finishExam} />}
    </div>
  )
}
