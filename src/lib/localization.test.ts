import { describe, expect, it } from 'vitest'

import {
  detectLocaleFromLanguages,
  formatSpeed,
  formatSpeedShort,
  formatUiDuration,
} from './localization'

describe('localization helpers', () => {
  it('detects Chinese UI from the primary browser language', () => {
    expect(detectLocaleFromLanguages(['zh-CN', 'en-US'])).toBe('zh')
  })

  it('defaults to English when the primary browser language is not Chinese', () => {
    expect(detectLocaleFromLanguages(['en-US', 'zh-CN'])).toBe('en')
    expect(detectLocaleFromLanguages(undefined)).toBe('en')
  })

  it('formats UI duration for Chinese and English labels', () => {
    expect(formatUiDuration(12.1, 'zh')).toBe('12.1 秒')
    expect(formatUiDuration(12.1, 'en')).toBe('12.1 sec')
    expect(formatUiDuration(65.4, 'zh')).toBe('1 分 05.4 秒')
    expect(formatUiDuration(65.4, 'en')).toBe('1 min 05.4 sec')
  })

  it('formats speed units for both UI languages', () => {
    expect(formatSpeed(280, 'zh')).toBe('280 字/分钟')
    expect(formatSpeed(280, 'en')).toBe('280 chars/min')
    expect(formatSpeedShort(280, 'zh')).toBe('280 字/分')
    expect(formatSpeedShort(280, 'en')).toBe('280 chars/min')
  })
})
