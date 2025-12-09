export enum StatusOcupacao {
  OCUPADO = 'Ocupado',
  DESOCUPADO = 'Desocupado'
}

export enum EstadoCivil {
  SOLTEIRO = 'Solteiro(a)',
  CASADO = 'Casado(a)',
  DIVORCIADO = 'Divorciado(a)',
  VIUVO = 'Viúvo(a)',
  UNIAO_ESTAVEL = 'União Estável'
}

export type MetroQuadrado = 75 | 109 | 168;

export interface Imovel {
  id: string;
  endereco: string;
  localidade: string;
  unidadeConsumidora: string;
  metroQuadrado: MetroQuadrado;
  statusOcupacao: StatusOcupacao;
  dataEntrega: string; // ISO Date YYYY-MM-DD
  dataUltimaReforma?: string; // ISO Date YYYY-MM-DD
  custoUltimaReforma?: number;
  descontoFolha?: number; // Novo campo para desconto em folha
  imagemUrl?: string; // URL da foto do prédio
  coords?: { x: number; y: number }; // Coordenadas simuladas para o mapa (0-100%)
}

export interface Ocupante {
  id: string;
  nome: string;
  cpf: string;
  estadoCivil: EstadoCivil;
  funcao: string;
  matricula?: string; // Campo novo para matrícula (8 dígitos)
  contrato?: string; // Novo campo para número do contrato
}

export interface Ocupacao {
  id: string;
  imovelId: string;
  ocupanteId: string;
  dataInicio: string; // ISO Date YYYY-MM-DD
  dataFim?: string; // ISO Date YYYY-MM-DD
}

// Helper types for View management
export type ViewState = 
  | 'DASHBOARD' 
  | 'LISTA_IMOVEIS' 
  | 'FORM_IMOVEL' 
  | 'LISTA_OCUPANTES' 
  | 'FORM_OCUPANTE'
  | 'DETALHE_IMOVEL'
  | 'IMPORTAR_DADOS';

export interface AppState {
  currentView: ViewState;
  selectedId?: string; // For Edit/Details
}