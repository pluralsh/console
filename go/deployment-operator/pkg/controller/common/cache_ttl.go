package common

import "time"

const controllerDequeueJitterAllowance = time.Second

func ControllerCacheTTL(baseTTL, pollInterval time.Duration) time.Duration {
	if pollInterval <= 0 {
		return baseTTL
	}

	requiredTTL := pollInterval*2 + controllerDequeueJitterAllowance
	if requiredTTL > baseTTL {
		return requiredTTL
	}
	return baseTTL
}
