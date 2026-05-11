package controller

import (
	console "github.com/pluralsh/deployment-operator/pkg/client"
)

func WithSentinelRun(id string) Option {
	return func(s *sentinelRunController) {
		s.sentinelRunID = id
	}
}

func WithConsoleClient(client console.Client) Option {
	return func(s *sentinelRunController) {
		s.consoleClient = client
	}
}

func WithTestDir(dir string) Option {
	return func(s *sentinelRunController) {
		s.testDir = dir
	}
}

func WithOutputDir(dir string) Option {
	return func(s *sentinelRunController) {
		s.outputDir = dir
	}
}

func WithConsoleToken(token string) Option {
	return func(s *sentinelRunController) {
		s.consoleToken = token
	}
}

func WithOutputFormat(format string) Option {
	return func(s *sentinelRunController) {
		s.outputFormat = format
	}
}

func WithTimeout(timeout string) Option {
	return func(s *sentinelRunController) {
		s.timeoutDuration = timeout
	}
}

func WithConsoleURL(url string) Option {
	return func(s *sentinelRunController) {
		s.consoleURL = url
	}
}
