defmodule Console.AI.Fixer.Base do
  use Console.AI.Evidence.Base
  alias Console.Deployments.Tar

  @extension_blacklist ~w(.tgz .png .jpeg .jpg .gz .tar)

  @format ~s({"file": string, "content": string})
  @preface "I'll list the relevant source code for you in JSON format, with the structure #{@format}"

  def file_fmt(), do: @format

  def code_prompt(f, preface \\ @preface) do
    with {:ok, contents} <- Tar.tar_stream(f) do
      Enum.filter(contents, fn {p, _} -> Path.extname(p) not in @extension_blacklist end)
      |> Enum.map(fn {p, content} -> {:user, Jason.encode!(%{file: p, content: content})} end)
      |> prepend({:user, preface})
      |> ok()
    end
  end
end
