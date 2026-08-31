import { SourceLayerType } from '@sofie-automation/blueprints-integration'
import { DBPart, isPartPlayable } from '@sofie-automation/corelib/dist/dataModel/Part'
import { PartId } from '@sofie-automation/corelib/dist/dataModel/Ids'
import { UserError, UserErrorMessage } from '@sofie-automation/corelib/dist/error'
import {
	PauseCurrentPartProps,
	ResumeCurrentPartProps,
	TakeNextPartResult,
	TakePreviousPartProps,
} from '@sofie-automation/corelib/dist/worker/studio'
import { ReadonlyDeep } from 'type-fest'
import { JobContext } from '../jobs/index.js'
import { getCurrentTime } from '../lib/index.js'
import { innerStopPieces } from './adlibUtils.js'
import { runJobWithPlayoutModel } from './lock.js'
import { PlayoutModel } from './model/PlayoutModel.js'
import { setNextPartFromPart } from './setNext.js'
import { performTakeToNextedPart } from './take.js'
import { updateTimeline } from './timeline/generate.js'

export function findPreviousPlayablePart<T extends Pick<ReadonlyDeep<DBPart>, '_id' | 'invalid' | 'floated'>>(
	orderedParts: readonly T[],
	currentPartId: PartId
): T | undefined {
	const currentIndex = orderedParts.findIndex((part) => part._id === currentPartId)
	if (currentIndex <= 0) {
		return undefined
	}

	for (let i = currentIndex - 1; i >= 0; i--) {
		const candidate = orderedParts[i]
		if (isPartPlayable(candidate)) {
			return candidate
		}
	}

	return undefined
}

function isVideoClipLayerType(type: SourceLayerType | undefined): boolean {
	return type === SourceLayerType.VT || type === SourceLayerType.LIVE_SPEAK
}

async function pauseCurrentPartInner(
	context: JobContext,
	playoutModel: PlayoutModel,
	stopClips: boolean
): Promise<void> {
	const playlist = playoutModel.playlist
	if (!playlist.activationId) throw UserError.create(UserErrorMessage.InactiveRundown, undefined, 412)

	const currentPartInstance = playoutModel.currentPartInstance
	if (!currentPartInstance) throw UserError.create(UserErrorMessage.NoCurrentPart, undefined, 412)

	const now = getCurrentTime()
	if (currentPartInstance.partInstance.timings?.pausedAt) {
		return
	}

	currentPartInstance.setPausedPlayback(now)

	if (stopClips && currentPartInstance.partInstance.timings?.plannedStartedPlayback) {
		const currentRundown = playoutModel.getRundown(currentPartInstance.partInstance.rundownId)
		if (currentRundown) {
			const showStyle = await context.getShowStyleCompound(
				currentRundown.rundown.showStyleVariantId,
				currentRundown.rundown.showStyleBaseId
			)
			innerStopPieces(
				context,
				playoutModel,
				showStyle.sourceLayers,
				currentPartInstance,
				(pieceInstance) =>
					isVideoClipLayerType(showStyle.sourceLayers[pieceInstance.piece.sourceLayerId]?.type),
				undefined
			)
		}
	}

	await updateTimeline(context, playoutModel)
}

/**
 * Freeze the current part countdown and stop rolling VT/VO clips.
 */
export async function handlePauseCurrentPart(context: JobContext, data: PauseCurrentPartProps): Promise<void> {
	return runJobWithPlayoutModel(
		context,
		data,
		async (playoutModel) => {
			if (!playoutModel.playlist.activationId)
				throw UserError.create(UserErrorMessage.InactiveRundown, undefined, 412)
			if (!playoutModel.playlist.currentPartInfo)
				throw UserError.create(UserErrorMessage.NoCurrentPart, undefined, 412)
		},
		async (playoutModel) => {
			await pauseCurrentPartInner(context, playoutModel, true)
		}
	)
}

/**
 * Resume a frozen current-part countdown.
 */
export async function handleResumeCurrentPart(context: JobContext, data: ResumeCurrentPartProps): Promise<void> {
	return runJobWithPlayoutModel(
		context,
		data,
		async (playoutModel) => {
			if (!playoutModel.playlist.activationId)
				throw UserError.create(UserErrorMessage.InactiveRundown, undefined, 412)
			if (!playoutModel.playlist.currentPartInfo)
				throw UserError.create(UserErrorMessage.NoCurrentPart, undefined, 412)
		},
		async (playoutModel) => {
			const currentPartInstance = playoutModel.currentPartInstance
			if (!currentPartInstance) throw UserError.create(UserErrorMessage.NoCurrentPart, undefined, 412)

			if (!currentPartInstance.partInstance.timings?.pausedAt) {
				return
			}

			currentPartInstance.setPausedPlayback(undefined)
			await updateTimeline(context, playoutModel)
		}
	)
}

/**
 * Take the previous playable part, then freeze its clock so the operator can regroup.
 */
export async function handleTakePreviousPart(
	context: JobContext,
	data: TakePreviousPartProps
): Promise<TakeNextPartResult> {
	return runJobWithPlayoutModel(
		context,
		data,
		async (playoutModel) => {
			if (!playoutModel.playlist.activationId)
				throw UserError.create(UserErrorMessage.InactiveRundown, undefined, 412)
			if (!playoutModel.playlist.currentPartInfo)
				throw UserError.create(UserErrorMessage.NoCurrentPart, undefined, 412)
		},
		async (playoutModel) => {
			const now = getCurrentTime()

			const currentPartInstance = playoutModel.currentPartInstance
			if (!currentPartInstance) throw UserError.create(UserErrorMessage.NoCurrentPart, undefined, 412)

			const previousPart = findPreviousPlayablePart(
				playoutModel.getAllOrderedParts(),
				currentPartInstance.partInstance.part._id
			)
			if (!previousPart) {
				throw UserError.create(UserErrorMessage.TakeNoPreviousPart, undefined, 412)
			}

			await setNextPartFromPart(context, playoutModel, previousPart, true)
			await performTakeToNextedPart(context, playoutModel, now, undefined)

			const takenPart = playoutModel.currentPartInstance
			takenPart?.setPausedPlayback(now)
			await updateTimeline(context, playoutModel)

			return {
				nextTakeTime: now + context.studio.settings.minimumTakeSpan,
			}
		}
	)
}
