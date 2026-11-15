import { DEFAULT_DISPLAY_DURATION } from '@sofie-automation/shared-lib/dist/core/constants'
import type { Rundown } from '@sofie-automation/corelib/dist/dataModel/Rundown'
import type { DBRundownPlaylist } from '@sofie-automation/corelib/dist/dataModel/RundownPlaylist/RundownPlaylist'
import type { UIStudio } from '@sofie-automation/corelib/src/dataModel/Studio'

import { PreviewPopUpContextProvider } from '../PreviewPopUp/PreviewPopUpContext'
import { RundownPlaylistOperationsContextProvider } from './RundownHeader/useRundownPlaylistOperations.js'
import { RundownTimingProvider } from './RundownTiming/RundownTimingProvider'
import { SelectedElementProvider } from './SelectedElementsContext'
import StudioContext from './StudioContext'

export function RundownViewContextProviders({
	playlist,
	studio,
	currentRundown,
	onActivate,
	children,
}: React.PropsWithChildren<{
	playlist: DBRundownPlaylist
	studio: UIStudio
	currentRundown: Rundown
	onActivate: () => void
}>): React.JSX.Element {
	return (
		<RundownTimingProvider
			playlist={playlist}
			defaultDuration={studio.settings.defaultDisplayDuration ?? DEFAULT_DISPLAY_DURATION}
		>
			<StudioContext.Provider value={studio}>
				<RundownPlaylistOperationsContextProvider
					studio={studio}
					playlist={playlist}
					currentRundown={currentRundown}
					onActivate={onActivate}
				>
					<PreviewPopUpContextProvider>
						<SelectedElementProvider>{children}</SelectedElementProvider>
					</PreviewPopUpContextProvider>
				</RundownPlaylistOperationsContextProvider>
			</StudioContext.Provider>
		</RundownTimingProvider>
	)
}
