import { ReadonlyDeep } from 'type-fest'

import { IBlueprintSegmentRundown, IRundownContext } from '@sofie-automation/blueprints-integration'
import { DBRundown } from '@sofie-automation/corelib/dist/dataModel/Rundown'
import { unprotectString } from '@sofie-automation/corelib/dist/protectedString'
import type { Time } from '@sofie-automation/blueprints-integration'

import { JobStudio, ProcessedShowStyleCompound } from '../../jobs/index.js'
import { ProcessedShowStyleConfig, ProcessedStudioConfig } from '../config.js'
import { ContextInfo } from './CommonContext.js'
import { convertRundownToBlueprintSegmentRundown } from './lib.js'
import { ShowStyleContext } from './ShowStyleContext.js'

/** Rundown */

export class RundownContext extends ShowStyleContext implements IRundownContext {
	readonly rundownId: string
	readonly rundown: Readonly<IBlueprintSegmentRundown>
	readonly _rundown: ReadonlyDeep<DBRundown>
	readonly playlistId: string

	constructor(
		contextInfo: ContextInfo,
		studio: ReadonlyDeep<JobStudio>,
		studioBlueprintConfig: ProcessedStudioConfig,
		showStyleCompound: ReadonlyDeep<ProcessedShowStyleCompound>,
		showStyleBlueprintConfig: ProcessedShowStyleConfig,
		rundown: ReadonlyDeep<DBRundown>
	) {
		super(contextInfo, studio, studioBlueprintConfig, showStyleCompound, showStyleBlueprintConfig)

		this.rundownId = unprotectString(rundown._id)
		this.rundown = convertRundownToBlueprintSegmentRundown(rundown)
		this._rundown = rundown
		this.playlistId = unprotectString(rundown.playlistId)
	}

	get startedPlayback(): Time | undefined {
		return undefined
	}
}
