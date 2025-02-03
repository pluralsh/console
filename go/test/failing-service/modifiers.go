package main

import (
	"time"

	"github.com/pluralsh/console/go/test/failing-service/args"
)

func modify(modifier args.BehaviorModifier) bool {
	switch modifier {
	case args.BehaviorModifierNone:
		return false
	case args.BehaviorModifierTimestamp:
		return true
	}

	return false
}

func evaluateTimestampModifier() bool {
	now := time.Now()
	timestamp := now.Unix()

	return timestamp%args.BehaviorModifierTimestampModulus() == 0
}
