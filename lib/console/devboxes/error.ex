defmodule Console.Devboxes.Error do
  @moduledoc """
  Typed devbox errors.  GraphQL surfaces them with an `extensions.code`, so the UI can hide unsupported thread actions
  and fall back to the index when a cluster is offline.
  """

  @type t :: %{message: binary, extensions: %{code: binary}}

  @spec unsupported(binary) :: {:error, t}
  def unsupported(msg), do: error("UNSUPPORTED", msg)

  @spec cluster_offline() :: {:error, t}
  def cluster_offline(), do: error("CLUSTER_OFFLINE", "the devbox's cluster is unreachable, so this can't be done right now")

  @spec suspended() :: {:error, t}
  def suspended(), do: error("INSTANCE_SUSPENDED", "the devbox is suspended; resume it to do this")

  @doc """
  Maps a `Console.Devboxes.Control` failure to a typed error.
  """
  @spec control(term) :: {:error, term}
  def control({:error, :not_connected}), do: cluster_offline()
  def control({:error, :unavailable}), do: cluster_offline()
  def control({:error, :suspended}), do: suspended()
  def control({:error, :unsupported}), do: unsupported("the agent doesn't support this operation")
  def control({:error, {:unsupported, msg}}) when is_binary(msg), do: unsupported(msg)
  def control({:error, _} = err), do: err

  @doc """
  Passes a successful `Console.Devboxes.Control` result through (`:ok` becomes `{:ok, %{}}`), typing failures.
  """
  @spec control_ok(term) :: {:ok, term} | {:error, term}
  def control_ok(:ok), do: {:ok, %{}}
  def control_ok({:ok, _} = ok), do: ok
  def control_ok(err), do: control(err)

  defp error(code, msg), do: {:error, %{message: msg, extensions: %{code: code}}}
end
