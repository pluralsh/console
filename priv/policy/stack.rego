package plrl.stack

result := {
    "sample": sample,
    "deny": [d | deny[d]],
    "defer": defer,
    "approve": [a | approve[a]],
}

default sample := 0.5
default defer := false

deny[_] if false
approve[_] if false