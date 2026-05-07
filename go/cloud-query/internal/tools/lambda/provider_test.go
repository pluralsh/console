package lambda

import (
	"errors"
	"testing"

	"github.com/pluralsh/console/go/cloud-query/internal/tools"
)

func TestParseAzureFunctionIdentifier(t *testing.T) {
	t.Parallel()
	provider := &AzureProvider{}

	t.Run("canonical id", func(t *testing.T) {
		t.Parallel()
		ref, err := provider.parseFunctionIdentifier("/subscriptions/sub-1/resourceGroups/rg/providers/Microsoft.Web/sites/site/functions/f")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if ref.subscriptionID != "sub-1" || ref.resourceGroup != "rg" || ref.siteName != "site" || ref.functionName != "f" {
			t.Fatalf("unexpected parse result: %+v", ref)
		}
	})

	t.Run("invalid id", func(t *testing.T) {
		t.Parallel()
		if _, err := provider.parseFunctionIdentifier("/subscriptions/sub-1/resourceGroups/rg/providers/Microsoft.Web/sites/site"); err == nil {
			t.Fatal("expected error for invalid identifier")
		}
	})
}

func TestWithFunctionCode(t *testing.T) {
	t.Parallel()
	provider := &AzureProvider{}

	t.Run("injects code for template token", func(t *testing.T) {
		t.Parallel()
		got := provider.withFunctionCode("https://example.azurewebsites.net/api/handler{?code}", "abc123")
		want := "https://example.azurewebsites.net/api/handler?code=abc123"
		if got != want {
			t.Fatalf("unexpected url: got=%q want=%q", got, want)
		}
	})

	t.Run("removes template token when code missing", func(t *testing.T) {
		t.Parallel()
		got := provider.withFunctionCode("https://example.azurewebsites.net/api/handler{?code}", "")
		want := "https://example.azurewebsites.net/api/handler"
		if got != want {
			t.Fatalf("unexpected url: got=%q want=%q", got, want)
		}
	})

	t.Run("adds code query when missing", func(t *testing.T) {
		t.Parallel()
		got := provider.withFunctionCode("https://example.azurewebsites.net/api/handler", "abc123")
		want := "https://example.azurewebsites.net/api/handler?code=abc123"
		if got != want {
			t.Fatalf("unexpected url: got=%q want=%q", got, want)
		}
	})

	t.Run("drops empty code query", func(t *testing.T) {
		t.Parallel()
		got := provider.withFunctionCode("https://example.azurewebsites.net/api/handler?code=", "")
		want := "https://example.azurewebsites.net/api/handler"
		if got != want {
			t.Fatalf("unexpected url: got=%q want=%q", got, want)
		}
	})
}

func TestSelectHostKey(t *testing.T) {
	t.Parallel()
	provider := &AzureProvider{}

	t.Run("returns default key when present", func(t *testing.T) {
		t.Parallel()
		other := "other-key"
		def := "default-key"
		got := provider.selectHostKey(map[string]*string{
			"abc":     &other,
			"default": &def,
		}, nil, nil)
		if got != "default-key" {
			t.Fatalf("unexpected key: %q", got)
		}
	})

	t.Run("returns first non-empty when default missing", func(t *testing.T) {
		t.Parallel()
		empty := ""
		val := "abc"
		got := provider.selectHostKey(map[string]*string{
			"k1": &empty,
			"k2": &val,
		}, nil, nil)
		if got != "abc" {
			t.Fatalf("unexpected key: %q", got)
		}
	})

	t.Run("falls back to master key", func(t *testing.T) {
		t.Parallel()
		master := "master"
		got := provider.selectHostKey(nil, &master, nil)
		if got != "master" {
			t.Fatalf("unexpected key: %q", got)
		}
	})

	t.Run("returns empty when no keys", func(t *testing.T) {
		t.Parallel()
		got := provider.selectHostKey(nil, nil, nil)
		if got != "" {
			t.Fatalf("unexpected key: %q", got)
		}
	})
}

