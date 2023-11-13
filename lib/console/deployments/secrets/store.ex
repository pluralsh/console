defmodule Console.Deployments.Secrets.Store do
  @type secrets :: %{binary => binary}
  @type secrets_resp :: {:ok, secrets} | Console.error

  @doc """
  fetch the secrets/configuration for a service revision from a store
  """
  @callback fetch(binary) :: secrets_resp

  @doc """
  persist the secrets/configuration for a service revision from a store
  """
  @callback store(binary, secrets) :: secrets_resp

  @doc """
  delete the secrets for a revision (to be called when pruning revision history)
  """
  @callback delete(binary) :: :ok | Console.error
end
