defmodule Console.AI.Tools.Agent.Base do
  @moduledoc false
  import Ecto.Changeset
  alias Console.AI.Tool
  alias Console.Repo
  alias Console.Schema.{AgentSession, CloudConnection, CloudConnection.Configuration}
  alias Cloudquery.{Connection, GcpCredentials, AwsCredentials, AzureCredentials}

  defmacro __using__(_) do
    quote do
      use Ecto.Schema
      import Ecto.Changeset
      import Console.AI.Tools.Utils
      import Console.AI.Tools.Agent.Base
      alias Console.Deployments.Policies
      alias Console.AI.Tool
      alias Console.AI.Tool.Context
      alias CloudQuery.Client
      alias Cloudquery.CloudQuery.Stub
      alias Console.Schema.{AgentSession, CloudConnection}
    end
  end

  def check_uuid(cs, field) do
    with v when is_binary(v) <- get_change(cs, field),
         {{:ok, _}, _v} <- {Ecto.UUID.cast(v), v} do
      cs
    else
      {:error, value} -> add_error(cs, field, "is not a valid UUID, got #{value}")
      _ -> cs
    end
  end

  def session() do
    case Tool.session() do
      %AgentSession{} = session -> {:session, session}
      _ -> {:error, "this chat is not associated with an agent session"}
    end
  end

  @preloads [:cluster, :connection]

  def update_session(attrs, preload \\ false) do
    with {:session, %AgentSession{} = session} <- session(),
         {:ok, session} <- AgentSession.changeset(session, attrs) |> Repo.update(),
         _ <- Tool.upsert(%{session: maybe_preload(session, preload)}) do
      {:ok, session}
    else
      {:error, err} ->
        {:error, "failed to update session, reason: #{inspect(err)}"}
    end
  end

  defp maybe_preload(session, true), do: Repo.preload(session, @preloads, force: true)
  defp maybe_preload(session, _), do: session

  def to_pb(%CloudConnection{provider: :aws} = connection) do
    %Connection{
      provider:    "#{connection.provider}",
      credentials: {:aws, to_pb(connection.configuration.aws)},
    }
  end

  def to_pb(%CloudConnection{provider: :gcp} = connection) do
    %Connection{
      provider:    "#{connection.provider}",
      credentials: {:gcp, to_pb(connection.configuration.gcp)},
    }
  end

  def to_pb(%CloudConnection{provider: :azure} = connection) do
    %Connection{
      provider:    "#{connection.provider}",
      credentials: {:azure, to_pb(connection.configuration.azure)},
    }
  end

  def to_pb(%Configuration.Aws{} = aws) do
    %AwsCredentials{
      access_key_id:     aws.access_key_id,
      secret_access_key: aws.secret_access_key
    }
  end

  def to_pb(%Configuration.Gcp{} = gcp) do
    %GcpCredentials{
      service_account_json_b64: Base.encode64(gcp.service_account_key),
    }
  end

  def to_pb(%Configuration.Azure{} = azure) do
    %AzureCredentials{
      subscription_id: azure.subscription_id,
      tenant_id:       azure.tenant_id,
      client_id:       azure.client_id,
      client_secret:   azure.client_secret
    }
  end

  def to_pb(_), do: nil
end
