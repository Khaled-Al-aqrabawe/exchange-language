export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
export const MIN_SPEAKING_LEVEL = 'B1'

// Each question: { level, q, options, answer } - answer is the index of the correct option.
// Three questions per CEFR band; a band counts as passed with at least 2 of 3 correct.
const english = [
  { level: 'A1', q: 'She ___ a teacher.', options: ['is', 'are', 'am', 'be'], answer: 0 },
  { level: 'A1', q: 'What is your name?', options: ['My name is Sam.', 'I am fine.', 'Yes, please.', 'At home.'], answer: 0 },
  { level: 'A1', q: 'I ___ coffee every morning.', options: ['drink', 'drinks', 'drinking', 'to drink'], answer: 0 },
  { level: 'A2', q: 'Yesterday we ___ to the cinema.', options: ['go', 'went', 'gone', 'going'], answer: 1 },
  { level: 'A2', q: "There aren't ___ apples in the bag.", options: ['any', 'some', 'a', 'an'], answer: 0 },
  { level: 'A2', q: 'He is ___ than his brother.', options: ['tall', 'more tall', 'taller', 'tallest'], answer: 2 },
  { level: 'B1', q: 'If it rains tomorrow, we ___ at home.', options: ['stayed', 'will stay', 'would stay', 'staying'], answer: 1 },
  { level: 'B1', q: 'I have lived here ___ 2015.', options: ['for', 'from', 'since', 'during'], answer: 2 },
  { level: 'B1', q: 'She asked me where ___.', options: ['did I live', 'do I live', 'I living', 'I lived'], answer: 3 },
  { level: 'B2', q: 'By the time we arrived, the film ___.', options: ['already started', 'had already started', 'has already started', 'was already start'], answer: 1 },
  { level: 'B2', q: 'I wish I ___ more free time.', options: ['have', 'would have', 'had', 'having'], answer: 2 },
  { level: 'B2', q: 'The report must ___ by Friday.', options: ['submit', 'submitting', 'to submit', 'be submitted'], answer: 3 },
  { level: 'C1', q: 'Hardly had he sat down ___ the phone rang.', options: ['than', 'when', 'then', 'that'], answer: 1 },
  { level: 'C1', q: 'The manager insisted that the report ___ immediately.', options: ['was sent', 'is sent', 'be sent', 'sending'], answer: 2 },
  { level: 'C1', q: 'Which word is closest in meaning to "ubiquitous"?', options: ['rare', 'ancient', 'harmful', 'found everywhere'], answer: 3 },
  { level: 'C2', q: 'His argument, though ___, failed to convince the panel.', options: ['cogently', 'cogent', 'cogency', 'cogents'], answer: 1 },
  { level: 'C2', q: 'Not until the evidence was reviewed ___ the truth.', options: ['they discovered', 'they did discover', 'did they discover', 'discovered they'], answer: 2 },
  { level: 'C2', q: 'Something described as "equivocal" is...', options: ['completely certain', 'open to more than one interpretation', 'extremely rude', 'easily broken'], answer: 1 },
]

const arabic = [
  { level: 'A1', q: 'ماذا تقول في الصباح؟', options: ['مساء الخير', 'تصبح على خير', 'صباح الخير', 'مع السلامة'], answer: 2 },
  { level: 'A1', q: 'ما اسمك؟', options: ['أنا بخير', 'اسمي سامي', 'نعم من فضلك', 'في البيت'], answer: 1 },
  { level: 'A1', q: '___ كتاب جديد.', options: ['هذه', 'هؤلاء', 'تلك', 'هذا'], answer: 3 },
  { level: 'A2', q: 'ذهبتُ ___ المدرسة أمس.', options: ['إلى', 'على', 'عن', 'مع'], answer: 0 },
  { level: 'A2', q: 'الطالبات ___ في الصف.', options: ['جالسون', 'جالس', 'جالسات', 'جالسة'], answer: 2 },
  { level: 'A2', q: 'ما مرادف كلمة «سعيد»؟', options: ['حزين', 'مسرور', 'غاضب', 'متعب'], answer: 1 },
  { level: 'B1', q: 'اشتريتُ ___ كتب.', options: ['ثلاث', 'ثالث', 'ثلاثة', 'ثلاثين'], answer: 2 },
  { level: 'B1', q: 'لو درستَ جيداً ___', options: ['ستنجح', 'نجحتَ', 'ينجح', 'لنجحتَ'], answer: 3 },
  { level: 'B1', q: 'هذا هو الرجل ___ رأيته أمس.', options: ['الذي', 'التي', 'الذين', 'اللذان'], answer: 0 },
  { level: 'B2', q: 'ما إعراب كلمة «المعلمُ» في: جاء المعلمُ؟', options: ['مفعول به منصوب', 'فاعل مرفوع', 'اسم مجرور', 'خبر منصوب'], answer: 1 },
  { level: 'B2', q: 'أكمل: إنْ تجتهدْ ___', options: ['تنجحُ', 'تنجحَ', 'تنجحْ', 'ناجح'], answer: 2 },
  { level: 'B2', q: 'ما ضد كلمة «كريم»؟', options: ['سخي', 'بخيل', 'شجاع', 'طويل'], answer: 1 },
  { level: 'C1', q: 'ما معنى المثل: «الوقت كالسيف إن لم تقطعه قطعك»؟', options: ['السيف حاد', 'القتال مهم', 'يجب استغلال الوقت قبل أن يضيع', 'الوقت طويل'], answer: 2 },
  { level: 'C1', q: 'ما نوع الأسلوب في: «ما أجملَ السماءَ!»؟', options: ['استفهام', 'تعجّب', 'نهي', 'أمر'], answer: 1 },
  { level: 'C1', q: 'ما المقصود بـ«الجناس» في البلاغة؟', options: ['تضادّ المعنى', 'تكرار الحرف', 'حذف الفاعل', 'تشابه اللفظين مع اختلاف المعنى'], answer: 3 },
  { level: 'C2', q: 'ما معنى «ارتأى»؟', options: ['رأى واعتقد', 'نام', 'ذهب', 'سقط'], answer: 0 },
  { level: 'C2', q: 'أيّ الجمل التالية فيها طباق؟', options: ['الكتاب صديق', 'الليلُ يخفي والنهارُ يُظهر', 'ذهب الولد إلى المدرسة', 'أكلتُ تفاحة'], answer: 1 },
  { level: 'C2', q: 'ما المصدر الميمي من الفعل «ذهب»؟', options: ['ذهاب', 'ذاهب', 'مذهب', 'مذهوب'], answer: 2 },
]

export const PLACEMENT_EXAMS = { English: english, Arabic: arabic }

export function hasExam(language) {
  return Boolean(PLACEMENT_EXAMS[language])
}

export function isRtlLanguage(language) {
  return language === 'Arabic'
}

// A band counts as passed with >= 2 of its 3 questions correct. The level is the
// highest band passed with every lower band also passed; A1 if even A1 isn't passed.
export function scoreExam(language, answers) {
  const questions = PLACEMENT_EXAMS[language]
  let level = 'A1'
  for (const band of CEFR_LEVELS) {
    const inBand = questions.map((q, i) => ({ q, i })).filter(({ q }) => q.level === band)
    const correct = inBand.filter(({ q, i }) => answers[i] === q.answer).length
    if (correct >= 2) level = band
    else break
  }
  const bandPassedA1 = questions.filter((q, i) => q.level === 'A1' && answers[i] === q.answer).length >= 2
  return bandPassedA1 || level !== 'A1' ? level : 'A1'
}

export function levelIndex(level) {
  return CEFR_LEVELS.indexOf(level)
}
