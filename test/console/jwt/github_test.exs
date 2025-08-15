defmodule Console.Jwt.GithubTest do
  use Console.DataCase, async: true
  alias Console.Jwt.Github

  describe "#app_token" do
    @tag :skip
    test "it can fetch a valid github app token with installation credentials" do
      {:ok, res} = Github.app_token(nil, "916369", "51867501", System.get_env("GH_APP_PEM"), [])

      IO.inspect(res)
    end
  end
end
