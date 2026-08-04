package common

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/samber/lo"
)

const (
	maxSentinelRunJobsDefaultValue = 5
	maxStackRunJobsDefaultValue    = 20
	maxAgentRunPodsDefaultValue    = 10
)

func init() {
	configurationManager = &ConfigurationManager{}
}

var configurationManager *ConfigurationManager

// Configuration is a thread-safe structure for agent configuration
type ConfigurationManager struct {
	mu                           sync.RWMutex
	defaults                     v1alpha1.AgentConfigurationSpec
	servicePollInterval          *time.Duration
	managedNamespacePollInterval *time.Duration
	clusterPingInterval          *time.Duration
	runtimeServicesPingInterval  *time.Duration
	stackPollInterval            *time.Duration
	sentinelPollInterval         *time.Duration
	compatibilityUploadInterval  *time.Duration
	pipelineGateInterval         *time.Duration
	maxConcurrentReconciles      *int
	maxSentinelRunJobs           *int
	maxStackRunJobs              *int
	maxAgentRunPods              *int
	baseRegistryURL              *string
	disableWebsocket             *bool
	pollImmediately              *bool
}

func GetConfigurationManager() *ConfigurationManager {
	return configurationManager
}

// SetValue sets the value of the string in a thread-safe manner
func (s *ConfigurationManager) SetValue(config v1alpha1.AgentConfigurationSpec) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.setValueLocked(mergeAgentConfigurationSpec(s.defaults, config))
}

// SetDefaults configures the fallback values used when AgentConfiguration omits fields.
func (s *ConfigurationManager) SetDefaults(config v1alpha1.AgentConfigurationSpec) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.defaults = copyAgentConfigurationSpec(config)
	return s.setValueLocked(s.defaults)
}

func (s *ConfigurationManager) setValueLocked(config v1alpha1.AgentConfigurationSpec) error {
	interval, err := setDuration(config.ClusterPingInterval)
	if err != nil {
		return err
	}
	s.clusterPingInterval = interval

	interval, err = setDuration(config.CompatibilityUploadInterval)
	if err != nil {
		return err
	}
	s.runtimeServicesPingInterval = interval

	interval, err = setDuration(config.PipelineGateInterval)
	if err != nil {
		return err
	}
	s.pipelineGateInterval = interval

	interval, err = setDuration(config.StackPollInterval)
	if err != nil {
		return err
	}
	s.stackPollInterval = interval

	interval, err = setDuration(config.SentinelPollInterval)
	if err != nil {
		return err
	}
	s.sentinelPollInterval = interval

	interval, err = setDuration(config.VulnerabilityReportUploadInterval)
	if err != nil {
		return err
	}
	s.compatibilityUploadInterval = interval

	interval, err = setDuration(config.ServicePollInterval)
	if err != nil {
		return err
	}
	s.servicePollInterval = interval

	interval, err = setDuration(config.ManagedNamespacePollInterval)
	if err != nil {
		return err
	}
	s.managedNamespacePollInterval = interval

	s.maxConcurrentReconciles = config.MaxConcurrentReconciles
	s.baseRegistryURL = config.BaseRegistryURL
	s.maxSentinelRunJobs = config.MaxSentinelRunJobs
	s.maxStackRunJobs = config.MaxStackRunJobs
	s.maxAgentRunPods = config.MaxAgentRunPods
	s.disableWebsocket = config.DisableWebsocket
	if config.PollImmediately == nil {
		config.PollImmediately = lo.ToPtr(true)
	}
	s.pollImmediately = config.PollImmediately

	return nil
}

