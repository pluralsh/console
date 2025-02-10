package args

import (
	"flag"
)

const (
	defaultApiPath        = "/api"
	defaultApiAddress     = ":8080"
	defaultMetricsPath    = "/metrics"
	defaultMetricsAddress = ":8081"
)

type BehaviorModifier string

const (
	BehaviorModifierNone      BehaviorModifier = "none"
	BehaviorModifierTimestamp BehaviorModifier = "timestamp"
)

var (
	argApiPath                          = flag.String("api-path", defaultApiPath, "The path to the api endpoint.")
	argApiAddress                       = flag.String("api-bind-address", defaultApiAddress, "The address the api endpoint binds to.")
	argMetricsPath                      = flag.String("metrics-path", defaultMetricsPath, "The path to the metrics endpoint.")
	argMetricsAddress                   = flag.String("metrics-bind-address", defaultMetricsAddress, "The address the metric endpoint binds to.")
	argResponseBehaviorModifier         = flag.String("response-behavior-modifier", string(BehaviorModifierNone), "The response behavior modifier. One of: none, timestamp")
	argBehaviorModifierTimestampModulus = flag.Int64("behavior-modifier-timestamp-modulus", 3, "Modifies the behavior of the response when timestamp is a multiplier of provided value.")
)

func Init() {
	flag.Parse()
}

func ApiPath() string {
	return *argApiPath
}

func ApiAddress() string {
	return *argApiAddress
}

func MetricsPath() string {
	return *argMetricsPath
}

func MetricsAddress() string {
	return *argMetricsAddress
}

func ResponseBehaviorModifier() BehaviorModifier {
	switch *argResponseBehaviorModifier {
	case string(BehaviorModifierNone):
		return BehaviorModifierNone
	case string(BehaviorModifierTimestamp):
		return BehaviorModifierTimestamp
	}
	return BehaviorModifierNone
}

func BehaviorModifierTimestampModulus() int64 {
	return *argBehaviorModifierTimestampModulus
}
