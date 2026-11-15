import { BlueprintId } from '@sofie-automation/corelib/dist/dataModel/Ids'
import { INoteBase } from '@sofie-automation/corelib/dist/dataModel/Notes'
import { getHash } from '@sofie-automation/corelib/dist/hash'
import { wrapTranslatableMessageFromBlueprints } from '@sofie-automation/corelib/dist/TranslatableMessage'

import type { INotification } from './NotificationsModel.js'

export function convertNoteToNotification(note: INoteBase, blueprintIds: BlueprintId[]): INotification {
	return {
		id: getHash(JSON.stringify(note.message)), // Notes don't have an id, so fake one from the message
		severity: note.type,
		message: wrapTranslatableMessageFromBlueprints(note.message, blueprintIds),
	}
}
