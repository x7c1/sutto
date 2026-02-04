/**
 * Layout Event Serializer
 *
 * Handles serialization of LayoutEvent domain objects to raw JSON format for file storage.
 */

import type { LayoutEvent } from '../../domain/history/index.js';

/**
 * Raw JSON format for LayoutEvent persistence
 */
export interface RawLayoutEvent {
  timestamp: number;
  collectionId: string;
  wmClassHash: string;
  titleHash: string;
  layoutId: string;
}

/**
 * Convert LayoutEvent domain object to raw JSON format
 */
export function toRawLayoutEvent(event: LayoutEvent): RawLayoutEvent {
  return {
    timestamp: event.timestamp,
    collectionId: event.collectionId.toString(),
    wmClassHash: event.wmClassHash,
    titleHash: event.titleHash,
    layoutId: event.layoutId.toString(),
  };
}
