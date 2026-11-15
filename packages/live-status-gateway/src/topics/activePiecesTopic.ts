import { Logger } from 'winston'
import { WebSocket } from 'ws'

import { RundownPlaylistId } from '@sofie-automation/corelib/dist/dataModel/Ids'
import { DBRundownPlaylist } from '@sofie-automation/corelib/dist/dataModel/RundownPlaylist/RundownPlaylist'
import { ActivePiecesEvent } from '@sofie-automation/live-status-gateway-api'
import { literal } from '@sofie-automation/shared-lib/dist/lib/lib'
import { unprotectString } from '@sofie-automation/shared-lib/dist/lib/protectedString'
import { PickKeys } from '@sofie-automation/shared-lib/dist/lib/types'

import { PieceInstanceMin, SelectedPieceInstances } from '../collections/pieceInstancesHandler.js'
import { ShowStyleBaseExt } from '../collections/showStyleBaseHandler.js'
import { CollectionHandlers } from '../liveStatusServer.js'
import { WebSocketTopic, WebSocketTopicBase } from '../wsHandler.js'
import { toPieceStatus } from './helpers/pieceStatus.js'

const THROTTLE_PERIOD_MS = 100

const PLAYLIST_KEYS = ['_id', 'activationId', 'assignedAbSessions', 'trackedAbSessions'] as const
type Playlist = PickKeys<DBRundownPlaylist, typeof PLAYLIST_KEYS>

const PIECE_INSTANCES_KEYS = ['active'] as const
type PieceInstances = PickKeys<SelectedPieceInstances, typeof PIECE_INSTANCES_KEYS>

export class ActivePiecesTopic extends WebSocketTopicBase implements WebSocketTopic {
	private _activePlaylistId: RundownPlaylistId | undefined
	private _activePieceInstances: PieceInstanceMin[] | undefined
	private _showStyleBaseExt: ShowStyleBaseExt | undefined
	private _playlist: Playlist | undefined

	constructor(logger: Logger, handlers: CollectionHandlers) {
		super(ActivePiecesTopic.name, logger, THROTTLE_PERIOD_MS)

		handlers.playlistHandler.subscribe(this.onPlaylistUpdate, PLAYLIST_KEYS)
		handlers.showStyleBaseHandler.subscribe(this.onShowStyleBaseUpdate)
		handlers.pieceInstancesHandler.subscribe(this.onPieceInstancesUpdate, PIECE_INSTANCES_KEYS)
	}

	sendStatus(subscribers: Iterable<WebSocket>): void {
		const message = this._activePlaylistId
			? literal<ActivePiecesEvent>({
					event: 'activePieces',
					rundownPlaylistId: unprotectString(this._activePlaylistId),
					activePieces:
						this._activePieceInstances?.map((piece) =>
							toPieceStatus(piece, this._showStyleBaseExt, this._playlist)
						) ?? [],
				})
			: literal<ActivePiecesEvent>({
					event: 'activePieces',
					rundownPlaylistId: null,
					activePieces: [],
				})

		this.sendMessage(subscribers, message)
	}

	private onShowStyleBaseUpdate = (showStyleBase: ShowStyleBaseExt | undefined): void => {
		this.logUpdateReceived('showStyleBase')
		this._showStyleBaseExt = showStyleBase
		this.throttledSendStatusToAll()
	}

	private onPlaylistUpdate = (rundownPlaylist: Playlist | undefined): void => {
		this.logUpdateReceived(
			'playlist',
			`rundownPlaylistId ${rundownPlaylist?._id}, activationId ${rundownPlaylist?.activationId}`
		)
		const previousActivePlaylistId = this._activePlaylistId
		this._activePlaylistId = unprotectString(rundownPlaylist?.activationId) ? rundownPlaylist?._id : undefined
		this._playlist = rundownPlaylist

		if (previousActivePlaylistId !== this._activePlaylistId) {
			this.throttledSendStatusToAll()
		}
	}

	private onPieceInstancesUpdate = (pieceInstances: PieceInstances | undefined): void => {
		this.logUpdateReceived('pieceInstances')
		const prevPieceInstances = this._activePieceInstances
		this._activePieceInstances = pieceInstances?.active
		if (prevPieceInstances !== this._activePieceInstances) {
			this.throttledSendStatusToAll()
		}
	}
}
