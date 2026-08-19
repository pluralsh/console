defmodule Console.AI.Tools.Workbench.Codemode do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.OutputType
  alias Console.AI.Tools.Workbench.Output
  alias Console.AI.Tool

  require EEx

  @max_output_bytes 100_000

  embedded_schema do
    field(:tools, {:array, :map}, virtual: true)
    field(:policies, {:array, :map}, virtual: true)
    field(:python, :string)
  end

  def name(_), do: "python_sandbox"
  def description(%__MODULE__{tools: tools}), do: code_mode_prompt(tools: tools || [])

  @json_schema Console.priv_file!("tools/workbench/codemode.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:python])
    |> validate_required([:python])
  end

  def implement(%__MODULE__{tools: tools, policies: policies, python: python}) do
    ExMonty.Sandbox.run(
      python,
      functions: build_funcs(tools, policies),
      mounts: mounts(),
      callback_timeout: :infinity,
      limits: %{
        # execution-time budget (always enforced)
        max_duration_secs: 60.0,
        # ~100MB memory limit (see note below)
        max_memory: 100_000_000,
        # call stack depth limit
        max_recursion_depth: 100
      }
    )
    |> case do
      {:ok, result, stdo} ->
        Output.json(
          %{result: ExMonty.Elixirable.to_elixir(result), stdout: stdo},
          "return fewer fields or summarize the result",
          @max_output_bytes
        )

      {:error, err} ->
        {:error, "Failed to execute Python code: #{inspect(err)}"}
    end
  end

  defp build_funcs(tools, policies) do
    Map.new(tools, fn tool ->
      {Tool.name(tool), fn args, kwargs -> exec_tool(arguments(args, kwargs), tool, policies) end}
    end)
  end

  defp arguments([], kwargs) when is_map(kwargs), do: {:ok, kwargs}

  defp arguments([arguments], kwargs) when is_map(arguments) and kwargs == %{},
    do: {:ok, arguments}

  defp arguments(_, _),
    do:
      {:error, :value_error, "tool arguments must be keyword arguments or a single dictionary"}

  defp exec_tool({:error, type, message}, _, _), do: {:error, type, message}

  defp exec_tool({:ok, args}, tool, policies) do
    with {:ok, impl} <- Tool.policy(tool, args, policies),
         {:ok, parsed} <- Tool.validate(impl, args),
         {:ok, res} <- Tool.implement(impl, parsed) do
      {:ok, OutputType.convert(tool, res)}
    else
      {:error, err} ->
        {:error, :value_error, "Failed to execute tool: #{Tool.name(tool)}: #{inspect(err)}"}
    end
  end

  defp mounts() do
    ExMonty.Mount.new!()
    |> ExMonty.Mount.add!("/scratch", System.tmp_dir!(), :overlay)
  end

  EEx.function_from_file(
    :defp,
    :code_mode_prompt,
    Console.priv_filename(["prompts", "workbench", "codemode.md.eex"]),
    [:assigns]
  )
end
