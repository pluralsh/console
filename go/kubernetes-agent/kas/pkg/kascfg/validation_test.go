package kascfg

import (
	"testing"

	"google.golang.org/protobuf/types/known/durationpb"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

func TestValidation_Valid(t *testing.T) {
	tests := []testhelpers.ValidTestcase{
		{
			Name: "minimal",
			Valid: &ConfigurationFile{
				Redis: &RedisCF{
					RedisConfig: &RedisCF_Sentinel{
						Sentinel: &RedisSentinelCF{
							MasterName: "redis",
							Addresses:  []string{"redis:6379"},
						},
					},
				},
				Api: &ApiCF{
					Listen: &ListenApiCF{
						AuthenticationSecretFile: "/some/file",
					},
				},
				PrivateApi: &PrivateApiCF{
					Listen: &ListenPrivateApiCF{
						AuthenticationSecretFile: "/some/file",
					},
				},
			},
		},
		{
			Name: "AgentCF",
			Valid: &AgentCF{
				InfoCacheTtl: durationpb.New(0), // zero means "disabled"
			},
		},
		{
			Name: "ObservabilityCF",
			Valid: &ObservabilityCF{
				UsageReportingPeriod: durationpb.New(0), // zero means "disabled"
			},
		},
		{
			Name: "TokenBucketRateLimitCF",
			Valid: &TokenBucketRateLimitCF{
				RefillRatePerSecond: 0, // zero means "use default value"
				BucketSize:          0, // zero means "use default value"
			},
		},
		{
			Name: "RedisCF",
			Valid: &RedisCF{
				RedisConfig: &RedisCF_Server{
					Server: &RedisServerCF{
						Address: "//path/to/socket.sock",
					},
				},
				PoolSize:  0,  // zero means "use default value"
				KeyPrefix: "", // empty means "use default value"
			},
		},
		{
			Name: "RedisCF",
			Valid: &RedisCF{
				RedisConfig: &RedisCF_Server{
					Server: &RedisServerCF{
						Address: "address:6380",
					},
				},
				PoolSize:  0,  // zero means "use default value"
				KeyPrefix: "", // empty means "use default value"
			},
		},
		{
			Name: "RedisCF",
			Valid: &RedisCF{
				RedisConfig: &RedisCF_Server{
					Server: &RedisServerCF{
						Address: "127.0.0.1:6380",
					},
				},
				PoolSize:  0,  // zero means "use default value"
				KeyPrefix: "", // empty means "use default value"
			},
		},
		{
			Name: "AgentConfigurationCF",
			Valid: &AgentConfigurationCF{
				MaxConfigurationFileSize: 0, // zero means "use default value"
			},
		},
		{
			Name: "ListenAgentCF",
			Valid: &ListenAgentCF{
				ConnectionsPerTokenPerMinute: 0, // zero means "use default value"
			},
		},
	}
	testhelpers.AssertValid(t, tests)
}

func TestValidation_Invalid(t *testing.T) {
	tests := []testhelpers.InvalidTestcase{
		{
			ErrString: "invalid AgentCF.InfoCacheTtl: value must be greater than or equal to 0s",
			Invalid: &AgentCF{
				InfoCacheTtl: durationpb.New(-1),
			},
		},
		{
			ErrString: "invalid AgentCF.InfoCacheErrorTtl: value must be greater than 0s",
			Invalid: &AgentCF{
				InfoCacheErrorTtl: durationpb.New(0),
			},
		},
		{
			ErrString: "invalid AgentCF.InfoCacheErrorTtl: value must be greater than 0s",
			Invalid: &AgentCF{
				InfoCacheErrorTtl: durationpb.New(-1),
			},
		},
		{
			ErrString: "invalid AgentConfigurationCF.PollPeriod: value must be greater than 0s",
			Invalid: &AgentConfigurationCF{
				PollPeriod: durationpb.New(0),
			},
		},
		{
			ErrString: "invalid AgentConfigurationCF.PollPeriod: value must be greater than 0s",
			Invalid: &AgentConfigurationCF{
				PollPeriod: durationpb.New(-1),
			},
		},
		{
			ErrString: "invalid ObservabilityCF.UsageReportingPeriod: value must be greater than or equal to 0s",
			Invalid: &ObservabilityCF{
				UsageReportingPeriod: durationpb.New(-1),
			},
		},
		{
			ErrString: "invalid TokenBucketRateLimitCF.RefillRatePerSecond: value must be greater than or equal to 0",
			Invalid: &TokenBucketRateLimitCF{
				RefillRatePerSecond: -1,
			},
		},
		{
			ErrString: "invalid RedisCF.DialTimeout: value must be greater than 0s",
			Invalid: &RedisCF{
				RedisConfig: &RedisCF_Server{
					Server: &RedisServerCF{
						Address: "//path/to/socket.sock",
					},
				},
				DialTimeout: durationpb.New(0),
			},
		},
		{
			ErrString: "invalid RedisCF.DialTimeout: value must be greater than 0s",
			Invalid: &RedisCF{
				RedisConfig: &RedisCF_Server{
					Server: &RedisServerCF{
						Address: "//path/to/socket.sock",
					},
				},
				DialTimeout: durationpb.New(-1),
			},
		},
		{
			ErrString: "invalid RedisCF.ReadTimeout: value must be greater than 0s",
			Invalid: &RedisCF{
				RedisConfig: &RedisCF_Server{
					Server: &RedisServerCF{
						Address: "//path/to/socket.sock",
					},
				},
				ReadTimeout: durationpb.New(0),
			},
		},
		{
			ErrString: "invalid RedisCF.ReadTimeout: value must be greater than 0s",
			Invalid: &RedisCF{
				RedisConfig: &RedisCF_Server{
					Server: &RedisServerCF{
						Address: "//path/to/socket.sock",
					},
				},
				ReadTimeout: durationpb.New(-1),
			},
		},
		{
			ErrString: "invalid RedisCF.WriteTimeout: value must be greater than 0s",
			Invalid: &RedisCF{
				RedisConfig: &RedisCF_Server{
					Server: &RedisServerCF{
						Address: "//path/to/socket.sock",
					},
				},
				WriteTimeout: durationpb.New(0),
			},
		},
		{
			ErrString: "invalid RedisCF.WriteTimeout: value must be greater than 0s",
			Invalid: &RedisCF{
				RedisConfig: &RedisCF_Server{
					Server: &RedisServerCF{
						Address: "//path/to/socket.sock",
					},
				},
				WriteTimeout: durationpb.New(-1),
			},
		},
		{
			ErrString: "invalid RedisCF.IdleTimeout: value must be greater than 0s",
			Invalid: &RedisCF{
				RedisConfig: &RedisCF_Server{
					Server: &RedisServerCF{
						Address: "//path/to/socket.sock",
					},
				},
				IdleTimeout: durationpb.New(0),
			},
		},
		{
			ErrString: "invalid RedisCF.IdleTimeout: value must be greater than 0s",
			Invalid: &RedisCF{
				RedisConfig: &RedisCF_Server{
					Server: &RedisServerCF{
						Address: "//path/to/socket.sock",
					},
				},
				IdleTimeout: durationpb.New(-1),
			},
		},
		{
			ErrString: "invalid RedisCF.RedisConfig: value is required",
			Invalid:   &RedisCF{},
		},
		{
			ErrString: "invalid RedisCF.Server: value is required",
			Invalid: &RedisCF{
				RedisConfig: &RedisCF_Server{},
			},
		},
		{
			ErrString: "invalid RedisCF.Sentinel: value is required",
			Invalid: &RedisCF{
				RedisConfig: &RedisCF_Sentinel{},
			},
		},
		{
			ErrString: "invalid RedisServerCF.Address: value length must be at least 1 bytes",
			Invalid:   &RedisServerCF{},
		},
		{
			ErrString: "invalid RedisSentinelCF.MasterName: value length must be at least 1 bytes",
			Invalid: &RedisSentinelCF{
				Addresses: []string{"1:2"},
			},
		},
		{
			ErrString: "invalid RedisSentinelCF.Addresses: value must contain at least 1 item(s)",
			Invalid: &RedisSentinelCF{
				MasterName: "bla",
			},
		},
		{
			ErrString: "invalid RedisSentinelCF.Addresses[0]: value length must be at least 1 bytes",
			Invalid: &RedisSentinelCF{
				MasterName: "bla",
				Addresses:  []string{""},
			},
		},
		{
			ErrString: "invalid ListenAgentCF.MaxConnectionAge: value must be greater than 0s",
			Invalid: &ListenAgentCF{
				MaxConnectionAge: durationpb.New(0),
			},
		},
		{
			ErrString: "invalid ListenAgentCF.MaxConnectionAge: value must be greater than 0s",
			Invalid: &ListenAgentCF{
				MaxConnectionAge: durationpb.New(-1),
			},
		},
		{
			ErrString: "invalid ListenApiCF.AuthenticationSecretFile: value length must be at least 1 bytes",
			Invalid:   &ListenApiCF{},
		},
		{
			ErrString: "invalid ListenApiCF.MaxConnectionAge: value must be greater than 0s",
			Invalid: &ListenApiCF{
				AuthenticationSecretFile: "bla",
				MaxConnectionAge:         durationpb.New(0),
			},
		},
		{
			ErrString: "invalid ListenApiCF.MaxConnectionAge: value must be greater than 0s",
			Invalid: &ListenApiCF{
				AuthenticationSecretFile: "bla",
				MaxConnectionAge:         durationpb.New(-1),
			},
		},
		{
			ErrString: "invalid ApiCF.Listen: value is required",
			Invalid:   &ApiCF{},
		},
		{
			ErrString: "invalid PrivateApiCF.Listen: value is required",
			Invalid:   &PrivateApiCF{},
		},
	}
	testhelpers.AssertInvalid(t, tests)
}
