defmodule Console.Deployments.Init do
  @moduledoc """
  Handles resolving chicken-eggs for setting up plural cd in a cluster
  """
  use Console.Services.Base
  alias Console.Services.Users
  alias Console.Schema.{AccessToken, Cluster, DeploymentSettings, Group, User, Workbench, WorkbenchTool}
  alias Kube.Utils
  alias Console.Deployments.{Clusters, Git, Settings, Services, Workbenches}

  @secret_name "console-auth-token"
  @context_name "plrl/cloud/observability"

  def setup() do
    bot = console_bot()
    start_transaction()
    |> add_operation(:deploy_repo, fn _ ->
      Git.git_auth_attrs()
      |> Map.put(:url, Git.deploy_url())
      |> Git.create_repository(bot)
    end)
    |> add_operation(:artifacts_repo, fn _ ->
      Git.git_auth_attrs()
      |> Map.put(:url, Git.artifacts_url())
      |> Git.create_repository(bot)
    end)
    |> add_operation(:settings, fn %{deploy_repo: drepo, artifacts_repo: arepo} ->
      maybe_ai(%{
        name: "global",
        artifact_repository_id: arepo.id,
        deployer_repository_id: drepo.id,
      })
      |> maybe_observability()
      |> maybe_agent_helm_values()
      |> Settings.create()
    end)
    |> add_operation(:cluster, fn _ ->
      Clusters.create_cluster_raw(%{
        name: Console.conf(:cluster_name),
        self: true,
        handle: "mgmt",
        version: "1.24",
        ignore_limit: true
      }, bot)
    end)
    |> add_operation(:provider, fn _ ->
      case Console.byok?() do
        true -> {:ok, %{id: nil}}

        _ ->
          Clusters.create_provider(%{
            name: "#{Console.conf(:provider)}",
            namespace: "bootstrap",
            self: true,
            cloud: "#{Console.conf(:provider)}"
          }, bot)
      end
    end)
    |> add_operation(:rebind, fn
      %{provider: provider, cluster: %Cluster{} = cluster} ->
        Ecto.Changeset.change(cluster, %{provider_id: provider.id})
        |> Repo.update()
      %{provider: provider} -> {:ok, provider}
    end)
    |> add_operation(:context, fn _ -> maybe_setup_context(bot) end)
    |> add_operation(:secret, fn _ -> ensure_secret(Console.cloud?()) end)
    |> execute()
  end

  def setup_groups(email) when is_binary(email) do
    with %User{} = user <- Users.get_user_by_email(email),
         {:ok, %Group{id: group_id}} <- Users.upsert_group("sre") do
      Users.create_group_member(%{user_id: user.id}, group_id)
    else
      _ -> {:ok, %{}}
    end
  end
  def setup_groups(_), do: {:ok, %{}}


  def ensure_secret(ignore \\ false)
  def ensure_secret(true), do: {:ok, %{}}
  def ensure_secret(_) do
    case Utils.get_secret(namespace(), @secret_name) do
      {:ok, _} = res -> res
      _ -> create_auth_secret()
    end
  end

  def auth_token() do
    with {:ok, %{data: %{"access-token" => token}}} <- Utils.get_secret(namespace(), @secret_name),
      do: Base.decode64(token)
  end

  defp create_auth_secret() do
    console = Users.get_bot!("console")
    start_transaction()
    |> add_operation(:token, fn _ ->
      Users.create_access_token(console)
    end)
    |> add_operation(:secret, fn %{token: %AccessToken{token: token}} ->
      Utils.create_secret(namespace(), @secret_name, %{"access-token" => token})
    end)
    |> execute(extract: :secret)
  end

  defp namespace(), do: System.get_env("NAMESPACE") || "console"

  defp maybe_ai(attrs) do
    case {Console.cloud?(), Console.conf(:provider)} do
      {true, :aws} ->
        Map.put(attrs, :ai, %{
          provider: :openai,
          embedding_provider: :openai,
          enabled: true,
          bedrock: %{region: "us-east-1"},
          openai: %{base_url: "http://ai-proxy.ai-proxy:8000/openai/v1"}
        })
      {true, _} ->
        Map.put(attrs, :ai, %{
          provider: :openai,
          enabled: true,
          openai: %{base_url: "http://ai-proxy.ai-proxy:8000/openai/v1"}
        })
      _ -> attrs
    end
  end

  def force_flip() do
    case Console.conf(:cloud_override) do
      "bedrock" -> migrate_bedrock()
      "openai"  -> migrate_openai()
      _ -> {:ok, %{}}
    end
  end

  def migrate_bedrock() do
    with {true, :aws} <- {Console.cloud?(), Console.conf(:provider)},
         %DeploymentSettings{ai: %{
           provider: :openai,
           openai: %{base_url: "http://ai-proxy.ai-proxy:8000/openai/v1"}}
         } = settings <- Settings.fetch_consistent() do
      DeploymentSettings.changeset(settings, %{ai: %{
        provider: :bedrock,
        embedding_provider: :openai,
        bedrock: %{region: "us-east-1"}
      }})
      |> Repo.update()
    else
      _ -> {:ok, %{}}
    end
  end

  def migrate_openai() do
    with {true, :aws} <- {Console.cloud?(), Console.conf(:provider)},
         %DeploymentSettings{ai: %{
           provider: :bedrock,
           bedrock: %{region: "us-east-1"}}
         } = settings <- Settings.fetch_consistent() do
      DeploymentSettings.changeset(settings, %{ai: %{
        provider: :openai,
        openai: %{base_url: "http://ai-proxy.ai-proxy:8000/openai/v1"}
      }})
      |> Repo.update()
    else
      _ -> {:ok, %{}}
    end
  end

  defp maybe_agent_helm_values(attrs) do
    case Console.conf(:agent_helm_values) do
      helm_values when is_binary(helm_values) and byte_size(helm_values) > 0 ->
        Map.put(attrs, :agent_helm_values, helm_values)
      nil -> attrs
    end
  end

  @doc """
  Migrates an existing cloud instance onto the plural telemetry stack.  Repoints the global
  prometheus/logging settings, the shared observability service context, and the plural
  workbench tools at telemetry, creating the loki and tempo tools if they don't exist yet.
  """
  @spec migrate_plural_telemetry() :: {:ok, map} | Console.error()
  def migrate_plural_telemetry() do
    with true <- Console.plural_o11y?(),
         true <- Console.cloud?(),
         inst when is_binary(inst) <- Console.cloud_instance(),
         {:ok, _, pass} <- Console.es_creds(),
         {:ok, settings} <- telemetry_settings(pass),
         {:ok, context} <- context_configuration(inst, pass),
         {:ok, tools} <- telemetry_tools(pass) do
      bot = console_bot()
      start_transaction()
      |> add_operation(:settings, fn _ -> Settings.update(settings) end)
      |> add_operation(:context, fn _ ->
        Services.save_context(%{configuration: context}, @context_name, bot)
      end)
      |> add_tools(tools, &upsert_tool(&1, bot))
      |> execute()
    else
      _ -> {:error, "plural telemetry is not fully configured"}
    end
  end

  @spec setup_workbench() :: {:ok, %{bench: Workbench.t()}} | Console.error()
  def setup_workbench() do
    with true <- Console.cloud?(),
         inst when is_binary(inst) <- Console.cloud_instance(),
         {:ok, url, pass} <- Console.es_creds(),
         {:ok, tools} <- workbench_tools(inst, url, pass) do
      bot = console_bot()
      start_transaction()
      |> add_tools(tools, &Workbenches.create_tool(&1, bot))
      |> add_operation(:exa, fn _ ->
        Workbenches.create_tool(%{
          name: "exa",
          tool: :exa,
          configuration: %{exa: %{api_key: Console.conf(:exa_api_key)}}
        }, bot)
      end)
      |> add_operation(:bench, fn %{exa: %{id: exa_id}} ->
        Workbenches.create_workbench(%{
          name: "plural",
          description: "Workbench pre-configured with all plural-native tools",
          configuration: %{
            infrastructure: %{services: true, stacks: true, kubernetes: true},
            observability: %{logs: true, metrics: true}
          },
          tool_associations: [%{tool_id: exa_id}]
        }, bot)
      end)
      |> execute()
    else
      _ -> {:ok, %{}}
    end
  end

  defp workbench_tools(inst, url, pass) do
    case Console.plural_o11y?() do
      true -> telemetry_tools(pass)
      false -> elastic_tools(inst, url, pass)
    end
  end

  defp elastic_tools(inst, url, pass) do
    with {:ok, vurl, vtenant} <- Console.vmetrics_creds() do
      {:ok, [
        es: %{
          name: "plrl_elastic_logs",
          tool: :elastic,
          configuration: %{
            elastic: %{
              url: url,
              username: "plrl-#{inst}",
              password: pass,
              index: "plrl-#{inst}-logs-*"
            }
          }
        },
        prometheus: %{
          name: "plrl_prometheus",
          tool: :prometheus,
          configuration: %{
            prometheus: %{
              url: "#{vurl}/select/#{vtenant}/prometheus",
              username: "plrl-#{inst}",
              password: pass
            }
          }
        }
      ]}
    end
  end

  defp telemetry_tools(pass) do
    with {:ok, murl} <- Console.telemetry_url(:metrics, :read),
         {:ok, lurl} <- Console.telemetry_url(:logs, :read),
         {:ok, turl} <- Console.telemetry_url(:traces, :read) do
      auth = %{username: Console.telemetry_user(), password: pass}
      {:ok, [
        prometheus: %{name: "plrl_prometheus", tool: :prometheus, configuration: %{prometheus: Map.put(auth, :url, murl)}},
        loki: %{name: "plrl_loki_logs", tool: :loki, configuration: %{loki: Map.put(auth, :url, lurl)}},
        tempo: %{name: "plrl_tempo_traces", tool: :tempo, configuration: %{tempo: Map.put(auth, :url, turl)}}
      ]}
    end
  end

  defp add_tools(xact, tools, fun) do
    Enum.reduce(tools, xact, fn {key, attrs}, xact ->
      add_operation(xact, key, fn _ -> fun.(attrs) end)
    end)
  end

  defp upsert_tool(%{name: name} = attrs, bot) do
    case Workbenches.get_workbench_tool_by_name(name) do
      %WorkbenchTool{id: id} -> Workbenches.update_tool(attrs, id, bot)
      nil -> Workbenches.create_tool(attrs, bot)
    end
  end

  defp maybe_observability(attrs) do
    with true <- Console.cloud?(),
         inst when is_binary(inst) <- Console.cloud_instance(),
         {:ok, url, pass} <- Console.es_creds(),
         {:ok, o11y} <- observability_settings(inst, url, pass) do
        es_creds = %{
          host: url,
          user: "plrl-#{inst}",
          password: pass,
          index: "plrl-#{inst}-logs-*"
        }

        attrs
        |> Map.merge(o11y)
        |> put_in([:ai, :vector_store], %{
          enabled: true,
          vector_store: :elastic,
          elastic: Map.put(es_creds, :index, "plrl-#{inst}-vectors")
        })
        |> put_in([:ai, :graph], %{
          enabled: true,
          store: :elastic,
          elastic: Map.put(es_creds, :index, "plrl-#{inst}-graph")
        })
    else
      _ -> attrs
    end
  end

  defp observability_settings(inst, url, pass) do
    case Console.plural_o11y?() do
      true -> telemetry_settings(pass)
      false -> elastic_settings(inst, url, pass)
    end
  end

  defp elastic_settings(inst, url, pass) do
    with {:ok, vurl, vtenant} <- Console.vmetrics_creds() do
      {:ok, %{
        logging: %{
          enabled: true,
          driver: :elastic,
          elastic: %{host: url, user: "plrl-#{inst}", password: pass, index: "plrl-#{inst}-logs-*"}
        },
        prometheus_connection: %{
          host: "#{vurl}/select/#{vtenant}/prometheus",
          user: "plrl-#{inst}",
          password: pass
        }
      }}
    end
  end

  defp telemetry_settings(pass) do
    with {:ok, murl} <- Console.telemetry_url(:metrics, :read),
         {:ok, lurl} <- Console.telemetry_url(:logs, :read) do
      user = Console.telemetry_user()
      {:ok, %{
        logging: %{enabled: true, driver: :loki, loki: %{host: lurl, user: user, password: pass}},
        prometheus_connection: %{host: murl, user: user, password: pass}
      }}
    end
  end

  defp maybe_setup_context(bot) do
    with true <- Console.cloud?(),
         inst when is_binary(inst) <- Console.cloud_instance(),
         {:ok, _url, pass} <- Console.es_creds(),
         {:ok, configuration} <- context_configuration(inst, pass) do
      Services.save_context(%{configuration: configuration}, @context_name, bot)
    else
      _ -> {:ok, %{}}
    end
  end

  defp context_configuration(inst, pass) do
    case Console.plural_o11y?() do
      true -> telemetry_context(inst, pass)
      false -> elastic_context(inst, pass)
    end
  end

  defp elastic_context(inst, pass) do
    with {:ok, _vurl, _vtenant} <- Console.vmetrics_creds() do
      {:ok, %{
        elastic: elastic_ingest(inst, "plrl-#{inst}", pass),
        vmetrics: vmetrics_ingest("plrl-#{inst}", pass)
      }}
    end
  end

  defp telemetry_context(inst, pass) do
    with {:ok, lurl} <- Console.telemetry_url(:logs, :read),
         {:ok, twrite} <- Console.telemetry_url(:traces, :write),
         {:ok, tread} <- Console.telemetry_url(:traces, :read) do
      user = Console.telemetry_user()
      {:ok, %{
        elastic: elastic_ingest(inst, user, pass),
        vmetrics: vmetrics_ingest(user, pass),
        loki: %{
          url: Console.url("/ext/v1/ingest/loki/api/v1/push"),
          query_url: lurl,
          user: user,
          password: pass
        },
        # OTLP/HTTP base; exporters append /v1/traces
        tempo: %{url: twrite, query_url: tread, user: user, password: pass}
      }}
    end
  end

  defp elastic_ingest(inst, user, pass) do
    %{
      url: ensure_port(Console.url("/ext/v1/ingest/elastic")),
      user: user,
      password: pass,
      # Logstash write target (ILM rollover alias). Query pattern stays plrl-#{inst}-logs-*.
      index: "plrl-#{inst}-logs-write"
    }
  end

  defp vmetrics_ingest(user, pass) do
    %{
      query_url: Console.url("/ext/v1/query/prometheus"),
      url: Console.url("/ext/v1/ingest/prometheus"),
      user: user,
      password: pass
    }
  end

  defp ensure_port(url) do
    case URI.new(url) do
      {:ok, %URI{scheme: s, host: h, path: p}} ->
        Path.join("#{s}://#{h}:443", p)
      _ -> url
    end
  end

  defp console_bot(), do: %{Users.get_bot!("console") | roles: %{admin: true}}
end
