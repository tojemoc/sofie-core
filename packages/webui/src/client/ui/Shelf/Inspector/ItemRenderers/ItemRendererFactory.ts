import * as React from 'react'
import type { ReadonlyDeep } from 'type-fest'

import type { PieceContentStatusObj } from '@sofie-automation/corelib/dist/dataModel/PieceContentStatus'
import type { DBRundownPlaylist } from '@sofie-automation/corelib/dist/dataModel/RundownPlaylist/RundownPlaylist'
import type { PieceUi } from '@sofie-automation/corelib/src/dataModel/Piece.js'
import type { UIShowStyleBase } from '@sofie-automation/corelib/src/dataModel/ShowStyleBase.js'
import type { UIStudio } from '@sofie-automation/corelib/src/dataModel/Studio.js'

import ActionItemRenderer, { isActionItem } from './ActionItemRenderer.js'
import DefaultItemRenderer from './DefaultItemRenderer.js'
import { isNoraItem, NoraItemRenderer } from './NoraItemRenderer.js'
import type { AdLibPieceUi } from '../../../../lib/shelf.js'
import type { IAdLibListItem } from '../../AdLibListItem.js'
import type { BucketAdLibItem } from '../../RundownViewBuckets.js'

export default function renderItem(
	piece: BucketAdLibItem | IAdLibListItem | PieceUi,
	contentStatus: ReadonlyDeep<PieceContentStatusObj> | undefined,
	showStyleBase: UIShowStyleBase,
	studio: UIStudio,
	rundownPlaylist: DBRundownPlaylist,
	onSelectPiece: (piece: BucketAdLibItem | IAdLibListItem | PieceUi | undefined) => void
): JSX.Element {
	if ((!('isAction' in piece) || !piece['isAction']) && isNoraItem(piece as AdLibPieceUi | PieceUi)) {
		const noraPiece = piece as AdLibPieceUi | PieceUi
		return React.createElement(NoraItemRenderer, { piece: noraPiece, showStyleBase, studio })
	} else if (isActionItem(piece)) {
		return React.createElement(ActionItemRenderer, {
			piece,
			showStyleBase,
			studio,
			rundownPlaylist,
			onSelectPiece,
		})
	}

	return React.createElement(DefaultItemRenderer, { piece, contentStatus, showStyleBase, studio })
}
