package common_test

import (
	"fmt"
	"math/rand"
)

type Generator[T string] interface {
	WithPrefix(prefix string, length int) T
	Random(length int) T
}

type generator struct {
	characters string
}

func (in *generator) WithPrefix(prefix string, length int) string {
	return fmt.Sprintf("%s-%s", prefix, in.Random(length))
}

func (in *generator) Random(length int) string {
	b := make([]byte, length)
	for i := range b {
		b[i] = in.characters[rand.Intn(len(in.characters))]
	}

	return string(b)
}

func StringGenerator() Generator[string] {
	return &generator{
		characters: "abcdefghijklmnopqrstuvwxyz0123456789",
	}
}
