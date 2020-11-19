defmodule KubernetesScaffolds do
  alias Kazan.Apis.Core.V1, as: Core
  alias Kazan.Apis.Apps.V1, as: Apps
  alias Kazan.Apis.Extensions.V1beta1, as: Extensions
  alias Kazan.Apis.Batch.V1beta1, as: Batch
  alias Kazan.Models.Apimachinery.Meta.V1.{LabelSelector}
  alias Kube

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
    %Extensions.Ingress{
      metadata: %{name: name, namespace: namespace},
      status: %Extensions.IngressStatus{load_balancer: %{ingress: [%{ip: "1.2.3.4"}]}},
      spec: %Extensions.IngressSpec{
        tls: [%Extensions.IngressTLS{hosts: ["example.com"]}],
        rules: [%Extensions.IngressRule{
          host: "example.com",
          http: %Extensions.HTTPIngressRuleValue{
            paths: [%Extensions.HTTPIngressPath{path: "*"}]
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
      metadata: %{name: name},
      status: %Core.PodStatus{pod_ip: "1.2.3.4"},
      spec: %Core.PodSpec{node_name: "some-node"}
    }
  end

  def kube_node() do
    %Core.Node{
      metadata: %{name: "some-node"},
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

  def logfilter(name) do
    %Kube.LogFilter{
      metadata: %{name: name, namespace: name},
      spec: %Kube.LogFilter.Spec{
        query: "query",
        labels: [%Kube.LogFilter.Label{name: "l", value: "v"}]
      }
    }
  end
end