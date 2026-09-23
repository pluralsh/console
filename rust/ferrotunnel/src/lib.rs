//! `TunnelClient` is one local endpoint that should be reachable through FerroTunnel.
//!
//! Kubernetes does not know this type until a CustomResourceDefinition is installed.
//! The definition below is that type, written in Rust. `crdgen` prints the YAML
//! the API server accepts.

pub mod controller;

use k8s_openapi::apimachinery::pkg::apis::meta::v1::Condition;
use kube::CustomResource;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// Desired endpoint for this tunnel.
#[derive(CustomResource, Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[kube(
    group = "deployments.plural.sh",
    version = "v1alpha1",
    kind = "TunnelClient",
    namespaced,
    status = "TunnelClientStatus",
    doc = "One local endpoint registered on the FerroTunnel server.",
    printcolumn(
        name = "Tunnel ID",
        type_ = "string",
        json_path = ".spec.tunnelId",
        description = "Id registered with the tunnel server"
    ),
    printcolumn(
        name = "Ready",
        type_ = "string",
        json_path = ".status.conditions[?(@.type==\"Ready\")].status"
    )
)]
#[serde(rename_all = "camelCase")]
pub struct TunnelClientSpec {
    /// DNS label sent to the tunnel server and later used as the HTTP Host.
    #[schemars(length(min = 1, max = 63), regex(pattern = "^[a-z0-9]([-a-z0-9]*[a-z0-9])?$"))]
    pub tunnel_id: String,

    /// Address the controller can reach from this cluster.
    pub upstream: Upstream,
}

/// TCP address of the local service. The tunnel server never sees this.
#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
pub struct Upstream {
    /// Host or IP of the local service.
    #[schemars(length(min = 1))]
    pub host: String,

    /// TCP port of the local service.
    #[schemars(range(min = 1, max = 65535))]
    pub port: u16,
}

/// Status of a TunnelClient. `Ready` is True once the tunnel id is registered.
#[derive(Clone, Debug, Default, Deserialize, Serialize, JsonSchema)]
pub struct TunnelClientStatus {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub conditions: Vec<Condition>,
}

#[cfg(test)]
mod tests {
    use super::{TunnelClientSpec, Upstream};
    use kube::CustomResourceExt;

    #[test]
    fn crd_is_a_namespaced_tunnel_client() {
        let crd = super::TunnelClient::crd();

        assert_eq!(
            crd.metadata.name.as_deref(),
            Some("tunnelclients.deployments.plural.sh")
        );
        assert_eq!(crd.spec.group, "deployments.plural.sh");
        assert_eq!(crd.spec.scope, "Namespaced");
    }

    #[test]
    fn spec_serializes_with_kubernetes_field_names() {
        let spec = TunnelClientSpec {
            tunnel_id: "prometheus".into(),
            upstream: Upstream {
                host: "prometheus.monitoring.svc".into(),
                port: 9090,
            },
        };

        let json = serde_json::to_value(spec).unwrap();
        assert_eq!(json["tunnelId"], "prometheus");
        assert_eq!(json["upstream"]["host"], "prometheus.monitoring.svc");
        assert_eq!(json["upstream"]["port"], 9090);
    }
}
