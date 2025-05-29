defmodule Console.Deployments.Init do
  @moduledoc """
  Handles resolving chicken-eggs for setting up plural cd in a cluster
  """
  use Console.Services.Base
  alias Console.Services.Users
  alias Console.Schema.{AccessToken, Cluster, Group, User}
  alias Kube.Utils
  alias Console.Deployments.{Clusters, Git, Settings, Services}

  @secret_name "console-auth-token"

  def setup() do
    bot = %{Users.get_bot!("console") | roles: %{admin: true}}
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
    |> add_operation(:cluster, fn _ ->
      Clusters.create_cluster(%{
        name: Console.conf(:cluster_name),
        self: true,
        handle: "mgmt",
        version: "1.24"
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
    |> add_operation(:settings, fn %{deploy_repo: drepo, artifacts_repo: arepo} ->
      maybe_ai(%{
        name: "global",
        artifact_repository_id: arepo.id,
        deployer_repository_id: drepo.id,
      })
      |> maybe_observability()
      |> Settings.create()
    end)
    |> add_operation(:context, fn _ -> maybe_setup_context(bot) end)
    |> add_operation(:secret, fn _ -> ensure_secret(Console.cloud?()) end)
    |> execute()
  end

  def setup_groups(email) when is_binary(email) do
    with %User{} = user <- Users.get_user_by_email(email),
         {:ok, %Group{id: group_id}} <- Users.upsert_group("sre") do
      Users.create_group_member(%{user_id: user.id}, group_id)
    end
  end
  def setup_groups(_), do: :ok

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
    case Console.cloud?() do
      true ->
        Map.put(attrs, :ai, %{
          provider: :openai,
          enabled: true,
          openai: %{base_url: "http://ai-proxy.ai-proxy:8000/openai/v1"}
        })
      _ -> attrs
    end
  end

  defp maybe_observability(attrs) do
    with true <- Console.cloud?(),
         inst when is_binary(inst) <- Console.cloud_instance(),
         {:ok, url, pass} <- Console.es_creds(),
         {:ok, vurl, vtenant} <- Console.vmetrics_creds() do
        es_creds = %{
          host: url,
          user: "plrl-#{inst}",
          password: pass,
          index: "plrl-logs-#{inst}-*"
        }

        attrs
        |> Map.put(:logging, %{
          enabled: true,
          driver: :elastic,
          elastic: es_creds
        })
        |> Map.put(:prometheus_connection, %{
          host: "#{vurl}/select/#{vtenant}/prometheus",
          user: "plrl-#{inst}",
          password: pass
        })
        |> put_in([:ai, :vector_store], %{
          enabled: true,
          vector_store: :elastic,
          elastic: es_creds
        })
    else
      _ -> attrs
    end
  end

  defp maybe_setup_context(bot) do
    with true <- Console.cloud?(),
         inst when is_binary(inst) <- Console.cloud_instance(),
         {:ok, url, pass} <- Console.es_creds(),
         {:ok, vurl, vtenant} <- Console.vmetrics_creds() do
      Services.save_context(%{
        configuration: %{
          elastic: %{url: url, user: "plrl-#{inst}", password: pass},
          vmetrics: %{url: "#{vurl}/insert/#{vtenant}/prometheus/api/v1/write", user: "plrl-#{inst}", password: pass}
        }
      }, "plrl/cloud/observability", bot)
    else
      _ -> {:ok, %{}}
    end
  end
end
