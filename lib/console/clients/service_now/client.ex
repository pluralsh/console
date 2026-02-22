defmodule Console.ServiceNow.Client do
  @moduledoc """
  Client for the ServiceNow [Change Management API](https://www.servicenow.com/docs/r/api-reference/rest-apis/change-management-api.html).

  Uses `/api/sn_chg_rest/v1/change`. Responses use the full change schema where each
  field is `{ "display_value": "...", "value": ... }`; the client returns a typed
  `Change` struct with the `.value` extracted for each field.

  Authentication is HTTP Basic (username/password). Base URL is the instance URL
  (e.g. `https://instance.service-now.com`) without a trailing slash.
  """
  alias Console.ServiceNow.Change

  @change_base_path "/api/sn_chg_rest/v1/change"
  @accept "application/json"
  @content_type "application/json"

  defstruct [:url, :username, :password]

  @type t :: %__MODULE__{
          url: String.t(),
          username: String.t(),
          password: String.t()
        }

  @doc """
  Builds a new client from url, username, and password (basic auth).
  """
  @spec new(String.t(), String.t(), String.t()) :: t()
  def new(url, username, password) when is_binary(url) and is_binary(username) and is_binary(password) do
    %__MODULE__{
      url: String.trim_trailing(url, "/"),
      username: username,
      password: password
    }
  end

  @doc """
  Fetches a single change by sys_id. `GET /api/sn_chg_rest/v1/change/{sys_id}`
  """
  @spec get_change(t(), String.t()) :: {:ok, Change.t()} | {:error, term()}
  def get_change(%__MODULE__{} = client, sys_id) when is_binary(sys_id) do
    client
    |> req_client()
    |> Req.get(url: "#{@change_base_path}/#{URI.encode(sys_id)}")
    |> handle_result()
  end

  @doc """
  Creates a change. `POST /api/sn_chg_rest/v1/change`
  Options: `:chg_model`, `:type` (query params).
  """
  @spec create_change(t(), map(), keyword()) :: {:ok, Change.t()} | {:error, term()}
  def create_change(%__MODULE__{} = client, attrs, opts \\ []) when is_map(attrs) do
    path = if length(opts) > 0,
      do: "#{@change_base_path}?#{URI.encode_query(opts)}",
      else: @change_base_path

    client
    |> req_client()
    |> Req.post(url: path, json: attrs)
    |> handle_result()
  end

  @doc """
  Updates an existing change by sys_id. `PUT /api/sn_chg_rest/v1/change/{sys_id}`
  """
  @spec update_change(t(), String.t(), map()) :: {:ok, Change.t()} | {:error, term()}
  def update_change(%__MODULE__{} = client, sys_id, attrs)
      when is_binary(sys_id) and is_map(attrs) do
    client
    |> req_client()
    |> Req.patch(url: "#{@change_base_path}/#{URI.encode(sys_id)}", json: attrs)
    |> handle_result()
  end

  defp req_client(%__MODULE__{username: user, password: pass, url: base_url}) do
    Req.new(base_url: base_url)
    |> Req.Request.put_header("accept", @accept)
    |> Req.Request.put_header("content-type", @content_type)
    |> Req.merge(auth: {:basic, "#{user}:#{pass}"})
  end

  defp handle_result({:ok, %Req.Response{status: status, body: body}})
       when status in 200..299, do: parse_result(body)
  defp handle_result({:ok, %Req.Response{status: 404, body: body}}),
    do: {:error, {:not_found, body}}
  defp handle_result({:ok, %Req.Response{status: status, body: body}}),
    do: {:error, {:servicenow, status, body}}
  defp handle_result({:error, _} = err), do: err

  defp parse_result(%{"result" => %{} = result}), do: {:ok, Change.from_result(result)}
  defp parse_result(%{"result" => [first | _]}), do: {:ok, Change.from_result(first)}
  defp parse_result(%{"result" => nil}), do: {:error, {:invalid_response, :empty_result}}
  defp parse_result(other), do: {:error, {:invalid_response, other}}
end
