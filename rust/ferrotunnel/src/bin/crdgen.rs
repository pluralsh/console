//! Print the TunnelClient CustomResourceDefinition as YAML.
//!
//! `make codegen-rust-crds` in `go/deployment-operator` writes this to
//! `config/crd/bases`. The crate itself lives at `rust/ferrotunnel` in the
//! console repo so it is included in the main release tag.

use ferrotunnel_client::TunnelClient;
use kube::CustomResourceExt;

fn main() {
    let yaml = serde_yml::to_string(&TunnelClient::crd()).expect("render TunnelClient CRD");
    print!("{yaml}");
}
