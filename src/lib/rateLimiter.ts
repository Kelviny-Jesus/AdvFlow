import PQueue from "p-queue";

const TPM_BUDGET = 490000;
const RPM_BUDGET = 490;

export const queue = new PQueue({
  concurrency: 2,
  interval: 60_000,
  intervalCap: RPM_BUDGET,
});

let usedThisMinute = 0;
let windowStart = Date.now();
let tokenCheckLock: Promise<void> | null = null;

function canSpendTokens(n: number): boolean {
  const now = Date.now();

  if (now - windowStart > 60_000) {
    windowStart = now;
    usedThisMinute = 0;
  }

  return usedThisMinute + n <= TPM_BUDGET;
}

function spendTokens(n: number): void {
  usedThisMinute += n;
}

export function releaseTokens(n: number): void {
  usedThisMinute = Math.max(0, usedThisMinute - n);
}

export function getRemainingTokens(): number {
  const now = Date.now();

  if (now - windowStart > 60_000) {
    return TPM_BUDGET;
  }

  return Math.max(0, TPM_BUDGET - usedThisMinute);
}

export function getTimeUntilReset(): number {
  const now = Date.now();
  const elapsed = now - windowStart;

  if (elapsed > 60_000) {
    return 0;
  }

  return 60_000 - elapsed;
}

export async function reserveTokens(n: number): Promise<void> {
  const requestId = Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();

  console.log(`[${requestId}] Tentando reservar ${n} tokens`);
  console.log(`[${requestId}] Estado atual: ${usedThisMinute}/${TPM_BUDGET} tokens usados, ${getRemainingTokens()} disponíveis`);

  if (tokenCheckLock) {
    console.log(`[${requestId}] Aguardando lock ser liberado...`);
  }

  while (tokenCheckLock) {
    await tokenCheckLock;
  }

  console.log(`[${requestId}] Lock adquirido após ${Date.now() - startTime}ms`);

  let releaseLock: () => void;
  tokenCheckLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    let attempts = 0;
    while (!canSpendTokens(n)) {
      attempts++;
      const timeUntilReset = getTimeUntilReset();
      const remaining = getRemainingTokens();
      const needed = n;
      const deficit = needed - remaining;

      console.log(`[${requestId}] Tentativa ${attempts}: Orçamento insuficiente`);
      console.log(`   ├─ Tokens necessários: ${needed}`);
      console.log(`   ├─ Tokens disponíveis: ${remaining}`);
      console.log(`   ├─ Deficit: ${deficit}`);
      console.log(`   ├─ Budget total: ${TPM_BUDGET}`);
      console.log(`   ├─ Tokens já usados: ${usedThisMinute}`);
      console.log(`   ├─ Tempo até reset: ${Math.ceil(timeUntilReset / 1000)}s`);
      console.log(`   └─ Aguardando reset da janela...`);

      await new Promise(r => setTimeout(r, timeUntilReset + 1000));

      console.log(`[${requestId}] Janela resetada. Verificando novamente...`);
    }

    spendTokens(n);
    const elapsed = Date.now() - startTime;

    console.log(`[${requestId}] Tokens reservados com sucesso em ${elapsed}ms`);
    console.log(`   ├─ Tokens reservados: ${n}`);
    console.log(`   ├─ Tokens restantes: ${getRemainingTokens()}/${TPM_BUDGET}`);
    console.log(`   ├─ Utilização atual: ${Math.round((usedThisMinute / TPM_BUDGET) * 100)}%`);
    console.log(`   └─ Próximo reset em: ${Math.ceil(getTimeUntilReset() / 1000)}s`);
  } finally {
    releaseLock!();
    tokenCheckLock = null;
    console.log(`[${requestId}] Lock liberado`);
  }
}

export function logRateLimiterStatus(): void {
  const now = Date.now();
  const elapsed = now - windowStart;
  const remaining = getRemainingTokens();
  const utilizationPercent = Math.round((usedThisMinute / TPM_BUDGET) * 100);

  console.log(`=== STATUS DO RATE LIMITER ===`);
  console.log(`   Budget total: ${TPM_BUDGET} TPM`);
  console.log(`   Tokens usados: ${usedThisMinute}`);
  console.log(`   Tokens disponíveis: ${remaining}`);
  console.log(`   Utilização: ${utilizationPercent}%`);
  console.log(`   Janela iniciada há: ${Math.floor(elapsed / 1000)}s`);
  console.log(`   Próximo reset em: ${Math.ceil(getTimeUntilReset() / 1000)}s`);
  console.log(`   Lock ativo: ${tokenCheckLock ? 'Sim' : 'Não'}`);
  console.log(`================================`);
}
