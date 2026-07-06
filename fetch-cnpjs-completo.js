/**
 * 📋 BUSCAR CNPJs COMPLETOS COM TODAS INFORMAÇÕES
 * Busca 150 CNPJs com dados completos na API querybuscas.com
 * Filtra por: ATIVO + DATA_ABERTURA antes de 2026
 * Salva em JSON estruturado
 */

const axios = require('axios');
const fs = require('fs');
const logger = require('./src/utils/logger');

// Delay humanizado - 1 segundo fixo conforme pedido
const humanDelay = (min = 1000, max = 1000) => {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
};

async function fetchCNPJCompleto(cnpj) {
  try {
    const response = await axios.get(`https://querybuscas.com/api/cnpj/${cnpj}`, {
      headers: {
        'accept': '*/*',
        'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Referer': 'https://querybuscas.com/pages/consultas/gerador-cnpj',
        'cookie': 'auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywidXNlcm5hbWUiOiJwZXJ3emluaG8iLCJwbGFubyI6Im1lbnNhbCIsImRpYXMiOjMxMCwidGlwbyI6ImNsaWVudGUiLCJzZXNzaW9uVG9rZW4iOiI4NmRlMTU4OTFiNzU3Njc0Yjc5MGI5Nzg4NTY4NmQ0ZmMyNmUzZmVlZjlmMDM5M2RmMjUzMTc2NzNjZDBiZjZmIiwiaWF0IjoxNzgzMDU2ODU1LCJleHAiOjE3ODM2NjE2NTV9.GASvrYCzDB3q8XoSsQsL_OyTe5XtPMRBILXzvhvH6h4; cf_clearance=iRFiPpDmNIX0cIbb8rYe6dAwW9oOe4ga8yGQ.rChdyQ-1783126865-1.2.1.1-029wCCW..3MhwKtpJYBaay0sX3OW1h9KzwB_PTDdijWtcbPAJARR2qRJ.DeQhxLzWL9wtiyxwxhy1dgNcFgvZU_I2vLb7PutkQgq_RhXoMytr7mIhmppvBQdrKZC18EjoFgDEjCbEv8K7cmMMd8wpd7NbQefIjAPenDsZSBfgT4XuK.aL9KS_tA4CcIoCfUAeeLS8o3_kGRpb9ZRwXoNzzs53YxPQOP7ymNMz388QvwR9hwzfAs.8H_GRw1tCYs69OI4mwqeWh.54m0x.3O0Qe4eV4qIMZqDmKqeTLqvzjlLIW9UwYG.O31zKkxgYgcw00_9Slq81oRCfQIRgfraOQ'
      },
      timeout: 15000
    });

    return response.data;
  } catch (error) {
    return null;
  }
}

async function gerarCNPJ() {
  // Gerar número aleatório de 8 dígitos
  let n = Math.floor(Math.random() * 99999999);
  let s = n.toString().padStart(8, '0');

  // Adicionar 4 dígitos fixos para MEI (ramo de atividade)
  s += '0001';

  // Calcular primeiro dígito verificador
  let d1 = 0;
  let m = 2;
  for (let i = s.length - 1; i >= 0; i--) {
    d1 += parseInt(s[i]) * m;
    m++;
    if (m > 9) m = 2;
  }
  d1 = 11 - (d1 % 11);
  if (d1 > 9) d1 = 0;

  s += d1;

  // Calcular segundo dígito verificador
  let d2 = 0;
  m = 2;
  for (let i = s.length - 1; i >= 0; i--) {
    d2 += parseInt(s[i]) * m;
    m++;
    if (m > 9) m = 2;
  }
  d2 = 11 - (d2 % 11);
  if (d2 > 9) d2 = 0;

  return s + d2;
}

