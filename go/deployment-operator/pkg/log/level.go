package log

import (
	"k8s.io/klog/v2"
)

const (
	LogLevelMinimal  = klog.Level(0)
	LogLevelInfo     = klog.Level(1)
	LogLevelVerbose  = klog.Level(2)
	LogLevelExtended = klog.Level(3)
	LogLevelDebug    = klog.Level(4)
	LogLevelTrace    = klog.Level(5)
	LogLevelDefault  = LogLevelInfo
)
