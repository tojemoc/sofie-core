/**
 * Per-part autoNext as stored on Core `Parts` (set by blueprints at ingest), keyed by `Part.externalId`.
 */
export interface RundownPartAutoNextItem {
	autoNext: boolean
	autoNextOverlap?: number
	expectedDuration?: number
}

export interface RundownPartAutoNextResponse {
	rundownExternalId: string
	parts: Record<string, RundownPartAutoNextItem>
}
