import type { ScriptEstimate } from './estimator'

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds - minutes * 60

  if (minutes === 0) {
    return `${remainingSeconds.toFixed(1)} 秒`
  }

  return `${minutes} 分 ${remainingSeconds.toFixed(1).padStart(4, '0')} 秒`
}

export function formatTimecode(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds - minutes * 60

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toFixed(1)
    .padStart(4, '0')}`
}

export function formatFrameRange(startFrame: number, endFrame: number): string {
  return `F${startFrame.toString().padStart(4, '0')} - F${endFrame
    .toString()
    .padStart(4, '0')}`
}

export function buildCopySummary(
  estimate: ScriptEstimate,
  fps: number,
): string {
  const { metrics, segments } = estimate
  const timeline = segments
    .map(
      (segment, index) =>
        `${index + 1}. ${segment.text} ${formatTimecode(
          segment.startSeconds,
        )}-${formatTimecode(segment.endSeconds)} (${formatFrameRange(
          segment.startFrame,
          segment.endFrame,
        )})`,
    )
    .join('\n')

  return [
    'ScriptPulse 口播估算',
    `总时长：${formatDuration(metrics.durationSeconds)}`,
    `总帧数：${metrics.totalFrames} 帧 @ ${fps}fps`,
    `语料：${metrics.cjkChars} 个中文字符 / ${metrics.latinWords} 个英文词 / ${metrics.numberTokens} 个数字`,
    `字幕段落：${segments.length} 段`,
    '',
    timeline,
  ]
    .filter((line) => line.length > 0)
    .join('\n')
}
