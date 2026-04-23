module github.com/pluralsh/console/go/ai-proxy

go 1.26.2

replace github.com/pluralsh/console/go/polly => ../polly

require (
	github.com/andybalholm/brotli v1.2.0
	github.com/aws/aws-sdk-go-v2 v1.41.0
	github.com/aws/aws-sdk-go-v2/config v1.32.6
	github.com/aws/aws-sdk-go-v2/service/bedrockruntime v1.24.3
	github.com/google/uuid v1.6.0
	github.com/gorilla/mux v1.8.1
	github.com/ollama/ollama v0.21.1
	github.com/pluralsh/console/go/polly v0.0.0-00010101000000-000000000000
	github.com/samber/lo v1.52.0
	github.com/spf13/pflag v1.0.10
	golang.org/x/oauth2 v0.35.0
	k8s.io/klog/v2 v2.140.0
)

require (
	cloud.google.com/go/compute/metadata v0.9.0 // indirect
	github.com/aws/aws-sdk-go-v2/aws/protocol/eventstream v1.7.4 // indirect
	github.com/aws/aws-sdk-go-v2/credentials v1.19.6 // indirect
	github.com/aws/aws-sdk-go-v2/feature/ec2/imds v1.18.16 // indirect
	github.com/aws/aws-sdk-go-v2/internal/configsources v1.4.16 // indirect
	github.com/aws/aws-sdk-go-v2/internal/endpoints/v2 v2.7.16 // indirect
	github.com/aws/aws-sdk-go-v2/internal/ini v1.8.4 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/accept-encoding v1.13.4 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/presigned-url v1.13.16 // indirect
	github.com/aws/aws-sdk-go-v2/service/signin v1.0.4 // indirect
	github.com/aws/aws-sdk-go-v2/service/sso v1.30.8 // indirect
	github.com/aws/aws-sdk-go-v2/service/ssooidc v1.35.12 // indirect
	github.com/aws/aws-sdk-go-v2/service/sts v1.41.5 // indirect
	github.com/aws/smithy-go v1.24.0 // indirect
	github.com/bahlo/generic-list-go v0.2.0 // indirect
	github.com/buger/jsonparser v1.1.1 // indirect
	github.com/cenkalti/backoff v2.2.1+incompatible // indirect
	github.com/go-logr/logr v1.4.3 // indirect
	github.com/kr/pretty v0.3.0 // indirect
	github.com/mailru/easyjson v0.7.7 // indirect
	github.com/rogpeppe/go-internal v1.8.0 // indirect
	github.com/wk8/go-ordered-map/v2 v2.1.8 // indirect
	golang.org/x/crypto v0.48.0 // indirect
	golang.org/x/sys v0.41.0 // indirect
	golang.org/x/text v0.34.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)
