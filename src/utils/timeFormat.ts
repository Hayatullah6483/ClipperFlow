/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimestampValidation } from '../types';

/**
 * Formats seconds into HH:MM:SS format
 * @param seconds Number of seconds
 * @param includeMilliseconds Whether to include .mmm
 */
export function formatSecondsToTime(seconds: number, includeMilliseconds = false): string {
  if (isNaN(seconds) || seconds < 0) {
    return includeMilliseconds ? '00:00:00.000' : '00:00:00';
  }

  // Round to nearest millisecond first to prevent floating point drift (e.g. 599.9999999 -> 600.000)
  const totalMillis = Math.round(seconds * 1000);
  const totalSeconds = Math.floor(totalMillis / 1000);
  const millis = totalMillis % 1000;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  const base = `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;

  if (includeMilliseconds) {
    return `${base}.${millis.toString().padStart(3, '0')}`;
  }

  return base;
}

/**
 * Parses a time string (HH:MM:SS, HH;MM;SS, MM:SS, or seconds) into exact seconds
 * Supports colons (:), semicolons (;), and fractional seconds (.mmm or ,mmm)
 * Returns NaN if invalid format
 */
export function parseTimeToSeconds(input: string): number {
  if (!input || typeof input !== 'string') return NaN;

  // Normalize semicolons to colons and commas to decimal points
  const normalized = input.trim().replace(/;/g, ':').replace(/,/g, '.');
  if (normalized === '') return NaN;

  // Check if pure numeric seconds (e.g. "600" or "10.5")
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    const val = parseFloat(normalized);
    return isNaN(val) ? NaN : Math.round(val * 1000) / 1000;
  }

  // Split by colon
  const parts = normalized.split(':');
  if (parts.length < 2 || parts.length > 4) {
    return NaN;
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 4) {
    // Support HH:MM:SS:FF or HH;MM;SS;FF (assuming 30fps or milliseconds)
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    const secBase = parseInt(parts[2], 10);
    const sub = parseFloat(parts[3]);
    const frac = parts[3].length === 3 ? sub / 1000 : sub / 30;
    seconds = secBase + (isNaN(frac) ? 0 : frac);
  } else if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1]);
  }

  if (
    isNaN(hours) ||
    isNaN(minutes) ||
    isNaN(seconds) ||
    hours < 0 ||
    minutes < 0 ||
    minutes >= 60 ||
    seconds < 0 ||
    seconds >= 60
  ) {
    return NaN;
  }

  const exactSeconds = hours * 3600 + minutes * 60 + seconds;
  return Math.round(exactSeconds * 1000) / 1000;
}

/**
 * Validates start and end timestamps against video duration
 */
export function validateTimestamps(
  startInput: string,
  endInput: string,
  videoDuration: number
): TimestampValidation {
  const startSec = parseTimeToSeconds(startInput);
  const endSec = parseTimeToSeconds(endInput);

  if (isNaN(startSec)) {
    return {
      isValid: false,
      startSeconds: 0,
      endSeconds: 0,
      durationSeconds: 0,
      errorMessage: 'Invalid START TIME format. Please use HH:MM:SS (e.g. 00:01:30).',
    };
  }

  if (isNaN(endSec)) {
    return {
      isValid: false,
      startSeconds: startSec,
      endSeconds: 0,
      durationSeconds: 0,
      errorMessage: 'Invalid END TIME format. Please use HH:MM:SS (e.g. 00:03:45).',
    };
  }

  if (startSec < 0) {
    return {
      isValid: false,
      startSeconds: startSec,
      endSeconds: endSec,
      durationSeconds: 0,
      errorMessage: 'Start timestamp cannot be negative.',
    };
  }

  if (endSec <= 0) {
    return {
      isValid: false,
      startSeconds: startSec,
      endSeconds: endSec,
      durationSeconds: 0,
      errorMessage: 'End timestamp must be greater than 00:00:00.',
    };
  }

  if (videoDuration > 0 && endSec > videoDuration + 0.1) {
    return {
      isValid: false,
      startSeconds: startSec,
      endSeconds: endSec,
      durationSeconds: 0,
      errorMessage: `End timestamp (${formatSecondsToTime(endSec)}) exceeds total video duration (${formatSecondsToTime(videoDuration)}).`,
    };
  }

  if (startSec >= endSec) {
    return {
      isValid: false,
      startSeconds: startSec,
      endSeconds: endSec,
      durationSeconds: 0,
      errorMessage: 'Start timestamp must be strictly earlier than end timestamp.',
    };
  }

  const durationSeconds = endSec - startSec;
  if (durationSeconds < 0.2) {
    return {
      isValid: false,
      startSeconds: startSec,
      endSeconds: endSec,
      durationSeconds,
      errorMessage: 'Clip duration is too short (minimum 0.2 seconds).',
    };
  }

  return {
    isValid: true,
    startSeconds: startSec,
    endSeconds: endSec,
    durationSeconds,
  };
}
