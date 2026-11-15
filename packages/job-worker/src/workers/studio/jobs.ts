import { StudioJobFunc, StudioJobs } from '@sofie-automation/corelib/dist/worker/studio'

import { JobContext } from '../../jobs/index.js'
import {
	handleActivateRundownPlaylist,
	handleDeactivateRundownPlaylist,
	handlePrepareRundownPlaylistForBroadcast,
	handleResetRundownPlaylist,
} from '../../playout/activePlaylistJobs.js'
import { handleExecuteAdlibAction } from '../../playout/adlibAction.js'
import {
	handleAdLibPieceStart,
	handleDisableNextPiece,
	handleStartStickyPieceOnSourceLayer,
	handleStopPiecesOnSourceLayers,
	handleTakePieceAsAdlibNow,
} from '../../playout/adlibJobs.js'
import { handleActivateAdlibTesting } from '../../playout/adlibTesting.js'
import { handleExecuteBucketAdLibOrAction } from '../../playout/bucketAdlibJobs.js'
import {
	handleDebugCrash,
	handleDebugRegenerateNextPartInstance,
	handleDebugSyncPlayheadInfinitesForNextPartInstance,
	handleDebugUpdateTimeline,
} from '../../playout/debug.js'
import { handleCleanupOrphanedExpectedPackageReferences } from '../../playout/expectedPackages.js'
import { handleOnExternalEvents } from '../../playout/externalEvents.js'
import { handleActivateHold, handleDeactivateHold } from '../../playout/holdJobs.js'
import { handleClearQuickLoopMarkers, handleSetQuickLoopMarker } from '../../playout/quickLoopMarkers.js'
import {
	handleMoveNextPart,
	handleQueueNextSegment,
	handleSetNextPart,
	handleSetNextSegment,
} from '../../playout/setNextJobs.js'
import { handleGeneratePlaylistSnapshot, handleRestorePlaylistSnapshot } from '../../playout/snapshot.js'
import { handleOnSystemSnapshotCreated } from '../../playout/snapshotHooks.js'
import { handleTakeNextPart } from '../../playout/take.js'
import { handleUpdateStudioBaseline, handleUpdateTimelineAfterIngest } from '../../playout/timelineJobs.js'
import { handleOnPlayoutPlaybackChanged, handleTimelineTriggerTime } from '../../playout/timings/index.js'
import {
	handleRecalculateTTimerProjections,
	handleTTimerClearProjected,
	handleTTimerPause,
	handleTTimerRestart,
	handleTTimerResume,
	handleTTimerSetProjectedAnchorPart,
	handleTTimerSetProjectedDuration,
	handleTTimerSetProjectedTime,
	handleTTimerStartCountdown,
	handleTTimerStartFreeRun,
} from '../../playout/tTimersJobs.js'
import {
	handleBlueprintFixUpConfigForStudio,
	handleBlueprintIgnoreFixUpConfigForStudio,
	handleBlueprintUpgradeForStudio,
	handleBlueprintValidateConfigForStudio,
} from '../../playout/upgrade.js'
import {
	handleMoveRundownIntoPlaylist,
	handleRegenerateRundownPlaylist,
	handleRemoveRundownPlaylist,
	handleRestoreRundownsInPlaylistToDefaultOrder,
} from '../../rundownPlaylists.js'
import { handleRemoveEmptyPlaylists } from '../../studio/cleanup.js'
import { handleSwitchRouteSet } from '../../studio/routeSet.js'

type ExecutableFunction<T extends keyof StudioJobFunc> = (
	context: JobContext,
	data: Parameters<StudioJobFunc[T]>[0]
) => Promise<ReturnType<StudioJobFunc[T]>>

export type StudioJobHandlers = {
	[T in keyof StudioJobFunc]: ExecutableFunction<T>
}

