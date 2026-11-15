import { NewUserAPI } from '@sofie-automation/meteor-lib/dist/api/user'
import { parseUserPermissions, UserPermissions } from '@sofie-automation/meteor-lib/dist/userPermissions'

import { USER_PERMISSIONS_HEADER } from '../security/auth'
import { triggerWriteAccessBecauseNoCheckNecessary } from '../security/securityVerify'
import { MethodContextAPI } from './methodContext'

export class ServerUserAPI extends MethodContextAPI implements NewUserAPI {
	async getUserPermissions(): Promise<UserPermissions> {
		triggerWriteAccessBecauseNoCheckNecessary()
		return parseUserPermissions(this.connection?.httpHeaders?.[USER_PERMISSIONS_HEADER])
	}
}
