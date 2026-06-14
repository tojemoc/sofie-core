import type { MediaObject } from 'timeline-state-resolver'
import { VmixInputRecord } from './types.js'

export function vmixInputCollectionId(deviceId: string): string {
	return `${deviceId}-vmix-inputs`
}

export function vmixInputMediaObjectId(record: VmixInputRecord): string {
	return record.key
}

export function vmixInputMediaId(record: VmixInputRecord): string {
	return `VMIX:INPUT:${record.key.toUpperCase()}`
}

export function vmixInputToMediaObject(record: VmixInputRecord): MediaObject {
	const now = Date.now()

	return {
		_id: record.key,
		mediaId: vmixInputMediaId(record),
		mediaPath: record.title,
		mediaSize: 0,
		mediaTime: now,
		thumbSize: 0,
		thumbTime: 0,
		cinf: '',
		tinf: '',
		_rev: String(now),
		mediainfo: {
			name: record.title,
			...(record.shortTitle !== record.title ? { shortTitle: record.shortTitle } : {}),
			vmixInputType: record.type,
			vmixInputNumber: record.number,
			...(record.durationFrames !== undefined ? { durationFrames: record.durationFrames } : {}),
		} as MediaObject['mediainfo'],
	}
}
