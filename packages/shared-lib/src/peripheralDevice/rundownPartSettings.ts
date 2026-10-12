/**
 * Per-part AUTO / duration as stored on Core `Parts` for a rundown, returned to
 * ingest peripheral devices (Rundown Editor) so they can show Sofie's real
 * auto-take state instead of RE intent.
 *
 * Part ids are Sofie `Part.externalId` (RE part ids when RE is the ingest source).
 * Effective auto-take in Core is `autoNext && expectedDuration` — RE must AND them.
 */
export interface RundownPartSettingsItem {
	partExternalId: string
	autoNext: boolean
	expectedDuration: number | null
	/** Set by the blueprint when show logic forces auto-next independently of RE AUTO. */
	autoNextSource?: 'blueprint'
}

export interface RundownPartSettingsResponse {
	rundownExternalId: string
	parts: RundownPartSettingsItem[]
}
