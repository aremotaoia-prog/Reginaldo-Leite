import { Imovel, Ocupante, Ocupacao, StatusOcupacao, EstadoCivil } from '../types';
    import { generateId } from '../utils';
    
    // Seed Data emptied as requested (Clean State)
    const INITIAL_IMOVEIS: Imovel[] = [];
    
    const INITIAL_OCUPANTES: Ocupante[] = [];
    
    const INITIAL_OCUPACOES: Ocupacao[] = [];
    
    // Simple in-memory storage
    class Database {
      private imoveis: Imovel[] = INITIAL_IMOVEIS;
      private ocupantes: Ocupante[] = INITIAL_OCUPANTES;
      private ocupacoes: Ocupacao[] = INITIAL_OCUPACOES;
    
      // Imovel Methods
      getImoveis() { return [...this.imoveis]; }
      
      getImovelById(id: string) { return this.imoveis.find(i => i.id === id); }
      
      saveImovel(imovel: Imovel) {
        const existingIndex = this.imoveis.findIndex(i => i.id === imovel.id);
        
        if (existingIndex >= 0) {
          this.imoveis[existingIndex] = imovel;
        } else {
          if (!imovel.id) imovel.id = generateId();
          this.imoveis.push(imovel);
        }
        return imovel;
      }
    
      deleteImovel(id: string) {
        // Encontra o imóvel
        const imovel = this.imoveis.find(i => i.id === id);
        if (!imovel) return; // Já excluído ou não encontrado

        // REGRA DE NEGÓCIO: Bloquear apenas se o status estiver explicitamente OCUPADO
        if (imovel.statusOcupacao === StatusOcupacao.OCUPADO) {
            throw new Error("Não é possível excluir um imóvel ocupado. Por favor, encerre a ocupação na tela de detalhes primeiro.");
        }
        
        // Se estiver Desocupado, permitimos a exclusão.
        // CASCADE DELETE: Removemos quaisquer registros de ocupação vinculados (ativos ou não) para manter a integridade.
        this.ocupacoes = this.ocupacoes.filter(o => o.imovelId !== id);

        // Exclui o imóvel
        this.imoveis = this.imoveis.filter(i => i.id !== id);
      }
    
      // Ocupante Methods
      getOcupantes() { return [...this.ocupantes]; }
      
      getOcupanteById(id: string) { return this.ocupantes.find(o => o.id === id); }
      
      saveOcupante(ocupante: Ocupante) {
        const existingIndex = this.ocupantes.findIndex(o => o.id === ocupante.id);
    
        if (existingIndex >= 0) {
          this.ocupantes[existingIndex] = ocupante;
        } else {
          if (!ocupante.id) ocupante.id = generateId();
          this.ocupantes.push(ocupante);
        }
        return ocupante;
      }
    
      // Ocupacao Methods
      getOcupacoesByImovel(imovelId: string) {
        return this.ocupacoes.filter(o => o.imovelId === imovelId);
      }
    
      createOcupacao(imovelId: string, ocupanteId: string, dataInicio: string) {
        const ocupacao: Ocupacao = {
          id: generateId(),
          imovelId,
          ocupanteId,
          dataInicio,
        };
        this.ocupacoes.push(ocupacao);
        
        // Update Imovel status
        const imovel = this.getImovelById(imovelId);
        if (imovel) {
          imovel.statusOcupacao = StatusOcupacao.OCUPADO;
          this.saveImovel(imovel);
        }
        return ocupacao;
      }
    
      endOcupacao(ocupacaoId: string, dataFim: string) {
        const ocupacao = this.ocupacoes.find(o => o.id === ocupacaoId);
        if (!ocupacao) return;
        
        ocupacao.dataFim = dataFim;
        
        // Update Imovel status
        const imovel = this.getImovelById(ocupacao.imovelId);
        if (imovel) {
          imovel.statusOcupacao = StatusOcupacao.DESOCUPADO;
          this.saveImovel(imovel);
        }
      }
    }
    
    export const db = new Database();