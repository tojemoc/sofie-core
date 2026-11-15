import { IStudioBaselineContext, PackageInfo } from '@sofie-automation/blueprints-integration'

import { JobContext } from '../../jobs/index.js'
import { ContextInfo } from './CommonContext.js'
import { getMediaObjectDuration } from './lib.js'
import { StudioContext } from './StudioContext.js'
import { WatchedPackagesHelper } from './watchedPackages.js'

export class StudioBaselineContext extends StudioContext implements IStudioBaselineContext {
	private readonly jobContext: JobContext

	constructor(
		contextInfo: ContextInfo,
		context: JobContext,
		private readonly watchedPackages: WatchedPackagesHelper
	) {
		super(contextInfo, context.studio, context.getStudioBlueprintConfig())
		this.jobContext = context
	}

	getPackageInfo(packageId: string): readonly PackageInfo.Any[] {
		return this.watchedPackages.getPackageInfo(packageId)
	}

	async hackGetMediaObjectDuration(mediaId: string): Promise<number | undefined> {
		return getMediaObjectDuration(this.jobContext, mediaId)
	}
}
