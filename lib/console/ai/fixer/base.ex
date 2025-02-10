defmodule Console.AI.Fixer.Base do
  use Console.AI.Evidence.Base
  alias Console.Deployments.Tar
  alias Console.Schema.Service

  @extension_blacklist ~w(.tgz .png .jpeg .jpg .gz .tar .zip .tar.gz)

  @format ~s({"file": string, "content": string})
  @preface "I'll list the relevant source code for you in JSON format, with the structure #{@format}"

  @too_large 100_000

  @encode_key {__MODULE__, :noencode}

  def raw(), do: Process.put(@encode_key, true)

  def raw?(), do: !!Process.get(@encode_key)

  def file_fmt(), do: @format

  def folder(%Service{git: %Service.Git{folder: folder}}) when is_binary(folder), do: folder
  def folder(_), do: ""

  def svc_code_prompt(f, %Service{helm: %Service.Helm{}} = svc) do
    subfolder = folder(svc)
    with {:ok, contents} <- Tar.tar_stream(f) do
      prompt = Enum.filter(contents, & !blacklist(elem(&1, 0)))
              |> Enum.map(fn {p, content} -> {:user, maybe_encode(%{file: Path.join(subfolder, p), content: content})} end)
              |> prepend({:user, @preface})

      case prompt_size(prompt) do
        v when v < @too_large -> {:ok, prompt}
        _ -> {:ok, values_files(contents, svc)}
      end
    end
  end
  def svc_code_prompt(f, svc), do: code_prompt(f, folder(svc))

  def code_prompt(f, subfolder, preface \\ @preface) do
    with {:ok, contents} <- Tar.tar_stream(f) do
      Enum.filter(contents, & !blacklist(elem(&1, 0)))
      |> Enum.map(fn {p, content} -> {:user, maybe_encode(%{file: Path.join(subfolder, p), content: content})} end)
      |> prepend({:user, preface})
      |> ok()
    end
  end

  def prompt_size(prompt) do
    Enum.reduce(prompt, 0, fn
      {_, %{} = m}, acc -> acc + byte_size(Jason.encode!(m))
      {_, txt}, acc when is_binary(txt) -> acc + byte_size(txt)
    end)
  end

  defp values_files(contents, %Service{helm: %Service.Helm{values_files: fs} = helm} = svc) do
    subfolder  = folder(svc)
    keep_files = ["values.yaml" | (fs || [])]

    Enum.filter(contents, fn {p, _} -> p in keep_files end)
    |> Enum.map(fn {p, content} -> {:user, maybe_encode(%{file: Path.join(subfolder, p), content: content})} end)
    |> maybe_add_values(helm)
    |> prepend({:user, """
    This is a relatively complex helm chart, so instead I will list just the base `values.yaml` file used to configure it
    and any values file overrides or direct overrides used to configure this service. You should NEVER need to update the
    base `values.yaml` file, instead focus on changes to values overrides as needed.

    If there is no value file present, simply add the customized values as the `spec.helm.values` field, which supports any
    unstructured map type, of the associated ServiceDeployment kubernetes custom resource for this service.
    """})
    |> prepend({:user, @preface})
  end

  defp maybe_add_values(contents, %Service.Helm{values: values}) do
    append(contents, {:user, """
      The service also includes the following values overrides configured directly in the Plural ServiceDeployment:

      ```
      #{values}
      ```
    """})
  end
  defp maybe_add_values(contents, _), do: contents

  defp maybe_encode(map) do
    case raw?() do
      true -> map
      _ -> Jason.encode!(map)
    end
  end

  defp blacklist(filename) do
    cond do
      String.ends_with?(filename, "values.yaml.static") -> true
      Path.extname(filename) in @extension_blacklist -> true
      true -> false
    end
  end
end
