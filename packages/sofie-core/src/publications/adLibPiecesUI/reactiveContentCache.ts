import { AdLibPiece } from '@sofie-automation/corelib/dist/dataModel/AdLibPiece'
import { literal } from '@sofie-automation/corelib/dist/lib'
import { InMemoryMongoCollection } from '@sofie-automation/corelib/dist/memoryCollection'
import { MongoFieldSpecifierZeroes } from '@sofie-automation/corelib/dist/mongo'

import { BrandingContentCache, createBrandingContentCache } from '../lib/branding'

export type AdLibPieceOmitedFields = 'privateData' | 'timelineObjectsString'
export const adLibPieceFieldSpecifier = literal<MongoFieldSpecifierZeroes<AdLibPiece>>({
	privateData: 0,
	timelineObjectsString: 0,
})

export interface ContentCache extends BrandingContentCache {
	AdLibPieces: InMemoryMongoCollection<Omit<AdLibPiece, AdLibPieceOmitedFields>>
}

export function createReactiveContentCache(): ContentCache {
	const cache: ContentCache = {
		...createBrandingContentCache(),
		AdLibPieces: new InMemoryMongoCollection<Omit<AdLibPiece, AdLibPieceOmitedFields>>('adLibPieces'),
	}

	return cache
}
