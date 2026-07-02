import { useEffect, useMemo, useState } from 'react'
import {
  Clipboard,
  Copy,
  Info,
  Sparkles,
  Trash2,
} from 'lucide-react'

import {
  DEFAULT_SETTINGS,
  SPEED_PRESETS,
  estimateScript,
  type Fps,
  type ScriptEstimate,
  type SpeechSettings,
  type SpeedPreset,
  type SubtitleSegment,
} from './lib/estimator'
import {
  formatFrameRange,
  formatTimecode,
} from './lib/format'
import {
  detectLocaleFromLanguages,
  formatSpeed,
  formatSpeedShort,
  formatUiDuration,
  type Locale,
} from './lib/localization'

const STORAGE_KEY = 'scriptpulse:draft:v1'
const LOCALE_STORAGE_KEY = 'scriptpulse:locale:v1'
const EXAMPLE_SCRIPT: Record<Locale, string> = {
  zh: '例如：这段口播会介绍一个核心观点、一个实际使用场景，以及最后的行动引导。建议把长句按字幕节奏分行，剪辑时更容易对齐画面。',
  en: 'Example: This voice-over introduces one key idea, a practical use case, and a clear call to action. Break long thoughts into lines so the subtitle rhythm is easier to edit.',
}

const FPS_OPTIONS: Fps[] = [24, 25, 30, 50, 60]

const SPEED_OPTION_IDS: Array<Exclude<SpeedPreset, 'custom'>> = [
  'slow',
  'normal',
  'fast',
]

