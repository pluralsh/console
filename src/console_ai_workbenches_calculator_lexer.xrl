Definitions.
DIGIT = [0-9]
INT = {DIGIT}+
FRACTION = {DIGIT}+\.[0-9]+
EXP = ([eE][+-]?{DIGIT}+)
WHITESPACE = [\s\t\n\r]+

Rules.
{WHITESPACE} : skip_token.
\+ : {token, {plus, TokenLine}}.
\- : {token, {minus, TokenLine}}.
\* : {token, {times, TokenLine}}.
\^ : {token, {pow, TokenLine}}.
\/ : {token, {divide, TokenLine}}.
\( : {token, {lparen, TokenLine}}.
\) : {token, {rparen, TokenLine}}.
{FRACTION}{EXP}? : {token, {number, TokenLine, to_float(TokenChars)}}.
{INT}{EXP} : {token, {number, TokenLine, to_float(TokenChars)}}.
{INT} : {token, {number, TokenLine, to_float(TokenChars)}}.

Erlang code.
-spec to_float(string()) -> float().
to_float(TokenChars) ->
  case 'Elixir.Float':parse(list_to_binary(TokenChars)) of
    {Float, <<>>} ->
      Float;
    _ ->
      erlang:error(badarg)
  end.
