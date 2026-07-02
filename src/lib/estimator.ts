export type Fps = 24 | 25 | 30 | 50 | 60
export type SpeedPreset = 'slow' | 'normal' | 'fast' | 'custom'
export type RhythmStatus = 'tight' | 'balanced' | 'loose'

export interface SpeechSettings {
  fps: Fps
  speedPreset: SpeedPreset
  unitsPerMinute: number
}

export interface ScriptMetrics {
  durationSeconds: number
  totalFrames: number
  cjkChars: number
  latinWords: number
  numberTokens: number
  weightedSpeechUnits: number
  pauseSeconds: number
}

export interface SubtitleSegment {
  text: string
  startSeconds: number
  endSeconds: number
  startFrame: number
  endFrame: number
  durationSeconds: number
  units: number
  rhythmStatus: RhythmStatus
}

export interface ScriptEstimate {
  metrics: ScriptMetrics
  segments: SubtitleSegment[]
}

export const SPEED_PRESETS: Record<Exclude<SpeedPreset, 'custom'>, number> = {
  slow: 220,
  normal: 280,
  fast: 340,
}

export const DEFAULT_SETTINGS: SpeechSettings = {
  fps: 24,
  speedPreset: 'normal',
  unitsPerMinute: SPEED_PRESETS.normal,
}

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/gu
const LATIN_WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?/gu
const NUMBER_RE = /\b\d+(?:[.,]\d+)?%?\b/gu
const COMMA_PAUSE_RE = /[，,、；;：:]/gu
const SENTENCE_PAUSE_RE = /[。.!！?？]/gu
const SENTENCE_SPLIT_RE = /[^。.!！?？]+[。.!！?？]+|[^。.!！?？]+$/gu

const COMMA_PAUSE_SECONDS = 0.18
const SENTENCE_PAUSE_SECONDS = 0.35
const LINE_BREAK_PAUSE_SECONDS = 0.25

export function splitSubtitleSegments(text: string): string[] {
  const trimmed = text.trim()

  if (!trimmed) {
    return []
  }

  const manualLines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (manualLines.length > 1) {
    return manualLines
  }

  const sentenceSegments = trimmed.match(SENTENCE_SPLIT_RE)

  return sentenceSegments
    ? sentenceSegments.map((segment) => segment.trim()).filter(Boolean)
    : [trimmed]
}

export function estimateScript(
  text: string,
  settings: SpeechSettings = DEFAULT_SETTINGS,
): ScriptEstimate {
  const trimmed = text.trim()

  if (!trimmed) {
    return {
      metrics: {
        durationSeconds: 0,
        totalFrames: 0,
        cjkChars: 0,
        latinWords: 0,
        numberTokens: 0,
        weightedSpeechUnits: 0,
        pauseSeconds: 0,
      },
      segments: [],
    }
  }

  const unitsPerMinute = clamp(settings.unitsPerMinute, 120, 520)
  const analysis = analyzeText(trimmed)
  const segmentsText = splitSubtitleSegments(trimmed)
  const usesManualLines = segmentsText.length > 1 && /\r?\n/.test(trimmed)
  const metrics = buildMetrics(analysis, settings.fps, unitsPerMinute)
  let cursor = 0

  const segments = segmentsText.map((segment, index) => {
    const segmentAnalysis = analyzeText(segment)
    const lineBreakPause =
      usesManualLines && index < segmentsText.length - 1
        ? LINE_BREAK_PAUSE_SECONDS
        : 0
    const durationSeconds =
      secondsForUnits(segmentAnalysis.weightedSpeechUnits, unitsPerMinute) +
      segmentAnalysis.pauseSeconds +
      lineBreakPause
    const startSeconds = cursor
    const endSeconds = cursor + durationSeconds
    const subtitleSegment: SubtitleSegment = {
      text: segment,
      startSeconds,
      endSeconds,
      startFrame: secondsToFrames(startSeconds, settings.fps),
      endFrame: secondsToFrames(endSeconds, settings.fps),
      durationSeconds,
      units: segmentAnalysis.weightedSpeechUnits,
      rhythmStatus: getRhythmStatus(durationSeconds),
    }

    cursor = endSeconds

    return subtitleSegment
  })

  return { metrics, segments }
}

function analyzeText(text: string) {
  const cjkChars = countMatches(text, CJK_RE)
  const latinWords = countMatches(text, LATIN_WORD_RE)
  const numberTokens = countMatches(text, NUMBER_RE)
  const weightedSpeechUnits = cjkChars + latinWords * 1.8 + numberTokens * 2
  const meaningfulLineBreaks = Math.max(
    0,
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean).length - 1,
  )
  const pauseSeconds =
    countMatches(text, COMMA_PAUSE_RE) * COMMA_PAUSE_SECONDS +
    countMatches(text, SENTENCE_PAUSE_RE) * SENTENCE_PAUSE_SECONDS +
    meaningfulLineBreaks * LINE_BREAK_PAUSE_SECONDS

  return {
    cjkChars,
    latinWords,
    numberTokens,
    weightedSpeechUnits,
    pauseSeconds,
  }
}

function buildMetrics(
  analysis: ReturnType<typeof analyzeText>,
  fps: Fps,
  unitsPerMinute: number,
): ScriptMetrics {
  const durationSeconds =
    secondsForUnits(analysis.weightedSpeechUnits, unitsPerMinute) +
    analysis.pauseSeconds

  return {
    durationSeconds,
    totalFrames: secondsToFrames(durationSeconds, fps),
    ...analysis,
  }
}

function secondsForUnits(units: number, unitsPerMinute: number): number {
  return (units / unitsPerMinute) * 60
}

function secondsToFrames(seconds: number, fps: Fps): number {
  return Math.round(seconds * fps)
}

function getRhythmStatus(seconds: number): RhythmStatus {
  if (seconds < 1.2) {
    return 'tight'
  }

  if (seconds > 5.5) {
    return 'loose'
  }

  return 'balanced'
}

function countMatches(text: string, regex: RegExp): number {
  return text.match(regex)?.length ?? 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
