import type { ReadonlyDeep } from 'type-fest'

import type { SomeObjectOverrideOp } from '@sofie-automation/corelib/dist/settings/objectWithOverrides'

export function hasOpWithPath(allOps: ReadonlyDeep<SomeObjectOverrideOp[]>, id: string, subpath: string): boolean {
	const path = `${id}.${subpath}`
	return !!allOps.find((op) => op.path === path)
}