func mergeAgentConfigurationSpec(defaults, overrides v1alpha1.AgentConfigurationSpec) v1alpha1.AgentConfigurationSpec {
	merged := copyAgentConfigurationSpec(defaults)

	if overrides.ServicePollInterval != nil {
		merged.ServicePollInterval = overrides.ServicePollInterval
	}
	if overrides.ManagedNamespacePollInterval != nil {
		merged.ManagedNamespacePollInterval = overrides.ManagedNamespacePollInterval
	}
	if overrides.ClusterPingInterval != nil {
		merged.ClusterPingInterval = overrides.ClusterPingInterval
	}
	if overrides.CompatibilityUploadInterval != nil {
		merged.CompatibilityUploadInterval = overrides.CompatibilityUploadInterval
	}
	if overrides.StackPollInterval != nil {
		merged.StackPollInterval = overrides.StackPollInterval
	}
	if overrides.SentinelPollInterval != nil {
		merged.SentinelPollInterval = overrides.SentinelPollInterval
	}
	if overrides.PipelineGateInterval != nil {
		merged.PipelineGateInterval = overrides.PipelineGateInterval
	}
	if overrides.MaxConcurrentReconciles != nil {
		merged.MaxConcurrentReconciles = overrides.MaxConcurrentReconciles
	}
	if overrides.VulnerabilityReportUploadInterval != nil {
		merged.VulnerabilityReportUploadInterval = overrides.VulnerabilityReportUploadInterval
	}
	if overrides.BaseRegistryURL != nil {
		merged.BaseRegistryURL = overrides.BaseRegistryURL
	}
	if overrides.MaxSentinelRunJobs != nil {
		merged.MaxSentinelRunJobs = overrides.MaxSentinelRunJobs
	}
	if overrides.MaxStackRunJobs != nil {
		merged.MaxStackRunJobs = overrides.MaxStackRunJobs
	}
	if overrides.MaxAgentRunPods != nil {
		merged.MaxAgentRunPods = overrides.MaxAgentRunPods
	}
	if overrides.DisableWebsocket != nil {
		merged.DisableWebsocket = overrides.DisableWebsocket
	}
	if overrides.PollImmediately != nil {
		merged.PollImmediately = overrides.PollImmediately
	}

	return merged
}

func copyAgentConfigurationSpec(config v1alpha1.AgentConfigurationSpec) v1alpha1.AgentConfigurationSpec {
	return *config.DeepCopy()
}

func setDuration(interval *string) (*time.Duration, error) {
	if interval == nil {
		return nil, nil
	}
	duration, err := time.ParseDuration(*interval)
	if err != nil {
		return nil, err
	}
	return &duration, nil
}

func (s *ConfigurationManager) GetClusterPingInterval() *time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.clusterPingInterval
}

func (s *ConfigurationManager) GetRuntimeServicesPingInterval() *time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.runtimeServicesPingInterval
}

func (s *ConfigurationManager) GetCompatibilityUploadInterval() *time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.compatibilityUploadInterval
}

func (s *ConfigurationManager) GetPipelineGateInterval() *time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.pipelineGateInterval
}

func (s *ConfigurationManager) GetStackPollInterval() *time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.stackPollInterval
}

func (s *ConfigurationManager) GetSentinelPollInterval() *time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.sentinelPollInterval
}

func (s *ConfigurationManager) GetMaxConcurrentReconciles() *int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.maxConcurrentReconciles
}

func (s *ConfigurationManager) GetMaxSentinelRunJobs() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.maxSentinelRunJobs == nil {
		return maxSentinelRunJobsDefaultValue
	}
	return lo.FromPtr(s.maxSentinelRunJobs)
}

func (s *ConfigurationManager) GetMaxStackRunJobs() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.maxStackRunJobs == nil {
		return maxStackRunJobsDefaultValue
	}
	return lo.FromPtr(s.maxStackRunJobs)
}

func (s *ConfigurationManager) GetMaxAgentRunPods() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.maxAgentRunPods == nil {
		return maxAgentRunPodsDefaultValue
	}
	return lo.FromPtr(s.maxAgentRunPods)
}

func (s *ConfigurationManager) GetServicePollInterval() *time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.servicePollInterval
}

func (s *ConfigurationManager) GetManagedNamespacePollInterval() *time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.managedNamespacePollInterval
}

func (s *ConfigurationManager) GetBaseRegistryURL() *string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.baseRegistryURL
}

func (s *ConfigurationManager) IsWebsocketDisabled() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.disableWebsocket != nil && *s.disableWebsocket
}

func (s *ConfigurationManager) IsPollImmediately() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.pollImmediately == nil {
		return true
	}
	return *s.pollImmediately
}

func (s *ConfigurationManager) SwapBaseRegistry(image string) string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.baseRegistryURL == nil {
		return image
	}
	if image == "" {
		return image
	}

	parts := strings.SplitN(image, "/", 2)

	// image has a registry (like "registry.plural.sh/nginx:latest")
	if len(parts) == 2 && (strings.Contains(parts[0], ".") || strings.Contains(parts[0], ":")) {
		return fmt.Sprintf("%s/%s", *s.baseRegistryURL, parts[1])
	}

	// image has no registry (like "nginx:latest")
	return fmt.Sprintf("%s/%s", *s.baseRegistryURL, image)
}
