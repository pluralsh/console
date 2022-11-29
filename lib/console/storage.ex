defmodule Console.Storage do

  @type result :: :ok | {:error, term}

  @callback doctor() :: result

  @callback init() :: result

  @callback pull() :: result

  @callback push() :: result

  @callback reset() :: result

  @callback revise(binary) :: result

  @callback revision() :: {:ok, binary} | {:error, term}
end