async function fetchCNPJsCompletos() {
  logger.info('\n' + '='.repeat(60));
  logger.info('📋 BUSCANDO 150 CNPJs COMPLETOS COM TODAS INFORMAÇÕES');
  logger.info('='.repeat(60) + '\n');

  const cnpjsValidos = [];
  const cnpjsTentados = new Set();
  let tentativas = 0;
  const maxTentativas = 300; // Tentar mais para conseguir 150

  try {
    logger.info('🚀 Iniciando busca de CNPJs com dados completos...\n');

    while (cnpjsValidos.length < 150 && tentativas < maxTentativas) {
      tentativas++;

      // Gerar CNPJ aleatório
      const cnpj = await gerarCNPJ();

      // Evitar duplicatas
      if (cnpjsTentados.has(cnpj)) continue;
      cnpjsTentados.add(cnpj);

      const progress = Math.round((cnpjsValidos.length / 150) * 100);

      logger.info(`\n📊 [Tentativa ${tentativas}/${maxTentativas}] Progresso: ${cnpjsValidos.length}/150 (${progress}%)`);

      try {
        logger.info(`🔍 Buscando CNPJ: ${cnpj}...`);

        const dadosCNPJ = await fetchCNPJCompleto(cnpj);

        if (!dadosCNPJ || dadosCNPJ.Status !== 'success') {
          logger.warn(`❌ CNPJ ${cnpj}: Não encontrado ou erro na API\n`);
          await humanDelay(1000, 1000);
          continue;
        }

        const empresa = dadosCNPJ.DADOS_EMPRESA;

        logger.info(`   📋 Razão Social: ${empresa.RAZAO_SOCIAL}`);
        logger.info(`   🏢 Porte: ${empresa.PORTE}`);
        logger.info(`   📅 Abertura: ${empresa.DATA_ABERTURA}`);
        logger.info(`   ✓ Situação: ${empresa.SITUACAO}`);

        // FILTRAR CRITÉRIOS
        // 1. Situação: Ativa
        if (empresa.SITUACAO !== 'Ativa') {
          logger.warn(`   ⚠️ Filtrado: Situação não é ATIVA (${empresa.SITUACAO})\n`);
          await humanDelay(1000, 1000);
          continue;
        }

        // 2. Data de abertura: Anterior a 2026
        const dataAbertura = new Date(empresa.DATA_ABERTURA);
        const ano = dataAbertura.getFullYear();

        if (ano >= 2026) {
          logger.warn(`   ⚠️ Filtrado: Aberto em ${ano} (precisa ser antes de 2026)\n`);
          await humanDelay(1000, 1000);
          continue;
        }

        // 3. Porte: MEI ou Microempresa
        const ehMEI = empresa.OPTANTE_MEI === 'Sim' ||
                      empresa.PORTE?.includes('MEI') ||
                      empresa.PORTE?.includes('Micro');

        if (!ehMEI) {
          logger.warn(`   ⚠️ Filtrado: Não é MEI/Microempresa\n`);
          await humanDelay(1000, 1000);
          continue;
        }

        // ✅ CNPJ VÁLIDO! Adicionar com todos os dados
        logger.info(`   ✅ APROVADO! CNPJ válido e ativo desde ${empresa.DATA_ABERTURA}`);

        const cnpjCompleto = {
          CNPJ: empresa.CNPJ,
          RAZAO_SOCIAL: empresa.RAZAO_SOCIAL,
          NOME_FANTASIA: empresa.NOME_FANTASIA,
          SITUACAO: empresa.SITUACAO,
          DATA_SITUACAO: empresa.DATA_SITUACAO,
          DATA_ABERTURA: empresa.DATA_ABERTURA,
          TIPO: empresa.TIPO,
          PORTE: empresa.PORTE,
          NATUREZA_JURIDICA: empresa.NATUREZA_JURIDICA,
          CAPITAL_SOCIAL: empresa.CAPITAL_SOCIAL,
          CNAE_PRINCIPAL: empresa.CNAE_PRINCIPAL,
          EMAIL: empresa.EMAIL,
          TELEFONE: empresa.TELEFONE,
          SOCIOS: dadosCNPJ.SOCIOS,
          ENDERECOS: dadosCNPJ.HISTORICO_ENDERECOS,
          EMAILS_LISTA: dadosCNPJ.EMAILS,
          TELEFONES_LISTA: dadosCNPJ.HISTORICO_TELEFONES,
          DADOS_COMPLETOS: dadosCNPJ
        };

        // Log de sócios
        if (dadosCNPJ.SOCIOS && dadosCNPJ.SOCIOS.DADOS && dadosCNPJ.SOCIOS.DADOS.length > 0) {
          logger.info(`   👤 Sócios: ${dadosCNPJ.SOCIOS.DADOS.map(s => s.NOME).join(', ')}`);
        }

        // Log de emails
        if (dadosCNPJ.EMAILS && dadosCNPJ.EMAILS.DADOS && dadosCNPJ.EMAILS.DADOS.length > 0) {
          logger.info(`   ✉️ Emails: ${dadosCNPJ.EMAILS.DADOS.join(', ')}`);
        }

        // Log de telefone
        if (empresa.TELEFONE) {
          logger.info(`   ☎️ Telefone: ${empresa.TELEFONE}`);
        }

        cnpjsValidos.push(cnpjCompleto);
        logger.info(`\n✅ CNPJ adicionado à lista! (${cnpjsValidos.length}/150)\n`);

        await humanDelay(1000, 1000); // 1 segundo conforme pedido

      } catch (error) {
        logger.warn(`   ⚠️ Erro ao buscar CNPJ ${cnpj}: ${error.message}`);
        await humanDelay(500, 1000);
      }
    }

    logger.info(`\n✅ Total de CNPJs válidos encontrados: ${cnpjsValidos.length}\n`);

    if (cnpjsValidos.length === 0) {
      logger.error('❌ Nenhum CNPJ foi encontrado com os critérios!\n');
      return { success: false, error: 'Nenhum CNPJ encontrado' };
    }

    // SALVAR EM ARQUIVO JSON
    logger.info('💾 Salvando CNPJs em arquivo JSON...');

    const cnpjData = {
      metadata: {
        total: cnpjsValidos.length,
        filtros: {
          situacao: 'Ativa',
          data_abertura: 'Anterior a 2026',
          porte: 'MEI/Microempresa'
        },
        data_geracao: new Date().toISOString()
      },
      cnpjs: cnpjsValidos
    };

    fs.writeFileSync('cnpj-lista-completa.json', JSON.stringify(cnpjData, null, 2), 'utf8');

    logger.info('✅ Arquivo salvo: cnpj-lista-completa.json\n');

    // SALVAR TAMBÉM EM TXT (APENAS CNPJs)
    logger.info('💾 Salvando apenas CNPJs em arquivo TXT...');

    const cnpjTxt = cnpjsValidos
      .map(c => c.CNPJ)
      .join('\n');

    fs.writeFileSync('cnpj-lista.txt', cnpjTxt, 'utf8');

    logger.info('✅ Arquivo salvo: cnpj-lista.txt\n');

    logger.info('='.repeat(60));
    logger.info('✅ BUSCA CONCLUÍDA COM SUCESSO!');
    logger.info('='.repeat(60));
    logger.info(`\n📊 Resumo:\n   Total de CNPJs: ${cnpjsValidos.length}\n`);

    return { success: true, count: cnpjsValidos.length, files: ['cnpj-lista-completa.json', 'cnpj-lista.txt'] };

  } catch (error) {
    logger.error(`❌ ERRO: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// Executar
if (require.main === module) {
  fetchCNPJsCompletos()
    .then(result => {
      logger.info(`\n📊 Resultado:`, JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      logger.error(`Fatal: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { fetchCNPJsCompletos };
