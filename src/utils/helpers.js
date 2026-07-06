const validator = require('validator');
const logger = require('./logger');

class Helpers {
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }

  static generateRandomEmail(domain = 'gmail.com') {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let email = '';
    for (let i = 0; i < 8; i++) {
      email += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${email}@${domain}`;
  }

  static generateCPF() {
    let cpf = '';
    for (let i = 0; i < 9; i++) {
      cpf += Math.floor(Math.random() * 10).toString();
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    digit1 = digit1 === 10 || digit1 === 11 ? 0 : digit1;

    cpf += digit1.toString();
    sum = 0;

    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    digit2 = digit2 === 10 || digit2 === 11 ? 0 : digit2;

    cpf += digit2.toString();
    return cpf;
  }

  static formatCPF(cpf) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  static formatCNPJ(cnpj) {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  static sanitizeDomain(domain) {
    return domain.toLowerCase().trim().replace(/https?:\/\//, '').replace(/\/$/, '');
  }

  static validateEmail(email) {
    return validator.isEmail(email);
  }

  static validateCNPJ(cnpj) {
    cnpj = cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    return true;
  }

  static randomUserAgent() {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  static async retry(fn, attempts = 3, delay = 1000) {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === attempts - 1) throw error;
        logger.warn(`Tentativa ${i + 1} falhou, aguardando ${delay}ms...`);
        await this.delay(delay);
      }
    }
  }

  static getUIDFromURL(url) {
    const match = url.match(/id=(\d+)/);
    return match ? match[1] : null;
  }

  static extractMetaTagID(html) {
    const match = html.match(/meta-tag-id['":\s]+["']?(\w+)/i);
    return match ? match[1] : null;
  }

  static generateWorkerCode(metaTagId) {
    return `
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const response = await fetch(request);
  const text = await response.text();

  const modified = text.replace(
    /<head>/,
    '<head><meta property="fb:domain_verification" content="${metaTagId}" />'
  );

  return new Response(modified, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
    `.trim();
  }
}

module.exports = Helpers;
