package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"gotest.tools/gotestsum/cmd"
	"k8s.io/klog/v2"
	"sigs.k8s.io/yaml"

	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"github.com/pluralsh/console/go/deployment-operator/pkg/manifests"
	"github.com/pluralsh/console/go/deployment-operator/pkg/sentinel-harness/environment"
)

const (
	junitFormat         = "JUNIT"
	junitfile           = "unit-tests.xml"
	jsonFile            = "unit-tests.json"
	sentinelTarballPath = "/ext/v1/git/sentinels/tarballs"

	testCaseFilePathEnvVar = "TEST_CASES_FILE_PATH"

	userTestDir = "user-tests"

	// maxErrorLength mirrors the length limit on the console's sentinel_run_jobs.error column.
	maxErrorLength         = 2000
	maxCommandOutputLength = 1000
)

func NewSentinelRunController(options ...Option) (Controller, error) {
	ctrl := &sentinelRunController{}

	for _, option := range options {
		option(ctrl)
	}

	return ctrl.init()
}

func (in *sentinelRunController) Start(_ context.Context) (retErr error) {
	sentinelRunJob, err := in.consoleClient.GetSentinelRunJob(in.sentinelRunID)
	if err != nil {
		return err
	}
	if sentinelRunJob.Status != console.SentinelRunJobStatusPending && !environment.IsDev() {
		klog.V(log.LogLevelDefault).InfoS("sentinel run job is not pending, skipping", "status", sentinelRunJob.Status)
		return nil
	}
	if err := in.consoleClient.UpdateSentinelRunJobStatus(in.sentinelRunID, &console.SentinelRunJobUpdateAttributes{
		Status: lo.ToPtr(console.SentinelRunJobStatusRunning),
	}); err != nil {
		return err
	}

	defer func() {
		if r := recover(); r != nil {
			retErr = in.reportFailure("", fmt.Errorf("sentinel harness panicked: %v", r))
		}
	}()

	output, passed, err := in.runTests(sentinelRunJob)
	if err != nil {
		return in.reportFailure(output, err)
	}

	return in.consoleClient.UpdateSentinelRunJobStatus(in.sentinelRunID, &console.SentinelRunJobUpdateAttributes{
		Status: lo.Ternary(passed, lo.ToPtr(console.SentinelRunJobStatusSuccess), lo.ToPtr(console.SentinelRunJobStatusFailed)),
		Output: lo.ToPtr(output),
	})
}

// reportFailure marks the run job as failed in the console, surfacing err as the job's runtime error alongside any
// test output collected before the failure.
func (in *sentinelRunController) reportFailure(output string, err error) error {
	attrs := &console.SentinelRunJobUpdateAttributes{
		Status: lo.ToPtr(console.SentinelRunJobStatusFailed),
		Error:  lo.ToPtr(truncateHead(err.Error(), maxErrorLength)),
	}
	if output != "" {
		attrs.Output = lo.ToPtr(output)
	}

	if updateErr := in.consoleClient.UpdateSentinelRunJobStatus(in.sentinelRunID, attrs); updateErr != nil {
		return fmt.Errorf("error running tests: %w; update status err: %w", err, updateErr)
	}
	return fmt.Errorf("error running tests: %w", err)
}

