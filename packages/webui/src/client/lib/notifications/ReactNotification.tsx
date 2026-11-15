import { useEffect } from 'react'

import { getRandomString } from '@sofie-automation/corelib/dist/lib'

import { getCurrentTime } from '../systemTime.js'
import { NoticeLevel, Notification, NotificationCenter } from './notifications.js'
import type { NotificationAction } from './notifications.js'

export interface IProps {
	level?: NoticeLevel
	source?: string
	actions?: NotificationAction[]
	rank?: number
}

export function ReactNotification(props: React.PropsWithChildren<IProps>): JSX.Element | null {
	useEffect(() => {
		const notificationId = getRandomString()
		const notification = new Notification(
			notificationId,
			props.level ?? NoticeLevel.TIP,
			props.children ?? null,
			props.source || 'ReactNotification',
			getCurrentTime(),
			true,
			props.actions,
			props.rank
		)
		NotificationCenter.push(notification)

		return () => {
			NotificationCenter.drop(notificationId)
		}
	}, [props.level, props.source, props.actions, props.rank])

	return null
}
