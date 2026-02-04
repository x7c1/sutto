export const NETWORK_STATES = ['online', 'offline', 'backend_unreachable'] as const;
export type NetworkState = (typeof NETWORK_STATES)[number];

export function isValidNetworkState(value: unknown): value is NetworkState {
  return typeof value === 'string' && NETWORK_STATES.includes(value as NetworkState);
}
