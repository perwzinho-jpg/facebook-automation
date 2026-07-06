/**
 * 🎯 GERAR 150 CNPJs COMPLETOS COM TODAS INFORMAÇÕES
 * Usa API querybuscas.com para GERAR CNPJs (não buscar)
 * Filtra por: ATIVO + DATA_ABERTURA antes de 2026
 * Salva em JSON estruturado com 1 segundo entre cada geração
 */

const axios = require('axios');
const fs = require('fs');
const logger = require('./src/utils/logger');

async function gerarCNPJCompleto() {
  try {
    const response = await axios.get('https://querybuscas.com/api/geradores/cnpj', {
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

async function gerarCNPJsCompletos() {
  logger.info('\n' + '='.repeat(70));
  logger.info('🎯 GERANDO 150 CNPJs COMPLETOS COM API QUERYBUSCAS');
  logger.info('='.repeat(70) + '\n');

  const cnpjsValidos = [];
  const cnpjsGerados = new Set();
  let tentativas = 0;
  const maxTentativas = 300;

  try {
    logger.info('🚀 Iniciando geração de CNPJs com dados completos...\n');

    while (cnpjsValidos.length < 150 && tentativas < maxTentativas) {
      tentativas++;

      const progress = Math.round((cnpjsValidos.length / 150) * 100);
      const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));

      logger.info(`📊 [${progressBar}] ${cnpjsValidos.length}/150 (${progress}%) - Tentativa ${tentativas}/${maxTentativas}`);

      try {
        logger.info('🔄 Gerando novo CNPJ na API...');

        const resultado = await gerarCNPJCompleto();

        if (!resultado || resultado.Status !== 'success' || !resultado.DADOS_EMPRESA) {
          logger.warn('❌ API não retornou dados válidos\n');
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        const empresa = resultado.DADOS_EMPRESA;
        const cnpj = empresa.CNPJ;

        // Evitar duplicatas
        if (cnpjsGerados.has(cnpj)) {
          logger.warn(`⚠️ CNPJ ${cnpj} já foi capturado antes\n`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        logger.info(`📋 CNPJ GERADO: ${cnpj}`);
        logger.info(`   🏢 Razão Social: ${empresa.RAZAO_SOCIAL}`);
        logger.info(`   📛 Nome Fantasia: ${empresa.NOME_FANTASIA}`);
        logger.info(`   🏷️ Porte: ${empresa.PORTE}`);
        logger.info(`   📅 Data Abertura: ${empresa.DATA_ABERTURA}`);
        logger.info(`   ✓ Situação: ${empresa.SITUACAO}`);
        logger.info(`   📊 Situação Data: ${empresa.DATA_SITUACAO}`);
        logger.info(`   💼 Tipo: ${empresa.TIPO}`);
        logger.info(`   📜 Natureza Jurídica: ${empresa.NATUREZA_JURIDICA}`);
        logger.info(`   💰 Capital Social: ${empresa.CAPITAL_SOCIAL}`);
        logger.info(`   📞 Telefone: ${empresa.TELEFONE}`);
        logger.info(`   ✉️ Email: ${empresa.EMAIL}`);

        // FILTRAR CRITÉRIOS
        // 1. Situação: Ativa
        if (empresa.SITUACAO !== 'Ativa') {
          logger.warn(`❌ FILTRADO: Situação "${empresa.SITUACAO}" (precisa ser ATIVA)\n`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        // 2. Data de abertura: Anterior a 2026
        const dataAbertura = new Date(empresa.DATA_ABERTURA);
        const ano = dataAbertura.getFullYear();

        if (ano >= 2026) {
          logger.warn(`❌ FILTRADO: Aberto em ${ano} (precisa ser antes de 2026)\n`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        // 3. Porte: MEI ou Microempresa
        const ehMEI = empresa.OPTANTE_MEI === 'Sim' ||
                      empresa.PORTE?.includes('MEI') ||
                      empresa.PORTE?.includes('Micro');

        if (!ehMEI) {
          logger.warn(`❌ FILTRADO: Porte "${empresa.PORTE}" (precisa ser MEI/Microempresa)\n`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        // ✅ CNPJ VÁLIDO!
        logger.info('✅ PASSOU EM TODOS OS FILTROS! Adicionando à lista...');

        // Log dos sócios
        if (resultado.SOCIOS && resultado.SOCIOS.QTD > 0) {
          logger.info(`   👤 Sócios (${resultado.SOCIOS.QTD}):`);
          resultado.SOCIOS.DADOS.forEach((socio, idx) => {
            logger.info(`      ${idx + 1}. ${socio.NOME} (CPF: ${socio.CPF_CNPJ})`);
          });
        }

        // Log de endereços
        if (resultado.HISTORICO_ENDERECOS && resultado.HISTORICO_ENDERECOS.QTD > 0) {
          logger.info(`   📍 Endereços (${resultado.HISTORICO_ENDERECOS.QTD}):`);
          resultado.HISTORICO_ENDERECOS.DADOS.forEach((end, idx) => {
            logger.info(`      ${idx + 1}. ${end.LOGRADOURO}, ${end.NUMERO} - ${end.BAIRRO}, ${end.CIDADE}-${end.UF}`);
          });
        }

        // Log de emails
        if (resultado.EMAILS && resultado.EMAILS.QTD > 0) {
          logger.info(`   ✉️ Emails: ${resultado.EMAILS.DADOS.join(', ')}`);
        }

        // Adicionar à lista
        cnpjsGerados.add(cnpj);
        cnpjsValidos.push({
          ordem: cnpjsValidos.length + 1,
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
          OPTANTE_SIMPLES: empresa.OPTANTE_SIMPLES,
          OPTANTE_MEI: empresa.OPTANTE_MEI,
          CNAE_PRINCIPAL: empresa.CNAE_PRINCIPAL,
          EMAIL: empresa.EMAIL,
          TELEFONE: empresa.TELEFONE,
          SOCIOS: resultado.SOCIOS,
          ENDERECOS: resultado.HISTORICO_ENDERECOS,
          EMAILS_LISTA: resultado.EMAILS,
          TELEFONES: resultado.HISTORICO_TELEFONES,
          CNAES: resultado.CNAE,
          DADOS_COMPLETOS: resultado
        });

        logger.info(`\n✅ CNPJ #${cnpjsValidos.length}/150 adicionado com sucesso!\n`);

        // Aguardar 1 segundo antes da próxima geração
        await new Promise(r => setTimeout(r, 1000));

      } catch (error) {
        logger.warn(`⚠️ Erro na geração: ${error.message}\n`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    logger.info(`\n✅ Total de CNPJs válidos gerados: ${cnpjsValidos.length}\n`);

    if (cnpjsValidos.length === 0) {
      logger.error('❌ Nenhum CNPJ foi gerado com os critérios!\n');
      return { success: false, error: 'Nenhum CNPJ gerado' };
    }

    // SALVAR EM ARQUIVO JSON COMPLETO
    logger.info('💾 Salvando CNPJs completos em JSON...');

    const cnpjData = {
      metadata: {
        total: cnpjsValidos.length,
        filtros: {
          situacao: 'Ativa',
          data_abertura: 'Anterior a 2026',
          porte: 'MEI/Microempresa'
        },
        data_geracao: new Date().toISOString(),
        tempo_total: `${Math.round((tentativas / 60))} minutos`
      },
      cnpjs: cnpjsValidos
    };

    fs.writeFileSync('cnpj-lista-completa.json', JSON.stringify(cnpjData, null, 2), 'utf8');
    logger.info('✅ Arquivo salvo: cnpj-lista-completa.json\n');

    // SALVAR APENAS CNPJs EM TXT
    logger.info('💾 Salvando apenas CNPJs em TXT...');

    const cnpjTxt = cnpjsValidos
      .map(c => `${c.CNPJ}|${c.RAZAO_SOCIAL}|${c.EMAIL}|${c.TELEFONE}`)
      .join('\n');

    fs.writeFileSync('cnpj-lista.txt', cnpjTxt, 'utf8');
    logger.info('✅ Arquivo salvo: cnpj-lista.txt\n');

    // SALVAR TAMBÉM EM CSV
    logger.info('💾 Salvando dados estruturados em CSV...');

    const csvHeader = 'ORDEM,CNPJ,RAZAO_SOCIAL,NOME_FANTASIA,PORTE,DATA_ABERTURA,SITUACAO,EMAIL,TELEFONE,CAPITAL_SOCIAL';
    const csvRows = cnpjsValidos.map(c =>
      `${c.ordem},"${c.CNPJ}","${c.RAZAO_SOCIAL}","${c.NOME_FANTASIA}","${c.PORTE}","${c.DATA_ABERTURA}","${c.SITUACAO}","${c.EMAIL}","${c.TELEFONE}","${c.CAPITAL_SOCIAL}"`
    ).join('\n');

    fs.writeFileSync('cnpj-lista.csv', `${csvHeader}\n${csvRows}`, 'utf8');
    logger.info('✅ Arquivo salvo: cnpj-lista.csv\n');

    logger.info('='.repeat(70));
    logger.info('✅ GERAÇÃO CONCLUÍDA COM SUCESSO!');
    logger.info('='.repeat(70));
    logger.info(`\n📊 Arquivos gerados:\n`);
    logger.info(`   1. cnpj-lista-completa.json - Dados completos em JSON`);
    logger.info(`   2. cnpj-lista.txt - CNPJs com informações principais`);
    logger.info(`   3. cnpj-lista.csv - Dados estruturados em CSV\n`);

    return {
      success: true,
      count: cnpjsValidos.length,
      files: ['cnpj-lista-completa.json', 'cnpj-lista.txt', 'cnpj-lista.csv']
    };

  } catch (error) {
    logger.error(`❌ ERRO FATAL: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// Executar
if (require.main === module) {
  gerarCNPJsCompletos()
    .then(result => {
      logger.info(`\n📊 Resultado Final:`, JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      logger.error(`Fatal: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { gerarCNPJsCompletos };
