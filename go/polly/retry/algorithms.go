package retry

import (
	"time"

	"github.com/pluralsh/polly/algorithms"
)

type BackoffAlgorithm interface {
	Backoff(iter int) time.Duration
	Continue() bool
}

type Exponential struct {
	mult  float64
	max   time.Duration
	start time.Duration
}

func (exp *Exponential) Backoff(iter int) time.Duration {
	dur := algorithms.Max(float64(exp.start)*exp.mult, float64(exp.max))
	exp.start = time.Duration(dur)
	return exp.start
}

func (exp *Exponential) Continue() bool {
	return exp.max > exp.start
}

type Constant struct {
	max   int
	dur   time.Duration
	count int
}

func (con *Constant) Backoff(iter int) time.Duration {
	con.count++
	return con.dur
}

func (con *Constant) Continue() bool {
	return con.count < con.max
}
