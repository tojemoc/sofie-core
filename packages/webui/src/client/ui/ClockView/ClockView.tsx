import { useTranslation } from 'react-i18next'
import { Route, Switch } from 'react-router-dom'

import { MeteorPubSub } from '@sofie-automation/meteor-lib/dist/api/pubsub'
import { DEFAULT_DISPLAY_DURATION } from '@sofie-automation/shared-lib/dist/core/constants'
import type { StudioId } from '@sofie-automation/corelib/dist/dataModel/Ids'

import { RundownPlaylists } from '../../collections/index.js'
import { useSubscription, useTracker } from '../../lib/ReactMeteorData/react-meteor-data.js'
import { UIStudios } from '../Collections.js'
import { RundownTimingProvider } from '../RundownView/RundownTiming/RundownTimingProvider.js'
import { StudioScreenSaver } from '../StudioScreenSaver/StudioScreenSaver.js'
import { CameraScreen } from './CameraScreen/index.js'
import { ClockViewIndex } from './ClockViewIndex.js'
import { DirectorScreen } from './DirectorScreen/DirectorScreen'
import { MultiviewScreen } from './MultiviewScreen.js'
import { OverlayScreen } from './OverlayScreen.js'
import { OverlayScreenSaver } from './OverlayScreenSaver.js'
import { PresenterScreen } from './PresenterScreen.js'

export function ClockView({ studioId }: Readonly<{ studioId: StudioId }>): JSX.Element {
	useSubscription(MeteorPubSub.rundownPlaylistForStudio, studioId, true)
	useSubscription(MeteorPubSub.uiStudio, studioId)
	const { t } = useTranslation()

	const playlist = useTracker(
		() =>
			RundownPlaylists.findOne({
				activationId: { $exists: true },
				studioId,
			}),
		[studioId]
	)

	const defaultDisplayDuration = useTracker(
		() => UIStudios.findOne(studioId)?.settings.defaultDisplayDuration ?? DEFAULT_DISPLAY_DURATION,
		[studioId],
		DEFAULT_DISPLAY_DURATION
	)

	return (
		<Switch>
			<Route exact path="/countdowns/:studioId/presenter">
				{playlist ? (
					<RundownTimingProvider playlist={playlist} defaultDuration={defaultDisplayDuration}>
						<PresenterScreen playlistId={playlist._id} studioId={studioId} />
					</RundownTimingProvider>
				) : (
					<StudioScreenSaver studioId={studioId} ownBackground={true} screenName={t('Presenter Screen')} />
				)}
			</Route>
			<Route exact path="/countdowns/:studioId/director">
				{playlist ? (
					<RundownTimingProvider playlist={playlist} defaultDuration={defaultDisplayDuration}>
						<DirectorScreen playlistId={playlist._id} studioId={studioId} />
					</RundownTimingProvider>
				) : (
					<StudioScreenSaver studioId={studioId} ownBackground={true} screenName={t("Director's Screen")} />
				)}
			</Route>
			<Route exact path="/countdowns/:studioId/overlay">
				{playlist ? (
					<RundownTimingProvider playlist={playlist} defaultDuration={defaultDisplayDuration}>
						<OverlayScreen playlistId={playlist._id} studioId={studioId} />
					</RundownTimingProvider>
				) : (
					<OverlayScreenSaver studioId={studioId} />
				)}
			</Route>
			<Route exact path="/countdowns/:studioId/camera">
				<RundownTimingProvider playlist={playlist} defaultDuration={defaultDisplayDuration}>
					<CameraScreen playlist={playlist} studioId={studioId} />
				</RundownTimingProvider>
			</Route>
			<Route exact path="/countdowns/:studioId/multiview">
				<MultiviewScreen studioId={studioId} />
			</Route>
			<Route exact path="/countdowns/:studioId">
				<ClockViewIndex studioId={studioId} />
			</Route>
			<Route path="*">
				<div>404 - Page not found</div>
			</Route>
		</Switch>
	)
}
