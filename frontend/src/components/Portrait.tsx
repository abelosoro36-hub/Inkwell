interface Props {
  skin: string
  hair: string
  shirt: string
  bg: string
  variant?: number
  size?: number
}

// Hand-drawn style SVG portrait, so no image files are needed.
export default function Portrait({ skin, hair, shirt, bg, variant = 0, size = 88 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Portrait">
      <circle cx="50" cy="50" r="50" fill={bg} />
      <path d="M12 100c0-22 17-34 38-34s38 12 38 34z" fill={shirt} />
      <rect x="43" y="52" width="14" height="16" rx="6" fill={skin} />
      {variant === 1 && <path d="M28 46c-3-20 8-30 22-30s25 10 22 30v26H62V44H38v28H28z" fill={hair} />}
      <circle cx="50" cy="42" r="19" fill={skin} />
      {variant === 2 && <circle cx="50" cy="15" r="8" fill={hair} />}
      {variant !== 1 && <path d="M31 40c0-14 8-22 19-22s19 8 19 22c-5-8-12-11-19-11s-14 3-19 11z" fill={hair} />}
      {variant === 1 && <path d="M31 40c0-12 8-20 19-20s19 8 19 20c-6-6-12-8-19-8s-13 2-19 8z" fill={hair} />}
      <circle cx="43" cy="43" r="2" fill="#2b2b2b" />
      <circle cx="57" cy="43" r="2" fill="#2b2b2b" />
      <path d="M44 50q6 5 12 0" stroke="#2b2b2b" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}