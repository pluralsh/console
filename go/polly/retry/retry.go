package retry

import "time"

func NewExponential(start, max time.Duration, mult float64) *Exponential {
	return &Exponential{start: start, max: max, mult: mult}
}

func NewConstant(duration time.Duration, count int) *Constant {
	return &Constant{dur: duration, max: count}
}

func Retry[T any](algo BackoffAlgorithm, fun func() (T, error)) (res T, err error) {
	iter := 0
	for {
		res, err = fun()
		if err != nil || !algo.Continue() {
			return
		}

		iter++
		time.Sleep(algo.Backoff(iter))
	}
}
