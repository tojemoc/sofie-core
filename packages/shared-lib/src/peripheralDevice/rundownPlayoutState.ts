/**
 * Playout position for a rundown, returned to ingest peripheral devices
 * (e.g. Rundown Editor) so they can mirror on-air state and lock previous /
 * current / next parts.
 *
 * Part ids are Sofie `Part.externalId` values (RE part ids when RE is the ingest source).
 */
export interface RundownPlayoutStateResponse {
	rundownExternalId: string
	/** True when the playlist containing this rundown is activated. */
	activated: boolean
	/** True when activated in rehearsal mode. */
	rehearsal: boolean
	/** Part that was on air before the current take, if any. */
	previousPartExternalId: string | null
	/** Part currently on air, if any. */
	currentPartExternalId: string | null
	/** Part selected as next, if any. */
	nextPartExternalId: string | null
}
