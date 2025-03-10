export function getTrackValue(scorecard, name) {
    return scorecard[name]
}

export function getGateInScorecard(scorecard, gateType) {
    return scorecard.gatescore_set.find((gate) => {
        return gate.gate_type === gateType
    })
}

export function getGateValue(scorecard, gateType, name) {
    const gate = getGateInScorecard(scorecard, gateType)
    if (gate) {
        return gate[name]
    }
    return null
}
