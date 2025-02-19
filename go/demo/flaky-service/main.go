package main

import (
	"log/slog"
	"os"

	"github.com/pluralsh/console/go/demo/flaky-service/api"
	"github.com/pluralsh/console/go/demo/flaky-service/args"
	"github.com/pluralsh/console/go/demo/flaky-service/metrics"
)

func main() {
	args.Init()

	handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	slog.SetDefault(slog.New(handler))

	slog.Info("Starting flaky service", "BehaviorModifer", args.ResponseBehaviorModifier(), "BehaviorModifierTimestampModulus", args.BehaviorModifierTimestampModulus())

	go api.StartApiServer(args.ApiAddress(), args.ApiPath(), args.ResponseBehaviorModifier(), args.BehaviorModifierTimestampModulus())
	go metrics.StartMetricsServer(args.MetricsAddress(), args.MetricsPath())

	// keep the program running until the servers are stopped
	select {}
}
