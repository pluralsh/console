package helpers

import "time"

const (
	defaultCleanupTimeout = 5 * time.Minute
	defaultTickerInterval = 5 * time.Second

	BusyboxImage = "busybox:1.36"
)
