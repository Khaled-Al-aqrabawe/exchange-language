import { CheckCircle2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PLACEMENT_EXAMS, isRtlLanguage, scoreExam } from '../data/placementExams'

export default function LevelExamModal({ language, onClose, onFinish }) {
  const { t } = useTranslation()
  const questions = PLACEMENT_EXAMS[language]
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)
  const rtl = isRtlLanguage(language)

  const choose = (optionIndex) => {
    const next = [...answers]
    next[index] = optionIndex
    setAnswers(next)
  }

  const goNext = () => {
    if (index < questions.length - 1) {
      setIndex(index + 1)
    } else {
      setResult(scoreExam(language, answers))
    }
  }

  const q = questions[index]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgb(15 23 42 / 0.55)' }}>
      <div className="lp-surface w-full max-w-lg p-6 lp-animate-in-scale" style={{ boxShadow: 'var(--shadow-card-hover)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>{t('levelExam.title', { language })}</h3>
          <button type="button" onClick={onClose} aria-label="Close" style={{ color: 'var(--ink-soft)' }}><X size={18} /></button>
        </div>

        {result ? (
          <div className="text-center py-4">
            <span className="lp-icon-badge h-14 w-14 mb-4"><CheckCircle2 size={26} /></span>
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('levelExam.yourLevel', { language })}</p>
            <p className="font-display text-5xl font-bold lp-gradient-text w-fit mx-auto my-2">{result}</p>
            <button type="button" className="lp-btn-primary mt-4" onClick={() => onFinish(result)}>
              {t('levelExam.continue')}
            </button>
          </div>
        ) : (
          <>
            <div className="h-1.5 rounded-full overflow-hidden mb-5" style={{ background: 'var(--surface-2)' }}>
              <div className="h-full" style={{ width: `${((index + 1) / questions.length) * 100}%`, background: 'var(--gradient-brand)' }} />
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--ink-soft)' }}>
              {t('levelExam.questionOf', { current: index + 1, total: questions.length })}
            </p>
            <p className="font-medium mb-4" dir={rtl ? 'rtl' : 'ltr'} style={{ color: 'var(--ink)' }}>{q.q}</p>
            <div className="space-y-2" dir={rtl ? 'rtl' : 'ltr'}>
              {q.options.map((opt, i) => {
                const selected = answers[index] === i
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => choose(i)}
                    className="w-full text-start rounded-xl px-4 py-2.5 text-sm transition-colors"
                    style={{
                      border: `1px solid ${selected ? 'var(--accent)' : 'var(--line)'}`,
                      background: selected ? 'color-mix(in srgb, var(--accent) 10%, var(--surface))' : 'var(--surface)',
                      color: 'var(--ink)',
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end mt-5">
              <button
                type="button"
                className="lp-btn-primary"
                disabled={answers[index] === undefined}
                onClick={goNext}
                style={answers[index] === undefined ? { opacity: 0.5 } : undefined}
              >
                {index < questions.length - 1 ? t('levelExam.next') : t('levelExam.finish')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