const UI_TEXT = {
  zh: {
    appAria: 'ScriptPulse 工作台',
    brandTitle: '口播时长估算器',
    featureAria: '功能标签',
    featurePills: ['中英混合', '帧数估算', '字幕节奏'],
    languageAria: '界面语言',
    config: {
      prefix: '当前配置：',
      speechType: '中文口播',
      segmentMode: '按换行分段',
      presetSuffix: '语速',
    },
    input: {
      title: '输入口播脚本',
      clear: '清空',
      label: '口播文本',
      footer: (count: number) => `共 ${count} 个字`,
    },
    settings: {
      title: '口播设置',
      fps: '视频帧率',
      speed: '口播语速',
      custom: '自定义（字/分钟）',
      range: '120–520',
    },
    speedLabels: {
      slow: '慢速',
      normal: '正常',
      fast: '快速',
      custom: '自定义',
    },
    result: {
      title: '估算结果',
      mainLabel: '预计口播时长',
      note: (count: number, speed: string, fps: Fps) =>
        `基于 ${count} 字 · ${speed} · ${fps} fps`,
      totalFrames: '视频总帧数',
      subtitleSegments: '字幕分段数',
      averageSegment: '平均每段',
      speedSetting: '语速设置',
      rhythmTitle: '字幕节奏',
      copySummary: '复制结果',
      copyTimeline: '复制时间轴',
    },
    timeline: {
      title: '字幕时间轴',
      headers: ['段落', '文本', '时间码', '帧区间', '显示时长', '时长占比', '节奏'],
      empty: '输入脚本后，这里会生成每段字幕的时间码、帧区间和节奏状态。',
      summarySegments: (count: number) => `${count} 段`,
      summaryFrames: (frames: number) => `${frames} 帧`,
      summaryOptimizations: (count: number) => `建议优化 ${count} 处`,
    },
    units: {
      frames: (frames: number) => `${frames} 帧`,
      segments: (count: number) => `${count} 段`,
    },
    rhythm: {
      tight: '偏短',
      balanced: '舒适',
      loose: '偏长',
    },
    suggestions: {
      looseTitle: (index: number) => `第 ${index} 段偏长，建议拆成 2–3 句`,
      looseDescription:
        '单段显示时间偏长，建议将长句拆分为两到三句，使字幕节奏更舒适，提升观看体验。',
      tightTitle: (index: number) => `第 ${index} 段偏短，可适当合并`,
      tightDescription:
        '部分字幕停留时间较短，如果画面信息量较大，可以合并相邻短句，降低阅读压力。',
      goodTitle: '字幕节奏舒适',
      goodDescription:
        '当前分段的显示时长比较均衡，可以直接作为剪辑和字幕排版的参考。',
    },
    copy: {
      draftCleared: '草稿已清空',
      summaryCopied: '估算结果已复制',
      timelineCopied: '字幕时间轴已复制',
      summaryTitle: 'ScriptPulse 估算结果',
      totalDuration: '预计口播时长',
      totalFrames: '视频总帧数',
      subtitleSegments: '字幕分段数',
      speechUnits: '口播单位',
      pauseSeconds: '标点停顿',
      fps: '帧率',
      timelineTitle: '字幕时间轴',
    },
  },
  en: {
    appAria: 'ScriptPulse workspace',
    brandTitle: 'Voice-over duration estimator',
    featureAria: 'Feature tags',
    featurePills: ['Mixed CJK/English', 'Frame estimate', 'Subtitle rhythm'],
    languageAria: 'Interface language',
    config: {
      prefix: 'Current setup:',
      speechType: 'Multilingual voice-over',
      segmentMode: 'Line-based segments',
      presetSuffix: 'pace',
    },
    input: {
      title: 'Enter voice-over script',
      clear: 'Clear',
      label: 'Voice-over text',
      footer: (count: number) => `${count} characters`,
    },
    settings: {
      title: 'Speech settings',
      fps: 'Video frame rate',
      speed: 'Speech speed',
      custom: 'Custom (chars/min)',
      range: '120-520',
    },
    speedLabels: {
      slow: 'Slow',
      normal: 'Normal',
      fast: 'Fast',
      custom: 'Custom',
    },
    result: {
      title: 'Estimate',
      mainLabel: 'Estimated voice-over length',
      note: (count: number, speed: string, fps: Fps) =>
        `Based on ${count} characters · ${speed} · ${fps} fps`,
      totalFrames: 'Total video frames',
      subtitleSegments: 'Subtitle segments',
      averageSegment: 'Average segment',
      speedSetting: 'Speed setting',
      rhythmTitle: 'Subtitle rhythm',
      copySummary: 'Copy result',
      copyTimeline: 'Copy timeline',
    },
    timeline: {
      title: 'Subtitle timeline',
      headers: [
        'Segment',
        'Text',
        'Timecode',
        'Frame range',
        'Display time',
        'Share',
        'Rhythm',
      ],
      empty:
        'Enter a script to generate per-segment timecodes, frame ranges, and rhythm status.',
      summarySegments: (count: number) =>
        count === 1 ? '1 segment' : `${count} segments`,
      summaryFrames: (frames: number) =>
        frames === 1 ? '1 frame' : `${frames} frames`,
      summaryOptimizations: (count: number) =>
        count === 1 ? '1 to review' : `${count} to review`,
    },
    units: {
      frames: (frames: number) =>
        frames === 1 ? '1 frame' : `${frames} frames`,
      segments: (count: number) =>
        count === 1 ? '1 segment' : `${count} segments`,
    },
    rhythm: {
      tight: 'Short',
      balanced: 'Comfortable',
      loose: 'Long',
    },
    suggestions: {
      looseTitle: (index: number) =>
        `Segment ${index} is long. Split it into 2-3 sentences`,
      looseDescription:
        'This segment stays on screen for a long time. Split the thought into shorter subtitle lines to keep reading rhythm comfortable.',
      tightTitle: (index: number) =>
        `Segment ${index} is short. Consider merging it`,
      tightDescription:
        'Some subtitles disappear quickly. If the visuals are information-dense, merge adjacent short lines to reduce reading pressure.',
      goodTitle: 'Subtitle rhythm looks comfortable',
      goodDescription:
        'The current segment timing is balanced enough to use as a reference for editing and subtitle layout.',
    },
    copy: {
      draftCleared: 'Draft cleared',
      summaryCopied: 'Estimate copied',
      timelineCopied: 'Timeline copied',
      summaryTitle: 'ScriptPulse Estimate',
      totalDuration: 'Estimated voice-over length',
      totalFrames: 'Total video frames',
      subtitleSegments: 'Subtitle segments',
      speechUnits: 'Speech units',
      pauseSeconds: 'Pause time',
      fps: 'Frame rate',
      timelineTitle: 'Subtitle timeline',
    },
  },
}

