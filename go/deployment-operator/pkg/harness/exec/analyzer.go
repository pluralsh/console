package exec

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"strings"

	"github.com/pluralsh/deployment-operator/pkg/log"
	"k8s.io/klog/v2"
)

type outputAnalyzer struct {
	stdout *bytes.Buffer
	stderr *bytes.Buffer

	heuristics []OutputAnalyzerHeuristic
	cfg        analyzerConfig
}

func (in *outputAnalyzer) Stdout() io.Writer {
	return in.stdout
}

func (in *outputAnalyzer) Stderr() io.Writer {
	return in.stderr
}

func (in *outputAnalyzer) Detect() []error {
	errors := make([]error, 0)
	output := in.stdout.String()

	for _, heuristic := range in.heuristics {
		if potentialErrors := heuristic.Detect(bufio.NewScanner(strings.NewReader(output))); len(potentialErrors) > 0 {
			errors = append(errors, potentialErrors.ToErrors()...)
		}
	}

	klog.V(log.LogLevelInfo).InfoS("output analysis complete", "checkStderr", in.cfg.checkStderr, "potentialErrors", len(errors))
	if in.cfg.checkStderr && in.stderr.Len() > 0 {
		errors = append(errors, fmt.Errorf("%s", in.stderr.String()))
	}

	return errors
}

func NewOutputAnalyzer(heuristics []OutputAnalyzerHeuristic, opts ...AnalyzerOption) OutputAnalyzer {
	cfg := analyzerConfig{checkStderr: true}
	for _, o := range opts {
		o(&cfg)
	}

	return &outputAnalyzer{
		stdout:     bytes.NewBuffer([]byte{}),
		stderr:     bytes.NewBuffer([]byte{}),
		heuristics: heuristics,
		cfg:        cfg,
	}
}
