package config

import (
	"strings"
	"testing"
)

func TestSerializeConfigFileUsesStaticCredentialsAsRoleSource(t *testing.T) {
	manager := &awsConfigManager{
		profiles: map[string]AWSProfile{
			"connection": {
				AccessKeyId:     "access-key",
				SecretAccessKey: "secret-key",
				RoleArn:         "arn:aws:iam::123456789012:role/target",
			},
		},
		webIdentityProfile: &AWSWebIdentityProfile{
			RoleArn:              "arn:aws:iam::123456789012:role/irsa",
			WebIdentityTokenFile: "/var/run/secrets/eks.amazonaws.com/serviceaccount/token",
		},
	}

	configFile := manager.serializeConfigFile()

	if strings.Contains(configFile, awsWebIdentitySourceProfileName) {
		t.Fatalf("expected static credentials to override IRSA profile, got:\n%s", configFile)
	}
	assertContains(t, configFile, "source_profile = connection")
	assertContains(t, configFile, "role_arn = arn:aws:iam::123456789012:role/target")
}

func TestSerializeConfigFileUsesWebIdentityProfileAsRoleSource(t *testing.T) {
	manager := &awsConfigManager{
		profiles: map[string]AWSProfile{
			"connection": {
				RoleArn: "arn:aws:iam::123456789012:role/target",
			},
		},
		webIdentityProfile: &AWSWebIdentityProfile{
			RoleArn:              "arn:aws:iam::123456789012:role/irsa",
			RoleSessionName:      "cloud-query",
			WebIdentityTokenFile: "/var/run/secrets/eks.amazonaws.com/serviceaccount/token",
		},
	}

	configFile := manager.serializeConfigFile()

	assertContains(t, configFile, "[profile "+awsWebIdentitySourceProfileName+"]")
	assertContains(t, configFile, "role_arn = arn:aws:iam::123456789012:role/irsa")
	assertContains(t, configFile, "web_identity_token_file = /var/run/secrets/eks.amazonaws.com/serviceaccount/token")
	assertContains(t, configFile, "role_session_name = cloud-query")
	assertContains(t, configFile, "[profile connection]")
	assertContains(t, configFile, "source_profile = "+awsWebIdentitySourceProfileName)
	assertContains(t, configFile, "role_arn = arn:aws:iam::123456789012:role/target")
}

func TestSerializeConfigFileLeavesRoleProfileWithoutSourceWhenWebIdentityEnvMissing(t *testing.T) {
	manager := &awsConfigManager{
		profiles: map[string]AWSProfile{
			"connection": {
				RoleArn: "arn:aws:iam::123456789012:role/target",
			},
		},
	}

	configFile := manager.serializeConfigFile()

	assertContains(t, configFile, "[profile connection]")
	assertContains(t, configFile, "role_arn = arn:aws:iam::123456789012:role/target")
	if strings.Contains(configFile, "source_profile") {
		t.Fatalf("expected no source profile without static credentials or IRSA env, got:\n%s", configFile)
	}
}

func TestNewAWSWebIdentityProfileFromEnv(t *testing.T) {
	t.Setenv(envAWSRoleArn, " arn:aws:iam::123456789012:role/irsa ")
	t.Setenv(envAWSWebIdentityTokenFile, " /var/run/secrets/eks.amazonaws.com/serviceaccount/token ")
	t.Setenv(envAWSRoleSessionName, " cloud-query ")

	profile := newAWSWebIdentityProfileFromEnv()
	if profile == nil {
		t.Fatal("expected web identity profile")
	}

	if profile.RoleArn != "arn:aws:iam::123456789012:role/irsa" {
		t.Fatalf("unexpected role arn: %q", profile.RoleArn)
	}
	if profile.WebIdentityTokenFile != "/var/run/secrets/eks.amazonaws.com/serviceaccount/token" {
		t.Fatalf("unexpected token file: %q", profile.WebIdentityTokenFile)
	}
	if profile.RoleSessionName != "cloud-query" {
		t.Fatalf("unexpected session name: %q", profile.RoleSessionName)
	}
}

func TestNewAWSWebIdentityProfileFromEnvRequiresRoleAndToken(t *testing.T) {
	t.Setenv(envAWSRoleArn, "arn:aws:iam::123456789012:role/irsa")

	if profile := newAWSWebIdentityProfileFromEnv(); profile != nil {
		t.Fatalf("expected nil profile without token file, got: %#v", profile)
	}
}

func assertContains(t *testing.T, value, substring string) {
	t.Helper()
	if !strings.Contains(value, substring) {
		t.Fatalf("expected %q to contain %q", value, substring)
	}
}
