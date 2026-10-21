// Every attack gets a new id so a hitbox only hits each target once per swing.
let next = 1;
export function newAttackId() { return next++; }
