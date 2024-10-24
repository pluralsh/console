defmodule Console.AI.Fixer.Base do
  use Console.AI.Evidence.Base
  alias Console.Deployments.Tar

  @extension_blacklist ~w(.tgz .png .jpeg .jpg .gz .tar)

  def code_prompt(f) do
    with {:ok, contents} <- Tar.tar_stream(f) do
      Enum.filter(contents, fn {p, _} -> Path.extname(p) not in @extension_blacklist end)
      |> Enum.map(fn {p, content} -> {:user, Jason.encode!(%{file: p, content: content})} end)
      |> prepend({:user, "I'll list the relevant source code for you in JSON format, with the structure {\"file\": string, \"content\": string}"})
      |> ok()
    end
  end
end