type UiText = typeof UI_TEXT.zh

function ScriptPulseApp() {
  const [initialDraft] = useState(loadDraft)
  const [initialLocale] = useState(loadLocale)
  const [scriptText, setScriptText] = useState(initialDraft.text)
  const [settings, setSettings] = useState<SpeechSettings>(
    initialDraft.settings,
  )
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [copyStatus, setCopyStatus] = useState('')
  const text = UI_TEXT[locale]
  const estimate = useMemo(
    () => estimateScript(scriptText, settings),
    [scriptText, settings],
  )
  const visibleCharacters = countVisibleCharacters(scriptText)
  const averageSegmentSeconds =
    estimate.segments.length > 0
      ? estimate.metrics.durationSeconds / estimate.segments.length
      : 0

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ text: scriptText, settings }),
    )
  }, [scriptText, settings])

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }, [locale])

  useEffect(() => {
    if (!copyStatus) {
      return
    }

    const timer = window.setTimeout(() => setCopyStatus(''), 2200)

    return () => window.clearTimeout(timer)
  }, [copyStatus])

  function updateFps(fps: Fps) {
    setSettings((current) => ({ ...current, fps }))
  }

  function updatePreset(speedPreset: Exclude<SpeedPreset, 'custom'>) {
    setSettings((current) => ({
      ...current,
      speedPreset,
      unitsPerMinute: SPEED_PRESETS[speedPreset],
    }))
  }

  function updateCustomSpeed(value: string) {
    const numericValue = Number(value)

    if (!Number.isFinite(numericValue)) {
      return
    }

    setSettings((current) => ({
      ...current,
      speedPreset: 'custom',
      unitsPerMinute: clamp(Math.round(numericValue), 120, 520),
    }))
  }

  function clearDraft() {
    setScriptText('')
    setSettings(DEFAULT_SETTINGS)
    localStorage.removeItem(STORAGE_KEY)
    setCopyStatus(text.copy.draftCleared)
  }

  async function copySummary() {
    await copyText(buildCopySummary(estimate, settings, locale))
    setCopyStatus(text.copy.summaryCopied)
  }

  async function copyTimeline() {
    const timeline = estimate.segments
      .map(
        (segment, index) =>
          `${String(index + 1).padStart(2, '0')} ${formatTimecode(
            segment.startSeconds,
          )} - ${formatTimecode(segment.endSeconds)} ${segment.text}`,
      )
      .join('\n')

    await copyText(timeline)
    setCopyStatus(text.copy.timelineCopied)
  }

  return (
    <main className="app-page">
      <div className="app-shell">
        <AppHeader
          locale={locale}
          text={text}
          onLocaleChange={setLocale}
        />
        <ConfigBar locale={locale} settings={settings} text={text} />

        <section className="workspace" aria-label={text.appAria}>
          <ScriptInputPanel
            locale={locale}
            scriptText={scriptText}
            text={text}
            visibleCharacters={visibleCharacters}
            onChange={setScriptText}
            onClear={clearDraft}
          />
          <SpeechSettingsPanel
            locale={locale}
            settings={settings}
            text={text}
            onFpsChange={updateFps}
            onPresetChange={updatePreset}
            onCustomSpeedChange={updateCustomSpeed}
          />
          <EstimateResultPanel
            averageSegmentSeconds={averageSegmentSeconds}
            copyStatus={copyStatus}
            estimate={estimate}
            locale={locale}
            settings={settings}
            text={text}
            visibleCharacters={visibleCharacters}
            onCopySummary={copySummary}
            onCopyTimeline={copyTimeline}
          />
          <TimelinePanel estimate={estimate} locale={locale} text={text} />
        </section>
      </div>
    </main>
  )
}

