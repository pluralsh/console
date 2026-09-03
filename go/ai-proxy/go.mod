module github.com/pluralsh/console/go/ai-proxy

go 1.26.5

replace github.com/pluralsh/console/go/polly => ../polly

require (
	github.com/andybalholm/brotli v1.2.0
	github.com/aws/aws-sdk-go-v2 v1.42.0
	github.com/aws/aws-sdk-go-v2/config v1.32.19
	github.com/aws/aws-sdk-go-v2/service/bedrockruntime v1.50.4
	github.com/google/uuid v1.6.0
	github.com/gorilla/mux v1.8.1
	github.com/ollama/ollama v0.21.1
	github.com/pluralsh/console/go/polly v0.0.0-00010101000000-000000000000
	github.com/prometheus/sigv4 v0.4.1
	github.com/samber/lo v1.53.0
	github.com/spf13/pflag v1.0.10
	golang.org/x/oauth2 v0.36.0
	k8s.io/klog/v2 v2.140.0
)

require (
	cloud.google.com/go/compute/metadata v0.9.0 // indirect
	github.com/aws/aws-sdk-go-v2/aws/protocol/eventstream v1.7.10 // indirect
	github.com/aws/aws-sdk-go-v2/credentials v1.19.18 // indirect
	github.com/aws/aws-sdk-go-v2/feature/ec2/imds v1.18.24 // indirect
	github.com/aws/aws-sdk-go-v2/internal/configsources v1.4.29 // indirect
	github.com/aws/aws-sdk-go-v2/internal/endpoints/v2 v2.7.29 // indirect
	github.com/aws/aws-sdk-go-v2/internal/v4a v1.4.25 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/accept-encoding v1.13.9 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/presigned-url v1.13.24 // indirect
	github.com/aws/aws-sdk-go-v2/service/signin v1.1.0 // indirect
	github.com/aws/aws-sdk-go-v2/service/sso v1.30.18 // indirect
	github.com/aws/aws-sdk-go-v2/service/ssooidc v1.36.1 // indirect
	github.com/aws/aws-sdk-go-v2/service/sts v1.42.2 // indirect
	github.com/aws/smithy-go v1.27.1 // indirect
	github.com/bahlo/generic-list-go v0.2.0 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/buger/jsonparser v1.1.2 // indirect
	github.com/cenkalti/backoff v2.2.1+incompatible // indirect
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/go-logr/logr v1.4.3 // indirect
	github.com/golang-jwt/jwt/v5 v5.3.0 // indirect
	github.com/jpillora/backoff v1.0.0 // indirect
	github.com/mailru/easyjson v0.9.1 // indirect
	github.com/munnerz/goautoneg v0.0.0-20191010083416-a7dc8b61c822 // indirect
	github.com/mwitkow/go-conntrack v0.0.0-20190716064945-2f068394615f // indirect
	github.com/prometheus/client_golang v1.20.4 // indirect
	github.com/prometheus/client_model v0.6.2 // indirect
	github.com/prometheus/common v0.67.5 // indirect
	github.com/prometheus/procfs v0.15.1 // indirect
	github.com/wk8/go-ordered-map/v2 v2.1.8 // indirect
	go.yaml.in/yaml/v2 v2.4.3 // indirect
	golang.org/x/crypto v0.55.0 // indirect
	golang.org/x/net v0.57.0 // indirect
	golang.org/x/sys v0.47.0 // indirect
	golang.org/x/text v0.41.0 // indirect
	google.golang.org/protobuf v1.36.11 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)
