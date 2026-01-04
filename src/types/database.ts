export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string;
          user_id: string;
          cnpj: string;
          razao_social: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cnpj: string;
          razao_social: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          cnpj?: string;
          razao_social?: string;
          created_at?: string;
        };
      };
      rubricas: {
        Row: {
          id: string;
          empresa_id: string;
          codigo: string;
          descricao: string;
          natureza: string;
          tipo: string | null;
          incid_inss: string;
          incid_irrf: string;
          incid_fgts: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          codigo: string;
          descricao: string;
          natureza?: string;
          tipo?: string | null;
          incid_inss?: string;
          incid_irrf?: string;
          incid_fgts?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          empresa_id?: string;
          codigo?: string;
          descricao?: string;
          natureza?: string;
          tipo?: string | null;
          incid_inss?: string;
          incid_irrf?: string;
          incid_fgts?: string;
          created_at?: string;
        };
      };
      colaboradores: {
        Row: {
          id: string;
          empresa_id: string;
          cpf: string;
          nome: string;
          matricula: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          cpf: string;
          nome: string;
          matricula?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          empresa_id?: string;
          cpf?: string;
          nome?: string;
          matricula?: string | null;
          created_at?: string;
        };
      };
      importacoes: {
        Row: {
          id: string;
          empresa_id: string;
          tipo_evento: string;
          nome_arquivo: string;
          competencia: string | null;
          status: string;
          registros_processados: number;
          erros: unknown[];
          arquivo_origem_zip: string | null;
          caminho_no_zip: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          tipo_evento: string;
          nome_arquivo: string;
          competencia?: string | null;
          status?: string;
          registros_processados?: number;
          erros?: unknown[];
          arquivo_origem_zip?: string | null;
          caminho_no_zip?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          empresa_id?: string;
          tipo_evento?: string;
          nome_arquivo?: string;
          competencia?: string | null;
          status?: string;
          registros_processados?: number;
          erros?: unknown[];
          arquivo_origem_zip?: string | null;
          caminho_no_zip?: string | null;
          created_at?: string;
        };
      };
      remuneracoes: {
        Row: {
          id: string;
          empresa_id: string;
          colaborador_id: string;
          importacao_id: string | null;
          competencia: string;
          valor_bruto: number;
          valor_descontos: number;
          valor_liquido: number;
          base_inss: number;
          base_irrf: number;
          base_fgts: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          colaborador_id: string;
          importacao_id?: string | null;
          competencia: string;
          valor_bruto?: number;
          valor_descontos?: number;
          valor_liquido?: number;
          base_inss?: number;
          base_irrf?: number;
          base_fgts?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          empresa_id?: string;
          colaborador_id?: string;
          importacao_id?: string | null;
          competencia?: string;
          valor_bruto?: number;
          valor_descontos?: number;
          valor_liquido?: number;
          base_inss?: number;
          base_irrf?: number;
          base_fgts?: number;
          created_at?: string;
        };
      };
      itens_remuneracao: {
        Row: {
          id: string;
          remuneracao_id: string;
          rubrica_id: string | null;
          codigo_rubrica: string;
          descricao: string | null;
          natureza: string;
          referencia: number;
          valor: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          remuneracao_id: string;
          rubrica_id?: string | null;
          codigo_rubrica: string;
          descricao?: string | null;
          natureza?: string;
          referencia?: number;
          valor?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          remuneracao_id?: string;
          rubrica_id?: string | null;
          codigo_rubrica?: string;
          descricao?: string | null;
          natureza?: string;
          referencia?: number;
          valor?: number;
          created_at?: string;
        };
      };
      divergencias: {
        Row: {
          id: string;
          empresa_id: string;
          remuneracao_id: string;
          item_remuneracao_id: string | null;
          tipo: string;
          descricao: string;
          valor_original: number;
          valor_recalculado: number;
          diferenca: number;
          severidade: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          remuneracao_id: string;
          item_remuneracao_id?: string | null;
          tipo: string;
          descricao: string;
          valor_original?: number;
          valor_recalculado?: number;
          diferenca?: number;
          severidade?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          empresa_id?: string;
          remuneracao_id?: string;
          item_remuneracao_id?: string | null;
          tipo?: string;
          descricao?: string;
          valor_original?: number;
          valor_recalculado?: number;
          diferenca?: number;
          severidade?: string;
          created_at?: string;
        };
      };
      apuracoes: {
        Row: {
          id: string;
          empresa_id: string;
          competencia: string;
          total_bruto_original: number;
          total_bruto_recalculado: number;
          total_inss_original: number;
          total_inss_recalculado: number;
          total_irrf_original: number;
          total_irrf_recalculado: number;
          total_fgts_original: number;
          total_fgts_recalculado: number;
          total_divergencias: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          competencia: string;
          total_bruto_original?: number;
          total_bruto_recalculado?: number;
          total_inss_original?: number;
          total_inss_recalculado?: number;
          total_irrf_original?: number;
          total_irrf_recalculado?: number;
          total_fgts_original?: number;
          total_fgts_recalculado?: number;
          total_divergencias?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          empresa_id?: string;
          competencia?: string;
          total_bruto_original?: number;
          total_bruto_recalculado?: number;
          total_inss_original?: number;
          total_inss_recalculado?: number;
          total_irrf_original?: number;
          total_irrf_recalculado?: number;
          total_fgts_original?: number;
          total_fgts_recalculado?: number;
          total_divergencias?: number;
          created_at?: string;
        };
      };
      entendimentos_tributacao: {
        Row: {
          id: string;
          codigo_rubrica: string;
          descricao_rubrica: string;
          incide_inss: boolean;
          incide_irrf: boolean;
          incide_fgts: boolean;
          observacoes: string | null;
          fundamento_legal: string | null;
          vigencia_inicio: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codigo_rubrica: string;
          descricao_rubrica: string;
          incide_inss?: boolean;
          incide_irrf?: boolean;
          incide_fgts?: boolean;
          observacoes?: string | null;
          fundamento_legal?: string | null;
          vigencia_inicio?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codigo_rubrica?: string;
          descricao_rubrica?: string;
          incide_inss?: boolean;
          incide_irrf?: boolean;
          incide_fgts?: boolean;
          observacoes?: string | null;
          fundamento_legal?: string | null;
          vigencia_inicio?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      evt_s1000: {
        Row: {
          id_evento: string;
          empresa_id: string;
          tp_insc: string;
          nr_insc: string;
          tipo_operacao: string;
          ini_valid: string;
          fim_valid: string | null;
          class_trib: string | null;
          ind_des_folha: string | null;
          ind_opt_reg_eletron: string | null;
          ind_porte: string | null;
          ind_coop: string | null;
          ind_constr: string | null;
          ind_opc_cp: string | null;
          cnpj_efr: string | null;
          isencao_nr_certif: string | null;
          isencao_dt_venc: string | null;
          data_importacao: string;
        };
        Insert: {
          id_evento: string;
          empresa_id: string;
          tp_insc: string;
          nr_insc: string;
          tipo_operacao: string;
          ini_valid: string;
          fim_valid?: string | null;
          class_trib?: string | null;
          ind_des_folha?: string | null;
          ind_opt_reg_eletron?: string | null;
          ind_porte?: string | null;
          ind_coop?: string | null;
          ind_constr?: string | null;
          ind_opc_cp?: string | null;
          cnpj_efr?: string | null;
          isencao_nr_certif?: string | null;
          isencao_dt_venc?: string | null;
          data_importacao?: string;
        };
        Update: {
          id_evento?: string;
          empresa_id?: string;
          tp_insc?: string;
          nr_insc?: string;
          tipo_operacao?: string;
          ini_valid?: string;
          fim_valid?: string | null;
          class_trib?: string | null;
          ind_des_folha?: string | null;
          ind_opt_reg_eletron?: string | null;
          ind_porte?: string | null;
          ind_coop?: string | null;
          ind_constr?: string | null;
          ind_opc_cp?: string | null;
          cnpj_efr?: string | null;
          isencao_nr_certif?: string | null;
          isencao_dt_venc?: string | null;
          data_importacao?: string;
        };
      };
    };
  };
}

export type Empresa = Database['public']['Tables']['empresas']['Row'];
export type Rubrica = Database['public']['Tables']['rubricas']['Row'];
export type Colaborador = Database['public']['Tables']['colaboradores']['Row'];
export type Importacao = Database['public']['Tables']['importacoes']['Row'];
export type Remuneracao = Database['public']['Tables']['remuneracoes']['Row'];
export type ItemRemuneracao = Database['public']['Tables']['itens_remuneracao']['Row'];
export type Divergencia = Database['public']['Tables']['divergencias']['Row'];
export type Apuracao = Database['public']['Tables']['apuracoes']['Row'];
export type EntendimentoTributacao = Database['public']['Tables']['entendimentos_tributacao']['Row'];
export type EventoS1000 = Database['public']['Tables']['evt_s1000']['Row'];