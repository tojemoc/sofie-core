import type { ReadonlyDeep } from 'type-fest'

import type { SplitsContent } from '@sofie-automation/blueprints-integration'
import type { PieceGeneric } from '@sofie-automation/corelib/dist/dataModel/Piece'
import type { PieceContentStatusObj } from '@sofie-automation/corelib/dist/dataModel/PieceContentStatus'

import { RenderSplitPreview } from '../../lib/SplitPreviewBox.js'
import { getSplitPreview } from '../../lib/ui/splitPreview.js'

interface IProps {
	piece: Omit<PieceGeneric, 'timelineObjectsString'>
	contentStatus?: ReadonlyDeep<PieceContentStatusObj> | undefined
	/** Button thumbnails use flat layout (boxes fill the aspect container). List view uses wrapped. */
	flatLayout?: boolean
}

export function DashboardPieceButtonSplitPreview({
	piece,
	contentStatus,
	flatLayout = false,
}: Readonly<IProps>): JSX.Element {
	const subItems = getSplitPreview(
		(piece.content as SplitsContent).boxSourceConfiguration,
		contentStatus?.boxPreviews
	)
	return <RenderSplitPreview subItems={subItems} showLabels={false} flatLayout={flatLayout} />
}
