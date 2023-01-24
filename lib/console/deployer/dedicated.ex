defmodule Console.Deployer.Dedicated do
  use Kube.Builder
  alias Kazan.Apis.Batch.V1, as: BatchV1
  alias Kazan.Watcher

  import System, only: [get_env: 1]

  # @labels %{
  #   "app.kubernetes.io/name" => "console",
  #   "app.kubernetes.io/instance" =>  "console"
  # }

  def create_job(build_id) do
    "build-#{Console.rand_alphanum(5)}-#{Console.rand_alphanum(3)}"
    |> job_spec(build_id)
    |> BatchV1.create_namespaced_job!(namespace())
    |> Kazan.run()
  end

  def cancel_job(%BatchV1.Job{} = job) do
    %MetaV1.DeleteOptions{}
    |> BatchV1.delete_namespaced_job!(namespace(), job.metadata.name)
    |> Kazan.run()
  end

  def watch_job(job_name) do
    namespace()
    |> BatchV1.list_namespaced_job!(field_selector: "metadata.name=#{job_name}")
    |> Map.put(:response_model, BatchV1.Job)
    |> Watcher.start(send_to: self())
    |> case do
      {:ok, pid} -> {:ok, pid, Process.monitor(pid)}
      error -> error
    end
  end

  def job_status(%BatchV1.Job{status: %BatchV1.JobStatus{completion_time: nil}}), do: :running
  def job_status(_), do: :done

  def job_spec(name, build_id) do
    {mounts, volumes} = ssh_mount()
    annotations = %{"console.plural.sh/build-id" => build_id}
    %BatchV1.Job{
      metadata: object_meta(name, namespace(), annotations),
      spec: %BatchV1.JobSpec{
        backoff_limit: 1,
        template: %CoreV1.PodTemplateSpec{
          metadata: %MetaV1.ObjectMeta{
            annotations: annotations,
          },
          spec: %CoreV1.PodSpec{
            containers: [container(mounts, build_id)],
            init_containers: [init_container()],
            restart_policy: "Never",
            service_account_name: "console",
            volumes: [
              %CoreV1.Volume{
                name: "console-conf",
                secret: %CoreV1.SecretVolumeSource{secret_name: "console-conf"}
              }
            ] ++ volumes,
            node_selector: %{"platform.plural.sh/instance-class" => "console"},
            tolerations: [%CoreV1.Toleration{
              key: "platform.plural.sh/taint",
              value: "CONSOLE",
              operator: "Equal"
            }],
          }
        }
      }
    }
  end

  defp container(mounts, build_id) do
    %CoreV1.Container{
      name: "console",
      image: get_env("CONSOLE_IMG") || "dkr.plural.sh/console/console:#{Console.conf(:version)}",
      ports: [
        %CoreV1.ContainerPort{
          name: "http",
          container_port: 4000,
          protocol: "TCP"
        },
        %CoreV1.ContainerPort{
          name: "epmd",
          container_port: 4369,
          protocol: "TCP"
        }
      ],
      resources: %CoreV1.ResourceRequirements{requests: %{cpu: "50m", memory: "150Mi"}},
      env: env_vars(build_id),
      env_from: [%CoreV1.EnvFromSource{secret_ref: %CoreV1.SecretEnvSource{name: "console-env"}}],
      liveness_probe: healthcheck(),
      readiness_probe: healthcheck(),
      volume_mounts: [
        %CoreV1.VolumeMount{
          name: "console-conf",
          mount_path: "/root/.plural"
        },
      ] ++ mounts,
    }
  end

  defp namespace(), do: get_env("NAMESPACE")

  defp env_vars(build_id) do
    [
      env_var("CONSOLE_BUILD_ID", build_id),
      env_var("HOST", Console.conf(:url)),
      env_var("NAMESPACE", namespace()),
      env_var("DBHOST", "plural-console"),
      env_var("DBSSL", "true"),
      env_var("POSTGRES_PASSWORD", %CoreV1.EnvVarSource{
        secret_key_ref: %CoreV1.SecretKeySelector{
          name: get_env("DB_PASSWORD_SECRET") || "console.plural-console.credentials.postgresql.acid.zalan.do",
          key: "password"
        }
      }),
      env_var("POD_IP", %CoreV1.EnvVarSource{
        field_ref: %CoreV1.ObjectFieldSelector{field_path: "status.podIP"}
      }),
      env_var("POD_NAME", %CoreV1.EnvVarSource{
        field_ref: %CoreV1.ObjectFieldSelector{field_path: "metadata.name"}
      })
    ]
  end

  defp ssh_mount() do
    case Console.Commands.Configuration.ssh_path() do
      p when is_binary(p) ->
        {
          [%CoreV1.VolumeMount{name: "console-ssh", mount_path: "/root/.ssh"}],
          [%CoreV1.Volume{name: "console-ssh", secret: %CoreV1.SecretVolumeSource{secret_name: "console-ssh", default_mode: 384}}]
        }
      _ -> {[], []}
    end
  end

  defp init_container() do
    %CoreV1.Container{
      name: "wait-for-pg",
      image: "gcr.io/pluralsh/library/busybox:1.35.0",
      image_pull_policy: "IfNotPresent",
      command: ["/bin/sh", "-c", "until nc -zv plural-console 5432 -w1; do echo 'waiting for db'; sleep 1; done"]
    }
  end

  defp healthcheck() do
    %CoreV1.Probe{
      http_get: %CoreV1.HTTPGetAction{
        path: "/health",
        port: "http"
      },
      initial_delay_seconds: 5,
    }
  end
end
