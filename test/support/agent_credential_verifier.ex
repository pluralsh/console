defmodule Console.Devboxes.AgentCredentials.Verifier.Test do
  @moduledoc """
  The test verifier: rejects secrets containing `rejected`, and otherwise reports a fixed profile.
  """
  @behaviour Console.Devboxes.AgentCredentials.Verifier

  @impl true
  def verify(kind, secret, meta) do
    case String.contains?(secret, "rejected") do
      true -> {:error, "the vendor rejected this credential (401)"}
      false -> {:ok, Map.merge(meta, %{"email" => "someone@example.com", "verified_kind" => to_string(kind)})}
    end
  end
end
