package algorithms

import (
	"math/rand"
	"sync"
	"time"
)

var rng = struct {
	sync.Mutex
	rand *rand.Rand
}{
	rand: rand.New(rand.NewSource(time.Now().UnixNano())),
}

// Int returns a non-negative pseudo-random int.
func Int() int {
	rng.Lock()
	defer rng.Unlock()
	return rng.rand.Int()
}

// Intn generates an integer in range [0,max).
// By design this should panic if input is invalid, <= 0.
func Intn(max int) int {
	rng.Lock()
	defer rng.Unlock()
	return rng.rand.Intn(max)
}

// IntnRange generates an integer in range [min,max).
// By design this should panic if input is invalid, <= 0.
func IntnRange(min, max int) int {
	rng.Lock()
	defer rng.Unlock()
	return rng.rand.Intn(max-min) + min
}

// Coinflip method
func Coinflip(num, dem int) bool {
	r := Intn(dem)
	return r < num
}

const (
	// We omit vowels from the set of available characters to reduce the chances
	// of "bad words" being formed.
	alphanums = "bcdfghjklmnpqrstvwxz2456789"
	// No. of bits required to index into alphanums string.
	alphanumsIdxBits = 5
	// Mask used to extract last alphanumsIdxBits of an int.
	alphanumsIdxMask = 1<<alphanumsIdxBits - 1
	// No. of random letters we can extract from a single int63.
	maxAlphanumsPerInt = 63 / alphanumsIdxBits
)

// String generates a random alphanumeric string, without vowels, which is n
// characters long.  This will panic if n is less than zero.
func String(n int) string {
	b := make([]byte, n)
	rng.Lock()
	defer rng.Unlock()

	randomInt63 := rng.rand.Int63()
	remaining := maxAlphanumsPerInt
	for i := 0; i < n; {
		if remaining == 0 {
			randomInt63, remaining = rng.rand.Int63(), maxAlphanumsPerInt
		}
		if idx := int(randomInt63 & alphanumsIdxMask); idx < len(alphanums) {
			b[i] = alphanums[idx]
			i++
		}
		randomInt63 >>= alphanumsIdxBits
		remaining--
	}
	return string(b)
}
