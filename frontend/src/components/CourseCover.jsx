import { pickGradient } from '../utils/gradients'

export default function CourseCover({ course, className = '', children }) {
  return (
    <div
      className={`relative flex items-end overflow-hidden bg-gradient-to-br ${pickGradient(course.id)} bg-dots ${className}`}
    >
      <span className="absolute top-3 right-3 text-[11px] font-medium bg-white/15 text-white backdrop-blur px-2 py-0.5 rounded-full capitalize">
        {course.level}
      </span>
      <span className="relative p-4 text-2xl font-bold text-white/95 tracking-tight leading-none">
        {course.language}
      </span>
      {children}
    </div>
  )
}