export const studioJobHandlers: StudioJobHandlers = {
	[StudioJobs.UpdateTimeline]: handleDebugUpdateTimeline,
	[StudioJobs.UpdateTimelineAfterIngest]: handleUpdateTimelineAfterIngest,

	[StudioJobs.AdlibPieceStart]: handleAdLibPieceStart,
	[StudioJobs.TakePieceAsAdlibNow]: handleTakePieceAsAdlibNow,
	[StudioJobs.StartStickyPieceOnSourceLayer]: handleStartStickyPieceOnSourceLayer,
	[StudioJobs.StopPiecesOnSourceLayers]: handleStopPiecesOnSourceLayers,
	[StudioJobs.MoveNextPart]: handleMoveNextPart,
	[StudioJobs.ActivateHold]: handleActivateHold,
	[StudioJobs.DeactivateHold]: handleDeactivateHold,
	[StudioJobs.PrepareRundownForBroadcast]: handlePrepareRundownPlaylistForBroadcast,
	[StudioJobs.ResetRundownPlaylist]: handleResetRundownPlaylist,
	[StudioJobs.ActivateRundownPlaylist]: handleActivateRundownPlaylist,
	[StudioJobs.DeactivateRundownPlaylist]: handleDeactivateRundownPlaylist,
	[StudioJobs.SetNextPart]: handleSetNextPart,
	[StudioJobs.SetNextSegment]: handleSetNextSegment,
	[StudioJobs.QueueNextSegment]: handleQueueNextSegment,
	[StudioJobs.ExecuteAction]: handleExecuteAdlibAction,
	[StudioJobs.ExecuteBucketAdLibOrAction]: handleExecuteBucketAdLibOrAction,
	[StudioJobs.TakeNextPart]: handleTakeNextPart,
	[StudioJobs.DisableNextPiece]: handleDisableNextPiece,
	[StudioJobs.RemovePlaylist]: handleRemoveRundownPlaylist,
	[StudioJobs.RegeneratePlaylist]: handleRegenerateRundownPlaylist,

	[StudioJobs.OnPlayoutPlaybackChanged]: handleOnPlayoutPlaybackChanged,
	[StudioJobs.OnTimelineTriggerTime]: handleTimelineTriggerTime,
	[StudioJobs.OnExternalEvents]: handleOnExternalEvents,

	[StudioJobs.RecalculateTTimerProjections]: handleRecalculateTTimerProjections,

	[StudioJobs.UpdateStudioBaseline]: handleUpdateStudioBaseline,
	[StudioJobs.CleanupEmptyPlaylists]: handleRemoveEmptyPlaylists,

	[StudioJobs.OrderRestoreToDefault]: handleRestoreRundownsInPlaylistToDefaultOrder,
	[StudioJobs.OrderMoveRundownToPlaylist]: handleMoveRundownIntoPlaylist,

	[StudioJobs.DebugSyncInfinitesForNextPartInstance]: handleDebugSyncPlayheadInfinitesForNextPartInstance,
	[StudioJobs.DebugRegenerateNextPartInstance]: handleDebugRegenerateNextPartInstance,

	[StudioJobs.GeneratePlaylistSnapshot]: handleGeneratePlaylistSnapshot,
	[StudioJobs.RestorePlaylistSnapshot]: handleRestorePlaylistSnapshot,
	[StudioJobs.OnSystemSnapshotCreated]: handleOnSystemSnapshotCreated,
	[StudioJobs.DebugCrash]: handleDebugCrash,

	[StudioJobs.BlueprintUpgradeForStudio]: handleBlueprintUpgradeForStudio,
	[StudioJobs.BlueprintValidateConfigForStudio]: handleBlueprintValidateConfigForStudio,
	[StudioJobs.BlueprintFixUpConfigForStudio]: handleBlueprintFixUpConfigForStudio,
	[StudioJobs.BlueprintIgnoreFixUpConfigForStudio]: handleBlueprintIgnoreFixUpConfigForStudio,

	[StudioJobs.ActivateAdlibTesting]: handleActivateAdlibTesting,

	[StudioJobs.SetQuickLoopMarker]: handleSetQuickLoopMarker,
	[StudioJobs.ClearQuickLoopMarkers]: handleClearQuickLoopMarkers,

	[StudioJobs.SwitchRouteSet]: handleSwitchRouteSet,

	[StudioJobs.CleanupOrphanedExpectedPackageReferences]: handleCleanupOrphanedExpectedPackageReferences,

	[StudioJobs.TTimerStartCountdown]: handleTTimerStartCountdown,
	[StudioJobs.TTimerStartFreeRun]: handleTTimerStartFreeRun,
	[StudioJobs.TTimerPause]: handleTTimerPause,
	[StudioJobs.TTimerResume]: handleTTimerResume,
	[StudioJobs.TTimerRestart]: handleTTimerRestart,
	[StudioJobs.TTimerClearProjected]: handleTTimerClearProjected,
	[StudioJobs.TTimerSetProjectedAnchorPart]: handleTTimerSetProjectedAnchorPart,
	[StudioJobs.TTimerSetProjectedTime]: handleTTimerSetProjectedTime,
	[StudioJobs.TTimerSetProjectedDuration]: handleTTimerSetProjectedDuration,
}
