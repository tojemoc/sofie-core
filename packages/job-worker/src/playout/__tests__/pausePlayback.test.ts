import { protectString } from '@sofie-automation/corelib/dist/protectedString'
import { findPreviousPlayablePart } from '../pausePlayback.js'
import type { DBPart } from '@sofie-automation/corelib/dist/dataModel/Part'

function part(id: string, flags: { invalid?: boolean; floated?: boolean } = {}): Pick<DBPart, '_id' | 'invalid' | 'floated'> {
	return {
		_id: protectString(id),
		invalid: flags.invalid,
		floated: flags.floated,
	}
}

describe('findPreviousPlayablePart', () => {
	it('returns the previous playable part', () => {
		const parts = [part('a'), part('b'), part('c')]
		expect(findPreviousPlayablePart(parts, protectString('c'))?._id).toEqual(protectString('b'))
	})

	it('skips invalid and floated parts', () => {
		const parts = [part('a'), part('b', { floated: true }), part('c', { invalid: true }), part('d')]
		expect(findPreviousPlayablePart(parts, protectString('d'))?._id).toEqual(protectString('a'))
	})

	it('returns undefined at the start of the rundown', () => {
		const parts = [part('a'), part('b')]
		expect(findPreviousPlayablePart(parts, protectString('a'))).toBeUndefined()
	})
})
