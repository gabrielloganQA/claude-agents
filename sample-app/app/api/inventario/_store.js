const g = globalThis;
g.__claudeInventarioStore ||= { inventarios: [], nextId: 1 };
const store = g.__claudeInventarioStore;

export const ALMOXARIFADOS = [
  { id: "matriz", nome: "Matriz" },
  { id: "filial-sp", nome: "Filial SP" },
  { id: "filial-rj", nome: "Filial RJ" },
];

export const DEPOSITOS = [
  { id: "mtz-01", nome: "Mtz-01", almoxarifadoId: "matriz" },
  { id: "mtz-02", nome: "Mtz-02", almoxarifadoId: "matriz" },
  { id: "sp-01", nome: "SP-01", almoxarifadoId: "filial-sp" },
  { id: "sp-02", nome: "SP-02", almoxarifadoId: "filial-sp" },
  { id: "rj-01", nome: "RJ-01", almoxarifadoId: "filial-rj" },
];

export const TIPOS = ["Geral", "Específico", "Cíclico"];

export function listInventarios() {
  return store.inventarios;
}

export function createInventario(data) {
  const inv = { id: store.nextId++, ...data, createdAt: new Date().toISOString() };
  store.inventarios.push(inv);
  return inv;
}

export function _resetForTests() {
  store.inventarios = [];
  store.nextId = 1;
}
