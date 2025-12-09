import React, { useState } from 'react';
import { UploadCloud, Download, AlertTriangle, CheckCircle, FileText, XCircle } from 'lucide-react';
import { db } from '../services/db';
import { Imovel, Ocupante, StatusOcupacao, EstadoCivil, MetroQuadrado } from '../types';
import { generateId, validateCPF, formatCPF } from '../utils';

interface ImportLog {
  line: number;
  status: 'success' | 'error';
  message: string;
}

const ImportData: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ success: 0, error: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setLogs([]);
      setStats({ success: 0, error: 0 });
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'Logradouro',
      'Numero',
      'Localidade',
      'UC',
      'M2',
      'DataEntrega (AAAA-MM-DD)',
      'NomeOcupante',
      'CPF',
      'Matricula',
      'EstadoCivil',
      'Funcao',
      'Contrato'
    ];
    
    const example = [
      'Rua das Amostras',
      '100',
      'Centro',
      '1234567800',
      '75',
      '2023-01-01',
      'Fulano de Tal',
      '12345678909',
      '12345678',
      'Solteiro(a)',
      'Morador',
      'CT-2023/999'
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(';') + "\n" 
      + example.join(';');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modelo_importacao_imoveis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processFile = () => {
    if (!file) return;
    setIsProcessing(true);
    setLogs([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const newLogs: ImportLog[] = [];
      let successCount = 0;
      let errorCount = 0;

      // Pular cabeçalho
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(';'); // Assumindo CSV separado por ponto e vírgula (Excel BR padrão)

        if (cols.length < 5) {
            newLogs.push({ line: i + 1, status: 'error', message: 'Linha com colunas insuficientes.' });
            errorCount++;
            continue;
        }

        const [logradouro, numero, localidade, ucRaw, m2Raw, dataEntrega, nome, cpfRaw, matriculaRaw, estadoCivil, funcao, contrato] = cols;

        try {
            // 1. Validar Imóvel
            const uc = ucRaw?.trim();
            const m2 = parseInt(m2Raw);

            if (!uc || uc.length < 5) throw new Error("UC inválida");
            if (![75, 109, 168].includes(m2)) throw new Error(`M² inválido (${m2}). Use 75, 109 ou 168.`);

            // Checar duplicidade de UC
            const existsUC = db.getImoveis().find(img => img.unidadeConsumidora === uc);
            if (existsUC) throw new Error(`UC ${uc} já existe no sistema.`);

            // Criar Objeto Imóvel
            const novoImovel: Imovel = {
                id: generateId(),
                endereco: `${logradouro}, ${numero}`,
                localidade: localidade?.trim() || 'Geral',
                unidadeConsumidora: uc,
                metroQuadrado: m2 as MetroQuadrado,
                statusOcupacao: StatusOcupacao.DESOCUPADO,
                dataEntrega: dataEntrega?.trim() || new Date().toISOString().split('T')[0]
            };

            // 2. Processar Ocupante (se houver)
            let novoOcupante: Ocupante | null = null;
            if (nome && nome.trim().length > 0) {
                // Limpa CPF mantendo apenas números
                const cpfClean = cpfRaw ? cpfRaw.replace(/\D/g, '') : '';
                
                // Validação de CPF (Apenas se foi preenchido)
                if (cpfClean.length > 0) {
                    if (!validateCPF(cpfClean)) {
                         throw new Error(`CPF inválido para ${nome}: ${cpfRaw}`);
                    }
                    
                    // Checar duplicidade CPF (apenas se preenchido)
                    const existsCPF = db.getOcupantes().find(o => o.cpf.replace(/\D/g, '') === cpfClean);
                    if (existsCPF) throw new Error(`CPF ${formatCPF(cpfClean)} já cadastrado.`);
                }

                // Mapear Estado Civil
                let ecEnum = EstadoCivil.SOLTEIRO;
                const ecStr = estadoCivil?.toLowerCase() || '';
                if(ecStr.includes('casad')) ecEnum = EstadoCivil.CASADO;
                else if(ecStr.includes('divorci')) ecEnum = EstadoCivil.DIVORCIADO;
                else if(ecStr.includes('viuv')) ecEnum = EstadoCivil.VIUVO;
                else if(ecStr.includes('uniao') || ecStr.includes('união')) ecEnum = EstadoCivil.UNIAO_ESTAVEL;

                novoOcupante = {
                    id: generateId(),
                    nome: nome.trim(),
                    cpf: cpfClean ? formatCPF(cpfClean) : '', // Salva formatado ou vazio
                    estadoCivil: ecEnum,
                    funcao: funcao?.trim() || 'Morador',
                    matricula: matriculaRaw?.replace(/\D/g, '').substring(0, 8) || '',
                    contrato: contrato?.trim()
                };
            }

            // 3. Persistir Dados
            db.saveImovel(novoImovel);

            if (novoOcupante) {
                db.saveOcupante(novoOcupante);
                // Vincular
                db.createOcupacao(novoImovel.id, novoOcupante.id, novoImovel.dataEntrega);
                newLogs.push({ line: i + 1, status: 'success', message: `Imóvel e Ocupante (${novoOcupante.nome}) cadastrados.` });
            } else {
                newLogs.push({ line: i + 1, status: 'success', message: 'Apenas Imóvel cadastrado (Desocupado).' });
            }
            successCount++;

        } catch (err: any) {
            newLogs.push({ line: i + 1, status: 'error', message: err.message });
            errorCount++;
        }
      }

      setLogs(newLogs);
      setStats({ success: successCount, error: errorCount });
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Importação em Massa</h2>
            <p className="text-slate-500">Cadastre imóveis e ocupantes via arquivo CSV.</p>
        </div>
        <button 
            onClick={downloadTemplate}
            className="flex items-center text-emerald-600 border border-emerald-600 px-4 py-2 rounded hover:bg-emerald-50 transition-colors"
        >
            <Download size={18} className="mr-2" /> Baixar Modelo CSV
        </button>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center space-y-4">
        <UploadCloud size={48} className="text-slate-400" />
        
        {!file ? (
            <div>
                <p className="text-lg font-medium text-slate-700">Selecione o arquivo CSV</p>
                <p className="text-sm text-slate-500 mb-4">O arquivo deve usar ponto e vírgula (;) como separador.</p>
                <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-emerald-50 file:text-emerald-700
                    hover:file:bg-emerald-100 cursor-pointer"
                />
            </div>
        ) : (
            <div className="flex flex-col items-center">
                <div className="flex items-center text-slate-800 font-medium mb-4">
                    <FileText size={24} className="mr-2 text-emerald-600" />
                    {file.name}
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={processFile}
                        disabled={isProcessing}
                        className={`px-6 py-2 rounded-md text-white font-medium ${isProcessing ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                        {isProcessing ? 'Processando...' : 'Iniciar Importação'}
                    </button>
                    <button 
                        onClick={() => { setFile(null); setLogs([]); }}
                        className="px-6 py-2 rounded-md text-slate-600 bg-slate-100 hover:bg-slate-200"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        )}
      </div>

      {(logs.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700">Relatório de Processamento</h3>
                <div className="flex gap-4 text-sm">
                    <span className="flex items-center text-emerald-600 font-bold">
                        <CheckCircle size={16} className="mr-1" /> {stats.success} Sucessos
                    </span>
                    <span className="flex items-center text-red-600 font-bold">
                        <AlertTriangle size={16} className="mr-1" /> {stats.error} Erros
                    </span>
                </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-100 sticky top-0">
                        <tr>
                            <th className="px-4 py-2 font-medium text-slate-500 w-20">Linha</th>
                            <th className="px-4 py-2 font-medium text-slate-500 w-24">Status</th>
                            <th className="px-4 py-2 font-medium text-slate-500">Mensagem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {logs.map((log, idx) => (
                            <tr key={idx} className={log.status === 'error' ? 'bg-red-50' : 'hover:bg-slate-50'}>
                                <td className="px-4 py-2 text-slate-500">{log.line}</td>
                                <td className="px-4 py-2">
                                    {log.status === 'success' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            Sucesso
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                            Erro
                                        </span>
                                    )}
                                </td>
                                <td className={`px-4 py-2 ${log.status === 'error' ? 'text-red-700 font-medium' : 'text-slate-600'}`}>
                                    {log.message}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default ImportData;