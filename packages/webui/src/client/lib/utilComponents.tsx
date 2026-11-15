import _ from 'underscore'
import type * as React from 'react'

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function makeTableOfObject(o: any): React.ReactNode {
	if (typeof o === 'string') {
		return o
	}

	return (
		<table>
			<tbody>
				{Object.keys(o).map((key) => {
					const val = o[key]

					let content: any
					if (_.isObject(val)) {
						content = makeTableOfObject(val)
					} else {
						content = val
						if (_.isString(val)) {
							let json = ''
							try {
								json = JSON.parse(val)
							} catch (_e) {
								// ignore
							}
							if (json) {
								content = <pre>{JSON.stringify(json, undefined, ' ')}</pre>
							}
						}
					}
					return (
						<tr key={key}>
							<td>{key}</td>
							<td>{content}</td>
						</tr>
					)
				})}
			</tbody>
		</table>
	)
}