function AppHeader({
  locale,
  text,
  onLocaleChange,
}: {
  locale: Locale
  text: UiText
  onLocaleChange: (locale: Locale) => void
}) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-logo" aria-hidden="true">
          <Sparkles size={24} strokeWidth={2.25} />
        </div>
        <div className="brand-copy">
          <span className="brand-name">ScriptPulse</span>
          <span className="brand-divider" aria-hidden="true" />
          <h1>{text.brandTitle}</h1>
        </div>
      </div>

      <div className="header-actions">
        <div className="feature-pills" aria-label={text.featureAria}>
          <span className="feature-pill feature-pill-blue">
            {text.featurePills[0]}
          </span>
          <span className="feature-pill feature-pill-purple">
            {text.featurePills[1]}
          </span>
          <span className="feature-pill feature-pill-green">
            {text.featurePills[2]}
          </span>
        </div>

        <div className="language-switch" aria-label={text.languageAria}>
          <button
            type="button"
            className={locale === 'zh' ? 'is-selected' : ''}
            aria-pressed={locale === 'zh'}
            onClick={() => onLocaleChange('zh')}
          >
            中文
          </button>
          <button
            type="button"
            className={locale === 'en' ? 'is-selected' : ''}
            aria-pressed={locale === 'en'}
            onClick={() => onLocaleChange('en')}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  )
}

function ConfigBar({
  locale,
  settings,
  text,
}: {
  locale: Locale
  settings: SpeechSettings
  text: UiText
}) {
  const speedLabel = formatConfigSpeedLabel(settings, locale, text)

  return (
    <div className="config-bar">
      <Info size={18} aria-hidden="true" />
      <span>{text.config.prefix}</span>
      <strong>{text.config.speechType}</strong>
      <span>·</span>
      <strong>{settings.fps} fps</strong>
      <span>·</span>
      <strong>{speedLabel}</strong>
      <span>·</span>
      <strong>{text.config.segmentMode}</strong>
    </div>
  )
}

function ScriptInputPanel({
  locale,
  scriptText,
  text,
  visibleCharacters,
  onChange,
  onClear,
}: {
  locale: Locale
  scriptText: string
  text: UiText
  visibleCharacters: number
  onChange: (value: string) => void
  onClear: () => void
}) {
  return (
    <section className="panel script-panel">
      <div className="panel-heading">
        <h2>
          <span className="step-mark">1</span>
          {text.input.title}
        </h2>
        <button className="clear-button" type="button" onClick={onClear}>
          <Trash2 size={16} aria-hidden="true" />
          {text.input.clear}
        </button>
      </div>

      <label className="sr-only" htmlFor="script-text">
        {text.input.label}
      </label>
      <textarea
        id="script-text"
        value={scriptText}
        placeholder={EXAMPLE_SCRIPT[locale]}
        onChange={(event) => onChange(event.target.value)}
        className="script-editor"
      />

      <div className="editor-footer">
        <span>{text.input.footer(visibleCharacters)}</span>
      </div>
    </section>
  )
}

