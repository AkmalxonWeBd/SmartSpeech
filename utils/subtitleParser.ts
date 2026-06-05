/**
 * SRT subtitle parser + sync engine.
 * Parses standard SubRip (.srt) format and provides
 * a lookup function to get the current subtitle for a given timestamp.
 */

export type SubtitleCue = {
  index: number;
  startTime: number; // seconds
  endTime: number;   // seconds
  text: string;
};

/**
 * Parse an SRT timestamp like "00:01:23,456" into seconds.
 */
function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(/[:,]/);
  if (parts.length < 4) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseInt(parts[2], 10) || 0;
  const millis = parseInt(parts[3], 10) || 0;
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

/**
 * Parse a full SRT string into an array of SubtitleCue objects.
 */
export function parseSRT(srt: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  // Normalize line endings and split into blocks
  const blocks = srt
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    if (isNaN(index)) continue;

    const timeLine = lines[1];
    const match = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,:]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,:]\d{3})/,
    );
    if (!match) continue;

    const startTime = parseTimestamp(match[1]);
    const endTime = parseTimestamp(match[2]);
    const text = lines.slice(2).join('\n');

    cues.push({ index, startTime, endTime, text });
  }

  return cues.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Binary-search-based lookup: find the active subtitle cue for a given time.
 * Returns the cue text or empty string if none is active.
 */
export function getSubtitleAtTime(cues: SubtitleCue[], time: number): string {
  if (cues.length === 0) return '';

  // Binary search for the last cue whose startTime <= time
  let lo = 0;
  let hi = cues.length - 1;
  let result = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (cues[mid].startTime <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (result === -1) return '';

  const cue = cues[result];
  if (time >= cue.startTime && time <= cue.endTime) {
    return cue.text;
  }

  return '';
}
