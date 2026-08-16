package plrl.wb.admission

result := {
    "sample": sample,
    "deny": [d | deny[d]],
    "approve": [a | approve[a]],
}

default sample := 0.5

deny[_] if false
approve[_] if false