import {
	EvaluationId,
	RundownPlaylistId,
	SnapshotId,
	StudioId,
	UserId,
} from '@sofie-automation/corelib/dist/dataModel/Ids'
import { Time } from '@sofie-automation/shared-lib/dist/lib/lib'

export interface Evaluation extends EvaluationBase {
	_id: EvaluationId
	userId: UserId | null
	timestamp: Time
}
export interface EvaluationBase {
	studioId: StudioId
	playlistId: RundownPlaylistId
	answers: {
		[key: string]: string
	}
	snapshots?: Array<SnapshotId>
}
