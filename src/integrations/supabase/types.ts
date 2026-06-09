export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      contatos: {
        Row: {
          confirmado: boolean;
          created_at: string;
          data_contato: string;
          id: string;
          observacoes: string | null;
          registrado_por: string | null;
          responsavel_id: string;
        };
        Insert: {
          confirmado?: boolean;
          created_at?: string;
          data_contato?: string;
          id?: string;
          observacoes?: string | null;
          registrado_por?: string | null;
          responsavel_id: string;
        };
        Update: {
          confirmado?: boolean;
          created_at?: string;
          data_contato?: string;
          id?: string;
          observacoes?: string | null;
          registrado_por?: string | null;
          responsavel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contatos_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "responsaveis";
            referencedColumns: ["id"];
          },
        ];
      };
      criancas: {
        Row: {
          alergias: string | null;
          autoriza_imagem: boolean;
          autoriza_participacao: boolean;
          confirma_veracidade: boolean;
          created_at: string;
          data_nascimento: string;
          emergencia_nome: string | null;
          emergencia_parentesco: string | null;
          emergencia_telefone: string | null;
          id: string;
          idade: number;
          medicamentos: string | null;
          necessidades_especiais: string | null;
          nome: string;
          responsavel_id: string;
          restricoes_alimentares: string | null;
          serie_escolar: string | null;
          sexo: string;
          tamanho_camisa: string | null;
          turma: string | null;
          updated_at: string;
        };
        Insert: {
          alergias?: string | null;
          autoriza_imagem?: boolean;
          autoriza_participacao?: boolean;
          confirma_veracidade?: boolean;
          created_at?: string;
          data_nascimento: string;
          emergencia_nome?: string | null;
          emergencia_parentesco?: string | null;
          emergencia_telefone?: string | null;
          id?: string;
          idade: number;
          medicamentos?: string | null;
          necessidades_especiais?: string | null;
          nome: string;
          responsavel_id: string;
          restricoes_alimentares?: string | null;
          serie_escolar?: string | null;
          sexo: string;
          tamanho_camisa?: string | null;
          turma?: string | null;
          updated_at?: string;
        };
        Update: {
          alergias?: string | null;
          autoriza_imagem?: boolean;
          autoriza_participacao?: boolean;
          confirma_veracidade?: boolean;
          created_at?: string;
          data_nascimento?: string;
          emergencia_nome?: string | null;
          emergencia_parentesco?: string | null;
          emergencia_telefone?: string | null;
          id?: string;
          idade?: number;
          medicamentos?: string | null;
          necessidades_especiais?: string | null;
          nome?: string;
          responsavel_id?: string;
          restricoes_alimentares?: string | null;
          serie_escolar?: string | null;
          sexo?: string;
          tamanho_camisa?: string | null;
          turma?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "criancas_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "responsaveis";
            referencedColumns: ["id"];
          },
        ];
      };
      inscricoes: {
        Row: {
          crianca_id: string;
          data_inscricao: string;
          id: string;
          protocolo: string;
          status: string;
        };
        Insert: {
          crianca_id: string;
          data_inscricao?: string;
          id?: string;
          protocolo: string;
          status?: string;
        };
        Update: {
          crianca_id?: string;
          data_inscricao?: string;
          id?: string;
          protocolo?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inscricoes_crianca_id_fkey";
            columns: ["crianca_id"];
            isOneToOne: false;
            referencedRelation: "criancas";
            referencedColumns: ["id"];
          },
        ];
      };
      presencas: {
        Row: {
          created_at: string;
          crianca_id: string;
          data: string;
          id: string;
          registrado_por: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          crianca_id: string;
          data: string;
          id?: string;
          registrado_por?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          crianca_id?: string;
          data?: string;
          id?: string;
          registrado_por?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "presencas_crianca_id_fkey";
            columns: ["crianca_id"];
            isOneToOne: false;
            referencedRelation: "criancas";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          nome: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          nome: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          nome?: string;
        };
        Relationships: [];
      };
      responsaveis: {
        Row: {
          bairro: string | null;
          cidade: string | null;
          cpf: string;
          created_at: string;
          email: string | null;
          endereco: string | null;
          estado: string | null;
          id: string;
          igreja: string | null;
          nome: string;
          nome_mae: string | null;
          nome_pai: string | null;
          telefone: string;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          bairro?: string | null;
          cidade?: string | null;
          cpf: string;
          created_at?: string;
          email?: string | null;
          endereco?: string | null;
          estado?: string | null;
          id?: string;
          igreja?: string | null;
          nome: string;
          nome_mae?: string | null;
          nome_pai?: string | null;
          telefone: string;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          bairro?: string | null;
          cidade?: string | null;
          cpf?: string;
          created_at?: string;
          email?: string | null;
          endereco?: string | null;
          estado?: string | null;
          id?: string;
          igreja?: string | null;
          nome?: string;
          nome_mae?: string | null;
          nome_pai?: string | null;
          telefone?: string;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consultar_inscricao: {
        Args: { termo: string };
        Returns: {
          crianca_idade: number;
          crianca_nome: string;
          crianca_sexo: string;
          data_inscricao: string;
          igreja: string;
          protocolo: string;
          responsavel_nome: string;
          responsavel_telefone: string;
          status: string;
        }[];
      };
      criar_inscricao: { Args: { payload: Json }; Returns: Json };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_staff: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "equipe";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "equipe"],
    },
  },
} as const;