func TestValidateAzureInvokeURL(t *testing.T) {
	t.Parallel()
	provider := &AzureProvider{}

	t.Run("valid azure invoke url", func(t *testing.T) {
		t.Parallel()
		err := provider.validateInvokeURL("https://my-func-app.azurewebsites.net/api/handler?code=abc")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("allows dynamic azure subdomain", func(t *testing.T) {
		t.Parallel()
		err := provider.validateInvokeURL("https://my-func-app-westus2-01.azurewebsites.net/api/handler")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("requires https", func(t *testing.T) {
		t.Parallel()
		err := provider.validateInvokeURL("http://my-func-app.azurewebsites.net/api/handler")
		if err == nil {
			t.Fatal("expected validation error")
		}
	})

	t.Run("rejects host mismatch", func(t *testing.T) {
		t.Parallel()
		err := provider.validateInvokeURL("https://example.com/api/handler")
		if err == nil {
			t.Fatal("expected validation error")
		}
	})

	t.Run("rejects custom ports", func(t *testing.T) {
		t.Parallel()
		err := provider.validateInvokeURL("https://my-func-app.azurewebsites.net:8443/api/handler")
		if err == nil {
			t.Fatal("expected validation error")
		}
	})
}

func TestToServiceName(t *testing.T) {
	t.Parallel()
	provider := &GCPProvider{}

	t.Run("canonical id", func(t *testing.T) {
		t.Parallel()
		got, err := provider.toServiceName("projects/p1/locations/us-central1/services/svc")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != "projects/p1/locations/us-central1/services/svc" {
			t.Fatalf("unexpected service name: %q", got)
		}
	})

	t.Run("invalid id", func(t *testing.T) {
		t.Parallel()
		if _, err := provider.toServiceName("projects/p1/services/svc"); err == nil {
			t.Fatal("expected error for invalid identifier")
		} else if !errors.Is(err, tools.ErrInvalidArgument) {
			t.Fatalf("expected invalid argument error, got: %v", err)
		}
	})
}

func TestValidateCloudRunURL(t *testing.T) {
	t.Parallel()
	provider := &GCPProvider{}

	t.Run("valid cloud run url", func(t *testing.T) {
		t.Parallel()
		if err := provider.validateCloudRunURL("https://my-svc-abcde-uc.a.run.app"); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("requires https", func(t *testing.T) {
		t.Parallel()
		err := provider.validateCloudRunURL("http://my-svc-abcde-uc.a.run.app")
		if err == nil {
			t.Fatal("expected validation error")
		}
		if !errors.Is(err, tools.ErrInvalidArgument) {
			t.Fatalf("expected invalid argument error, got: %v", err)
		}
	})

	t.Run("requires run app host", func(t *testing.T) {
		t.Parallel()
		err := provider.validateCloudRunURL("https://example.com")
		if err == nil {
			t.Fatal("expected validation error")
		}
		if !errors.Is(err, tools.ErrInvalidArgument) {
			t.Fatalf("expected invalid argument error, got: %v", err)
		}
	})

	t.Run("rejects custom ports", func(t *testing.T) {
		t.Parallel()
		err := provider.validateCloudRunURL("https://my-svc-abcde-uc.a.run.app:8443")
		if err == nil {
			t.Fatal("expected validation error")
		}
		if !errors.Is(err, tools.ErrInvalidArgument) {
			t.Fatalf("expected invalid argument error, got: %v", err)
		}
	})
}

func TestTokenAudienceFromURI(t *testing.T) {
	t.Parallel()
	provider := &GCPProvider{}

	t.Run("uses scheme and host only", func(t *testing.T) {
		t.Parallel()
		aud, err := provider.tokenAudienceFromURI("https://my-svc-abcde-uc.a.run.app/path?q=v")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if aud != "https://my-svc-abcde-uc.a.run.app" {
			t.Fatalf("unexpected audience: %q", aud)
		}
	})

	t.Run("returns invalid argument for malformed uri", func(t *testing.T) {
		t.Parallel()
		_, err := provider.tokenAudienceFromURI("not a uri")
		if err == nil {
			t.Fatal("expected validation error")
		}
		if !errors.Is(err, tools.ErrInvalidArgument) {
			t.Fatalf("expected invalid argument error, got: %v", err)
		}
	})
}
