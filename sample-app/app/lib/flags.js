const DEFAULTS = {
  "nova-tela-confirmacao": false,
  "upload-xml-habilitado": true,
};

const g = globalThis;
g.__claudeAgentsFlags ||= { ...DEFAULTS };

export function getFlag(name) {
  return g.__claudeAgentsFlags[name];
}

export function setFlag(name, value) {
  g.__claudeAgentsFlags[name] = value;
}

export function listFlags() {
  return { ...g.__claudeAgentsFlags };
}

export function resetFlags() {
  g.__claudeAgentsFlags = { ...DEFAULTS };
}
