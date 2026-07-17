/**
 * Minimal per-piece content status returned to peripheral devices (e.g. Rundown Editor)
 * that need READY/NOT READY badges without subscribing to the WebUI publication.
 */
export interface RundownPieceContentStatus {
	/** Piece `externalId` as stored in Core (matches RE piece id when synced). */
	pieceExternalId: string
	/** Part `externalId` the piece belongs to, when known. */
	partExternalId?: string
	/** Numeric {@link PieceStatusCode} value from corelib. */
	statusCode: number
	/** True when `statusCode` is OK (0). */
	ready: boolean
	/** Human-readable summary for tooltips; omitted when ready. */
	reason?: string
}

export interface RundownContentStatusResponse {
	rundownExternalId: string
	pieces: RundownPieceContentStatus[]
}
