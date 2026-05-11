healthStatus = {
    status = "Unknown"
}
if Obj.status ~= nil then
    local ready = "Ready"
    if statusConditionExists(Obj.status, ready) then
        healthStatus = {
            status="Progressing"
        }
        if isStatusConditionTrue(Obj.status, ready) then
            healthStatus = {
                status="Healthy"
            }
        end
    end
end