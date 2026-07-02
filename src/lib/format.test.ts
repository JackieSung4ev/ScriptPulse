import { describe, expect, test } from 'vitest'

import {
  buildCopySummary,
  formatDuration,
  formatFrameRange,
  formatTimecode,
} from './format'
import type { ScriptEstimate } from './estimator'

const estimate: ScriptEstimate = {
  metrics: {
    durationSeconds: 65.432,
    totalFrames: 1963,
    cjkChars: 12,
    latinWords: 3,
    numberTokens: 1,
    weightedSpeechUnits: 19.4,
    pauseSeconds: 1.08,
  },
  segments: [
    {
      text: '第一句。',
      startSeconds: 0,
      endSeconds: 1.5,
      startFrame: 0,
      endFrame: 45,
      durationSeconds: 1.5,
      units: 3,
      rhythmStatus: 'balanced',
    },
  ],
}

describe('formatDuration', () => {
  test('formats seconds into Chinese minute and second text', () => {
    expect(formatDuration(65.432)).toBe('1 分 05.4 秒')
  })

  test('keeps short durations compact', () => {
    expect(formatDuration(8.04)).toBe('8.0 秒')
  })
})

describe('formatTimecode', () => {
  test('formats seconds as mm:ss.decimal', () => {
    expect(formatTimecode(65.432)).toBe('01:05.4')
  })
})

describe('formatFrameRange', () => {
  test('formats inclusive-looking frame ranges for timeline display', () => {
    expect(formatFrameRange(0, 45)).toBe('F0000 - F0045')
  })
})

describe('buildCopySummary', () => {
  test('builds a copyable Chinese result summary', () => {
    expect(buildCopySummary(estimate, 30)).toContain('总时长：1 分 05.4 秒')
    expect(buildCopySummary(estimate, 30)).toContain('总帧数：1963 帧 @ 30fps')
    expect(buildCopySummary(estimate, 30)).toContain('第一句。 00:00.0-00:01.5')
  })
})