function SpeechSettingsPanel({
  locale,
  settings,
  text,
  onFpsChange,
  onPresetChange,
  onCustomSpeedChange,
}: {
  locale: Locale
  settings: SpeechSettings
  text: UiText
  onFpsChange: (fps: Fps) => void
  onPresetChange: (speedPreset: Exclude<SpeedPreset, 'custom'>) => void
  onCustomSpeedChange: (value: string) => void
}) {
  return (
    <section className="panel settings-panel">
      <div className="panel-heading panel-heading-simple">
        <h2>
          <span className="step-mark">2</span>
          {text.settings.title}
        </h2>
      </div>

      <div className="settings-group">
        <h3>{text.settings.fps}</h3>
        <SegmentedControl
          options={FPS_OPTIONS}
          value={settings.fps}
          onChange={onFpsChange}
        />
      </div>

      <div className="settings-divider" />

      <div className="settings-group">
        <h3>{text.settings.speed}</h3>
        <div className="speed-options">
          {SPEED_OPTION_IDS.map((option) => (
            <SpeedOptionCard
              key={option}
              label={text.speedLabels[option]}
              units={SPEED_PRESETS[option]}
              locale={locale}
              selected={settings.speedPreset === option}
              onClick={() => onPresetChange(option)}
            />
          ))}
        </div>
      </div>

      <label className="custom-speed">
        <span>{text.settings.custom}</span>
        <div className="custom-speed-row">
          <input
            type="number"
            min={120}
            max={520}
            value={settings.unitsPerMinute}
            onChange={(event) => onCustomSpeedChange(event.target.value)}
          />
          <span>{text.settings.range}</span>
        </div>
      </label>
    </section>
  )
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Fps[]
  value: Fps
  onChange: (value: Fps) => void
}) {
  return (
    <div className="segmented-control">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={option === value ? 'is-selected' : ''}
          aria-pressed={option === value}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function SpeedOptionCard({
  label,
  units,
  locale,
  selected,
  onClick,
}: {
  label: string
  units: number
  locale: Locale
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`speed-option-card${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{formatSpeedShort(units, locale)}</strong>
    </button>
  )
}

function EstimateResultPanel({
  estimate,
  locale,
  settings,
  text,
  visibleCharacters,
  averageSegmentSeconds,
  copyStatus,
  onCopySummary,
  onCopyTimeline,
}: {
  estimate: ScriptEstimate
  locale: Locale
  settings: SpeechSettings
  text: UiText
  visibleCharacters: number
  averageSegmentSeconds: number
  copyStatus: string
  onCopySummary: () => void
  onCopyTimeline: () => void
}) {
  const suggestion = getRhythmSuggestion(estimate.segments, text)
  const hasSegments = estimate.segments.length > 0

  return (
    <section className="panel result-panel">
      <div className="panel-heading panel-heading-simple">
        <h2>
          <span className="step-mark">3</span>
          {text.result.title}
        </h2>
      </div>

      <div className="result-main-card">
        <span className="main-result-label">{text.result.mainLabel}</span>
        <strong className="main-result-value">
          {formatUiDuration(estimate.metrics.durationSeconds, locale)}
        </strong>
        <p className="main-result-note">
          {text.result.note(
            visibleCharacters,
            formatSpeed(settings.unitsPerMinute, locale),
            settings.fps,
          )}
        </p>
      </div>

      <div className="result-compact-grid">
        <CompactMetricCard
          label={text.result.totalFrames}
          value={text.units.frames(estimate.metrics.totalFrames)}
        />
        <CompactMetricCard
          label={text.result.subtitleSegments}
          value={text.units.segments(estimate.segments.length)}
        />
        <CompactMetricCard
          label={text.result.averageSegment}
          value={formatUiDuration(averageSegmentSeconds, locale)}
        />
        <CompactMetricCard
          label={text.result.speedSetting}
          value={formatSpeed(settings.unitsPerMinute, locale)}
        />
      </div>

      <div className={`rhythm-suggestion ${suggestion.tone}`}>
        <div className="rhythm-suggestion-title">{text.result.rhythmTitle}</div>
        <strong>{suggestion.title}</strong>
        <p>{suggestion.description}</p>
      </div>

      <div className="result-actions">
        <button
          type="button"
          className="primary-action"
          disabled={!hasSegments}
          onClick={onCopySummary}
        >
          <Copy size={16} aria-hidden="true" />
          {text.result.copySummary}
        </button>
        <button
          type="button"
          className="secondary-action"
          disabled={!hasSegments}
          onClick={onCopyTimeline}
        >
          <Clipboard size={16} aria-hidden="true" />
          {text.result.copyTimeline}
        </button>
      </div>

      <p className="copy-status" aria-live="polite">
        {copyStatus}
      </p>
    </section>
  )
}

function CompactMetricCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="compact-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function TimelinePanel({
  estimate,
  locale,
  text,
}: {
  estimate: ScriptEstimate
  locale: Locale
  text: UiText
}) {
  const optimizationCount = countOptimizationSegments(estimate.segments)
  const totalDuration = estimate.metrics.durationSeconds

  return (
    <section className="panel timeline-panel">
      <div className="timeline-heading">
        <h2>
          <span className="step-mark">4</span>
          {text.timeline.title}
        </h2>
        <div className="timeline-summary">
          <span>{text.timeline.summarySegments(estimate.segments.length)}</span>
          <span>{formatUiDuration(totalDuration, locale)}</span>
          <span>{text.timeline.summaryFrames(estimate.metrics.totalFrames)}</span>
          <span className={optimizationCount > 0 ? 'summary-warning' : ''}>
            {text.timeline.summaryOptimizations(optimizationCount)}
          </span>
        </div>
      </div>

      {estimate.segments.length > 0 ? (
        <div className="timeline-table-wrap">
          <table className="timeline-table">
            <thead>
              <tr>
                {text.timeline.headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {estimate.segments.map((segment, index) => (
                <TimelineRow
                  key={`${segment.text}-${index}`}
                  index={index}
                  locale={locale}
                  segment={segment}
                  text={text}
                  totalDuration={totalDuration}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="timeline-empty">
          {text.timeline.empty}
        </div>
      )}
    </section>
  )
}

function TimelineRow({
  index,
  locale,
  segment,
  text,
  totalDuration,
}: {
  index: number
  locale: Locale
  segment: SubtitleSegment
  text: UiText
  totalDuration: number
}) {
  const ratio =
    totalDuration > 0
      ? Math.round((segment.durationSeconds / totalDuration) * 100)
      : 0

  return (
    <tr>
      <td>
        <span className="segment-index">{String(index + 1).padStart(2, '0')}</span>
      </td>
      <td className="segment-text">{segment.text}</td>
      <td className="mono">
        {formatTimecode(segment.startSeconds)} –{' '}
        {formatTimecode(segment.endSeconds)}
      </td>
      <td className="mono">
        {formatFrameRange(segment.startFrame, segment.endFrame)}
      </td>
      <td>
        <strong>{formatUiDuration(segment.durationSeconds, locale)}</strong>
      </td>
      <td>
        <div className="ratio-cell">
          <span>{ratio}%</span>
          <div className="ratio-track" aria-hidden="true">
            <div className="ratio-bar" style={{ width: `${ratio}%` }} />
          </div>
        </div>
      </td>
      <td>
        <span className={`rhythm-badge ${segment.rhythmStatus}`}>
          {text.rhythm[segment.rhythmStatus]}
        </span>
      </td>
    </tr>
  )
}

function loadDraft(): { text: string; settings: SpeechSettings } {
  if (typeof window === 'undefined') {
    return { text: '', settings: DEFAULT_SETTINGS }
  }

  try {
    const rawDraft = localStorage.getItem(STORAGE_KEY)

    if (!rawDraft) {
      return { text: '', settings: DEFAULT_SETTINGS }
    }

    const draft = JSON.parse(rawDraft) as Partial<{
      text: string
      settings: Partial<SpeechSettings>
    }>

    return {
      text: typeof draft.text === 'string' ? draft.text : '',
      settings: normalizeSettings(draft.settings),
    }
  } catch {
    return { text: '', settings: DEFAULT_SETTINGS }
  }
}

function loadLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'en'
  }

  try {
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)

    if (savedLocale === 'zh' || savedLocale === 'en') {
      return savedLocale
    }
  } catch {
    return 'en'
  }

  const browserLanguages =
    navigator.languages.length > 0 ? navigator.languages : [navigator.language]

  return detectLocaleFromLanguages(browserLanguages)
}

function normalizeSettings(
  settings: Partial<SpeechSettings> | undefined,
): SpeechSettings {
  const fps = FPS_OPTIONS.includes(settings?.fps as Fps)
    ? (settings?.fps as Fps)
    : DEFAULT_SETTINGS.fps
  const preset = isSpeedPreset(settings?.speedPreset)
    ? settings.speedPreset
    : DEFAULT_SETTINGS.speedPreset
  const fallbackSpeed =
    preset === 'custom' ? DEFAULT_SETTINGS.unitsPerMinute : SPEED_PRESETS[preset]

  return {
    fps,
    speedPreset: preset,
    unitsPerMinute: clamp(
      Number(settings?.unitsPerMinute ?? fallbackSpeed),
      120,
      520,
    ),
  }
}

function speedPresetLabel(speedPreset: SpeedPreset, text: UiText): string {
  return text.speedLabels[speedPreset]
}

function formatConfigSpeedLabel(
  settings: SpeechSettings,
  locale: Locale,
  text: UiText,
): string {
  const speed = formatSpeed(settings.unitsPerMinute, locale)

  if (settings.speedPreset === 'custom') {
    return locale === 'zh'
      ? `${text.speedLabels.custom}${text.config.presetSuffix} ${speed}`
      : `${text.speedLabels.custom} ${text.config.presetSuffix} ${speed}`
  }

  return locale === 'zh'
    ? `${speedPresetLabel(settings.speedPreset, text)}${
        text.config.presetSuffix
      } ${speed}`
    : `${speedPresetLabel(settings.speedPreset, text)} ${
        text.config.presetSuffix
      } ${speed}`
}

function isSpeedPreset(value: unknown): value is SpeedPreset {
  return (
    value === 'slow' ||
    value === 'normal' ||
    value === 'fast' ||
    value === 'custom'
  )
}

function getRhythmSuggestion(segments: SubtitleSegment[], text: UiText): {
  title: string
  description: string
  tone: 'good' | 'warning'
} {
  const looseIndex = segments.findIndex(
    (segment) => segment.rhythmStatus === 'loose',
  )

  if (looseIndex >= 0) {
    return {
      title: text.suggestions.looseTitle(looseIndex + 1),
      description: text.suggestions.looseDescription,
      tone: 'warning',
    }
  }

  const tightIndex = segments.findIndex(
    (segment) => segment.rhythmStatus === 'tight',
  )

  if (tightIndex >= 0) {
    return {
      title: text.suggestions.tightTitle(tightIndex + 1),
      description: text.suggestions.tightDescription,
      tone: 'warning',
    }
  }

  return {
    title: text.suggestions.goodTitle,
    description: text.suggestions.goodDescription,
    tone: 'good',
  }
}

function countOptimizationSegments(segments: SubtitleSegment[]): number {
  return segments.filter((segment) => segment.rhythmStatus !== 'balanced').length
}

function countVisibleCharacters(text: string): number {
  return Array.from(text.replace(/\s/g, '')).length
}

function buildCopySummary(
  estimate: ScriptEstimate,
  settings: SpeechSettings,
  locale: Locale,
): string {
  const text = UI_TEXT[locale]
  const lines = [
    text.copy.summaryTitle,
    `${text.copy.totalDuration}: ${formatUiDuration(
      estimate.metrics.durationSeconds,
      locale,
    )}`,
    `${text.copy.totalFrames}: ${text.units.frames(
      estimate.metrics.totalFrames,
    )}`,
    `${text.copy.subtitleSegments}: ${text.units.segments(
      estimate.segments.length,
    )}`,
    `${text.copy.speechUnits}: ${estimate.metrics.weightedSpeechUnits.toFixed(
      1,
    )}`,
    `${text.copy.pauseSeconds}: ${formatUiDuration(
      estimate.metrics.pauseSeconds,
      locale,
    )}`,
    `${text.result.speedSetting}: ${formatSpeed(
      settings.unitsPerMinute,
      locale,
    )}`,
    `${text.copy.fps}: ${settings.fps} fps`,
    '',
    `${text.copy.timelineTitle}:`,
    ...estimate.segments.map(
      (segment, index) =>
        `${String(index + 1).padStart(2, '0')} ${formatTimecode(
          segment.startSeconds,
        )} - ${formatTimecode(segment.endSeconds)} ${segment.text}`,
    ),
  ]

  return lines.join('\n')
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

export default ScriptPulseApp
