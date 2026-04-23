package config

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/log"
)

const (
	envAWSConfigFile            = "AWS_CONFIG_FILE"
	envAWSSharedCredentialsFile = "AWS_SHARED_CREDENTIALS_FILE"

	defaultAWSConfigFilePath            = "/shared/.aws/config"
	defaultAWSSharedCredentialsFilePath = "/shared/.aws/credentials"
)

var (
	manager AWSConfigManager
)

func init() {
	var err error
	manager, err = newAWSConfigManager()
	if err != nil {
		klog.Fatalf("failed to initialize AWS config manager: %v", err)
	}
}

// AWSProfile represents a single AWS config file profile entry.
type AWSProfile struct {
	AccessKeyId     string
	SecretAccessKey string
	RoleArn         string // empty if not assuming a role
}

type AWSConfigManager interface {
	Add(name string, p AWSProfile) error
	Remove(name string) error
}

// AWSConfigManager maintains an in-memory copy of ~/.aws/config and writes
// through to disk on every mutation.
type awsConfigManager struct {
	mu                        sync.RWMutex
	profiles                  map[string]AWSProfile
	configFilePath            string
	sharedCredentialsFilePath string
}

func GetAWSConfigManager() AWSConfigManager {
	return manager
}

func newAWSConfigManager() (AWSConfigManager, error) {
	m := &awsConfigManager{
		profiles: make(map[string]AWSProfile),
	}

	if err := m.load(); err != nil {
		return nil, err
	}

	return m, nil
}

func (in *awsConfigManager) configPath() (string, error) {
	path, exists := os.LookupEnv(envAWSConfigFile)
	if !exists {
		return defaultAWSConfigFilePath, nil
	}

	klog.V(log.LogLevelDebug).InfoS(
		"AWS config path",
		"path", path,
	)

	return path, nil
}

func (in *awsConfigManager) sharedCredentialsPath() (string, error) {
	path, exists := os.LookupEnv(envAWSSharedCredentialsFile)
	if !exists {
		return defaultAWSSharedCredentialsFilePath, nil
	}

	klog.V(log.LogLevelDebug).InfoS(
		"AWS shared credentials path",
		"path", path,
	)

	return path, nil
}

func (in *awsConfigManager) Add(name string, p AWSProfile) error {
	in.mu.Lock()
	defer in.mu.Unlock()

	if _, exists := in.profiles[name]; exists {
		klog.V(log.LogLevelDebug).InfoS(
			"profile already exists",
			"name", name,
			"profile", p,
		)
		return nil
	}

	in.profiles[name] = p
	return in.flush()
}

func (in *awsConfigManager) Remove(name string) error {
	in.mu.Lock()
	defer in.mu.Unlock()

	if _, ok := in.profiles[name]; !ok {
		return nil
	}

	delete(in.profiles, name)
	return in.flush()
}

// load parses existing profiles from the config file into the in-memory map.
// A missing file is treated as empty and is not an error.
func (in *awsConfigManager) load() error {
	configFilePath, err := in.configPath()
	if err != nil {
		return fmt.Errorf("failed to get AWS config path: %w", err)
	}
	in.configFilePath = configFilePath

	if err := os.MkdirAll(filepath.Dir(configFilePath), 0755); err != nil {
		return fmt.Errorf("failed to create AWS config directory: %w", err)
	}

	sharedCredentialsPath, err := in.sharedCredentialsPath()
	if err != nil {
		return fmt.Errorf("failed to get AWS shared credentials path: %w", err)
	}
	in.sharedCredentialsFilePath = sharedCredentialsPath

	if err := os.MkdirAll(filepath.Dir(sharedCredentialsPath), 0755); err != nil {
		return fmt.Errorf("failed to create AWS shared credentials directory: %w", err)
	}

	data, err := os.ReadFile(configFilePath)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("failed to read AWS config file: %w", err)
	}

	data, err = os.ReadFile(sharedCredentialsPath)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("failed to read AWS shared credentials file: %w", err)
	}

	in.profiles = in.parseProfiles(string(data))
	return nil
}

// flush serializes all in-memory profiles to disk atomically via a temp file rename.
// Must be called with m.mu held.
func (in *awsConfigManager) flush() error {
	tmp := in.configFilePath + ".tmp"
	if err := os.WriteFile(tmp, []byte(in.serializeConfigFile()), 0644); err != nil {
		return fmt.Errorf("failed to write AWS config: %w", err)
	}
	if err := os.Rename(tmp, in.configFilePath); err != nil {
		return fmt.Errorf("failed to rename temp file: %w", err)
	}

	tmp = in.sharedCredentialsFilePath + ".tmp"
	if err := os.WriteFile(tmp, []byte(in.serializeSharedCredentialsFile()), 0644); err != nil {
		return fmt.Errorf("failed to write AWS shared credentials: %w", err)
	}
	if err := os.Rename(tmp, in.sharedCredentialsFilePath); err != nil {
		return fmt.Errorf("failed to rename temp file: %w", err)
	}

	return nil
}

// serializeConfigFile converts the in-memory profiles map to AWS INI config file content.
func (in *awsConfigManager) serializeConfigFile() string {
	var sb strings.Builder

	sortedKeys := lo.Keys(in.profiles)
	sort.Strings(sortedKeys)

	for _, name := range sortedKeys {
		p := in.profiles[name]
		fmt.Fprintf(&sb, "[profile %s]\n", name)
		fmt.Fprintf(&sb, "source_profile = %s\n", name)
		if p.RoleArn != "" {
			fmt.Fprintf(&sb, "role_arn = %s\n", p.RoleArn)
		}
		fmt.Fprintf(&sb, "\n")
	}

	return sb.String()
}

func (in *awsConfigManager) serializeSharedCredentialsFile() string {
	var sb strings.Builder

	sortedKeys := lo.Keys(in.profiles)
	sort.Strings(sortedKeys)

	for _, name := range sortedKeys {
		p := in.profiles[name]
		fmt.Fprintf(&sb, "[%s]\n", name)
		fmt.Fprintf(&sb, "aws_access_key_id = %s\n", p.AccessKeyId)
		fmt.Fprintf(&sb, "aws_secret_access_key = %s\n", p.SecretAccessKey)
		fmt.Fprintf(&sb, "\n")
	}

	return sb.String()
}

// parseProfiles parses AWS INI config file content into a profiles map.
func (in *awsConfigManager) parseProfiles(content string) map[string]AWSProfile {
	profiles := make(map[string]AWSProfile)
	var currentName string
	var current AWSProfile

	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)

		if strings.HasPrefix(line, "[profile ") && strings.HasSuffix(line, "]") {
			if currentName != "" {
				profiles[currentName] = current
			}
			currentName = line[len("[profile ") : len(line)-1]
			current = AWSProfile{}
			continue
		}

		if currentName == "" {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}

		switch strings.TrimSpace(key) {
		case "aws_access_key_id":
			current.AccessKeyId = strings.TrimSpace(value)
		case "aws_secret_access_key":
			current.SecretAccessKey = strings.TrimSpace(value)
		case "role_arn":
			current.RoleArn = strings.TrimSpace(value)
		}
	}

	if currentName != "" {
		profiles[currentName] = current
	}

	return profiles
}
