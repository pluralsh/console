Nonterminals expression term unary power primary.
Terminals number plus minus times divide pow lparen rparen.
Rootsymbol expression.

expression -> expression plus term : {op, '+', '$1', '$3'}.
expression -> expression minus term : {op, '-', '$1', '$3'}.
expression -> term : '$1'.

term -> term times unary : {op, '*', '$1', '$3'}.
term -> term divide unary : {op, '/', '$1', '$3'}.
term -> unary : '$1'.

unary -> minus unary : {neg, '$2'}.
unary -> plus unary : '$2'.
unary -> power : '$1'.

power -> primary pow power : {op, '^', '$1', '$3'}.
power -> primary : '$1'.

primary -> number : {number, token_value('$1')}.
primary -> lparen expression rparen : '$2'.

Erlang code.
-spec token_value(tuple()) -> float().
token_value({_Token, _Line, Value}) -> Value.
