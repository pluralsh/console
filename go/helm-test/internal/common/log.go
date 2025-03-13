package common

import (
	"k8s.io/klog/v2"
)

func LogLevel() klog.Level {
	// Can be used when debugging app to easily enable additional logging.
	// 0 - enabled
	// 1 - disabled
	return klog.Level(1)
}
