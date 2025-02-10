package api

import (
	"net/http"

	"github.com/pluralsh/console/go/demo/flaky-service/args"
	"github.com/pluralsh/console/go/demo/flaky-service/internal/log"
	"k8s.io/klog/v2"
)

func getHttpHandler(modifier args.BehaviorModifier, timestampModulus int64) func(http.ResponseWriter, *http.Request) {
	switch modifier {
	case args.BehaviorModifierTimestamp:
		return HandleRequestTimestampModulus(timestampModulus)
	case args.BehaviorModifierNone:
		return HandleRequestDefault()
	default:
		return HandleRequestDefault()
	}
}

func StartApiServer(address string, apiPath string, modifier args.BehaviorModifier, timestampModulus int64) {
	klog.V(log.LogLevelMinimal).InfoS("Starting API server", "address", address, "apiPath", apiPath, "modifier", modifier)

	http.HandleFunc(apiPath, getHttpHandler(modifier, timestampModulus))
	if err := http.ListenAndServe(address, nil); err != nil {
		klog.ErrorS(err, "Could not start API server")
	}
}
