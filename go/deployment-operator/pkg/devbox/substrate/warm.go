package substrate

import "strings"

// WarmActorPrefix names the throwaway actors the devbox gateway boots so a new node pulls a template's image before
// an instance resumes there. They live for one boot, so worker autoscaling doesn't count them as instances.
const WarmActorPrefix = "warm-"

func IsWarmActor(name string) bool { return strings.HasPrefix(name, WarmActorPrefix) }
