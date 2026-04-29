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
)

var (
	manager             *awsConfigManager
	configFilePath      string
	credentialsFilePath string
)

func init() {
	var exists bool
	configFilePath, exists = os.LookupEnv(envAWSConfigFile)
	if !exists {
		klog.V(log.LogLevelInfo).InfoS("AWS config file not set, disabling AWS config manager")
		return
	}

	klog.V(log.LogLevelDebug).InfoS(
		"AWS config file path",
		"path", configFilePath,
	)

	credentialsFilePath, exists = os.LookupEnv(envAWSSharedCredentialsFile)
	if !exists {
		klog.V(log.LogLevelInfo).InfoS("AWS shared credentials file not set, disabling AWS config manager")
		return
	}

	klog.V(log.LogLevelDebug).InfoS(
		"AWS credentials file path",
		"path", credentialsFilePath,
	)

	// Ensure the directories exist
	if err := os.MkdirAll(filepath.Dir(configFilePath), 0755); err != nil {
		klog.Fatalf("failed to create config directory: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(credentialsFilePath), 0755); err != nil {
		klog.Fatalf("failed to create shared credentials directory: %v", err)
	}

	manager = &awsConfigManager{
		profiles: make(map[string]AWSProfile),
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
	mu       sync.RWMutex
	profiles map[string]AWSProfile
}

func GetAWSConfigManager() AWSConfigManager {
	return manager
}

func (in *awsConfigManager) Add(name string, p AWSProfile) error {
	if in == nil {
		return nil
	}

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
	if in == nil {
		return nil
	}

	in.mu.Lock()
	defer in.mu.Unlock()

	if _, ok := in.profiles[name]; !ok {
		return nil
	}

	delete(in.profiles, name)
	return in.flush()
}

// flush serializes all in-memory profiles to disk atomically via a temp file rename.
// Must be called with m.mu held.
func (in *awsConfigManager) flush() error {
	tmpConfigFilePath := configFilePath + ".tmp"
	tmpSharedCredentialsFilePath := credentialsFilePath + ".tmp"

	// Write the config file atomically
	// 0644 is intentional: this file is shared via a volume between containers
	// running as different users, so world-readable is required.
	if err := os.WriteFile(tmpConfigFilePath, []byte(in.serializeConfigFile()), 0644); err != nil {
		return fmt.Errorf("failed to write AWS config: %w", err)
	}
	if err := os.Rename(tmpConfigFilePath, configFilePath); err != nil {
		return fmt.Errorf("failed to rename config temp file: %w", err)
	}

	// Write the shared credentials file atomically
	// 0644 is intentional: this file is shared via a volume between containers
	// running as different users, so world-readable is required.
	if err := os.WriteFile(tmpSharedCredentialsFilePath, []byte(in.serializeSharedCredentialsFile()), 0644); err != nil {
		return fmt.Errorf("failed to write AWS shared credentials: %w", err)
	}
	if err := os.Rename(tmpSharedCredentialsFilePath, credentialsFilePath); err != nil {
		return fmt.Errorf("failed to rename shared credentials temp file: %w", err)
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
		if len(p.SecretAccessKey) > 0 && len(p.AccessKeyId) > 0 {
			fmt.Fprintf(&sb, "source_profile = %s\n", name)
		}

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

		// Skip empty profiles
		if len(p.AccessKeyId) == 0 || len(p.SecretAccessKey) == 0 {
			continue
		}

		fmt.Fprintf(&sb, "[%s]\n", name)
		fmt.Fprintf(&sb, "aws_access_key_id = %s\n", p.AccessKeyId)
		fmt.Fprintf(&sb, "aws_secret_access_key = %s\n", p.SecretAccessKey)
		fmt.Fprintf(&sb, "\n")
	}

	return sb.String()
}
