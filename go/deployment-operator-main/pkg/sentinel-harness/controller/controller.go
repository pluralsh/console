package controller

import (
	"bytes"
	"context"
	"encoding/json"
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

	"github.com/pluralsh/deployment-operator/pkg/log"
	"github.com/pluralsh/deployment-operator/pkg/manifests"
	"github.com/pluralsh/deployment-operator/pkg/sentinel-harness/environment"
)

const (
	junitFormat         = "JUNIT"
	junitfile           = "unit-tests.xml"
	jsonFile            = "unit-tests.json"
	sentinelTarballPath = "/ext/v1/git/sentinels/tarballs"

	testCaseFilePathEnvVar = "TEST_CASES_FILE_PATH"

	userTestDir = "user-tests"
)

func NewSentinelRunController(options ...Option) (Controller, error) {
	ctrl := &sentinelRunController{}

	for _, option := range options {
		option(ctrl)
	}

	return ctrl.init()
}

func (in *sentinelRunController) Start(_ context.Context) error {
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

	output, passed, err := in.runTests(sentinelRunJob)
	if err != nil {
		updateErr := in.consoleClient.UpdateSentinelRunJobStatus(in.sentinelRunID, &console.SentinelRunJobUpdateAttributes{
			Status: lo.ToPtr(console.SentinelRunJobStatusFailed),
		})

		return fmt.Errorf("error running tests: %w; update status err: %w", err, updateErr)
	}

	return in.consoleClient.UpdateSentinelRunJobStatus(in.sentinelRunID, &console.SentinelRunJobUpdateAttributes{
		Status: lo.Ternary(passed, lo.ToPtr(console.SentinelRunJobStatusSuccess), lo.ToPtr(console.SentinelRunJobStatusFailed)),
		Output: lo.ToPtr(output),
	})
}

func (in *sentinelRunController) runTests(fragment *console.SentinelRunJobFragment) (string, bool, error) {
	userTests := false
	modules := []string{filepath.Join(in.testDir, "terratest")}
	if fragment.UsesGit != nil && *fragment.UsesGit {
		klog.V(log.LogLevelDefault).InfoS("getting git repository")
		err := in.fetch()
		if err != nil {
			return "", false, err
		}
		modules = append(modules, filepath.Join(in.testDir, userTestDir))
		userTests = true
	}

	args := []string{"work", "init"}
	args = append(args, modules...)
	goCmd := exec.Command("go", args...)
	goCmd.Dir = in.testDir
	if err := goCmd.Run(); err != nil {
		return "", false, fmt.Errorf("error initializing go modules: %w", err)
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

	if err := cmd.Run("", args); err != nil {
		klog.Warningf("gotestsum returned an error: %v", err)
	}

	output, passed, err := DecodeTestJSONFileToString(filepath.Join(in.outputDir, jsonFile))
	if err != nil {
		return "", false, err
	}

	if in.outputFormat == junitFormat {
		out, err := os.ReadFile(junitPath)
		if err != nil {
			return "", false, err
		}
		output = string(out)
	}

	return output, passed, nil
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
		"--test.v",
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
	Action  string  `json:"Action"`
	Test    string  `json:"Test,omitempty"`
	Output  string  `json:"Output,omitempty"`
	Elapsed float64 `json:"Elapsed,omitempty"`
	Package string  `json:"Package,omitempty"`
}

func DecodeTestJSONFileToString(fileName string) (string, bool, error) {
	f, err := os.Open(fileName)
	if err != nil {
		return "", false, fmt.Errorf("error opening file: %w", err)
	}
	defer func(f *os.File) {
		err := f.Close()
		if err != nil {
			return
		}
	}(f)

	var buf bytes.Buffer
	dec := json.NewDecoder(f)
	passed := true

	for dec.More() {
		var ev TestEvent
		if err := dec.Decode(&ev); err != nil {
			return "", false, fmt.Errorf("error decoding JSON: %w", err)
		}

		switch ev.Action {
		case "run":
			_, _ = fmt.Fprintf(&buf, "=== RUN   %s\n", ev.Test)
		case "pass":
			if ev.Test != "" {
				_, _ = fmt.Fprintf(&buf, "--- PASS: %s (%.2fs)\n", ev.Test, ev.Elapsed)
			}
		case "fail":
			if ev.Test != "" {
				_, _ = fmt.Fprintf(&buf, "--- FAIL: %s (%.2fs)\n", ev.Test, ev.Elapsed)
			}
			passed = false
		case "output":
			buf.WriteString(ev.Output)
		}
	}

	return buf.String(), passed, nil
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
