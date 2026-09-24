//! Reconcile loop for `TunnelClient`.
//!
//! `reconcile` runs once for each object change. `error_policy` runs only when
//! `reconcile` returns an error and chooses when to try that object again.
//!
//! The running tunnels live in [`Context`]. Process memory is the source of
//! truth: after a restart that map is empty, so each object is connected again
//! even when its status still says Ready.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use ferrotunnel::common::TlsConfig;
use ferrotunnel::Client as Tunnel;
use k8s_openapi::apimachinery::pkg::apis::meta::v1::{Condition, Time};
use kube::api::{Api, Patch, PatchParams};
use kube::runtime::controller::Action;
use kube::runtime::finalizer::{finalizer, Event};
use kube::{Client, ResourceExt};
use tracing::{error, info};

use crate::{TunnelClient, TunnelClientStatus};

const READY: &str = "Ready";
const TUNNEL_NOT_STARTED: &str = "TunnelNotStarted";
const TUNNEL_ID_IN_USE: &str = "TunnelIdInUse";
const CONNECTED: &str = "Connected";
const FINALIZER: &str = "deployments.plural.sh/tunnel-client";

/// PEM files for mutual TLS. All three are present, or TLS is left off.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TlsFiles {
    pub ca: PathBuf,
    pub cert: PathBuf,
    pub key: PathBuf,
}

/// Process flags. The token file is read by the caller so tests do not touch the disk.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Flags {
    pub server: String,
    pub token_file: String,
    pub tls: Option<TlsFiles>,
}

/// Shared data for every reconcile. One controller process owns one of these.
pub struct Context {
    pub client: Client,
    pub server: String,
    pub token: String,
    tls: Option<TlsFiles>,
    tunnels: Mutex<Registry>,
}

struct Registry {
    running: HashMap<String, RunningTunnel>,
    owners: HashMap<String, String>,
}

struct RunningTunnel {
    endpoint: Endpoint,
    client: Tunnel,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct Endpoint {
    tunnel_id: String,
    host: String,
    port: u16,
}

impl Endpoint {
    fn from_object(tunnel_client: &TunnelClient) -> Self {
        Self {
            tunnel_id: tunnel_client.spec.tunnel_id.clone(),
            host: tunnel_client.spec.upstream.host.clone(),
            port: tunnel_client.spec.upstream.port,
        }
    }
}

impl Context {
    pub fn new(client: Client, server: String, token: String, tls: Option<TlsFiles>) -> Self {
        Self {
            client,
            server,
            token,
            tls,
            tunnels: Mutex::new(Registry { running: HashMap::new(), owners: HashMap::new() }),
        }
    }
}

/// Read `--server`, `--token-file`, and the optional TLS file flags.
pub fn parse_flags<I, S>(args: I) -> Result<Flags, String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    let mut server = None;
    let mut token_file = None;
    let mut ca = None;
    let mut cert = None;
    let mut key = None;
    let mut args = args.into_iter();
    while let Some(flag) = args.next() {
        let flag = flag.as_ref();
        let value = args.next().ok_or_else(|| format!("{flag} needs a value"))?;
        let value = value.as_ref().to_string();
        match flag {
            "--server" => server = Some(value),
            "--token-file" => token_file = Some(value),
            "--tls-ca" => ca = Some(value),
            "--tls-cert" => cert = Some(value),
            "--tls-key" => key = Some(value),
            other => return Err(format!("unknown argument {other}")),
        }
    }
    let server = server.ok_or("--server is required")?;
    let token_file = token_file.ok_or("--token-file is required")?;
    let tls = match (ca, cert, key) {
        (None, None, None) => None,
        (Some(ca), Some(cert), Some(key)) => Some(TlsFiles {
            ca: PathBuf::from(ca),
            cert: PathBuf::from(cert),
            key: PathBuf::from(key),
        }),
        _ => return Err("--tls-ca, --tls-cert, and --tls-key must be set together".into()),
    };
    Ok(Flags { server, token_file, tls })
}

fn server_name(server: &str) -> String {
    server.rsplit_once(':').map(|(host, _)| host.to_string()).unwrap_or_else(|| server.to_string())
}

/// The object key that already registered `tunnel_id`, when it is not `key`.
fn conflicting_owner<'a>(owners: &'a HashMap<String, String>, key: &str, tunnel_id: &str) -> Option<&'a str> {
    match owners.get(tunnel_id) {
        Some(owner) if owner != key => Some(owner.as_str()),
        _ => None,
    }
}

