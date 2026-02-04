import { CollectionId } from '../layout/collection-id.js';
import { LayoutId } from '../layout/layout-id.js';

export class InvalidLayoutEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLayoutEventError';
  }
}

export interface LayoutEventProps {
  timestamp: number;
  collectionId: CollectionId;
  wmClassHash: string;
  titleHash: string;
  layoutId: LayoutId;
}

/**
 * Domain object representing a layout selection event
 */
export class LayoutEvent {
  readonly timestamp: number;
  readonly collectionId: CollectionId;
  readonly wmClassHash: string;
  readonly titleHash: string;
  readonly layoutId: LayoutId;

  constructor(props: LayoutEventProps) {
    if (props.timestamp < 0) {
      throw new InvalidLayoutEventError('Timestamp must be non-negative');
    }
    if (props.wmClassHash.length === 0) {
      throw new InvalidLayoutEventError('wmClassHash must be a non-empty string');
    }
    if (props.titleHash.length === 0) {
      throw new InvalidLayoutEventError('titleHash must be a non-empty string');
    }
    this.timestamp = props.timestamp;
    this.collectionId = props.collectionId;
    this.wmClassHash = props.wmClassHash;
    this.titleHash = props.titleHash;
    this.layoutId = props.layoutId;
  }

  static fromRaw(raw: unknown): LayoutEvent {
    if (typeof raw !== 'object' || raw === null) {
      throw new InvalidLayoutEventError('Raw event must be an object');
    }

    const obj = raw as Record<string, unknown>;

    if (typeof obj.timestamp !== 'number') {
      throw new InvalidLayoutEventError('timestamp must be a number');
    }
    if (typeof obj.collectionId !== 'string') {
      throw new InvalidLayoutEventError('collectionId must be a string');
    }
    if (typeof obj.wmClassHash !== 'string') {
      throw new InvalidLayoutEventError('wmClassHash must be a string');
    }
    if (typeof obj.titleHash !== 'string') {
      throw new InvalidLayoutEventError('titleHash must be a string');
    }
    if (typeof obj.layoutId !== 'string') {
      throw new InvalidLayoutEventError('layoutId must be a string');
    }

    return new LayoutEvent({
      timestamp: obj.timestamp,
      collectionId: new CollectionId(obj.collectionId),
      wmClassHash: obj.wmClassHash,
      titleHash: obj.titleHash,
      layoutId: new LayoutId(obj.layoutId),
    });
  }
}
