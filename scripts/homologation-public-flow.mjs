import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function randomDigits(length) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 10);
  }
  return out;
}

function calcAgeFromIsoDate(isoDate) {
  const now = new Date();
  const birth = new Date(isoDate);
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function normalizeDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const timestamp = Date.now();
  const phone = `91${randomDigits(9)}`;
  const cpf = `9${randomDigits(10)}`;
  const childName = `Teste Homologacao ${timestamp}`;
  const responsavelName = `Responsavel Homologacao ${timestamp}`;
  const birthDate = "2018-06-15";
  const age = calcAgeFromIsoDate(birthDate);

  const payload = {
    responsavel: {
      nome: responsavelName,
      cpf,
      telefone: phone,
      whatsapp: phone,
      email: `responsavel+${timestamp}@ebf2026.local`,
      endereco: "Rua da Homologacao, 123",
      bairro: "Centro",
      cidade: "Tomé-Açu",
      estado: "PA",
      igreja: "AD Campo Marupaúba",
      nome_pai: "Pai Homologacao",
      nome_mae: "Mae Homologacao",
    },
    crianca: {
      nome: childName,
      data_nascimento: birthDate,
      idade: String(age),
      sexo: "feminino",
      serie_escolar: "2º ano",
      tamanho_camisa: "M",
    },
    saude: {
      alergias: "Nenhuma",
      medicamentos: "Nenhum",
      necessidades_especiais: "",
      restricoes_alimentares: "",
    },
    emergencia: {
      nome: "Contato Emergencia",
      telefone: phone,
      parentesco: "Tia",
    },
    autorizacoes: {
      participacao: true,
      imagem: true,
      veracidade: true,
    },
  };

  const create = await supabase.rpc("criar_inscricao", { payload });
  assert(!create.error, `criar_inscricao falhou: ${create.error?.message}`);
  const protocolo = create.data?.protocolo;
  assert(protocolo, "criar_inscricao não retornou protocolo.");

  const byProtocol = await supabase.rpc("consultar_inscricao", { termo: protocolo });
  assert(
    !byProtocol.error,
    `consultar_inscricao por protocolo falhou: ${byProtocol.error?.message}`,
  );
  assert((byProtocol.data || []).length >= 1, "consulta por protocolo não retornou registros.");

  const byCpf = await supabase.rpc("consultar_inscricao", { termo: cpf });
  assert(!byCpf.error, `consultar_inscricao por CPF falhou: ${byCpf.error?.message}`);
  assert((byCpf.data || []).length >= 1, "consulta por CPF não retornou registros.");

  const byPhone = await supabase.rpc("consultar_inscricao", { termo: phone });
  assert(!byPhone.error, `consultar_inscricao por telefone falhou: ${byPhone.error?.message}`);
  assert((byPhone.data || []).length >= 1, "consulta por telefone não retornou registros.");

  const target = (byProtocol.data || []).find((item) => item.protocolo === protocolo);
  assert(!!target, "registro recém-criado não encontrado no retorno da consulta.");
  assert(
    normalizeDigits(target.responsavel_telefone) === normalizeDigits(phone),
    "telefone retornado não corresponde ao telefone enviado.",
  );

  const response = {
    created_protocol: protocolo,
    cpf_digits: cpf,
    phone_digits: phone,
    checks: [
      { check: "inscricao_rpc_create", ok: true },
      { check: "consulta_por_protocolo", ok: true },
      { check: "consulta_por_cpf", ok: true },
      { check: "consulta_por_telefone", ok: true },
      { check: "telefone_normalizado", ok: true },
    ],
  };

  console.log(JSON.stringify(response, null, 2));
}

run().catch((error) => {
  console.error("homologation-public-flow failed:", error.message || error);
  process.exit(1);
});
