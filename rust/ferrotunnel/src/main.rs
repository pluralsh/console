//! Watch `TunnelClient` and run [`ferrotunnel_client::controller::reconcile`] for each change.
//!
//! `Client::try_default` reads `KUBECONFIG`, or the in-cluster service account
//! when this process runs in a pod. `Controller::new` is the registration:
//! it subscribes to every namespace. The watch does no work until the stream
//! from `run` is polled.

use std::sync::Arc;

use ferrotunnel_client::controller::{error_policy, reconcile, Context};
use ferrotunnel_client::TunnelClient;
use futures::StreamExt;
use kube::runtime::controller::Controller;
use kube::runtime::watcher;
use kube::{Api, Client};
use tracing::info;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // kube uses ring and ferrotunnel uses aws-lc-rs. rustls will not choose
    // between them, so this process selects ring before any TLS connection.
    let _ = rustls::crypto::ring::default_provider().install_default();

    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt().with_env_filter(filter).init();

    let client = Client::try_default().await?;
    let (server, token) = tunnel_config()?;
    let tunnel_clients = Api::<TunnelClient>::all(client.clone());

    info!(server, "watching TunnelClient");
    Controller::new(tunnel_clients, watcher::Config::default())
        .run(reconcile, error_policy, Arc::new(Context::new(client, server, token)))
        .for_each(|result| async move {
            match result {
                Ok((object, action)) => info!(?object, ?action, "reconciled"),
                Err(err) => tracing::error!(?err, "reconcile failed"),
            }
        })
        .await;
    Ok(())
}

fn tunnel_config() -> Result<(String, String), Box<dyn std::error::Error>> {
    let mut server = None;
    let mut token_file = None;
    let mut args = std::env::args().skip(1);
    while let Some(flag) = args.next() {
        let value = args.next().ok_or_else(|| format!("{flag} needs a value"))?;
        match flag.as_str() {
            "--server" => server = Some(value),
            "--token-file" => token_file = Some(value),
            other => return Err(format!("unknown argument {other}").into()),
        }
    }
    let server = server.ok_or("--server is required")?;
    let token_file = token_file.ok_or("--token-file is required")?;
    let token = std::fs::read_to_string(&token_file)?;
    let token = token.trim().to_string();
    if token.is_empty() {
        return Err(format!("{token_file} is empty").into());
    }
    Ok((server, token))
}
