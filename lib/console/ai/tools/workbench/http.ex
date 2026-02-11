defmodule Console.AI.Tools.Workbench.Http do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchTool}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.HttpConfiguration}

  embedded_schema do
    field :tool,  :map, virtual: true
    field :input, :map
  end

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "http_integration_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{
    name: name,
    configuration: %Configuration{http: %HttpConfiguration{method: method, url: url}}
    }
  }), do: "The #{name} HTTP integration tool, which makes a #{method} request to #{url} with the given input."

  def json_schema(%__MODULE__{tool: %WorkbenchTool{
    configuration: %Configuration{http: %HttpConfiguration{input_schema: %{} = input_schema}}
  }}), do: input_schema


  def changeset(%__MODULE__{tool: %WorkbenchTool{configuration: %{http: %{input_schema: %{} = schema}}}} = model, attrs) do
    model
    |> cast(attrs, [:input])
    |> validate_required([:input])
    |> validate_change(:input, fn :input, input ->
      ExJsonSchema.Schema.resolve(schema)
      |> ExJsonSchema.Validator.validate(input)
      |> case do
        :ok -> []
        {:error, errors} -> [input: "is not a valid input: #{inspect(errors)}"]
      end
    end)
  end

  def implement(_, %__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{http: http}}, input: input}) do
    with {:body, {:ok, body}} <- {:body, body(http, input)},
         {:request, {:ok, %HTTPoison.Response{body: body, status_code: code}}} <- {:request, do_request(http, body)} do
      {:ok, "http response: #{body} (status #{code})"}
    else
      {:body, {:error, error}} -> {:error, "could not render request body: #{inspect(error)}"}
      {:request, {:error, %HTTPoison.Error{reason: reason}}} -> {:error, "HTTP error: #{inspect(reason)}"}
    end
  end

  defp do_request(%HttpConfiguration{method: method, url: url} = config, body) do
    HTTPoison.request(method, url, body, headers(config), [timeout: 10_000, recv_timeout: 10_000])
  end

  defp headers(%HttpConfiguration{headers: [_ | _] = headers}), do: Enum.map(headers, &{&1.name, &1.value})
  defp headers(_), do: []

  defp body(%HttpConfiguration{body: body}, input) when is_binary(body), do: render_solid_raw(body, input)
  defp body(_, _), do: {:ok, ""}

  @solid_opts [strict_variables: true, strict_filters: true]

  defp render_solid_raw(template, ctx) do
    with {:parse, {:ok, tpl}} <- {:parse, Solid.parse(template)},
         {:render, {:ok, res, _}} <- {:render, Solid.render(tpl, %{"input" => ctx}, @solid_opts)} do
      {:ok, IO.iodata_to_binary(res)}
    else
      {:parse, {:error, %Solid.TemplateError{} = err}} -> {:error, Solid.TemplateError.message(err)}
      {:render, {:error, errs, _}} -> {:error, Enum.map(errs, &inspect/1) |> Enum.join(", ")}
    end
  end
end
