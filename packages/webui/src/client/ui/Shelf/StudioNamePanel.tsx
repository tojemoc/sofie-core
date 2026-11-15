import ClassNames from 'classnames'
import { useTranslation } from 'react-i18next'

import type { UIStudio } from '@sofie-automation/corelib/src/dataModel/Studio.js'
import type {
	DashboardLayoutStudioName,
	RundownLayoutBase,
	RundownLayoutStudioName,
} from '@sofie-automation/meteor-lib/dist/collections/RundownLayouts'

import { RundownLayoutsAPI } from '../../lib/rundownLayouts.js'
import { dashboardElementStyle } from './DashboardPanel.js'

interface IStudioNamePanelProps {
	layout: RundownLayoutBase
	panel: RundownLayoutStudioName
	studio: UIStudio
}

export function StudioNamePanel({ layout, panel, studio }: Readonly<IStudioNamePanelProps>): JSX.Element {
	const isDashboardLayout = RundownLayoutsAPI.isDashboardLayout(layout)
	const { t } = useTranslation()

	return (
		<div
			className={ClassNames(
				'studio-name-panel',
				isDashboardLayout ? (panel as DashboardLayoutStudioName).customClasses : undefined
			)}
			style={isDashboardLayout ? dashboardElementStyle(panel as DashboardLayoutStudioName) : {}}
		>
			<div className="wrapper">
				<span className="studio-name-title">{t('Studio Name')}</span>
				<span className="studio-name">{studio.name}</span>
			</div>
		</div>
	)
}
