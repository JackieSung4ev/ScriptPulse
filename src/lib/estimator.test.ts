import { describe, expect, test } from 'vitest'

import {
  DEFAULT_SETTINGS,
  estimateScript,
  splitSubtitleSegments,
  type SpeechSettings,
} from './estimator'

const settings: SpeechSettings = {
  ...DEFAULT_SETTINGS,
  fps: 30,
  speedPreset: 'normal',
  unitsPerMinute: 280,
}

describe('estimateScript', () => {
  test('defaults to 24 fps for creator video projects', () => {
    expect(DEFAULT_SETTINGS.fps).toBe(24)
  })

  test('estimates Chinese-only speech units and frames', () => {
    const result = estimateScript('你好世界', settings)

    expect(result.metrics.cjkChars).toBe(4)
    expect(result.metrics.latinWords).toBe(0)
    expect(result.metrics.numberTokens).toBe(0)
    expect(result.metrics.weightedSpeechUnits).toBe(4)
    expect(result.metrics.pauseSeconds).toBe(0)
    expect(result.metrics.durationSeconds).toBeCloseTo(0.86, 2)
    expect(result.metrics.totalFrames).toBe(26)
  })

  test('estimates English words with weighted units', () => {
    const result = estimateScript('Hello creative world', settings)

    expect(result.metrics.cjkChars).toBe(0)
    expect(result.metrics.latinWords).toBe(3)
    expect(result.metrics.weightedSpeechUnits).toBeCloseTo(5.4, 5)
    expect(result.metrics.durationSeconds).toBeCloseTo(1.16, 2)
    expect(result.metrics.totalFrames).toBe(35)
  })

  test('combines Chinese, English, numbers, punctuation pauses, and line breaks', () => {
    const result = estimateScript('今天 3 videos,\n节奏要稳。', settings)

    expect(result.metrics.cjkChars).toBe(6)
    expect(result.metrics.latinWords).toBe(1)
    expect(result.metrics.numberTokens).toBe(1)
    expect(result.metrics.weightedSpeechUnits).toBeCloseTo(9.8, 5)
    expect(result.metrics.pauseSeconds).toBeCloseTo(0.78, 5)
    expect(result.metrics.durationSeconds).toBeCloseTo(2.88, 2)
    expect(result.metrics.totalFrames).toBe(86)
  })

  test('returns zeroed metrics for empty input', () => {
    const result = estimateScript('   ', settings)

    expect(result.metrics.durationSeconds).toBe(0)
    expect(result.metrics.totalFrames).toBe(0)
    expect(result.segments).toEqual([])
  })

  test('uses custom speed and FPS rounding', () => {
    const result = estimateScript('测试测试', {
      ...settings,
      fps: 24,
      speedPreset: 'custom',
      unitsPerMinute: 120,
    })

    expect(result.metrics.durationSeconds).toBe(2)
    expect(result.metrics.totalFrames).toBe(48)
  })
})

describe('splitSubtitleSegments', () => {
  test('uses non-empty manual lines before sentence splitting', () => {
    expect(splitSubtitleSegments('第一行\n\n第二行。第三句。')).toEqual([
      '第一行',
      '第二行。第三句。',
    ])
  })

  test('splits a single paragraph by sentence-ending punctuation', () => {
    expect(splitSubtitleSegments('先写开头。Then explain it!最后收束？')).toEqual([
      '先写开头。',
      'Then explain it!',
      '最后收束？',
    ])
  })

  test('falls back to the full trimmed text when no sentence boundary exists', () => {
    expect(splitSubtitleSegments('  one steady line  ')).toEqual([
      'one steady line',
    ])
  })
})
