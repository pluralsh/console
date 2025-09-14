defmodule Console.AI.Proxy do
  @type backend :: :openai | :anthropic | :azure_openai
  @type t :: %__MODULE__{backend: backend, url: String.t(), token: String.t(), params: map}
  defstruct [:backend, :url, :token, :params]
end
