package args

import (
	"flag"
)

const (
	defaultMetricsPath    = "/metrics"
	defaultMetricsAddress = ":8000"

	defaultAddress = ":8080"
)

type BehaviorModifier string

const (
	BehaviorModifierNone      BehaviorModifier = "none"
	BehaviorModifierTimestamp BehaviorModifier = "timestamp"
)

var (
	argAddr                             = flag.String("address", defaultAddress, "The address to bind to.")
	argMetricsAddr                      = flag.String("metrics-bind-address", defaultMetricsAddress, "The address the metric endpoint binds to.")
	argResponseBehaviorModifier         = flag.String("response-behavior-modifier", string(BehaviorModifierTimestamp), "The response behavior modifier. One of: none, timestamp")
	argBehaviorModifierTimestampModulus = flag.Int64("behavior-modifier-timestamp-modulus", 3, "Modifies the behavior of the response when timestamp is a multiplier of provided value.")
)

func Init() {
	flag.Parse()

	initMetrics()
}

func MetricsAddress() string {
	return *argMetricsAddr
}

func Address() string {
	return *argAddr
}

func ResponseBehaviorModifier() BehaviorModifier {
	switch *argResponseBehaviorModifier {
	case string(BehaviorModifierNone):
		return BehaviorModifierNone
	case string(BehaviorModifierTimestamp):
		return BehaviorModifierTimestamp
	}

	return BehaviorModifierTimestamp
}

func BehaviorModifierTimestampModulus() int64 {
	return *argBehaviorModifierTimestampModulus
}
