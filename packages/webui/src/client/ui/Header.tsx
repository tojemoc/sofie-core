import { AnimatePresence } from 'motion/react'
import React, { useCallback, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'

import { CoreSystem } from '../collections/index.js'
import { ErrorBoundary } from '../lib/ErrorBoundary.js'
import { NotificationCenterPanel, NotificationCenterPanelToggle } from '../lib/notifications/NotificationCenterPanel.js'
import { NoticeLevel, NotificationCenter } from '../lib/notifications/notifications.js'
import { useTracker } from '../lib/ReactMeteorData/ReactMeteorData.js'
import { SupportPopUp, SupportPopUpToggle } from './SupportPopUp.js'

interface IPropsHeader {
	allowConfigure?: boolean
	allowTesting?: boolean
	allowDeveloper?: boolean
}

export default function Header({ allowConfigure, allowTesting }: IPropsHeader): JSX.Element {
	const { t } = useTranslation()

	const sofieName = useTracker(() => {
		const coreSystem = CoreSystem.findOne()

		return coreSystem?.name
	}, [])

	const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<NoticeLevel | undefined>(undefined)
	const onToggleNotifications = useCallback(
		(_e: React.MouseEvent<HTMLButtonElement>, filter: NoticeLevel | undefined) => {
			setIsNotificationCenterOpen((isNotificationCenterOpen) => {
				if (isNotificationCenterOpen === filter) {
					filter = undefined
				}
				NotificationCenter.isOpen = filter !== undefined ? true : false

				return filter
			})
		},
		[]
	)

	const [isSupportPanelOpen, setIsSupportPanelOpen] = useState(false)
	const onToggleSupportPanel = useCallback(() => setIsSupportPanelOpen((prev) => !prev), [])

	return (
		<React.Fragment>
			<ErrorBoundary>
				<AnimatePresence>
					{isNotificationCenterOpen !== undefined && (
						<NotificationCenterPanel limitCount={15} filter={isNotificationCenterOpen} />
					)}
					{isSupportPanelOpen && <SupportPopUp />}
				</AnimatePresence>
			</ErrorBoundary>
			<ErrorBoundary>
				<div className="status-bar">
					<NotificationCenterPanelToggle
						onClick={(e) => onToggleNotifications(e, NoticeLevel.CRITICAL)}
						isOpen={isNotificationCenterOpen === NoticeLevel.CRITICAL}
						filter={NoticeLevel.CRITICAL}
						className="type-critical"
						title={t('Critical Problems')}
					/>
					<NotificationCenterPanelToggle
						onClick={(e) => onToggleNotifications(e, NoticeLevel.WARNING)}
						isOpen={isNotificationCenterOpen === NoticeLevel.WARNING}
						filter={NoticeLevel.WARNING}
						className="type-warning"
						title={t('Warnings')}
					/>
					<NotificationCenterPanelToggle
						onClick={(e) => onToggleNotifications(e, NoticeLevel.NOTIFICATION | NoticeLevel.TIP)}
						isOpen={
							isNotificationCenterOpen === ((NoticeLevel.NOTIFICATION | NoticeLevel.TIP) as NoticeLevel)
						}
						filter={NoticeLevel.NOTIFICATION | NoticeLevel.TIP}
						className="type-notification"
						title={t('Notes')}
					/>
					<SupportPopUpToggle onClick={onToggleSupportPanel} isOpen={isSupportPanelOpen} />
				</div>
			</ErrorBoundary>
			<Navbar data-bs-theme="dark" fixed="top" expand className="bg-body-tertiary">
				<Container fluid className="mx-5">
					<Navbar.Brand>
						<Link className="badge-sofie" to="/">
							<div className="media-elem me-2 sofie-logo" />
							<div className="logo-text">Sofie {sofieName ? ' - ' + sofieName : null}</div>
						</Link>
					</Navbar.Brand>
					<Nav className="justify-content-end">
						<Nav.Link as={NavLink} to="/rundowns" activeClassName="active">
							{t('Rundowns')}
						</Nav.Link>
						{allowTesting && (
							<Nav.Link as={NavLink} to="/testTools" activeClassName="active">
								{t('Test Tools')}
							</Nav.Link>
						)}
						<Nav.Link as={NavLink} to="/status" activeClassName="active">
							{t('Status')}
						</Nav.Link>
						{allowConfigure && (
							<Nav.Link as={NavLink} to="/settings" activeClassName="active">
								{t('Settings')}
							</Nav.Link>
						)}
					</Nav>
				</Container>
			</Navbar>
		</React.Fragment>
	)
}
