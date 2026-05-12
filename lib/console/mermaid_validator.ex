defmodule Console.MermaidValidator do
  use Rustler, otp_app: :console, crate: :console_mermaidvalidator

  @spec validate(binary()) :: :ok | {:error, binary()}
  def validate(_input), do: :erlang.nif_error(:nif_not_loaded)
end
