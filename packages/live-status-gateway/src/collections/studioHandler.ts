import { Logger } from 'winston'

import { CollectionName } from '@sofie-automation/corelib/dist/dataModel/Collections'
import { DBStudio } from '@sofie-automation/corelib/dist/dataModel/Studio'
import { CorelibPubSub } from '@sofie-automation/corelib/dist/pubsub'

import { CoreHandler } from '../coreHandler.js'
import { CollectionHandlers } from '../liveStatusServer.js'
import { PublicationCollection } from '../publicationCollection.js'

export class StudioHandler extends PublicationCollection<DBStudio, CorelibPubSub.studios, CollectionName.Studios> {
	constructor(logger: Logger, coreHandler: CoreHandler) {
		super(CollectionName.Studios, CorelibPubSub.studios, logger, coreHandler)
	}

	init(handlers: CollectionHandlers): void {
		super.init(handlers)

		this.setupSubscription([this._studioId])
	}

	protected changed(): void {
		const collection = this.getCollectionOrFail()
		const studio = collection.findOne(this._studioId)
		this._collectionData = studio
		this.notify(this._collectionData)
	}
}
