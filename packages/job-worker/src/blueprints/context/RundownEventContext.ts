import { ReadonlyDeep } from 'type-fest'

import { IEventContext } from '@sofie-automation/blueprints-integration'
import { DBRundown } from '@sofie-automation/corelib/dist/dataModel/Rundown'

import { JobStudio, ProcessedShowStyleCompound } from '../../jobs/index.js'
import { getCurrentTime } from '../../lib/index.js'
import { ProcessedShowStyleConfig, ProcessedStudioConfig } from '../config.js'
import { RundownContext } from './RundownContext.js'

export class RundownEventContext extends RundownContext implements IEventContext {
	constructor(
		studio: ReadonlyDeep<JobStudio>,
		studioBlueprintConfig: ProcessedStudioConfig,
		showStyleCompound: ReadonlyDeep<ProcessedShowStyleCompound>,
		showStyleBlueprintConfig: ProcessedShowStyleConfig,
		rundown: ReadonlyDeep<DBRundown>
	) {
		super(
			{
				name: rundown.name,
				identifier: `rundownId=${rundown._id},blueprintId=${showStyleCompound.blueprintId}`,
			},
			studio,
			studioBlueprintConfig,
			showStyleCompound,
			showStyleBlueprintConfig,
			rundown
		)
	}

	getCurrentTime(): number {
		return getCurrentTime()
	}
}
