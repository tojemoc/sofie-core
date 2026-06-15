import { XMLParser } from 'fast-xml-parser'
import { VmixInputRecord } from './types.js'

interface VmixXmlInputAttributes {
	key?: string
	number?: string
	type?: string
	title?: string
	shortTitle?: string
	duration?: string
	state?: string
}

interface VmixXmlInputNode {
	'@_key'?: string
	'@_number'?: string
	'@_type'?: string
	'@_title'?: string
	'@_shortTitle'?: string
	'@_duration'?: string
	'@_state'?: string
}

const xmlParser = new XMLParser({
	ignoreAttributes: false,
	isArray: (tagName) => tagName === 'input',
})

function asInputArray(raw: unknown): VmixXmlInputNode[] {
	if (!raw) return []
	if (Array.isArray(raw)) return raw as VmixXmlInputNode[]
	return [raw as VmixXmlInputNode]
}

function readAttr(input: VmixXmlInputNode, key: keyof VmixXmlInputAttributes): string | undefined {
	const prefixed = input[`@_${key}`]
	if (prefixed !== undefined) return String(prefixed)
	return undefined
}

export function parseVmixInputsFromXml(xmlBody: string): VmixInputRecord[] {
	const parsed = xmlParser.parse(xmlBody) as {
		vmix?: {
			inputs?: {
				input?: unknown
			}
		}
	}

	const inputs = asInputArray(parsed?.vmix?.inputs?.input)
	const records: VmixInputRecord[] = []

	for (const input of inputs) {
		const key = readAttr(input, 'key')
		const title = readAttr(input, 'title')
		const numberRaw = readAttr(input, 'number')
		const type = readAttr(input, 'type')

		if (!key || !title || !numberRaw || !type) continue

		const number = Number.parseInt(numberRaw, 10)
		if (Number.isNaN(number)) continue

		const durationRaw = readAttr(input, 'duration')
		const durationFrames =
			durationRaw !== undefined && durationRaw !== '' ? Number.parseInt(durationRaw, 10) : undefined

		records.push({
			key,
			number,
			type,
			title,
			shortTitle: readAttr(input, 'shortTitle') ?? title,
			durationFrames: durationFrames !== undefined && !Number.isNaN(durationFrames) ? durationFrames : undefined,
		})
	}

	return records
}

export function serializeVmixInputRecords(inputs: VmixInputRecord[]): string {
	return JSON.stringify(
		inputs.map((input) => ({
			key: input.key,
			title: input.title,
			type: input.type,
		}))
	)
}