/// Failures from applying or cleaning up one object.
#[derive(Debug, thiserror::Error)]
pub enum ReconcileError {
    #[error("TunnelClient has no namespace")]
    MissingNamespace,
    #[error("update TunnelClient status: {0}")]
    Status(#[source] kube::Error),
    #[error("start tunnel: {0}")]
    Tunnel(#[source] ferrotunnel::TunnelError),
}

/// Failures from the reconcile entry point, including finalizer updates.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("TunnelClient has no namespace")]
    MissingNamespace,
    #[error(transparent)]
    Finalizer(#[from] kube::runtime::finalizer::Error<ReconcileError>),
}

/// Connect, replace, or shut down the tunnel for this object.
pub async fn reconcile(tunnel_client: Arc<TunnelClient>, ctx: Arc<Context>) -> Result<Action, Error> {
    let namespace = tunnel_client.namespace().ok_or(Error::MissingNamespace)?;
    let api = Api::<TunnelClient>::namespaced(ctx.client.clone(), &namespace);
    finalizer(&api, FINALIZER, tunnel_client, |event| async {
        match event {
            Event::Apply(tunnel_client) => apply(tunnel_client, Arc::clone(&ctx)).await,
            Event::Cleanup(tunnel_client) => cleanup(tunnel_client, Arc::clone(&ctx)).await,
        }
    })
    .await
    .map_err(Error::Finalizer)
}

async fn apply(tunnel_client: Arc<TunnelClient>, ctx: Arc<Context>) -> Result<Action, ReconcileError> {
    let namespace = tunnel_client.namespace().ok_or(ReconcileError::MissingNamespace)?;
    let name = tunnel_client.name_any();
    let key = format!("{namespace}/{name}");
    let endpoint = Endpoint::from_object(&tunnel_client);
    info!(namespace, name, tunnel_id = endpoint.tunnel_id, "reconcile TunnelClient");

    if let Some(running) = take_stale(&ctx, &key, &endpoint) {
        info!(namespace, name, "tunnel spec changed, replacing connection");
        shutdown(running).await?;
        publish(&ctx, &namespace, &name, &tunnel_client, false).await?;
    }

    if tunnel_matches(&ctx, &key, &endpoint) {
        publish(&ctx, &namespace, &name, &tunnel_client, true).await?;
        return Ok(Action::await_change());
    }

    if let Err(owner) = try_claim(&ctx, &key, &endpoint.tunnel_id) {
        info!(namespace, name, owner, tunnel_id = endpoint.tunnel_id, "tunnel id already registered");
        publish_in_use(&ctx, &namespace, &name, &tunnel_client, &owner).await?;
        return Ok(Action::requeue(Duration::from_secs(30)));
    }

    match start_tunnel(&ctx, &tunnel_client).await {
        Ok(client) => {
            ctx.tunnels.lock().expect("tunnel map").running.insert(
                key,
                RunningTunnel { endpoint, client },
            );
            publish(&ctx, &namespace, &name, &tunnel_client, true).await?;
            Ok(Action::await_change())
        }
        Err(err) => {
            release_claim(&ctx, &key, &endpoint.tunnel_id);
            publish(&ctx, &namespace, &name, &tunnel_client, false).await?;
            Err(err)
        }
    }
}

async fn cleanup(tunnel_client: Arc<TunnelClient>, ctx: Arc<Context>) -> Result<Action, ReconcileError> {
    let namespace = tunnel_client.namespace().unwrap_or_default();
    let name = tunnel_client.name_any();
    let key = format!("{namespace}/{name}");
    info!(namespace, name, "delete TunnelClient");

    let running = release(&ctx, &key);
    if let Some(running) = running {
        shutdown(running).await?;
    }
    Ok(Action::await_change())
}

fn take_stale(ctx: &Context, key: &str, endpoint: &Endpoint) -> Option<RunningTunnel> {
    let mut tunnels = ctx.tunnels.lock().expect("tunnel map");
    let stale = tunnels.running.get(key).is_some_and(|running| {
        !running.client.is_running() || running.endpoint != *endpoint
    });
    if stale { release_locked(&mut tunnels, key) } else { None }
}

fn tunnel_matches(ctx: &Context, key: &str, endpoint: &Endpoint) -> bool {
    ctx.tunnels.lock().expect("tunnel map").running.get(key).is_some_and(|running| {
        running.client.is_running() && running.endpoint == *endpoint
    })
}

fn try_claim(ctx: &Context, key: &str, tunnel_id: &str) -> Result<(), String> {
    let mut tunnels = ctx.tunnels.lock().expect("tunnel map");
    if let Some(owner) = conflicting_owner(&tunnels.owners, key, tunnel_id) {
        return Err(owner.to_string());
    }
    tunnels.owners.insert(tunnel_id.to_string(), key.to_string());
    Ok(())
}

fn release_claim(ctx: &Context, key: &str, tunnel_id: &str) {
    let mut tunnels = ctx.tunnels.lock().expect("tunnel map");
    if tunnels.owners.get(tunnel_id).map(String::as_str) == Some(key) {
        tunnels.owners.remove(tunnel_id);
    }
}

fn release(ctx: &Context, key: &str) -> Option<RunningTunnel> {
    let mut tunnels = ctx.tunnels.lock().expect("tunnel map");
    release_locked(&mut tunnels, key)
}

fn release_locked(tunnels: &mut Registry, key: &str) -> Option<RunningTunnel> {
    let running = tunnels.running.remove(key)?;
    if tunnels.owners.get(&running.endpoint.tunnel_id).map(String::as_str) == Some(key) {
        tunnels.owners.remove(&running.endpoint.tunnel_id);
    }
    Some(running)
}

async fn shutdown(mut running: RunningTunnel) -> Result<(), ReconcileError> {
    running.client.shutdown().await.map_err(ReconcileError::Tunnel)
}

async fn start_tunnel(ctx: &Context, tunnel_client: &TunnelClient) -> Result<Tunnel, ReconcileError> {
    let upstream = &tunnel_client.spec.upstream;
    let mut builder = Tunnel::builder()
        .server_addr(&ctx.server)
        .token(&ctx.token)
        .local_addr(format!("{}:{}", upstream.host, upstream.port))
        .tunnel_id(&tunnel_client.spec.tunnel_id)
        .auto_reconnect(true)
        .startup_timeout(Some(Duration::from_secs(15)));
    if let Some(tls) = &ctx.tls {
        builder = builder.tls(&TlsConfig {
            enabled: true,
            ca_cert_path: Some(tls.ca.clone()),
            cert_path: Some(tls.cert.clone()),
            key_path: Some(tls.key.clone()),
            server_name: Some(server_name(&ctx.server)),
            client_auth: true,
            skip_verify: false,
        });
    }
    let mut tunnel = builder.build().map_err(ReconcileError::Tunnel)?;
    tunnel.start().await.map_err(ReconcileError::Tunnel)?;
    Ok(tunnel)
}

async fn publish(
    ctx: &Context,
    namespace: &str,
    name: &str,
    tunnel_client: &TunnelClient,
    connected: bool,
) -> Result<(), ReconcileError> {
    if connected && reports_connected(tunnel_client) || !connected && reports_not_started(tunnel_client) {
        return Ok(());
    }
    let status = if connected {
        connected_status(tunnel_client)
    } else {
        not_started_status(tunnel_client)
    };
    let api = Api::<TunnelClient>::namespaced(ctx.client.clone(), namespace);
    api.patch_status(
        name,
        &PatchParams::default(),
        &Patch::Merge(&serde_json::json!({ "status": status })),
    )
    .await
    .map_err(ReconcileError::Status)?;
    Ok(())
}

fn reports_not_started(tunnel_client: &TunnelClient) -> bool {
    reports(tunnel_client, "False", TUNNEL_NOT_STARTED, &not_started_message(tunnel_client))
}

fn reports_connected(tunnel_client: &TunnelClient) -> bool {
    reports(tunnel_client, "True", CONNECTED, &connected_message(tunnel_client))
}

async fn publish_in_use(
    ctx: &Context,
    namespace: &str,
    name: &str,
    tunnel_client: &TunnelClient,
    owner: &str,
) -> Result<(), ReconcileError> {
    let message = in_use_message(tunnel_client, owner);
    if reports(tunnel_client, "False", TUNNEL_ID_IN_USE, &message) {
        return Ok(());
    }
    let status = condition_status(tunnel_client, "False", TUNNEL_ID_IN_USE, message);
    let api = Api::<TunnelClient>::namespaced(ctx.client.clone(), namespace);
    api.patch_status(
        name,
        &PatchParams::default(),
        &Patch::Merge(&serde_json::json!({ "status": status })),
    )
    .await
    .map_err(ReconcileError::Status)?;
    Ok(())
}

fn in_use_message(tunnel_client: &TunnelClient, owner: &str) -> String {
    format!("tunnel {} is already registered by {owner}", tunnel_client.spec.tunnel_id)
}

fn reports(tunnel_client: &TunnelClient, status: &str, reason: &str, message: &str) -> bool {
    let Some(current) = &tunnel_client.status else {
        return false;
    };
    current.conditions.iter().any(|condition| {
        condition.type_ == READY
            && condition.status == status
            && condition.reason == reason
            && condition.message == message
            && condition.observed_generation == tunnel_client.metadata.generation
    })
}

fn not_started_status(tunnel_client: &TunnelClient) -> TunnelClientStatus {
    condition_status(tunnel_client, "False", TUNNEL_NOT_STARTED, not_started_message(tunnel_client))
}

fn connected_status(tunnel_client: &TunnelClient) -> TunnelClientStatus {
    condition_status(tunnel_client, "True", CONNECTED, connected_message(tunnel_client))
}

fn condition_status(tunnel_client: &TunnelClient, status: &str, reason: &str, message: String) -> TunnelClientStatus {
    TunnelClientStatus {
        conditions: vec![Condition {
            type_: READY.to_string(),
            status: status.to_string(),
            reason: reason.to_string(),
            message,
            observed_generation: tunnel_client.metadata.generation,
            last_transition_time: Time(k8s_openapi::jiff::Timestamp::now()),
        }],
    }
}

fn not_started_message(tunnel_client: &TunnelClient) -> String {
    format!(
        "tunnel {} is not connected to {}:{}",
        tunnel_client.spec.tunnel_id, tunnel_client.spec.upstream.host, tunnel_client.spec.upstream.port,
    )
}

fn connected_message(tunnel_client: &TunnelClient) -> String {
    format!(
        "tunnel {} is connected to {}:{}",
        tunnel_client.spec.tunnel_id, tunnel_client.spec.upstream.host, tunnel_client.spec.upstream.port,
    )
}

/// Schedule another attempt after `reconcile` fails.
pub fn error_policy(tunnel_client: Arc<TunnelClient>, err: &Error, _ctx: Arc<Context>) -> Action {
    error!(
        namespace = tunnel_client.namespace().as_deref().unwrap_or(""),
        name = tunnel_client.name_any(),
        error = %err,
        "reconcile failed"
    );
    Action::requeue(Duration::from_secs(30))
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::path::PathBuf;

    use super::{
        conflicting_owner, connected_message, connected_status, in_use_message, not_started_message, not_started_status,
        parse_flags, reports_connected, reports_not_started, server_name, Endpoint,
    };
    use crate::{TunnelClient, TunnelClientSpec, Upstream};

    fn example() -> TunnelClient {
        TunnelClient::new(
            "prometheus",
            TunnelClientSpec {
                tunnel_id: "prometheus".into(),
                upstream: Upstream {
                    host: "prometheus.monitoring.svc".into(),
                    port: 9090,
                },
            },
        )
    }

    #[test]
    fn a_new_object_needs_a_not_started_condition() {
        let object = example();
        let condition = &not_started_status(&object).conditions[0];

        assert!(!reports_not_started(&object));
        assert_eq!(condition.status, "False");
        assert_eq!(condition.reason, "TunnelNotStarted");
        assert_eq!(condition.message, not_started_message(&object));
    }

    #[test]
    fn a_connected_object_reports_ready() {
        let mut object = example();
        object.status = Some(connected_status(&object));

        assert!(reports_connected(&object));
        assert!(!reports_not_started(&object));
        assert_eq!(
            object.status.as_ref().unwrap().conditions[0].message,
            connected_message(&object)
        );
    }

    #[test]
    fn a_different_upstream_is_a_different_endpoint() {
        let object = example();
        let current = Endpoint::from_object(&object);
        let mut changed = object.clone();
        changed.spec.upstream.port = 9080;

        assert_eq!(current, Endpoint::from_object(&object));
        assert_ne!(current, Endpoint::from_object(&changed));
    }

    #[test]
    fn a_second_object_does_not_get_a_registered_tunnel_id() {
        let mut owners = HashMap::new();
        owners.insert("prometheus".into(), "monitoring/prometheus".into());

        assert_eq!(
            conflicting_owner(&owners, "monitoring/other", "prometheus"),
            Some("monitoring/prometheus")
        );
        assert_eq!(conflicting_owner(&owners, "monitoring/prometheus", "prometheus"), None);
        assert_eq!(
            in_use_message(&example(), "monitoring/prometheus"),
            "tunnel prometheus is already registered by monitoring/prometheus"
        );
    }

    #[test]
    fn tls_flags_are_optional_and_must_arrive_together() {
        let plain = parse_flags(["--server", "127.0.0.1:7835", "--token-file", ".local/token"]).unwrap();
        assert_eq!(plain.server, "127.0.0.1:7835");
        assert!(plain.tls.is_none());
        assert_eq!(server_name(&plain.server), "127.0.0.1");

        let tls = parse_flags([
            "--server",
            "tunnel.example.com:7835",
            "--token-file",
            "token",
            "--tls-ca",
            "ca.crt",
            "--tls-cert",
            "tls.crt",
            "--tls-key",
            "tls.key",
        ])
        .unwrap();
        assert_eq!(
            tls.tls.unwrap(),
            super::TlsFiles {
                ca: PathBuf::from("ca.crt"),
                cert: PathBuf::from("tls.crt"),
                key: PathBuf::from("tls.key"),
            }
        );
        assert_eq!(server_name("tunnel.example.com:7835"), "tunnel.example.com");

        let partial = parse_flags(["--server", "127.0.0.1:7835", "--token-file", "token", "--tls-ca", "ca.crt"]);
        assert_eq!(
            partial.unwrap_err(),
            "--tls-ca, --tls-cert, and --tls-key must be set together"
        );
    }
}
