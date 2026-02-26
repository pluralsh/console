package kascfg

// ValidateExtra performs extra validation checks.
// Should be run after defaults have been applied.
func (x *ConfigurationFile) ValidateExtra() error {
	if x.GetAgent().GetRedisConnInfoRefresh().AsDuration() >= x.GetAgent().GetRedisConnInfoTtl().AsDuration() {
		return AgentCFValidationError{
			field:  "RedisConnInfoRefresh",
			reason: "must be smaller than RedisConnInfoTtl",
		}
	}
	return nil
}
