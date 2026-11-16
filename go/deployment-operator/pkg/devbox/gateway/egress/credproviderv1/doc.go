// Package credproviderv1 holds Go bindings for Agent Substrate's substrate.credprovider.v1 plugin API, generated
// from a verbatim copy of substrate's api/credprovider/v1/credprovider.proto. The wire names match Substrate's, so
// atenet-egress can call the Plural credential provider without this module depending on Substrate.
//
// Regenerate after updating substrate_credprovider.proto from Substrate:
//
//go:generate protoc --proto_path=. --go_out=. --go_opt=paths=source_relative --go_opt=Msubstrate_credprovider.proto=github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/credproviderv1;credproviderv1 --go-grpc_out=. --go-grpc_opt=paths=source_relative --go-grpc_opt=Msubstrate_credprovider.proto=github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/credproviderv1;credproviderv1 substrate_credprovider.proto
package credproviderv1