func (in *sentinelRunController) runTests(fragment *console.SentinelRunJobFragment) (string, bool, error) {
	userTests := false
	modules := []string{filepath.Join(in.testDir, "terratest")}
	if fragment.UsesGit != nil && *fragment.UsesGit {
		klog.V(log.LogLevelDefault).InfoS("getting git repository")
		err := in.fetch()
		if err != nil {
			return "", false, fmt.Errorf("error fetching test code from git: %w", err)
		}
		modules = append(modules, filepath.Join(in.testDir, userTestDir))
		userTests = true
	}

	args := []string{"work", "init"}
	args = append(args, modules...)
	goCmd := exec.Command("go", args...)
	goCmd.Dir = in.testDir
	if out, err := goCmd.CombinedOutput(); err != nil {
		return "", false, withCommandOutput(fmt.Errorf("error initializing go modules: %w", err), out)
	}

	integrationTestConfig, err := in.getIntegrationTestConfiguration(fragment)
	if err != nil {
		return "", false, err
	}

	klog.V(log.LogLevelDefault).InfoS("found integration test configuration", "name", *fragment.Check)

	path, err := createTestCasesFile(integrationTestConfig, fragment.Cluster)
	if err != nil {
		return "", false, err
	}

	klog.V(log.LogLevelDefault).InfoS("created test cases file", "path", path)
	if err := os.Setenv(testCaseFilePathEnvVar, path); err != nil {
		return "", false, err
	}

	err = os.Chdir(in.testDir)
	if err != nil {
		return "", false, err
	}

	klog.V(log.LogLevelDefault).InfoS("running tests", "testDir", in.testDir)

	junitPath := filepath.Join(in.outputDir, junitfile)

	args = buildGotestsumRunArgs(in.outputDir, junitPath, in.timeoutDuration, integrationTestConfig, userTests)
	klog.V(log.LogLevelDefault).InfoS("running gotestsum", "args", args)

	runErr := cmd.Run("", args)
	if runErr != nil {
		klog.Warningf("gotestsum returned an error: %v", runErr)
	}

	result, err := decodeTestJSONFile(filepath.Join(in.outputDir, jsonFile))
	if err != nil {
		if runErr != nil {
			err = fmt.Errorf("gotestsum failed: %w (%w)", runErr, err)
		}
		return "", false, errors.Join(err, runPostrunScript(integrationTestConfig))
	}

	output := result.output
	if in.outputFormat == junitFormat {
		out, err := os.ReadFile(junitPath)
		if err != nil {
			return "", false, errors.Join(fmt.Errorf("error reading junit output: %w", err), runPostrunScript(integrationTestConfig))
		}
		output = string(out)
	}

	var testErr error
	switch {
	case result.buildErrors != "":
		testErr = fmt.Errorf("test packages failed to build:\n%s", result.buildErrors)
	case result.tests == 0 && runErr != nil:
		testErr = fmt.Errorf("no tests were run, gotestsum failed: %w", runErr)
	}

	if err := errors.Join(testErr, runPostrunScript(integrationTestConfig)); err != nil {
		return output, false, err
	}

	return output, result.passed, nil
}

func buildGotestsumRunArgs(outputDir, junitPath, timeout string, integrationTestConfig *console.SentinelCheckIntegrationTestConfigurationFragment, useUserTests bool) []string {
	args := []string{
		"--format", "testname",
		"--junitfile", junitPath,
		"--jsonfile", filepath.Join(outputDir, jsonFile),
	}

	shouldRerunFailures := integrationTestConfig != nil && integrationTestConfig.RerunFailures != nil && *integrationTestConfig.RerunFailures
	if shouldRerunFailures {
		// gotestsum requires an explicit package list when rerun-fails is used with go test args.
		args = append(args, "--packages=./...")

		if rerunFailuresCount := lo.FromPtr(integrationTestConfig.RerunFailuresCount); rerunFailuresCount > 0 {
			args = append(args, fmt.Sprintf("--rerun-fails=%d", rerunFailuresCount))
		} else {
			args = append(args, "--rerun-fails")
		}
	}

	goTestArgs := []string{
		"--test.timeout", timeout,
	}

	if integrationTestConfig != nil && integrationTestConfig.Gotestsum != nil {
		if integrationTestConfig.Gotestsum.P != nil {
			p := strings.TrimSpace(*integrationTestConfig.Gotestsum.P)
			if p != "" {
				goTestArgs = append(goTestArgs, "-p", p)
			}
		}

		if integrationTestConfig.Gotestsum.Parallel != nil {
			parallel := strings.TrimSpace(*integrationTestConfig.Gotestsum.Parallel)
			if parallel != "" {
				goTestArgs = append(goTestArgs, "-parallel", parallel)
			}
		}
	}
	disablesDefaultIntegrationTestCases := integrationTestConfig != nil && integrationTestConfig.Default != nil && integrationTestConfig.Default.Ignore != nil && lo.FromPtr(integrationTestConfig.Default.Ignore)

	goTestArgs = append(goTestArgs, "--test.count", "1")
	args = append(args, "--")
	if !disablesDefaultIntegrationTestCases {
		args = append(args, "./terratest/...")
	}
	if useUserTests {
		args = append(args, "./user-tests/...")
	}
	args = append(args, goTestArgs...)

	return args
}

