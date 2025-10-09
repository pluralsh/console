package helpers

import (
	"sync/atomic"
)

type TokenRotator interface {
	GetNextToken() string
}

type RoundRobinTokenRotator struct {
	Tokens []string
	index  atomic.Uint32
}

func NewRoundRobinTokenRotator(tokens []string) *RoundRobinTokenRotator {
	tokenCpy := make([]string, len(tokens))
	copy(tokenCpy, tokens)

	return &RoundRobinTokenRotator{
		Tokens: tokenCpy,
	}
}

func (rr *RoundRobinTokenRotator) GetNextToken() string {

	if len(rr.Tokens) == 0 {
		return ""
	}

	currentIndex := rr.index.Load()
	rr.index.Add(1)
	return rr.Tokens[currentIndex%uint32(len(rr.Tokens))]
}
