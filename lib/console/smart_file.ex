defmodule Console.SmartFile do
  @type t :: %__MODULE__{path: binary, file: pid}
  @type eligible :: t | binary | pid

  defstruct [:path, :file, :raw]

  def new(%__MODULE__{} = f), do: f
  def new(path) when is_binary(path), do: %__MODULE__{path: path}
  def new(f) when is_pid(f), do: %__MODULE__{file: f}
  def new({:file_descriptor, :prim_file, _} = raw), do: %__MODULE__{raw: raw}

  def convert(%__MODULE__{path: p}) when is_binary(p), do: File.open(p, [:raw])
  def convert(%__MODULE__{file: f}) when is_pid(f), do: {:ok, f}
  def convert(%__MODULE__{raw: {:file_descriptor, :prim_file, _} = raw}), do: {:ok, raw}

  @spec close(eligible) :: term | Console.error
  def close(t) do
    new(t)
    |> maybe_close()
  end

  defp maybe_close(%__MODULE__{path: p}) when is_binary(p), do: :ok
  defp maybe_close(%__MODULE__{} = sf) do
    with {:ok, f} <- convert(sf),
      do: File.close(f)
  end
end
