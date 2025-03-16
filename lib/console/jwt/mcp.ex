defmodule Console.Jwt.MCP do
  use Joken.Config
  alias Console.Repo
  alias Console.Schema.{User, JWK}
  use Nebulex.Caching

  @alg "ES256"

  @cache_adapter Console.conf(:cache_adapter)
  @ttl :timer.minutes(30)

  @decorate cacheable(cache: @cache_adapter, key: :jwks, opts: [ttl: @ttl])
  def jwks() do
    Repo.all(JWK)
    |> Enum.map(&JWK.public/1)
    |> Enum.map(&Map.put(&1, "alg", @alg))
  end

  @doc """
  Generates a conformant JWT for a user
  """
  @spec mint(User.t) :: {:ok, binary} | Console.error
  def mint(%User{roles: roles} = user) do
    %{groups: groups} = Repo.preload(user, [:groups])

    generate_and_sign(%{
      "sub" => user.email,
      "admin" => !!Map.get(roles || %{}, :admin),
      "groups" => Enum.map(groups, & &1.name)
    }, signer())
  end

  def exchange(jwt), do: verify_and_validate(jwt, signer())

  def signer() do
    jws = JWK.limit(1)
          |> Repo.one()
          |> JWK.jwks()
    Joken.Signer.create(@alg, jws)
  end
end
