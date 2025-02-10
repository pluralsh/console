package main

import (
	"github.com/pluralsh/console/go/demo/flaky-service/api"
	"github.com/pluralsh/console/go/demo/flaky-service/args"
	"github.com/pluralsh/console/go/demo/flaky-service/internal/log"
	"github.com/pluralsh/console/go/demo/flaky-service/metrics"

	"k8s.io/klog/v2"
)

func main() {
	klog.V(log.LogLevelMinimal).Info("Starting flaky service")

	args.Init()
	klog.V(log.LogLevelMinimal).InfoS("args", "BehaviorModifer", args.ResponseBehaviorModifier(), "BehaviorModifierTimestampModulus", args.BehaviorModifierTimestampModulus())

	go api.StartApiServer(args.ApiAddress(), args.ApiPath(), args.ResponseBehaviorModifier(), args.BehaviorModifierTimestampModulus())
	go metrics.StartMetricsServer(args.MetricsAddress(), args.MetricsPath())

	// keep the program running until the servers are stopped
	select {}
}
