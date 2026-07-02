export type Locale = 'zh' | 'en'

export function detectLocaleFromLanguages(
  languages: readonly string[] | undefined,
): Locale {
  const firstLanguage = languages?.find((language) => language.trim().length > 0)

  if (firstLanguage?.toLowerCase().startsWith('zh')) {
    return 'zh'
  }

  return 'en'
}

export function formatUiDuration(seconds: number, locale: Locale): string {
  if (seconds < 60) {
    return locale === 'zh'
      ? `${seconds.toFixed(1)} 秒`
      : `${seconds.toFixed(1)} sec`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = (seconds % 60).toFixed(1).padStart(4, '0')

  return locale === 'zh'
    ? `${minutes} 分 ${remainingSeconds} 秒`
    : `${minutes} min ${remainingSeconds} sec`
}

export function formatSpeed(unitsPerMinute: number, locale: Locale): string {
  return locale === 'zh'
    ? `${unitsPerMinute} 字/分钟`
    : `${unitsPerMinute} chars/min`
}

export function formatSpeedShort(
  unitsPerMinute: number,
  locale: Locale,
): string {
  return locale === 'zh'
    ? `${unitsPerMinute} 字/分`
    : `${unitsPerMinute} chars/min`
}