func runPostrunScript(integrationTestConfig *console.SentinelCheckIntegrationTestConfigurationFragment) error {
	if integrationTestConfig == nil || integrationTestConfig.PostrunScript == nil {
		return nil
	}

	script := strings.TrimSpace(*integrationTestConfig.PostrunScript)
	if script == "" {
		return nil
	}

	klog.V(log.LogLevelDefault).InfoS("running postrun script")
	cmd := exec.Command("/bin/sh", "-c", script)
	cmd.Env = os.Environ()

	output, err := cmd.CombinedOutput()
	if err != nil {
		if len(output) > 0 {
			klog.Warningf("postrun script output: %s", string(output))
		}
		return withCommandOutput(fmt.Errorf("postrun script failed: %w", err), output)
	}

	return nil
}

// withCommandOutput appends the tail of a failed command's output to err, since that's usually where the cause is.
func withCommandOutput(err error, output []byte) error {
	out := strings.TrimSpace(string(output))
	if out == "" {
		return err
	}
	return fmt.Errorf("%w:\n%s", err, truncateTail(out, maxCommandOutputLength))
}

func truncateHead(s string, n int) string {
	if runes := []rune(s); len(runes) > n {
		return string(runes[:n-3]) + "..."
	}
	return s
}

func truncateTail(s string, n int) string {
	if runes := []rune(s); len(runes) > n {
		return "..." + string(runes[len(runes)-n+3:])
	}
	return s
}

func (in *sentinelRunController) getIntegrationTestConfiguration(fragment *console.SentinelRunJobFragment) (*console.SentinelCheckIntegrationTestConfigurationFragment, error) {
	if fragment.Check == nil {
		return nil, fmt.Errorf("could not get integration test configuration: check name is nil")
	}

	if fragment.SentinelRun == nil {
		return nil, fmt.Errorf("could not get integration test configuration: sentinel run is nil")
	}

	var result *console.SentinelCheckIntegrationTestConfigurationFragment
	for _, check := range fragment.SentinelRun.Checks {
		if check.Type != console.SentinelCheckTypeIntegrationTest {
			continue
		}

		if !strings.EqualFold(check.Name, *fragment.Check) {
			continue
		}

		result = check.Configuration.IntegrationTest
		break
	}

	if result == nil {
		return nil, fmt.Errorf("could not find integration test configuration for %s", *fragment.Check)
	}

	return result, nil
}

func (in *sentinelRunController) init() (Controller, error) {
	if len(in.sentinelRunID) == 0 {
		return nil, fmt.Errorf("could not initialize controller: sentinel run id is empty")
	}

	if in.consoleClient == nil {
		return nil, fmt.Errorf("could not initialize controller: consoleClient is nil")
	}

	return in, nil
}

func (in *sentinelRunController) fetch() error {
	newDir := filepath.Join(in.testDir, userTestDir)
	err := os.MkdirAll(newDir, 0755)
	if err != nil {
		return err
	}

	tarballUrl, err := createTarballURL(in.consoleURL, in.sentinelRunID)
	if err != nil {
		return err
	}

	resp, _, err := manifests.GetReader(tarballUrl, in.consoleToken)
	if err != nil {
		return err
	}
	defer resp.Close()

	if err := manifests.Untar(newDir, resp); err != nil {
		return err
	}

	return nil
}

