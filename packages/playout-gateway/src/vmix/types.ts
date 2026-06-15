/** vMix device options extended with playout-gateway input polling settings. */
export interface VmixExtendedDeviceOptions {
	host?: string
	port?: number
	/** HTTP API port for polling input list (default 8088). TSR command port is separate. */
	inputPollApiPort?: number
	/** Poll interval in ms (default 5000). */
	inputPollingIntervalMs?: number
	/** Disable vMix input polling (e.g. offline testing). */
	disableInputPolling?: boolean
}

export interface VmixInputRecord {
	key: string
	number: number
	type: string
	title: string
	shortTitle: string
	durationFrames?: number
}

export interface VmixPollerConfig {
	host: string
	apiPort: number
	pollIntervalMs: number
	disableInputPolling: boolean
}
