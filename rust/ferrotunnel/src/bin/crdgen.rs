//! Print the TunnelClient CustomResourceDefinition as YAML.
//!
//! `make crds` in this directory writes the YAML to
//! `go/deployment-operator/config/crd/bases`.

use ferrotunnel_client::TunnelClient;
use kube::CustomResourceExt;

fn main() {
    let yaml = serde_yaml_ng::to_string(&TunnelClient::crd()).expect("render TunnelClient CRD");
    print!("{yaml}");
}
