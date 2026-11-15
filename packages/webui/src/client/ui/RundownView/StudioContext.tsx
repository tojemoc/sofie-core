import React from 'react'

import type { UIStudio } from '@sofie-automation/corelib/src/dataModel/Studio'

type StudioFromContext = UIStudio | undefined

const StudioContext = React.createContext<StudioFromContext>(undefined)

export default StudioContext
