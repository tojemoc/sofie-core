import { Logger } from 'winston'

import { BucketAdLib } from '@sofie-automation/corelib/dist/dataModel/BucketAdLibPiece'
import { CollectionName } from '@sofie-automation/corelib/dist/dataModel/Collections'
import { CorelibPubSub } from '@sofie-automation/corelib/dist/pubsub'

import { CoreHandler } from '../coreHandler.js'
import { CollectionHandlers } from '../liveStatusServer.js'
import { PublicationCollection } from '../publicationCollection.js'

export class BucketAdLibsHandler extends PublicationCollection<
	BucketAdLib[],
	CorelibPubSub.bucketAdLibPieces,
	CollectionName.BucketAdLibPieces
> {
	constructor(logger: Logger, coreHandler: CoreHandler) {
		super(CollectionName.BucketAdLibPieces, CorelibPubSub.bucketAdLibPieces, logger, coreHandler)
	}

	changed(): void {
		const collection = this.getCollectionOrFail()
		this._collectionData = collection.find(undefined)
		this.notify(this._collectionData)
	}

	init(handlers: CollectionHandlers): void {
		super.init(handlers)
		this.setupSubscription(this._studioId, null, []) // This only matches adLibs avilable to all variants
	}
}
