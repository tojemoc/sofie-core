import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { NoraContent } from '@sofie-automation/blueprints-integration'
import type { PieceUi } from '@sofie-automation/corelib/src/dataModel/Piece.js'
import type { UIShowStyleBase } from '@sofie-automation/corelib/src/dataModel/ShowStyleBase.js'
import type { UIStudio } from '@sofie-automation/corelib/src/dataModel/Studio.js'

import { ErrorBoundary } from '../../../../lib/ErrorBoundary.js'
import { RundownUtils } from '../../../../lib/rundown.js'
import { Modal } from '../../../../lib/ui/containers/modals/Modal.js'
import InspectorTitle from './InspectorTitle.js'
import { NoraItemEditor } from './NoraItemEditor.js'
import type { IModalAttributes } from '../../../../lib/ui/containers/modals/Modal.js'
import type { IAdLibListItem } from '../../AdLibListItem.js'

export { isNoraItem }

interface INoraSuperRendererProps {
	piece: IAdLibListItem | PieceUi
	showStyleBase: UIShowStyleBase
	studio: UIStudio
}

export function NoraItemRenderer({ studio, showStyleBase, piece }: INoraSuperRendererProps): JSX.Element {
	const { t } = useTranslation()

	const actualPiece = RundownUtils.isAdLibPiece(piece) ? piece : piece.instance.piece

	const [editMode, setEditMode] = useState(false)

	const modalProps: IModalAttributes = {
		title: actualPiece.name,
		show: editMode,
		onDiscard: () => {
			setEditMode(false)
		},
	}

	return (
		<ErrorBoundary>
			<InspectorTitle piece={piece} showStyleBase={showStyleBase} studio={studio} />
			<div className="shelf-inspector__content">
				<h2 className="m-2">{actualPiece.name}</h2>
				<div className="m-2">
					<button
						className="btn btn-primary"
						disabled={editMode}
						onClick={() => {
							setEditMode(true)
						}}
					>
						{t('Edit in Nora')}
					</button>
				</div>
				<Modal {...modalProps}>
					<NoraItemEditor piece={actualPiece} />
				</Modal>
			</div>
		</ErrorBoundary>
	)
}

function isNoraItem(item: IAdLibListItem | PieceUi): boolean {
	const content = RundownUtils.isAdLibPiece(item)
		? (item.content as NoraContent)
		: (item.instance.piece.content as NoraContent)

	if (!content || !content.previewPayload) {
		return false
	}

	return true
}
