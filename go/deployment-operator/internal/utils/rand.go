package utils

import (
	"math/rand"
	"time"
)

func Jitter(interval time.Duration) time.Duration {
	jittered := int64(float64(int64(interval)) * rand.Float64())
	return time.Duration(jittered)
}
