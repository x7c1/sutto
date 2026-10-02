export const NETWORK_STATES = ['online', 'offline'] as const;
export type NetworkState = (typeof NETWORK_STATES)[number];
