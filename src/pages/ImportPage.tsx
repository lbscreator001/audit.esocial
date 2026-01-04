import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { parseS1200, detectEventType, isEventSupported, getEventDescription } from '../lib/xmlParser';
import { isZipFile, extractXmlsFromZip, validateZipSize, type ExtractedFile } from '../lib/zipExtractor';
import { routeEsocialEvent } from '../lib/xmlRouter';
import { parseCompleteEvent } from '../lib/eSocialEventoParser';
import { getPreviousMonth, compareDates } from '../lib/dateUtils';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  Trash2,
  AlertCircle,
  Archive,
  FileWarning
} from 'lucide-react';
import type { Importacao } from '../types/database';

interface ImportResult {
  success: boolean;
  message: string;
  records: number;
  eventType?: string;
  destino_sql?: string;
  xml_id?: string;
  warnings?: string[];
}

interface UnsupportedFile {
  fileName: string;
  filePath?: string;
  eventType: string;
  eventDescription: string;
}

interface ProcessingState {
  phase: 'idle' | 'extracting' | 'processing';
  currentFile?: string;
  extractedCount?: number;
  totalCount?: number;
  processedCount?: number;
}

const MAX_ZIP_SIZE_MB = 500;

export function ImportPage() {
  const { empresa } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>({ phase: 'idle' });
  const [results, setResults] = useState<ImportResult[]>([]);
  const [unsupportedFiles, setUnsupportedFiles] = useState<UnsupportedFile[]>([]);
  const [importacoes, setImportacoes] = useState<Importacao[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showUnsupported, setShowUnsupported] = useState(false);

  useEffect(() => {
    if (empresa) {
      loadImportacoes();
    }
  }, [empresa]);

  async function loadImportacoes() {
    if (!empresa) return;

    const { data } = await supabase
      .from('importacoes')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('created_at', { ascending: false })
      .limit(20);

    setImportacoes(data || []);
  }

  async function clearAllData() {
    if (!empresa) return;

    setClearing(true);

    try {
      await supabase.from('divergencias').delete().eq('empresa_id', empresa.id);

      await supabase.from('itens_remuneracao').delete().in(
        'remuneracao_id',
        (await supabase.from('remuneracoes').select('id').eq('empresa_id', empresa.id)).data?.map(r => r.id) || []
      );

      await supabase.from('remuneracoes').delete().eq('empresa_id', empresa.id);

      await supabase.from('apuracoes').delete().eq('empresa_id', empresa.id);

      await supabase.from('colaboradores').delete().eq('empresa_id', empresa.id);

      await supabase.from('rubricas').delete().eq('empresa_id', empresa.id);

      await supabase.from('importacoes').delete().eq('empresa_id', empresa.id);

      setImportacoes([]);
      setResults([]);
      setUnsupportedFiles([]);
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing data:', error);
    } finally {
      setClearing(false);
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.name.endsWith('.xml') || file.name.endsWith('.zip')
    );

    if (files.length > 0) {
      processFiles(files);
    }
  }, [empresa]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    e.target.value = '';
  }, [empresa]);

  async function processFiles(files: File[]) {
    if (!empresa) return;

    setProcessingState({ phase: 'extracting' });
    setResults([]);
    setUnsupportedFiles([]);

    const allXmlFiles: { file?: File; extracted?: ExtractedFile; zipFileName?: string }[] = [];

    for (const file of files) {
      if (isZipFile(file)) {
        const sizeValidation = validateZipSize(file);
        if (!sizeValidation.valid) {
          setResults(prev => [...prev, {
            success: false,
            message: sizeValidation.error || `${file.name}: Arquivo muito grande`,
            records: 0
          }]);
          continue;
        }

        try {
          const { xmlFiles } = await extractXmlsFromZip(file, (extracted, total) => {
            setProcessingState({
              phase: 'extracting',
              currentFile: file.name,
              extractedCount: extracted,
              totalCount: total
            });
          });

          for (const extracted of xmlFiles) {
            allXmlFiles.push({ extracted, zipFileName: file.name });
          }
        } catch (error) {
          setResults(prev => [...prev, {
            success: false,
            message: `${file.name}: ${error instanceof Error ? error.message : 'Erro ao extrair ZIP'}`,
            records: 0
          }]);
        }
      } else {
        allXmlFiles.push({ file });
      }
    }

    if (allXmlFiles.length === 0) {
      setProcessingState({ phase: 'idle' });
      return;
    }

    setProcessingState({
      phase: 'processing',
      processedCount: 0,
      totalCount: allXmlFiles.length
    });

    const newResults: ImportResult[] = [];
    const newUnsupported: UnsupportedFile[] = [];

    for (let i = 0; i < allXmlFiles.length; i++) {
      const item = allXmlFiles[i];
      const fileName = item.file?.name || item.extracted?.fileName || 'unknown';
      const filePath = item.extracted?.filePath;

      setProcessingState(prev => ({
        ...prev,
        currentFile: fileName,
        processedCount: i + 1
      }));

      try {
        const content = item.file ? await item.file.text() : item.extracted?.content || '';

        const routingResult = await routeEsocialEvent(content);

        if (!routingResult.sucesso) {
          const eventType = detectEventType(content);
          if (!isEventSupported(eventType)) {
            newUnsupported.push({
              fileName,
              filePath,
              eventType,
              eventDescription: getEventDescription(eventType)
            });
          } else {
            newResults.push({
              success: false,
              message: `${fileName}: ${routingResult.erro || 'Erro no roteamento'}`,
              records: 0,
            });
          }
          continue;
        }

        if (routingResult.evento_esocial === 'S-1010') {
          const result = await processEvtS1010(fileName, content, item.zipFileName, filePath, routingResult.destino_sql!);
          newResults.push({ ...result, eventType: 'S-1010', destino_sql: routingResult.destino_sql });
        } else if (routingResult.evento_esocial === 'S-1200') {
          const result = await processS1200(fileName, content, item.zipFileName, filePath);
          newResults.push({ ...result, eventType: 'S-1200' });
        } else {
          newUnsupported.push({
            fileName,
            filePath,
            eventType: routingResult.evento_esocial || 'UNKNOWN',
            eventDescription: `Evento ${routingResult.evento_esocial} não implementado`
          });
        }
      } catch (error) {
        newResults.push({
          success: false,
          message: `${fileName}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          records: 0,
        });
      }
    }

    setResults(newResults);
    setUnsupportedFiles(newUnsupported);
    setProcessingState({ phase: 'idle' });
    loadImportacoes();
  }

  async function processEvtS1010(
    fileName: string,
    content: string,
    zipFileName?: string,
    pathInZip?: string,
    destinoSql?: string
  ): Promise<ImportResult> {
    if (!empresa) {
      return { success: false, message: 'Empresa não configurada', records: 0 };
    }

    const { user } = await supabase.auth.getUser();
    const usuarioId = user?.id || null;

    const parsedData = parseCompleteEvent(content, 'S-1010', empresa.id, usuarioId);

    if (!parsedData) {
      return { success: false, message: `${fileName}: Erro ao processar XML`, records: 0 };
    }

    const { data: importacao } = await supabase
      .from('importacoes')
      .insert({
        empresa_id: empresa.id,
        tipo_evento: 'S-1010',
        nome_arquivo: fileName,
        status: 'processing',
        arquivo_origem_zip: zipFileName || null,
        caminho_no_zip: pathInZip || null,
        tabela_destino: destinoSql || 'evt_s1010',
      })
      .select()
      .single();

    const warnings: string[] = [];
    let error: any = null;

    try {
      const isInclusao = parsedData.rub_operation_type === 'inclusão';

      if (isInclusao) {
        const { data: existingRecords } = await supabase
          .from('evt_s1010')
          .select('*')
          .eq('empresa_id', empresa.id)
          .eq('rub_cod_rubr', parsedData.rub_cod_rubr)
          .is('rub_fim_valid', null)
          .order('rub_ini_valid', { ascending: false })
          .limit(1);

        if (existingRecords && existingRecords.length > 0) {
          const existingRecord = existingRecords[0];
          const comparison = compareDates(parsedData.rub_ini_valid, existingRecord.rub_ini_valid);

          if (comparison <= 0) {
            error = {
              message: 'Evento S-1010 com data de início anterior a um registro já existente'
            };
          } else {
            const previousMonthEnd = getPreviousMonth(parsedData.rub_ini_valid);

            const { error: updateError } = await supabase
              .from('evt_s1010')
              .update({ rub_fim_valid: previousMonthEnd })
              .eq('id', existingRecord.id);

            if (updateError) {
              error = updateError;
            } else {
              warnings.push('Importação realizou o encerramento de vigência de rubrica com código já existente');
            }
          }
        }
      }

      if (!error) {
        const { error: insertError } = await supabase
          .from('evt_s1010')
          .insert(parsedData);

        error = insertError;
      }
    } catch (err) {
      error = err instanceof Error ? { message: err.message } : { message: 'Erro desconhecido' };
    }

    if (importacao) {
      await supabase
        .from('importacoes')
        .update({
          status: error ? 'error' : 'success',
          registros_processados: error ? 0 : 1,
          erros: error ? [error.message] : [],
        })
        .eq('id', importacao.id);
    }

    return {
      success: !error,
      message: `${fileName}: ${error ? error.message : 'Rubrica importada'}`,
      records: error ? 0 : 1,
      xml_id: parsedData.xml_id || undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  async function processS1200(
    fileName: string,
    content: string,
    zipFileName?: string,
    pathInZip?: string
  ): Promise<ImportResult> {
    if (!empresa) {
      return { success: false, message: 'Empresa nao configurada', records: 0 };
    }

    const remuneracoes = parseS1200(content);

    if (remuneracoes.length === 0) {
      return { success: false, message: `${fileName}: Nenhuma remuneracao encontrada`, records: 0 };
    }

    const competencia = remuneracoes[0]?.competencia || '';

    const { data: importacao } = await supabase
      .from('importacoes')
      .insert({
        empresa_id: empresa.id,
        tipo_evento: 'S-1200',
        nome_arquivo: fileName,
        competencia,
        status: 'processing',
        arquivo_origem_zip: zipFileName || null,
        caminho_no_zip: pathInZip || null,
      })
      .select()
      .single();

    let processedCount = 0;
    const errors: string[] = [];

    const { data: rubricasData } = await supabase
      .from('rubricas')
      .select('id, codigo')
      .eq('empresa_id', empresa.id);

    const rubricasMap = new Map(rubricasData?.map((r) => [r.codigo, r.id]) || []);

    for (const rem of remuneracoes) {
      try {
        let colaboradorId: string;

        const { data: existingColaborador } = await supabase
          .from('colaboradores')
          .select('id')
          .eq('empresa_id', empresa.id)
          .eq('cpf', rem.colaborador.cpf)
          .maybeSingle();

        if (existingColaborador) {
          colaboradorId = existingColaborador.id;
        } else {
          const { data: newColaborador, error: colabError } = await supabase
            .from('colaboradores')
            .insert({
              empresa_id: empresa.id,
              cpf: rem.colaborador.cpf,
              nome: rem.colaborador.nome,
              matricula: rem.colaborador.matricula,
            })
            .select()
            .single();

          if (colabError || !newColaborador) {
            errors.push(`Colaborador ${rem.colaborador.cpf}: ${colabError?.message}`);
            continue;
          }
          colaboradorId = newColaborador.id;
        }

        let valorBruto = 0;
        let valorDescontos = 0;
        let baseInss = 0;
        let baseIrrf = 0;
        let baseFgts = 0;

        for (const item of rem.itens) {
          const rubricaId = rubricasMap.get(item.codigoRubrica);
          let rubricaData = null;

          if (rubricaId) {
            const { data } = await supabase
              .from('rubricas')
              .select('*')
              .eq('id', rubricaId)
              .single();
            rubricaData = data;
          }

          if (item.natureza === 'provento') {
            valorBruto += item.valor;
          } else if (item.natureza === 'desconto') {
            valorDescontos += item.valor;
          }

          if (rubricaData) {
            if (rubricaData.incid_inss !== '00') {
              baseInss += item.valor;
            }
            if (rubricaData.incid_irrf !== '00') {
              baseIrrf += item.valor;
            }
            if (rubricaData.incid_fgts !== '00') {
              baseFgts += item.valor;
            }
          }
        }

        const valorLiquido = valorBruto - valorDescontos;

        const { data: existingRem } = await supabase
          .from('remuneracoes')
          .select('id')
          .eq('colaborador_id', colaboradorId)
          .eq('competencia', rem.competencia)
          .maybeSingle();

        let remuneracaoId: string;

        if (existingRem) {
          await supabase
            .from('itens_remuneracao')
            .delete()
            .eq('remuneracao_id', existingRem.id);

          await supabase
            .from('remuneracoes')
            .update({
              importacao_id: importacao?.id,
              valor_bruto: valorBruto,
              valor_descontos: valorDescontos,
              valor_liquido: valorLiquido,
              base_inss: baseInss,
              base_irrf: baseIrrf,
              base_fgts: baseFgts,
            })
            .eq('id', existingRem.id);

          remuneracaoId = existingRem.id;
        } else {
          const { data: newRem, error: remError } = await supabase
            .from('remuneracoes')
            .insert({
              empresa_id: empresa.id,
              colaborador_id: colaboradorId,
              importacao_id: importacao?.id,
              competencia: rem.competencia,
              valor_bruto: valorBruto,
              valor_descontos: valorDescontos,
              valor_liquido: valorLiquido,
              base_inss: baseInss,
              base_irrf: baseIrrf,
              base_fgts: baseFgts,
            })
            .select()
            .single();

          if (remError || !newRem) {
            errors.push(`Remuneracao ${rem.colaborador.cpf}: ${remError?.message}`);
            continue;
          }
          remuneracaoId = newRem.id;
        }

        for (const item of rem.itens) {
          const rubricaId = rubricasMap.get(item.codigoRubrica) || null;

          await supabase.from('itens_remuneracao').insert({
            remuneracao_id: remuneracaoId,
            rubrica_id: rubricaId,
            codigo_rubrica: item.codigoRubrica,
            descricao: item.descricao,
            natureza: item.natureza,
            referencia: item.referencia,
            valor: item.valor,
          });
        }

        processedCount++;
      } catch (err) {
        errors.push(`${rem.colaborador.cpf}: ${err instanceof Error ? err.message : 'Erro'}`);
      }
    }

    if (importacao) {
      await supabase
        .from('importacoes')
        .update({
          status: errors.length === 0 ? 'success' : 'partial',
          registros_processados: processedCount,
          erros: errors,
        })
        .eq('id', importacao.id);
    }

    await updateApuracao(empresa.id, competencia);

    return {
      success: errors.length === 0,
      message: `${fileName}: ${processedCount} remuneracoes importadas`,
      records: processedCount,
    };
  }

  async function updateApuracao(empresaId: string, competencia: string) {
    const { data: remuneracoes } = await supabase
      .from('remuneracoes')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('competencia', competencia);

    if (!remuneracoes || remuneracoes.length === 0) return;

    const totals = remuneracoes.reduce(
      (acc, r) => ({
        bruto: acc.bruto + r.valor_bruto,
        inss: acc.inss + r.base_inss,
        irrf: acc.irrf + r.base_irrf,
        fgts: acc.fgts + r.base_fgts,
      }),
      { bruto: 0, inss: 0, irrf: 0, fgts: 0 }
    );

    const { data: divergencias } = await supabase
      .from('divergencias')
      .select('id')
      .eq('empresa_id', empresaId)
      .in('remuneracao_id', remuneracoes.map((r) => r.id));

    await supabase.from('apuracoes').upsert(
      {
        empresa_id: empresaId,
        competencia,
        total_bruto_original: totals.bruto,
        total_bruto_recalculado: totals.bruto,
        total_inss_original: totals.inss,
        total_inss_recalculado: totals.inss,
        total_irrf_original: totals.irrf,
        total_irrf_recalculado: totals.irrf,
        total_fgts_original: totals.fgts,
        total_fgts_recalculado: totals.fgts,
        total_divergencias: divergencias?.length || 0,
      },
      { onConflict: 'empresa_id,competencia' }
    );
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  }

  function getEventBadge(eventType: string) {
    const colors: Record<string, string> = {
      'S-1010': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'S-1200': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return colors[eventType] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }

  const successCount = results.filter(r => r.success).length;
  const s1010Count = results.filter(r => r.eventType === 'S-1010' && r.success).length;
  const s1200Count = results.filter(r => r.eventType === 'S-1200' && r.success).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Importar XML</h1>
        <p className="text-slate-400">
          Importe arquivos XML do eSocial (eventos S-1010 e S-1200) ou arquivos ZIP
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-slate-600 hover:border-slate-500'
        }`}
      >
        <input
          type="file"
          accept=".xml,.zip"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={processingState.phase !== 'idle'}
        />

        <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          {processingState.phase === 'idle' ? (
            <Upload className={`w-8 h-8 ${isDragging ? 'text-emerald-400' : 'text-slate-400'}`} />
          ) : (
            <Archive className="w-8 h-8 text-emerald-400 animate-pulse" />
          )}
        </div>

        {processingState.phase === 'extracting' && (
          <div className="space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
            <p className="text-slate-300">Extraindo arquivos do ZIP...</p>
            {processingState.currentFile && (
              <p className="text-slate-500 text-sm">{processingState.currentFile}</p>
            )}
            {processingState.extractedCount !== undefined && processingState.totalCount !== undefined && (
              <div className="max-w-xs mx-auto">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Extraindo XMLs</span>
                  <span>{processingState.extractedCount} / {processingState.totalCount}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(processingState.extractedCount / processingState.totalCount) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {processingState.phase === 'processing' && (
          <div className="space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
            <p className="text-slate-300">Processando arquivos...</p>
            {processingState.currentFile && (
              <p className="text-slate-500 text-sm truncate max-w-md mx-auto">{processingState.currentFile}</p>
            )}
            {processingState.processedCount !== undefined && processingState.totalCount !== undefined && (
              <div className="max-w-xs mx-auto">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Processando</span>
                  <span>{processingState.processedCount} / {processingState.totalCount}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(processingState.processedCount / processingState.totalCount) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {processingState.phase === 'idle' && (
          <>
            <p className="text-lg text-white mb-2">
              Arraste arquivos XML ou ZIP aqui ou clique para selecionar
            </p>
            <p className="text-slate-500 text-sm">
              Suporta eventos S-1010 (Tabela de Rubricas) e S-1200 (Remuneracao)
            </p>
            <p className="text-slate-600 text-xs mt-2">
              Arquivos ZIP ate {MAX_ZIP_SIZE_MB}MB com pastas e subpastas
            </p>
          </>
        )}
      </div>

      {(results.length > 0 || unsupportedFiles.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{successCount}</p>
                <p className="text-xs text-slate-500">Processados</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{s1010Count}</p>
                <p className="text-xs text-slate-500">S-1010</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{s1200Count}</p>
                <p className="text-xs text-slate-500">S-1200</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <FileWarning className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{unsupportedFiles.length}</p>
                <p className="text-xs text-slate-500">Nao Suportados</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {unsupportedFiles.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowUnsupported(!showUnsupported)}
            className="w-full p-4 flex items-center justify-between hover:bg-amber-500/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-medium">
                {unsupportedFiles.length} arquivo(s) com eventos nao suportados
              </span>
            </div>
            <span className="text-slate-500 text-sm">
              {showUnsupported ? 'Ocultar' : 'Ver detalhes'}
            </span>
          </button>

          {showUnsupported && (
            <div className="border-t border-amber-500/20 divide-y divide-amber-500/10">
              {unsupportedFiles.map((file, index) => (
                <div key={index} className="p-4 flex items-center gap-4">
                  <FileWarning className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{file.fileName}</p>
                    {file.filePath && file.filePath !== file.fileName && (
                      <p className="text-slate-500 text-xs truncate">{file.filePath}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded">
                      {file.eventType}
                    </span>
                    <p className="text-slate-500 text-xs mt-1">{file.eventDescription}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Resultado da Importacao</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {results.map((result, index) => (
              <div key={index} className="space-y-2">
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    result.success ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  )}
                  <span className={`flex-1 ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result.message}
                  </span>
                  {result.eventType && (
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getEventBadge(result.eventType)}`}>
                      {result.eventType}
                    </span>
                  )}
                </div>
                {result.warnings && result.warnings.length > 0 && (
                  <div className="ml-8 space-y-1">
                    {result.warnings.map((warning, wIndex) => (
                      <div
                        key={wIndex}
                        className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="text-sm text-amber-400">{warning}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-white">Historico de Importacoes</h2>
          {importacoes.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Todos
            </button>
          )}
        </div>

        {importacoes.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Nenhuma importacao realizada</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {importacoes.map((imp) => (
              <div key={imp.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                  {imp.arquivo_origem_zip ? (
                    <Archive className="w-5 h-5 text-slate-400" />
                  ) : (
                    <FileText className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{imp.nome_arquivo}</p>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getEventBadge(imp.tipo_evento)}`}>
                      {imp.tipo_evento}
                    </span>
                    {imp.competencia && <span>Competencia: {imp.competencia}</span>}
                    <span>{imp.registros_processados} registros</span>
                    {imp.arquivo_origem_zip && (
                      <span className="text-slate-600 truncate" title={imp.arquivo_origem_zip}>
                        via {imp.arquivo_origem_zip}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(imp.status)}
                  <span className="text-sm text-slate-400 capitalize">{imp.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Instrucoes de Importacao</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-medium text-emerald-400 mb-2">1. Evento S-1010 - Tabela de Rubricas</h3>
            <p className="text-slate-400 text-sm">
              Importe primeiro o arquivo S-1010 contendo a tabela de rubricas da empresa.
              Este arquivo define as verbas utilizadas na folha de pagamento com suas
              respectivas incidencias tributarias.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-emerald-400 mb-2">2. Evento S-1200 - Remuneracao</h3>
            <p className="text-slate-400 text-sm">
              Apos importar o S-1010, importe os arquivos S-1200 contendo a remuneracao
              dos trabalhadores. O sistema ira confrontar as verbas com a tabela de rubricas
              e identificar possiveis divergencias.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-emerald-400 mb-2">3. Importacao via ZIP</h3>
            <p className="text-slate-400 text-sm">
              Voce pode importar arquivos ZIP contendo multiplos XMLs organizados em pastas
              e subpastas. Limite de {MAX_ZIP_SIZE_MB}MB. Eventos nao suportados serao listados
              separadamente.
            </p>
          </div>
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>

              <h2 className="text-xl font-bold text-white text-center mb-2">
                Confirmar Exclusao
              </h2>
              <p className="text-slate-400 text-center mb-6">
                Esta acao ira excluir permanentemente todos os dados importados desta empresa,
                incluindo rubricas, colaboradores, remuneracoes e historico de importacoes.
                Esta acao nao pode ser desfeita.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearing}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={clearAllData}
                  disabled={clearing}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {clearing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      Excluir Tudo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
