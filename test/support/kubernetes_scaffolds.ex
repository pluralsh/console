defmodule KubernetesScaffolds do
  alias Kazan.Apis.Core.V1, as: Core
  alias Kazan.Apis.Apps.V1, as: Apps
  alias Kazan.Apis.Networking.V1, as: Networking
  alias Kazan.Apis.Batch.V1beta1, as: Batch
  alias Kazan.Apis.Batch.V1, as: BatchV1
  alias Kazan.Models.Apimachinery.Meta.V1.{LabelSelector, ObjectMeta}
  alias Kazan.Models.Apimachinery
  alias Kube
  alias Console.Schema

  def stateful_set(namespace, name) do
    %Apps.StatefulSet{
      metadata: %{name: name, namespace: namespace},
      status: %Apps.StatefulSetStatus{
        current_replicas: 3,
        replicas: 3
      },
      spec: %Apps.StatefulSetSpec{
        replicas: 3,
        service_name: name,
        selector: %LabelSelector{match_labels: %{"label" => "value"}}
      }
    }
  end

  def deployment(namespace, name) do
    %Apps.Deployment{
      metadata: %{name: name, namespace: namespace},
      status: %Apps.DeploymentStatus{
        available_replicas: 3,
        replicas: 3,
        ready_replicas: 3
      },
      spec: %Apps.DeploymentSpec{
        replicas: 3,
        selector: %LabelSelector{match_labels: %{"label" => "value"}}
      }
    }
  end

  def service(namespace, name) do
    %Core.Service{
      metadata: %{name: name, namespace: namespace},
      status: %Core.ServiceStatus{load_balancer: %{ingress: [%{ip: "1.2.3.4"}]}},
      spec: %Core.ServiceSpec{
        selector: %{"label" => "value"},
        load_balancer_ip: "1.2.3.4",
        cluster_ip: "1.2.3.4",
        type: "LoadBalancer",
        ports: [%Core.ServicePort{name: "example", protocol: "TCP", port: 8080, target_port: 8080}]
      }
    }
  end

  def ingress(namespace, name) do
    %Networking.Ingress{
      metadata: %{name: name, namespace: namespace},
      status: %Networking.IngressStatus{load_balancer: %{ingress: [%{ip: "1.2.3.4"}]}},
      spec: %Networking.IngressSpec{
        tls: [%Networking.IngressTLS{hosts: ["example.com"]}],
        rules: [%Networking.IngressRule{
          host: "example.com",
          http: %Networking.HTTPIngressRuleValue{
            paths: [%Networking.HTTPIngressPath{path: "*"}]
          }
        }]
      }
    }
  end

  def status() do
    %Kazan.Models.Apimachinery.Meta.V1.Status{
      message: "succeeded",
      status: "Success"
    }
  end

  def pod(name) do
    %Core.Pod{
      metadata: %{name: name, namespace: name},
      status: %Core.PodStatus{pod_ip: "1.2.3.4"},
      spec: %Core.PodSpec{node_name: "some-node"}
    }
  end

  def kube_node(name \\ "some-node") do
    %Core.Node{
      metadata: %{name: name},
      status: %Core.NodeStatus{
        allocatable: %{"cpu" => "2", "memory" => "6Gi"},
        capacity: %{"cpu" => "2", "memory" => "6Gi"}
      },
      spec: %Core.NodeSpec{
        provider_id: "provider-id",
        unschedulable: false
      }
    }
  end

  def cron(name) do
    %Batch.CronJob{
      metadata: %{name: name, namespace: name},
      status: %Batch.CronJobStatus{last_schedule_time: "time"},
      spec: %Batch.CronJobSpec{
        concurrency_policy: "Forbid",
        schedule: "* * * * *",
        suspend: false
      }
    }
  end

  def job(name) do
    %BatchV1.Job{
      metadata: %{name: name, namespace: name},
      status: %BatchV1.JobStatus{active: 1},
      spec: %BatchV1.JobSpec{
        parallelism: 1,
        backoff_limit: 5
      }
    }
  end

  def logfilter(name) do
    %Kube.LogFilter{
      metadata: %{name: name, namespace: name},
      spec: %Kube.LogFilter.Spec{
        query: "query",
        labels: [%Kube.LogFilter.Spec.Labels{name: "l", value: "v"}]
      }
    }
  end

  def version_info() do
    %Apimachinery.Version.Info{
      git_commit: "aedc1234",
      major: "12",
      minor: "01",
      platform: "linux"
    }
  end

  def certificate(name) do
    %Kube.Certificate{
      metadata: %ObjectMeta{name: name, namespace: name},
      status: %Kube.Certificate.Status{
        renewal_time: DateTime.utc_now() |> DateTime.to_iso8601()
      },
      spec: %Kube.Certificate.Spec{
        dns_names: ["some.example.com"],
        secret_name: "example-tls"
      }
    }
  end

  def node_metrics(name) do
    %Kube.NodeMetric{
      metadata: %ObjectMeta{name: name},
      usage: %Kube.NodeMetric.Usage{cpu: "1", memory: "2M"},
      timestamp: "13242"
    }
  end

  def runbook(name, datasources \\ []) do
    %Kube.Runbook{
      metadata: %ObjectMeta{name: name, namespace: name},
      spec: %Kube.Runbook.Spec{
        name: name,
        datasources: datasources,
        actions: [%Kube.Runbook.Spec.Actions{
          name: "action",
          configuration: %Kube.Runbook.Spec.Actions.Configuration{
            updates: [
              %Kube.Runbook.Spec.Actions.Configuration.Updates{
                path: ["some", "path"],
                value_from: "path"
              }
            ]
          }
        }],
        display: """
        <root>
          <box>
            <text size="small">some text</text>
          </box>
        </root>
        """
      }
    }
  end

  def runbook_datasource(type, name, opts \\ [])
  def runbook_datasource(:prometheus, name, _) do
    %Kube.Runbook.Spec.Datasources{
      name: name,
      prometheus: %Kube.Runbook.Spec.Datasources.Prometheus{query: "query"},
    }
  end

  def runbook_datasource(:kubernetes, name, opts) do
    %Kube.Runbook.Spec.Datasources{
      name: name,
      kubernetes: struct(Kube.Runbook.Spec.Datasources.Kubernetes, opts),
    }
  end

  def runbook_datasource(:nodes, name, _) do
    %Kube.Runbook.Spec.Datasources{type: "nodes", name: name}
  end

  def license(name) do
    %Kube.License{
      metadata: %{name: name, namespace: name},
      status: %Kube.License.Status{
        policy: %Kube.License.Status.Policy{
          free: true,
          features: [%Kube.License.Status.Policy.Features{name: "feature", description: "description"}]
        }
      }
    }
  end

  def configuration_overlay(name, opts \\ []) do
    %Kube.ConfigurationOverlay{
      metadata: %{name: name, namespace: name},
      spec: struct(Kube.ConfigurationOverlay.Spec, opts),
    }
  end

  def vertical_pod_autoscaler(name) do
    %Kube.VerticalPodAutoscaler{
      metadata: %{name: name, namespace: name},
      spec: %Kube.VerticalPodAutoscaler.Spec{
        target_ref: %{kind: :statefulset, name: "name", api_version: "core/v1"},
        update_policy: %{update_mode: "Off"}
      }
    }
  end

  def namespace_scaffold(name) do
    %Core.Namespace{
      metadata: %{name: name},
      spec: %Core.NamespaceSpec{finalizers: ["finalizer"]},
      status: %Core.NamespaceStatus{phase: "Created"}
    }
  end

  def config_map(name) do
    %Core.ConfigMap{
      metadata: %{namespace: name, name: name},
      data: %{"some" => "config"}
    }
  end

  def secret(name) do
    %Core.Secret{
      metadata: %{namespace: name, name: name},
      data: %{"some" => "secret"},
      type: "Opaque"
    }
  end

  def wireguard_peer(name) do
    %Kube.WireguardPeer{
      metadata: %{name: name, namespace: "wireguard", annotations: %{}},
      spec: %Kube.WireguardPeer.Spec{wireguard_ref: "wireguard"},
      status: %Kube.WireguardPeer.Status{ready: true, config_ref: %Kube.WireguardPeer.Status.ConfigRef{name: "n", key: "k"}}
    }
  end

  def wireguard_peer(name, %Schema.User{email: email}) do
    peer = wireguard_peer(name)
    put_in(peer.metadata.annotations["vpn.plural.sh/email"], email)
  end

  def wireguard_server() do
    %Kube.WireguardServer{
      metadata: %{name: "wireguard", namespage: "wireguard"},
      status: %Kube.WireguardServer.Status{ready: true}
    }
  end

  def postgres(name) do
    %Kube.Postgresql{
      metadata: %ObjectMeta{name: name, namespace: name, uid: Ecto.UUID.generate()},
      spec: %Kube.Postgresql.Spec{
        team_id: "plural",
        postgresql: %Kube.Postgresql.Spec.Postgresql{version: "13"},
        resources: %Kube.Postgresql.Spec.Resources{requests: %{cpu: "1", memory: "1Gi"}}
      },
      status: %{"PostgresClusterStatus" => "Running"}
    }
  end

  def cluster(name, ready \\ true) do
    %Kube.Cluster{
      metadata: %ObjectMeta{name: name, namespace: name},
      status: %Kube.Cluster.Status{control_plane_ready: ready}
    }
  end

  def plural_cluster(name, id) do
    %Kube.PluralCluster{
      metadata: %ObjectMeta{name: name, namespace: name},
      status: %Kube.PluralCluster.Status{id: id}
    }
  end

  def service_deployment(name, id) do
    %Kube.ServiceDeployment{
      metadata: %ObjectMeta{name: name, namespace: name},
      status: %Kube.ServiceDeployment.Status{id: id}
    }
  end

  def git_repository(name, id) do
    %Kube.GitRepository{
      metadata: %ObjectMeta{name: name, namespace: name},
      status: %Kube.GitRepository.Status{id: id}
    }
  end
end
