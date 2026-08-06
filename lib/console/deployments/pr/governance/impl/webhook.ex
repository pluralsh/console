defmodule Console.Deployments.Pr.Governance.Impl.Webhook do
  @moduledoc """
  A provider for the pr governance controller
  """
  import Console.Deployments.Pr.Governance.Impl.Base
  @behaviour Console.Deployments.Pr.Governance.Provider
  alias Console.Schema.PrGovernance

  @headers [{"Content-Type", "application/json"}]

  def open(governance, pr) do
    make_request(governance, "/v1/open", Jason.encode!(%{
      pr: body(pr)
    }))
  end

  def confirm(governance, pr) do
    make_request(governance, "/v1/confirm", Jason.encode!(%{
      pr: body(pr),
      state: pr.governance_state
    }))
  end

  def close(governance, pr) do
    make_request(governance, "/v1/close", Jason.encode!(%{
      pr: body(pr),
      state: pr.governance_state
    }))
  end

  defp make_request(%PrGovernance{configuration: %{webhook: %{url: url}}}, path, body) do
    Path.join(url, path)
    |> Req.post(headers: @headers, body: body, decode_body: false, retry: false)
    |> case do
      {:ok, %Req.Response{status: code, body: body}} when code in 200..299 ->
        Jason.decode(body)
      {:ok, %Req.Response{body: body}} -> {:error, body}
      {:error, %Req.TransportError{reason: reason}} -> {:error, reason}
      {:error, error} -> {:error, error}
    end
  end
end