func createTarballURL(consoleURL, runJobId string) (string, error) {
	u, err := url.Parse(consoleURL)
	if err != nil {
		return "", err
	}
	u.Path = sentinelTarballPath
	q := u.Query()
	q.Set("id", runJobId)
	u.RawQuery = q.Encode()
	return u.String(), nil
}

type TestEvent struct {
	Action     string  `json:"Action"`
	Test       string  `json:"Test,omitempty"`
	Output     string  `json:"Output,omitempty"`
	Elapsed    float64 `json:"Elapsed,omitempty"`
	Package    string  `json:"Package,omitempty"`
	ImportPath string  `json:"ImportPath,omitempty"`
}

type testResult struct {
	output      string
	passed      bool
	tests       int
	buildErrors string
}

func DecodeTestJSONFileToString(fileName string) (string, bool, error) {
	result, err := decodeTestJSONFile(fileName)
	if err != nil {
		return "", false, err
	}
	return result.output, result.passed, nil
}

func decodeTestJSONFile(fileName string) (*testResult, error) {
	f, err := os.Open(fileName)
	if err != nil {
		return nil, fmt.Errorf("error opening file: %w", err)
	}
	defer func(f *os.File) {
		err := f.Close()
		if err != nil {
			return
		}
	}(f)

	var buf, buildOutput, buildErrors bytes.Buffer
	dec := json.NewDecoder(f)
	result := &testResult{passed: true}

	for dec.More() {
		var ev TestEvent
		if err := dec.Decode(&ev); err != nil {
			return nil, fmt.Errorf("error decoding JSON: %w", err)
		}

		switch ev.Action {
		case "run":
			result.tests++
			_, _ = fmt.Fprintf(&buf, "=== RUN   %s\n", ev.Test)
		case "pass":
			if ev.Test != "" {
				_, _ = fmt.Fprintf(&buf, "--- PASS: %s (%.2fs)\n", ev.Test, ev.Elapsed)
			}
		case "fail":
			if ev.Test != "" {
				_, _ = fmt.Fprintf(&buf, "--- FAIL: %s (%.2fs)\n", ev.Test, ev.Elapsed)
			}
			result.passed = false
		case "output":
			buf.WriteString(ev.Output)
		case "build-output":
			buf.WriteString(ev.Output)
			buildOutput.WriteString(ev.Output)
		case "build-fail":
			result.passed = false
			buildErrors.Write(buildOutput.Bytes())
			buildOutput.Reset()
		}
	}

	result.output = buf.String()
	result.buildErrors = strings.TrimSpace(buildErrors.String())
	return result, nil
}

func createTestCasesFile(configuration *console.SentinelCheckIntegrationTestConfigurationFragment, cluster *console.SentinelRunJobFragment_Cluster) (string, error) {
	if configuration == nil {
		return "", fmt.Errorf("could not create test cases file: configuration is nil")
	}

	bindings := buildBindings(cluster)
	err := templateIntegrationTestConfig(configuration, bindings)
	if err != nil {
		return "", err
	}

	testCase := TestCase{
		Configurations: lo.FromSlicePtr(configuration.Cases),
		Defaults:       configuration.Default,
	}

	yamlBytes, err := yaml.Marshal(testCase)
	if err != nil {
		return "", fmt.Errorf("error marshaling test cases to YAML: %w", err)
	}

	// Create temp directory
	tmpDir, err := os.MkdirTemp("", "test-cases")
	if err != nil {
		return "", fmt.Errorf("error creating temp directory: %w", err)
	}

	// Write YAML to file in temp directory
	filePath := filepath.Join(tmpDir, "test-cases.yaml")
	if err := os.WriteFile(filePath, yamlBytes, 0644); err != nil {
		return "", fmt.Errorf("error writing test cases file: %w", err)
	}

	return filePath, nil
}
