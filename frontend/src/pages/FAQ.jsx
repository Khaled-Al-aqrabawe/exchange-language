const faqs = [
  {
    q: 'Is Language Partner free?',
    a: 'Yes. During our early access phase, every feature — exchange matching, peer practice, video calls, and courses — is completely free.',
  },
  {
    q: 'How does matching work?',
    a: 'We first try to match you with a native speaker of your target language who is learning your native language (an exchange match). If none are available, we suggest peer-practice partners who are learning the same language as you.',
  },
  {
    q: 'Do I need to install anything for video calls?',
    a: 'No. Calls run directly in your browser using WebRTC — no downloads or plugins required.',
  },
  {
    q: 'Can I just use the video courses without talking to anyone?',
    a: 'Absolutely. Courses are fully self-paced and independent of partner matching.',
  },
]

export default function FAQ() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-4">Help center</p>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-12">
        Frequently Asked Questions
      </h1>
      <div className="divide-y divide-slate-200">
        {faqs.map((item) => (
          <div key={item.q} className="py-7 first:pt-0">
            <h3 className="font-semibold text-slate-900 text-lg mb-2">{item.q}</h3>
            <p className="text-slate-600 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
