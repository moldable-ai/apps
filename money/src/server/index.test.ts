import { app } from './app'
import { shouldRewriteClientRequestPath } from './index'
import { resolveStaticFilePath } from './static'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('resolveStaticFilePath', () => {
  it('resolves built asset paths under dist', () => {
    const filePath = resolveStaticFilePath('/assets/index-abc123.js')
    const expectedPath = path.join(
      process.cwd(),
      'dist',
      'assets/index-abc123.js',
    )

    expect(filePath).toBe(expectedPath)
    expect(path.relative(path.join(process.cwd(), 'dist'), filePath)).toBe(
      'assets/index-abc123.js',
    )
  })
})

describe('shouldRewriteClientRequestPath', () => {
  it('keeps Vite internal module paths intact in dev', () => {
    expect(shouldRewriteClientRequestPath('/@vite/client')).toBe(false)
    expect(shouldRewriteClientRequestPath('/@react-refresh')).toBe(false)
    expect(shouldRewriteClientRequestPath('/src/client/main.tsx')).toBe(false)
  })

  it('rewrites app routes to the SPA entry', () => {
    expect(shouldRewriteClientRequestPath('/')).toBe(true)
    expect(shouldRewriteClientRequestPath('/plaid/oauth-return')).toBe(true)
  })
})

describe('money routes', () => {
  let previousDataDir: string | undefined
  let previousAivaultBin: string | undefined
  let previousAiServerUrl: string | undefined
  let previousAppId: string | undefined
  let previousAppToken: string | undefined
  let previousNodeEnv: string | undefined
  let previousMoneyEnableDevSeed: string | undefined
  let dataDir: string

  beforeEach(async () => {
    previousDataDir = process.env.MOLDABLE_APP_DATA_DIR
    previousAivaultBin = process.env.AIVAULT_BIN
    previousAiServerUrl = process.env.MOLDABLE_AI_SERVER_URL
    previousAppId = process.env.MOLDABLE_APP_ID
    previousAppToken = process.env.MOLDABLE_APP_TOKEN
    previousNodeEnv = process.env.NODE_ENV
    previousMoneyEnableDevSeed = process.env.MONEY_ENABLE_DEV_SEED
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'money-app-test-'))
    process.env.MOLDABLE_APP_DATA_DIR = dataDir
  })

  afterEach(async () => {
    if (previousDataDir) {
      process.env.MOLDABLE_APP_DATA_DIR = previousDataDir
    } else {
      delete process.env.MOLDABLE_APP_DATA_DIR
    }
    if (previousAivaultBin) {
      process.env.AIVAULT_BIN = previousAivaultBin
    } else {
      delete process.env.AIVAULT_BIN
    }
    if (previousAiServerUrl) {
      process.env.MOLDABLE_AI_SERVER_URL = previousAiServerUrl
    } else {
      delete process.env.MOLDABLE_AI_SERVER_URL
    }
    if (previousAppId) {
      process.env.MOLDABLE_APP_ID = previousAppId
    } else {
      delete process.env.MOLDABLE_APP_ID
    }
    if (previousAppToken) {
      process.env.MOLDABLE_APP_TOKEN = previousAppToken
    } else {
      delete process.env.MOLDABLE_APP_TOKEN
    }
    if (previousNodeEnv) {
      process.env.NODE_ENV = previousNodeEnv
    } else {
      delete process.env.NODE_ENV
    }
    if (previousMoneyEnableDevSeed) {
      process.env.MONEY_ENABLE_DEV_SEED = previousMoneyEnableDevSeed
    } else {
      delete process.env.MONEY_ENABLE_DEV_SEED
    }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    await fs.rm(dataDir, { recursive: true, force: true })
  })

  it('seeds raw data and returns evaluated cards', async () => {
    const seedResponse = await app.request('/api/dev/seed', {
      method: 'POST',
    })
    expect(seedResponse.status).toBe(200)

    const snapshotResponse = await app.request('/api/money/snapshot')
    expect(snapshotResponse.status).toBe(200)
    const snapshot = (await snapshotResponse.json()) as {
      accounts: unknown[]
      transactions: unknown[]
      cards: Array<{
        id: string
        displayValue: string
        referencedCollections?: string[]
      }>
    }

    expect(snapshot.accounts.length).toBeGreaterThan(0)
    expect(snapshot.transactions.length).toBeGreaterThan(0)
    expect(snapshot.cards.find((card) => card.id === 'net-worth')).toEqual(
      expect.objectContaining({
        displayValue: '$107,251',
        referencedCollections: ['Accounts'],
      }),
    )
  })

  it('rejects synthetic seed data in production unless explicitly enabled', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.MONEY_ENABLE_DEV_SEED

    const seedResponse = await app.request('/api/dev/seed', {
      method: 'POST',
    })

    expect(seedResponse.status).toBe(404)
    expect(await seedResponse.json()).toEqual({
      error: {
        code: 'dev_seed_disabled',
        message: 'Demo seed data is disabled in production builds.',
      },
    })
  })

  it('quarantines corrupt storage shards and falls back to defaults', async () => {
    const accountsPath = path.join(dataDir, 'accounts.json')
    await fs.writeFile(accountsPath, '{ invalid json', 'utf8')

    const response = await app.request('/api/accounts')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ accounts: [], total: 0 })
    await expect(fs.stat(accountsPath)).rejects.toMatchObject({
      code: 'ENOENT',
    })
    const entries = await fs.readdir(dataDir)
    expect(
      entries.some((entry) => /^accounts\.json\.corrupt-/.test(entry)),
    ).toBe(true)
  })

  it('materializes warehouse projections for card and data-health reads', async () => {
    const seedResponse = await app.request('/api/dev/seed', {
      method: 'POST',
    })
    expect(seedResponse.status).toBe(200)

    const rebuildResponse = await app.request('/api/warehouse/rebuild', {
      method: 'POST',
    })
    expect(rebuildResponse.status).toBe(200)
    const rebuild = (await rebuildResponse.json()) as {
      ok: boolean
      aggregates: { monthly: { buildMs: number; count: number } }
      indexes: { transactions: { buildMs: number; count: number } }
      projections: {
        cards: { buildMs: number }
        dataHealth: { buildMs: number }
      }
    }
    expect(rebuild.ok).toBe(true)
    expect(rebuild.projections.cards.buildMs).toBeGreaterThanOrEqual(0)
    expect(rebuild.projections.dataHealth.buildMs).toBeGreaterThanOrEqual(0)
    expect(rebuild.aggregates.monthly.count).toBeGreaterThan(0)
    expect(rebuild.indexes.transactions.count).toBe(5)

    await expect(
      fs.stat(path.join(dataDir, 'projections', 'cards', 'current.json')),
    ).resolves.toEqual(
      expect.objectContaining({ isFile: expect.any(Function) }),
    )
    await expect(
      fs.stat(path.join(dataDir, 'projections', 'data-health', 'current.json')),
    ).resolves.toEqual(
      expect.objectContaining({ isFile: expect.any(Function) }),
    )
    await expect(
      fs.stat(path.join(dataDir, 'aggregates', 'monthly', 'current.json')),
    ).resolves.toEqual(
      expect.objectContaining({ isFile: expect.any(Function) }),
    )
    await expect(
      fs.stat(path.join(dataDir, 'indexes', 'transactions', 'current.json')),
    ).resolves.toEqual(
      expect.objectContaining({ isFile: expect.any(Function) }),
    )

    const statusResponse = await app.request('/api/warehouse/status')
    expect(statusResponse.status).toBe(200)
    const status = (await statusResponse.json()) as {
      dirty: unknown[]
      projections: {
        cards: { exists: boolean; stale: boolean }
        dataHealth: { exists: boolean; stale: boolean }
      }
      aggregates: {
        monthly: { exists: boolean; stale: boolean; count: number }
      }
      indexes: {
        transactions: { exists: boolean; stale: boolean; count: number }
      }
    }
    expect(status.dirty).toEqual([])
    expect(status.projections.cards).toEqual(
      expect.objectContaining({ exists: true, stale: false }),
    )
    expect(status.projections.dataHealth).toEqual(
      expect.objectContaining({ exists: true, stale: false }),
    )
    expect(status.aggregates.monthly).toEqual(
      expect.objectContaining({
        exists: true,
        stale: false,
        count: expect.any(Number),
      }),
    )
    expect(status.indexes.transactions).toEqual(
      expect.objectContaining({ exists: true, stale: false, count: 5 }),
    )

    const cardsResponse = await app.request('/api/cards')
    expect(cardsResponse.status).toBe(200)
    const cards = (await cardsResponse.json()) as {
      definitions: unknown[]
      cards: Array<{ id: string; displayValue: string }>
      warehouse?: { stale: boolean; recomputing: boolean }
    }
    expect(cards.warehouse).toEqual(
      expect.objectContaining({ stale: false, recomputing: false }),
    )
    expect(cards.definitions.length).toBeGreaterThan(0)
    expect(cards.cards.find((card) => card.id === 'net-worth')).toEqual(
      expect.objectContaining({ displayValue: '$107,251' }),
    )

    const aggregateFormulaResponse = await app.request(
      '/api/formulas/preview',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formula: 'Expenses.MonthlyAverage(6)' }),
      },
    )
    expect(aggregateFormulaResponse.status).toBe(200)
    const aggregateFormula = (await aggregateFormulaResponse.json()) as {
      result: {
        value: number
        execution?: { source: string; artifact: string }
      }
    }
    expect(aggregateFormula.result.value).toBeGreaterThan(0)
    expect(aggregateFormula.result.execution).toEqual(
      expect.objectContaining({
        source: 'aggregate',
        artifact: 'aggregates/monthly/current.json',
      }),
    )

    const indexedAccountResponse = await app.request(
      '/api/transactions?accountId=seed-credit-card&limit=2',
    )
    expect(indexedAccountResponse.status).toBe(200)
    const indexedAccount = (await indexedAccountResponse.json()) as {
      transactions: Array<{ id: string; accountId?: string }>
      total: number
      hasMore: boolean
      warehouse?: {
        source: string
        indexed: boolean
        index: string
        key: string
      }
    }
    expect(indexedAccount).toEqual(
      expect.objectContaining({
        total: 3,
        hasMore: true,
        warehouse: expect.objectContaining({
          source: 'index',
          indexed: true,
          index: 'account',
          key: 'seed-credit-card',
        }),
      }),
    )
    expect(indexedAccount.transactions).toHaveLength(2)
    expect(
      indexedAccount.transactions.every(
        (transaction) => transaction.accountId === 'seed-credit-card',
      ),
    ).toBe(true)

    const indexedCategoryResponse = await app.request(
      '/api/transactions?category=Subscription',
    )
    expect(indexedCategoryResponse.status).toBe(200)
    const indexedCategory = (await indexedCategoryResponse.json()) as {
      total: number
      warehouse?: {
        source: string
        indexed: boolean
        index: string
        key: string
      }
    }
    expect(indexedCategory).toEqual(
      expect.objectContaining({
        total: 2,
        warehouse: expect.objectContaining({
          source: 'index',
          indexed: true,
          index: 'category',
          key: 'subscription',
        }),
      }),
    )

    const rpcCardsResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.cards.list' }),
    })
    expect(rpcCardsResponse.status).toBe(200)
    const rpcCards = (await rpcCardsResponse.json()) as {
      ok: boolean
      result: { cards: Array<{ id: string }> }
    }
    expect(rpcCards.ok).toBe(true)
    expect(rpcCards.result.cards.some((card) => card.id === 'net-worth')).toBe(
      true,
    )

    const rpcStatusResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.warehouse.status' }),
    })
    expect(rpcStatusResponse.status).toBe(200)
    const rpcStatus = (await rpcStatusResponse.json()) as {
      ok: boolean
      result: {
        projections: {
          cards: { exists: boolean; stale: boolean }
          dataHealth: { exists: boolean; stale: boolean }
        }
      }
    }
    expect(rpcStatus.ok).toBe(true)
    expect(rpcStatus.result.projections.cards).toEqual(
      expect.objectContaining({ exists: true, stale: false }),
    )
    expect(rpcStatus.result.projections.dataHealth).toEqual(
      expect.objectContaining({ exists: true, stale: false }),
    )

    const projectedCardResponse = await app.request('/api/cards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'projection-smoke-card',
        title: 'Projection Smoke Card',
        kind: 'metric',
        primaryFormula: 'Accounts.Sum()',
        format: 'currency',
      }),
    })
    expect(projectedCardResponse.status).toBe(200)
    const projectedCardsResponse = await app.request('/api/cards')
    expect(projectedCardsResponse.status).toBe(200)
    const projectedCards = (await projectedCardsResponse.json()) as {
      cards: Array<{ id: string; displayValue: string }>
      warehouse?: { stale: boolean; recomputing: boolean }
    }
    expect(projectedCards.warehouse).toEqual(
      expect.objectContaining({ stale: false, recomputing: false }),
    )
    expect(projectedCards.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'projection-smoke-card',
          displayValue: '$107,251',
        }),
      ]),
    )

    const searchResponse = await app.request('/api/transactions?q=netflix')
    expect(searchResponse.status).toBe(200)
    const search = (await searchResponse.json()) as {
      transactions: Array<{ id: string; date: string }>
    }
    const transactionId = search.transactions[0]?.id
    const dirtyMonth = search.transactions[0]?.date.slice(0, 7)
    expect(transactionId).toBeTruthy()
    expect(dirtyMonth).toBeTruthy()

    const patchResponse = await app.request(
      `/api/transactions/${transactionId}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userCategory: 'Entertainment' }),
      },
    )
    expect(patchResponse.status).toBe(200)
    await new Promise((resolve) => setTimeout(resolve, 25))

    const staleStatusResponse = await app.request('/api/warehouse/status')
    expect(staleStatusResponse.status).toBe(200)
    const staleStatus = (await staleStatusResponse.json()) as {
      dirty: unknown[]
      recomputing: boolean
      projections: { cards: { stale: boolean } }
      aggregates: { monthly: { stale: boolean } }
      indexes: { transactions: { stale: boolean } }
    }
    expect(staleStatus.recomputing).toBe(false)
    expect(staleStatus.dirty.length).toBeGreaterThan(0)
    expect(staleStatus.projections.cards.stale).toBe(false)
    expect(staleStatus.aggregates.monthly.stale).toBe(true)
    expect(staleStatus.indexes.transactions.stale).toBe(true)

    const staleCardsResponse = await app.request('/api/cards')
    expect(staleCardsResponse.status).toBe(200)
    const staleCards = (await staleCardsResponse.json()) as {
      cards: Array<{ id: string }>
      warehouse?: { stale: boolean; recomputing: boolean }
    }
    expect(staleCards.cards.length).toBeGreaterThan(0)
    expect(staleCards.warehouse).toEqual(
      expect.objectContaining({ stale: false, recomputing: false }),
    )

    const dirtyRebuildResponse = await app.request(
      '/api/warehouse/rebuild?scope=dirty',
      {
        method: 'POST',
      },
    )
    expect(dirtyRebuildResponse.status).toBe(200)
    const dirtyRebuild = (await dirtyRebuildResponse.json()) as {
      ok: boolean
      scope: string
      requestedScope: string
      dirtyMonths: string[]
      dirtyBefore: Array<{ scope: string; partition?: string }>
    }
    expect(dirtyRebuild).toEqual(
      expect.objectContaining({
        ok: true,
        scope: 'dirty',
        requestedScope: 'dirty',
        dirtyMonths: expect.arrayContaining([dirtyMonth]),
      }),
    )
    expect(dirtyRebuild.dirtyBefore).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: 'transactions',
          partition: dirtyMonth,
        }),
      ]),
    )

    const entertainmentResponse = await app.request(
      '/api/transactions?category=Entertainment',
    )
    expect(entertainmentResponse.status).toBe(200)
    const entertainment = (await entertainmentResponse.json()) as {
      total: number
      warehouse?: {
        source: string
        indexed: boolean
        index: string
        key: string
      }
    }
    expect(entertainment).toEqual(
      expect.objectContaining({
        total: 1,
        warehouse: expect.objectContaining({
          source: 'index',
          indexed: true,
          index: 'category',
          key: 'entertainment',
        }),
      }),
    )

    const cleanStatusResponse = await app.request('/api/warehouse/status')
    expect(cleanStatusResponse.status).toBe(200)
    const cleanStatus = (await cleanStatusResponse.json()) as {
      dirty: unknown[]
      aggregates: { monthly: { stale: boolean } }
      indexes: { transactions: { stale: boolean } }
    }
    expect(cleanStatus.dirty).toEqual([])
    expect(cleanStatus.aggregates.monthly.stale).toBe(false)
    expect(cleanStatus.indexes.transactions.stale).toBe(false)

    const amazonResponse = await app.request('/api/transactions?q=amazon')
    expect(amazonResponse.status).toBe(200)
    const amazon = (await amazonResponse.json()) as {
      transactions: Array<{ id: string }>
    }
    const amazonId = amazon.transactions[0]?.id
    expect(amazonId).toBeTruthy()
    const amazonPatchResponse = await app.request(
      `/api/transactions/${amazonId}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userCategory: 'Shopping' }),
      },
    )
    expect(amazonPatchResponse.status).toBe(200)
    await new Promise((resolve) => setTimeout(resolve, 25))

    const asyncRebuildResponse = await app.request(
      '/api/warehouse/rebuild?async=true&scope=dirty',
      {
        method: 'POST',
      },
    )
    expect([200, 202]).toContain(asyncRebuildResponse.status)
    const asyncRebuild = (await asyncRebuildResponse.json()) as {
      ok: boolean
      started: boolean
      running: boolean
      job?: { state: string; scope?: string; requestedScope?: string }
      status?: { recomputing: boolean }
    }
    expect(asyncRebuild).toEqual(
      expect.objectContaining({
        ok: true,
        running: true,
      }),
    )
    expect(asyncRebuild.job).toEqual(
      expect.objectContaining({ scope: 'dirty', requestedScope: 'dirty' }),
    )

    type WarehouseStatusForTest = {
      dirty: unknown[]
      recomputing: boolean
      projections: { cards: { stale: boolean } }
    }
    let settledStatus: WarehouseStatusForTest | null = null
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25))
      const pollResponse = await app.request('/api/warehouse/status')
      expect(pollResponse.status).toBe(200)
      const polled = (await pollResponse.json()) as WarehouseStatusForTest
      if (!polled.recomputing && polled.dirty.length === 0) {
        settledStatus = polled
        break
      }
    }
    expect(settledStatus).toEqual(
      expect.objectContaining({
        dirty: [],
        recomputing: false,
        projections: expect.objectContaining({
          cards: expect.objectContaining({ stale: false }),
        }),
      }),
    )
  })

  it('runs raw imports as a background job and keeps warehouse status observable', async () => {
    const seedResponse = await app.request('/api/dev/seed', {
      method: 'POST',
    })
    expect(seedResponse.status).toBe(200)

    const rebuildResponse = await app.request('/api/warehouse/rebuild', {
      method: 'POST',
    })
    expect(rebuildResponse.status).toBe(200)

    const beforeCardsResponse = await app.request('/api/cards')
    expect(beforeCardsResponse.status).toBe(200)
    const beforeCards = (await beforeCardsResponse.json()) as {
      warehouse?: { stale: boolean; recomputing: boolean }
      cards: Array<{ id: string }>
    }
    expect(beforeCards.warehouse).toEqual(
      expect.objectContaining({ stale: false, recomputing: false }),
    )
    expect(beforeCards.cards.length).toBeGreaterThan(0)

    const importResponse = await app.request('/api/import/raw?async=true', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'async-extra-expense',
            source: 'seed',
            name: 'Async Extra Expense',
            amount: 123,
            direction: 'expense',
            category: ['Testing'],
            date: '2026-06-05',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(202)
    const importStarted = (await importResponse.json()) as {
      started: boolean
      running: boolean
      job: { state: string; phase: string; incomingTransactions: number }
      warehouse: {
        busy: boolean
        importing: boolean
        importJob?: { state: string }
      }
    }
    expect(importStarted).toEqual(
      expect.objectContaining({
        started: true,
        running: true,
        job: expect.objectContaining({
          state: 'running',
          incomingTransactions: 1,
        }),
      }),
    )
    expect(importStarted.warehouse.importJob).toEqual(
      expect.objectContaining({ state: 'running' }),
    )

    type ImportStatusForTest = {
      job: {
        state: string
        phase: string
        transactions?: number
        refreshedMetrics?: number
      } | null
      warehouse: {
        busy: boolean
        importing: boolean
        dirty: unknown[]
        projections: { cards: { stale: boolean } }
        indexes: { transactions: { stale: boolean; count: number } }
      }
    }
    let settled: ImportStatusForTest | null = null
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25))
      const statusResponse = await app.request('/api/import/status')
      expect(statusResponse.status).toBe(200)
      const status = (await statusResponse.json()) as ImportStatusForTest
      if (status.job?.state === 'complete') {
        settled = status
        break
      }
    }

    expect(settled).toEqual(
      expect.objectContaining({
        job: expect.objectContaining({
          state: 'complete',
          phase: 'complete',
          transactions: 6,
          refreshedMetrics: expect.any(Number),
        }),
        warehouse: expect.objectContaining({
          busy: false,
          importing: false,
          dirty: [],
          projections: expect.objectContaining({
            cards: expect.objectContaining({ stale: false }),
          }),
          indexes: expect.objectContaining({
            transactions: expect.objectContaining({ stale: false, count: 6 }),
          }),
        }),
      }),
    )

    const rpcStatusResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.import.status' }),
    })
    expect(rpcStatusResponse.status).toBe(200)
    const rpcStatus = (await rpcStatusResponse.json()) as {
      ok: boolean
      result: ImportStatusForTest
    }
    expect(rpcStatus.ok).toBe(true)
    expect(rpcStatus.result.job).toEqual(
      expect.objectContaining({ state: 'complete', phase: 'complete' }),
    )
  })

  it('returns summary, accounts, searchable transactions, and patched overrides', async () => {
    await app.request('/api/dev/seed', { method: 'POST' })

    const summaryResponse = await app.request('/api/summary')
    expect(summaryResponse.status).toBe(200)
    const summary = (await summaryResponse.json()) as {
      accountCount: number
      transactionCount: number
      netWorth: number
      cashFlow: number
      savingsRate: number
    }
    expect(summary).toEqual(
      expect.objectContaining({
        accountCount: 4,
        transactionCount: 5,
        netWorth: 107251,
        cashFlow: 5521,
      }),
    )
    expect(summary.savingsRate).toBeCloseTo(0.6, 2)

    const accountsResponse = await app.request('/api/accounts')
    expect(accountsResponse.status).toBe(200)
    const accountsBody = (await accountsResponse.json()) as {
      accounts: Array<{
        id: string
        valueForSum?: number
        isLiability?: boolean
      }>
      total: number
    }
    expect(accountsBody.total).toBe(4)
    expect(
      accountsBody.accounts.find(
        (account) => account.id === 'seed-credit-card',
      ),
    ).toEqual(
      expect.objectContaining({
        valueForSum: -2712,
        isLiability: true,
      }),
    )

    const searchResponse = await app.request('/api/transactions?q=netflix')
    expect(searchResponse.status).toBe(200)
    const searchBody = (await searchResponse.json()) as {
      transactions: Array<{ id: string; userCategory?: string }>
      total: number
    }
    expect(searchBody.total).toBe(1)

    const transactionId = searchBody.transactions[0]?.id
    expect(transactionId).toBeTruthy()

    const transactionResponse = await app.request(
      `/api/transactions/${transactionId}`,
    )
    expect(transactionResponse.status).toBe(200)
    const transactionBody = (await transactionResponse.json()) as {
      transaction: { id: string; merchantName?: string }
    }
    expect(transactionBody.transaction).toEqual(
      expect.objectContaining({
        id: transactionId,
        merchantName: expect.stringMatching(/Netflix/i),
      }),
    )

    const firstRunResponse = await app.request('/api/first-run')
    expect(firstRunResponse.status).toBe(200)
    const firstRun = (await firstRunResponse.json()) as {
      accountsConnected: boolean
      accountCount: number
      connectionCount: number
      dataMode: string
    }
    expect(firstRun).toEqual(
      expect.objectContaining({
        accountsConnected: true,
        accountCount: 4,
        connectionCount: 0,
        dataMode: 'demo',
      }),
    )

    const rpcTransactionResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.get',
        params: { id: transactionId },
      }),
    })
    expect(rpcTransactionResponse.status).toBe(200)
    const rpcTransaction = (await rpcTransactionResponse.json()) as {
      ok: boolean
      result: { transaction: { id: string } }
    }
    expect(rpcTransaction).toEqual(
      expect.objectContaining({
        ok: true,
        result: {
          transaction: expect.objectContaining({ id: transactionId }),
        },
      }),
    )

    const patchResponse = await app.request(
      `/api/transactions/${transactionId}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userCategory: 'Joy',
          notes: 'Keep this subscription for now',
        }),
      },
    )
    expect(patchResponse.status).toBe(200)

    const joyResponse = await app.request('/api/transactions?category=Joy')
    const joyBody = (await joyResponse.json()) as {
      transactions: Array<{ id: string; userCategory?: string; notes?: string }>
      total: number
    }
    expect(joyBody.total).toBe(1)
    expect(joyBody.transactions[0]).toEqual(
      expect.objectContaining({
        id: transactionId,
        userCategory: 'Joy',
        notes: 'Keep this subscription for now',
      }),
    )

    const pagedResponse = await app.request(
      '/api/transactions?limit=2&offset=2',
    )
    expect(pagedResponse.status).toBe(200)
    const pagedBody = (await pagedResponse.json()) as {
      transactions: Array<{ id: string }>
      total: number
      limit: number
      offset: number
      hasMore: boolean
      nextCursor?: string
    }
    expect(pagedBody).toEqual(
      expect.objectContaining({
        total: 5,
        limit: 2,
        offset: 2,
        hasMore: true,
        nextCursor: 'offset:4',
      }),
    )
    expect(pagedBody.transactions.map((transaction) => transaction.id)).toEqual(
      ['seed-groceries', 'seed-rent'],
    )

    const cursorResponse = await app.request(
      `/api/transactions?limit=2&cursor=${encodeURIComponent(pagedBody.nextCursor ?? '')}`,
    )
    expect(cursorResponse.status).toBe(200)
    const cursorBody = (await cursorResponse.json()) as {
      transactions: Array<{ id: string }>
      total: number
      offset: number
      hasMore: boolean
      nextCursor?: string
    }
    expect(cursorBody).toEqual(
      expect.objectContaining({
        total: 5,
        offset: 4,
        hasMore: false,
      }),
    )
    expect(cursorBody.nextCursor).toBeUndefined()
    expect(
      cursorBody.transactions.map((transaction) => transaction.id),
    ).toEqual(['seed-income-payroll'])
  })

  it('stores balance snapshots from imports and exposes snapshot-backed formulas', async () => {
    const firstImport = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [
          {
            id: 'checking-history',
            source: 'manual',
            name: 'Checking',
            type: 'cash',
            currentBalance: 1000,
            isoCurrencyCode: 'USD',
            asOf: '2026-01-31T00:00:00.000Z',
          },
          {
            id: 'card-history',
            source: 'manual',
            name: 'Card',
            type: 'credit',
            currentBalance: -100,
            isoCurrencyCode: 'USD',
            asOf: '2026-01-31T00:00:00.000Z',
          },
        ],
        transactions: [],
      }),
    })
    expect(firstImport.status).toBe(200)

    const secondImport = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [
          {
            id: 'checking-history',
            source: 'manual',
            name: 'Checking',
            type: 'cash',
            currentBalance: 1500,
            isoCurrencyCode: 'USD',
            asOf: '2026-02-28T00:00:00.000Z',
          },
          {
            id: 'card-history',
            source: 'manual',
            name: 'Card',
            type: 'credit',
            currentBalance: -200,
            isoCurrencyCode: 'USD',
            asOf: '2026-02-28T00:00:00.000Z',
          },
        ],
        transactions: [],
      }),
    })
    expect(secondImport.status).toBe(200)

    const snapshotsResponse = await app.request(
      '/api/balance-snapshots?kind=netWorth&limit=1',
    )
    expect(snapshotsResponse.status).toBe(200)
    const snapshotsBody = (await snapshotsResponse.json()) as {
      snapshots: Array<{ kind: string; date: string; value: number }>
      total: number
      hasMore: boolean
      nextCursor?: string
    }
    expect(snapshotsBody.total).toBe(2)
    expect(snapshotsBody.hasMore).toBe(true)
    expect(snapshotsBody.snapshots[0]).toEqual(
      expect.objectContaining({
        kind: 'netWorth',
        date: '2026-02-28',
        value: 1300,
      }),
    )

    const formulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'NetWorthHistory.Monthly().Trend()' }),
    })
    expect(formulaResponse.status).toBe(200)
    const formulaBody = (await formulaResponse.json()) as {
      result: {
        value: {
          type: string
          points: Array<{ key: string; value: number; count: number }>
        }
      }
    }
    expect(formulaBody.result.value).toEqual({
      type: 'series',
      points: [
        expect.objectContaining({ key: '2026-01', value: 900, count: 1 }),
        expect.objectContaining({ key: '2026-02', value: 1300, count: 1 }),
      ],
    })

    const rpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.balanceSnapshots.list',
        params: {
          kind: 'liabilities',
          startDate: '2026-02-01',
          endDate: '2026-02-28',
        },
      }),
    })
    expect(rpcResponse.status).toBe(200)
    const rpcBody = (await rpcResponse.json()) as {
      ok: boolean
      result: { total: number; snapshots: Array<{ value: number }> }
    }
    expect(rpcBody.ok).toBe(true)
    expect(rpcBody.result.total).toBe(1)
    expect(rpcBody.result.snapshots[0]?.value).toBe(200)
  })

  it('derives current balance snapshots when legacy workspaces have account facts but no snapshot shards', async () => {
    await fs.writeFile(
      path.join(dataDir, 'accounts.json'),
      JSON.stringify(
        [
          {
            id: 'legacy-checking',
            source: 'plaid',
            name: 'Checking',
            type: 'cash',
            currentBalance: 2200,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-04T12:00:00.000Z',
          },
          {
            id: 'legacy-card',
            source: 'plaid',
            name: 'Credit Card',
            type: 'credit',
            currentBalance: -250,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-04T12:00:00.000Z',
          },
        ],
        null,
        2,
      ),
    )

    const snapshotsResponse = await app.request(
      '/api/balance-snapshots?kind=netWorth',
    )
    expect(snapshotsResponse.status).toBe(200)
    const snapshotsBody = (await snapshotsResponse.json()) as {
      total: number
      snapshots: Array<{ kind: string; date: string; value: number }>
    }
    expect(snapshotsBody.total).toBe(1)
    expect(snapshotsBody.snapshots[0]).toEqual(
      expect.objectContaining({
        kind: 'netWorth',
        date: '2026-06-04',
        value: 1950,
      }),
    )

    const formulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'NetWorthHistory.Monthly().Trend()' }),
    })
    expect(formulaResponse.status).toBe(200)
    const formulaBody = (await formulaResponse.json()) as {
      result: {
        value: { type: string; points: Array<{ key: string; value: number }> }
      }
    }
    expect(formulaBody.result.value).toEqual({
      type: 'series',
      points: [expect.objectContaining({ key: '2026-06', value: 1950 })],
    })

    const investmentSnapshotsResponse = await app.request(
      '/api/balance-snapshots?kind=investment',
    )
    expect(investmentSnapshotsResponse.status).toBe(200)
    const investmentSnapshots = (await investmentSnapshotsResponse.json()) as {
      total: number
      snapshots: Array<unknown>
    }
    expect(investmentSnapshots).toEqual(
      expect.objectContaining({
        total: 0,
        snapshots: [],
      }),
    )
  })

  it('derives investment history snapshots from investment-like account facts', async () => {
    await fs.writeFile(
      path.join(dataDir, 'accounts.json'),
      JSON.stringify(
        [
          {
            id: 'legacy-checking',
            source: 'plaid',
            name: 'Checking',
            type: 'cash',
            currentBalance: 2200,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-04T12:00:00.000Z',
          },
          {
            id: 'legacy-ira',
            source: 'plaid',
            name: 'Retirement Account',
            type: 'other',
            subtype: 'ira',
            currentBalance: 45000,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-04T12:00:00.000Z',
          },
          {
            id: 'legacy-rrsp',
            source: 'plaid',
            name: 'Canadian Retirement Account',
            type: 'other',
            subtype: 'rrsp',
            currentBalance: 12000,
            isoCurrencyCode: 'CAD',
            asOf: '2026-06-04T12:00:00.000Z',
          },
        ],
        null,
        2,
      ),
    )

    const investmentSnapshotsResponse = await app.request(
      '/api/balance-snapshots?kind=investment',
    )
    expect(investmentSnapshotsResponse.status).toBe(200)
    const investmentSnapshots = (await investmentSnapshotsResponse.json()) as {
      total: number
      snapshots: Array<{ kind: string; date: string; value: number }>
    }
    expect(investmentSnapshots).toEqual(
      expect.objectContaining({
        total: 1,
        snapshots: [
          expect.objectContaining({
            kind: 'investment',
            date: '2026-06-04',
            value: 57000,
          }),
        ],
      }),
    )

    const formulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'InvestmentHistory.Monthly().Trend()' }),
    })
    expect(formulaResponse.status).toBe(200)
    const formulaBody = (await formulaResponse.json()) as {
      result: {
        value: { type: string; points: Array<{ key: string; value: number }> }
      }
    }
    expect(formulaBody.result.value).toEqual({
      type: 'series',
      points: [expect.objectContaining({ key: '2026-06', value: 57000 })],
    })

    const readinessResponse = await app.request(
      '/api/cards/readiness?ids=investment-trend',
    )
    expect(readinessResponse.status).toBe(200)
    const readiness = (await readinessResponse.json()) as {
      cards: Array<{
        id: string
        status: string
        collectionCounts: Record<string, number>
      }>
    }
    expect(readiness.cards).toEqual([
      expect.objectContaining({
        id: 'investment-trend',
        status: 'ready',
        collectionCounts: expect.objectContaining({ InvestmentHistory: 1 }),
      }),
    ])
  })

  it('lets current account facts override stale same-day aggregate snapshots', async () => {
    await fs.writeFile(
      path.join(dataDir, 'accounts.json'),
      JSON.stringify(
        [
          {
            id: 'current-checking',
            source: 'plaid',
            name: 'Checking',
            type: 'cash',
            currentBalance: 2200,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-04T12:00:00.000Z',
          },
          {
            id: 'current-card',
            source: 'plaid',
            name: 'Credit Card',
            type: 'credit',
            currentBalance: -250,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-04T12:00:00.000Z',
          },
        ],
        null,
        2,
      ),
    )
    const snapshotDir = path.join(dataDir, 'balance-snapshots')
    await fs.mkdir(snapshotDir, { recursive: true })
    await fs.writeFile(
      path.join(snapshotDir, '2026-06.json'),
      JSON.stringify(
        [
          {
            id: 'aggregate-networth-2026-06-04',
            source: 'plaid',
            kind: 'netWorth',
            date: '2026-06-04',
            asOf: '2026-06-04T09:00:00.000Z',
            value: 118378.33,
            createdAt: '2026-06-04T09:00:00.000Z',
          },
          {
            id: 'aggregate-investment-2026-06-04',
            source: 'plaid',
            kind: 'investment',
            date: '2026-06-04',
            asOf: '2026-06-04T09:00:00.000Z',
            value: 111921,
            createdAt: '2026-06-04T09:00:00.000Z',
          },
        ],
        null,
        2,
      ),
    )

    const snapshotsResponse = await app.request(
      '/api/balance-snapshots?kind=netWorth',
    )
    expect(snapshotsResponse.status).toBe(200)
    const snapshotsBody = (await snapshotsResponse.json()) as {
      total: number
      snapshots: Array<{ kind: string; date: string; value: number }>
    }
    expect(snapshotsBody.total).toBe(1)
    expect(snapshotsBody.snapshots[0]).toEqual(
      expect.objectContaining({
        kind: 'netWorth',
        date: '2026-06-04',
        value: 1950,
      }),
    )

    const formulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'NetWorthHistory.Monthly().Trend()' }),
    })
    expect(formulaResponse.status).toBe(200)
    const formulaBody = (await formulaResponse.json()) as {
      result: {
        value: { type: string; points: Array<{ key: string; value: number }> }
      }
    }
    expect(formulaBody.result.value).toEqual({
      type: 'series',
      points: [expect.objectContaining({ key: '2026-06', value: 1950 })],
    })

    const investmentSnapshotsResponse = await app.request(
      '/api/balance-snapshots?kind=investment',
    )
    expect(investmentSnapshotsResponse.status).toBe(200)
    const investmentSnapshots = (await investmentSnapshotsResponse.json()) as {
      total: number
      snapshots: Array<unknown>
    }
    expect(investmentSnapshots).toEqual(
      expect.objectContaining({
        total: 0,
        snapshots: [],
      }),
    )
  })

  it('defaults to live facts and can explicitly switch to demo mode', async () => {
    await app.request('/api/dev/seed', { method: 'POST' })
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [
          {
            id: 'plaid-live-checking',
            source: 'plaid',
            itemId: 'item-live',
            institutionName: 'Live Bank',
            name: 'Live Checking',
            type: 'cash',
            currentBalance: 1234,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-04T00:00:00.000Z',
          },
        ],
        transactions: [
          {
            id: 'plaid-live-payroll',
            source: 'plaid',
            itemId: 'item-live',
            accountId: 'plaid-live-checking',
            name: 'Live Payroll',
            amount: 2500,
            direction: 'income',
            category: ['Income'],
            date: '2026-06-04',
            isoCurrencyCode: 'USD',
            recurring: true,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const liveModeResponse = await app.request('/api/data-mode', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dataMode: 'live' }),
    })
    expect(liveModeResponse.status).toBe(200)

    const summaryResponse = await app.request('/api/summary')
    const summary = (await summaryResponse.json()) as {
      accountCount: number
      transactionCount: number
      dataMode: string
      netWorth: number
      income: number
    }
    expect(summary).toEqual(
      expect.objectContaining({
        accountCount: 1,
        transactionCount: 1,
        dataMode: 'live',
        netWorth: 1234,
        income: 2500,
      }),
    )

    const accountsResponse = await app.request('/api/accounts')
    const accounts = (await accountsResponse.json()) as {
      total: number
      accounts: Array<{ id: string; source: string }>
    }
    expect(accounts.total).toBe(1)
    expect(accounts.accounts).toEqual([
      expect.objectContaining({ id: 'plaid-live-checking', source: 'plaid' }),
    ])

    const demoModeResponse = await app.request('/api/data-mode', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dataMode: 'demo' }),
    })
    expect(demoModeResponse.status).toBe(200)
    const demoMode = (await demoModeResponse.json()) as {
      dataMode: string
    }
    expect(demoMode).toEqual(
      expect.objectContaining({
        dataMode: 'demo',
      }),
    )

    const demoSummaryResponse = await app.request('/api/summary')
    const demoSummary = (await demoSummaryResponse.json()) as {
      accountCount: number
      transactionCount: number
      dataMode: string
    }
    expect(demoSummary).toEqual(
      expect.objectContaining({
        accountCount: 4,
        transactionCount: 5,
        dataMode: 'demo',
      }),
    )
  })

  it('normalizes structured credit card payments as transfers for cash flow', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [
          {
            id: 'usd-checking-flow',
            source: 'manual',
            name: 'USD Checking',
            type: 'cash',
            currentBalance: 1000,
            isoCurrencyCode: 'USD',
            asOf: '2026-04-10T00:00:00.000Z',
          },
          {
            id: 'cad-checking-flow',
            source: 'manual',
            name: 'CAD Checking',
            type: 'cash',
            currentBalance: 1000,
            isoCurrencyCode: 'CAD',
            asOf: '2026-04-10T00:00:00.000Z',
          },
        ],
        transactions: [
          {
            id: 'synthetic-card-payment-out',
            source: 'plaid',
            name: 'Synthetic Credit Card Payment',
            amount: 500,
            direction: 'expense',
            category: ['Payment'],
            providerCategoryPrimary: 'LOAN_PAYMENTS',
            providerCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
            providerPaymentChannel: 'other',
            date: '2026-06-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'synthetic-card-payment-in',
            source: 'plaid',
            name: 'Synthetic Credit Card Payment',
            amount: 500,
            direction: 'income',
            category: ['Payment'],
            providerCategoryPrimary: 'LOAN_PAYMENTS',
            providerCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
            providerPaymentChannel: 'other',
            date: '2026-06-02',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'synthetic-rent-income',
            source: 'plaid',
            name: 'Synthetic Rent Income',
            amount: 1500,
            direction: 'income',
            category: ['INCOME', 'INCOME_OTHER_INCOME'],
            date: '2026-06-03',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'synthetic-repair-expense',
            source: 'plaid',
            name: 'Synthetic Repair Expense',
            amount: 200,
            direction: 'expense',
            category: [
              'GENERAL_SERVICES',
              'GENERAL_SERVICES_OTHER_GENERAL_SERVICES',
            ],
            date: '2026-06-04',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const transferResponse = await app.request(
      '/api/transactions?direction=transfer',
    )
    const transfers = (await transferResponse.json()) as {
      total: number
      transactions: Array<{
        id: string
        direction: string
        providerCategoryDetailed?: string
        transferReason?: string
      }>
    }
    expect(transfers.total).toBe(2)
    expect(transfers.transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'synthetic-card-payment-out',
          direction: 'transfer',
          providerCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
          transferReason: 'credit_card_payment',
        }),
        expect.objectContaining({
          id: 'synthetic-card-payment-in',
          direction: 'transfer',
          providerCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
          transferReason: 'credit_card_payment',
        }),
      ]),
    )

    const summaryResponse = await app.request('/api/summary')
    const summary = (await summaryResponse.json()) as {
      income: number
      expenses: number
      cashFlow: number
    }
    expect(summary.income).toBe(1500)
    expect(summary.expenses).toBe(200)
    expect(summary.cashFlow).toBe(1300)

    const healthResponse = await app.request('/api/data-health')
    expect(healthResponse.status).toBe(200)
    const health = (await healthResponse.json()) as {
      dataMode: string
      counts: { transactions: number }
      transactions: {
        directionCounts: { income: number; expense: number; transfer: number }
        providerCategoryCounts: {
          primary: Record<string, number>
          detailed: Record<string, number>
          paymentChannel: Record<string, number>
        }
        dateRange: { first?: string; last?: string }
        monthsObserved: number
      }
      cashFlow: {
        income: number
        expenses: number
        cashFlow: number
        transferCount: number
        transferAmount: number
        transferReasons: Record<string, number>
      }
      review: {
        namespaces: Record<
          string,
          {
            missing_namespace: number
            has_recommendations: number
            recurring: number
            unlabeled: number
          }
        >
      }
      cards: {
        failed: number
        readiness: Record<string, number>
      }
      nextActions: Array<{ action: string; rpc: string; count?: number }>
      labelPlan: {
        summary: Record<string, number>
        jobs: Array<{
          namespace: string
          missingTotal: number
          selector: {
            missingNamespace: string
            direction?: string
            limit: number
          }
        }>
      }
      warnings: string[]
    }
    expect(health).toEqual(
      expect.objectContaining({
        dataMode: 'live',
        counts: expect.objectContaining({ transactions: 4 }),
        cashFlow: expect.objectContaining({
          income: 1500,
          expenses: 200,
          cashFlow: 1300,
          transferCount: 2,
          transferAmount: 1000,
          transferReasons: { credit_card_payment: 2 },
        }),
        cards: expect.objectContaining({
          failed: 0,
          readiness: expect.objectContaining({
            ready: expect.any(Number),
            'needs-labels': 0,
          }),
        }),
      }),
    )
    expect(health.transactions.directionCounts).toEqual({
      income: 1,
      expense: 1,
      transfer: 2,
    })
    expect(health.transactions.providerCategoryCounts).toEqual(
      expect.objectContaining({
        primary: expect.objectContaining({ LOAN_PAYMENTS: 2 }),
        detailed: expect.objectContaining({
          LOAN_PAYMENTS_CREDIT_CARD_PAYMENT: 2,
        }),
        paymentChannel: expect.objectContaining({ other: 2 }),
      }),
    )
    expect(health.transactions.dateRange).toEqual({
      first: '2026-06-01',
      last: '2026-06-04',
    })
    expect(health.transactions.monthsObserved).toBe(1)
    expect(health.review.namespaces.budget.missing_namespace).toBe(1)
    expect(health.review.namespaces.sharedExpense.missing_namespace).toBe(0)
    expect(health.review.namespaces.taxContribution.missing_namespace).toBe(0)
    expect(health.review.namespaces.joyReview.has_recommendations).toBe(0)
    expect(health.review.namespaces.joyReview.recurring).toBe(0)
    expect(health.review.namespaces.joyReview.unlabeled).toBe(0)
    expect(health.cards.readiness['needs-labels']).toBe(0)
    expect(health.nextActions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'classify-missing-labels',
          rpc: 'money.transactions.labelPlan',
        }),
      ]),
    )
    expect(health.labelPlan.summary.classify).toBe(0)
    expect(health.labelPlan.jobs).toEqual([])
    expect(health.warnings).not.toEqual(expect.arrayContaining(['no_accounts']))

    const transferFormulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula:
          'Transfers.ThisMonth().Where(transferReason = "credit_card_payment").Sum()',
        format: 'currency',
      }),
    })
    expect(transferFormulaResponse.status).toBe(200)
    const transferFormula = (await transferFormulaResponse.json()) as {
      ok: boolean
      result: {
        value: number
        displayValue: string
        referencedCollections: string[]
        outputType: string
      }
    }
    expect(transferFormula.ok).toBe(true)
    expect(transferFormula.result).toEqual(
      expect.objectContaining({
        value: 1000,
        displayValue: '$1,000',
        referencedCollections: ['Transfers'],
        outputType: 'money',
      }),
    )

    const transferTemplatesResponse = await app.request(
      '/api/cards/templates?ids=transfer-volume,credit-card-payment-volume,transfer-reasons&includeEvaluation=true',
    )
    expect(transferTemplatesResponse.status).toBe(200)
    const transferTemplates = (await transferTemplatesResponse.json()) as {
      templates: Array<{
        id: string
        category: string
        referencedCollections: string[]
        definition: { formula: string; outputType?: string }
        test?: { ok: boolean; result?: { outputType: string } }
      }>
    }
    expect(transferTemplates.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'transfer-volume',
          category: 'cash-flow',
          referencedCollections: expect.arrayContaining(['Transfers']),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'money' }),
          }),
        }),
        expect.objectContaining({
          id: 'credit-card-payment-volume',
          category: 'cash-flow',
          referencedCollections: expect.arrayContaining(['Transfers']),
          definition: expect.objectContaining({
            formula:
              'Transfers.ThisMonth().Where(transferReason = "credit_card_payment").Sum()',
          }),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'money' }),
          }),
        }),
        expect.objectContaining({
          id: 'transfer-reasons',
          category: 'cash-flow',
          referencedCollections: expect.arrayContaining(['Transfers']),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'table' }),
          }),
        }),
      ]),
    )

    const allTransactionsFormulaResponse = await app.request(
      '/api/formulas/preview',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: 'Transactions.ThisMonth().Count()',
        }),
      },
    )
    expect(allTransactionsFormulaResponse.status).toBe(200)
    const allTransactionsFormula =
      (await allTransactionsFormulaResponse.json()) as {
        ok: boolean
        result: {
          value: number
          referencedCollections: string[]
          outputType: string
        }
      }
    expect(allTransactionsFormula.ok).toBe(true)
    expect(allTransactionsFormula.result).toEqual(
      expect.objectContaining({
        value: 4,
        referencedCollections: ['Transactions'],
        outputType: 'number',
      }),
    )

    const transactionTemplatesResponse = await app.request(
      '/api/cards/templates?ids=transaction-activity,transaction-direction-mix,provider-category-mix&includeEvaluation=true',
    )
    expect(transactionTemplatesResponse.status).toBe(200)
    const transactionTemplates =
      (await transactionTemplatesResponse.json()) as {
        templates: Array<{
          id: string
          category: string
          referencedCollections: string[]
          definition: { formula: string; outputType?: string }
          test?: { ok: boolean; result?: { outputType: string } }
        }>
      }
    expect(transactionTemplates.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'transaction-activity',
          category: 'overview',
          referencedCollections: expect.arrayContaining(['Transactions']),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'number' }),
          }),
        }),
        expect.objectContaining({
          id: 'transaction-direction-mix',
          category: 'overview',
          referencedCollections: expect.arrayContaining(['Transactions']),
          definition: expect.objectContaining({
            formula: 'Transactions.GroupBy(direction).PercentOfTotal()',
          }),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'table' }),
          }),
        }),
        expect.objectContaining({
          id: 'provider-category-mix',
          category: 'overview',
          referencedCollections: expect.arrayContaining(['Transactions']),
          definition: expect.objectContaining({
            formula:
              'Transactions.GroupBy(providerCategoryPrimary).PercentOfTotal()',
          }),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'table' }),
          }),
        }),
      ]),
    )

    const readinessResponse = await app.request('/api/cards/readiness')
    expect(readinessResponse.status).toBe(200)
    const readiness = (await readinessResponse.json()) as {
      cards: Array<{
        id: string
        status: string
        transactionCollections: string[]
        extensionNamespaces: string[]
        collectionCounts: Record<string, number>
        namespaceGaps: Array<{
          namespace: string
          coverage: string
          eligibleTotal: number
          missingNamespaceTotal: number
        }>
        matchingTransactionTotal: number
        recommendedNextStep?: {
          action: string
          rpc: string
          namespaces: string[]
        }
        nextActions?: Array<{
          action: string
          rpc: string
          params?: Record<string, unknown>
          namespaces?: string[]
        }>
      }>
      summary: Record<string, number>
      filters: { transactionSampleLimit: number }
    }
    expect(readiness.summary.ready).toBeGreaterThan(0)
    expect(readiness.summary['needs-labels']).toBe(0)
    expect(readiness.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'monthly-cash-flow',
          status: 'ready',
          transactionCollections: expect.arrayContaining([
            'Income',
            'Expenses',
          ]),
          matchingTransactionTotal: 2,
        }),
        expect.objectContaining({
          id: 'active-subscriptions',
          status: 'empty',
          extensionNamespaces: expect.arrayContaining(['subscription']),
          namespaceGaps: expect.arrayContaining([
            expect.objectContaining({
              namespace: 'subscription',
              coverage: 'sparse',
              eligibleTotal: 1,
              missingNamespaceTotal: 0,
            }),
          ]),
          nextActions: expect.arrayContaining([
            expect.objectContaining({
              action: 'review-recurring-series',
              rpc: 'money.recurring.series',
              namespaces: ['subscription'],
              params: expect.objectContaining({
                namespace: 'subscription',
                status: 'all',
              }),
            }),
          ]),
        }),
        expect.objectContaining({
          id: 'debt-payoff-optimizer',
          status: 'empty',
          collectionCounts: expect.objectContaining({ Debt: 0 }),
        }),
      ]),
    )

    await fs.writeFile(
      path.join(dataDir, 'debts.json'),
      JSON.stringify(
        [
          {
            id: 'readiness-debt-without-apr',
            source: 'manual',
            name: 'Readiness Debt Without APR',
            type: 'loan',
            balance: 1200,
            currencyCode: 'USD',
            updatedAt: new Date().toISOString(),
          },
        ],
        null,
        2,
      ),
    )

    const missingAprReadinessResponse = await app.request(
      '/api/cards/readiness?ids=debt-payoff-optimizer,interest-drag,high-apr-debts',
    )
    expect(missingAprReadinessResponse.status).toBe(200)
    const missingAprReadiness = (await missingAprReadinessResponse.json()) as {
      cards: Array<{
        id: string
        status: string
        collectionCounts: Record<string, number>
        metadataGaps?: Array<{
          collection: string
          field: string
          eligibleTotal: number
        }>
      }>
    }
    expect(missingAprReadiness.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'debt-payoff-optimizer',
          status: 'empty',
          collectionCounts: expect.objectContaining({ Debt: 1 }),
          metadataGaps: [
            expect.objectContaining({
              collection: 'Debt',
              field: 'apr',
              eligibleTotal: 1,
            }),
          ],
        }),
        expect.objectContaining({
          id: 'interest-drag',
          status: 'empty',
          metadataGaps: [
            expect.objectContaining({
              collection: 'Debt',
              field: 'apr',
              eligibleTotal: 1,
            }),
          ],
        }),
        expect.objectContaining({
          id: 'high-apr-debts',
          status: 'empty',
          metadataGaps: [
            expect.objectContaining({
              collection: 'Debt',
              field: 'apr',
              eligibleTotal: 1,
            }),
          ],
        }),
      ]),
    )

    await fs.writeFile(
      path.join(dataDir, 'debts.json'),
      JSON.stringify(
        [
          {
            id: 'readiness-debt',
            source: 'manual',
            name: 'Readiness Debt',
            type: 'loan',
            balance: 1200,
            apr: 0.12,
            minimumPayment: 75,
            currencyCode: 'USD',
            updatedAt: new Date().toISOString(),
          },
        ],
        null,
        2,
      ),
    )

    const debtReadinessResponse = await app.request(
      '/api/cards/readiness?ids=debt-payoff-optimizer,interest-drag,high-apr-debts',
    )
    expect(debtReadinessResponse.status).toBe(200)
    const debtReadiness = (await debtReadinessResponse.json()) as {
      cards: Array<{
        id: string
        status: string
        collectionCounts: Record<string, number>
      }>
    }
    expect(debtReadiness.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'debt-payoff-optimizer',
          status: 'ready',
          collectionCounts: expect.objectContaining({ Debt: 1 }),
        }),
        expect.objectContaining({
          id: 'interest-drag',
          status: 'ready',
          collectionCounts: expect.objectContaining({ Debt: 1 }),
        }),
        expect.objectContaining({
          id: 'high-apr-debts',
          status: 'ready',
          collectionCounts: expect.objectContaining({ Debt: 1 }),
        }),
      ]),
    )

    const patchImportResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [
          {
            id: 'manual-loan-account',
            source: 'manual',
            name: 'Manual Loan Account',
            type: 'loan',
            currentBalance: -1200,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-04T00:00:00.000Z',
          },
        ],
        transactions: [],
      }),
    })
    expect(patchImportResponse.status).toBe(200)

    const patchDebtResponse = await app.request(
      '/api/debts/manual-loan-account',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apr: 12,
          minimumPayment: 75,
          nextPaymentDueDate: '2026-07-15',
        }),
      },
    )
    expect(patchDebtResponse.status).toBe(200)
    const patchDebt = (await patchDebtResponse.json()) as {
      ok: boolean
      created: boolean
      debt: { id: string; accountId: string; apr: number; balance: number }
      refreshedMetrics: number
    }
    expect(patchDebt).toEqual(
      expect.objectContaining({
        ok: true,
        created: true,
        refreshedMetrics: expect.any(Number),
        debt: expect.objectContaining({
          accountId: 'manual-loan-account',
          apr: 0.12,
          balance: 1200,
        }),
      }),
    )

    const patchedReadinessResponse = await app.request(
      '/api/cards/readiness?ids=debt-payoff-optimizer,interest-drag,high-apr-debts',
    )
    expect(patchedReadinessResponse.status).toBe(200)
    const patchedReadiness = (await patchedReadinessResponse.json()) as {
      cards: Array<{ id: string; status: string; metadataGaps?: unknown[] }>
    }
    expect(patchedReadiness.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'debt-payoff-optimizer',
          status: 'ready',
        }),
        expect.objectContaining({ id: 'interest-drag', status: 'ready' }),
        expect.objectContaining({ id: 'high-apr-debts', status: 'ready' }),
      ]),
    )
    expect(
      patchedReadiness.cards.flatMap((card) => card.metadataGaps ?? []),
    ).toEqual([])

    const patchDebtRpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.debts.patch',
        params: {
          id: patchDebt.debt.id,
          apr: 0.1,
          minimumPayment: 80,
        },
      }),
    })
    expect(patchDebtRpcResponse.status).toBe(200)
    const patchDebtRpc = (await patchDebtRpcResponse.json()) as {
      ok: boolean
      result: {
        created: boolean
        debt: { apr: number; minimumPayment: number }
      }
    }
    expect(patchDebtRpc.ok).toBe(true)
    expect(patchDebtRpc.result).toEqual(
      expect.objectContaining({
        created: false,
        debt: expect.objectContaining({ apr: 0.1, minimumPayment: 80 }),
      }),
    )

    const readinessRpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.cards.readiness',
        params: { ids: 'active-subscriptions' },
      }),
    })
    expect(readinessRpcResponse.status).toBe(200)
    const readinessRpc = (await readinessRpcResponse.json()) as {
      ok: boolean
      result: { total: number; cards: Array<{ id: string; status: string }> }
    }
    expect(readinessRpc.ok).toBe(true)
    expect(readinessRpc.result.total).toBe(1)
    expect(readinessRpc.result.cards).toEqual([
      expect.objectContaining({
        id: 'active-subscriptions',
        status: 'empty',
      }),
    ])

    const labelPlanResponse = await app.request(
      '/api/transactions/label-plan?namespaces=budget,subscription&limitPerJob=3',
    )
    expect(labelPlanResponse.status).toBe(200)
    const labelPlan = (await labelPlanResponse.json()) as {
      jobs: Array<{
        namespace: string
        status: string
        eligibleDirection?: string
        eligibleTotal: number
        missingTotal: number
        selector: {
          missingNamespace: string
          direction?: string
          limit: number
        }
        classifyRequest?: {
          selector: {
            missingNamespace: string
            direction?: string
            limit: number
          }
          targetNamespaces: string[]
          maxTransactions: number
        }
        recommendedRpc?: string
      }>
      summary: Record<string, number>
    }
    expect(labelPlan.summary.classify).toBe(1)
    expect(labelPlan.jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          namespace: 'budget',
          status: 'classify',
          eligibleDirection: 'expense',
          eligibleTotal: 1,
          missingTotal: 1,
          selector: {
            missingNamespace: 'budget',
            direction: 'expense',
            limit: 3,
          },
          classifyRequest: expect.objectContaining({
            selector: {
              missingNamespace: 'budget',
              direction: 'expense',
              limit: 3,
            },
            targetNamespaces: ['budget'],
            maxTransactions: 3,
          }),
          recommendedRpc: 'money.transactions.classify',
        }),
      ]),
    )

    const labelPlanRpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.labelPlan',
        params: { namespaces: 'budget', limitPerJob: 2 },
      }),
    })
    expect(labelPlanRpcResponse.status).toBe(200)
    const labelPlanRpc = (await labelPlanRpcResponse.json()) as {
      ok: boolean
      result: {
        total: number
        jobs: Array<{ namespace: string; missingTotal: number }>
      }
    }
    expect(labelPlanRpc.ok).toBe(true)
    expect(labelPlanRpc.result.total).toBe(1)
    expect(labelPlanRpc.result.jobs).toEqual([
      expect.objectContaining({ namespace: 'budget', missingTotal: 1 }),
    ])

    const sparseLabelPlanResponse = await app.request(
      '/api/transactions/label-plan?namespaces=sharedExpense,taxContribution&includeComplete=true',
    )
    expect(sparseLabelPlanResponse.status).toBe(200)
    const sparseLabelPlan = (await sparseLabelPlanResponse.json()) as {
      jobs: Array<{
        namespace: string
        coverage: string
        status: string
        eligibleTotal: number
        missingTotal: number
        classifyRequest?: unknown
      }>
      summary: Record<string, number>
    }
    expect(sparseLabelPlan.summary.classify).toBe(0)
    expect(sparseLabelPlan.jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          namespace: 'sharedExpense',
          coverage: 'sparse',
          status: 'complete',
          eligibleTotal: 1,
          missingTotal: 0,
        }),
        expect.objectContaining({
          namespace: 'taxContribution',
          coverage: 'sparse',
          status: 'complete',
          eligibleTotal: 4,
          missingTotal: 0,
        }),
      ]),
    )
    expect(
      sparseLabelPlan.jobs.every((job) => job.classifyRequest === undefined),
    ).toBe(true)

    const budgetPreviewResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.labelPreview',
        params: {
          selector: {
            missingNamespace: 'budget',
            direction: 'expense',
            limit: 10,
          },
          namespace: 'budget',
          values: { need: 'required', goal: 'repairs' },
          source: 'agent',
        },
      }),
    })
    expect(budgetPreviewResponse.status).toBe(200)
    const budgetPreview = (await budgetPreviewResponse.json()) as {
      ok: boolean
      result: {
        matched: { total: number; selected: number }
        summary: {
          namespace: string
          dryRun: boolean
          matchedTotal: number
          selectedTotal: number
          wouldWriteTotal: number
          wroteTotal: number
        }
      }
    }
    expect(budgetPreview.ok).toBe(true)
    expect(budgetPreview.result.matched).toEqual(
      expect.objectContaining({ total: 1, selected: 1 }),
    )
    expect(budgetPreview.result.summary).toEqual(
      expect.objectContaining({
        namespace: 'budget',
        dryRun: true,
        matchedTotal: 1,
        selectedTotal: 1,
        wouldWriteTotal: 1,
        wroteTotal: 0,
      }),
    )

    const budgetApplyResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.labelApply',
        params: {
          selector: {
            missingNamespace: 'budget',
            direction: 'expense',
            limit: 10,
          },
          namespace: 'budget',
          values: { need: 'required', goal: 'repairs' },
          source: 'agent',
        },
      }),
    })
    expect(budgetApplyResponse.status).toBe(200)
    const budgetApply = (await budgetApplyResponse.json()) as {
      ok: boolean
      result: {
        matched: { total: number; selected: number }
        summary: {
          namespace: string
          dryRun: boolean
          matchedTotal: number
          selectedTotal: number
          wouldWriteTotal: number
          wroteTotal: number
        }
      }
    }
    expect(budgetApply.ok).toBe(true)
    expect(budgetApply.result.matched).toEqual(
      expect.objectContaining({ total: 1, selected: 1 }),
    )
    expect(budgetApply.result.summary).toEqual(
      expect.objectContaining({
        namespace: 'budget',
        dryRun: false,
        matchedTotal: 1,
        selectedTotal: 1,
        wouldWriteTotal: 0,
        wroteTotal: 1,
      }),
    )

    const postLabelBudgetPlanResponse = await app.request(
      '/api/transactions/label-plan?namespaces=budget&includeComplete=true',
    )
    expect(postLabelBudgetPlanResponse.status).toBe(200)
    const postLabelBudgetPlan = (await postLabelBudgetPlanResponse.json()) as {
      jobs: Array<{
        namespace: string
        status: string
        missingTotal: number
        labeledTotal: number
      }>
    }
    expect(postLabelBudgetPlan.jobs).toEqual([
      expect.objectContaining({
        namespace: 'budget',
        status: 'complete',
        missingTotal: 0,
        labeledTotal: 1,
      }),
    ])

    const healthRpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.data.health' }),
    })
    expect(healthRpcResponse.status).toBe(200)
    const healthRpc = (await healthRpcResponse.json()) as {
      ok: boolean
      result: { cashFlow: { transferCount: number } }
    }
    expect(healthRpc.ok).toBe(true)
    expect(healthRpc.result.cashFlow.transferCount).toBe(2)

    const formulaResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.formulas.preview',
        params: {
          formula: 'Income.Sum() - Expenses.Sum()',
          format: 'currency',
          outputType: 'money',
        },
      }),
    })
    expect(formulaResponse.status).toBe(200)
    const formula = (await formulaResponse.json()) as {
      ok: boolean
      result: { ok: boolean; result: { value: number; displayValue: string } }
    }
    expect(formula.ok).toBe(true)
    expect(formula.result.ok).toBe(true)
    expect(formula.result.result).toEqual(
      expect.objectContaining({ value: 1300, displayValue: '$1,300' }),
    )
  })

  it('supports manual asset and liability accounts in net-worth formulas', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accounts: [], transactions: [] }),
    })
    expect(importResponse.status).toBe(200)

    const homeResponse = await app.request('/api/accounts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'home-value',
        name: 'Home Value',
        type: 'other',
        subtype: 'real_estate',
        currentBalance: 282000,
        isoCurrencyCode: 'USD',
        isAsset: true,
      }),
    })
    expect(homeResponse.status).toBe(200)

    const mortgageResponse = await app.request('/api/accounts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'manual-mortgage',
        name: 'Manual Mortgage',
        type: 'mortgage',
        currentBalance: -82000,
        isoCurrencyCode: 'USD',
        isLiability: true,
      }),
    })
    expect(mortgageResponse.status).toBe(200)

    const previewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'Accounts.Sum()', format: 'currency' }),
    })
    expect(previewResponse.status).toBe(200)
    const preview = (await previewResponse.json()) as {
      result: { value: number; displayValue: string }
    }
    expect(preview.result.value).toBe(200000)

    const accountsResponse = await app.request('/api/accounts')
    expect(accountsResponse.status).toBe(200)
    const accountsBody = (await accountsResponse.json()) as {
      accounts: Array<{
        id: string
        liquidity?: string
        liquidityClass?: string
        liquidityTier?: number
      }>
    }
    expect(accountsBody.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'manual-account-home-value',
          liquidity: 'illiquid',
          liquidityClass: 'illiquid',
          liquidityTier: 3,
        }),
        expect.objectContaining({
          id: 'manual-account-manual-mortgage',
          liquidity: 'na',
          liquidityClass: 'na',
        }),
      ]),
    )

    const liquidPreviewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula:
          'Accounts.Where(isAsset = true).GroupBy(liquidityClass).PercentOfTotal()',
        outputType: 'table',
      }),
    })
    expect(liquidPreviewResponse.status).toBe(200)
    const liquidPreview = (await liquidPreviewResponse.json()) as {
      result: {
        value: { type: string; rows: Array<{ key: string; value: number }> }
      }
    }
    expect(liquidPreview.result.value).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: [expect.objectContaining({ key: 'illiquid', value: 282000 })],
      }),
    )

    const patchResponse = await app.request(
      '/api/accounts/manual-account-home-value',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentBalance: 300000, liquidity: 'cash' }),
      },
    )
    expect(patchResponse.status).toBe(200)

    const patchedAccountResponse = await app.request('/api/accounts')
    const patchedAccounts = (await patchedAccountResponse.json()) as {
      accounts: Array<{
        id: string
        liquidity?: string
        liquidityClass?: string
        liquidityTier?: number
      }>
    }
    expect(patchedAccounts.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'manual-account-home-value',
          liquidity: 'cash',
          liquidityClass: 'liquid',
          liquidityTier: 0,
        }),
      ]),
    )

    const patchedPreviewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'Accounts.Sum()', format: 'currency' }),
    })
    expect(patchedPreviewResponse.status).toBe(200)
    const patchedPreview = (await patchedPreviewResponse.json()) as {
      result: { value: number }
    }
    expect(patchedPreview.result.value).toBe(218000)

    const cardsResponse = await app.request('/api/cards')
    expect(cardsResponse.status).toBe(200)
    const cardsBody = (await cardsResponse.json()) as {
      cards: Array<{ id: string; value: number; displayValue: string }>
      warehouse?: { stale: boolean; recomputing: boolean }
    }
    expect(cardsBody.warehouse).toEqual(
      expect.objectContaining({ stale: false, recomputing: false }),
    )
    expect(cardsBody.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'net-worth',
          value: 218000,
          displayValue: '$218,000',
        }),
      ]),
    )

    const deleteResponse = await app.request(
      '/api/accounts/manual-account-home-value',
      {
        method: 'DELETE',
      },
    )
    expect(deleteResponse.status).toBe(200)
  })

  it('returns reporting-currency account values without changing native balances', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [
          {
            id: 'cad-checking',
            source: 'manual',
            name: 'CAD Checking',
            type: 'cash',
            subtype: 'checking',
            currentBalance: 100,
            isoCurrencyCode: 'CAD',
            asOf: '2026-06-03',
          },
          {
            id: 'usd-checking',
            source: 'manual',
            name: 'USD Checking',
            type: 'cash',
            subtype: 'checking',
            currentBalance: 100,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-03',
          },
        ],
        transactions: [],
      }),
    })
    expect(importResponse.status).toBe(200)

    const currencyResponse = await app.request('/api/currency/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reportingCurrency: 'USD' }),
    })
    expect(currencyResponse.status).toBe(200)

    const fxResponse = await app.request('/api/fx-rates', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        rates: [
          {
            baseCurrency: 'CAD',
            quoteCurrency: 'USD',
            rate: 0.75,
            asOf: '2026-06-03',
            source: 'market',
            status: 'estimated',
          },
        ],
      }),
    })
    expect(fxResponse.status).toBe(200)

    const accountsResponse = await app.request('/api/accounts')
    expect(accountsResponse.status).toBe(200)
    const accountsBody = (await accountsResponse.json()) as {
      accounts: Array<{
        id: string
        currentBalance: number
        isoCurrencyCode: string
        reportingCurrency?: string
        reportingValue?: number
        reportingValueStatus?: string
        reportingFxRate?: number
      }>
    }
    expect(accountsBody.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'cad-checking',
          currentBalance: 100,
          isoCurrencyCode: 'CAD',
          reportingCurrency: 'USD',
          reportingValue: 75,
          reportingValueStatus: 'estimated',
          reportingFxRate: 0.75,
        }),
        expect.objectContaining({
          id: 'usd-checking',
          currentBalance: 100,
          isoCurrencyCode: 'USD',
          reportingCurrency: 'USD',
          reportingValue: 100,
          reportingValueStatus: 'locked',
          reportingFxRate: 1,
        }),
      ]),
    )

    const previewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'Accounts.Sum()' }),
    })
    expect(previewResponse.status).toBe(200)
    const preview = (await previewResponse.json()) as {
      result: { value: number }
    }
    expect(preview.result.value).toBe(175)
  })

  it('returns proposal-first discovery actions for empty sparse extension cards', async () => {
    await fs.mkdir(path.join(dataDir, 'transactions'), { recursive: true })
    await fs.writeFile(
      path.join(dataDir, 'transactions', '2026-06.json'),
      JSON.stringify(
        [
          {
            id: 'sparse-shared-candidate',
            source: 'manual',
            name: 'Synthetic Shared Dinner',
            amount: 120,
            direction: 'expense',
            category: ['FOOD_AND_DRINK_RESTAURANT'],
            providerCategoryPrimary: 'FOOD_AND_DRINK',
            providerCategoryDetailed: 'FOOD_AND_DRINK_RESTAURANT',
            date: '2026-06-03',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'sparse-tax-candidate',
            source: 'manual',
            name: 'Synthetic IRA Contribution',
            amount: 500,
            direction: 'transfer',
            category: ['TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS'],
            providerCategoryPrimary: 'TRANSFER_OUT',
            providerCategoryDetailed:
              'TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS',
            date: '2026-06-04',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
        null,
        2,
      ),
    )

    const readinessResponse = await app.request(
      '/api/cards/readiness?ids=shared-expense-reimbursements,tax-advantaged-contributions',
    )
    expect(readinessResponse.status).toBe(200)
    const readiness = (await readinessResponse.json()) as {
      cards: Array<{
        id: string
        status: string
        nextActions?: Array<{
          action: string
          rpc: string
          namespaces?: string[]
          params?: {
            selector?: {
              missingNamespace?: string
              direction?: string
              limit?: number
              transactionIds?: string[]
            }
            targetNamespaces?: string[]
            saveProposals?: boolean
            apply?: boolean
            maxTransactions?: number
          }
          candidateCount?: number
          candidateReasons?: string[]
          fallbackParams?: {
            selector?: {
              missingNamespace?: string
              direction?: string
              limit?: number
            }
          }
        }>
      }>
    }

    expect(readiness.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'shared-expense-reimbursements',
          status: 'empty',
          nextActions: expect.arrayContaining([
            expect.objectContaining({
              action: 'classify-sparse-extension-candidates',
              rpc: 'money.transactions.classify',
              namespaces: ['sharedExpense'],
              params: expect.objectContaining({
                selector: expect.objectContaining({
                  missingNamespace: 'sharedExpense',
                  direction: 'expense',
                  limit: 1,
                  transactionIds: ['sparse-shared-candidate'],
                }),
                targetNamespaces: ['sharedExpense'],
                saveProposals: true,
                apply: false,
                maxTransactions: 1,
              }),
              candidateCount: 1,
              candidateReasons: expect.arrayContaining([
                'non-recurring expense is suitable for reimbursement review',
              ]),
              fallbackParams: expect.objectContaining({
                selector: expect.objectContaining({
                  missingNamespace: 'sharedExpense',
                  direction: 'expense',
                  limit: 50,
                }),
              }),
            }),
          ]),
        }),
        expect.objectContaining({
          id: 'tax-advantaged-contributions',
          status: 'empty',
          nextActions: expect.arrayContaining([
            expect.objectContaining({
              action: 'classify-sparse-extension-candidates',
              rpc: 'money.transactions.classify',
              namespaces: ['taxContribution'],
              params: expect.objectContaining({
                selector: expect.objectContaining({
                  missingNamespace: 'taxContribution',
                  limit: 1,
                  transactionIds: ['sparse-tax-candidate'],
                }),
                targetNamespaces: ['taxContribution'],
                saveProposals: true,
                apply: false,
                maxTransactions: 1,
              }),
              candidateCount: 1,
              candidateReasons: expect.arrayContaining([
                'provider category references retirement',
                'provider category references investments',
              ]),
              fallbackParams: expect.objectContaining({
                selector: expect.objectContaining({
                  missingNamespace: 'taxContribution',
                  limit: 50,
                }),
              }),
            }),
          ]),
        }),
      ]),
    )
  })

  it('keeps labeled cross-currency money flows out of expenses while counting fees', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'wise-us-to-ca-principal',
            source: 'plaid',
            name: 'Wise Inc WISE',
            merchantName: 'Wise',
            amount: 18131,
            direction: 'expense',
            category: ['Other'],
            date: '2026-06-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'wise-us-to-ca-fee',
            source: 'plaid',
            name: 'Wise Transfer Fee',
            merchantName: 'Wise',
            amount: 42,
            direction: 'expense',
            category: ['Bank Fees'],
            date: '2026-06-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'restaurant-final-spend',
            source: 'plaid',
            name: 'Restaurant',
            merchantName: 'Restaurant',
            amount: 100,
            direction: 'expense',
            category: ['Food And Drink'],
            date: '2026-06-12',
            isoCurrencyCode: 'CAD',
            recurring: false,
          },
          {
            id: 'rental-income',
            source: 'plaid',
            name: 'Rent Payment',
            amount: 1000,
            direction: 'income',
            category: ['Income'],
            date: '2026-06-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const healthBeforeLabelResponse = await app.request('/api/data-health')
    expect(healthBeforeLabelResponse.status).toBe(200)
    const healthBeforeLabel = (await healthBeforeLabelResponse.json()) as {
      cashFlow: {
        moneyFlowReview: {
          count: number
          totalAmount: number
          minAmount: number
          recommendedRpc?: string
          params?: Record<string, unknown>
        }
      }
      nextActions: Array<{
        action: string
        rpc: string
        count?: number
        params?: Record<string, unknown>
      }>
      warnings: string[]
    }
    expect(healthBeforeLabel.cashFlow.moneyFlowReview).toEqual(
      expect.objectContaining({
        count: 1,
        totalAmount: 18131,
        minAmount: 5000,
        recommendedRpc: 'money.transactions.reviewGroups',
        params: expect.objectContaining({
          reason: 'missing_namespace',
          namespace: 'moneyFlow',
          direction: 'expense',
          minAmount: 5000,
          minCount: 1,
        }),
      }),
    )
    expect(healthBeforeLabel.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'review-money-flow-candidates',
          rpc: 'money.transactions.reviewGroups',
          count: 1,
          params: expect.objectContaining({ namespace: 'moneyFlow' }),
        }),
      ]),
    )
    expect(healthBeforeLabel.warnings).toEqual(
      expect.arrayContaining(['money_flow_review_needed']),
    )

    const candidateReviewResponse = await app.request(
      '/api/transactions/review?reason=missing_namespace&namespace=moneyFlow&direction=expense&currencyCode=USD&minAmount=5000&limit=10',
    )
    expect(candidateReviewResponse.status).toBe(200)
    const candidateReview = (await candidateReviewResponse.json()) as {
      total: number
      counts: { missing_namespace: number }
      items: Array<{
        transaction: { id: string; amount: number; isoCurrencyCode: string }
        labelActions?: Array<{
          action: string
          previewRequest: { values: Record<string, unknown> }
        }>
      }>
    }
    expect(candidateReview.total).toBe(1)
    expect(candidateReview.counts.missing_namespace).toBe(1)
    expect(candidateReview.items[0]).toEqual(
      expect.objectContaining({
        transaction: expect.objectContaining({
          id: 'wise-us-to-ca-principal',
          amount: 18131,
          isoCurrencyCode: 'USD',
        }),
      }),
    )
    expect(candidateReview.items[0]?.labelActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'money-flow-transfer',
          previewRequest: expect.objectContaining({
            values: expect.objectContaining({
              role: 'transfer',
              sourceCurrency: 'USD',
              sourceAmount: 18131,
            }),
          }),
        }),
      ]),
    )

    const rpcSearchResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.search',
        params: {
          direction: 'expense',
          currencyCode: 'USD',
          minAmount: 5000,
          limit: 10,
        },
      }),
    })
    expect(rpcSearchResponse.status).toBe(200)
    const rpcSearch = (await rpcSearchResponse.json()) as {
      ok: boolean
      result: { total: number; transactions: Array<{ id: string }> }
    }
    expect(rpcSearch).toEqual(
      expect.objectContaining({
        ok: true,
        result: expect.objectContaining({
          total: 1,
          transactions: [
            expect.objectContaining({ id: 'wise-us-to-ca-principal' }),
          ],
        }),
      }),
    )

    const selectorPreviewResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.labelPreview',
        params: {
          selector: {
            direction: 'expense',
            currencyCode: 'USD',
            minAmount: 5000,
            missingNamespace: 'moneyFlow',
            limit: 10,
          },
          namespace: 'moneyFlow',
          values: {
            flowId: 'candidate-flow',
            role: 'transfer',
            status: 'active',
            sourceCurrency: 'USD',
          },
        },
      }),
    })
    expect(selectorPreviewResponse.status).toBe(200)
    const selectorPreview = (await selectorPreviewResponse.json()) as {
      ok: boolean
      result: { ok: boolean; matched: { total: number; selected: number } }
    }
    expect(selectorPreview).toEqual(
      expect.objectContaining({
        ok: true,
        result: expect.objectContaining({
          ok: true,
          matched: expect.objectContaining({ total: 1, selected: 1 }),
        }),
      }),
    )

    const extensionResponse = await app.request('/api/extensions/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: [
          {
            entity: 'transaction',
            entityId: 'wise-us-to-ca-principal',
            namespace: 'moneyFlow',
            source: 'user',
            confidence: 1,
            values: {
              flowId: 'wise-usd-cad-2026-06-10',
              role: 'transfer',
              status: 'active',
              sourceCurrency: 'USD',
              targetCurrency: 'CAD',
              sourceAmount: 18131,
              targetAmount: 24750,
              reportingCurrency: 'CAD',
              reportingValue: 24750,
              reportingValueStatus: 'locked',
              reportingFxRate: 1.3651,
              reportingFxAsOf: '2026-06-10',
              reportingFxSource: 'provider',
              provider: 'Wise',
            },
          },
          {
            entity: 'transaction',
            entityId: 'wise-us-to-ca-fee',
            namespace: 'moneyFlow',
            source: 'user',
            confidence: 1,
            values: {
              flowId: 'wise-usd-cad-2026-06-10',
              role: 'fee',
              status: 'active',
              feeAmount: 42,
              provider: 'Wise',
            },
          },
        ],
      }),
    })
    expect(extensionResponse.status).toBe(200)
    const rebuildAfterExtensionResponse = await app.request(
      '/api/warehouse/rebuild',
      {
        method: 'POST',
      },
    )
    expect(rebuildAfterExtensionResponse.status).toBe(200)

    const summaryResponse = await app.request('/api/summary')
    expect(summaryResponse.status).toBe(200)
    const summary = (await summaryResponse.json()) as {
      income: number
      expenses: number
      cashFlow: number
    }
    expect(summary).toEqual(
      expect.objectContaining({
        income: 1000,
        expenses: 142,
        cashFlow: 858,
      }),
    )

    const healthAfterLabelResponse = await app.request('/api/data-health')
    expect(healthAfterLabelResponse.status).toBe(200)
    const healthAfterLabel = (await healthAfterLabelResponse.json()) as {
      cashFlow: {
        moneyFlowReview: { count: number; totalAmount: number }
        moneyFlowResolution: {
          count: number
          counts: { incomplete: number }
          flowIds: string[]
          recommendedRpc?: string
          params?: Record<string, unknown>
        }
      }
      nextActions: Array<{
        action: string
        rpc?: string
        params?: Record<string, unknown>
        drilldownParams?: Record<string, unknown>
      }>
      warnings: string[]
    }
    expect(healthAfterLabel.cashFlow.moneyFlowReview).toEqual(
      expect.objectContaining({ count: 0, totalAmount: 0 }),
    )
    expect(healthAfterLabel.cashFlow.moneyFlowResolution).toEqual(
      expect.objectContaining({
        count: 1,
        counts: expect.objectContaining({ incomplete: 1 }),
        flowIds: ['wise-usd-cad-2026-06-10'],
        recommendedRpc: 'money.moneyFlows.list',
        params: expect.objectContaining({ status: 'needs-review' }),
      }),
    )
    expect(healthAfterLabel.nextActions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'review-money-flow-candidates' }),
      ]),
    )
    expect(healthAfterLabel.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'resolve-money-flows',
          rpc: 'money.moneyFlows.list',
          params: expect.objectContaining({ status: 'needs-review' }),
          drilldownParams: expect.objectContaining({
            status: 'needs-review',
            includeCandidateSearches: true,
            candidateSearchLimit: 10,
          }),
        }),
      ]),
    )
    expect(healthAfterLabel.warnings).not.toContain('money_flow_review_needed')
    expect(healthAfterLabel.warnings).toContain('money_flow_resolution_needed')

    const transfersResponse = await app.request(
      '/api/transactions?direction=transfer',
    )
    expect(transfersResponse.status).toBe(200)
    const transfers = (await transfersResponse.json()) as {
      total: number
      transactions: Array<{
        id: string
        direction: string
        transferReason?: string
      }>
    }
    expect(transfers.total).toBe(1)
    expect(transfers.transactions).toEqual([
      expect.objectContaining({
        id: 'wise-us-to-ca-principal',
        direction: 'transfer',
        transferReason: 'money_flow_transfer',
      }),
    ])

    const expenseFormulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'Expenses.Sum()', format: 'currency' }),
    })
    expect(expenseFormulaResponse.status).toBe(200)
    const expenseFormula = (await expenseFormulaResponse.json()) as {
      result: { value: number; displayValue: string }
    }
    expect(expenseFormula.result).toEqual(
      expect.objectContaining({ value: 142, displayValue: '$142' }),
    )

    const flowFormulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'MoneyFlows.Where(role != "fee").Sum()',
        format: 'currency',
      }),
    })
    expect(flowFormulaResponse.status).toBe(200)
    const flowFormula = (await flowFormulaResponse.json()) as {
      result: { value: number; referencedCollections: string[] }
    }
    expect(flowFormula.result).toEqual(
      expect.objectContaining({
        value: 24750,
        referencedCollections: ['MoneyFlows'],
      }),
    )

    const cadFlowFormulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'MoneyFlows.Where(reportingCurrency = "CAD").Sum()',
        format: 'currency',
      }),
    })
    expect(cadFlowFormulaResponse.status).toBe(200)
    const cadFlowFormula = (await cadFlowFormulaResponse.json()) as {
      result: { value: number; referencedCollections: string[] }
    }
    expect(cadFlowFormula.result).toEqual(
      expect.objectContaining({
        value: 24750,
        referencedCollections: ['MoneyFlows'],
      }),
    )

    const feeFormulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'MoneyFlows.Where(role = "fee").Sum()',
        format: 'currency',
      }),
    })
    expect(feeFormulaResponse.status).toBe(200)
    const feeFormula = (await feeFormulaResponse.json()) as {
      result: { value: number; displayValue: string }
    }
    expect(feeFormula.result).toEqual(
      expect.objectContaining({ value: 42, displayValue: '$42' }),
    )

    const templatesResponse = await app.request(
      '/api/cards/templates?ids=money-flow-volume,money-flow-fees&includeEvaluation=true',
    )
    expect(templatesResponse.status).toBe(200)
    const templates = (await templatesResponse.json()) as {
      templates: Array<{
        id: string
        category: string
        requiredExtensions: string[]
        referencedCollections: string[]
        test?: { ok: boolean; result?: { outputType: string } }
      }>
    }
    expect(templates.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'money-flow-volume',
          category: 'cash-flow',
          requiredExtensions: ['transaction:moneyFlow'],
          referencedCollections: ['MoneyFlows'],
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'money' }),
          }),
        }),
        expect.objectContaining({
          id: 'money-flow-fees',
          category: 'cash-flow',
          requiredExtensions: ['transaction:moneyFlow'],
          referencedCollections: ['MoneyFlows'],
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'money' }),
          }),
        }),
      ]),
    )
  })

  it('teaches merchant label rules and applies them to future imports', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'flowco-transfer-1',
            source: 'plaid',
            name: 'FlowCo Transfer',
            merchantName: 'FlowCo',
            amount: 1200,
            direction: 'expense',
            category: ['Other'],
            date: '2026-02-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'flowco-transfer-2',
            source: 'plaid',
            name: 'FlowCo Transfer',
            merchantName: 'FlowCo',
            amount: 800,
            direction: 'expense',
            category: ['Other'],
            date: '2026-03-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'unrelated-spend',
            source: 'plaid',
            name: 'Corner Store',
            amount: 40,
            direction: 'expense',
            category: ['General Merchandise'],
            date: '2026-03-11',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const ruleResponse = await app.request('/api/labels/rules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'FlowCo transfers are holding-tank transfers',
        scope: 'merchant',
        match: { merchantId: 'flowco', direction: 'expense' },
        namespace: 'moneyFlow',
        values: {
          flowId: 'flowco-cross-border',
          role: 'transfer',
          status: 'active',
          provider: 'FlowCo',
        },
        createdBy: 'user',
        confidence: 0.99,
      }),
    })
    expect(ruleResponse.status).toBe(200)
    const rule = (await ruleResponse.json()) as {
      ok: boolean
      matched: { total: number; selected: number }
      rule: { id: string; namespace: string; match: { merchantIds: string[] } }
      counts: { active: { moneyFlow: number } }
    }
    expect(rule).toEqual(
      expect.objectContaining({
        ok: true,
        matched: expect.objectContaining({ total: 2, selected: 2 }),
        rule: expect.objectContaining({
          namespace: 'moneyFlow',
          match: expect.objectContaining({ merchantIds: ['flowco'] }),
        }),
      }),
    )
    expect(rule.counts.active.moneyFlow).toBe(1)

    const firstExtensionsResponse = await app.request(
      '/api/extensions/values?entity=transaction&namespace=moneyFlow',
    )
    expect(firstExtensionsResponse.status).toBe(200)
    const firstExtensions = (await firstExtensionsResponse.json()) as {
      total: number
      extensions: Array<{
        entityId: string
        source: string
        values: { role: string }
      }>
    }
    expect(firstExtensions.total).toBe(2)
    expect(firstExtensions.extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'flowco-transfer-1',
          source: 'rule',
          values: expect.objectContaining({ role: 'transfer' }),
        }),
        expect.objectContaining({
          entityId: 'flowco-transfer-2',
          source: 'rule',
          values: expect.objectContaining({ role: 'transfer' }),
        }),
      ]),
    )

    const futureImportResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'flowco-transfer-3',
            source: 'plaid',
            name: 'FlowCo Transfer',
            merchantName: 'FlowCo',
            amount: 600,
            direction: 'expense',
            category: ['Other'],
            date: '2026-04-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(futureImportResponse.status).toBe(200)

    const nextExtensionsResponse = await app.request(
      '/api/extensions/values?entity=transaction&namespace=moneyFlow',
    )
    expect(nextExtensionsResponse.status).toBe(200)
    const nextExtensions = (await nextExtensionsResponse.json()) as {
      total: number
      extensions: Array<{ entityId: string; source: string }>
    }
    expect(nextExtensions.total).toBe(3)
    expect(nextExtensions.extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'flowco-transfer-3',
          source: 'rule',
        }),
      ]),
    )

    const summaryResponse = await app.request('/api/summary')
    expect(summaryResponse.status).toBe(200)
    const summary = (await summaryResponse.json()) as { expenses: number }
    expect(summary.expenses).toBe(40)
  })

  it('can teach a forward rule from transaction label apply', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'streamco-jan',
            source: 'plaid',
            name: 'StreamCo',
            merchantName: 'StreamCo',
            amount: 19,
            direction: 'expense',
            category: ['Entertainment'],
            date: '2026-01-02',
            isoCurrencyCode: 'USD',
            recurring: true,
          },
          {
            id: 'streamco-feb',
            source: 'plaid',
            name: 'StreamCo',
            merchantName: 'StreamCo',
            amount: 19,
            direction: 'expense',
            category: ['Entertainment'],
            date: '2026-02-02',
            isoCurrencyCode: 'USD',
            recurring: true,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const applyResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.labelApply',
        params: {
          selector: {
            merchantIds: ['streamco'],
            missingNamespace: 'budget',
            limit: 100,
          },
          namespace: 'budget',
          values: {
            need: 'useful',
            goal: 'streaming',
          },
          source: 'user',
          confidence: 1,
          teachRule: true,
          rule: { name: 'StreamCo budget label' },
        },
      }),
    })
    expect(applyResponse.status).toBe(200)
    const apply = (await applyResponse.json()) as {
      ok: boolean
      result: {
        matched: { total: number; selected: number }
        taughtRule?: { namespace: string; match: { merchantIds: string[] } }
      }
    }
    expect(apply.ok).toBe(true)
    expect(apply.result.matched).toEqual(
      expect.objectContaining({ total: 2, selected: 2 }),
    )
    expect(apply.result.taughtRule).toEqual(
      expect.objectContaining({
        namespace: 'budget',
        match: expect.objectContaining({ merchantIds: ['streamco'] }),
      }),
    )

    const rulesResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.transactions.labelRules.list' }),
    })
    expect(rulesResponse.status).toBe(200)
    const rules = (await rulesResponse.json()) as {
      ok: boolean
      result: {
        total: number
        rules: Array<{ namespace: string; name: string }>
      }
    }
    expect(rules.ok).toBe(true)
    expect(rules.result.total).toBe(1)
    expect(rules.result.rules).toEqual([
      expect.objectContaining({
        namespace: 'budget',
        name: 'StreamCo budget label',
      }),
    ])
  })

  it('uses stored FX rates as reporting-currency fallback for money flows', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'usd-cad-flow-principal',
            source: 'plaid',
            name: 'Cross Border Transfer',
            amount: 1000,
            direction: 'expense',
            category: ['Other'],
            date: '2026-04-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const currencyResponse = await app.request('/api/currency/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reportingCurrency: 'CAD' }),
    })
    expect(currencyResponse.status).toBe(200)

    const fxResponse = await app.request('/api/fx-rates', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        rates: [
          {
            baseCurrency: 'USD',
            quoteCurrency: 'CAD',
            rate: 1.37,
            asOf: '2026-04-10',
            source: 'market',
            status: 'estimated',
          },
        ],
      }),
    })
    expect(fxResponse.status).toBe(200)

    const extensionResponse = await app.request('/api/extensions/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: [
          {
            entity: 'transaction',
            entityId: 'usd-cad-flow-principal',
            namespace: 'moneyFlow',
            source: 'agent',
            confidence: 0.9,
            values: {
              flowId: 'usd-cad-flow',
              role: 'transfer',
              status: 'active',
              sourceCurrency: 'USD',
              sourceAmount: 1000,
            },
          },
        ],
      }),
    })
    expect(extensionResponse.status).toBe(200)

    const transfersResponse = await app.request(
      '/api/transactions?direction=transfer',
    )
    expect(transfersResponse.status).toBe(200)
    const transfers = (await transfersResponse.json()) as {
      transactions: Array<{
        id: string
        valueForSum: number
        extensions?: { moneyFlow?: Record<string, unknown> }
      }>
    }
    expect(transfers.transactions).toEqual([
      expect.objectContaining({
        id: 'usd-cad-flow-principal',
        valueForSum: 1370,
        extensions: expect.objectContaining({
          moneyFlow: expect.objectContaining({
            reportingCurrency: 'CAD',
            reportingValue: 1370,
            reportingValueStatus: 'estimated',
            reportingFxRate: 1.37,
            reportingFxAsOf: '2026-04-10',
            reportingFxSource: 'market',
          }),
        }),
      }),
    ])

    const formulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'MoneyFlows.Where(reportingCurrency = "CAD").Sum()',
        format: 'currency',
      }),
    })
    expect(formulaResponse.status).toBe(200)
    const formula = (await formulaResponse.json()) as {
      result: { value: number; displayValue: string }
    }
    expect(formula.result).toEqual(
      expect.objectContaining({
        value: 1370,
        displayValue: 'CA$1,370',
      }),
    )

    const rpcRatesResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.fxRates.list', params: {} }),
    })
    expect(rpcRatesResponse.status).toBe(200)
    const rpcRates = (await rpcRatesResponse.json()) as {
      ok: boolean
      result: {
        total: number
        rates: Array<{ baseCurrency: string; quoteCurrency: string }>
      }
    }
    expect(rpcRates).toEqual(
      expect.objectContaining({
        ok: true,
        result: expect.objectContaining({
          total: 1,
          rates: [
            expect.objectContaining({
              baseCurrency: 'USD',
              quoteCurrency: 'CAD',
            }),
          ],
        }),
      }),
    )
  })

  it('uses reporting-currency amounts for ordinary transaction and account formulas', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [
          {
            id: 'usd-checking-reporting',
            source: 'manual',
            name: 'USD Checking',
            type: 'cash',
            currentBalance: 1000,
            isoCurrencyCode: 'USD',
            asOf: '2026-04-10T00:00:00.000Z',
          },
          {
            id: 'cad-savings-reporting',
            source: 'manual',
            name: 'CAD Savings',
            type: 'cash',
            currentBalance: 500,
            isoCurrencyCode: 'CAD',
            asOf: '2026-04-10T00:00:00.000Z',
          },
        ],
        transactions: [
          {
            id: 'usd-expense-reporting',
            source: 'manual',
            accountId: 'usd-checking-reporting',
            name: 'USD Expense',
            amount: 100,
            direction: 'expense',
            category: ['General'],
            date: '2026-04-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'cad-expense-reporting',
            source: 'manual',
            accountId: 'cad-savings-reporting',
            name: 'CAD Expense',
            amount: 50,
            direction: 'expense',
            category: ['General'],
            date: '2026-04-10',
            isoCurrencyCode: 'CAD',
            recurring: false,
          },
          {
            id: 'usd-income-reporting',
            source: 'manual',
            accountId: 'usd-checking-reporting',
            name: 'USD Income',
            amount: 200,
            direction: 'income',
            category: ['Income'],
            date: '2026-04-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    await app.request('/api/currency/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reportingCurrency: 'CAD' }),
    })
    const fxResponse = await app.request('/api/fx-rates', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        rates: [
          {
            baseCurrency: 'USD',
            quoteCurrency: 'CAD',
            rate: 1.4,
            asOf: '2026-04-10',
            source: 'market',
            status: 'estimated',
          },
        ],
      }),
    })
    expect(fxResponse.status).toBe(200)

    const preview = async (formula: string) => {
      const response = await app.request('/api/formulas/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formula, format: 'currency' }),
      })
      expect(response.status).toBe(200)
      return (await response.json()) as {
        result: { value: number; displayValue: string }
      }
    }

    await expect(preview('Expenses.Sum()')).resolves.toEqual(
      expect.objectContaining({
        result: expect.objectContaining({
          value: 190,
          displayValue: 'CA$190',
        }),
      }),
    )
    await expect(preview('Income.Sum()')).resolves.toEqual(
      expect.objectContaining({
        result: expect.objectContaining({
          value: 280,
          displayValue: 'CA$280',
        }),
      }),
    )
    await expect(preview('Accounts.Sum()')).resolves.toEqual(
      expect.objectContaining({
        result: expect.objectContaining({
          value: 1900,
          displayValue: 'CA$1,900',
        }),
      }),
    )

    const reportingCountResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula:
          'Expenses.Where(reportingCurrency = "CAD").Where(reportingValueStatus = "estimated").Count()',
        format: 'number',
      }),
    })
    expect(reportingCountResponse.status).toBe(200)
    const reportingCount = (await reportingCountResponse.json()) as {
      result: { value: number }
    }
    expect(reportingCount.result.value).toBe(1)
  })

  it('does not invent reporting-currency values when an FX rate is missing', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'usd-expense-missing-fx',
            source: 'manual',
            name: 'USD Expense Missing FX',
            amount: 100,
            direction: 'expense',
            category: ['General'],
            date: '2026-04-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'cad-expense-missing-fx',
            source: 'manual',
            name: 'CAD Expense Missing FX',
            amount: 50,
            direction: 'expense',
            category: ['General'],
            date: '2026-04-10',
            isoCurrencyCode: 'CAD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    await app.request('/api/currency/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reportingCurrency: 'CAD' }),
    })

    const reportingCountResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'Expenses.Where(reportingCurrency = "CAD").Count()',
        format: 'number',
      }),
    })
    expect(reportingCountResponse.status).toBe(200)
    const reportingCount = (await reportingCountResponse.json()) as {
      result: { value: number }
    }
    expect(reportingCount.result.value).toBe(1)

    const expenseResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'Expenses.Sum()', format: 'currency' }),
    })
    expect(expenseResponse.status).toBe(200)
    const expense = (await expenseResponse.json()) as {
      result: { value: number; displayValue: string }
    }
    expect(expense.result).toEqual(
      expect.objectContaining({
        value: 150,
        displayValue: 'CA$150',
      }),
    )
  })

  it('groups money flows and flags incomplete transfer chains for review', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'flow-source-usd',
            source: 'plaid',
            name: 'Transfer Out',
            amount: 1000,
            direction: 'expense',
            category: ['Transfer'],
            date: '2026-04-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'flow-destination-cad',
            source: 'plaid',
            name: 'Transfer In',
            amount: 1360,
            direction: 'income',
            category: ['Transfer'],
            date: '2026-04-11',
            isoCurrencyCode: 'CAD',
            recurring: false,
          },
          {
            id: 'flow-fee-cad',
            source: 'plaid',
            name: 'Transfer Fee',
            amount: 10,
            direction: 'expense',
            category: ['Bank Fees'],
            date: '2026-04-10',
            isoCurrencyCode: 'CAD',
            recurring: false,
          },
          {
            id: 'missing-destination-transfer',
            source: 'plaid',
            name: 'Unmatched Transfer',
            amount: 5000,
            direction: 'expense',
            category: ['Transfer'],
            date: '2026-04-12',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'missing-destination-cad-in',
            source: 'plaid',
            name: 'Possible CAD Destination',
            amount: 6850,
            direction: 'transfer',
            category: ['Transfer'],
            date: '2026-04-12',
            isoCurrencyCode: 'CAD',
            recurring: false,
          },
          {
            id: 'unbalanced-source-usd',
            source: 'plaid',
            name: 'Unbalanced Transfer Out',
            amount: 1000,
            direction: 'expense',
            category: ['Transfer'],
            date: '2026-04-18',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'unbalanced-destination-cad',
            source: 'plaid',
            name: 'Unbalanced Transfer In',
            amount: 900,
            direction: 'income',
            category: ['Transfer'],
            date: '2026-04-19',
            isoCurrencyCode: 'CAD',
            recurring: false,
          },
          {
            id: 'unlinked-owned-transfer',
            source: 'plaid',
            name: 'Wise transfer to unlinked Canadian bank',
            amount: 2500,
            direction: 'expense',
            category: ['Transfer'],
            date: '2026-04-22',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const extensionResponse = await app.request('/api/extensions/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: [
          {
            entity: 'transaction',
            entityId: 'flow-source-usd',
            namespace: 'moneyFlow',
            source: 'agent',
            confidence: 1,
            values: {
              flowId: 'balanced-usd-cad-flow',
              role: 'source',
              status: 'active',
              sourceCurrency: 'USD',
              sourceAmount: 1000,
              reportingCurrency: 'CAD',
              reportingValue: 1370,
              reportingValueStatus: 'locked',
            },
          },
          {
            entity: 'transaction',
            entityId: 'flow-destination-cad',
            namespace: 'moneyFlow',
            source: 'agent',
            confidence: 1,
            values: {
              flowId: 'balanced-usd-cad-flow',
              role: 'destination',
              status: 'active',
              targetCurrency: 'CAD',
              targetAmount: 1360,
              reportingCurrency: 'CAD',
              reportingValue: 1360,
              reportingValueStatus: 'locked',
            },
          },
          {
            entity: 'transaction',
            entityId: 'flow-fee-cad',
            namespace: 'moneyFlow',
            source: 'agent',
            confidence: 1,
            values: {
              flowId: 'balanced-usd-cad-flow',
              role: 'fee',
              status: 'active',
              feeAmount: 10,
              reportingCurrency: 'CAD',
              reportingValue: 10,
              reportingValueStatus: 'locked',
            },
          },
          {
            entity: 'transaction',
            entityId: 'missing-destination-transfer',
            namespace: 'moneyFlow',
            source: 'agent',
            confidence: 0.8,
            values: {
              flowId: 'missing-destination-flow',
              role: 'transfer',
              status: 'active',
              sourceCurrency: 'USD',
              sourceAmount: 5000,
              reportingCurrency: 'CAD',
              reportingValue: 6850,
              reportingValueStatus: 'estimated',
            },
          },
          {
            entity: 'transaction',
            entityId: 'unbalanced-source-usd',
            namespace: 'moneyFlow',
            source: 'agent',
            confidence: 1,
            values: {
              flowId: 'unbalanced-usd-cad-flow',
              role: 'source',
              status: 'active',
              sourceCurrency: 'USD',
              sourceAmount: 1000,
              reportingCurrency: 'CAD',
              reportingValue: 1000,
              reportingValueStatus: 'locked',
            },
          },
          {
            entity: 'transaction',
            entityId: 'unbalanced-destination-cad',
            namespace: 'moneyFlow',
            source: 'agent',
            confidence: 1,
            values: {
              flowId: 'unbalanced-usd-cad-flow',
              role: 'destination',
              status: 'active',
              targetCurrency: 'CAD',
              targetAmount: 900,
              reportingCurrency: 'CAD',
              reportingValue: 900,
              reportingValueStatus: 'locked',
            },
          },
          {
            entity: 'transaction',
            entityId: 'unlinked-owned-transfer',
            namespace: 'moneyFlow',
            source: 'agent',
            confidence: 1,
            values: {
              flowId: 'unlinked-owned-cad-flow',
              role: 'transfer',
              status: 'active',
              sourceCurrency: 'USD',
              sourceAmount: 2500,
              destinationKind: 'unlinked_owned',
              targetCurrency: 'CAD',
              reportingCurrency: 'CAD',
              reportingValue: 3425,
              reportingValueStatus: 'estimated',
              note: 'Destination account is owned but not linked yet.',
            },
          },
        ],
      }),
    })
    expect(extensionResponse.status).toBe(200)

    const flowsResponse = await app.request(
      '/api/money-flows?status=all&limit=10',
    )
    expect(flowsResponse.status).toBe(200)
    const flows = (await flowsResponse.json()) as {
      total: number
      counts: {
        all: number
        needsReview: number
        balanced: number
        external: number
        incomplete: number
        unbalanced: number
      }
      flows: Array<{
        flowId: string
        status: string
        needsReview: boolean
        warnings: string[]
        externalDestination?: {
          kind: string
          targetCurrency?: string
          reportingCurrency?: string
          note?: string
        }
        transactionCount: number
        totals: {
          source: number
          destination: number
          fees: number
          imbalance?: number
        }
        roleCounts: Record<string, number>
        labelSelector?: { transactionIds: string[] }
        nextActions: Array<{
          action: string
          priority: number
          rpc: string
          params: {
            entity?: string
            entityId?: string
            namespace?: string
            values?: Record<string, unknown>
            replaceValues?: boolean
            source?: string
            confidence?: number
            startDate?: string
            endDate?: string
            currencyCode?: string
            minAmount?: number
            maxAmount?: number
            limit?: number
          }
          labelTemplate?: {
            namespace: string
            values: Record<string, unknown>
          }
          candidateSearches?: Array<{
            transactionId: string
            date: string
            amount: number
            currencyCode?: string
            params: {
              startDate?: string
              endDate?: string
              currencyCode?: string
              minAmount?: number
              maxAmount?: number
              limit?: number
            }
            labelTemplate: {
              namespace: string
              values: Record<string, unknown>
            }
            previewRequest?: {
              selector: Record<string, unknown>
              namespace: string
              values: Record<string, unknown>
              dryRun: boolean
            }
            applyRequest?: {
              selector: Record<string, unknown>
              namespace: string
              values: Record<string, unknown>
              dryRun: boolean
            }
          }>
          candidateMatchCount?: number
          candidateMatches?: Array<{
            transactionId: string
            date: string
            amount: number
            currencyCode?: string
            sourceTransactionId?: string
            sourceDate?: string
            sourceAmount?: number
            sourceDistanceDays?: number
            score: number
            reasons: string[]
            labelTemplate: {
              namespace: string
              values: Record<string, unknown>
            }
            previewRequest?: {
              selector: Record<string, unknown>
              namespace: string
              values: Record<string, unknown>
              dryRun: boolean
            }
            applyRequest?: {
              selector: Record<string, unknown>
              namespace: string
              values: Record<string, unknown>
              dryRun: boolean
            }
          }>
          candidateMatchGroupCount?: number
          candidateMatchGroups?: Array<{
            sourceTransactionId: string
            sourceDate: string
            sourceAmount: number
            candidateCount: number
            candidates: Array<{
              transactionId: string
              previewRequest?: {
                selector: Record<string, unknown>
                namespace: string
                values: Record<string, unknown>
                dryRun: boolean
              }
              applyRequest?: {
                selector: Record<string, unknown>
                namespace: string
                values: Record<string, unknown>
                dryRun: boolean
              }
            }>
          }>
        }>
        transactions: Array<{ id: string; role: string }>
      }>
    }
    expect(flows.total).toBe(4)
    expect(flows.counts).toEqual(
      expect.objectContaining({
        all: 4,
        needsReview: 2,
        balanced: 1,
        external: 1,
        incomplete: 1,
        unbalanced: 1,
      }),
    )
    expect(flows.flows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          flowId: 'balanced-usd-cad-flow',
          status: 'balanced',
          needsReview: false,
          transactionCount: 3,
          roleCounts: expect.objectContaining({
            source: 1,
            destination: 1,
            fee: 1,
          }),
          totals: expect.objectContaining({
            source: 1370,
            destination: 1360,
            fees: 10,
            imbalance: 0,
          }),
        }),
        expect.objectContaining({
          flowId: 'missing-destination-flow',
          status: 'incomplete',
          needsReview: true,
          warnings: ['missing_destination'],
          transactionCount: 1,
          nextActions: expect.arrayContaining([
            expect.objectContaining({
              action: 'find-destination-leg',
              priority: 1,
              rpc: 'money.transactions.search',
              params: expect.objectContaining({
                startDate: '2026-04-05',
                endDate: '2026-04-19',
                currencyCode: 'CAD',
                minAmount: 5822.5,
                maxAmount: 7877.5,
                limit: 25,
              }),
              labelTemplate: expect.objectContaining({
                namespace: 'moneyFlow',
                values: expect.objectContaining({
                  flowId: 'missing-destination-flow',
                  role: 'destination',
                  status: 'active',
                  targetCurrency: 'CAD',
                  reportingCurrency: 'CAD',
                }),
              }),
              candidateSearches: expect.arrayContaining([
                expect.objectContaining({
                  transactionId: 'missing-destination-transfer',
                  date: '2026-04-12',
                  amount: 6850,
                  currencyCode: 'CAD',
                  params: expect.objectContaining({
                    startDate: '2026-04-05',
                    endDate: '2026-04-19',
                    currencyCode: 'CAD',
                    minAmount: 5822.5,
                    maxAmount: 7877.5,
                    limit: 25,
                  }),
                  labelTemplate: expect.objectContaining({
                    namespace: 'moneyFlow',
                    values: expect.objectContaining({
                      flowId: 'missing-destination-flow',
                      role: 'destination',
                      targetCurrency: 'CAD',
                      reportingCurrency: 'CAD',
                    }),
                  }),
                  previewRequest: expect.objectContaining({
                    namespace: 'moneyFlow',
                    dryRun: true,
                    selector: expect.objectContaining({
                      startDate: '2026-04-05',
                      endDate: '2026-04-19',
                      currencyCode: 'CAD',
                      minAmount: 5822.5,
                      maxAmount: 7877.5,
                      missingNamespace: 'moneyFlow',
                      limit: 25,
                    }),
                    values: expect.objectContaining({
                      flowId: 'missing-destination-flow',
                      role: 'destination',
                    }),
                  }),
                  applyRequest: expect.objectContaining({
                    namespace: 'moneyFlow',
                    dryRun: false,
                    selector: expect.objectContaining({
                      missingNamespace: 'moneyFlow',
                    }),
                    values: expect.objectContaining({
                      flowId: 'missing-destination-flow',
                      role: 'destination',
                    }),
                  }),
                }),
              ]),
            }),
            expect.objectContaining({
              action: 'find-cross-currency-destination-leg',
              priority: 1,
              rpc: 'money.transactions.search',
              params: expect.objectContaining({
                startDate: '2026-04-05',
                endDate: '2026-04-19',
                currencyCode: 'CAD',
                direction: 'transfer',
                limit: 25,
              }),
              labelTemplate: expect.objectContaining({
                namespace: 'moneyFlow',
                values: expect.objectContaining({
                  flowId: 'missing-destination-flow',
                  role: 'destination',
                  status: 'active',
                  targetCurrency: 'CAD',
                  reportingCurrency: 'CAD',
                }),
              }),
              candidateSearches: expect.arrayContaining([
                expect.objectContaining({
                  transactionId: 'missing-destination-transfer',
                  date: '2026-04-12',
                  currencyCode: 'CAD',
                  params: expect.objectContaining({
                    startDate: '2026-04-05',
                    endDate: '2026-04-19',
                    currencyCode: 'CAD',
                    direction: 'transfer',
                    limit: 25,
                  }),
                  labelTemplate: expect.objectContaining({
                    namespace: 'moneyFlow',
                    values: expect.objectContaining({
                      flowId: 'missing-destination-flow',
                      role: 'destination',
                      targetCurrency: 'CAD',
                      reportingCurrency: 'CAD',
                    }),
                  }),
                  previewRequest: expect.objectContaining({
                    namespace: 'moneyFlow',
                    dryRun: true,
                    selector: expect.objectContaining({
                      startDate: '2026-04-05',
                      endDate: '2026-04-19',
                      currencyCode: 'CAD',
                      direction: 'transfer',
                      missingNamespace: 'moneyFlow',
                      limit: 25,
                    }),
                  }),
                  applyRequest: expect.objectContaining({
                    namespace: 'moneyFlow',
                    dryRun: false,
                    selector: expect.objectContaining({
                      missingNamespace: 'moneyFlow',
                    }),
                  }),
                }),
              ]),
              candidateMatchCount: 1,
              candidateMatchGroupCount: 1,
              candidateMatches: [
                expect.objectContaining({
                  transactionId: 'missing-destination-cad-in',
                  date: '2026-04-12',
                  amount: 6850,
                  currencyCode: 'CAD',
                  sourceTransactionId: 'missing-destination-transfer',
                  sourceDate: '2026-04-12',
                  sourceAmount: 6850,
                  sourceDistanceDays: 0,
                  score: 100,
                  reasons: expect.arrayContaining([
                    'linked_non_source_currency',
                    'transfer_direction',
                    'closest_source_leg',
                    'within_0_days_of_source_leg',
                  ]),
                  labelTemplate: expect.objectContaining({
                    namespace: 'moneyFlow',
                    values: expect.objectContaining({
                      flowId: 'missing-destination-flow',
                      role: 'destination',
                      status: 'active',
                      destinationKind: 'linked',
                      targetAmount: 6850,
                      targetCurrency: 'CAD',
                      reportingCurrency: 'CAD',
                      reportingValue: 6850,
                      reportingValueStatus: 'locked',
                    }),
                  }),
                  previewRequest: expect.objectContaining({
                    namespace: 'moneyFlow',
                    dryRun: true,
                    selector: expect.objectContaining({
                      transactionIds: ['missing-destination-cad-in'],
                      missingNamespace: 'moneyFlow',
                      limit: 1,
                    }),
                    values: expect.objectContaining({
                      flowId: 'missing-destination-flow',
                      role: 'destination',
                    }),
                  }),
                  applyRequest: expect.objectContaining({
                    namespace: 'moneyFlow',
                    dryRun: false,
                    selector: expect.objectContaining({
                      transactionIds: ['missing-destination-cad-in'],
                      missingNamespace: 'moneyFlow',
                      limit: 1,
                    }),
                  }),
                }),
              ],
              candidateMatchGroups: [
                expect.objectContaining({
                  sourceTransactionId: 'missing-destination-transfer',
                  sourceDate: '2026-04-12',
                  sourceAmount: 6850,
                  candidateCount: 1,
                  candidates: [
                    expect.objectContaining({
                      transactionId: 'missing-destination-cad-in',
                      previewRequest: expect.objectContaining({
                        namespace: 'moneyFlow',
                        dryRun: true,
                        selector: expect.objectContaining({
                          transactionIds: ['missing-destination-cad-in'],
                          missingNamespace: 'moneyFlow',
                          limit: 1,
                        }),
                      }),
                      applyRequest: expect.objectContaining({
                        namespace: 'moneyFlow',
                        dryRun: false,
                        selector: expect.objectContaining({
                          transactionIds: ['missing-destination-cad-in'],
                          missingNamespace: 'moneyFlow',
                          limit: 1,
                        }),
                      }),
                    }),
                  ],
                }),
              ],
            }),
            expect.objectContaining({
              action: 'mark-unlinked-owned-destination',
              priority: 2,
              rpc: 'money.moneyFlows.markExternalDestination',
              params: expect.objectContaining({
                flowId: 'missing-destination-flow',
                transactionId: 'missing-destination-transfer',
                source: 'agent',
                confidence: 0.9,
                targetCurrency: 'CAD',
                reportingCurrency: 'CAD',
                dryRun: true,
              }),
            }),
          ]),
        }),
        expect.objectContaining({
          flowId: 'unlinked-owned-cad-flow',
          status: 'external',
          needsReview: false,
          warnings: [],
          transactionCount: 1,
          roleCounts: expect.objectContaining({
            transfer: 1,
          }),
          externalDestination: expect.objectContaining({
            kind: 'unlinked_owned',
            targetCurrency: 'CAD',
            reportingCurrency: 'CAD',
            note: 'Destination account is owned but not linked yet.',
          }),
          totals: expect.objectContaining({
            source: 3425,
            destination: 0,
            fees: 0,
          }),
          nextActions: [],
        }),
        expect.objectContaining({
          flowId: 'unbalanced-usd-cad-flow',
          status: 'unbalanced',
          needsReview: true,
          warnings: ['unbalanced'],
          totals: expect.objectContaining({
            source: 1000,
            destination: 900,
            fees: 0,
            imbalance: 100,
          }),
          nextActions: [
            expect.objectContaining({
              action: 'find-fee-or-adjustment-leg',
              priority: 2,
              rpc: 'money.transactions.search',
              params: expect.objectContaining({
                startDate: '2026-04-11',
                endDate: '2026-04-26',
                currencyCode: 'CAD',
                minAmount: 85,
                maxAmount: 115,
                limit: 25,
              }),
              labelTemplate: expect.objectContaining({
                namespace: 'moneyFlow',
                values: expect.objectContaining({
                  flowId: 'unbalanced-usd-cad-flow',
                  role: 'fee',
                  status: 'active',
                  feeAmount: 100,
                  reportingCurrency: 'CAD',
                }),
              }),
            }),
          ],
        }),
      ]),
    )
    const detailedMissingDestination = flows.flows.find(
      (flow) => flow.flowId === 'missing-destination-flow',
    )
    expect(detailedMissingDestination).toEqual(
      expect.objectContaining({
        transactionIds: ['missing-destination-transfer'],
        labelSelector: {
          transactionIds: ['missing-destination-transfer'],
        },
      }),
    )

    const compactFlowsResponse = await app.request(
      '/api/money-flows?status=needs-review&limit=10&includeTransactions=false&includeTransactionIds=false&includeCandidateSearches=false&candidateSearchLimit=1',
    )
    expect(compactFlowsResponse.status).toBe(200)
    const compactFlows = (await compactFlowsResponse.json()) as {
      filters: {
        includeTransactions: boolean
        includeTransactionIds: boolean
        includeCandidateSearches: boolean
        candidateSearchLimit: number
      }
      flows: Array<{
        flowId: string
        transactionIds?: string[]
        transactions?: unknown[]
        labelSelector?: { transactionIds: string[] }
        labelSelectorSummary?: { kind: string; transactionCount: number }
        nextActions: Array<{
          action: string
          candidateSearchCount?: number
          candidateMatchCount?: number
          candidateSearches?: unknown[]
        }>
      }>
    }
    expect(compactFlows.filters).toEqual(
      expect.objectContaining({
        includeTransactions: false,
        includeTransactionIds: false,
        includeCandidateSearches: false,
        candidateSearchLimit: 1,
      }),
    )
    const compactMissingDestination = compactFlows.flows.find(
      (flow) => flow.flowId === 'missing-destination-flow',
    )
    expect(compactMissingDestination).toEqual(
      expect.objectContaining({
        flowId: 'missing-destination-flow',
        labelSelectorSummary: {
          kind: 'transactionIds',
          transactionCount: 1,
        },
      }),
    )
    expect(compactMissingDestination).not.toHaveProperty('transactionIds')
    expect(compactMissingDestination).not.toHaveProperty('transactions')
    expect(compactMissingDestination).not.toHaveProperty('labelSelector')
    expect(compactMissingDestination?.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'find-destination-leg',
          candidateSearchCount: 1,
        }),
        expect.objectContaining({
          action: 'find-cross-currency-destination-leg',
          candidateSearchCount: 1,
        }),
      ]),
    )
    expect(
      compactMissingDestination?.nextActions.some(
        (action) => 'candidateSearches' in action,
      ),
    ).toBe(false)

    const rpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.moneyFlows.list',
        params: { status: 'needs-review' },
      }),
    })
    expect(rpcResponse.status).toBe(200)
    const rpc = (await rpcResponse.json()) as {
      ok: boolean
      result: {
        total: number
        flows: Array<{ flowId: string; status: string }>
      }
    }
    expect(rpc).toEqual(
      expect.objectContaining({
        ok: true,
        result: expect.objectContaining({
          total: 2,
          flows: expect.arrayContaining([
            expect.objectContaining({
              flowId: 'missing-destination-flow',
              status: 'incomplete',
            }),
            expect.objectContaining({
              flowId: 'unbalanced-usd-cad-flow',
              status: 'unbalanced',
            }),
          ]),
        }),
      }),
    )

    const dryRunExternalResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.moneyFlows.markExternalDestination',
        params: {
          flowId: 'missing-destination-flow',
          transactionId: 'missing-destination-transfer',
          targetCurrency: 'CAD',
          reportingCurrency: 'CAD',
          externalAccountName: 'Canadian bank',
          dryRun: true,
        },
      }),
    })
    expect(dryRunExternalResponse.status).toBe(200)
    const dryRunExternal = (await dryRunExternalResponse.json()) as {
      ok: boolean
      result: {
        dryRun: boolean
        selectedTransaction: { id: string; role: string }
        patchRequest: {
          method: string
          params: { entityId: string; values: Record<string, unknown> }
        }
      }
    }
    expect(dryRunExternal).toEqual(
      expect.objectContaining({
        ok: true,
        result: expect.objectContaining({
          dryRun: true,
          selectedTransaction: expect.objectContaining({
            id: 'missing-destination-transfer',
            role: 'transfer',
          }),
          patchRequest: expect.objectContaining({
            method: 'money.extensions.values.patch',
            params: expect.objectContaining({
              entityId: 'missing-destination-transfer',
              values: expect.objectContaining({
                destinationKind: 'unlinked_owned',
                targetCurrency: 'CAD',
                reportingCurrency: 'CAD',
                externalAccountName: 'Canadian bank',
              }),
            }),
          }),
        }),
      }),
    )

    const applyExternalResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.moneyFlows.markExternalDestination',
        params: {
          flowId: 'missing-destination-flow',
          transactionId: 'missing-destination-transfer',
          targetCurrency: 'CAD',
          reportingCurrency: 'CAD',
          externalAccountName: 'Canadian bank',
          source: 'agent',
          confidence: 0.95,
        },
      }),
    })
    expect(applyExternalResponse.status).toBe(200)
    const applyExternal = (await applyExternalResponse.json()) as {
      ok: boolean
      result: {
        dryRun: boolean
        flow: {
          flowId: string
          status: string
          needsReview: boolean
          externalDestination?: { kind: string; externalAccountName?: string }
        }
      }
    }
    expect(applyExternal).toEqual(
      expect.objectContaining({
        ok: true,
        result: expect.objectContaining({
          dryRun: false,
          flow: expect.objectContaining({
            flowId: 'missing-destination-flow',
            status: 'external',
            needsReview: false,
            externalDestination: expect.objectContaining({
              kind: 'unlinked_owned',
              externalAccountName: 'Canadian bank',
            }),
          }),
        }),
      }),
    )

    const healthResponse = await app.request('/api/data-health')
    expect(healthResponse.status).toBe(200)
    const health = (await healthResponse.json()) as {
      cashFlow: { moneyFlowResolution: { count: number; flowIds: string[] } }
      nextActions: Array<{
        action: string
        rpc: string
        count?: number
        drilldownParams?: Record<string, unknown>
      }>
      warnings: string[]
    }
    expect(health.cashFlow.moneyFlowResolution).toEqual(
      expect.objectContaining({
        count: 1,
        flowIds: ['unbalanced-usd-cad-flow'],
      }),
    )
    expect(health.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'resolve-money-flows',
          rpc: 'money.moneyFlows.list',
          count: 1,
          drilldownParams: expect.objectContaining({
            status: 'needs-review',
            includeCandidateSearches: true,
            candidateSearchLimit: 10,
          }),
        }),
      ]),
    )
    expect(health.warnings).toEqual(
      expect.arrayContaining(['money_flow_resolution_needed']),
    )
  })

  it('groups transaction review tasks by merchant with bulk label selectors', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'wise-large-one',
            source: 'plaid',
            name: 'Wise Inc WISE',
            merchantName: 'Wise',
            amount: 18000,
            direction: 'expense',
            category: ['Other'],
            date: '2026-04-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'wise-large-two',
            source: 'plaid',
            name: 'Wise Inc WISE',
            merchantName: 'Wise',
            amount: 10000,
            direction: 'expense',
            category: ['Other'],
            date: '2026-04-15',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'single-large-other',
            source: 'plaid',
            name: 'Large Other',
            merchantName: 'Other Payee',
            amount: 9000,
            direction: 'expense',
            category: ['Other'],
            date: '2026-04-20',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const groupsResponse = await app.request(
      '/api/transactions/review/groups?reason=missing_namespace&namespace=moneyFlow&direction=expense&currencyCode=USD&minAmount=5000&minCount=2',
    )
    expect(groupsResponse.status).toBe(200)
    const groups = (await groupsResponse.json()) as {
      total: number
      counts: {
        groups: number
        transactions: number
      }
      groups: Array<{
        merchantId: string
        name: string
        count: number
        totalAmount: number
        labelSelector: { merchantIds?: string[]; missingNamespace?: string }
        labelActions?: Array<{
          action: string
          previewRequest: { selector: { merchantIds?: string[] } }
          applyRequest: { selector: { merchantIds?: string[] } }
        }>
        transactions: Array<{ id: string }>
      }>
    }
    expect(groups.total).toBe(1)
    expect(groups.counts).toEqual(
      expect.objectContaining({
        groups: 1,
        transactions: 2,
      }),
    )
    expect(groups.groups).toEqual([
      expect.objectContaining({
        merchantId: 'wise',
        name: 'Wise',
        count: 2,
        totalAmount: 28000,
        labelSelector: expect.objectContaining({
          merchantIds: ['wise'],
          missingNamespace: 'moneyFlow',
        }),
        transactions: [
          expect.objectContaining({ id: 'wise-large-two' }),
          expect.objectContaining({ id: 'wise-large-one' }),
        ],
        labelActions: expect.arrayContaining([
          expect.objectContaining({
            action: 'money-flow-transfer',
            previewRequest: expect.objectContaining({
              selector: expect.objectContaining({ merchantIds: ['wise'] }),
            }),
            applyRequest: expect.objectContaining({
              selector: expect.objectContaining({ merchantIds: ['wise'] }),
            }),
          }),
        ]),
      }),
    ])

    const summaryGroupsResponse = await app.request(
      '/api/transactions/review/groups?reason=missing_namespace&namespace=moneyFlow&direction=expense&currencyCode=USD&minAmount=5000&minCount=2&includeTransactions=false&includeTransactionIds=false&transactionSampleLimit=0',
    )
    expect(summaryGroupsResponse.status).toBe(200)
    const summaryGroups = (await summaryGroupsResponse.json()) as {
      filters: {
        includeTransactions: boolean
        includeTransactionIds: boolean
        transactionSampleLimit: number
      }
      groups: Array<{
        merchantId: string
        count: number
        totalAmount: number
        transactionIds?: string[]
        transactions?: Array<{ id: string }>
      }>
    }
    expect(summaryGroups.filters).toEqual(
      expect.objectContaining({
        includeTransactions: false,
        includeTransactionIds: false,
        transactionSampleLimit: 0,
      }),
    )
    expect(summaryGroups.groups).toEqual([
      expect.objectContaining({
        merchantId: 'wise',
        count: 2,
        totalAmount: 28000,
      }),
    ])
    expect(summaryGroups.groups[0]?.transactionIds).toBeUndefined()
    expect(summaryGroups.groups[0]?.transactions).toBeUndefined()

    const sampleGroupsResponse = await app.request(
      '/api/transactions/review/groups?reason=missing_namespace&namespace=moneyFlow&direction=expense&currencyCode=USD&minAmount=5000&minCount=2&transactionSampleLimit=1',
    )
    expect(sampleGroupsResponse.status).toBe(200)
    const sampleGroups = (await sampleGroupsResponse.json()) as {
      groups: Array<{
        transactions?: Array<{ id: string }>
        transactionIds?: string[]
      }>
    }
    expect(sampleGroups.groups[0]?.transactions).toHaveLength(1)
    expect(sampleGroups.groups[0]?.transactionIds).toHaveLength(2)

    const rpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.reviewGroups',
        params: {
          reason: 'missing_namespace',
          namespace: 'moneyFlow',
          direction: 'expense',
          currencyCode: 'USD',
          minAmount: 5000,
          minCount: 2,
        },
      }),
    })
    expect(rpcResponse.status).toBe(200)
    const rpc = (await rpcResponse.json()) as {
      ok: boolean
      result: {
        total: number
        groups: Array<{ merchantId: string; count: number }>
      }
    }
    expect(rpc).toEqual(
      expect.objectContaining({
        ok: true,
        result: expect.objectContaining({
          total: 1,
          groups: [expect.objectContaining({ merchantId: 'wise', count: 2 })],
        }),
      }),
    )
  })

  it('suggests budget needs and excludes money-flow transfers from budget review groups', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [
          {
            id: 'credit-account',
            source: 'plaid',
            name: 'Northstar Cash Back Visa',
            officialName: 'Northstar Cash Back Visa',
            type: 'credit',
            subtype: 'credit card',
            currentBalance: 1200,
            isoCurrencyCode: 'USD',
            asOf: '2026-04-03T00:00:00.000Z',
          },
        ],
        transactions: [
          {
            id: 'rent-payment',
            source: 'plaid',
            name: 'Apartment Rent',
            merchantName: 'Property Manager',
            amount: 2500,
            direction: 'expense',
            category: ['RENT_AND_UTILITIES_RENT'],
            providerCategoryPrimary: 'RENT_AND_UTILITIES',
            providerCategoryDetailed: 'RENT_AND_UTILITIES_RENT',
            date: '2026-04-01',
            isoCurrencyCode: 'USD',
            recurring: true,
          },
          {
            id: 'cafe-payment',
            source: 'plaid',
            name: 'Cafe Lunch',
            merchantName: 'Cafe',
            amount: 28,
            direction: 'expense',
            category: ['FOOD_AND_DRINK_RESTAURANT'],
            providerCategoryPrimary: 'FOOD_AND_DRINK',
            providerCategoryDetailed: 'FOOD_AND_DRINK_RESTAURANT',
            date: '2026-04-02',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'credit-card-payment',
            source: 'plaid',
            name: 'Bill payment - Northstar Cash Back Visa',
            merchantName: 'Northstar Bill Pay',
            amount: 1200,
            direction: 'expense',
            category: ['RENT_AND_UTILITIES_INTERNET_AND_CABLE'],
            providerCategoryPrimary: 'RENT_AND_UTILITIES',
            providerCategoryDetailed: 'RENT_AND_UTILITIES_INTERNET_AND_CABLE',
            date: '2026-04-03',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'transfer-payment',
            source: 'plaid',
            name: 'Cross Border Transfer',
            merchantName: 'Transfer Provider',
            amount: 5000,
            direction: 'expense',
            category: ['Other'],
            date: '2026-04-03',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const flowLabelResponse = await app.request('/api/extensions/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: [
          {
            entity: 'transaction',
            entityId: 'transfer-payment',
            namespace: 'moneyFlow',
            source: 'user',
            confidence: 1,
            values: {
              flowId: 'cross-border-transfer',
              role: 'transfer',
              status: 'active',
            },
          },
        ],
      }),
    })
    expect(flowLabelResponse.status).toBe(200)

    const groupsResponse = await app.request(
      '/api/transactions/review/groups?reason=missing_namespace&namespace=budget&minCount=1',
    )
    expect(groupsResponse.status).toBe(200)
    const groups = (await groupsResponse.json()) as {
      total: number
      groups: Array<{
        merchantId: string
        kind: string
        suggested?: {
          namespace: string
          values: { need?: string }
          confidence?: number
        }
      }>
    }

    expect(groups.groups.map((group) => group.merchantId).sort()).toEqual([
      'cafe',
      'property-manager',
    ])
    expect(groups.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          merchantId: 'property-manager',
          kind: 'spending',
          suggested: expect.objectContaining({
            namespace: 'budget',
            values: { need: 'required' },
          }),
        }),
        expect.objectContaining({
          merchantId: 'cafe',
          kind: 'spending',
          suggested: expect.objectContaining({
            namespace: 'budget',
            values: { need: 'optional' },
          }),
        }),
      ]),
    )

    const defaultGroupsResponse = await app.request(
      '/api/transactions/review/groups?minCount=1',
    )
    expect(defaultGroupsResponse.status).toBe(200)
    const defaultGroups = (await defaultGroupsResponse.json()) as {
      total: number
      filters: { reason?: string; namespace?: string; direction?: string }
      groups: Array<{ merchantId: string; namespace?: string; kind: string }>
    }
    expect(defaultGroups.filters).toEqual(
      expect.objectContaining({
        reason: 'missing_namespace',
        namespace: 'budget',
        direction: 'expense',
      }),
    )
    expect(
      defaultGroups.groups.map((group) => group.merchantId).sort(),
    ).toEqual(['cafe', 'property-manager'])
    expect(
      defaultGroups.groups.every((group) => group.namespace === 'budget'),
    ).toBe(true)

    const defaultGroupsRpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.reviewGroups',
        params: { minCount: 1 },
      }),
    })
    expect(defaultGroupsRpcResponse.status).toBe(200)
    const defaultGroupsRpc = (await defaultGroupsRpcResponse.json()) as {
      ok: boolean
      result: {
        filters: { reason?: string; namespace?: string; direction?: string }
        groups: Array<{ merchantId: string }>
      }
    }
    expect(defaultGroupsRpc.ok).toBe(true)
    expect(defaultGroupsRpc.result.filters).toEqual(
      expect.objectContaining({
        reason: 'missing_namespace',
        namespace: 'budget',
        direction: 'expense',
      }),
    )
    expect(
      defaultGroupsRpc.result.groups.map((group) => group.merchantId).sort(),
    ).toEqual(['cafe', 'property-manager'])
  })

  it('scopes budget review group label actions and taught rules to expense direction', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'tx-mixed-shop-expense',
            source: 'plaid',
            name: 'Refundable Cafe Lunch',
            merchantName: 'Refundable Cafe',
            amount: 42,
            direction: 'expense',
            category: ['FOOD_AND_DRINK_RESTAURANT'],
            providerCategoryPrimary: 'FOOD_AND_DRINK',
            providerCategoryDetailed: 'FOOD_AND_DRINK_RESTAURANT',
            date: '2026-04-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'tx-mixed-shop-refund',
            source: 'plaid',
            name: 'Refundable Cafe Refund',
            merchantName: 'Refundable Cafe',
            amount: 42,
            direction: 'income',
            category: ['REFUND'],
            date: '2026-04-11',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const groupsResponse = await app.request(
      '/api/transactions/review/groups?reason=missing_namespace&namespace=budget&minCount=1',
    )
    expect(groupsResponse.status).toBe(200)
    const groups = (await groupsResponse.json()) as {
      total: number
      filters: { direction?: string }
      groups: Array<{
        merchantId: string
        count: number
        labelSelector: {
          merchantIds?: string[]
          direction?: string
          missingNamespace?: string
        }
        transactions: Array<{ id: string; direction: string }>
        suggestedLabelAction?: {
          applyRequest: {
            selector: {
              merchantIds?: string[]
              direction?: string
              missingNamespace?: string
            }
            namespace: string
            teachRule?: boolean
            rule?: { match?: { merchantIds?: string[]; direction?: string } }
            values: { need?: string }
          }
        }
        labelActions?: Array<{
          action: string
          recommendedRpc: string
          previewRequest: {
            dryRun: boolean
            source?: string
            namespace: string
            teachRule?: boolean
            selector: {
              merchantIds?: string[]
              direction?: string
              missingNamespace?: string
            }
            rule?: { match?: { merchantIds?: string[]; direction?: string } }
            values: { need?: string }
          }
          applyRequest: {
            dryRun: boolean
            source?: string
            namespace: string
            teachRule?: boolean
            selector: {
              merchantIds?: string[]
              direction?: string
              missingNamespace?: string
            }
            rule?: { match?: { merchantIds?: string[]; direction?: string } }
            values: { need?: string }
          }
        }>
      }>
    }
    expect(groups.filters.direction).toBe('expense')
    expect(groups.total).toBe(1)
    expect(groups.groups).toEqual([
      expect.objectContaining({
        merchantId: 'refundable-cafe',
        count: 1,
        labelSelector: expect.objectContaining({
          merchantIds: ['refundable-cafe'],
          direction: 'expense',
          missingNamespace: 'budget',
        }),
        transactions: [
          expect.objectContaining({
            id: 'tx-mixed-shop-expense',
            direction: 'expense',
          }),
        ],
        suggestedLabelAction: expect.objectContaining({
          applyRequest: expect.objectContaining({
            selector: expect.objectContaining({
              merchantIds: ['refundable-cafe'],
              direction: 'expense',
              missingNamespace: 'budget',
            }),
            namespace: 'budget',
            teachRule: true,
            rule: expect.objectContaining({
              match: expect.objectContaining({
                merchantIds: ['refundable-cafe'],
                direction: 'expense',
              }),
            }),
            values: { need: 'optional' },
          }),
        }),
        labelActions: expect.arrayContaining([
          expect.objectContaining({
            action: 'budget-required',
            recommendedRpc: 'money.transactions.labelApply',
            previewRequest: expect.objectContaining({
              dryRun: true,
              source: 'user',
              namespace: 'budget',
              teachRule: true,
              selector: expect.objectContaining({
                merchantIds: ['refundable-cafe'],
                direction: 'expense',
                missingNamespace: 'budget',
              }),
              rule: expect.objectContaining({
                match: expect.objectContaining({
                  merchantIds: ['refundable-cafe'],
                  direction: 'expense',
                }),
              }),
              values: { need: 'required' },
            }),
            applyRequest: expect.objectContaining({
              dryRun: false,
              source: 'user',
              namespace: 'budget',
              teachRule: true,
              selector: expect.objectContaining({
                merchantIds: ['refundable-cafe'],
                direction: 'expense',
                missingNamespace: 'budget',
              }),
              rule: expect.objectContaining({
                match: expect.objectContaining({
                  merchantIds: ['refundable-cafe'],
                  direction: 'expense',
                }),
              }),
              values: { need: 'required' },
            }),
          }),
        ]),
      }),
    ])

    const suggestedAction = groups.groups[0]?.suggestedLabelAction
    expect(suggestedAction).toBeDefined()
    const labelResponse = await app.request('/api/labels/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(suggestedAction!.applyRequest),
    })
    expect(labelResponse.status).toBe(200)
    const label = (await labelResponse.json()) as {
      ok: boolean
      matched: { selected: number }
    }
    expect(label.ok).toBe(true)
    expect(label.matched.selected).toBe(1)

    const futureImportResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'tx-mixed-shop-future-expense',
            source: 'plaid',
            name: 'Refundable Cafe Dinner',
            merchantName: 'Refundable Cafe',
            amount: 55,
            direction: 'expense',
            category: ['FOOD_AND_DRINK_RESTAURANT'],
            providerCategoryPrimary: 'FOOD_AND_DRINK',
            providerCategoryDetailed: 'FOOD_AND_DRINK_RESTAURANT',
            date: '2026-05-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'tx-mixed-shop-future-refund',
            source: 'plaid',
            name: 'Refundable Cafe Refund',
            merchantName: 'Refundable Cafe',
            amount: 12,
            direction: 'income',
            category: ['REFUND'],
            date: '2026-05-11',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(futureImportResponse.status).toBe(200)

    const extensionsResponse = await app.request(
      '/api/extensions/values?entity=transaction&namespace=budget',
    )
    expect(extensionsResponse.status).toBe(200)
    const extensions = (await extensionsResponse.json()) as {
      total: number
      extensions: Array<{
        entityId: string
        source: string
        values: { need: string }
      }>
    }
    expect(extensions.total).toBe(2)
    expect(extensions.extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'tx-mixed-shop-expense',
          source: 'user',
          values: expect.objectContaining({ need: 'optional' }),
        }),
        expect.objectContaining({
          entityId: 'tx-mixed-shop-future-expense',
          source: 'rule',
          values: expect.objectContaining({ need: 'optional' }),
        }),
      ]),
    )
    expect(
      extensions.extensions.map((extension) => extension.entityId).sort(),
    ).toEqual(['tx-mixed-shop-expense', 'tx-mixed-shop-future-expense'])
  })

  it('resolves matching pending proposals when a merchant group label is applied', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'tx-ai-tools-one',
            source: 'manual',
            name: 'AI Tools Monthly',
            merchantName: 'AI Tools',
            amount: 25,
            direction: 'expense',
            category: ['Service'],
            date: '2026-05-01',
            isoCurrencyCode: 'USD',
            recurring: true,
          },
          {
            id: 'tx-ai-tools-two',
            source: 'manual',
            name: 'AI Tools Monthly',
            merchantName: 'AI Tools',
            amount: 30,
            direction: 'expense',
            category: ['Service'],
            date: '2026-06-01',
            isoCurrencyCode: 'USD',
            recurring: true,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    process.env.MOLDABLE_AI_SERVER_URL = 'http://ai-server.test'
    process.env.MOLDABLE_APP_ID = 'money'
    process.env.MOLDABLE_APP_TOKEN = 'test-token'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            json: {
              proposals: [
                {
                  transactionId: 'tx-ai-tools-one',
                  namespace: 'budget',
                  values: { need: 'useful', goal: 'AI tools' },
                  confidence: 0.91,
                  reason: 'Useful work software.',
                },
                {
                  transactionId: 'tx-ai-tools-two',
                  namespace: 'budget',
                  values: { need: 'waste', goal: 'wrong' },
                  confidence: 0.62,
                  reason: 'Intentionally wrong for correction coverage.',
                },
              ],
            },
            model: 'openai/gpt-5.5',
            usage: { inputTokens: 20, outputTokens: 20 },
          }),
          { headers: { 'content-type': 'application/json' } },
        )
      }),
    )

    const classifyResponse = await app.request('/api/classify/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selector: {
          merchantIds: ['ai-tools'],
          direction: 'expense',
          limit: 10,
        },
        targetNamespaces: ['budget'],
        apply: false,
        maxTransactions: 5,
      }),
    })
    expect(classifyResponse.status).toBe(200)

    const groupsBeforeResponse = await app.request(
      '/api/transactions/review/groups?reason=has_proposals&namespace=budget&minCount=1',
    )
    expect(groupsBeforeResponse.status).toBe(200)
    const groupsBefore = (await groupsBeforeResponse.json()) as {
      total: number
      counts: { pendingProposals: number }
      groups: Array<{
        merchantId: string
        pendingProposalCount: number
        pendingProposalIds: string[]
        impact: {
          amount: number
          transactionCount: number
          monthsObserved: number
          firstMonth?: string
          lastMonth?: string
          averageMonthlyAmount: number
          annualizedAmount: number
          suggestedNamespace?: string
          suggestedValues?: { need?: string; goal?: string }
          rollupFormula?: string
        }
        suggestedLabelAction?: {
          action: string
          recommendedRpc: string
          previewRequest: {
            namespace: string
            dryRun: boolean
            teachRule?: boolean
            values: { need?: string; goal?: string }
          }
          applyRequest: {
            namespace: string
            dryRun: boolean
            teachRule?: boolean
            values: { need?: string; goal?: string }
          }
        }
      }>
    }
    expect(groupsBefore).toEqual(
      expect.objectContaining({
        total: 1,
        counts: expect.objectContaining({ pendingProposals: 2 }),
        groups: [
          expect.objectContaining({
            merchantId: 'ai-tools',
            pendingProposalCount: 2,
            pendingProposalIds: [
              'transaction-tx-ai-tools-two-budget',
              'transaction-tx-ai-tools-one-budget',
            ],
            impact: {
              amount: 55,
              transactionCount: 2,
              monthsObserved: 2,
              firstMonth: '2026-05',
              lastMonth: '2026-06',
              averageMonthlyAmount: 27.5,
              annualizedAmount: 330,
              suggestedNamespace: 'budget',
              suggestedValues: { need: 'useful', goal: 'AI tools' },
              rollupFormula: 'BudgetLabels.Where(need = "useful").Sum()',
            },
            suggestedLabelAction: expect.objectContaining({
              action: 'apply-suggested-label',
              recommendedRpc: 'money.transactions.labelApply',
              previewRequest: expect.objectContaining({
                namespace: 'budget',
                dryRun: true,
                teachRule: true,
                values: { need: 'useful', goal: 'AI tools' },
              }),
              applyRequest: expect.objectContaining({
                namespace: 'budget',
                dryRun: false,
                teachRule: true,
                values: { need: 'useful', goal: 'AI tools' },
              }),
            }),
          }),
        ],
      }),
    )
    const suggestedAction = groupsBefore.groups[0]?.suggestedLabelAction
    expect(suggestedAction).toBeDefined()

    const labelResponse = await app.request('/api/labels/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(suggestedAction!.applyRequest),
    })
    expect(labelResponse.status).toBe(200)
    const label = (await labelResponse.json()) as {
      ok: boolean
      matched: { selected: number }
      resolvedProposals: Array<{
        id: string
        status: string
        decisionReason: string
      }>
      proposalCounts: Record<string, Record<string, number>>
      reviewAfter: {
        namespaces: Array<{
          namespace: string
          pendingProposalTotal: number
          affectedPendingProposalTotal: number
        }>
      }
    }
    expect(label.ok).toBe(true)
    expect(label.matched.selected).toBe(2)
    expect(label.resolvedProposals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'transaction-tx-ai-tools-one-budget',
          status: 'accepted',
          decisionReason: 'Accepted by transaction labelApply.',
        }),
        expect.objectContaining({
          id: 'transaction-tx-ai-tools-two-budget',
          status: 'rejected',
          decisionReason: 'Superseded by transaction labelApply.',
        }),
      ]),
    )
    expect(label.proposalCounts.accepted['transaction:budget']).toBe(1)
    expect(label.proposalCounts.rejected['transaction:budget']).toBe(1)
    expect(label.reviewAfter.namespaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          namespace: 'budget',
          pendingProposalTotal: 0,
          affectedPendingProposalTotal: 0,
        }),
      ]),
    )

    const groupsAfterResponse = await app.request(
      '/api/transactions/review/groups?reason=has_proposals&namespace=budget&minCount=1',
    )
    expect(groupsAfterResponse.status).toBe(200)
    const groupsAfter = (await groupsAfterResponse.json()) as { total: number }
    expect(groupsAfter.total).toBe(0)
  })

  it('sorts transaction review groups by impact by default for agent triage', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'tx-small-saas-one',
            source: 'manual',
            name: 'Small SaaS Monthly',
            merchantName: 'Small SaaS',
            amount: 10,
            direction: 'expense',
            category: ['Service'],
            date: '2026-04-01',
            isoCurrencyCode: 'USD',
            recurring: true,
          },
          {
            id: 'tx-small-saas-two',
            source: 'manual',
            name: 'Small SaaS Monthly',
            merchantName: 'Small SaaS',
            amount: 10,
            direction: 'expense',
            category: ['Service'],
            date: '2026-05-01',
            isoCurrencyCode: 'USD',
            recurring: true,
          },
          {
            id: 'tx-small-saas-three',
            source: 'manual',
            name: 'Small SaaS Monthly',
            merchantName: 'Small SaaS',
            amount: 10,
            direction: 'expense',
            category: ['Service'],
            date: '2026-06-01',
            isoCurrencyCode: 'USD',
            recurring: true,
          },
          {
            id: 'tx-big-repair-one',
            source: 'manual',
            name: 'Big Repair',
            merchantName: 'Big Repair',
            amount: 1200,
            direction: 'expense',
            category: ['Maintenance'],
            date: '2026-06-03',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    process.env.MOLDABLE_AI_SERVER_URL = 'http://ai-server.test'
    process.env.MOLDABLE_APP_ID = 'money'
    process.env.MOLDABLE_APP_TOKEN = 'test-token'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            json: {
              proposals: [
                {
                  transactionId: 'tx-small-saas-one',
                  namespace: 'budget',
                  values: { need: 'useful', goal: 'software' },
                  confidence: 0.9,
                  reason: 'Low-dollar software.',
                },
                {
                  transactionId: 'tx-small-saas-two',
                  namespace: 'budget',
                  values: { need: 'useful', goal: 'software' },
                  confidence: 0.9,
                  reason: 'Low-dollar software.',
                },
                {
                  transactionId: 'tx-small-saas-three',
                  namespace: 'budget',
                  values: { need: 'useful', goal: 'software' },
                  confidence: 0.9,
                  reason: 'Low-dollar software.',
                },
                {
                  transactionId: 'tx-big-repair-one',
                  namespace: 'budget',
                  values: { need: 'required', goal: 'property maintenance' },
                  confidence: 0.92,
                  reason: 'High-impact maintenance.',
                },
              ],
            },
            model: 'openai/gpt-5.5',
            usage: { inputTokens: 20, outputTokens: 20 },
          }),
          { headers: { 'content-type': 'application/json' } },
        )
      }),
    )

    const classifyResponse = await app.request('/api/classify/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selector: { direction: 'expense', limit: 10 },
        targetNamespaces: ['budget'],
        apply: false,
        maxTransactions: 10,
      }),
    })
    expect(classifyResponse.status).toBe(200)

    const impactResponse = await app.request(
      '/api/transactions/review/groups?reason=has_proposals&namespace=budget&minCount=1',
    )
    expect(impactResponse.status).toBe(200)
    const impact = (await impactResponse.json()) as {
      filters: { sort: string }
      groups: Array<{
        merchantId: string
        pendingProposalCount: number
        impact: { annualizedAmount: number }
      }>
    }
    expect(impact.filters.sort).toBe('impact')
    expect(impact.groups.map((group) => group.merchantId)).toEqual([
      'big-repair',
      'small-saas',
    ])
    expect(impact.groups[0]).toEqual(
      expect.objectContaining({
        merchantId: 'big-repair',
        pendingProposalCount: 1,
        impact: expect.objectContaining({ annualizedAmount: 14400 }),
      }),
    )

    const priorityResponse = await app.request(
      '/api/transactions/review/groups?reason=has_proposals&namespace=budget&minCount=1&sort=priority',
    )
    expect(priorityResponse.status).toBe(200)
    const priority = (await priorityResponse.json()) as {
      filters: { sort: string }
      groups: Array<{ merchantId: string; pendingProposalCount: number }>
    }
    expect(priority.filters.sort).toBe('priority')
    expect(priority.groups.map((group) => group.merchantId)).toEqual([
      'small-saas',
      'big-repair',
    ])
  })

  it('offers a durable not-spending action for budget review groups', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'flowpay-one',
            source: 'plaid',
            name: 'FlowPay Transfer',
            merchantName: 'FlowPay',
            amount: 4000,
            direction: 'expense',
            category: ['Other'],
            date: '2026-05-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const groupsResponse = await app.request(
      '/api/transactions/review/groups?reason=missing_namespace&namespace=budget&minCount=1',
    )
    expect(groupsResponse.status).toBe(200)
    const groups = (await groupsResponse.json()) as {
      total: number
      groups: Array<{
        merchantId: string
        notSpendingAction?: {
          action: string
          recommendedRpc: string
          applyRequest: {
            selector: { merchantIds?: string[]; missingNamespace?: string }
            namespace: string
            values: { role?: string }
            teachRule?: boolean
          }
        }
      }>
    }
    expect(groups.total).toBe(1)
    expect(groups.groups[0]).toEqual(
      expect.objectContaining({
        merchantId: 'flowpay',
        notSpendingAction: expect.objectContaining({
          action: 'mark-not-spending',
          recommendedRpc: 'money.transactions.labelApply',
          applyRequest: expect.objectContaining({
            namespace: 'moneyFlow',
            values: expect.objectContaining({ role: 'ignored' }),
            teachRule: true,
          }),
        }),
      }),
    )

    const action = groups.groups[0]?.notSpendingAction
    expect(action).toBeDefined()
    const applyResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: action!.recommendedRpc,
        params: action!.applyRequest,
      }),
    })
    expect(applyResponse.status).toBe(200)

    const afterApplyGroupsResponse = await app.request(
      '/api/transactions/review/groups?reason=missing_namespace&namespace=budget&minCount=1',
    )
    expect(afterApplyGroupsResponse.status).toBe(200)
    const afterApplyGroups = (await afterApplyGroupsResponse.json()) as {
      total: number
    }
    expect(afterApplyGroups.total).toBe(0)

    const futureImportResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'flowpay-two',
            source: 'plaid',
            name: 'FlowPay Transfer',
            merchantName: 'FlowPay',
            amount: 3000,
            direction: 'expense',
            category: ['Other'],
            date: '2026-06-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(futureImportResponse.status).toBe(200)

    const extensionsResponse = await app.request(
      '/api/extensions/values?entity=transaction&namespace=moneyFlow',
    )
    expect(extensionsResponse.status).toBe(200)
    const extensions = (await extensionsResponse.json()) as {
      total: number
      extensions: Array<{
        entityId: string
        source: string
        values: { role?: string }
      }>
    }
    expect(extensions.total).toBe(2)
    expect(extensions.extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'flowpay-two',
          source: 'rule',
          values: expect.objectContaining({ role: 'ignored' }),
        }),
      ]),
    )
  })

  it('compares grouped tables across periods for category drift cards', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'may-groceries',
            source: 'plaid',
            name: 'May Groceries',
            amount: 300,
            direction: 'expense',
            category: ['Groceries'],
            date: '2026-05-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'may-dining',
            source: 'plaid',
            name: 'May Dining',
            amount: 100,
            direction: 'expense',
            category: ['Dining'],
            date: '2026-05-12',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'june-groceries',
            source: 'plaid',
            name: 'June Groceries',
            amount: 450,
            direction: 'expense',
            category: ['Groceries'],
            date: '2026-06-02',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'june-travel',
            source: 'plaid',
            name: 'June Travel',
            amount: 250,
            direction: 'expense',
            category: ['Travel'],
            date: '2026-06-03',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const formulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula:
          'TableChange(Expenses.Between(2026-06-01, 2026-06-30).GroupBy(category).PercentOfTotal(), Expenses.Between(2026-05-01, 2026-05-31).GroupBy(category).PercentOfTotal())',
        outputType: 'table',
      }),
    })
    expect(formulaResponse.status).toBe(200)
    const formula = (await formulaResponse.json()) as {
      ok: boolean
      result: {
        outputType: string
        value: {
          type: string
          rows: Array<{
            key: string
            currentValue: number
            previousValue: number
            delta: number
            percentPointDelta: number
          }>
        }
      }
    }
    expect(formula.ok).toBe(true)
    expect(formula.result.outputType).toBe('table')
    expect(formula.result.value.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'groceries',
          currentValue: 450,
          previousValue: 300,
          delta: 150,
        }),
        expect.objectContaining({
          key: 'travel',
          currentValue: 250,
          previousValue: 0,
          delta: 250,
        }),
        expect.objectContaining({
          key: 'dining',
          currentValue: 0,
          previousValue: 100,
          delta: -100,
        }),
      ]),
    )

    const templatesResponse = await app.request(
      '/api/cards/templates?ids=category-drift&includeEvaluation=true',
    )
    expect(templatesResponse.status).toBe(200)
    const templates = (await templatesResponse.json()) as {
      templates: Array<{
        id: string
        category: string
        definition: { formula: string; outputType?: string }
        referencedCollections: string[]
        test?: { ok: boolean; result?: { outputType: string } }
      }>
    }
    expect(templates.templates).toEqual([
      expect.objectContaining({
        id: 'category-drift',
        category: 'cash-flow',
        definition: expect.objectContaining({
          formula:
            'TableChange(Expenses.ThisMonth().GroupBy(category).PercentOfTotal(), Expenses.LastMonth().GroupBy(category).PercentOfTotal())',
          outputType: 'table',
        }),
        referencedCollections: ['Expenses'],
        test: expect.objectContaining({
          ok: true,
          result: expect.objectContaining({ outputType: 'table' }),
        }),
      }),
    ])
  })

  it('evaluates shared-expense reimbursement rollups and due aging', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'shared-rent',
            source: 'plaid',
            name: 'Property Rent Payment',
            amount: 2000,
            direction: 'expense',
            category: ['Rent'],
            date: '2026-06-10',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'shared-utilities',
            source: 'plaid',
            name: 'Utility Bill',
            amount: 180,
            direction: 'expense',
            category: ['Utilities'],
            date: '2026-06-09',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'settled-supplies',
            source: 'plaid',
            name: 'House Supplies',
            amount: 75,
            direction: 'expense',
            category: ['Home'],
            date: '2026-06-08',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const extensionResponse = await app.request('/api/extensions/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: [
          {
            entity: 'transaction',
            entityId: 'shared-rent',
            namespace: 'sharedExpense',
            source: 'user',
            values: {
              personId: 'alex',
              status: 'owed',
              amount: 900,
              dueDate: '2026-06-01',
            },
          },
          {
            entity: 'transaction',
            entityId: 'shared-utilities',
            namespace: 'sharedExpense',
            source: 'user',
            values: {
              personId: 'jamie',
              status: 'owed',
              amount: 90,
              dueDate: '2026-06-15',
            },
          },
          {
            entity: 'transaction',
            entityId: 'settled-supplies',
            namespace: 'sharedExpense',
            source: 'user',
            values: {
              personId: 'alex',
              status: 'paid',
              amount: 35,
              settledAt: '2026-06-09',
            },
          },
        ],
      }),
    })
    expect(extensionResponse.status).toBe(200)

    const owedResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'SharedExpenses.Where(status = "owed").Sum()',
        format: 'currency',
      }),
    })
    expect(owedResponse.status).toBe(200)
    const owed = (await owedResponse.json()) as {
      result: { value: number; displayValue: string }
    }
    expect(owed.result).toEqual(
      expect.objectContaining({ value: 990, displayValue: '$990' }),
    )

    const byPersonResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula:
          'SharedExpenses.Where(status = "owed").GroupBy(personId).PercentOfTotal()',
        outputType: 'table',
      }),
    })
    expect(byPersonResponse.status).toBe(200)
    const byPerson = (await byPersonResponse.json()) as {
      result: {
        value: {
          rows: Array<{
            key: string
            value: number
            count: number
            percentOfTotal: number
          }>
        }
      }
    }
    expect(byPerson.result.value.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'alex', value: 900, count: 1 }),
        expect.objectContaining({ key: 'jamie', value: 90, count: 1 }),
      ]),
    )

    const agingResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'Aging(SharedExpenses.Where(status = "owed"), dueDate)',
        outputType: 'table',
      }),
    })
    expect(agingResponse.status).toBe(200)
    const aging = (await agingResponse.json()) as {
      result: {
        value: {
          rows: Array<{
            key: string
            value: number
            count: number
            minDaysUntilDue: number | null
            maxDaysUntilDue: number | null
          }>
        }
      }
    }
    expect(aging.result.value.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'overdue',
          value: 900,
          count: 1,
          minDaysUntilDue: -9,
          maxDaysUntilDue: -9,
        }),
        expect.objectContaining({
          key: 'due_7d',
          value: 90,
          count: 1,
          minDaysUntilDue: 5,
          maxDaysUntilDue: 5,
        }),
      ]),
    )

    const templatesResponse = await app.request(
      '/api/cards/templates?ids=reimbursements-due,reimbursements-by-person,reimbursement-aging&includeEvaluation=true',
    )
    expect(templatesResponse.status).toBe(200)
    const templates = (await templatesResponse.json()) as {
      templates: Array<{
        id: string
        referencedCollections: string[]
        test?: { ok: boolean }
      }>
    }
    expect(templates.templates.map((template) => template.id).sort()).toEqual([
      'reimbursement-aging',
      'reimbursements-by-person',
      'reimbursements-due',
    ])
    expect(templates.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'reimbursements-due',
          referencedCollections: ['SharedExpenses'],
          test: expect.objectContaining({ ok: true }),
        }),
      ]),
    )
  })

  it('discovers extension registry and stores transaction extensions in namespace shards', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'tx-openai',
            source: 'manual',
            name: 'OpenAI',
            amount: 50,
            direction: 'expense',
            category: ['Software'],
            providerCategoryPrimary: 'GENERAL_MERCHANDISE',
            providerCategoryDetailed: 'GENERAL_MERCHANDISE_ELECTRONICS',
            providerPaymentChannel: 'online',
            date: '2026-06-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'tx-dinner',
            source: 'manual',
            name: 'Dinner',
            amount: 80,
            direction: 'expense',
            category: ['Food'],
            date: '2026-06-02',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const registryResponse = await app.request('/api/extensions/registry')
    expect(registryResponse.status).toBe(200)
    const registryBody = (await registryResponse.json()) as {
      registry: {
        extensions: Array<{
          namespace: string
          fields: Array<{ name: string; formulaAliases?: string[] }>
        }>
      }
    }
    expect(registryBody.registry.extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          namespace: 'subscription',
          fields: expect.arrayContaining([
            expect.objectContaining({
              name: 'key',
              formulaAliases: expect.arrayContaining(['subscriptionKey']),
            }),
          ]),
        }),
      ]),
    )

    const extensionResponse = await app.request('/api/extensions/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: [
          {
            entity: 'transaction',
            entityId: 'tx-openai',
            namespace: 'subscription',
            source: 'user',
            confidence: 1,
            values: {
              active: true,
              key: 'openai',
              cadence: 'monthly',
              need: 'useful',
            },
          },
          {
            entity: 'transaction',
            entityId: 'tx-dinner',
            namespace: 'sharedExpense',
            source: 'user',
            values: {
              status: 'owed',
              amount: 40,
            },
          },
        ],
      }),
    })
    expect(extensionResponse.status).toBe(200)

    await expect(
      fs.access(
        path.join(dataDir, 'extensions', 'transactions', 'subscription.json'),
      ),
    ).resolves.toBeUndefined()
    await expect(
      fs.access(
        path.join(dataDir, 'extensions', 'transactions', 'sharedExpense.json'),
      ),
    ).resolves.toBeUndefined()
    await expect(
      fs.access(path.join(dataDir, 'extensions', 'transactions.json')),
    ).rejects.toThrow()

    const pagedExtensionsResponse = await app.request(
      '/api/extensions/values?entity=transaction&limit=1&offset=1',
    )
    expect(pagedExtensionsResponse.status).toBe(200)
    const pagedExtensions = (await pagedExtensionsResponse.json()) as {
      extensions: Array<{ namespace: string }>
      total: number
      limit: number
      offset: number
      hasMore: boolean
      nextCursor?: string
      counts: Record<string, Record<string, number>>
    }
    expect(pagedExtensions).toEqual(
      expect.objectContaining({
        total: 2,
        limit: 1,
        offset: 1,
        hasMore: false,
        counts: {
          transaction: {
            sharedExpense: 1,
            subscription: 1,
          },
        },
      }),
    )
    expect(pagedExtensions.extensions).toHaveLength(1)

    const firstExtensionsPageResponse = await app.request(
      '/api/extensions/values?entity=transaction&limit=1',
    )
    expect(firstExtensionsPageResponse.status).toBe(200)
    const firstExtensionsPage = (await firstExtensionsPageResponse.json()) as {
      extensions: Array<{ namespace: string }>
      nextCursor?: string
      hasMore: boolean
    }
    expect(firstExtensionsPage.hasMore).toBe(true)
    expect(firstExtensionsPage.nextCursor).toBe('offset:1')

    const cursorExtensionsPageResponse = await app.request(
      `/api/extensions/values?entity=transaction&limit=1&cursor=${encodeURIComponent(firstExtensionsPage.nextCursor ?? '')}`,
    )
    expect(cursorExtensionsPageResponse.status).toBe(200)
    const cursorExtensionsPage =
      (await cursorExtensionsPageResponse.json()) as {
        extensions: Array<{ namespace: string }>
        offset: number
        hasMore: boolean
      }
    expect(cursorExtensionsPage).toEqual(
      expect.objectContaining({
        offset: 1,
        hasMore: false,
      }),
    )
    expect(cursorExtensionsPage.extensions).toEqual(pagedExtensions.extensions)

    const transactionsResponse = await app.request('/api/transactions?q=openai')
    const transactions = (await transactionsResponse.json()) as {
      transactions: Array<{
        id: string
        recurring: boolean
        extensions?: Record<
          string,
          Record<string, string | number | boolean | null>
        >
      }>
    }
    expect(transactions.transactions[0]).toEqual(
      expect.objectContaining({
        id: 'tx-openai',
        recurring: true,
        extensions: expect.objectContaining({
          subscription: expect.objectContaining({ key: 'openai' }),
        }),
      }),
    )

    const previewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula:
          'Expenses.Where(subscription = true).Unique(subscriptionKey).Count()',
      }),
    })
    expect(previewResponse.status).toBe(200)
    const preview = (await previewResponse.json()) as {
      result: { value: number }
    }
    expect(preview.result.value).toBe(1)

    const sharedPreviewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'SharedExpenses.Where(status = "owed").Sum()',
      }),
    })
    expect(sharedPreviewResponse.status).toBe(200)
    const sharedPreview = (await sharedPreviewResponse.json()) as {
      result: { value: number; referencedCollections: string[] }
    }
    expect(sharedPreview.result).toEqual(
      expect.objectContaining({
        value: 40,
        referencedCollections: ['SharedExpenses'],
      }),
    )
  })

  it('previews and applies transaction labels by merchant selector', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'tx-openai-chatgpt',
            source: 'manual',
            name: 'ChatGPT Plus',
            merchantName: 'OpenAI',
            amount: 20,
            direction: 'expense',
            category: ['Software'],
            date: '2026-06-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'tx-openai-api',
            source: 'manual',
            name: 'OpenAI API',
            merchantName: 'Open AI',
            amount: 40,
            direction: 'expense',
            category: ['Software'],
            providerCategoryPrimary: 'GENERAL_SERVICES',
            providerCategoryDetailed: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES',
            providerPaymentChannel: 'online',
            date: '2026-06-03',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'tx-coffee',
            source: 'manual',
            name: 'Coffee',
            merchantName: 'Coffee Shop',
            amount: 6,
            direction: 'expense',
            category: ['Dining'],
            date: '2026-06-04',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const merchantReviewResponse = await app.request(
      '/api/merchants/review?status=needs-group&minExpenses=10',
    )
    expect(merchantReviewResponse.status).toBe(200)
    const merchantReview = (await merchantReviewResponse.json()) as {
      items: Array<{
        merchant: { id: string; name: string; transactionCount: number }
        status: string
        ungroupedTransactionCount: number
        rawMerchantIds: string[]
        transactionSamples: Array<{
          id: string
          date: string
          name: string
          merchantName?: string
          amount: number
          direction: string
          category: string[]
          providerCategoryPrimary?: string
          providerCategoryDetailed?: string
          providerPaymentChannel?: string
          pending: boolean
          recurring: boolean
          extensions: Record<
            string,
            Record<string, string | number | boolean | null>
          >
        }>
        selector: { merchantIds: string[]; limit: number }
        suggestedValues: { merchantId: string; name: string; status: string }
        previewRequest: {
          dryRun: boolean
          namespace: string
          selector: { merchantIds: string[]; limit: number }
          values: { merchantId: string }
        }
        recommendedRpc: string
      }>
      summary: Record<string, number>
      filters: Record<string, number | string | boolean | undefined>
    }
    expect(merchantReview.items).toEqual([
      expect.objectContaining({
        merchant: expect.objectContaining({
          id: 'openai',
          transactionCount: 2,
        }),
        status: 'needs-group',
        ungroupedTransactionCount: 2,
        rawMerchantIds: ['open-ai', 'openai'],
        selector: { merchantIds: ['open-ai', 'openai'], limit: 2000 },
        suggestedValues: expect.objectContaining({
          merchantId: 'openai',
          status: 'active',
        }),
        previewRequest: expect.objectContaining({
          dryRun: true,
          namespace: 'merchantGroup',
          selector: { merchantIds: ['open-ai', 'openai'], limit: 2000 },
          values: expect.objectContaining({ merchantId: 'openai' }),
        }),
        recommendedRpc: 'money.transactions.labelPreview',
      }),
    ])
    expect(merchantReview.items[0]?.transactionSamples).toEqual([
      expect.objectContaining({
        id: 'tx-openai-api',
        name: 'OpenAI API',
        merchantName: 'Open AI',
        amount: 40,
        direction: 'expense',
        category: ['Software'],
        date: '2026-06-03',
        pending: false,
        recurring: false,
        extensions: {},
      }),
      expect.objectContaining({
        id: 'tx-openai-chatgpt',
        name: 'ChatGPT Plus',
        merchantName: 'OpenAI',
        amount: 20,
        direction: 'expense',
        category: ['Software'],
        date: '2026-06-01',
        pending: false,
        recurring: false,
        extensions: {},
      }),
    ])
    expect(merchantReview.summary['needs-group']).toBe(1)
    expect(merchantReview.summary.ungroupedTransactions).toBe(2)
    expect(merchantReview.filters).toEqual(
      expect.objectContaining({ transactionSampleLimit: 5 }),
    )

    const merchantReviewRpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.merchants.review',
        params: {
          status: 'needs-group',
          minExpenses: 10,
          transactionSampleLimit: 1,
        },
      }),
    })
    expect(merchantReviewRpcResponse.status).toBe(200)
    const merchantReviewRpc = (await merchantReviewRpcResponse.json()) as {
      ok: boolean
      result: {
        items: Array<{
          merchant: { id: string }
          transactionSamples: Array<{ id: string }>
        }>
      }
    }
    expect(merchantReviewRpc.ok).toBe(true)
    expect(merchantReviewRpc.result.items).toEqual([
      expect.objectContaining({
        merchant: expect.objectContaining({ id: 'openai' }),
        transactionSamples: [expect.objectContaining({ id: 'tx-openai-api' })],
      }),
    ])

    const previewResponse = await app.request('/api/labels/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        dryRun: true,
        selector: { merchantIds: ['open-ai', 'openai'], direction: 'expense' },
        namespace: 'joyReview',
        source: 'agent',
        confidence: 0.92,
        values: {
          rating: 'negative',
          decision: 'cancel',
          reviewedAt: '2026-06-04',
        },
      }),
    })
    expect(previewResponse.status).toBe(200)
    const preview = (await previewResponse.json()) as {
      ok: boolean
      dryRun: boolean
      matched: {
        total: number
        selected: number
        transactions: Array<{ merchantId: string }>
      }
      extensions: Array<{ entityId: string; namespace: string }>
    }
    expect(preview.ok).toBe(true)
    expect(preview.dryRun).toBe(true)
    expect(preview.matched).toEqual(
      expect.objectContaining({
        total: 2,
        selected: 2,
      }),
    )
    expect(preview.matched.transactions).toEqual([
      expect.objectContaining({ merchantId: 'open-ai' }),
      expect.objectContaining({ merchantId: 'openai' }),
    ])
    expect(preview.extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'tx-openai-chatgpt',
          namespace: 'joyReview',
        }),
        expect.objectContaining({
          entityId: 'tx-openai-api',
          namespace: 'joyReview',
        }),
      ]),
    )

    const beforeApplyResponse = await app.request(
      '/api/extensions/values?entity=transaction&namespace=joyReview',
    )
    const beforeApply = (await beforeApplyResponse.json()) as { total: number }
    expect(beforeApply.total).toBe(0)

    const invalidResponse = await app.request('/api/labels/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selector: { merchantIds: ['openai'] },
        namespace: 'subscription',
        source: 'agent',
        values: { cadence: 'monthly' },
      }),
    })
    expect(invalidResponse.status).toBe(400)
    const invalid = (await invalidResponse.json()) as {
      ok: boolean
      error: { code: string; issues: string[] }
    }
    expect(invalid.ok).toBe(false)
    expect(invalid.error).toEqual(
      expect.objectContaining({
        code: 'invalid_extension_values',
        issues: expect.arrayContaining([
          expect.stringContaining('subscription.active is required'),
          expect.stringContaining('subscription.key is required'),
        ]),
      }),
    )

    const applyResponse = await app.request('/api/labels/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selector: {
          merchantNames: ['OpenAI', 'Open AI'],
          direction: 'expense',
        },
        namespace: 'joyReview',
        source: 'agent',
        confidence: 0.92,
        values: {
          rating: 'negative',
          decision: 'cancel',
          reviewedAt: '2026-06-04',
        },
      }),
    })
    expect(applyResponse.status).toBe(200)
    const apply = (await applyResponse.json()) as {
      ok: boolean
      dryRun: boolean
      matched: { total: number; selected: number }
      counts: Record<string, Record<string, number>>
    }
    expect(apply.ok).toBe(true)
    expect(apply.dryRun).toBe(false)
    expect(apply.matched).toEqual(
      expect.objectContaining({ total: 2, selected: 2 }),
    )
    expect(apply.counts.transaction.joyReview).toBe(2)

    const afterApplyResponse = await app.request(
      '/api/extensions/values?entity=transaction&namespace=joyReview',
    )
    const afterApply = (await afterApplyResponse.json()) as {
      total: number
      extensions: Array<{ entityId: string; values: { rating: string } }>
    }
    expect(afterApply.total).toBe(2)
    expect(afterApply.extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'tx-openai-chatgpt',
          values: expect.objectContaining({ rating: 'negative' }),
        }),
        expect.objectContaining({
          entityId: 'tx-openai-api',
          values: expect.objectContaining({ rating: 'negative' }),
        }),
      ]),
    )

    const formulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'JoyReview.Where(rating = "negative").Sum()',
      }),
    })
    expect(formulaResponse.status).toBe(200)
    const formula = (await formulaResponse.json()) as {
      result: { value: number }
    }
    expect(formula.result.value).toBe(60)
  })

  it('classifies transaction extensions through structured AI proposals', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'tx-stream-one',
            source: 'manual',
            name: 'StreamCo Basic',
            merchantName: 'StreamCo',
            amount: 12,
            direction: 'expense',
            category: ['Entertainment'],
            date: '2026-06-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'tx-stream-two',
            source: 'manual',
            name: 'StreamCo Basic',
            merchantName: 'StreamCo',
            amount: 12,
            direction: 'expense',
            category: ['Entertainment'],
            date: '2026-05-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'tx-supplies-one',
            source: 'manual',
            name: 'Office Supplies',
            merchantName: 'Office Mart',
            amount: 42,
            direction: 'expense',
            category: ['Office'],
            date: '2026-06-02',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    process.env.MOLDABLE_AI_SERVER_URL = 'http://ai-server.test'
    process.env.MOLDABLE_APP_ID = 'money'
    process.env.MOLDABLE_APP_TOKEN = 'test-token'

    const fetchMock = vi.fn(
      async (_input: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          purpose: string
          schemaName: string
          schema: {
            additionalProperties?: boolean
            properties?: {
              proposals?: {
                items?: {
                  additionalProperties?: boolean
                  required?: string[]
                  properties?: {
                    namespace?: { enum?: string[] }
                    values?: {
                      additionalProperties?: boolean
                      required?: string[]
                      properties?: Record<string, unknown>
                    }
                    reason?: { type?: string }
                  }
                }
              }
            }
          }
          messages: Array<{ role: string; content: string }>
        }
        const userContent = JSON.parse(body.messages[1]?.content ?? '{}') as {
          targetExtensions: Array<{ namespace: string }>
          transactions: Array<{ id: string }>
        }
        expect(body.purpose).toBe('money.transaction_classification')
        expect(body.schemaName).toBe('money_transaction_label_proposals')
        expect(body.schema).toEqual(
          expect.objectContaining({
            additionalProperties: false,
            properties: expect.objectContaining({
              proposals: expect.objectContaining({
                items: expect.objectContaining({
                  additionalProperties: false,
                  required: [
                    'transactionId',
                    'namespace',
                    'values',
                    'confidence',
                    'reason',
                  ],
                  properties: expect.objectContaining({
                    namespace: { type: 'string', enum: ['joyReview'] },
                    values: expect.objectContaining({
                      additionalProperties: false,
                      required: ['rating', 'reviewedAt', 'decision'],
                      properties: expect.objectContaining({
                        rating: expect.objectContaining({
                          type: ['string', 'null'],
                          enum: ['positive', 'neutral', 'negative', null],
                        }),
                        reviewedAt: { type: ['string', 'null'] },
                        decision: expect.objectContaining({
                          type: ['string', 'null'],
                          enum: ['keep', 'reduce', 'cancel', null],
                        }),
                      }),
                    }),
                    reason: { type: 'string' },
                  }),
                }),
              }),
            }),
          }),
        )
        expect(userContent.targetExtensions).toEqual([
          expect.objectContaining({ namespace: 'joyReview' }),
        ])
        expect(
          userContent.transactions.map((transaction) => transaction.id),
        ).toEqual(['tx-stream-one', 'tx-stream-two'])

        return new Response(
          JSON.stringify({
            json: {
              proposals: [
                {
                  transactionId: 'tx-stream-one',
                  namespace: 'joyReview',
                  values: {
                    rating: 'negative',
                    decision: 'cancel',
                    reviewedAt: '2026-06-04',
                  },
                  confidence: 0.94,
                  reason: 'Synthetic low-value entertainment spend.',
                },
                {
                  transactionId: 'tx-stream-two',
                  namespace: 'joyReview',
                  values: {
                    rating: 'negative',
                    decision: 'reduce',
                    reviewedAt: '2026-06-04',
                  },
                  confidence: 0.72,
                  reason: 'Synthetic lower-confidence spend review.',
                },
              ],
            },
            model: 'openai/gpt-5.5',
            usage: { inputTokens: 100, outputTokens: 50 },
          }),
          { headers: { 'content-type': 'application/json' } },
        )
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const previewResponse = await app.request('/api/classify/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selector: {
          merchantIds: ['streamco'],
          direction: 'expense',
          limit: 10,
        },
        targetNamespaces: ['joyReview'],
        instructions: 'Mark only clear synthetic joy-review candidates.',
        apply: false,
        maxTransactions: 5,
      }),
    })
    expect(previewResponse.status).toBe(200)
    const preview = (await previewResponse.json()) as {
      ok: boolean
      dryRun: boolean
      matched: { total: number; selected: number }
      summary: {
        dryRun: boolean
        targetNamespaces: string[]
        matchedTotal: number
        selectedTotal: number
        proposalTotal: number
        savedProposalTotal: number
        appliedTotal: number
        skippedTotal: number
        saveProposals: boolean
        apply: boolean
        minConfidenceToApply: number
      }
      proposals: Array<{ transactionId: string; namespace: string }>
      applied: unknown[]
      reviewAfter: {
        namespaces: Array<{
          namespace: string
          labeledTotal: number
          missingNamespaceTotal: number
          pendingProposalTotal: number
          affectedStillMissing: number
          affectedPendingProposalTotal: number
        }>
      }
    }
    expect(preview.ok).toBe(true)
    expect(preview.dryRun).toBe(true)
    expect(preview.matched).toEqual(
      expect.objectContaining({ total: 2, selected: 2 }),
    )
    expect(preview.summary).toEqual(
      expect.objectContaining({
        dryRun: true,
        targetNamespaces: ['joyReview'],
        matchedTotal: 2,
        selectedTotal: 2,
        proposalTotal: 2,
        savedProposalTotal: 2,
        appliedTotal: 0,
        skippedTotal: 0,
        saveProposals: true,
        apply: false,
      }),
    )
    expect(preview.proposals).toHaveLength(2)
    expect(preview.applied).toHaveLength(0)
    expect(preview.reviewAfter.namespaces).toEqual([
      expect.objectContaining({
        namespace: 'joyReview',
        labeledTotal: 0,
        missingNamespaceTotal: 3,
        pendingProposalTotal: 2,
        affectedStillMissing: 2,
        affectedPendingProposalTotal: 2,
      }),
    ])

    const proposalPreviewListResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.extensions.proposals.list',
        params: {
          entity: 'transaction',
          namespace: 'joyReview',
          status: 'pending',
        },
      }),
    })
    expect(proposalPreviewListResponse.status).toBe(200)
    const proposalPreviewList = (await proposalPreviewListResponse.json()) as {
      ok: boolean
      result: {
        proposals: Array<{
          id: string
          entityId: string
          namespace: string
          status: string
          values: Record<string, string>
        }>
        total: number
        counts: Record<string, Record<string, number>>
      }
    }
    expect(proposalPreviewList.ok).toBe(true)
    expect(proposalPreviewList.result.total).toBe(2)
    expect(proposalPreviewList.result.proposals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'transaction-tx-stream-one-joyreview',
          entityId: 'tx-stream-one',
          status: 'pending',
          values: expect.objectContaining({ decision: 'cancel' }),
        }),
        expect.objectContaining({
          id: 'transaction-tx-stream-two-joyreview',
          entityId: 'tx-stream-two',
          status: 'pending',
          values: expect.objectContaining({ decision: 'reduce' }),
        }),
      ]),
    )
    expect(
      proposalPreviewList.result.counts.pending['transaction:joyReview'],
    ).toBe(2)

    const proposalHealthResponse = await app.request('/api/data-health')
    expect(proposalHealthResponse.status).toBe(200)
    const proposalHealth = (await proposalHealthResponse.json()) as {
      nextActions: Array<{
        action: string
        rpc: string
        count?: number
        namespaces?: string[]
        params?: Record<string, unknown>
        allParams?: Record<string, unknown>
        namespaceParams?: Array<{
          namespace: string
          count: number
          params: Record<string, unknown>
        }>
      }>
      review: {
        namespaces: Record<
          string,
          {
            has_proposals: number
            has_recommendations: number
            missing_namespace: number
          }
        >
      }
      warnings: string[]
    }
    expect(proposalHealth.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'review-label-proposal-groups',
          rpc: 'money.transactions.reviewGroups',
          count: 2,
          namespaces: ['joyReview'],
          params: expect.objectContaining({
            reason: 'has_proposals',
            namespace: 'joyReview',
            minCount: 1,
            limit: 50,
          }),
          allParams: expect.objectContaining({
            reason: 'has_proposals',
            minCount: 1,
            limit: 50,
          }),
          namespaceParams: [
            {
              namespace: 'joyReview',
              count: 2,
              params: expect.objectContaining({
                reason: 'has_proposals',
                namespace: 'joyReview',
              }),
            },
          ],
        }),
      ]),
    )
    expect(proposalHealth.review.namespaces.joyReview.has_proposals).toBe(2)
    expect(proposalHealth.review.namespaces.budget.has_proposals).toBe(0)
    expect(proposalHealth.review.namespaces.joyReview.has_recommendations).toBe(
      0,
    )
    expect(proposalHealth.review.namespaces.joyReview.missing_namespace).toBe(0)
    expect(proposalHealth.warnings).toContain('pending_extension_proposals')

    await fs.mkdir(
      path.join(dataDir, 'extensions', 'proposals', 'transactions'),
      {
        recursive: true,
      },
    )
    await fs.writeFile(
      path.join(
        dataDir,
        'extensions',
        'proposals',
        'transactions',
        'budget.json',
      ),
      JSON.stringify(
        [
          {
            id: 'transaction-tx-supplies-one-budget',
            entity: 'transaction',
            entityId: 'tx-supplies-one',
            namespace: 'budget',
            values: { need: 'useful' },
            source: 'agent',
            confidence: 0.8,
            reason: 'Synthetic office supply spend.',
            status: 'pending',
            model: 'openai/gpt-5.5',
            batchId: 'synthetic-budget-batch',
            createdAt: '2026-06-04T00:00:00.000Z',
            updatedAt: '2026-06-04T00:00:00.000Z',
          },
        ],
        null,
        2,
      ),
    )

    const pendingLabelPlanResponse = await app.request(
      '/api/transactions/label-plan?namespaces=budget,joyReview&limitPerJob=10',
    )
    expect(pendingLabelPlanResponse.status).toBe(200)
    const pendingLabelPlan = (await pendingLabelPlanResponse.json()) as {
      jobs: Array<{
        namespace: string
        status: string
        pendingProposalTotal: number
        recommendedRpc?: string
        secondaryRpc?: string
        reviewGroupsRequest?: Record<string, unknown>
        applySuggestionsRequest?: Record<string, unknown>
      }>
    }
    expect(pendingLabelPlan.jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          namespace: 'budget',
          status: 'review-proposals',
          pendingProposalTotal: 1,
          recommendedRpc: 'money.transactions.reviewGroups',
          secondaryRpc: 'money.transactions.reviewGroups.applySuggestions',
          reviewGroupsRequest: expect.objectContaining({
            reason: 'has_proposals',
            namespace: 'budget',
            includeTransactions: false,
            includeTransactionIds: false,
            transactionSampleLimit: 0,
          }),
          applySuggestionsRequest: expect.objectContaining({
            reason: 'has_proposals',
            namespace: 'budget',
            dryRun: true,
            maxGroups: 10,
            includeResultDetails: false,
          }),
        }),
        expect.objectContaining({
          namespace: 'joyReview',
          status: 'review-proposals',
          pendingProposalTotal: 2,
          recommendedRpc: 'money.transactions.reviewGroups',
        }),
      ]),
    )

    const allProposalGroupsResponse = await app.request(
      '/api/transactions/review/groups?reason=has_proposals&minCount=1&includeTransactions=false&includeTransactionIds=false',
    )
    expect(allProposalGroupsResponse.status).toBe(200)
    const allProposalGroups = (await allProposalGroupsResponse.json()) as {
      total: number
      groups: Array<{
        id: string
        namespace?: string
        pendingProposalIds: string[]
        suggestedLabelAction?: {
          applyRequest: { namespace: string; values: Record<string, unknown> }
        }
      }>
    }
    expect(allProposalGroups.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'merchant:streamco:joyReview',
          namespace: 'joyReview',
          pendingProposalIds: [
            'transaction-tx-stream-one-joyreview',
            'transaction-tx-stream-two-joyreview',
          ],
          suggestedLabelAction: expect.objectContaining({
            applyRequest: expect.objectContaining({
              namespace: 'joyReview',
              values: expect.objectContaining({ decision: 'cancel' }),
            }),
          }),
        }),
        expect.objectContaining({
          id: 'merchant:office-mart:budget',
          namespace: 'budget',
          pendingProposalIds: ['transaction-tx-supplies-one-budget'],
          suggestedLabelAction: expect.objectContaining({
            applyRequest: expect.objectContaining({
              namespace: 'budget',
              values: expect.objectContaining({ need: 'useful' }),
            }),
          }),
        }),
      ]),
    )

    const applySuggestionsDryRunResponse = await app.request(
      '/api/moldable/rpc',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          method: 'money.transactions.reviewGroups.applySuggestions',
          params: {
            reason: 'has_proposals',
            dryRun: true,
            maxGroups: 10,
            minConfidence: 0,
            includeTransactions: false,
            includeTransactionIds: false,
          },
        }),
      },
    )
    expect(applySuggestionsDryRunResponse.status).toBe(200)
    const applySuggestionsDryRun =
      (await applySuggestionsDryRunResponse.json()) as {
        ok: boolean
        result: {
          dryRun: boolean
          matched: {
            totalGroups: number
            actionableGroups: number
            selectedGroups: number
            failedGroups: number
          }
          summary: {
            dryRun: boolean
            selectedGroups: number
            failedGroups: number
            matchedTransactions: number
            selectedTransactions: number
            wouldWriteTotal: number
            wroteTotal: number
            byNamespace: Record<
              string,
              { groups: number; wouldWriteTotal: number }
            >
          }
          groups: Array<{
            id: string
            namespace?: string
            request: {
              namespace: string
              dryRun: boolean
              values: Record<string, unknown>
            }
            values: Record<string, unknown>
            resultSummary: {
              ok: boolean
              dryRun: boolean
              matchedTotal: number
              selectedTotal: number
              wouldWriteTotal: number
              wroteTotal: number
            }
            result?: unknown
          }>
          failures: unknown[]
        }
      }
    expect(applySuggestionsDryRun.ok).toBe(true)
    expect(applySuggestionsDryRun.result).toEqual(
      expect.objectContaining({
        dryRun: true,
        matched: expect.objectContaining({
          totalGroups: 2,
          actionableGroups: 2,
          selectedGroups: 2,
          failedGroups: 0,
        }),
        summary: expect.objectContaining({
          dryRun: true,
          selectedGroups: 2,
          failedGroups: 0,
          matchedTransactions: 3,
          selectedTransactions: 3,
          wouldWriteTotal: 3,
          wroteTotal: 0,
          byNamespace: expect.objectContaining({
            budget: expect.objectContaining({ groups: 1, wouldWriteTotal: 1 }),
            joyReview: expect.objectContaining({
              groups: 1,
              wouldWriteTotal: 2,
            }),
          }),
        }),
        failures: [],
      }),
    )
    expect(applySuggestionsDryRun.result.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'merchant:streamco:joyReview',
          namespace: 'joyReview',
          request: expect.objectContaining({
            namespace: 'joyReview',
            dryRun: true,
            values: expect.objectContaining({ decision: 'cancel' }),
          }),
          values: expect.objectContaining({ decision: 'cancel' }),
          resultSummary: expect.objectContaining({
            ok: true,
            dryRun: true,
            wouldWriteTotal: 2,
            wroteTotal: 0,
          }),
        }),
        expect.objectContaining({
          id: 'merchant:office-mart:budget',
          namespace: 'budget',
          request: expect.objectContaining({
            namespace: 'budget',
            dryRun: true,
            values: expect.objectContaining({ need: 'useful' }),
          }),
          values: expect.objectContaining({ need: 'useful' }),
          resultSummary: expect.objectContaining({
            ok: true,
            dryRun: true,
            wouldWriteTotal: 1,
            wroteTotal: 0,
          }),
        }),
      ]),
    )
    expect(applySuggestionsDryRun.result.groups[0]).not.toHaveProperty('result')

    const applySuggestionsDetailedResponse = await app.request(
      '/api/moldable/rpc',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          method: 'money.transactions.reviewGroups.applySuggestions',
          params: {
            reason: 'has_proposals',
            dryRun: true,
            maxGroups: 1,
            includeResultDetails: true,
          },
        }),
      },
    )
    expect(applySuggestionsDetailedResponse.status).toBe(200)
    const applySuggestionsDetailed =
      (await applySuggestionsDetailedResponse.json()) as {
        ok: boolean
        result: {
          groups: Array<{
            result?: { ok: boolean; matched: { total: number } }
          }>
        }
      }
    expect(applySuggestionsDetailed.ok).toBe(true)
    expect(applySuggestionsDetailed.result.groups[0]?.result).toEqual(
      expect.objectContaining({
        ok: true,
        matched: expect.objectContaining({ total: expect.any(Number) }),
      }),
    )

    const batchAcceptDryRunResponse = await app.request(
      '/api/extensions/proposals/decide',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          namespace: 'joyReview',
          minConfidence: 0.9,
          dryRun: true,
          reason: 'Synthetic high-confidence batch preview.',
        }),
      },
    )
    expect(batchAcceptDryRunResponse.status).toBe(200)
    const batchAcceptDryRun = (await batchAcceptDryRunResponse.json()) as {
      ok: boolean
      dryRun: boolean
      action: string
      matched: { total: number; selected: number; hasMore: boolean }
      proposals: Array<{ id: string; status: string }>
      extensions: Array<{ entityId: string; namespace: string }>
      proposalCounts: Record<string, Record<string, number>>
    }
    expect(batchAcceptDryRun).toEqual(
      expect.objectContaining({
        ok: true,
        dryRun: true,
        action: 'accept',
        matched: expect.objectContaining({
          total: 1,
          selected: 1,
          hasMore: false,
        }),
        proposals: [
          expect.objectContaining({
            id: 'transaction-tx-stream-one-joyreview',
            status: 'accepted',
          }),
        ],
        extensions: [
          expect.objectContaining({
            entityId: 'tx-stream-one',
            namespace: 'joyReview',
          }),
        ],
      }),
    )
    expect(
      batchAcceptDryRun.proposalCounts.pending['transaction:joyReview'],
    ).toBe(2)

    const proposalReviewResponse = await app.request(
      '/api/transactions/review?reason=has_proposals&namespace=joyReview&limit=1',
    )
    expect(proposalReviewResponse.status).toBe(200)
    const proposalReview = (await proposalReviewResponse.json()) as {
      reason: string
      namespace: string
      total: number
      limit: number
      hasMore: boolean
      nextCursor?: string
      counts: Record<string, number>
      items: Array<{
        transaction: { id: string }
        labelSelector: { transactionIds: string[] }
        reasons: string[]
        signals: {
          pendingProposalCount: number
          extensionNamespaces: string[]
          missingNamespaces: string[]
        }
        proposals: Array<{
          entityId: string
          namespace: string
          status: string
        }>
        recommendations: unknown[]
      }>
    }
    expect(proposalReview).toEqual(
      expect.objectContaining({
        reason: 'has_proposals',
        namespace: 'joyReview',
        total: 2,
        limit: 1,
        hasMore: true,
        nextCursor: expect.any(String),
      }),
    )
    expect(proposalReview.counts.has_proposals).toBe(2)
    expect(proposalReview.counts.needs_review).toBe(3)
    expect(proposalReview.items).toEqual([
      expect.objectContaining({
        transaction: expect.objectContaining({ id: 'tx-stream-one' }),
        labelSelector: { transactionIds: ['tx-stream-one'] },
        reasons: expect.arrayContaining(['has_proposals', 'missing_namespace']),
        signals: expect.objectContaining({
          pendingProposalCount: 1,
          activeRecommendationCount: 1,
          extensionNamespaces: ['subscription'],
          missingNamespaces: ['joyReview'],
          recurring: true,
        }),
        proposals: [
          expect.objectContaining({
            entityId: 'tx-stream-one',
            namespace: 'joyReview',
            status: 'pending',
          }),
        ],
        recommendations: [
          expect.objectContaining({ id: 'transaction-tx-stream-one-review' }),
        ],
      }),
    ])

    const missingBudgetReviewResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.review',
        params: {
          reason: 'missing_namespace',
          namespace: 'budget',
          direction: 'expense',
          limit: 3,
        },
      }),
    })
    expect(missingBudgetReviewResponse.status).toBe(200)
    const missingBudgetReview = (await missingBudgetReviewResponse.json()) as {
      ok: boolean
      result: {
        total: number
        hasMore: boolean
        counts: Record<string, number>
        items: Array<{
          transaction: { id: string }
          labelActions: Array<{
            action: string
            recommendedRpc: string
            previewRequest: {
              dryRun: boolean
              namespace: string
              selector: { transactionIds: string[] }
              values: Record<string, unknown>
            }
            applyRequest: {
              dryRun: boolean
              namespace: string
              selector: { transactionIds: string[] }
              values: Record<string, unknown>
            }
          }>
          signals: { missingNamespaces: string[] }
        }>
      }
    }
    expect(missingBudgetReview.ok).toBe(true)
    expect(missingBudgetReview.result).toEqual(
      expect.objectContaining({
        total: 3,
        hasMore: false,
      }),
    )
    expect(missingBudgetReview.result.counts.missing_namespace).toBe(3)
    expect(missingBudgetReview.result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transaction: expect.objectContaining({ id: 'tx-stream-one' }),
          labelActions: expect.arrayContaining([
            expect.objectContaining({
              action: 'budget-required',
              recommendedRpc: 'money.transactions.labelPreview',
              previewRequest: expect.objectContaining({
                dryRun: true,
                namespace: 'budget',
                selector: expect.objectContaining({
                  transactionIds: ['tx-stream-one'],
                }),
                values: { need: 'required' },
              }),
              applyRequest: expect.objectContaining({
                dryRun: false,
                namespace: 'budget',
                selector: expect.objectContaining({
                  transactionIds: ['tx-stream-one'],
                }),
                values: { need: 'required' },
              }),
            }),
            expect.objectContaining({
              action: 'budget-waste',
              previewRequest: expect.objectContaining({
                values: { need: 'waste' },
              }),
            }),
          ]),
          signals: expect.objectContaining({ missingNamespaces: ['budget'] }),
        }),
        expect.objectContaining({
          transaction: expect.objectContaining({ id: 'tx-stream-two' }),
          signals: expect.objectContaining({ missingNamespaces: ['budget'] }),
        }),
      ]),
    )

    const beforeApplyResponse = await app.request(
      '/api/extensions/values?entity=transaction&namespace=joyReview',
    )
    const beforeApply = (await beforeApplyResponse.json()) as { total: number }
    expect(beforeApply.total).toBe(0)

    const applyResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.classify',
        params: {
          selector: {
            merchantIds: ['streamco'],
            direction: 'expense',
            limit: 10,
          },
          targetNamespaces: ['joyReview'],
          apply: true,
          minConfidenceToApply: 0.9,
          maxTransactions: 5,
        },
      }),
    })
    expect(applyResponse.status).toBe(200)
    const apply = (await applyResponse.json()) as {
      ok: boolean
      result: {
        ok: boolean
        dryRun: boolean
        summary: {
          dryRun: boolean
          targetNamespaces: string[]
          matchedTotal: number
          selectedTotal: number
          proposalTotal: number
          savedProposalTotal: number
          appliedTotal: number
          skippedTotal: number
          saveProposals: boolean
          apply: boolean
          minConfidenceToApply: number
        }
        applied: Array<{ entityId: string }>
        skipped: Array<{ transactionId: string; reason: string }>
        reviewAfter: {
          namespaces: Array<{
            namespace: string
            labeledTotal: number
            missingNamespaceTotal: number
            pendingProposalTotal: number
            affectedStillMissing: number
            affectedPendingProposalTotal: number
          }>
        }
      }
    }
    expect(apply.ok).toBe(true)
    expect(apply.result.ok).toBe(true)
    expect(apply.result.dryRun).toBe(false)
    expect(apply.result.summary).toEqual(
      expect.objectContaining({
        dryRun: false,
        targetNamespaces: ['joyReview'],
        matchedTotal: 2,
        selectedTotal: 2,
        proposalTotal: 2,
        savedProposalTotal: 2,
        appliedTotal: 1,
        skippedTotal: 1,
        saveProposals: true,
        apply: true,
        minConfidenceToApply: 0.9,
      }),
    )
    expect(apply.result.applied).toEqual([
      expect.objectContaining({ entityId: 'tx-stream-one' }),
    ])
    expect(apply.result.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionId: 'tx-stream-two',
          reason: 'confidence_below_apply_threshold',
        }),
      ]),
    )
    expect(apply.result.reviewAfter.namespaces).toEqual([
      expect.objectContaining({
        namespace: 'joyReview',
        labeledTotal: 1,
        missingNamespaceTotal: 2,
        pendingProposalTotal: 1,
        affectedStillMissing: 1,
        affectedPendingProposalTotal: 1,
      }),
    ])

    const acceptedProposalsResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.extensions.proposals.list',
        params: {
          entity: 'transaction',
          namespace: 'joyReview',
          status: 'accepted',
        },
      }),
    })
    expect(acceptedProposalsResponse.status).toBe(200)
    const acceptedProposals = (await acceptedProposalsResponse.json()) as {
      result: {
        proposals: Array<{ id: string; status: string }>
        total: number
      }
    }
    expect(acceptedProposals.result).toEqual(
      expect.objectContaining({
        total: 1,
        proposals: [
          expect.objectContaining({
            id: 'transaction-tx-stream-one-joyreview',
            status: 'accepted',
          }),
        ],
      }),
    )

    const rejectProposalResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.extensions.proposals.decide',
        params: {
          action: 'reject',
          ids: ['transaction-tx-stream-two-joyreview'],
          reason: 'Synthetic review rejected this label.',
        },
      }),
    })
    expect(rejectProposalResponse.status).toBe(200)
    const rejectProposal = (await rejectProposalResponse.json()) as {
      ok: boolean
      result: {
        action: string
        dryRun: boolean
        matched: { total: number; selected: number }
        proposals: Array<{ id: string; status: string; decisionReason: string }>
        proposalCounts: Record<string, Record<string, number>>
      }
    }
    expect(rejectProposal.ok).toBe(true)
    expect(rejectProposal.result).toEqual(
      expect.objectContaining({
        action: 'reject',
        dryRun: false,
        matched: expect.objectContaining({ total: 1, selected: 1 }),
        proposals: [
          expect.objectContaining({
            id: 'transaction-tx-stream-two-joyreview',
            status: 'rejected',
            decisionReason: 'Synthetic review rejected this label.',
          }),
        ],
      }),
    )
    expect(
      rejectProposal.result.proposalCounts.rejected['transaction:joyReview'],
    ).toBe(1)

    const acceptProposalResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.extensions.proposals.accept',
        params: { id: 'transaction-tx-stream-one-joyreview' },
      }),
    })
    expect(acceptProposalResponse.status).toBe(200)
    const acceptProposal = (await acceptProposalResponse.json()) as {
      ok: boolean
      result: {
        proposal: { id: string; status: string }
        extension: { entityId: string; namespace: string }
        counts: Record<string, Record<string, number>>
      }
    }
    expect(acceptProposal.ok).toBe(true)
    expect(acceptProposal.result.proposal).toEqual(
      expect.objectContaining({
        id: 'transaction-tx-stream-one-joyreview',
        status: 'accepted',
      }),
    )
    expect(acceptProposal.result.extension).toEqual(
      expect.objectContaining({
        entityId: 'tx-stream-one',
        namespace: 'joyReview',
      }),
    )
    expect(acceptProposal.result.counts.transaction.joyReview).toBe(1)

    const formulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'JoyReview.Where(rating = "negative").Sum()',
      }),
    })
    expect(formulaResponse.status).toBe(200)
    const formula = (await formulaResponse.json()) as {
      result: { value: number }
    }
    expect(formula.result.value).toBe(12)

    const drilldownResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.cards.transactions',
        params: {
          formula: 'JoyReview.Where(rating = "negative").Sum()',
          limit: 10,
        },
      }),
    })
    expect(drilldownResponse.status).toBe(200)
    const drilldown = (await drilldownResponse.json()) as {
      ok: boolean
      result: {
        collection: string
        drilldownBasis: string
        formulaFiltered: boolean
        total: number
        transactions: Array<{ id: string }>
      }
    }
    expect(drilldown.ok).toBe(true)
    expect(drilldown.result).toEqual(
      expect.objectContaining({
        collection: 'JoyReview',
        drilldownBasis: 'formula',
        formulaFiltered: true,
        total: 1,
      }),
    )
    expect(
      drilldown.result.transactions.map((transaction) => transaction.id),
    ).toEqual(['tx-stream-one'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('corrects a bad proposal and teaches the corrected merchant label', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'tx-billco-one',
            source: 'manual',
            name: 'BillCo Rent',
            merchantName: 'BillCo',
            amount: 2200,
            direction: 'expense',
            category: ['RENT_AND_UTILITIES_RENT'],
            providerCategoryPrimary: 'RENT_AND_UTILITIES',
            providerCategoryDetailed: 'RENT_AND_UTILITIES_RENT',
            date: '2026-06-01',
            isoCurrencyCode: 'USD',
            recurring: true,
          },
          {
            id: 'tx-billco-two',
            source: 'manual',
            name: 'BillCo Rent',
            merchantName: 'BillCo',
            amount: 2200,
            direction: 'expense',
            category: ['RENT_AND_UTILITIES_RENT'],
            providerCategoryPrimary: 'RENT_AND_UTILITIES',
            providerCategoryDetailed: 'RENT_AND_UTILITIES_RENT',
            date: '2026-05-01',
            isoCurrencyCode: 'USD',
            recurring: true,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    process.env.MOLDABLE_AI_SERVER_URL = 'http://ai-server.test'
    process.env.MOLDABLE_APP_ID = 'money'
    process.env.MOLDABLE_APP_TOKEN = 'test-token'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            json: {
              proposals: [
                {
                  transactionId: 'tx-billco-one',
                  namespace: 'budget',
                  values: { need: 'waste', goal: 'wrong' },
                  confidence: 0.61,
                  reason: 'Synthetic intentionally-wrong proposal.',
                },
                {
                  transactionId: 'tx-billco-two',
                  namespace: 'budget',
                  values: { need: 'waste', goal: 'wrong' },
                  confidence: 0.62,
                  reason: 'Synthetic intentionally-wrong proposal.',
                },
              ],
            },
            model: 'openai/gpt-5.5',
            usage: { inputTokens: 20, outputTokens: 20 },
          }),
          { headers: { 'content-type': 'application/json' } },
        )
      }),
    )

    const classifyResponse = await app.request('/api/classify/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selector: { merchantIds: ['billco'], direction: 'expense', limit: 10 },
        targetNamespaces: ['budget'],
        apply: false,
        maxTransactions: 5,
      }),
    })
    expect(classifyResponse.status).toBe(200)

    const correctResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.extensions.proposals.decide',
        params: {
          action: 'correct',
          ids: [
            'transaction-tx-billco-one-budget',
            'transaction-tx-billco-two-budget',
          ],
          values: { need: 'required', goal: 'housing' },
          source: 'user',
          confidence: 1,
          teachRule: true,
          rule: { name: 'BillCo is required housing' },
          reason: 'Corrected from waste to required housing.',
        },
      }),
    })
    expect(correctResponse.status).toBe(200)
    const correct = (await correctResponse.json()) as {
      ok: boolean
      result: {
        action: string
        matched: { total: number; selected: number }
        proposals: Array<{ id: string; status: string; decisionReason: string }>
        extensions: Array<{
          entityId: string
          namespace: string
          source: string
          values: { need: string }
        }>
        taughtRule?: { namespace: string; match: { merchantIds: string[] } }
        proposalCounts: Record<string, Record<string, number>>
      }
    }
    expect(correct.ok).toBe(true)
    expect(correct.result).toEqual(
      expect.objectContaining({
        action: 'correct',
        matched: expect.objectContaining({ total: 2, selected: 2 }),
        taughtRule: expect.objectContaining({
          namespace: 'budget',
          match: expect.objectContaining({ merchantIds: ['billco'] }),
        }),
      }),
    )
    expect(correct.result.proposals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'transaction-tx-billco-one-budget',
          status: 'rejected',
          decisionReason: 'Corrected from waste to required housing.',
        }),
        expect.objectContaining({
          id: 'transaction-tx-billco-two-budget',
          status: 'rejected',
        }),
      ]),
    )
    expect(correct.result.extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'tx-billco-one',
          namespace: 'budget',
          source: 'user',
          values: expect.objectContaining({ need: 'required' }),
        }),
        expect.objectContaining({
          entityId: 'tx-billco-two',
          namespace: 'budget',
          source: 'user',
          values: expect.objectContaining({ need: 'required' }),
        }),
      ]),
    )
    expect(correct.result.proposalCounts.rejected['transaction:budget']).toBe(2)

    const futureImportResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'tx-billco-three',
            source: 'manual',
            name: 'BillCo Rent',
            merchantName: 'BillCo',
            amount: 2200,
            direction: 'expense',
            category: ['RENT_AND_UTILITIES_RENT'],
            date: '2026-07-01',
            isoCurrencyCode: 'USD',
            recurring: true,
          },
        ],
      }),
    })
    expect(futureImportResponse.status).toBe(200)

    const extensionsResponse = await app.request(
      '/api/extensions/values?entity=transaction&namespace=budget',
    )
    expect(extensionsResponse.status).toBe(200)
    const extensions = (await extensionsResponse.json()) as {
      total: number
      extensions: Array<{
        entityId: string
        source: string
        values: { need: string }
      }>
    }
    expect(extensions.total).toBe(3)
    expect(extensions.extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'tx-billco-three',
          source: 'rule',
          values: expect.objectContaining({ need: 'required' }),
        }),
      ]),
    )
  })

  it('surfaces AI structured-output errors for transaction classification', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'tx-ai-failure',
            source: 'manual',
            name: 'Ambiguous Cafe',
            merchantName: 'Ambiguous Cafe',
            amount: 18,
            direction: 'expense',
            category: ['Food And Drink'],
            date: '2026-06-04',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    process.env.MOLDABLE_AI_SERVER_URL = 'http://ai-server.test'
    process.env.MOLDABLE_APP_ID = 'money'
    process.env.MOLDABLE_APP_TOKEN = 'test-token'

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error:
                'Invalid schema for response_format: values must declare explicit properties.',
            }),
            { status: 500, headers: { 'content-type': 'application/json' } },
          ),
      ),
    )

    const classifyResponse = await app.request('/api/classify/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selector: {
          merchantNames: ['Ambiguous Cafe'],
          direction: 'expense',
          limit: 1,
        },
        targetNamespaces: ['budget'],
        maxTransactions: 1,
        saveProposals: false,
        apply: false,
      }),
    })
    expect(classifyResponse.status).toBe(400)
    const classify = (await classifyResponse.json()) as {
      ok: boolean
      error: { code: string; message: string }
    }
    expect(classify).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'classification_failed',
        message: expect.stringContaining(
          'values must declare explicit properties',
        ),
      }),
    })
  })

  it('derives, lists, patches, and evaluates recommendation action facts', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'tx-trip',
            source: 'manual',
            name: 'Delta Airlines',
            merchantName: 'Delta',
            amount: 600,
            direction: 'expense',
            category: ['Travel'],
            date: '2026-06-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'tx-trip-two',
            source: 'manual',
            name: 'Delta Airlines',
            merchantName: 'Delta',
            amount: 700,
            direction: 'expense',
            category: ['Travel'],
            date: '2026-06-03',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'tx-openai-recurring',
            source: 'manual',
            name: 'OpenAI Subscription',
            amount: 30,
            direction: 'expense',
            category: ['Software'],
            date: '2026-06-02',
            isoCurrencyCode: 'USD',
            recurring: true,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const recommendationsResponse = await app.request('/api/recommendations')
    expect(recommendationsResponse.status).toBe(200)
    const recommendationsBody = (await recommendationsResponse.json()) as {
      recommendations: Array<{
        id: string
        kind: string
        status: string
        estimatedImpact: number
        sourceLinks: Array<{ entity: string; entityId: string }>
      }>
      total: number
    }
    expect(recommendationsBody.total).toBe(3)
    expect(recommendationsBody.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'transaction-tx-trip-review',
          kind: 'opportunity',
          status: 'required',
          estimatedImpact: 300,
          sourceLinks: [{ entity: 'transaction', entityId: 'tx-trip' }],
        }),
        expect.objectContaining({
          id: 'transaction-tx-trip-two-review',
          kind: 'opportunity',
          status: 'required',
          estimatedImpact: 350,
          sourceLinks: [{ entity: 'transaction', entityId: 'tx-trip-two' }],
        }),
        expect.objectContaining({
          id: 'transaction-tx-openai-recurring-review',
          kind: 'opportunity',
          status: 'suggested',
          estimatedImpact: 360,
        }),
      ]),
    )

    const previewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'Opportunities.Sum()' }),
    })
    expect(previewResponse.status).toBe(200)
    const preview = (await previewResponse.json()) as {
      ok: boolean
      result: { value: number }
    }
    expect(preview.ok).toBe(true)
    expect(preview.result.value).toBe(1010)

    const groupsResponse = await app.request(
      '/api/recommendations/groups?groupBy=merchant&status=active&minCount=2',
    )
    expect(groupsResponse.status).toBe(200)
    const groups = (await groupsResponse.json()) as {
      total: number
      filters: {
        includeRecommendations: boolean
        includeRecommendationIds: boolean
        includeSourceLinks: boolean
      }
      groups: Array<{
        id: string
        name: string
        count: number
        activeCount: number
        totalEstimatedImpact: number
        recommendationIdCount: number
        sourceLinkCount: number
        recommendationIds?: string[]
        sourceLinks?: Array<{ entity: string; entityId: string }>
        recommendations?: unknown[]
        bulkActions: Array<{
          action: string
          request: {
            groupBy: string
            groupId: string
            currentStatus?: string
            status: string
          }
        }>
      }>
    }
    expect(groups.total).toBe(1)
    expect(groups.filters).toEqual(
      expect.objectContaining({
        includeRecommendations: false,
        includeRecommendationIds: false,
        includeSourceLinks: false,
      }),
    )
    expect(groups.groups).toEqual([
      expect.objectContaining({
        id: 'merchant:delta',
        name: 'Delta',
        count: 2,
        activeCount: 2,
        totalEstimatedImpact: 650,
        recommendationIdCount: 2,
        sourceLinkCount: 2,
        bulkActions: expect.arrayContaining([
          expect.objectContaining({
            action: 'mark-done',
            request: expect.objectContaining({
              groupBy: 'merchant',
              groupId: 'merchant:delta',
              currentStatus: 'active',
              status: 'done',
            }),
          }),
        ]),
      }),
    ])
    expect(groups.groups[0]).not.toHaveProperty('recommendationIds')
    expect(groups.groups[0]).not.toHaveProperty('sourceLinks')
    expect(groups.groups[0]).not.toHaveProperty('recommendations')

    const detailedGroupsResponse = await app.request(
      '/api/recommendations/groups?groupBy=merchant&status=active&minCount=2&includeRecommendationIds=true&includeSourceLinks=true&includeRecommendations=true&recommendationSampleLimit=1',
    )
    expect(detailedGroupsResponse.status).toBe(200)
    const detailedGroups = (await detailedGroupsResponse.json()) as {
      groups: Array<{
        recommendationIds?: string[]
        sourceLinks?: Array<{ entity: string; entityId: string }>
        recommendations?: Array<{ id: string }>
      }>
    }
    expect(detailedGroups.groups[0]).toEqual(
      expect.objectContaining({
        recommendationIds: [
          'transaction-tx-trip-two-review',
          'transaction-tx-trip-review',
        ],
        sourceLinks: [
          { entity: 'transaction', entityId: 'tx-trip-two' },
          { entity: 'transaction', entityId: 'tx-trip' },
        ],
        recommendations: [
          expect.objectContaining({ id: 'transaction-tx-trip-two-review' }),
        ],
      }),
    )

    const groupBulkPatchDryRunResponse = await app.request(
      '/api/recommendations',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          groupBy: 'merchant',
          groupId: 'merchant:delta',
          currentStatus: 'active',
          status: 'ignored',
          dryRun: true,
        }),
      },
    )
    expect(groupBulkPatchDryRunResponse.status).toBe(200)
    const groupBulkPatchDryRun =
      (await groupBulkPatchDryRunResponse.json()) as {
        ok: boolean
        dryRun: boolean
        matched: { total: number; selected: number }
        recommendations: Array<{
          id: string
          status: string
          ignoredAt?: string
        }>
      }
    expect(groupBulkPatchDryRun).toEqual(
      expect.objectContaining({
        ok: true,
        dryRun: true,
        matched: expect.objectContaining({ total: 2, selected: 2 }),
        recommendations: [
          expect.objectContaining({
            id: 'transaction-tx-trip-two-review',
            status: 'ignored',
            ignoredAt: expect.any(String),
          }),
          expect.objectContaining({
            id: 'transaction-tx-trip-review',
            status: 'ignored',
            ignoredAt: expect.any(String),
          }),
        ],
      }),
    )

    const patchResponse = await app.request(
      '/api/recommendations/transaction-tx-trip-review',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      },
    )
    expect(patchResponse.status).toBe(200)
    const patched = (await patchResponse.json()) as {
      recommendation: { id: string; status: string; acceptedAt?: string }
    }
    expect(patched.recommendation).toEqual(
      expect.objectContaining({
        id: 'transaction-tx-trip-review',
        status: 'accepted',
        acceptedAt: expect.any(String),
      }),
    )

    const bulkPatchDryRunResponse = await app.request('/api/recommendations', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ids: ['transaction-tx-trip-two-review'],
        status: 'ignored',
        dryRun: true,
      }),
    })
    expect(bulkPatchDryRunResponse.status).toBe(200)
    const bulkPatchDryRun = (await bulkPatchDryRunResponse.json()) as {
      ok: boolean
      dryRun: boolean
      matched: { total: number; selected: number }
      recommendations: Array<{ id: string; status: string; ignoredAt?: string }>
    }
    expect(bulkPatchDryRun).toEqual(
      expect.objectContaining({
        ok: true,
        dryRun: true,
        matched: expect.objectContaining({ total: 1, selected: 1 }),
        recommendations: [
          expect.objectContaining({
            id: 'transaction-tx-trip-two-review',
            status: 'ignored',
            ignoredAt: expect.any(String),
          }),
        ],
      }),
    )

    const bulkPatchResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.recommendations.patch',
        params: {
          ids: ['transaction-tx-trip-two-review'],
          status: 'done',
        },
      }),
    })
    expect(bulkPatchResponse.status).toBe(200)
    const bulkPatch = (await bulkPatchResponse.json()) as {
      ok: boolean
      result: {
        ok: boolean
        matched: { total: number; selected: number }
        recommendations: Array<{ id: string; status: string; doneAt?: string }>
      }
    }
    expect(bulkPatch.ok).toBe(true)
    expect(bulkPatch.result).toEqual(
      expect.objectContaining({
        ok: true,
        matched: expect.objectContaining({ total: 1, selected: 1 }),
        recommendations: [
          expect.objectContaining({
            id: 'transaction-tx-trip-two-review',
            status: 'done',
            doneAt: expect.any(String),
          }),
        ],
      }),
    )

    const rpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.recommendations.groups',
        params: { groupBy: 'kind', status: 'all' },
      }),
    })
    expect(rpcResponse.status).toBe(200)
    const rpc = (await rpcResponse.json()) as {
      ok: boolean
      result: { groups: Array<{ id: string; count: number }> }
    }
    expect(rpc.ok).toBe(true)
    expect(rpc.result.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'kind:opportunity' }),
      ]),
    )
  })

  it('derives tax contribution extensions from raw imports and preserves user overrides', async () => {
    const rawPayload = {
      accounts: [],
      transactions: [
        {
          id: 'tx-hsa-contribution',
          source: 'manual',
          name: 'HSA Contribution Transfer',
          amount: 500,
          direction: 'transfer',
          category: ['Transfer'],
          date: '2026-01-15',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
        {
          id: 'tx-hsa-store',
          source: 'manual',
          name: 'HSA Store Purchase',
          amount: 50,
          direction: 'expense',
          category: ['Shopping'],
          date: '2026-01-16',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
      ],
    }

    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rawPayload),
    })
    expect(importResponse.status).toBe(200)

    const derivedResponse = await app.request(
      '/api/extensions/values?entity=transaction&namespace=taxContribution',
    )
    expect(derivedResponse.status).toBe(200)
    const derivedBody = (await derivedResponse.json()) as {
      total: number
      extensions: Array<{
        entityId: string
        source: string
        values: { type: string; amount: number; contributionSource: string }
      }>
    }
    expect(derivedBody.total).toBe(1)
    expect(derivedBody.extensions[0]).toEqual(
      expect.objectContaining({
        entityId: 'tx-hsa-contribution',
        source: 'rule',
        values: expect.objectContaining({
          type: 'hsa',
          amount: 500,
          contributionSource: 'transfer',
        }),
      }),
    )

    const overrideResponse = await app.request('/api/extensions/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: [
          {
            entity: 'transaction',
            entityId: 'tx-hsa-contribution',
            namespace: 'taxContribution',
            source: 'user',
            values: {
              type: 'ira',
              taxYear: 2026,
              amount: 250,
              contributionSource: 'manual',
            },
          },
        ],
      }),
    })
    expect(overrideResponse.status).toBe(200)

    const reimportResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rawPayload),
    })
    expect(reimportResponse.status).toBe(200)

    const overrideCheckResponse = await app.request(
      '/api/extensions/values?entity=transaction&entityId=tx-hsa-contribution&namespace=taxContribution',
    )
    expect(overrideCheckResponse.status).toBe(200)
    const overrideCheck = (await overrideCheckResponse.json()) as {
      total: number
      extensions: Array<{
        source: string
        values: { type: string; amount: number; contributionSource: string }
      }>
    }
    expect(overrideCheck.total).toBe(1)
    expect(overrideCheck.extensions[0]).toEqual(
      expect.objectContaining({
        source: 'user',
        values: expect.objectContaining({
          type: 'ira',
          amount: 250,
          contributionSource: 'manual',
        }),
      }),
    )

    const previewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula:
          'TaxContributions.Where(taxContributionSource = "manual").Sum()',
      }),
    })
    expect(previewResponse.status).toBe(200)
    const preview = (await previewResponse.json()) as {
      ok: boolean
      result: { value: number; outputType: string }
    }
    expect(preview.ok).toBe(true)
    expect(preview.result).toEqual(
      expect.objectContaining({
        value: 250,
        outputType: 'number',
      }),
    )
  })

  it('persists allocation targets and resolves them in formulas', async () => {
    const initialResponse = await app.request('/api/allocation-targets')
    expect(initialResponse.status).toBe(200)
    const initial = (await initialResponse.json()) as {
      targets: Array<{ id: string; allocations: Record<string, number> }>
    }
    expect(initial.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'default',
          allocations: expect.objectContaining({ funds: 0.9, cash: 0.1 }),
        }),
      ]),
    )

    const writeResponse = await app.request('/api/allocation-targets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'retirement',
        name: 'Retirement',
        allocations: { funds: 80, cash: 20 },
      }),
    })
    expect(writeResponse.status).toBe(400)

    const validWriteResponse = await app.request('/api/allocation-targets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'retirement',
        name: 'Retirement',
        allocations: { funds: 0.8, cash: 0.2 },
      }),
    })
    expect(validWriteResponse.status).toBe(200)

    const storedResponse = await app.request('/api/allocation-targets')
    const stored = (await storedResponse.json()) as {
      targets: Array<{ id: string; allocations: Record<string, number> }>
    }
    expect(stored.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'retirement',
          allocations: expect.objectContaining({ funds: 0.8, cash: 0.2 }),
        }),
      ]),
    )

    await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accounts: [], transactions: [] }),
    })
    await fs.writeFile(
      path.join(dataDir, 'holdings.json'),
      JSON.stringify([
        {
          id: 'fund',
          source: 'manual',
          name: 'Total Market ETF',
          tickerSymbol: 'VTI',
          type: 'etf',
          quantity: 10,
          price: 90,
          marketValue: 900,
          asOf: '2026-06-03',
        },
        {
          id: 'cash',
          source: 'manual',
          name: 'Settlement Cash',
          type: 'cash',
          quantity: 1,
          price: 100,
          marketValue: 100,
          asOf: '2026-06-03',
        },
      ]),
    )

    const previewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula:
          'AllocationDrift(Investments.GroupBy(assetClass).PercentOfTotal(), "retirement")',
      }),
    })
    expect(previewResponse.status).toBe(200)
    const preview = (await previewResponse.json()) as {
      ok: boolean
      result: {
        outputType: string
        value: {
          type: string
          rows: Array<{ key: string; targetPercent: number }>
        }
      }
    }
    expect(preview.ok).toBe(true)
    expect(preview.result.outputType).toBe('table')
    expect(preview.result.value.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'funds', targetPercent: 0.8 }),
        expect.objectContaining({ key: 'cash', targetPercent: 0.2 }),
      ]),
    )
  })

  it('imports credit limits and evaluates credit utilization cards', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [
          {
            id: 'card-one',
            source: 'manual',
            name: 'Rewards Card',
            type: 'credit',
            currentBalance: -500,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-03',
            creditLimit: 2000,
          },
          {
            id: 'card-two',
            source: 'manual',
            name: 'Travel Card',
            type: 'credit',
            currentBalance: -300,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-03',
            creditLimit: 1000,
          },
        ],
        transactions: [],
      }),
    })
    expect(importResponse.status).toBe(200)

    const accountsResponse = await app.request('/api/accounts')
    expect(accountsResponse.status).toBe(200)
    const accounts = (await accountsResponse.json()) as {
      accounts: Array<{
        id: string
        creditLimit?: number
        availableCredit?: number
        utilization?: number
      }>
    }
    expect(accounts.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'card-one',
          creditLimit: 2000,
          availableCredit: 1500,
          utilization: 0.25,
        }),
      ]),
    )

    const previewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'CreditUtilization(CardAccounts.Where(creditLimit > 0))',
      }),
    })
    expect(previewResponse.status).toBe(200)
    const preview = (await previewResponse.json()) as {
      ok: boolean
      result: {
        outputType: string
        value: {
          type: string
          rows: Array<{
            key: string
            balance: number
            creditLimit: number
            utilization: number
          }>
        }
      }
    }
    expect(preview.ok).toBe(true)
    expect(preview.result.outputType).toBe('table')
    expect(preview.result.value.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'total',
          balance: 800,
          creditLimit: 3000,
          utilization: 800 / 3000,
        }),
      ]),
    )
  })

  it('imports investment tax metadata and evaluates tax-sheltered formulas', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [
          {
            id: 'taxable',
            source: 'manual',
            name: 'Taxable Brokerage',
            type: 'investment',
            currentBalance: 900,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-03',
          },
          {
            id: 'ira',
            source: 'manual',
            name: 'Traditional IRA',
            subtype: 'ira',
            type: 'investment',
            currentBalance: 1100,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-03',
            contributionLimitAnnual: 7000,
            contributionLimitYear: 2026,
          },
        ],
        transactions: [],
      }),
    })
    expect(importResponse.status).toBe(200)

    const accountsResponse = await app.request('/api/accounts')
    expect(accountsResponse.status).toBe(200)
    const accounts = (await accountsResponse.json()) as {
      accounts: Array<{
        id: string
        investmentAccountKind?: string
        taxTreatment?: string
        contributionLimitAnnual?: number
      }>
    }
    expect(accounts.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'taxable',
          investmentAccountKind: 'brokerage',
          taxTreatment: 'taxable',
        }),
        expect.objectContaining({
          id: 'ira',
          investmentAccountKind: 'ira',
          taxTreatment: 'tax_deferred',
          contributionLimitAnnual: 7000,
        }),
      ]),
    )

    const previewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'TaxSheltered.Sum()' }),
    })
    expect(previewResponse.status).toBe(200)
    const preview = (await previewResponse.json()) as {
      ok: boolean
      result: { value: number; outputType: string }
    }
    expect(preview.ok).toBe(true)
    expect(preview.result).toEqual(
      expect.objectContaining({ value: 1100, outputType: 'number' }),
    )
  })

  it('persists forecast scenarios and resolves them in formulas', async () => {
    const initialResponse = await app.request('/api/forecast-scenarios')
    expect(initialResponse.status).toBe(200)
    const initial = (await initialResponse.json()) as {
      scenarios: Array<{
        id: string
        changes: Array<{ percentChange?: number }>
      }>
    }
    expect(initial.scenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'default',
          changes: expect.arrayContaining([
            expect.objectContaining({ percentChange: -0.1 }),
          ]),
        }),
      ]),
    )

    const invalidResponse = await app.request('/api/forecast-scenarios', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Impossible Cut',
        confidence: 2,
      }),
    })
    expect(invalidResponse.status).toBe(400)

    const writeResponse = await app.request('/api/forecast-scenarios', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'trim-subscriptions',
        name: 'Trim Subscriptions',
        status: 'draft',
        horizonPeriods: 6,
        confidence: 0.7,
        changes: [
          {
            label: 'Cancel Streaming',
            amountMonthly: -25,
            entity: 'transaction',
            entityId: 'seed-netflix',
            namespace: 'subscription',
            status: 'accepted',
          },
          {
            label: 'Rejected Gym Cut',
            amountMonthly: -50,
            status: 'rejected',
          },
        ],
      }),
    })
    expect(writeResponse.status).toBe(200)
    const written = (await writeResponse.json()) as {
      scenario: { id: string; changes: Array<{ id: string }> }
    }
    expect(written.scenario).toEqual(
      expect.objectContaining({
        id: 'trim-subscriptions',
        changes: expect.arrayContaining([
          expect.objectContaining({ id: 'cancel-streaming' }),
        ]),
      }),
    )

    await app.request('/api/dev/seed', { method: 'POST' })
    const previewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula:
          'ForecastScenario(Expenses.MonthlyAverage(6), "trim-subscriptions")',
      }),
    })
    expect(previewResponse.status).toBe(200)
    const preview = (await previewResponse.json()) as {
      ok: boolean
      result: {
        outputType: string
        value: {
          type: string
          method: string
          periods: number
          scenario?: {
            id: string
            monthlyDelta: number
            acceptedChanges: number
            rejectedChanges: number
          }
        }
      }
    }
    expect(preview.ok).toBe(true)
    expect(preview.result.outputType).toBe('forecast')
    expect(preview.result.value).toEqual(
      expect.objectContaining({
        type: 'forecast',
        method: 'scenario-point',
        periods: 6,
        scenario: expect.objectContaining({
          id: 'trim-subscriptions',
          monthlyDelta: -25,
          acceptedChanges: 1,
          rejectedChanges: 1,
        }),
      }),
    )

    const schemaResponse = await app.request('/api/formulas/schema')
    const schema = (await schemaResponse.json()) as {
      forecastScenarios: Array<{ id: string }>
      functions: Array<{ name: string }>
    }
    expect(schema.forecastScenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'trim-subscriptions' }),
      ]),
    )
    expect(schema.functions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'ForecastScenario' }),
      ]),
    )
  })

  it('persists tax contribution limits and resolves contribution room formulas', async () => {
    const initialResponse = await app.request('/api/tax-contribution-limits')
    expect(initialResponse.status).toBe(200)
    const initial = (await initialResponse.json()) as {
      limits: Array<{
        id: string
        type: string
        taxYear: number
        limit: number
      }>
    }
    expect(initial.limits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: '401k-2026-standard', limit: 24500 }),
        expect.objectContaining({ id: 'hsa-2026-self', limit: 4400 }),
      ]),
    )

    const invalidResponse = await app.request('/api/tax-contribution-limits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'hsa',
        taxYear: 2026,
        label: 'Invalid HSA',
        limit: -1,
      }),
    })
    expect(invalidResponse.status).toBe(400)

    const writeResponse = await app.request('/api/tax-contribution-limits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'hsa-2026-self',
        type: 'hsa',
        taxYear: 2026,
        label: 'HSA self-only coverage',
        limit: 4500,
        variant: 'self',
        sourceLabel: 'Local Override',
        sourceUrl: 'https://example.com/hsa-limit',
      }),
    })
    expect(writeResponse.status).toBe(200)
    const written = (await writeResponse.json()) as {
      limits: Array<{ id: string; limit: number }>
    }
    expect(written.limits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'hsa-2026-self', limit: 4500 }),
      ]),
    )

    await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'hsa-transfer',
            source: 'manual',
            name: 'HSA Contribution Transfer',
            amount: 500,
            direction: 'transfer',
            category: ['Transfer'],
            date: '2026-01-15',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })

    const previewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula:
          'ContributionRoom(TaxContributions.ThisYear(), "hsa", 2026, "self")',
      }),
    })
    expect(previewResponse.status).toBe(200)
    const preview = (await previewResponse.json()) as {
      ok: boolean
      result: {
        outputType: string
        value: {
          type: string
          rows: Array<{ remaining: number; utilization: number }>
        }
      }
    }
    expect(preview.ok).toBe(true)
    expect(preview.result.outputType).toBe('table')
    expect(preview.result.value.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          remaining: 4000,
          utilization: 500 / 4500,
        }),
      ]),
    )

    const schemaResponse = await app.request('/api/formulas/schema')
    const schema = (await schemaResponse.json()) as {
      taxContributionLimits: Array<{ id: string; limit: number }>
      functions: Array<{ name: string }>
    }
    expect(schema.taxContributionLimits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'hsa-2026-self', limit: 4500 }),
      ]),
    )
    expect(schema.functions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'ContributionRoom' }),
      ]),
    )
  })

  it('stores generic extension values by entity with isolated namespaces', async () => {
    const registryResponse = await app.request('/api/extensions/registry')
    const registryBody = (await registryResponse.json()) as {
      registry: {
        version: number
        extensions: unknown[]
      }
    }
    const registryUpdateResponse = await app.request(
      '/api/extensions/registry',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          version: registryBody.registry.version,
          extensions: [
            ...registryBody.registry.extensions,
            {
              namespace: 'priority',
              label: 'Priority',
              entity: 'account',
              fields: [
                {
                  name: 'level',
                  label: 'Level',
                  type: 'enum',
                  enumValues: ['low', 'high'],
                },
                { name: 'reviewedAt', label: 'Reviewed At', type: 'date' },
              ],
            },
            {
              namespace: 'priority',
              label: 'Priority',
              entity: 'debt',
              fields: [
                {
                  name: 'level',
                  label: 'Level',
                  type: 'enum',
                  enumValues: ['low', 'high'],
                },
                { name: 'percent', label: 'Percent', type: 'percent' },
              ],
            },
          ],
        }),
      },
    )
    expect(registryUpdateResponse.status).toBe(200)

    const invalidResponse = await app.request('/api/extensions/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: [
          {
            entity: 'account',
            entityId: 'account-1',
            namespace: 'subscription',
            source: 'user',
            values: { active: true, key: 'wrong-entity' },
          },
        ],
      }),
    })
    expect(invalidResponse.status).toBe(400)
    expect(await invalidResponse.json()).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'invalid_extension_values',
          issues: expect.arrayContaining([
            expect.stringContaining('is not registered for that entity'),
          ]),
        }),
      }),
    )

    const writeResponse = await app.request('/api/extensions/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: [
          {
            entity: 'account',
            entityId: 'shared-id',
            namespace: 'priority',
            source: 'user',
            values: { level: 'high', reviewedAt: '2026-06-03' },
          },
          {
            entity: 'debt',
            entityId: 'shared-id',
            namespace: 'priority',
            source: 'agent',
            values: { level: 'low', percent: 0.25 },
          },
          {
            entity: 'transaction',
            entityId: 'tx-generic',
            namespace: 'subscription',
            source: 'user',
            values: { active: true, key: 'generic-subscription' },
          },
        ],
      }),
    })
    expect(writeResponse.status).toBe(200)
    const writeBody = (await writeResponse.json()) as {
      counts: Record<string, Record<string, number>>
    }
    expect(writeBody.counts).toEqual(
      expect.objectContaining({
        account: { priority: 1 },
        debt: { priority: 1 },
        transaction: { subscription: 1 },
      }),
    )

    await expect(
      fs.access(path.join(dataDir, 'extensions', 'accounts', 'priority.json')),
    ).resolves.toBeUndefined()
    await expect(
      fs.access(path.join(dataDir, 'extensions', 'debts', 'priority.json')),
    ).resolves.toBeUndefined()
    await expect(
      fs.access(
        path.join(dataDir, 'extensions', 'transactions', 'subscription.json'),
      ),
    ).resolves.toBeUndefined()

    const accountResponse = await app.request(
      '/api/extensions/values?entity=account&entityId=shared-id&namespace=priority',
    )
    expect(accountResponse.status).toBe(200)
    const accountBody = (await accountResponse.json()) as {
      total: number
      extensions: Array<{
        entity: string
        entityId: string
        values: { level: string }
      }>
      counts: Record<string, Record<string, number>>
    }
    expect(accountBody).toEqual(
      expect.objectContaining({
        total: 1,
        counts: { account: { priority: 1 } },
      }),
    )
    expect(accountBody.extensions[0]).toEqual(
      expect.objectContaining({
        entity: 'account',
        entityId: 'shared-id',
        values: expect.objectContaining({ level: 'high' }),
      }),
    )

    const transactionResponse = await app.request(
      '/api/extensions/values?entity=transaction&entityId=tx-generic',
    )
    expect(transactionResponse.status).toBe(200)
    const transactionBody = (await transactionResponse.json()) as {
      total: number
      extensions: Array<{ entity: string; entityId: string; namespace: string }>
    }
    expect(transactionBody).toEqual(
      expect.objectContaining({
        total: 1,
        extensions: [
          expect.objectContaining({
            entity: 'transaction',
            entityId: 'tx-generic',
            namespace: 'subscription',
          }),
        ],
      }),
    )
  })

  it('derives recurring extension facts from repeated transactions', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'rent-apr',
            source: 'manual',
            name: 'Apartment Rent',
            merchantName: 'Property Manager',
            amount: 1800,
            direction: 'expense',
            category: ['Housing', 'Rent'],
            date: '2026-04-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'rent-may',
            source: 'manual',
            name: 'Apartment Rent',
            merchantName: 'Property Manager',
            amount: 1800,
            direction: 'expense',
            category: ['Housing', 'Rent'],
            date: '2026-05-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'rent-jun',
            source: 'manual',
            name: 'Apartment Rent',
            merchantName: 'Property Manager',
            amount: 1800,
            direction: 'expense',
            category: ['Housing', 'Rent'],
            date: '2026-06-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'netflix-apr',
            source: 'manual',
            name: 'Netflix',
            merchantName: 'Netflix',
            amount: 22,
            direction: 'expense',
            category: ['Entertainment', 'Subscription'],
            date: '2026-04-15',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'netflix-may',
            source: 'manual',
            name: 'Netflix',
            merchantName: 'Netflix',
            amount: 22,
            direction: 'expense',
            category: ['Entertainment', 'Subscription'],
            date: '2026-05-15',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'netflix-jun',
            source: 'manual',
            name: 'Netflix',
            merchantName: 'Netflix',
            amount: 22,
            direction: 'expense',
            category: ['Entertainment', 'Subscription'],
            date: '2026-06-15',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'coffee-jun',
            source: 'manual',
            name: 'Coffee',
            amount: 6,
            direction: 'expense',
            category: ['Dining'],
            date: '2026-06-16',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const subscriptionPath = path.join(
      dataDir,
      'extensions',
      'transactions',
      'subscription.json',
    )
    const obligationPath = path.join(
      dataDir,
      'extensions',
      'transactions',
      'recurringObligation.json',
    )
    await expect(fs.access(subscriptionPath)).resolves.toBeUndefined()
    await expect(fs.access(obligationPath)).resolves.toBeUndefined()

    const subscriptions = JSON.parse(
      await fs.readFile(subscriptionPath, 'utf8'),
    ) as Array<{
      entityId: string
      source: string
      confidence?: number
      values: {
        key: string
        cadence: string
        nextDueDate: string
        monthlyAmount: number
        status: string
        confidence: number
        observedCount: number
        firstDate: string
        amountVariancePercent: number
      }
    }>
    expect(subscriptions).toHaveLength(3)
    expect(subscriptions[0]).toEqual(
      expect.objectContaining({
        source: 'rule',
        values: expect.objectContaining({
          key: 'netflix',
          cadence: 'monthly',
          monthlyAmount: 22,
          nextDueDate: '2026-07-15',
          status: 'active',
          confidence: expect.any(Number),
          observedCount: 3,
          firstDate: '2026-04-15',
          amountVariancePercent: 0,
        }),
      }),
    )

    const transactionsResponse = await app.request(
      '/api/transactions?q=netflix',
    )
    const transactions = (await transactionsResponse.json()) as {
      total: number
      transactions: Array<{
        id: string
        recurring: boolean
        extensions?: Record<
          string,
          Record<string, string | number | boolean | null>
        >
      }>
    }
    expect(transactions.total).toBe(3)
    expect(transactions.transactions[0]).toEqual(
      expect.objectContaining({
        recurring: true,
        extensions: expect.objectContaining({
          subscription: expect.objectContaining({
            key: 'netflix',
            nextDueDate: '2026-07-15',
            confidence: expect.any(Number),
            observedCount: 3,
          }),
        }),
      }),
    )

    const subscriptionsPreviewResponse = await app.request(
      '/api/formulas/preview',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: 'Subscriptions.DueSoon(45d).Unique(subscriptionKey).Count()',
        }),
      },
    )
    expect(subscriptionsPreviewResponse.status).toBe(200)
    expect(await subscriptionsPreviewResponse.json()).toEqual(
      expect.objectContaining({
        result: expect.objectContaining({ value: 1 }),
      }),
    )

    const obligationsPreviewResponse = await app.request(
      '/api/formulas/preview',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: 'RecurringObligations.DueSoon(45d).Unique(key).Sum()',
        }),
      },
    )
    expect(obligationsPreviewResponse.status).toBe(200)
    expect(await obligationsPreviewResponse.json()).toEqual(
      expect.objectContaining({
        result: expect.objectContaining({ value: 1800 }),
      }),
    )
  })

  it('marks stale recurring series separately and keeps active formulas current', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'old-service-jan',
            source: 'manual',
            name: 'Old Service',
            merchantName: 'Old Service',
            amount: 30,
            direction: 'expense',
            category: ['Software'],
            date: '2026-01-15',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'old-service-feb',
            source: 'manual',
            name: 'Old Service',
            merchantName: 'Old Service',
            amount: 30,
            direction: 'expense',
            category: ['Software'],
            date: '2026-02-15',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'current-service-may',
            source: 'manual',
            name: 'Current Service',
            merchantName: 'Current Service',
            amount: 40,
            direction: 'expense',
            category: ['Software'],
            date: '2026-05-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'current-service-jun',
            source: 'manual',
            name: 'Current Service',
            merchantName: 'Current Service',
            amount: 40,
            direction: 'expense',
            category: ['Software'],
            date: '2026-06-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'late-service-mar',
            source: 'manual',
            name: 'Late Service',
            merchantName: 'Late Service',
            amount: 25,
            direction: 'expense',
            category: ['Software'],
            date: '2026-03-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'late-service-apr',
            source: 'manual',
            name: 'Late Service',
            merchantName: 'Late Service',
            amount: 25,
            direction: 'expense',
            category: ['Software'],
            date: '2026-04-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'current-anchor',
            source: 'manual',
            name: 'Current Anchor',
            amount: 1,
            direction: 'income',
            category: ['Income'],
            date: '2026-06-15',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const activeResponse = await app.request(
      '/api/recurring/series?namespace=subscription',
    )
    expect(activeResponse.status).toBe(200)
    const active = (await activeResponse.json()) as {
      total: number
      counts: { active: number; stale: number; monthlyAmount: number }
      series: Array<{ key: string; status: string; active: boolean }>
    }
    expect(active.total).toBe(1)
    expect(active.counts).toEqual(
      expect.objectContaining({ active: 1, stale: 0, monthlyAmount: 40 }),
    )
    expect(active.series).toEqual([
      expect.objectContaining({
        key: 'current-service',
        status: 'active',
        active: true,
      }),
    ])

    const staleResponse = await app.request(
      '/api/recurring/series?namespace=subscription&status=stale',
    )
    expect(staleResponse.status).toBe(200)
    const stale = (await staleResponse.json()) as {
      total: number
      counts: { active: number; stale: number; monthlyAmount: number }
      series: Array<{ key: string; status: string; active: boolean }>
    }
    expect(stale.total).toBe(2)
    expect(stale.counts).toEqual(
      expect.objectContaining({ active: 0, stale: 2, monthlyAmount: 0 }),
    )
    expect(stale.series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'old-service',
          status: 'stale',
          active: false,
        }),
        expect.objectContaining({
          key: 'late-service',
          status: 'stale',
          active: false,
        }),
      ]),
    )

    const formulaResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'Subscriptions.Unique(subscriptionKey).Count()',
      }),
    })
    expect(formulaResponse.status).toBe(200)
    expect(await formulaResponse.json()).toEqual(
      expect.objectContaining({
        result: expect.objectContaining({ value: 1 }),
      }),
    )
  })

  it('lets merchant-level review states dismiss inferred subscriptions', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'stream-apr',
            source: 'manual',
            name: 'StreamCo Basic',
            merchantName: 'StreamCo',
            amount: 12,
            direction: 'expense',
            category: ['Entertainment', 'Subscription'],
            date: '2026-04-05',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'stream-may',
            source: 'manual',
            name: 'StreamCo Basic',
            merchantName: 'StreamCo',
            amount: 12,
            direction: 'expense',
            category: ['Entertainment', 'Subscription'],
            date: '2026-05-05',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'stream-jun',
            source: 'manual',
            name: 'StreamCo Basic',
            merchantName: 'StreamCo',
            amount: 12,
            direction: 'expense',
            category: ['Entertainment', 'Subscription'],
            date: '2026-06-05',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const beforeDismissResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'Subscriptions.Unique(subscriptionKey).Count()',
      }),
    })
    expect(beforeDismissResponse.status).toBe(200)
    const beforeDismiss = (await beforeDismissResponse.json()) as {
      result: { value: number }
    }
    expect(beforeDismiss.result.value).toBe(1)

    const dismissResponse = await app.request('/api/labels/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selector: { merchantIds: ['streamco'], direction: 'expense' },
        namespace: 'subscription',
        source: 'user',
        confidence: 1,
        values: {
          active: false,
          key: 'streamco',
          name: 'StreamCo',
          cadence: 'monthly',
          monthlyAmount: 12,
          status: 'dismissed',
        },
      }),
    })
    expect(dismissResponse.status).toBe(200)
    const dismiss = (await dismissResponse.json()) as {
      ok: boolean
      matched: { total: number; selected: number }
      counts: Record<string, Record<string, number>>
    }
    expect(dismiss.ok).toBe(true)
    expect(dismiss.matched).toEqual(
      expect.objectContaining({ total: 3, selected: 3 }),
    )
    expect(dismiss.counts.transaction.subscription).toBe(3)

    const transactionsResponse = await app.request(
      '/api/transactions?q=streamco',
    )
    expect(transactionsResponse.status).toBe(200)
    const transactions = (await transactionsResponse.json()) as {
      transactions: Array<{
        id: string
        recurring: boolean
        extensions?: Record<
          string,
          Record<string, string | number | boolean | null>
        >
      }>
    }
    expect(transactions.transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'stream-jun',
          recurring: false,
          extensions: expect.objectContaining({
            subscription: expect.objectContaining({
              active: false,
              status: 'dismissed',
            }),
          }),
        }),
      ]),
    )

    const afterDismissResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'Subscriptions.Unique(subscriptionKey).Count()',
      }),
    })
    expect(afterDismissResponse.status).toBe(200)
    const afterDismiss = (await afterDismissResponse.json()) as {
      result: { value: number }
    }
    expect(afterDismiss.result.value).toBe(0)

    const statusResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'Expenses.Where(recurringStatus = "dismissed").Sum()',
      }),
    })
    expect(statusResponse.status).toBe(200)
    const status = (await statusResponse.json()) as {
      result: { value: number }
    }
    expect(status.result.value).toBe(36)
  })

  it('uses merchantGroup transaction extensions for canonical merchant rollups', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'market-store',
            source: 'manual',
            name: 'Town Market Store 123',
            merchantName: 'Town Market Store 123',
            amount: 31,
            direction: 'expense',
            category: ['Groceries'],
            date: '2026-06-01',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'market-online',
            source: 'manual',
            name: 'Town Market Online',
            merchantName: 'Town Market Online',
            amount: 44,
            direction: 'expense',
            category: ['Groceries'],
            date: '2026-06-03',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'hardware-store',
            source: 'manual',
            name: 'Hardware Store',
            merchantName: 'Hardware Store',
            amount: 90,
            direction: 'expense',
            category: ['Repairs'],
            date: '2026-06-04',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const groupResponse = await app.request('/api/labels/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selector: { transactionIds: ['market-store', 'market-online'] },
        namespace: 'merchantGroup',
        source: 'user',
        confidence: 1,
        values: {
          merchantId: 'town-market',
          name: 'Town Market',
          confidence: 1,
          status: 'active',
        },
      }),
    })
    expect(groupResponse.status).toBe(200)
    const group = (await groupResponse.json()) as {
      ok: boolean
      matched: { total: number; selected: number }
    }
    expect(group.ok).toBe(true)
    expect(group.matched).toEqual(
      expect.objectContaining({ total: 2, selected: 2 }),
    )

    const merchantsResponse = await app.request('/api/merchants')
    expect(merchantsResponse.status).toBe(200)
    const merchants = (await merchantsResponse.json()) as {
      merchants: Array<{
        id: string
        name: string
        expenses: number
        transactionCount: number
      }>
    }
    expect(merchants.merchants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'town-market',
          name: 'Town Market',
          expenses: 75,
          transactionCount: 2,
        }),
        expect.objectContaining({
          id: 'hardware-store',
          expenses: 90,
          transactionCount: 1,
        }),
      ]),
    )
    expect(
      merchants.merchants.some(
        (merchant) => merchant.id === 'town-market-store-123',
      ),
    ).toBe(false)
    expect(
      merchants.merchants.some(
        (merchant) => merchant.id === 'town-market-online',
      ),
    ).toBe(false)

    const groupedPreviewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'Expenses.GroupBy(merchantId)' }),
    })
    expect(groupedPreviewResponse.status).toBe(200)
    const groupedPreview = (await groupedPreviewResponse.json()) as {
      result: {
        value: {
          type: string
          rows: Array<{
            key: string
            label: string
            value: number
            count: number
          }>
        }
      }
    }
    expect(groupedPreview.result.value).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({
            key: 'town-market',
            label: 'Town Market',
            value: 75,
            count: 2,
          }),
        ]),
      }),
    )
  })

  it('re-derives recurring subscriptions after merchantGroup canonicalization', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'moviebox-web-apr',
            source: 'manual',
            name: 'MovieBox Web',
            merchantName: 'MovieBox Web',
            amount: 19,
            direction: 'expense',
            category: ['Entertainment'],
            date: '2026-04-08',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'moviebox-app-may',
            source: 'manual',
            name: 'MovieBox App',
            merchantName: 'MovieBox App',
            amount: 19,
            direction: 'expense',
            category: ['Entertainment'],
            date: '2026-05-08',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'moviebox-premium-jun',
            source: 'manual',
            name: 'MovieBox Premium',
            merchantName: 'MovieBox Premium',
            amount: 19,
            direction: 'expense',
            category: ['Entertainment'],
            date: '2026-06-08',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const beforeGroupResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'Subscriptions.Unique(subscriptionKey).Count()',
      }),
    })
    expect(beforeGroupResponse.status).toBe(200)
    const beforeGroup = (await beforeGroupResponse.json()) as {
      result: { value: number }
    }
    expect(beforeGroup.result.value).toBe(0)

    const groupResponse = await app.request('/api/labels/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selector: {
          transactionIds: [
            'moviebox-web-apr',
            'moviebox-app-may',
            'moviebox-premium-jun',
          ],
        },
        namespace: 'merchantGroup',
        source: 'user',
        confidence: 1,
        values: {
          merchantId: 'moviebox',
          name: 'MovieBox',
          confidence: 1,
          status: 'active',
        },
      }),
    })
    expect(groupResponse.status).toBe(200)
    const group = (await groupResponse.json()) as {
      ok: boolean
      matched: { total: number; selected: number }
      counts: Record<string, Record<string, number>>
    }
    expect(group.ok).toBe(true)
    expect(group.matched).toEqual(
      expect.objectContaining({ total: 3, selected: 3 }),
    )
    expect(group.counts.transaction.merchantGroup).toBe(3)
    expect(group.counts.transaction.subscription).toBe(3)

    const subscriptionsResponse = await app.request(
      '/api/extensions/values?entity=transaction&namespace=subscription',
    )
    expect(subscriptionsResponse.status).toBe(200)
    const subscriptions = (await subscriptionsResponse.json()) as {
      total: number
      extensions: Array<{
        entityId: string
        values: {
          key: string
          name: string
          nextDueDate: string
          observedCount: number
        }
      }>
    }
    expect(subscriptions.total).toBe(3)
    expect(subscriptions.extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'moviebox-premium-jun',
          values: expect.objectContaining({
            key: 'moviebox',
            name: 'MovieBox',
            nextDueDate: '2026-07-08',
            observedCount: 3,
          }),
        }),
      ]),
    )

    const recurringSeriesResponse = await app.request(
      '/api/recurring/series?namespace=subscription',
    )
    expect(recurringSeriesResponse.status).toBe(200)
    const recurringSeries = (await recurringSeriesResponse.json()) as {
      total: number
      counts: {
        active: number
        byNamespace: { subscription: number }
        monthlyAmount: number
      }
      series: Array<{
        id: string
        namespace: string
        key: string
        name: string
        status: string
        active: boolean
        cadence: string
        monthlyAmount: number
        nextDueDate: string
        confidence: number
        transactionCount: number
        transactionIds: string[]
        labelSelector: { transactionIds: string[] }
        reviewActions: {
          activate: {
            recommendedRpc: string
            previewRequest: {
              dryRun: boolean
              namespace: string
              values: Record<string, unknown>
            }
            applyRequest: {
              dryRun: boolean
              namespace: string
              values: Record<string, unknown>
            }
          }
          skip: {
            previewRequest: { values: Record<string, unknown> }
            applyRequest: { values: Record<string, unknown> }
          }
          dismiss: {
            previewRequest: { values: Record<string, unknown> }
            applyRequest: { values: Record<string, unknown> }
          }
        }
      }>
    }
    expect(recurringSeries.total).toBe(1)
    expect(recurringSeries.counts).toEqual(
      expect.objectContaining({
        active: 1,
        byNamespace: expect.objectContaining({ subscription: 1 }),
        monthlyAmount: 19,
      }),
    )
    expect(recurringSeries.series).toEqual([
      expect.objectContaining({
        id: 'subscription:moviebox',
        namespace: 'subscription',
        key: 'moviebox',
        name: 'MovieBox',
        status: 'active',
        active: true,
        cadence: 'monthly',
        monthlyAmount: 19,
        nextDueDate: '2026-07-08',
        transactionCount: 3,
        transactionIds: [
          'moviebox-web-apr',
          'moviebox-app-may',
          'moviebox-premium-jun',
        ],
        labelSelector: {
          transactionIds: [
            'moviebox-web-apr',
            'moviebox-app-may',
            'moviebox-premium-jun',
          ],
        },
        reviewActions: expect.objectContaining({
          activate: expect.objectContaining({
            recommendedRpc: 'money.transactions.labelPreview',
            previewRequest: expect.objectContaining({
              dryRun: true,
              namespace: 'subscription',
              values: expect.objectContaining({
                key: 'moviebox',
                name: 'MovieBox',
                active: true,
                status: 'active',
              }),
            }),
            applyRequest: expect.objectContaining({
              dryRun: false,
              namespace: 'subscription',
            }),
          }),
          skip: expect.objectContaining({
            previewRequest: expect.objectContaining({
              values: expect.objectContaining({
                active: false,
                status: 'skipped',
              }),
            }),
          }),
          dismiss: expect.objectContaining({
            previewRequest: expect.objectContaining({
              values: expect.objectContaining({
                active: false,
                status: 'dismissed',
              }),
            }),
          }),
        }),
      }),
    ])
    expect(recurringSeries.series[0]?.confidence).toBeGreaterThan(0.8)

    const compactRecurringSeriesResponse = await app.request(
      '/api/recurring/series?namespace=subscription&includeTransactionIds=false&includeReviewActions=false',
    )
    expect(compactRecurringSeriesResponse.status).toBe(200)
    const compactRecurringSeries =
      (await compactRecurringSeriesResponse.json()) as {
        filters: {
          includeTransactionIds: boolean
          includeReviewActions: boolean
        }
        series: Array<{
          key: string
          transactionIds?: string[]
          labelSelector?: { transactionIds: string[] }
          labelSelectorSummary?: { kind: string; transactionCount: number }
          reviewActions?: unknown
          reviewActionSummary?: {
            actions: string[]
            requiresTransactionIds: boolean
          }
        }>
      }
    expect(compactRecurringSeries.filters).toEqual(
      expect.objectContaining({
        includeTransactionIds: false,
        includeReviewActions: false,
      }),
    )
    expect(compactRecurringSeries.series).toEqual([
      expect.objectContaining({
        key: 'moviebox',
        labelSelectorSummary: {
          kind: 'transactionIds',
          transactionCount: 3,
        },
        reviewActionSummary: {
          actions: ['activate', 'skip', 'dismiss'],
          requiresTransactionIds: true,
        },
      }),
    ])
    expect(compactRecurringSeries.series[0]).not.toHaveProperty(
      'transactionIds',
    )
    expect(compactRecurringSeries.series[0]).not.toHaveProperty('labelSelector')
    expect(compactRecurringSeries.series[0]).not.toHaveProperty('reviewActions')

    const recurringSeriesRpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.recurring.series',
        params: { namespace: 'subscription', minConfidence: 0.8 },
      }),
    })
    expect(recurringSeriesRpcResponse.status).toBe(200)
    const recurringSeriesRpc = (await recurringSeriesRpcResponse.json()) as {
      ok: boolean
      result: {
        total: number
        series: Array<{
          key: string
          reviewActions: {
            dismiss: { applyRequest: { values: { status: string } } }
          }
        }>
      }
    }
    expect(recurringSeriesRpc.ok).toBe(true)
    expect(recurringSeriesRpc.result).toEqual(
      expect.objectContaining({
        total: 1,
        series: [
          expect.objectContaining({
            key: 'moviebox',
            reviewActions: expect.objectContaining({
              dismiss: expect.objectContaining({
                applyRequest: expect.objectContaining({
                  values: expect.objectContaining({ status: 'dismissed' }),
                }),
              }),
            }),
          }),
        ],
      }),
    )

    const afterGroupResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'Subscriptions.Unique(subscriptionKey).Count()',
      }),
    })
    expect(afterGroupResponse.status).toBe(200)
    const afterGroup = (await afterGroupResponse.json()) as {
      result: { value: number }
    }
    expect(afterGroup.result.value).toBe(1)

    const dismissSeriesResponse = await app.request(
      '/api/labels/transactions',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          selector: {
            transactionIds:
              recurringSeries.series[0]?.labelSelector.transactionIds,
          },
          namespace: 'subscription',
          source: 'user',
          confidence: 1,
          values: {
            active: false,
            key: 'moviebox',
            name: 'MovieBox',
            cadence: 'monthly',
            monthlyAmount: 19,
            status: 'dismissed',
          },
        }),
      },
    )
    expect(dismissSeriesResponse.status).toBe(200)

    const dismissedSeriesResponse = await app.request(
      '/api/recurring/series?namespace=subscription&status=dismissed',
    )
    expect(dismissedSeriesResponse.status).toBe(200)
    const dismissedSeries = (await dismissedSeriesResponse.json()) as {
      total: number
      series: Array<{ key: string; active: boolean; status: string }>
    }
    expect(dismissedSeries).toEqual(
      expect.objectContaining({
        total: 1,
        series: [
          expect.objectContaining({
            key: 'moviebox',
            active: false,
            status: 'dismissed',
          }),
        ],
      }),
    )

    const afterDismissResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'Subscriptions.Unique(subscriptionKey).Count()',
      }),
    })
    expect(afterDismissResponse.status).toBe(200)
    const afterDismiss = (await afterDismissResponse.json()) as {
      result: { value: number }
    }
    expect(afterDismiss.result.value).toBe(0)
  })

  it('derives merchant and person catalogs for formulas and RPC', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'market-1',
            source: 'manual',
            name: 'Corner Market Purchase',
            merchantName: 'Corner Market',
            amount: 120,
            direction: 'expense',
            category: ['Groceries'],
            date: '2026-06-03',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'dinner-1',
            source: 'manual',
            name: 'Dinner',
            merchantName: 'Dinner Spot',
            amount: 80,
            direction: 'expense',
            category: ['Dining'],
            date: '2026-06-04',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const registryResponse = await app.request('/api/extensions/registry')
    const registryBody = (await registryResponse.json()) as {
      registry: { version: number; extensions: unknown[] }
    }
    const registryUpdateResponse = await app.request(
      '/api/extensions/registry',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          version: registryBody.registry.version,
          extensions: [
            ...registryBody.registry.extensions,
            {
              namespace: 'merchantLens',
              label: 'Merchant Lens',
              entity: 'merchant',
              fields: [
                {
                  name: 'tier',
                  label: 'Tier',
                  type: 'enum',
                  enumValues: ['core', 'review'],
                },
                { name: 'percent', label: 'Allocation', type: 'percent' },
              ],
              derivedCollections: [
                {
                  id: 'MerchantLens',
                  name: 'Merchant Lens',
                  entity: 'merchant',
                  baseCollection: 'Merchants',
                  predicate: 'merchantLens_percent > 0',
                },
              ],
            },
            {
              namespace: 'relationship',
              label: 'Relationship',
              entity: 'person',
              fields: [
                {
                  name: 'circle',
                  label: 'Circle',
                  type: 'enum',
                  enumValues: ['home', 'work'],
                },
                { name: 'amount', label: 'Amount', type: 'money' },
                { name: 'name', label: 'Name', type: 'string' },
              ],
              derivedCollections: [
                {
                  id: 'RelationshipBalances',
                  name: 'Relationship Balances',
                  entity: 'person',
                  baseCollection: 'Persons',
                  predicate: 'relationship_amount > 0',
                },
              ],
            },
          ],
        }),
      },
    )
    expect(registryUpdateResponse.status).toBe(200)

    const extensionResponse = await app.request('/api/extensions/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: [
          {
            entity: 'transaction',
            entityId: 'dinner-1',
            namespace: 'sharedExpense',
            source: 'user',
            values: { personId: 'alex', status: 'owed', amount: 40 },
          },
          {
            entity: 'merchant',
            entityId: 'corner-market',
            namespace: 'merchantLens',
            source: 'user',
            values: { tier: 'core', percent: 0.25 },
          },
          {
            entity: 'person',
            entityId: 'alex',
            namespace: 'relationship',
            source: 'user',
            values: { circle: 'home', amount: 75, name: 'Alex' },
          },
        ],
      }),
    })
    expect(extensionResponse.status).toBe(200)

    const merchantsResponse = await app.request('/api/merchants')
    expect(merchantsResponse.status).toBe(200)
    const merchantsBody = (await merchantsResponse.json()) as {
      merchants: Array<{
        id: string
        expenses: number
        transactionCount: number
      }>
    }
    expect(merchantsBody.merchants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'corner-market',
          expenses: 120,
          transactionCount: 1,
        }),
      ]),
    )

    const personsResponse = await app.request('/api/persons')
    expect(personsResponse.status).toBe(200)
    const personsBody = (await personsResponse.json()) as {
      persons: Array<{
        id: string
        amountOwedToMe: number
        transactionCount: number
      }>
    }
    expect(personsBody.persons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'alex',
          amountOwedToMe: 40,
          transactionCount: 1,
        }),
      ]),
    )

    const merchantPreviewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'MerchantLens.Where(tier = "core").Sum()',
      }),
    })
    expect(merchantPreviewResponse.status).toBe(200)
    expect(await merchantPreviewResponse.json()).toEqual(
      expect.objectContaining({
        result: expect.objectContaining({ value: 30 }),
      }),
    )

    const personPreviewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'RelationshipBalances.Where(circle = "home").Sum()',
      }),
    })
    expect(personPreviewResponse.status).toBe(200)
    expect(await personPreviewResponse.json()).toEqual(
      expect.objectContaining({
        result: expect.objectContaining({ value: 75 }),
      }),
    )

    const rpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.persons.list' }),
    })
    expect(rpcResponse.status).toBe(200)
    expect(await rpcResponse.json()).toEqual(
      expect.objectContaining({
        ok: true,
        result: expect.objectContaining({
          persons: expect.arrayContaining([
            expect.objectContaining({ id: 'alex' }),
          ]),
        }),
      }),
    )
  })

  it('stores transaction facts in monthly shards and pages large result sets', async () => {
    const transactions = Array.from({ length: 120 }, (_, index) => {
      const month = String((index % 12) + 1).padStart(2, '0')
      const day = String((index % 28) + 1).padStart(2, '0')
      return {
        id: `bulk-tx-${String(index).padStart(3, '0')}`,
        source: 'manual',
        name: `Bulk Transaction ${index}`,
        amount: index + 1,
        direction: 'expense',
        category: ['Bulk'],
        date: `2026-${month}-${day}`,
        isoCurrencyCode: 'USD',
        recurring: false,
      }
    })

    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accounts: [], transactions }),
    })
    expect(importResponse.status).toBe(200)
    expect(await importResponse.json()).toEqual(
      expect.objectContaining({
        transactions: 120,
      }),
    )

    const shardFiles = (
      await fs.readdir(path.join(dataDir, 'transactions'))
    ).sort()
    expect(shardFiles).toEqual([
      '2026-01.json',
      '2026-02.json',
      '2026-03.json',
      '2026-04.json',
      '2026-05.json',
      '2026-06.json',
      '2026-07.json',
      '2026-08.json',
      '2026-09.json',
      '2026-10.json',
      '2026-11.json',
      '2026-12.json',
    ])

    await fs.writeFile(
      path.join(dataDir, 'raw-money-data.json'),
      JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'raw-fallback-only',
            source: 'manual',
            name: 'Raw Fallback Only',
            amount: 999,
            direction: 'expense',
            category: ['Bulk'],
            date: '2026-12-31',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    )

    const pagedResponse = await app.request(
      '/api/transactions?category=Bulk&limit=10&offset=50',
    )
    expect(pagedResponse.status).toBe(200)
    const paged = (await pagedResponse.json()) as {
      transactions: Array<{ id: string }>
      total: number
      limit: number
      offset: number
    }
    expect(paged).toEqual(
      expect.objectContaining({
        total: 120,
        limit: 10,
        offset: 50,
      }),
    )
    expect(paged.transactions).toHaveLength(10)
    expect(
      paged.transactions.map((transaction) => transaction.id),
    ).not.toContain('raw-fallback-only')
  })

  it('limits date-filtered transaction search to candidate month shards', async () => {
    await fs.mkdir(path.join(dataDir, 'transactions'), { recursive: true })
    await fs.writeFile(
      path.join(dataDir, 'transactions', '2026-01.json'),
      JSON.stringify([
        {
          id: 'jan-food',
          source: 'manual',
          name: 'January Food',
          amount: 25,
          direction: 'expense',
          category: ['Food'],
          date: '2026-01-15',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'transactions', '2026-03.json'),
      '{ not valid json',
    )

    const response = await app.request(
      '/api/transactions?startDate=2026-01-01&endDate=2026-01-31&category=Food',
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      transactions: Array<{ id: string }>
      total: number
    }
    expect(body.total).toBe(1)
    expect(body.transactions.map((transaction) => transaction.id)).toEqual([
      'jan-food',
    ])
  })

  it('patches one transaction shard without persisting extension-derived fields', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'jan-transaction',
            source: 'manual',
            name: 'January Transaction',
            amount: 10,
            direction: 'expense',
            category: ['Test'],
            date: '2026-01-15',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'feb-subscription',
            source: 'manual',
            name: 'February Subscription',
            amount: 20,
            direction: 'expense',
            category: ['Software'],
            date: '2026-02-15',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
          {
            id: 'mar-transaction',
            source: 'manual',
            name: 'March Transaction',
            amount: 30,
            direction: 'expense',
            category: ['Test'],
            date: '2026-03-15',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const extensionResponse = await app.request('/api/extensions/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: [
          {
            entity: 'transaction',
            entityId: 'feb-subscription',
            namespace: 'subscription',
            source: 'user',
            values: {
              active: true,
              key: 'feb-subscription',
              cadence: 'monthly',
            },
          },
        ],
      }),
    })
    expect(extensionResponse.status).toBe(200)

    const janPath = path.join(dataDir, 'transactions', '2026-01.json')
    const febPath = path.join(dataDir, 'transactions', '2026-02.json')
    const marPath = path.join(dataDir, 'transactions', '2026-03.json')
    const extensionPath = path.join(
      dataDir,
      'extensions',
      'transactions',
      'subscription.json',
    )
    const before = {
      jan: await fs.readFile(janPath, 'utf8'),
      feb: await fs.readFile(febPath, 'utf8'),
      mar: await fs.readFile(marPath, 'utf8'),
      extension: await fs.readFile(extensionPath, 'utf8'),
    }

    const searchResponse = await app.request('/api/transactions?q=february')
    const search = (await searchResponse.json()) as {
      transactions: Array<{ id: string; recurring: boolean }>
    }
    expect(search.transactions[0]).toEqual(
      expect.objectContaining({
        id: 'feb-subscription',
        recurring: true,
      }),
    )

    const patchResponse = await app.request(
      '/api/transactions/feb-subscription',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: 'Keep for now' }),
      },
    )
    expect(patchResponse.status).toBe(200)
    const patched = (await patchResponse.json()) as {
      transaction: { recurring: boolean; notes?: string }
    }
    expect(patched.transaction).toEqual(
      expect.objectContaining({
        recurring: true,
        notes: 'Keep for now',
      }),
    )

    expect(await fs.readFile(janPath, 'utf8')).toBe(before.jan)
    expect(await fs.readFile(marPath, 'utf8')).toBe(before.mar)
    expect(await fs.readFile(extensionPath, 'utf8')).toBe(before.extension)
    expect(await fs.readFile(febPath, 'utf8')).not.toBe(before.feb)
    const febShard = JSON.parse(await fs.readFile(febPath, 'utf8')) as Array<{
      id: string
      recurring: boolean
      notes?: string
      extensions?: unknown
    }>
    expect(febShard).toEqual([
      expect.objectContaining({
        id: 'feb-subscription',
        recurring: false,
        notes: 'Keep for now',
      }),
    ])
    expect(febShard[0]?.extensions).toBeUndefined()
  })

  it('falls back to raw transactions with extension overlays when shards are absent', async () => {
    await fs.mkdir(path.join(dataDir, 'extensions', 'transactions'), {
      recursive: true,
    })
    await fs.writeFile(
      path.join(dataDir, 'raw-money-data.json'),
      JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'raw-subscription',
            source: 'manual',
            name: 'Raw Subscription',
            amount: 12,
            direction: 'expense',
            category: ['Software'],
            date: '2026-04-15',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    )
    await fs.writeFile(
      path.join(dataDir, 'extensions', 'transactions', 'subscription.json'),
      JSON.stringify([
        {
          entity: 'transaction',
          entityId: 'raw-subscription',
          namespace: 'subscription',
          values: { active: true, key: 'raw-subscription', cadence: 'monthly' },
          source: 'user',
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )

    const response = await app.request(
      '/api/transactions?startDate=2026-04-01&endDate=2026-04-30&q=raw',
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      transactions: Array<{ id: string; recurring: boolean }>
      total: number
    }
    expect(body.total).toBe(1)
    expect(body.transactions[0]).toEqual(
      expect.objectContaining({
        id: 'raw-subscription',
        recurring: true,
      }),
    )
  })

  it('rejects invalid transaction import dates instead of writing unreadable shards', async () => {
    const response = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'bad-date',
            source: 'manual',
            name: 'Bad Date',
            amount: 10,
            direction: 'expense',
            category: ['Test'],
            date: 'not-a-date',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(response.status).toBe(400)
    await expect(
      fs.access(path.join(dataDir, 'transactions')),
    ).rejects.toThrow()
  })

  it('exposes private Moldable RPC methods', async () => {
    await app.request('/api/dev/seed', { method: 'POST' })
    await fs.writeFile(
      path.join(dataDir, 'debts.json'),
      JSON.stringify([
        {
          id: 'rpc-debt',
          source: 'seed',
          name: 'RPC Debt',
          type: 'credit',
          balance: 100,
          apr: 18.5,
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'holdings.json'),
      JSON.stringify([
        {
          id: 'rpc-holding',
          source: 'seed',
          name: 'RPC Holding',
          tickerSymbol: 'RPC',
          quantity: 2,
          price: 50,
          marketValue: 100,
          asOf: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )

    const rpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.search',
        params: { q: 'rent' },
      }),
    })
    expect(rpcResponse.status).toBe(200)

    const rpcBody = (await rpcResponse.json()) as {
      ok: boolean
      result: {
        total: number
        transactions: Array<{ name: string }>
      }
    }
    expect(rpcBody.ok).toBe(true)
    expect(rpcBody.result.total).toBe(1)
    expect(rpcBody.result.transactions[0]?.name).toBe('Rent')

    const debtsResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.debts.list' }),
    })
    expect(debtsResponse.status).toBe(200)
    const debtsBody = (await debtsResponse.json()) as {
      ok: boolean
      result: { debts: Array<{ id: string; name: string }> }
    }
    expect(debtsBody.ok).toBe(true)
    expect(debtsBody.result.debts).toEqual([
      expect.objectContaining({ id: 'rpc-debt', name: 'RPC Debt' }),
    ])

    const holdingsResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.holdings.list' }),
    })
    expect(holdingsResponse.status).toBe(200)
    const holdingsBody = (await holdingsResponse.json()) as {
      ok: boolean
      result: { holdings: Array<{ id: string; tickerSymbol?: string }> }
    }
    expect(holdingsBody.ok).toBe(true)
    expect(holdingsBody.result.holdings).toEqual([
      expect.objectContaining({ id: 'rpc-holding', tickerSymbol: 'RPC' }),
    ])

    const targetsResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.allocationTargets.list' }),
    })
    expect(targetsResponse.status).toBe(200)
    const targetsBody = (await targetsResponse.json()) as {
      ok: boolean
      result: { targets: Array<{ id: string }> }
    }
    expect(targetsBody.ok).toBe(true)
    expect(targetsBody.result.targets).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'default' })]),
    )

    const forecastScenariosResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.forecastScenarios.list' }),
    })
    expect(forecastScenariosResponse.status).toBe(200)
    const forecastScenariosBody = (await forecastScenariosResponse.json()) as {
      ok: boolean
      result: { scenarios: Array<{ id: string }> }
    }
    expect(forecastScenariosBody.ok).toBe(true)
    expect(forecastScenariosBody.result.scenarios).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'default' })]),
    )

    const taxLimitsResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.taxContributionLimits.list' }),
    })
    expect(taxLimitsResponse.status).toBe(200)
    const taxLimitsBody = (await taxLimitsResponse.json()) as {
      ok: boolean
      result: { limits: Array<{ id: string }> }
    }
    expect(taxLimitsBody.ok).toBe(true)
    expect(taxLimitsBody.result.limits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: '401k-2026-standard' }),
      ]),
    )

    const extensionWriteResponse = await app.request('/api/extensions/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        extensions: [
          {
            entity: 'transaction',
            entityId: 'seed-rent',
            namespace: 'sharedExpense',
            source: 'user',
            values: {
              personId: 'roommate',
              status: 'owed',
              amount: 750,
            },
          },
          {
            entity: 'transaction',
            entityId: 'seed-netflix',
            namespace: 'joyReview',
            source: 'user',
            values: {
              rating: 'positive',
              decision: 'keep',
            },
          },
        ],
      }),
    })
    expect(extensionWriteResponse.status).toBe(200)

    const extensionsResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.extensions.values.list',
        params: { entity: 'transaction', limit: 1 },
      }),
    })
    expect(extensionsResponse.status).toBe(200)
    const extensionsBody = (await extensionsResponse.json()) as {
      ok: boolean
      result: {
        extensions: Array<{ entityId: string; namespace: string }>
        total: number
        limit: number
        offset: number
        hasMore: boolean
        nextCursor?: string
      }
    }
    expect(extensionsBody.ok).toBe(true)
    expect(extensionsBody.result).toEqual(
      expect.objectContaining({
        limit: 1,
        offset: 0,
        hasMore: true,
        nextCursor: 'offset:1',
      }),
    )
    expect(extensionsBody.result.extensions).toHaveLength(1)

    const extensionsCursorResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.extensions.values.list',
        params: {
          entity: 'transaction',
          limit: 1,
          cursor: extensionsBody.result.nextCursor,
        },
      }),
    })
    expect(extensionsCursorResponse.status).toBe(200)
    const extensionsCursorBody = (await extensionsCursorResponse.json()) as {
      ok: boolean
      result: {
        extensions: Array<{ entityId: string; namespace: string }>
        total: number
        offset: number
        hasMore: boolean
      }
    }
    expect(extensionsCursorBody.ok).toBe(true)
    expect(extensionsCursorBody.result).toEqual(
      expect.objectContaining({
        offset: 1,
      }),
    )
    expect(extensionsCursorBody.result.extensions).toHaveLength(1)

    const namespacedExtensionsResponse = await app.request(
      '/api/moldable/rpc',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          method: 'money.extensions.values.list',
          params: {
            entity: 'transaction',
            namespace: 'sharedExpense',
            limit: 10,
          },
        }),
      },
    )
    expect(namespacedExtensionsResponse.status).toBe(200)
    const namespacedExtensionsBody =
      (await namespacedExtensionsResponse.json()) as {
        ok: boolean
        result: {
          extensions: Array<{ entityId: string; namespace: string }>
          total: number
        }
      }
    expect(namespacedExtensionsBody.ok).toBe(true)
    expect(namespacedExtensionsBody.result).toEqual(
      expect.objectContaining({
        total: 1,
      }),
    )
    expect(namespacedExtensionsBody.result.extensions).toEqual([
      expect.objectContaining({
        entityId: 'seed-rent',
        namespace: 'sharedExpense',
      }),
    ])

    const labelPreviewResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.labelPreview',
        params: {
          selector: { merchantIds: ['amazon'], direction: 'expense' },
          namespace: 'joyReview',
          source: 'agent',
          confidence: 0.9,
          values: {
            rating: 'negative',
            decision: 'cancel',
          },
        },
      }),
    })
    expect(labelPreviewResponse.status).toBe(200)
    const labelPreviewBody = (await labelPreviewResponse.json()) as {
      ok: boolean
      result: {
        ok: boolean
        dryRun: boolean
        matched: { total: number; selected: number }
        summary: {
          namespace: string
          dryRun: boolean
          matchedTotal: number
          selectedTotal: number
          wouldWriteTotal: number
          wroteTotal: number
        }
        extensions: Array<{ entityId: string; namespace: string }>
      }
    }
    expect(labelPreviewBody.ok).toBe(true)
    expect(labelPreviewBody.result).toEqual(
      expect.objectContaining({
        ok: true,
        dryRun: true,
        matched: expect.objectContaining({ total: 1, selected: 1 }),
        summary: expect.objectContaining({
          namespace: 'joyReview',
          dryRun: true,
          matchedTotal: 1,
          selectedTotal: 1,
          wouldWriteTotal: 1,
          wroteTotal: 0,
        }),
        extensions: [
          expect.objectContaining({
            entityId: 'seed-amazon',
            namespace: 'joyReview',
          }),
        ],
      }),
    )

    const labelApplyResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.transactions.labelApply',
        params: {
          selector: { merchantIds: ['amazon'], direction: 'expense' },
          namespace: 'joyReview',
          source: 'agent',
          confidence: 0.9,
          values: {
            rating: 'negative',
            decision: 'cancel',
          },
        },
      }),
    })
    expect(labelApplyResponse.status).toBe(200)
    const labelApplyBody = (await labelApplyResponse.json()) as {
      ok: boolean
      result: {
        ok: boolean
        dryRun: boolean
        summary: {
          namespace: string
          dryRun: boolean
          matchedTotal: number
          selectedTotal: number
          wouldWriteTotal: number
          wroteTotal: number
        }
        counts: Record<string, Record<string, number>>
      }
    }
    expect(labelApplyBody.ok).toBe(true)
    expect(labelApplyBody.result.ok).toBe(true)
    expect(labelApplyBody.result.dryRun).toBe(false)
    expect(labelApplyBody.result.summary).toEqual(
      expect.objectContaining({
        namespace: 'joyReview',
        dryRun: false,
        matchedTotal: 1,
        selectedTotal: 1,
        wouldWriteTotal: 0,
        wroteTotal: 1,
      }),
    )
    expect(labelApplyBody.result.counts.transaction.joyReview).toBe(2)

    const joyPreviewResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.formulas.preview',
        params: {
          formula: 'JoyReview.Where(rating = "negative").Sum()',
          format: 'currency',
          outputType: 'money',
        },
      }),
    })
    expect(joyPreviewResponse.status).toBe(200)
    const joyPreviewBody = (await joyPreviewResponse.json()) as {
      ok: boolean
      result: { ok: boolean; result: { value: number; displayValue: string } }
    }
    expect(joyPreviewBody.ok).toBe(true)
    expect(joyPreviewBody.result.ok).toBe(true)
    expect(joyPreviewBody.result.result).toEqual(
      expect.objectContaining({ value: 15, displayValue: '$15' }),
    )

    const patchJoyResponse = await app.request(
      '/api/extensions/values/transaction/joyReview/seed-netflix',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          values: {
            rating: 'negative',
            decision: 'cancel',
          },
          source: 'agent',
          confidence: 0.85,
        }),
      },
    )
    expect(patchJoyResponse.status).toBe(200)
    const patchJoyBody = (await patchJoyResponse.json()) as {
      ok: boolean
      extension: {
        entityId: string
        namespace: string
        source: string
        confidence: number
        values: Record<string, string>
      }
      counts: Record<string, Record<string, number>>
    }
    expect(patchJoyBody.ok).toBe(true)
    expect(patchJoyBody.extension).toEqual(
      expect.objectContaining({
        entityId: 'seed-netflix',
        namespace: 'joyReview',
        source: 'agent',
        confidence: 0.85,
        values: expect.objectContaining({
          rating: 'negative',
          decision: 'cancel',
        }),
      }),
    )
    expect(patchJoyBody.counts.transaction.joyReview).toBe(2)

    const rpcPatchJoyResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.extensions.values.patch',
        params: {
          entity: 'transaction',
          namespace: 'joyReview',
          entityId: 'seed-netflix',
          values: { decision: 'reduce' },
        },
      }),
    })
    expect(rpcPatchJoyResponse.status).toBe(200)
    const rpcPatchJoyBody = (await rpcPatchJoyResponse.json()) as {
      ok: boolean
      result: { extension: { values: Record<string, string> } }
    }
    expect(rpcPatchJoyBody.ok).toBe(true)
    expect(rpcPatchJoyBody.result.extension.values).toEqual(
      expect.objectContaining({
        rating: 'negative',
        decision: 'reduce',
      }),
    )

    const patchedJoyPreviewResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.formulas.preview',
        params: {
          formula: 'JoyReview.Where(rating = "negative").Sum()',
          format: 'currency',
          outputType: 'money',
        },
      }),
    })
    expect(patchedJoyPreviewResponse.status).toBe(200)
    const patchedJoyPreview = (await patchedJoyPreviewResponse.json()) as {
      result: { result: { value: number; displayValue: string } }
    }
    expect(patchedJoyPreview.result.result).toEqual(
      expect.objectContaining({ value: 37, displayValue: '$37' }),
    )

    const deleteJoyResponse = await app.request(
      '/api/extensions/values/transaction/joyReview/seed-netflix',
      { method: 'DELETE' },
    )
    expect(deleteJoyResponse.status).toBe(200)
    const deleteJoyBody = (await deleteJoyResponse.json()) as {
      ok: boolean
      deleted: { entityId: string; namespace: string }
      counts: Record<string, Record<string, number>>
    }
    expect(deleteJoyBody.ok).toBe(true)
    expect(deleteJoyBody.deleted).toEqual(
      expect.objectContaining({
        entityId: 'seed-netflix',
        namespace: 'joyReview',
      }),
    )
    expect(deleteJoyBody.counts.transaction.joyReview).toBe(1)

    const rpcDeleteJoyResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.extensions.values.delete',
        params: {
          entity: 'transaction',
          namespace: 'joyReview',
          entityId: 'seed-amazon',
        },
      }),
    })
    expect(rpcDeleteJoyResponse.status).toBe(200)
    const rpcDeleteJoyBody = (await rpcDeleteJoyResponse.json()) as {
      ok: boolean
      result: {
        deleted: { entityId: string; namespace: string }
        counts: Record<string, Record<string, number>>
      }
    }
    expect(rpcDeleteJoyBody.ok).toBe(true)
    expect(rpcDeleteJoyBody.result.deleted).toEqual(
      expect.objectContaining({
        entityId: 'seed-amazon',
        namespace: 'joyReview',
      }),
    )
    expect(rpcDeleteJoyBody.result.counts.transaction?.joyReview ?? 0).toBe(0)

    const deletedJoyPreviewResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.formulas.preview',
        params: {
          formula: 'JoyReview.Where(rating = "negative").Sum()',
          format: 'currency',
          outputType: 'money',
        },
      }),
    })
    expect(deletedJoyPreviewResponse.status).toBe(200)
    const deletedJoyPreview = (await deletedJoyPreviewResponse.json()) as {
      result: { result: { value: number; displayValue: string } }
    }
    expect(deletedJoyPreview.result.result).toEqual(
      expect.objectContaining({ value: 0, displayValue: '$0' }),
    )

    const syncStatusResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.sync.status' }),
    })
    expect(syncStatusResponse.status).toBe(200)
    const syncStatusBody = (await syncStatusResponse.json()) as {
      ok: boolean
      result: { reason: string; due: boolean }
    }
    expect(syncStatusBody.ok).toBe(true)
    expect(syncStatusBody.result).toEqual(
      expect.objectContaining({
        due: false,
        reason: 'scheduled_refresh_disabled',
      }),
    )

    const connectionCheckResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.plaid.connectionCheck' }),
    })
    expect(connectionCheckResponse.status).toBe(200)
    const connectionCheckBody = (await connectionCheckResponse.json()) as {
      ok: boolean
      result: { ok: boolean; checks: Array<{ id: string }> }
    }
    expect(connectionCheckBody.ok).toBe(true)
    expect(connectionCheckBody.result.ok).toBe(false)
    expect(connectionCheckBody.result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'plaid_connection' }),
      ]),
    )

    const formulasSchemaResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.formulas.schema' }),
    })
    expect(formulasSchemaResponse.status).toBe(200)
    const formulasSchemaBody = (await formulasSchemaResponse.json()) as {
      ok: boolean
      result: {
        collections: { definitions: Array<{ id: string }> }
        entities: Array<{ id: string }>
        methods: Array<{ name: string }>
        examples: Array<{ formula: string }>
      }
    }
    expect(formulasSchemaBody.ok).toBe(true)
    expect(formulasSchemaBody.result.collections.definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'Accounts' }),
        expect.objectContaining({ id: 'NetWorthHistory' }),
        expect.objectContaining({ id: 'InvestmentHistory' }),
      ]),
    )
    expect(formulasSchemaBody.result.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'balanceSnapshot' }),
      ]),
    )
    expect(formulasSchemaBody.result.methods).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Trend' })]),
    )
    expect(formulasSchemaBody.result.examples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ formula: 'Accounts.Sum()' }),
      ]),
    )

    const formulasPreviewResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.formulas.preview',
        params: {
          formula: '(Income.Sum() - Expenses.Sum()) / Income.Sum()',
          format: 'percent',
          outputType: 'percent',
        },
      }),
    })
    expect(formulasPreviewResponse.status).toBe(200)
    const formulasPreviewBody = (await formulasPreviewResponse.json()) as {
      ok: boolean
      result: {
        ok: boolean
        result: { value: number; displayValue: string }
      }
    }
    expect(formulasPreviewBody.ok).toBe(true)
    expect(formulasPreviewBody.result.ok).toBe(true)
    expect(formulasPreviewBody.result.result.value).toBeCloseTo(0.6, 2)
    expect(formulasPreviewBody.result.result.displayValue).toBe('60%')

    const formulaCreateResponse = await app.request('/api/formulas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'rpc-net-worth',
        name: 'RPC Net Worth',
        formula: 'Accounts.Sum()',
        format: 'currency',
        outputType: 'money',
      }),
    })
    expect(formulaCreateResponse.status).toBe(200)

    const formulasListResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.formulas.list' }),
    })
    expect(formulasListResponse.status).toBe(200)
    const formulasListBody = (await formulasListResponse.json()) as {
      ok: boolean
      result: {
        formulas: Array<{ id: string }>
        materialized: Array<{ formulaId?: string; displayValue: string }>
      }
    }
    expect(formulasListBody.ok).toBe(true)
    expect(formulasListBody.result.formulas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'rpc-net-worth' }),
      ]),
    )
    expect(formulasListBody.result.materialized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          formulaId: 'rpc-net-worth',
          displayValue: '$107,251',
        }),
      ]),
    )

    const cardTemplatesResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.cards.templates.list',
        params: { category: 'recurring', limit: 3 },
      }),
    })
    expect(cardTemplatesResponse.status).toBe(200)
    const cardTemplatesBody = (await cardTemplatesResponse.json()) as {
      ok: boolean
      result: {
        templates: Array<{
          id: string
          category: string
          definition: { id: string; formula: string }
          referencedCollections: string[]
          requiredExtensions: string[]
          test?: { ok: boolean; definition: { id: string } }
        }>
        total: number
        categories: string[]
      }
    }
    expect(cardTemplatesBody.ok).toBe(true)
    expect(cardTemplatesBody.result.categories).toEqual(
      expect.arrayContaining(['recurring', 'cash-flow', 'merchants']),
    )
    expect(cardTemplatesBody.result.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'active-subscriptions',
          category: 'recurring',
          definition: expect.objectContaining({
            formula: 'Subscriptions.Unique(subscriptionKey).Count()',
          }),
          referencedCollections: expect.arrayContaining(['Subscriptions']),
          requiredExtensions: expect.arrayContaining([
            'transaction:subscription',
          ]),
          test: expect.objectContaining({
            ok: true,
            definition: expect.objectContaining({ id: 'active-subscriptions' }),
          }),
        }),
        expect.objectContaining({
          id: 'upcoming-subscriptions',
          category: 'recurring',
          definition: expect.objectContaining({
            formula:
              'Subscriptions.DueSoon(45d).Unique(subscriptionKey).Top(5, nextDueDate)',
          }),
          referencedCollections: expect.arrayContaining(['Subscriptions']),
          requiredExtensions: expect.arrayContaining([
            'transaction:subscription',
          ]),
        }),
      ]),
    )

    const merchantTemplatesResponse = await app.request(
      '/api/cards/templates?category=merchants&includeEvaluation=false',
    )
    expect(merchantTemplatesResponse.status).toBe(200)
    const merchantTemplates = (await merchantTemplatesResponse.json()) as {
      templates: Array<{
        id: string
        test?: unknown
        requiredExtensions: string[]
      }>
    }
    expect(merchantTemplates.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'top-merchants',
          requiredExtensions: expect.arrayContaining([
            'transaction:merchantGroup',
          ]),
        }),
      ]),
    )
    expect(
      merchantTemplates.templates.find(
        (template) => template.id === 'top-merchants',
      ),
    ).not.toHaveProperty('test')

    const extensionTemplatesResponse = await app.request(
      '/api/cards/templates?ids=recurring-spend-by-need,joy-reviewed-spend,shared-expense-reimbursements,tax-advantaged-contributions,monthly-merchant-spend&includeEvaluation=true',
    )
    expect(extensionTemplatesResponse.status).toBe(200)
    const extensionTemplates = (await extensionTemplatesResponse.json()) as {
      templates: Array<{
        id: string
        requiredExtensions: string[]
        referencedCollections: string[]
        test?: { ok: boolean }
      }>
    }
    expect(extensionTemplates.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'recurring-spend-by-need',
          referencedCollections: expect.arrayContaining(['Expenses']),
          requiredExtensions: expect.arrayContaining(['transaction:budget']),
          test: expect.objectContaining({ ok: true }),
        }),
        expect.objectContaining({
          id: 'joy-reviewed-spend',
          referencedCollections: expect.arrayContaining([
            'JoyReview',
            'Expenses',
          ]),
          requiredExtensions: expect.arrayContaining(['transaction:joyReview']),
          test: expect.objectContaining({ ok: true }),
        }),
        expect.objectContaining({
          id: 'shared-expense-reimbursements',
          referencedCollections: expect.arrayContaining([
            'SharedExpenses',
            'Persons',
          ]),
          requiredExtensions: expect.arrayContaining([
            'person:profile',
            'transaction:sharedExpense',
          ]),
          test: expect.objectContaining({ ok: true }),
        }),
        expect.objectContaining({
          id: 'tax-advantaged-contributions',
          referencedCollections: expect.arrayContaining(['TaxContributions']),
          requiredExtensions: expect.arrayContaining([
            'transaction:taxContribution',
          ]),
          test: expect.objectContaining({ ok: true }),
        }),
        expect.objectContaining({
          id: 'monthly-merchant-spend',
          referencedCollections: expect.arrayContaining(['Expenses']),
          requiredExtensions: expect.arrayContaining([
            'transaction:merchantGroup',
          ]),
          test: expect.objectContaining({ ok: true }),
        }),
      ]),
    )

    const trendTemplatesResponse = await app.request(
      '/api/cards/templates?ids=net-worth-trend,cash-flow-trend,expense-trend&includeEvaluation=true',
    )
    expect(trendTemplatesResponse.status).toBe(200)
    const trendTemplates = (await trendTemplatesResponse.json()) as {
      templates: Array<{
        id: string
        category: string
        definition: {
          kind: string
          formula: string
          secondaryFormulas?: Record<string, string>
        }
        referencedCollections: string[]
        test?: { ok: boolean; result?: { outputType: string } }
      }>
    }
    expect(trendTemplates.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'net-worth-trend',
          category: 'overview',
          definition: expect.objectContaining({
            kind: 'trend',
            formula: 'NetWorthHistory.Monthly().Trend()',
          }),
          referencedCollections: expect.arrayContaining(['NetWorthHistory']),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'series' }),
          }),
        }),
        expect.objectContaining({
          id: 'cash-flow-trend',
          category: 'cash-flow',
          definition: expect.objectContaining({
            kind: 'trend',
            formula: 'CashFlow.Monthly().Trend().MovingAverage(3)',
            secondaryFormulas: expect.objectContaining({
              monthOverMonth:
                'ChangeVs(CashFlow.ThisMonth().Sum(), CashFlow.LastMonth().Sum())',
            }),
          }),
          referencedCollections: expect.arrayContaining(['CashFlow']),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'series' }),
          }),
        }),
        expect.objectContaining({
          id: 'expense-trend',
          category: 'cash-flow',
          definition: expect.objectContaining({
            kind: 'trend',
            formula: 'Expenses.Monthly().Trend().MovingAverage(3)',
          }),
          referencedCollections: expect.arrayContaining(['Expenses']),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'series' }),
          }),
        }),
      ]),
    )

    const planningTemplatesResponse = await app.request(
      '/api/cards/templates?ids=monthly-spend,spend-change-vs-last-month,investment-trend&includeEvaluation=true',
    )
    expect(planningTemplatesResponse.status).toBe(200)
    const planningTemplates = (await planningTemplatesResponse.json()) as {
      templates: Array<{
        id: string
        category: string
        definition: {
          kind: string
          formula: string
          secondaryFormulas?: Record<string, string>
        }
        referencedCollections: string[]
        test?: { ok: boolean; result?: { outputType: string } }
      }>
    }
    expect(planningTemplates.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'monthly-spend',
          category: 'cash-flow',
          definition: expect.objectContaining({
            kind: 'metric',
            formula: 'Expenses.ThisMonth().Sum()',
            secondaryFormulas: expect.objectContaining({
              rollingAverage: 'Expenses.MonthlyAverage(6)',
            }),
          }),
          referencedCollections: expect.arrayContaining(['Expenses']),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'money' }),
          }),
        }),
        expect.objectContaining({
          id: 'spend-change-vs-last-month',
          category: 'cash-flow',
          definition: expect.objectContaining({
            kind: 'comparison',
            formula:
              'ChangeVs(Expenses.ThisMonth().Sum(), Expenses.LastMonth().Sum())',
          }),
          referencedCollections: expect.arrayContaining(['Expenses']),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'percent' }),
          }),
        }),
        expect.objectContaining({
          id: 'investment-trend',
          category: 'investing',
          definition: expect.objectContaining({
            kind: 'trend',
            formula: 'InvestmentHistory.Monthly().Trend()',
          }),
          referencedCollections: expect.arrayContaining(['InvestmentHistory']),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'series' }),
          }),
        }),
      ]),
    )

    const creditDebtTemplatesResponse = await app.request(
      '/api/cards/templates?category=credit-debt&ids=interest-drag,high-apr-debts&includeEvaluation=true',
    )
    expect(creditDebtTemplatesResponse.status).toBe(200)
    const creditDebtTemplates = (await creditDebtTemplatesResponse.json()) as {
      templates: Array<{
        id: string
        category: string
        definition: {
          formula: string
          secondaryFormulas?: Record<string, string>
        }
        referencedCollections: string[]
        test?: { ok: boolean; result?: { outputType: string } }
      }>
    }
    expect(creditDebtTemplates.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'interest-drag',
          category: 'credit-debt',
          definition: expect.objectContaining({
            formula: 'InterestDrag(Debt.Where(balance > 0 and apr > 0))',
            secondaryFormulas: expect.objectContaining({
              monthlyInterest:
                'InterestDrag(Debt.Where(balance > 0 and apr > 0), "monthly")',
              highAprDebts: 'Debt.Where(balance > 0 and apr > 0).Top(5, apr)',
            }),
          }),
          referencedCollections: expect.arrayContaining(['Debt']),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'money' }),
          }),
        }),
        expect.objectContaining({
          id: 'high-apr-debts',
          category: 'credit-debt',
          definition: expect.objectContaining({
            formula: 'Debt.Where(balance > 0 and apr > 0).Top(5, apr)',
          }),
          referencedCollections: expect.arrayContaining(['Debt']),
          test: expect.objectContaining({
            ok: true,
            result: expect.objectContaining({ outputType: 'entity-list' }),
          }),
        }),
      ]),
    )

    const allTemplatesResponse = await app.request(
      '/api/cards/templates?includeEvaluation=true&limit=100',
    )
    expect(allTemplatesResponse.status).toBe(200)
    const allTemplates = (await allTemplatesResponse.json()) as {
      templates: Array<{
        id: string
        test?: { ok: boolean; error?: { message?: string } }
      }>
    }
    const failedTemplates = allTemplates.templates
      .filter((template) => template.test?.ok === false)
      .map((template) => ({
        id: template.id,
        message: template.test?.error?.message,
      }))
    expect(failedTemplates).toEqual([])

    const cardPreviewResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.cards.preview',
        params: {
          id: 'rpc-cash-flow',
          title: 'RPC Cash Flow',
          kind: 'metric',
          formula: 'Income.ThisMonth().Sum() - Expenses.ThisMonth().Sum()',
          format: 'currency',
          outputType: 'money',
        },
      }),
    })
    expect(cardPreviewResponse.status).toBe(200)
    const cardPreviewBody = (await cardPreviewResponse.json()) as {
      ok: boolean
      result: {
        ok: boolean
        definition: { id: string; formula: string }
        card: { id: string; displayValue: string }
        result: { displayValue: string; outputType: string }
      }
    }
    expect(cardPreviewBody.ok).toBe(true)
    expect(cardPreviewBody.result.ok).toBe(true)
    expect(cardPreviewBody.result.definition).toEqual(
      expect.objectContaining({
        id: 'rpc-cash-flow',
        formula: 'Income.ThisMonth().Sum() - Expenses.ThisMonth().Sum()',
      }),
    )
    expect(cardPreviewBody.result.card).toEqual(
      expect.objectContaining({ id: 'rpc-cash-flow', displayValue: '$5,521' }),
    )
    expect(cardPreviewBody.result.result).toEqual(
      expect.objectContaining({ displayValue: '$5,521', outputType: 'money' }),
    )

    const invalidCardPreviewResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.cards.preview',
        params: {
          title: 'Invalid Trend',
          kind: 'trend',
          formula: 'Accounts.Sum()',
          format: 'currency',
          outputType: 'money',
        },
      }),
    })
    expect(invalidCardPreviewResponse.status).toBe(400)
    const invalidCardPreviewBody =
      (await invalidCardPreviewResponse.json()) as {
        ok: boolean
        error: { code: string; diagnostics: Array<{ message: string }> }
        repairActions: Array<{
          action: string
          rpc: string
          params: Record<string, unknown>
        }>
      }
    expect(invalidCardPreviewBody.ok).toBe(false)
    expect(invalidCardPreviewBody.error).toEqual(
      expect.objectContaining({
        code: 'card_kind_diagnostics',
        diagnostics: [
          expect.objectContaining({
            message:
              'Card kind "trend" cannot use money output. Expected series or forecast.',
          }),
        ],
      }),
    )
    expect(invalidCardPreviewBody.repairActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'preview-formula',
          rpc: 'money.formulas.preview',
          params: expect.objectContaining({ formula: 'Accounts.Sum()' }),
        }),
        expect.objectContaining({
          action: 'preview-card',
          rpc: 'money.cards.preview',
        }),
      ]),
    )

    const cardTestResponse = await app.request('/api/cards/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        cards: [
          {
            id: 'test-valid-card',
            title: 'Test Valid Card',
            kind: 'metric',
            formula: 'Accounts.Sum()',
            format: 'currency',
            outputType: 'money',
          },
          {
            id: 'test-expense-drilldown-card',
            title: 'Test Expense Drilldown Card',
            kind: 'metric',
            formula: 'Expenses.Where(amount > 0).Sum()',
            secondaryFormulas: {
              recentExpenses: 'Expenses.ThisMonth().Top(2)',
              recentIncome: 'Income.ThisMonth().Top(2)',
            },
            format: 'currency',
            outputType: 'money',
          },
          {
            id: 'test-bad-kind',
            title: 'Test Bad Kind',
            kind: 'trend',
            formula: 'Accounts.Sum()',
            format: 'currency',
            outputType: 'money',
          },
          {
            id: 'test-bad-formula',
            title: 'Test Bad Formula',
            kind: 'metric',
            formula: 'Expenses.Where(nope = 1).Sum()',
            format: 'currency',
            outputType: 'money',
          },
        ],
      }),
    })
    expect(cardTestResponse.status).toBe(200)
    const cardTestBody = (await cardTestResponse.json()) as {
      ok: boolean
      total: number
      passed: number
      failed: number
      cards: Array<{
        index: number
        ok: boolean
        definition?: { id: string }
        card?: { displayValue: string }
        drilldown?: {
          formulaKey?: string
          collection: string
          drilldownBasis: string
          formulaFiltered: boolean
          total: number
          transactions: Array<{ direction: string }>
        }
        secondaryDrilldowns?: Record<
          string,
          {
            formulaKey?: string
            collection: string
            drilldownBasis: string
            formulaFiltered: boolean
            total: number
            transactions: Array<{ direction: string }>
          }
        >
        error?: { code: string; diagnostics?: Array<{ message: string }> }
        repairHints: string[]
        repairActions?: Array<{
          action: string
          rpc: string
          params: { formula?: string; cursor?: number; cards?: unknown[] }
        }>
      }>
      nextActions: Array<{
        action: string
        rpc: string
        params: Record<string, unknown>
      }>
    }
    expect(cardTestBody).toEqual(
      expect.objectContaining({
        ok: false,
        total: 4,
        passed: 2,
        failed: 2,
      }),
    )
    expect(cardTestBody.cards[0]).toEqual(
      expect.objectContaining({
        index: 0,
        ok: true,
        definition: expect.objectContaining({ id: 'test-valid-card' }),
        card: expect.objectContaining({ displayValue: '$107,251' }),
        repairHints: [],
      }),
    )
    expect(cardTestBody.cards[1]).toEqual(
      expect.objectContaining({
        index: 1,
        ok: true,
        definition: expect.objectContaining({
          id: 'test-expense-drilldown-card',
        }),
        drilldown: expect.objectContaining({
          collection: 'Expenses',
          drilldownBasis: 'formula',
          formulaFiltered: true,
          total: expect.any(Number),
        }),
        secondaryDrilldowns: expect.objectContaining({
          recentExpenses: expect.objectContaining({
            formulaKey: 'recentExpenses',
            collection: 'Expenses',
            drilldownBasis: 'formula',
            formulaFiltered: true,
          }),
          recentIncome: expect.objectContaining({
            formulaKey: 'recentIncome',
            collection: 'Income',
            drilldownBasis: 'formula',
            formulaFiltered: true,
          }),
        }),
        repairHints: [],
      }),
    )
    expect(cardTestBody.cards[1]?.drilldown?.total).toBeGreaterThan(0)
    expect(
      cardTestBody.cards[1]?.drilldown?.transactions.every(
        (transaction) => transaction.direction === 'expense',
      ),
    ).toBe(true)
    expect(
      cardTestBody.cards[1]?.secondaryDrilldowns?.recentExpenses.transactions.every(
        (transaction) => transaction.direction === 'expense',
      ),
    ).toBe(true)
    expect(
      cardTestBody.cards[1]?.secondaryDrilldowns?.recentIncome.transactions.every(
        (transaction) => transaction.direction === 'income',
      ),
    ).toBe(true)
    expect(cardTestBody.cards[2]).toEqual(
      expect.objectContaining({
        index: 2,
        ok: false,
        error: expect.objectContaining({ code: 'card_kind_diagnostics' }),
        repairHints: expect.arrayContaining([
          expect.stringContaining('Change the card kind'),
        ]),
        repairActions: expect.arrayContaining([
          expect.objectContaining({
            action: 'preview-formula',
            rpc: 'money.formulas.preview',
          }),
          expect.objectContaining({
            action: 'test-card',
            rpc: 'money.cards.test',
          }),
        ]),
      }),
    )
    expect(cardTestBody.cards[3]).toEqual(
      expect.objectContaining({
        index: 3,
        ok: false,
        error: expect.objectContaining({
          code: 'formula_diagnostics',
          diagnostics: expect.arrayContaining([
            expect.objectContaining({
              message: 'Unknown field "nope" for collection Expenses',
            }),
          ]),
        }),
        repairHints: expect.arrayContaining([
          expect.stringContaining('money.formulas.complete inside Where'),
        ]),
        repairActions: expect.arrayContaining([
          expect.objectContaining({
            action: 'complete-formula',
            rpc: 'money.formulas.complete',
            params: expect.objectContaining({
              formula: 'Expenses.Where(nope = 1).Sum()',
              cursor: expect.any(Number),
            }),
          }),
          expect.objectContaining({
            action: 'preview-card',
            rpc: 'money.cards.preview',
          }),
        ]),
      }),
    )
    expect(cardTestBody.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'complete-formula',
          rpc: 'money.formulas.complete',
        }),
        expect.objectContaining({
          action: 'test-card',
          rpc: 'money.cards.test',
        }),
      ]),
    )

    const rpcCardTestResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.cards.test',
        params: {
          cards: [
            {
              id: 'rpc-test-valid-card',
              title: 'RPC Test Valid Card',
              kind: 'metric',
              formula: 'Income.Sum() - Expenses.Sum()',
              format: 'currency',
              outputType: 'money',
            },
          ],
        },
      }),
    })
    expect(rpcCardTestResponse.status).toBe(200)
    const rpcCardTest = (await rpcCardTestResponse.json()) as {
      ok: boolean
      result: { ok: boolean; passed: number; failed: number }
    }
    expect(rpcCardTest).toEqual(
      expect.objectContaining({
        ok: true,
        result: expect.objectContaining({ ok: true, passed: 1, failed: 0 }),
      }),
    )

    const cardSaveResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.cards.save',
        params: {
          id: 'rpc-net-worth-card',
          title: 'RPC Net Worth Card',
          kind: 'metric',
          formula: 'Accounts.Sum()',
          format: 'currency',
          outputType: 'money',
          secondaryFormulas: {
            monthlyChange: 'ChangeVs(Accounts.Sum(), Accounts.Sum())',
          },
        },
      }),
    })
    expect(cardSaveResponse.status).toBe(200)
    const cardSaveBody = (await cardSaveResponse.json()) as {
      ok: boolean
      result: {
        ok: boolean
        definition: { id: string; secondaryFormulas?: Record<string, string> }
        card: {
          id: string
          displayValue: string
          secondaryResults?: Record<
            string,
            {
              formula: string
              value: number
              displayValue: string
              outputType: string
              referencedCollections: string[]
            }
          >
        }
        result: { cardId?: string; displayValue: string }
      }
    }
    expect(cardSaveBody.ok).toBe(true)
    expect(cardSaveBody.result.ok).toBe(true)
    expect(cardSaveBody.result.definition).toEqual(
      expect.objectContaining({
        id: 'rpc-net-worth-card',
        secondaryFormulas: {
          monthlyChange: 'ChangeVs(Accounts.Sum(), Accounts.Sum())',
        },
      }),
    )
    expect(cardSaveBody.result.card).toEqual(
      expect.objectContaining({
        id: 'rpc-net-worth-card',
        displayValue: '$107,251',
        secondaryResults: {
          monthlyChange: {
            formula: 'ChangeVs(Accounts.Sum(), Accounts.Sum())',
            value: 0,
            displayValue: '0%',
            outputType: 'percent',
            referencedCollections: ['Accounts'],
          },
        },
      }),
    )
    expect(cardSaveBody.result.result).toEqual(
      expect.objectContaining({
        cardId: 'rpc-net-worth-card',
        displayValue: '$107,251',
      }),
    )

    const cardRefreshResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.cards.refresh',
        params: { id: 'rpc-net-worth-card' },
      }),
    })
    expect(cardRefreshResponse.status).toBe(200)
    const cardRefreshBody = (await cardRefreshResponse.json()) as {
      ok: boolean
      result: {
        ok: boolean
        definition: { id: string }
        card: { displayValue: string }
        result: { cardId?: string; displayValue: string }
      }
    }
    expect(cardRefreshBody.ok).toBe(true)
    expect(cardRefreshBody.result.ok).toBe(true)
    expect(cardRefreshBody.result.definition.id).toBe('rpc-net-worth-card')
    expect(cardRefreshBody.result.card.displayValue).toBe('$107,251')
    expect(cardRefreshBody.result.result).toEqual(
      expect.objectContaining({
        cardId: 'rpc-net-worth-card',
        displayValue: '$107,251',
      }),
    )

    const cardsListResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.cards.list' }),
    })
    expect(cardsListResponse.status).toBe(200)
    const cardsListBody = (await cardsListResponse.json()) as {
      ok: boolean
      result: {
        definitions: Array<{ id: string }>
        cards: Array<{ id: string; displayValue: string }>
      }
    }
    expect(cardsListBody.ok).toBe(true)
    expect(cardsListBody.result.definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'net-worth' }),
        expect.objectContaining({ id: 'rpc-net-worth-card' }),
      ]),
    )
    expect(cardsListBody.result.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'net-worth', displayValue: '$107,251' }),
        expect.objectContaining({
          id: 'rpc-net-worth-card',
          displayValue: '$107,251',
        }),
      ]),
    )
  })

  it('declares app-to-app read scopes for normalized finance data', async () => {
    const manifest = JSON.parse(
      await fs.readFile(path.join(process.cwd(), 'moldable.json'), 'utf8'),
    ) as {
      appApi: {
        capabilities: Array<{
          scopes: Array<{
            id: string
            inputSchema?: unknown
            outputSchema?: unknown
          }>
        }>
      }
    }
    const scopes = manifest.appApi.capabilities.flatMap(
      (capability) => capability.scopes,
    )
    expect(scopes.map((scope) => scope.id)).toEqual(
      expect.arrayContaining([
        'money.summary',
        'money.data.health',
        'money.data.firstRun',
        'money.accounts.list',
        'money.debts.list',
        'money.debts.patch',
        'money.holdings.list',
        'money.currency.settings',
        'money.currency.settings.patch',
        'money.fxRates.list',
        'money.fxRates.replace',
        'money.balanceSnapshots.list',
        'money.allocationTargets.list',
        'money.forecastScenarios.list',
        'money.taxContributionLimits.list',
        'money.merchants.list',
        'money.merchants.review',
        'money.recommendations.list',
        'money.recommendations.groups',
        'money.recommendations.patch',
        'money.recurring.series',
        'money.moneyFlows.list',
        'money.moneyFlows.markExternalDestination',
        'money.sync.status',
        'money.sync.history',
        'money.connections.list',
        'money.connections.sync',
        'money.connections.delete',
        'money.plaid.connectionCheck',
        'money.plaid.connectSession',
        'money.transactions.search',
        'money.transactions.get',
        'money.transactions.labelPlan',
        'money.transactions.review',
        'money.transactions.reviewGroups',
        'money.transactions.reviewGroups.applySuggestions',
        'money.transactions.labelPreview',
        'money.transactions.labelApply',
        'money.transactions.labelRules.list',
        'money.transactions.labelRules.create',
        'money.transactions.labelRules.delete',
        'money.transactions.classify',
        'money.extensions.proposals.list',
        'money.extensions.proposals.decide',
        'money.extensions.proposals.accept',
        'money.extensions.proposals.reject',
        'money.extensions.values.list',
        'money.extensions.values.patch',
        'money.extensions.values.delete',
        'money.formulas.schema',
        'money.formulas.list',
        'money.formulas.complete',
        'money.formulas.preview',
        'money.dashboards.list',
        'money.dashboards.reorder',
        'money.dashboards.delete',
        'money.cards.list',
        'money.cards.readiness',
        'money.cards.transactions',
        'money.cards.templates.list',
        'money.cards.preview',
        'money.cards.test',
        'money.cards.save',
        'money.cards.refresh',
      ]),
    )
    for (const scope of scopes) {
      expect(scope.inputSchema).toEqual(
        expect.objectContaining({ type: 'object' }),
      )
      expect(scope.outputSchema).toEqual(
        expect.objectContaining({ type: 'object' }),
      )
    }
  })

  it('surfaces Plaid sync errors in Today', async () => {
    await fs.writeFile(
      path.join(dataDir, 'connections.json'),
      JSON.stringify([
        {
          itemId: 'item-error',
          credentialRef: 'plaid:item:item-error',
          institutionId: 'ins_error',
          institutionName: 'Error Bank',
          status: 'connected',
          products: ['transactions'],
          connectedAt: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'sync-state.json'),
      JSON.stringify({
        generatedAt: '2026-06-03T00:00:00.000Z',
        status: 'error',
        lastError: 'Error Bank: Plaid credentials are unavailable',
        itemCursors: {},
      }),
    )

    const todayResponse = await app.request('/api/moldable/today')
    expect(todayResponse.status).toBe(200)
    const today = (await todayResponse.json()) as {
      items: Array<{ id: string; title: string; subtitle: string }>
      resume: { title: string } | null
    }
    expect(today.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'money-sync-error',
          title: 'Money sync failed',
          subtitle: 'Error Bank: Plaid credentials are unavailable',
        }),
      ]),
    )
    expect(today.resume).toEqual(
      expect.objectContaining({ title: 'Review Money' }),
    )
  })

  it('persists attention settings and surfaces transaction threshold Today items', async () => {
    await app.request('/api/dev/seed', { method: 'POST' })

    const initialResponse = await app.request('/api/attention/settings')
    expect(initialResponse.status).toBe(200)
    const initial = (await initialResponse.json()) as {
      settings: { largeTransactionThreshold: number; lookbackDays: number }
    }
    expect(initial.settings).toEqual(
      expect.objectContaining({
        largeTransactionThreshold: 1000,
        lookbackDays: 30,
      }),
    )

    const patchResponse = await app.request('/api/attention/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        largeTransactionThreshold: 2500,
        lookbackDays: 45,
        categoryThresholds: [
          { category: 'Food', monthlyLimit: 500, enabled: true },
        ],
      }),
    })
    expect(patchResponse.status).toBe(200)
    const patched = (await patchResponse.json()) as {
      settings: {
        largeTransactionThreshold: number
        lookbackDays: number
        categoryThresholds: Array<{ category: string; monthlyLimit: number }>
      }
    }
    expect(patched.settings).toEqual(
      expect.objectContaining({
        largeTransactionThreshold: 2500,
        lookbackDays: 45,
      }),
    )
    expect(patched.settings.categoryThresholds).toEqual([
      expect.objectContaining({ category: 'Food', monthlyLimit: 500 }),
    ])

    const todayResponse = await app.request('/api/moldable/today')
    expect(todayResponse.status).toBe(200)
    const today = (await todayResponse.json()) as {
      items: Array<{
        id: string
        title: string
        subtitle: string
        kind: string
      }>
    }
    expect(today.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'money-large-transaction-seed-rent',
          kind: 'attention',
          title: 'Large expense detected',
        }),
        expect.objectContaining({
          id: 'money-category-threshold-food',
          kind: 'attention',
          title: 'Food is over budget',
        }),
      ]),
    )
  })

  it('checks Plaid readiness through aivault without returning the Link token', async () => {
    const fakeAivaultPath = path.join(dataDir, 'fake-aivault-readiness.mjs')
    const fakeAivaultLogPath = `${fakeAivaultPath}.log`
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        "import fs from 'node:fs'",
        'const args = process.argv.slice(2)',
        "const bodyIndex = args.indexOf('--body')",
        'const body = bodyIndex === -1 ? null : JSON.parse(args[bodyIndex + 1])',
        'fs.writeFileSync(`${process.argv[1]}.log`, JSON.stringify({ args, body }))',
        'process.stdout.write(JSON.stringify({ response: { json: { link_token: "link-production-secret", expiration: "2026-06-03T12:30:00Z", request_id: "req_ready" } } }))',
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath

    const readinessResponse = await app.request('/api/plaid/readiness', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        products: ['transactions'],
        optionalProducts: ['liabilities', 'investments'],
        timeoutMs: 5000,
      }),
    })
    expect(readinessResponse.status).toBe(200)

    const readiness = (await readinessResponse.json()) as {
      ok: boolean
      linkTokenCreated: boolean
      requestId?: string
      capabilityId: string
      linkToken?: string
    }
    expect(readiness).toEqual(
      expect.objectContaining({
        ok: true,
        linkTokenCreated: true,
        requestId: 'req_ready',
        capabilityId: 'plaid/link-token-create',
      }),
    )
    expect(readiness.linkToken).toBeUndefined()
    expect(JSON.stringify(readiness)).not.toContain('link-production-secret')

    const fakeAivaultLog = JSON.parse(
      await fs.readFile(fakeAivaultLogPath, 'utf8'),
    ) as {
      args: string[]
      body: {
        products: string[]
        optional_products: string[]
        country_codes: string[]
        redirect_uri: string
        transactions: {
          days_requested: number
        }
      }
    }
    expect(fakeAivaultLog.args).toEqual(
      expect.arrayContaining([
        'json',
        'plaid/link-token-create',
        '--path',
        '/link/token/create',
      ]),
    )
    expect(fakeAivaultLog.body).toEqual(
      expect.objectContaining({
        products: ['transactions'],
        optional_products: ['liabilities', 'investments'],
        country_codes: ['US', 'CA'],
        transactions: { days_requested: 730 },
      }),
    )
    expect(fakeAivaultLog.body.redirect_uri).toMatch(/\/plaid\/oauth-return$/)
  })

  it('creates Plaid browser connect sessions for the active workspace', async () => {
    const fakeAivaultPath = path.join(dataDir, 'fake-aivault-connect.mjs')
    const fakeAivaultLogPath = `${fakeAivaultPath}.log`
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        "import fs from 'node:fs'",
        'const args = process.argv.slice(2)',
        "const bodyIndex = args.indexOf('--body')",
        'const body = bodyIndex === -1 ? null : JSON.parse(args[bodyIndex + 1])',
        'fs.writeFileSync(`${process.argv[1]}.log`, JSON.stringify({ args, body }))',
        'process.stdout.write(JSON.stringify({ response: { json: { link_token: "link-production-connect", expiration: "2099-06-03T12:30:00Z", request_id: "req_connect" } } }))',
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath

    const createResponse = await app.request('/api/plaid/connect-session', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-moldable-workspace': 'work',
      },
      body: JSON.stringify({
        products: ['transactions'],
        optionalProducts: ['liabilities'],
      }),
    })
    expect(createResponse.status).toBe(200)

    const created = (await createResponse.json()) as {
      id: string
      url: string
      redirectUri: string
      expiresAt: string
      requestId?: string
    }
    expect(created.requestId).toBe('req_connect')
    expect(created.url).toContain('/plaid/connect?session=')
    expect(created.redirectUri).toMatch(/\/plaid\/oauth-return$/)
    expect(Date.parse(created.expiresAt)).toBeGreaterThan(Date.now())
    const fakeAivaultLog = JSON.parse(
      await fs.readFile(fakeAivaultLogPath, 'utf8'),
    ) as {
      body: {
        country_codes: string[]
        products: string[]
        optional_products: string[]
      }
    }
    expect(fakeAivaultLog.body).toEqual(
      expect.objectContaining({
        country_codes: ['US', 'CA'],
        products: ['transactions'],
        optional_products: ['liabilities'],
      }),
    )

    const sessionResponse = await app.request(
      `/api/plaid/connect-session/${created.id}`,
    )
    expect(sessionResponse.status).toBe(200)
    const session = (await sessionResponse.json()) as {
      id: string
      linkToken: string
      workspaceId: string
      redirectUri: string
    }
    expect(session).toEqual(
      expect.objectContaining({
        id: created.id,
        linkToken: 'link-production-connect',
        workspaceId: 'work',
        redirectUri: created.redirectUri,
      }),
    )

    const rpcCreateResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-moldable-workspace': 'work',
      },
      body: JSON.stringify({
        method: 'money.plaid.connectSession',
        params: {
          products: ['transactions'],
          optionalProducts: ['investments'],
        },
      }),
    })
    expect(rpcCreateResponse.status).toBe(200)
    const rpcCreatedText = await rpcCreateResponse.text()
    expect(rpcCreatedText).not.toContain('link-production-connect')
    const rpcCreated = JSON.parse(rpcCreatedText) as {
      ok: boolean
      result: {
        id: string
        url: string
        redirectUri: string
        expiresAt: string
        requestId?: string
        linkToken?: string
      }
    }
    expect(rpcCreated).toEqual(
      expect.objectContaining({
        ok: true,
        result: expect.objectContaining({
          url: expect.stringContaining('/plaid/connect?session='),
          redirectUri: expect.stringMatching(/\/plaid\/oauth-return$/),
          requestId: 'req_connect',
        }),
      }),
    )
    expect(rpcCreated.result.linkToken).toBeUndefined()

    const rpcSessionResponse = await app.request(
      `/api/plaid/connect-session/${rpcCreated.result.id}`,
    )
    expect(rpcSessionResponse.status).toBe(200)
    const rpcSession = (await rpcSessionResponse.json()) as {
      id: string
      linkToken: string
      workspaceId: string
    }
    expect(rpcSession).toEqual(
      expect.objectContaining({
        id: rpcCreated.result.id,
        linkToken: 'link-production-connect',
        workspaceId: 'work',
      }),
    )

    const deleteResponse = await app.request(
      `/api/plaid/connect-session/${created.id}`,
      { method: 'DELETE' },
    )
    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toEqual({ ok: true, deleted: true })

    const deletedSessionResponse = await app.request(
      `/api/plaid/connect-session/${created.id}`,
    )
    expect(deletedSessionResponse.status).toBe(404)

    const repeatedDeleteResponse = await app.request(
      `/api/plaid/connect-session/${created.id}`,
      { method: 'DELETE' },
    )
    expect(repeatedDeleteResponse.status).toBe(200)
    expect(await repeatedDeleteResponse.json()).toEqual({
      ok: true,
      deleted: false,
    })

    const rpcDeleteResponse = await app.request(
      `/api/plaid/connect-session/${rpcCreated.result.id}`,
      { method: 'DELETE' },
    )
    expect(rpcDeleteResponse.status).toBe(200)
    expect(await rpcDeleteResponse.json()).toEqual({ ok: true, deleted: true })
  })

  it('surfaces missing Plaid credentials from connect-session', async () => {
    const fakeAivaultPath = path.join(
      dataDir,
      'fake-aivault-connect-missing.mjs',
    )
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        'console.error("CredentialNotFound: no credential for capability provider plaid")',
        'process.exit(1)',
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath

    const createResponse = await app.request('/api/plaid/connect-session', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-moldable-workspace': 'work',
      },
      body: JSON.stringify({
        products: ['transactions'],
      }),
    })

    expect(createResponse.status).toBe(502)
    expect(await createResponse.json()).toEqual({
      error: {
        code: 'plaid_credentials_missing',
        message:
          'Plaid Production credentials are not configured in aivault for this workspace.',
        setupCommands: [
          'aivault secrets create --name PLAID_CLIENT_ID --value "..." --scope global',
          'aivault secrets create --name PLAID_SECRET --value "..." --scope global',
        ],
      },
    })
  })

  it('creates item-scoped Plaid update sessions and records products after success', async () => {
    const fakeAivaultPath = path.join(
      dataDir,
      'fake-aivault-update-session.mjs',
    )
    const fakeAivaultLogPath = `${fakeAivaultPath}.log`
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        "import fs from 'node:fs'",
        'const args = process.argv.slice(2)',
        "const bodyIndex = args.indexOf('--body')",
        'const body = bodyIndex === -1 ? null : JSON.parse(args[bodyIndex + 1])',
        'fs.writeFileSync(`${process.argv[1]}.log`, JSON.stringify({ args, body }))',
        'process.stdout.write(JSON.stringify({ response: { json: { result: { link_token: "link-update-secret", expiration: "2099-06-03T12:30:00Z", request_id: "req_update" } } } }))',
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath
    await fs.writeFile(
      path.join(dataDir, 'connections.json'),
      JSON.stringify([
        {
          itemId: 'item-update',
          credentialRef: 'plaid:item:item-update',
          institutionId: 'ins_update',
          institutionName: 'Synthetic Bank',
          status: 'connected',
          products: ['transactions'],
          connectedAt: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )

    const createResponse = await app.request('/api/plaid/connect-session', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-moldable-workspace': 'work',
      },
      body: JSON.stringify({
        itemId: 'item-update',
        additionalConsentedProducts: ['liabilities'],
      }),
    })
    expect(createResponse.status).toBe(200)
    const createdText = await createResponse.text()
    expect(createdText).not.toContain('link-update-secret')
    const created = JSON.parse(createdText) as {
      id: string
      mode: string
      itemId?: string
      productsToAdd?: string[]
      requestId?: string
    }
    expect(created).toEqual(
      expect.objectContaining({
        mode: 'update',
        itemId: 'item-update',
        productsToAdd: ['liabilities'],
        requestId: 'req_update',
      }),
    )

    const fakeAivaultLog = JSON.parse(
      await fs.readFile(fakeAivaultLogPath, 'utf8'),
    ) as {
      args: string[]
      body: {
        credentialRef?: string
        additionalConsentedProducts?: string[]
        optional_products?: string[]
      }
    }
    expect(fakeAivaultLog.args).toEqual(
      expect.arrayContaining([
        'json',
        'plaid/link-token-update',
        '--path',
        '/link/token/create',
      ]),
    )
    expect(fakeAivaultLog.body).toEqual(
      expect.objectContaining({
        credentialRef: 'plaid:item:item-update',
        additionalConsentedProducts: ['liabilities'],
      }),
    )
    expect(fakeAivaultLog.body.optional_products).toBeUndefined()

    const sessionResponse = await app.request(
      `/api/plaid/connect-session/${created.id}`,
    )
    expect(sessionResponse.status).toBe(200)
    const session = (await sessionResponse.json()) as {
      linkToken?: string
      mode: string
      itemId?: string
      productsToAdd?: string[]
    }
    expect(session).toEqual(
      expect.objectContaining({
        linkToken: 'link-update-secret',
        mode: 'update',
        itemId: 'item-update',
        productsToAdd: ['liabilities'],
      }),
    )

    const completeResponse = await app.request('/api/plaid/complete-update', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-moldable-workspace': 'work',
      },
      body: JSON.stringify({
        sessionId: created.id,
        metadata: { link_session_id: 'ls' },
      }),
    })
    expect(completeResponse.status).toBe(200)
    const complete = (await completeResponse.json()) as {
      updated: boolean
      connection: { products: string[]; credentialRef?: string }
      nextAction: { rpc: string; params: { itemId: string } }
    }
    expect(complete.updated).toBe(true)
    expect(complete.connection.products).toEqual([
      'transactions',
      'liabilities',
    ])
    expect(complete.nextAction).toEqual(
      expect.objectContaining({
        rpc: 'money.connections.sync',
        params: { itemId: 'item-update' },
      }),
    )

    const connectionsText = await fs.readFile(
      path.join(dataDir, 'connections.json'),
      'utf8',
    )
    expect(connectionsText).toContain('"liabilities"')

    const completedSessionResponse = await app.request(
      `/api/plaid/connect-session/${created.id}`,
    )
    expect(completedSessionResponse.status).toBe(404)
  })

  it('returns a structured error for missing Plaid connect sessions', async () => {
    const sessionResponse = await app.request(
      '/api/plaid/connect-session/not-found',
    )
    expect(sessionResponse.status).toBe(404)
    expect(await sessionResponse.json()).toEqual({
      error: {
        code: 'plaid_connect_session_not_found',
        message: 'Plaid connect session was not found or has expired',
      },
    })
  })

  it('stores only Plaid credential references after public-token exchange', async () => {
    const fakeAivaultPath = path.join(dataDir, 'fake-aivault-exchange.mjs')
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        'process.stdout.write(JSON.stringify({ response: { json: { result: { itemId: "item-exchange", credentialRef: "plaid:item:item-exchange", institutionId: "ins_exchange", institutionName: "Exchange Bank", connectedAt: "2026-06-03T00:00:00.000Z", access_token: "access-production-should-not-leak" } } } }))',
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath

    const response = await app.request('/api/plaid/complete-link', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-moldable-workspace': 'personal',
      },
      body: JSON.stringify({
        publicToken: 'public-production-test',
        metadata: {
          institution: {
            institution_id: 'ins_exchange',
            name: 'Exchange Bank',
          },
          products: ['transactions'],
        },
      }),
    })
    expect(response.status).toBe(200)
    const bodyText = await response.text()
    expect(bodyText).toContain('plaid:item:item-exchange')
    expect(bodyText).not.toContain('access-production-should-not-leak')

    const connectionsText = await fs.readFile(
      path.join(dataDir, 'connections.json'),
      'utf8',
    )
    expect(connectionsText).toContain('plaid:item:item-exchange')
    expect(connectionsText).not.toContain('access-production-should-not-leak')
  })

  it('redacts Plaid-looking tokens from public-token exchange failures', async () => {
    const fakeAivaultPath = path.join(dataDir, 'fake-aivault-exchange-fail.mjs')
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        'console.error("exchange failed with access-production-abc public-production-def secret-production-ghi")',
        'process.exit(1)',
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath

    const response = await app.request('/api/plaid/complete-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        publicToken: 'public-production-test',
        metadata: { products: ['transactions'] },
      }),
    })
    expect(response.status).toBe(502)
    const bodyText = await response.text()
    expect(bodyText).toContain('access-production-[redacted]')
    expect(bodyText).toContain('public-production-[redacted]')
    expect(bodyText).toContain('secret-production-[redacted]')
    expect(bodyText).not.toContain('abc')
    expect(bodyText).not.toContain('def')
    expect(bodyText).not.toContain('ghi')
  })

  it('redacts Plaid-looking secrets from readiness failures', async () => {
    const fakeAivaultPath = path.join(
      dataDir,
      'fake-aivault-readiness-fail.mjs',
    )
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        'console.error("bad secret-production-abc access-production-def public-production-ghi PLAID_SECRET=secret-production-jkl")',
        'process.exit(1)',
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath

    const readinessResponse = await app.request('/api/plaid/readiness', {
      method: 'POST',
    })
    expect(readinessResponse.status).toBe(200)
    const readiness = (await readinessResponse.json()) as {
      ok: boolean
      error?: { message: string }
    }

    expect(readiness.ok).toBe(false)
    expect(readiness.error?.message).toContain('secret-production-[redacted]')
    expect(readiness.error?.message).toContain('access-production-[redacted]')
    expect(readiness.error?.message).toContain('public-production-[redacted]')
    expect(readiness.error?.message).not.toContain('abc')
    expect(readiness.error?.message).not.toContain('def')
    expect(readiness.error?.message).not.toContain('ghi')
    expect(readiness.error?.message).not.toContain('jkl')
  })

  it('treats Plaid API error responses as readiness failures', async () => {
    const fakeAivaultPath = path.join(
      dataDir,
      'fake-aivault-plaid-api-error.mjs',
    )
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        `process.stdout.write(${JSON.stringify(
          JSON.stringify({
            response: {
              status: 400,
              json: {
                error_type: 'INVALID_REQUEST',
                error_code: 'INVALID_FIELD',
                error_message:
                  'OAuth redirect URI must be configured in the developer dashboard.',
                request_id: 'req_redirect',
              },
            },
          }),
        )})`,
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath

    const readinessResponse = await app.request('/api/plaid/readiness', {
      method: 'POST',
    })
    expect(readinessResponse.status).toBe(200)
    const readiness = (await readinessResponse.json()) as {
      ok: boolean
      linkTokenCreated: boolean
      error?: { code: string; message: string }
    }

    expect(readiness).toEqual(
      expect.objectContaining({
        ok: false,
        linkTokenCreated: false,
      }),
    )
    expect(readiness.error).toEqual(
      expect.objectContaining({
        code: 'plaid_readiness_failed',
        message: expect.stringContaining('Plaid INVALID_FIELD (400)'),
      }),
    )
    expect(readiness.error?.message).toContain(
      'OAuth redirect URI must be configured',
    )
    expect(readiness.error?.message).toContain('request_id=req_redirect')
  })

  it('previews and persists formula-backed cards and dashboards', async () => {
    await app.request('/api/dev/seed', { method: 'POST' })

    const collectionsResponse = await app.request('/api/collections')
    expect(collectionsResponse.status).toBe(200)
    const collectionsBody = (await collectionsResponse.json()) as {
      definitions: Array<{ id: string }>
      metrics: Array<{ id: string; value: number }>
    }
    expect(
      collectionsBody.definitions.some((entry) => entry.id === 'Income'),
    ).toBe(true)
    expect(collectionsBody.metrics.some((entry) => entry.id === 'Income')).toBe(
      true,
    )

    const schemaResponse = await app.request('/api/formulas/schema')
    expect(schemaResponse.status).toBe(200)
    const schema = (await schemaResponse.json()) as {
      collections: {
        definitions: Array<{ id: string }>
        metrics: Array<{ id: string }>
      }
      entities: Array<{ id: string; fields: Array<{ name: string }> }>
      extensions: {
        extensions: Array<{
          namespace: string
          derivedCollections?: Array<{ id: string }>
        }>
      }
      methods: Array<{ name: string; returns: string }>
      functions: Array<{ name: string; returns: string }>
      allocationTargets: Array<{
        id: string
        allocations: Record<string, number>
      }>
      forecastScenarios: Array<{ id: string; changes: unknown[] }>
      taxContributionLimits: Array<{ id: string; type: string; limit: number }>
      cardKinds: string[]
      formats: string[]
      outputTypes: string[]
      examples: Array<{ formula: string }>
    }
    expect(schema.collections.definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'Accounts' }),
        expect.objectContaining({ id: 'LiquidAssets' }),
        expect.objectContaining({ id: 'IlliquidAssets' }),
        expect.objectContaining({ id: 'CardAccounts' }),
        expect.objectContaining({ id: 'ReviewActions' }),
        expect.objectContaining({ id: 'Warnings' }),
        expect.objectContaining({ id: 'Opportunities' }),
      ]),
    )
    expect(schema.collections.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'Accounts' }),
        expect.objectContaining({ id: 'LiquidAssets' }),
        expect.objectContaining({ id: 'IlliquidAssets' }),
      ]),
    )
    expect(
      schema.entities.find((entity) => entity.id === 'transaction')?.fields,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'amount' }),
        expect.objectContaining({ name: 'category' }),
        expect.objectContaining({ name: 'recurring' }),
      ]),
    )
    expect(
      schema.entities.find((entity) => entity.id === 'account')?.fields,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'creditLimit' }),
        expect.objectContaining({ name: 'availableCredit' }),
        expect.objectContaining({ name: 'utilization' }),
        expect.objectContaining({ name: 'investmentAccountKind' }),
        expect.objectContaining({ name: 'taxTreatment' }),
        expect.objectContaining({ name: 'liquidity' }),
        expect.objectContaining({ name: 'liquidityClass' }),
        expect.objectContaining({ name: 'liquidityTier' }),
        expect.objectContaining({ name: 'contributionLimitAnnual' }),
        expect.objectContaining({ name: 'contributionLimitYear' }),
      ]),
    )
    expect(
      schema.entities.find((entity) => entity.id === 'holding')?.fields,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'accountSubtype' }),
        expect.objectContaining({ name: 'investmentAccountKind' }),
        expect.objectContaining({ name: 'taxTreatment' }),
      ]),
    )
    expect(
      schema.entities.find((entity) => entity.id === 'recommendation')?.fields,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'status' }),
        expect.objectContaining({ name: 'severity' }),
        expect.objectContaining({ name: 'estimatedImpact' }),
        expect.objectContaining({ name: 'sourceEntity' }),
      ]),
    )
    expect(schema.methods).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'ThisMonth', returns: 'collection' }),
        expect.objectContaining({ name: 'YTD', returns: 'collection' }),
        expect.objectContaining({ name: 'Between', returns: 'collection' }),
        expect.objectContaining({
          name: 'PreviousPeriod',
          returns: 'collection',
        }),
        expect.objectContaining({ name: 'Limit', returns: 'collection' }),
        expect.objectContaining({ name: 'Offset', returns: 'collection' }),
        expect.objectContaining({ name: 'GroupBy', returns: 'table' }),
        expect.objectContaining({ name: 'Trend', returns: 'series' }),
        expect.objectContaining({ name: 'DueSoon', returns: 'collection' }),
        expect.objectContaining({ name: 'MovingAverage', returns: 'series' }),
        expect.objectContaining({ name: 'Cumulative', returns: 'series' }),
        expect.objectContaining({ name: 'PercentOfTotal' }),
      ]),
    )
    expect(schema.extensions.extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          namespace: 'subscription',
          derivedCollections: expect.arrayContaining([
            expect.objectContaining({ id: 'Subscriptions' }),
          ]),
        }),
        expect.objectContaining({
          namespace: 'joyReview',
          derivedCollections: expect.arrayContaining([
            expect.objectContaining({ id: 'JoyReview' }),
          ]),
        }),
        expect.objectContaining({
          namespace: 'sharedExpense',
          derivedCollections: expect.arrayContaining([
            expect.objectContaining({ id: 'SharedExpenses' }),
          ]),
        }),
      ]),
    )
    expect(schema.functions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Runway', returns: 'duration' }),
        expect.objectContaining({ name: 'Forecast', returns: 'forecast' }),
        expect.objectContaining({
          name: 'ForecastScenario',
          returns: 'forecast',
        }),
        expect.objectContaining({
          name: 'DebtPayoff',
          returns: 'table-or-number',
        }),
        expect.objectContaining({ name: 'InterestDrag', returns: 'money' }),
        expect.objectContaining({
          name: 'CreditUtilization',
          returns: 'table',
        }),
        expect.objectContaining({ name: 'AllocationDrift', returns: 'table' }),
        expect.objectContaining({ name: 'ContributionRoom', returns: 'table' }),
      ]),
    )
    expect(schema.allocationTargets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'default',
          allocations: expect.objectContaining({ funds: 0.9, cash: 0.1 }),
        }),
      ]),
    )
    expect(schema.forecastScenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'default',
          changes: expect.arrayContaining([
            expect.objectContaining({ percentChange: -0.1 }),
          ]),
        }),
      ]),
    )
    expect(schema.taxContributionLimits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '401k-2026-standard',
          type: '401k',
          limit: 24500,
        }),
        expect.objectContaining({
          id: 'hsa-2026-self',
          type: 'hsa',
          limit: 4400,
        }),
      ]),
    )
    expect(schema.cardKinds).toEqual(
      expect.arrayContaining(['metric', 'trend']),
    )
    expect(schema.formats).toEqual(
      expect.arrayContaining(['currency', 'percent']),
    )
    expect(schema.outputTypes).toEqual(
      expect.arrayContaining(['money', 'series', 'forecast']),
    )
    expect(
      schema.entities.find((entity) => entity.id === 'transaction')?.fields,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'reportingCurrency' }),
        expect.objectContaining({ name: 'reportingValueStatus' }),
      ]),
    )
    expect(schema.examples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ formula: 'Accounts.Sum()' }),
      ]),
    )

    const expressionCompletionResponse = await app.request(
      '/api/formulas/complete',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formula: '' }),
      },
    )
    expect(expressionCompletionResponse.status).toBe(200)
    const expressionCompletion =
      (await expressionCompletionResponse.json()) as {
        context: string
        completions: Array<{ label: string; kind: string; insert: string }>
      }
    expect(expressionCompletion.context).toBe('expression')
    expect(expressionCompletion.completions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Accounts', kind: 'collection' }),
        expect.objectContaining({
          label: 'Runway',
          kind: 'function',
          insert: 'Runway(',
        }),
      ]),
    )

    const collectionMethodCompletionResponse = await app.request(
      '/api/formulas/complete',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formula: 'Expenses.' }),
      },
    )
    expect(collectionMethodCompletionResponse.status).toBe(200)
    const collectionMethodCompletion =
      (await collectionMethodCompletionResponse.json()) as {
        context: string
        completions: Array<{ label: string; kind: string }>
      }
    expect(collectionMethodCompletion.context).toBe('method')
    expect(collectionMethodCompletion.completions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Where', kind: 'method' }),
        expect.objectContaining({ label: 'GroupBy', kind: 'method' }),
        expect.objectContaining({ label: 'Sum', kind: 'method' }),
      ]),
    )
    expect(collectionMethodCompletion.completions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'MovingAverage' }),
      ]),
    )

    const tableMethodCompletionResponse = await app.request(
      '/api/formulas/complete',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formula: 'Expenses.GroupBy(category).' }),
      },
    )
    expect(tableMethodCompletionResponse.status).toBe(200)
    const tableMethodCompletion =
      (await tableMethodCompletionResponse.json()) as {
        completions: Array<{ label: string }>
      }
    expect(tableMethodCompletion.completions).toEqual([
      expect.objectContaining({ label: 'PercentOfTotal' }),
    ])

    const seriesMethodCompletionResponse = await app.request(
      '/api/formulas/complete',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formula: 'Expenses.Monthly().Trend().' }),
      },
    )
    expect(seriesMethodCompletionResponse.status).toBe(200)
    const seriesMethodCompletion =
      (await seriesMethodCompletionResponse.json()) as {
        completions: Array<{ label: string }>
      }
    expect(seriesMethodCompletion.completions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'MovingAverage' }),
        expect.objectContaining({ label: 'Cumulative' }),
      ]),
    )

    const fieldCompletionResponse = await app.request(
      '/api/formulas/complete',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formula: 'Expenses.Where(' }),
      },
    )
    expect(fieldCompletionResponse.status).toBe(200)
    const fieldCompletion = (await fieldCompletionResponse.json()) as {
      context: string
      completions: Array<{ label: string; kind: string }>
    }
    expect(fieldCompletion.context).toBe('field')
    expect(fieldCompletion.completions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'amount', kind: 'field' }),
        expect.objectContaining({ label: 'direction', kind: 'field' }),
        expect.objectContaining({ label: 'joy', kind: 'field' }),
      ]),
    )

    const enumCompletionResponse = await app.request('/api/formulas/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'JoyReview.Where(rating = "' }),
    })
    expect(enumCompletionResponse.status).toBe(200)
    const enumCompletion = (await enumCompletionResponse.json()) as {
      context: string
      completions: Array<{ label: string; kind: string; insert: string }>
    }
    expect(enumCompletion.context).toBe('enum')
    expect(enumCompletion.completions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'negative',
          kind: 'enum',
          insert: 'negative',
        }),
        expect.objectContaining({
          label: 'positive',
          kind: 'enum',
          insert: 'positive',
        }),
      ]),
    )

    const rpcCompletionResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.formulas.complete',
        params: { formula: 'Income.' },
      }),
    })
    expect(rpcCompletionResponse.status).toBe(200)
    const rpcCompletion = (await rpcCompletionResponse.json()) as {
      ok: boolean
      result: { context: string; completions: Array<{ label: string }> }
    }
    expect(rpcCompletion.ok).toBe(true)
    expect(rpcCompletion.result.context).toBe('method')
    expect(rpcCompletion.result.completions).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Sum' })]),
    )

    const previewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: '(Income.Sum() - Expenses.Sum()) / Income.Sum()',
      }),
    })
    expect(previewResponse.status).toBe(200)
    const previewBody = (await previewResponse.json()) as {
      ok: boolean
      result: {
        value: number
        displayValue: string
        referencedCollections: string[]
      }
    }
    expect(previewBody.ok).toBe(true)
    expect(previewBody.result.value).toBeCloseTo(0.6, 2)
    expect(previewBody.result.referencedCollections).toEqual(
      expect.arrayContaining(['Income', 'Expenses']),
    )

    const runwayPreviewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'Runway(12000, 1000)',
        format: 'duration',
      }),
    })
    expect(runwayPreviewResponse.status).toBe(200)
    const runwayPreview = (await runwayPreviewResponse.json()) as {
      ok: boolean
      result: {
        value: { type: string; amount: number; unit: string; days: number }
        displayValue: string
        outputType: string
      }
    }
    expect(runwayPreview.ok).toBe(true)
    expect(runwayPreview.result).toEqual(
      expect.objectContaining({
        value: {
          type: 'duration',
          amount: 12,
          unit: 'month',
          days: 360,
        },
        displayValue: '12 months',
        outputType: 'duration',
      }),
    )

    const runwayArithmeticResponse = await app.request(
      '/api/formulas/preview',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formula: 'Runway(12000, 1000) + 1' }),
      },
    )
    expect(runwayArithmeticResponse.status).toBe(200)
    const runwayArithmetic = (await runwayArithmeticResponse.json()) as {
      result: { value: number; outputType: string }
    }
    expect(runwayArithmetic.result).toEqual(
      expect.objectContaining({ value: 13, outputType: 'number' }),
    )

    const invalidPreviewResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'Crypto.Sum()' }),
    })
    expect(invalidPreviewResponse.status).toBe(400)
    const invalidPreview = (await invalidPreviewResponse.json()) as {
      ok: boolean
      error: {
        diagnostics: Array<{
          message: string
          range: {
            start: { line: number; character: number; offset: number }
            end: { line: number; character: number; offset: number }
          } | null
        }>
      }
    }
    expect(invalidPreview.ok).toBe(false)
    expect(invalidPreview.error.diagnostics[0]).toEqual({
      message: 'Unknown collection: Crypto',
      range: {
        start: { line: 0, character: 0, offset: 0 },
        end: { line: 0, character: 6, offset: 6 },
      },
    })

    const invalidFieldPreviewResponse = await app.request(
      '/api/formulas/preview',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: 'Expenses.Where(notAField = 1).Sum()',
        }),
      },
    )
    expect(invalidFieldPreviewResponse.status).toBe(400)
    const invalidFieldPreview = (await invalidFieldPreviewResponse.json()) as {
      error: {
        diagnostics: Array<{
          message: string
          range: {
            start: { line: number; character: number; offset: number }
            end: { line: number; character: number; offset: number }
          } | null
        }>
      }
    }
    expect(invalidFieldPreview.error.diagnostics[0]).toEqual({
      message: 'Unknown field "notAField" for collection Expenses',
      range: {
        start: { line: 0, character: 15, offset: 15 },
        end: { line: 0, character: 24, offset: 24 },
      },
    })

    const invalidEntityFieldResponse = await app.request(
      '/api/formulas/preview',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: 'Debt.Where(category = "Food").Sum()',
        }),
      },
    )
    expect(invalidEntityFieldResponse.status).toBe(400)
    const invalidEntityField = (await invalidEntityFieldResponse.json()) as {
      error: { diagnostics: Array<{ message: string }> }
    }
    expect(invalidEntityField.error.diagnostics).toEqual([
      expect.objectContaining({
        message: 'Unknown field "category" for collection Debt',
      }),
    ])

    const validExtensionFieldResponse = await app.request(
      '/api/formulas/preview',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: 'JoyReview.Where(rating = "negative").Sum()',
        }),
      },
    )
    expect(validExtensionFieldResponse.status).toBe(200)

    const unsupportedMethodResponse = await app.request(
      '/api/formulas/preview',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formula: 'Expenses.NotAMethod().Sum()' }),
      },
    )
    expect(unsupportedMethodResponse.status).toBe(400)
    const unsupportedMethod = (await unsupportedMethodResponse.json()) as {
      error: { diagnostics: Array<{ message: string }> }
    }
    expect(unsupportedMethod.error.diagnostics).toEqual([
      expect.objectContaining({
        message: 'Unsupported collection method: NotAMethod',
      }),
    ])

    const scalarChainResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'Expenses.Sum().Count()' }),
    })
    expect(scalarChainResponse.status).toBe(400)
    const scalarChain = (await scalarChainResponse.json()) as {
      error: { diagnostics: Array<{ message: string; range: unknown }> }
    }
    expect(scalarChain.error.diagnostics).toEqual([
      expect.objectContaining({
        message: 'Cannot call Count after a scalar result',
        range: expect.any(Object),
      }),
    ])

    const tableChainResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'Expenses.GroupBy(category).Sum()' }),
    })
    expect(tableChainResponse.status).toBe(400)
    const tableChain = (await tableChainResponse.json()) as {
      error: { diagnostics: Array<{ message: string; range: unknown }> }
    }
    expect(tableChain.error.diagnostics).toEqual([
      expect.objectContaining({
        message: 'Cannot call Sum after a table result',
        range: expect.any(Object),
      }),
    ])

    const seriesChainResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'Expenses.Trend().Count()' }),
    })
    expect(seriesChainResponse.status).toBe(400)
    const seriesChain = (await seriesChainResponse.json()) as {
      error: { diagnostics: Array<{ message: string; range: unknown }> }
    }
    expect(seriesChain.error.diagnostics).toEqual([
      expect.objectContaining({
        message: 'Cannot call Count after a series result',
        range: expect.any(Object),
      }),
    ])

    const allocationArgResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'AllocationDrift(Investments.Sum(), "default")',
      }),
    })
    expect(allocationArgResponse.status).toBe(400)
    const allocationArg = (await allocationArgResponse.json()) as {
      error: { diagnostics: Array<{ message: string; range: unknown }> }
    }
    expect(allocationArg.error.diagnostics).toEqual([
      expect.objectContaining({
        message:
          'AllocationDrift argument 1 expects a table, but received a scalar.',
        range: expect.any(Object),
      }),
    ])

    const forecastArgResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ formula: 'Forecast(Expenses.GroupBy(category))' }),
    })
    expect(forecastArgResponse.status).toBe(400)
    const forecastArg = (await forecastArgResponse.json()) as {
      error: { diagnostics: Array<{ message: string; range: unknown }> }
    }
    expect(forecastArg.error.diagnostics).toEqual([
      expect.objectContaining({
        message:
          'Forecast argument 1 expects a number or series, but received a table.',
        range: expect.any(Object),
      }),
    ])

    const contributionArgResponse = await app.request('/api/formulas/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formula: 'ContributionRoom(TaxContributions.Sum())',
      }),
    })
    expect(contributionArgResponse.status).toBe(400)
    const contributionArg = (await contributionArgResponse.json()) as {
      error: { diagnostics: Array<{ message: string; range: unknown }> }
    }
    expect(contributionArg.error.diagnostics).toEqual([
      expect.objectContaining({
        message:
          'ContributionRoom argument 1 expects a collection, but received a scalar.',
        range: expect.any(Object),
      }),
    ])

    const formulaResponse = await app.request('/api/formulas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'percent-saved',
        name: 'Percent Saved',
        formula: '(Income.Sum() - Expenses.Sum()) / Income.Sum()',
        format: 'percent',
        outputType: 'percent',
      }),
    })
    expect(formulaResponse.status).toBe(200)

    const mismatchedFormulaResponse = await app.request('/api/formulas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'bad-series-formula',
        name: 'Bad Series Formula',
        formula: 'Accounts.Sum()',
        format: 'number',
        outputType: 'series',
      }),
    })
    expect(mismatchedFormulaResponse.status).toBe(400)
    const mismatchedFormula = (await mismatchedFormulaResponse.json()) as {
      error: { diagnostics: Array<{ message: string }> }
    }
    expect(mismatchedFormula.error.diagnostics).toEqual([
      expect.objectContaining({
        message: 'Expected series output, but formula returned scalar.',
      }),
    ])

    const forecastFormulaResponse = await app.request('/api/formulas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'expense-forecast',
        name: 'Expense Forecast',
        formula: 'Forecast(Expenses.Monthly().Trend(), 2, 0.8)',
        format: 'currency',
        outputType: 'forecast',
      }),
    })
    expect(forecastFormulaResponse.status).toBe(200)
    const forecastFormula = (await forecastFormulaResponse.json()) as {
      result: {
        outputType: string
        displayValue: string
        value: {
          type: string
          confidence: number
          points: Array<{
            key: string
            value: number
            low: number
            high: number
          }>
        }
      }
    }
    expect(forecastFormula.result).toEqual(
      expect.objectContaining({
        outputType: 'forecast',
        displayValue: '$3,679',
        value: expect.objectContaining({
          type: 'forecast',
          confidence: 0.8,
          points: expect.arrayContaining([
            expect.objectContaining({ key: '2026-07', value: 3679 }),
          ]),
        }),
      }),
    )

    const mismatchedForecastResponse = await app.request('/api/formulas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'bad-forecast-formula',
        name: 'Bad Forecast Formula',
        formula: 'Forecast(Expenses.Monthly().Trend(), 2)',
        format: 'currency',
        outputType: 'money',
      }),
    })
    expect(mismatchedForecastResponse.status).toBe(400)
    const mismatchedForecast = (await mismatchedForecastResponse.json()) as {
      error: { diagnostics: Array<{ message: string }> }
    }
    expect(mismatchedForecast.error.diagnostics).toEqual([
      expect.objectContaining({
        message: 'Expected money output, but formula returned forecast.',
      }),
    ])

    const cardResponse = await app.request('/api/cards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'custom-percent-saved',
        title: 'Custom Percent Saved',
        kind: 'ratio',
        primaryFormula: '(Income.Sum() - Expenses.Sum()) / Income.Sum()',
        secondaryFormulas: {
          recentExpenses: 'Expenses.ThisMonth().Top(3)',
          recentIncome: 'Income.ThisMonth().Top(3)',
        },
        format: 'percent',
      }),
    })
    expect(cardResponse.status).toBe(200)
    const cardBody = (await cardResponse.json()) as {
      card: {
        id: string
        displayValue: string
        secondaryResults?: Record<string, { outputType: string }>
      }
    }
    expect(cardBody.card).toEqual(
      expect.objectContaining({
        id: 'custom-percent-saved',
        displayValue: '60%',
        secondaryResults: expect.objectContaining({
          recentExpenses: expect.objectContaining({
            outputType: 'entity-list',
          }),
          recentIncome: expect.objectContaining({ outputType: 'entity-list' }),
        }),
      }),
    )

    const refreshResponse = await app.request(
      '/api/cards/custom-percent-saved/refresh',
      { method: 'POST' },
    )
    expect(refreshResponse.status).toBe(200)

    const cardTransactionsResponse = await app.request(
      '/api/cards/custom-percent-saved/transactions?collection=Expenses&limit=2',
    )
    expect(cardTransactionsResponse.status).toBe(200)
    const cardTransactions = (await cardTransactionsResponse.json()) as {
      collection: string
      availableCollections: string[]
      total: number
      limit: number
      hasMore: boolean
      nextCursor?: string
      transactions: Array<{ id: string; direction: string }>
    }
    expect(cardTransactions).toEqual(
      expect.objectContaining({
        collection: 'Expenses',
        availableCollections: expect.arrayContaining(['Income', 'Expenses']),
        total: expect.any(Number),
        limit: 2,
      }),
    )
    expect(cardTransactions.total).toBeGreaterThan(2)
    expect(cardTransactions.hasMore).toBe(true)
    expect(cardTransactions.transactions).toHaveLength(2)
    expect(
      cardTransactions.transactions.every((row) => row.direction === 'expense'),
    ).toBe(true)

    const secondaryTransactionsResponse = await app.request(
      '/api/cards/custom-percent-saved/transactions?formulaKey=recentExpenses&limit=2',
    )
    expect(secondaryTransactionsResponse.status).toBe(200)
    const secondaryTransactions =
      (await secondaryTransactionsResponse.json()) as {
        formulaKey?: string
        formula?: string
        collection: string
        drilldownBasis: string
        formulaFiltered: boolean
        total: number
        transactions: Array<{ id: string; direction: string }>
      }
    expect(secondaryTransactions).toEqual(
      expect.objectContaining({
        formulaKey: 'recentExpenses',
        formula: 'Expenses.ThisMonth().Top(3)',
        collection: 'Expenses',
        drilldownBasis: 'formula',
        formulaFiltered: true,
        total: 3,
      }),
    )
    expect(secondaryTransactions.transactions).toHaveLength(2)
    expect(
      secondaryTransactions.transactions.every(
        (row) => row.direction === 'expense',
      ),
    ).toBe(true)

    const cardTransactionsRpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.cards.transactions',
        params: {
          cardId: 'custom-percent-saved',
          formulaKey: 'recentIncome',
          limit: 2,
        },
      }),
    })
    expect(cardTransactionsRpcResponse.status).toBe(200)
    const cardTransactionsRpc = (await cardTransactionsRpcResponse.json()) as {
      ok: boolean
      result: {
        formulaKey?: string
        collection: string
        drilldownBasis: string
        formulaFiltered: boolean
        transactions: Array<{ id: string; direction: string }>
      }
    }
    expect(cardTransactionsRpc.ok).toBe(true)
    expect(cardTransactionsRpc.result).toEqual(
      expect.objectContaining({
        formulaKey: 'recentIncome',
        collection: 'Income',
        drilldownBasis: 'formula',
        formulaFiltered: true,
      }),
    )
    expect(
      cardTransactionsRpc.result.transactions.every(
        (row) => row.direction === 'income',
      ),
    ).toBe(true)

    const mismatchedCardResponse = await app.request('/api/cards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'bad-table-card',
        title: 'Bad Table Card',
        kind: 'breakdown',
        primaryFormula: 'Expenses.Trend()',
        outputType: 'table',
        format: 'number',
      }),
    })
    expect(mismatchedCardResponse.status).toBe(400)
    const mismatchedCard = (await mismatchedCardResponse.json()) as {
      error: { diagnostics: Array<{ message: string }> }
    }
    expect(mismatchedCard.error.diagnostics).toEqual([
      expect.objectContaining({
        message: 'Expected table output, but formula returned series.',
      }),
    ])

    const invalidKindResponse = await app.request('/api/cards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'bad-trend-card',
        title: 'Bad Trend Card',
        kind: 'trend',
        primaryFormula: 'Accounts.Sum()',
        format: 'currency',
      }),
    })
    expect(invalidKindResponse.status).toBe(400)
    const invalidKind = (await invalidKindResponse.json()) as {
      error: { code: string; diagnostics: Array<{ message: string }> }
    }
    expect(invalidKind.error).toEqual(
      expect.objectContaining({
        code: 'card_kind_diagnostics',
        diagnostics: [
          expect.objectContaining({
            message:
              'Card kind "trend" cannot use money output. Expected series or forecast.',
          }),
        ],
      }),
    )

    const invalidSecondaryResponse = await app.request('/api/cards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'bad-secondary-card',
        title: 'Bad Secondary Card',
        kind: 'metric',
        primaryFormula: 'Accounts.Sum()',
        secondaryFormulas: {
          invalid: 'Crypto.Sum()',
        },
        format: 'currency',
      }),
    })
    expect(invalidSecondaryResponse.status).toBe(400)
    const invalidSecondary = (await invalidSecondaryResponse.json()) as {
      error: {
        code: string
        formulaKey: string
        diagnostics: Array<{ message: string }>
      }
    }
    expect(invalidSecondary.error).toEqual(
      expect.objectContaining({
        code: 'secondary_formula_diagnostics',
        formulaKey: 'invalid',
        diagnostics: [
          expect.objectContaining({ message: 'Unknown collection: Crypto' }),
        ],
      }),
    )

    const trendCardResponse = await app.request('/api/cards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'expense-trend',
        title: 'Expense Trend',
        kind: 'trend',
        primaryFormula: 'Expenses.Trend()',
        outputType: 'series',
        format: 'number',
      }),
    })
    expect(trendCardResponse.status).toBe(200)
    const trendCardBody = (await trendCardResponse.json()) as {
      result: {
        outputType: string
        displayValue: string
        value: { type: string; points: unknown[] }
      }
    }
    expect(trendCardBody.result).toEqual(
      expect.objectContaining({
        outputType: 'series',
        displayValue: '1 points',
        value: expect.objectContaining({
          type: 'series',
          points: [expect.objectContaining({ key: '2026-06', value: 3679 })],
        }),
      }),
    )

    const breakdownCardResponse = await app.request('/api/cards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'expense-breakdown',
        title: 'Expense Breakdown',
        kind: 'breakdown',
        primaryFormula: 'Expenses.GroupBy(category).PercentOfTotal()',
        outputType: 'table',
        format: 'number',
      }),
    })
    expect(breakdownCardResponse.status).toBe(200)
    const breakdownCardBody = (await breakdownCardResponse.json()) as {
      result: {
        outputType: string
        displayValue: string
        value: { type: string; rows: unknown[] }
      }
    }
    expect(breakdownCardBody.result).toEqual(
      expect.objectContaining({
        outputType: 'table',
        displayValue: '4 rows',
        value: expect.objectContaining({
          type: 'table',
          rows: expect.arrayContaining([
            expect.objectContaining({ label: 'Housing Rent', value: 2800 }),
          ]),
        }),
      }),
    )

    const debtOptimizerCardResponse = await app.request('/api/cards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'debt-optimizer',
        title: 'Debt Optimizer',
        kind: 'optimizer',
        primaryFormula:
          'DebtPayoff(Debt.Where(balance > 0), Debt.Sum() * 0.03, "avalanche")',
        outputType: 'table',
        format: 'currency',
      }),
    })
    expect(debtOptimizerCardResponse.status).toBe(200)
    const debtOptimizerCard = (await debtOptimizerCardResponse.json()) as {
      result: {
        outputType: string
        displayValue: string
        value: {
          type: string
          rows: Array<{ priority: number; balance: number }>
        }
      }
    }
    expect(debtOptimizerCard.result).toEqual(
      expect.objectContaining({
        outputType: 'table',
        displayValue: '2 rows',
        value: expect.objectContaining({
          type: 'table',
          rows: expect.arrayContaining([
            expect.objectContaining({ priority: 1, balance: 14800 }),
            expect.objectContaining({ priority: 2, balance: 2712 }),
          ]),
        }),
      }),
    )

    const cardsResponse = await app.request('/api/cards')
    const cardsBody = (await cardsResponse.json()) as {
      materialized: Array<{
        cardId?: string
        outputType: string
        value: { type?: string }
      }>
    }
    expect(cardsBody.materialized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardId: 'expense-trend',
          outputType: 'series',
          value: expect.objectContaining({ type: 'series' }),
        }),
        expect.objectContaining({
          cardId: 'expense-breakdown',
          outputType: 'table',
          value: expect.objectContaining({ type: 'table' }),
        }),
      ]),
    )

    const dashboardResponse = await app.request('/api/dashboards/overview', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cardIds: ['custom-percent-saved'] }),
    })
    expect(dashboardResponse.status).toBe(200)

    const deleteMeDashboardResponse = await app.request(
      '/api/dashboards/delete-me',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Delete Me',
          cardIds: ['custom-percent-saved'],
        }),
      },
    )
    expect(deleteMeDashboardResponse.status).toBe(200)

    await app.request('/api/dashboards/reorder-one', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Reorder One',
        cardIds: ['custom-percent-saved'],
      }),
    })
    await app.request('/api/dashboards/reorder-two', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Reorder Two',
        cardIds: ['custom-percent-saved'],
      }),
    })
    const reorderResponse = await app.request('/api/dashboards/reorder', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: ['reorder-two', 'overview'] }),
    })
    expect(reorderResponse.status).toBe(200)
    const reordered = (await reorderResponse.json()) as {
      ok: boolean
      dashboards: Array<{ id: string; order: number }>
    }
    expect(reordered.ok).toBe(true)
    expect(
      reordered.dashboards.map((dashboard) => dashboard.id).slice(0, 3),
    ).toEqual(['reorder-two', 'overview', 'delete-me'])
    expect(reordered.dashboards.map((dashboard) => dashboard.order)).toEqual(
      reordered.dashboards.map((_, index) => index),
    )

    const dashboardListResponse = await app.request('/api/dashboards')
    const dashboardList = (await dashboardListResponse.json()) as {
      dashboards: Array<{ id: string; order: number }>
    }
    expect(
      dashboardList.dashboards.map((dashboard) => dashboard.id).slice(0, 3),
    ).toEqual(['reorder-two', 'overview', 'delete-me'])

    const invalidReorderResponse = await app.request(
      '/api/dashboards/reorder',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: ['not-a-dashboard'] }),
      },
    )
    expect(invalidReorderResponse.status).toBe(400)

    const deleteDashboardResponse = await app.request(
      '/api/dashboards/delete-me',
      {
        method: 'DELETE',
      },
    )
    expect(deleteDashboardResponse.status).toBe(200)
    const deletedDashboard = (await deleteDashboardResponse.json()) as {
      ok: boolean
      dashboard: { id: string }
      dashboards: Array<{ id: string }>
    }
    expect(deletedDashboard).toEqual(
      expect.objectContaining({
        ok: true,
        dashboard: expect.objectContaining({ id: 'delete-me' }),
      }),
    )
    expect(
      deletedDashboard.dashboards.some(
        (dashboard) => dashboard.id === 'delete-me',
      ),
    ).toBe(false)

    await app.request('/api/dashboards/rpc-delete-me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'RPC Delete Me',
        cardIds: ['custom-percent-saved'],
      }),
    })
    const rpcDeleteResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.dashboards.delete',
        params: { id: 'rpc-delete-me' },
      }),
    })
    expect(rpcDeleteResponse.status).toBe(200)
    const rpcDeletedDashboard = (await rpcDeleteResponse.json()) as {
      ok: boolean
      result: { dashboard: { id: string }; dashboards: Array<{ id: string }> }
    }
    expect(rpcDeletedDashboard.ok).toBe(true)
    expect(rpcDeletedDashboard.result.dashboard.id).toBe('rpc-delete-me')
    expect(
      rpcDeletedDashboard.result.dashboards.some(
        (dashboard) => dashboard.id === 'rpc-delete-me',
      ),
    ).toBe(false)

    await app.request('/api/dashboards/rpc-order-one', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'RPC Order One',
        cardIds: ['custom-percent-saved'],
      }),
    })
    const rpcReorderResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.dashboards.reorder',
        params: { ids: ['rpc-order-one', 'reorder-one'] },
      }),
    })
    expect(rpcReorderResponse.status).toBe(200)
    const rpcReorderedDashboard = (await rpcReorderResponse.json()) as {
      ok: boolean
      result: { dashboards: Array<{ id: string; order: number }> }
    }
    expect(rpcReorderedDashboard.ok).toBe(true)
    expect(
      rpcReorderedDashboard.result.dashboards
        .map((dashboard) => dashboard.id)
        .slice(0, 2),
    ).toEqual(['rpc-order-one', 'reorder-one'])

    const accountFormulaResponse = await app.request('/api/formulas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'account-net-worth',
        name: 'Account Net Worth',
        formula: 'Accounts.Sum()',
        format: 'currency',
        outputType: 'money',
      }),
    })
    expect(accountFormulaResponse.status).toBe(200)

    const formulasResponse = await app.request('/api/formulas')
    const formulasBody = (await formulasResponse.json()) as {
      formulas: Array<{ id: string }>
      materialized: Array<{
        formulaId?: string
        value: number
        displayValue: string
        generatedAt: string
      }>
    }
    expect(formulasBody.formulas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'percent-saved' }),
      ]),
    )
    expect(formulasBody.materialized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ formulaId: 'percent-saved' }),
      ]),
    )
    const accountNetWorthBefore = formulasBody.materialized.find(
      (metric) => metric.formulaId === 'account-net-worth',
    )
    expect(accountNetWorthBefore).toEqual(
      expect.objectContaining({
        displayValue: '$107,251',
      }),
    )

    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [],
        transactions: [
          {
            id: 'extra-expense',
            source: 'seed',
            name: 'Extra Expense',
            amount: 1000,
            direction: 'expense',
            category: ['Testing'],
            date: '2026-06-04',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)
    const importBody = (await importResponse.json()) as {
      refreshedMetrics: number
    }
    expect(importBody.refreshedMetrics).toBeGreaterThanOrEqual(4)
    expect(importBody.refreshedMetrics).toBeLessThan(40)

    const refreshedFormulasResponse = await app.request('/api/formulas')
    const refreshedFormulasBody = (await refreshedFormulasResponse.json()) as {
      materialized: Array<{
        formulaId?: string
        value: number
        displayValue: string
        generatedAt: string
      }>
    }
    expect(
      refreshedFormulasBody.materialized.find(
        (metric) => metric.formulaId === 'percent-saved',
      ),
    ).toEqual(
      expect.objectContaining({
        value: expect.closeTo(0.49, 2),
        displayValue: '49%',
      }),
    )
    expect(
      refreshedFormulasBody.materialized.find(
        (metric) => metric.formulaId === 'account-net-worth',
      ),
    ).toEqual(
      expect.objectContaining({
        displayValue: '$107,251',
        generatedAt: accountNetWorthBefore?.generatedAt,
      }),
    )

    const rebuildCardsAfterImportResponse = await app.request(
      '/api/warehouse/rebuild',
      {
        method: 'POST',
      },
    )
    expect(rebuildCardsAfterImportResponse.status).toBe(200)

    const refreshedCardsResponse = await app.request('/api/cards')
    const refreshedCardsBody = (await refreshedCardsResponse.json()) as {
      materialized: Array<{
        cardId?: string
        displayValue: string
        value:
          | number
          | { type?: string; points?: Array<{ key: string; value: number }> }
      }>
    }
    expect(
      refreshedCardsBody.materialized.find(
        (metric) => metric.cardId === 'custom-percent-saved',
      ),
    ).toEqual(expect.objectContaining({ displayValue: '49%' }))
    expect(
      refreshedCardsBody.materialized.find(
        (metric) => metric.cardId === 'expense-trend',
      )?.value,
    ).toEqual(
      expect.objectContaining({
        points: [expect.objectContaining({ key: '2026-06', value: 4679 })],
      }),
    )
  })

  it('caps FIRE cards and ignores stale materialized age formulas', async () => {
    const importResponse = await app.request('/api/import/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accounts: [
          {
            id: 'asset-account',
            source: 'seed',
            name: 'Asset Account',
            type: 'cash',
            currentBalance: 100_000,
            isoCurrencyCode: 'USD',
            asOf: '2026-06-04T00:00:00.000Z',
          },
        ],
        transactions: [
          {
            id: 'expense-1',
            source: 'seed',
            name: 'Monthly Spend',
            amount: 10_000,
            direction: 'expense',
            category: ['Testing'],
            date: '2026-06-04',
            isoCurrencyCode: 'USD',
            recurring: false,
          },
        ],
      }),
    })
    expect(importResponse.status).toBe(200)

    const staleMetricDir = path.join(dataDir, 'metrics', 'materialized')
    await fs.mkdir(staleMetricDir, { recursive: true })
    const staleMetricPath = path.join(
      staleMetricDir,
      'card-financial-independence-projection.json',
    )
    await fs.writeFile(
      staleMetricPath,
      JSON.stringify({
        id: 'card-financial-independence-projection',
        cardId: 'financial-independence-projection',
        formula: 'FreedomAge(Assets.Sum() / Expenses.MonthlyAverage(6))',
        value: 8,
        displayValue: '8',
        outputType: 'number',
        referencedCollections: ['Assets', 'Expenses'],
        generatedAt: '2026-06-04T00:00:00.000Z',
      }),
    )
    await fs.rm(path.join(dataDir, 'projections', 'cards', 'current.json'), {
      force: true,
    })

    const cardsResponse = await app.request('/api/cards')
    expect(cardsResponse.status).toBe(200)
    const cardsBody = (await cardsResponse.json()) as {
      cards: Array<{ id: string; value: number; displayValue: string }>
      materialized: Array<{
        cardId?: string
        formula?: string
        displayValue: string
      }>
    }

    expect(
      cardsBody.cards.find(
        (card) => card.id === 'financial-independence-projection',
      ),
    ).toEqual(
      expect.objectContaining({
        value: 99,
        displayValue: '99+',
      }),
    )
    expect(
      cardsBody.materialized.some(
        (metric) => metric.cardId === 'financial-independence-projection',
      ),
    ).toBe(false)
    await expect(fs.access(staleMetricPath)).rejects.toThrow()

    const refreshResponse = await app.request(
      '/api/cards/financial-independence-projection/refresh',
      { method: 'POST' },
    )
    expect(refreshResponse.status).toBe(200)
    const refreshBody = (await refreshResponse.json()) as {
      result: { cardId: string; value: number; displayValue: string }
    }
    expect(refreshBody.result).toEqual(
      expect.objectContaining({
        cardId: 'financial-independence-projection',
        value: 99,
        displayValue: '99+',
      }),
    )
  })

  it('sync route is idle without Plaid connections', async () => {
    const syncResponse = await app.request('/api/sync', { method: 'POST' })
    expect(syncResponse.status).toBe(200)
    const syncBody = (await syncResponse.json()) as {
      ok: boolean
      status: string
      syncedConnections: number
    }
    expect(syncBody).toEqual(
      expect.objectContaining({
        ok: true,
        status: 'idle',
        syncedConnections: 0,
      }),
    )
  })

  it('drains multi-page Plaid transaction sync results before finishing', async () => {
    const fakeAivaultPath = path.join(dataDir, 'fake-aivault-paged-sync.mjs')
    const fakeAivaultLogPath = path.join(
      dataDir,
      'fake-aivault-paged-sync.jsonl',
    )
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        'import fs from "node:fs"',
        'const args = process.argv.slice(2)',
        'const capability = args.find((arg) => arg.startsWith("plaid/"))',
        'const bodyIndex = args.indexOf("--body")',
        'const body = bodyIndex === -1 ? {} : JSON.parse(args[bodyIndex + 1])',
        `fs.appendFileSync(${JSON.stringify(fakeAivaultLogPath)}, JSON.stringify({ capability, body }) + "\\n")`,
        'let result = {}',
        'if (capability === "plaid/accounts-sync") {',
        '  result = { accounts: [{ account_id: "acc-paged", name: "Checking", type: "depository", subtype: "checking", balances: { current: 1000, iso_currency_code: "USD" } }] }',
        '} else if (capability === "plaid/transactions-sync") {',
        '  if (!body.cursor) {',
        '    result = { added: [{ transaction_id: "tx-page-1", account_id: "acc-paged", name: "Coffee", amount: 5, date: "2026-06-01", iso_currency_code: "USD", pending: false, personal_finance_category: { primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK_COFFEE" } }], modified: [], removed: [], next_cursor: "cursor-page-1", has_more: true }',
        '  } else if (body.cursor === "cursor-page-1") {',
        '    result = { added: [{ transaction_id: "tx-page-2", account_id: "acc-paged", name: "Payroll", amount: -2500, date: "2026-06-02", iso_currency_code: "USD", pending: false, personal_finance_category: { primary: "INCOME", detailed: "INCOME_WAGES" } }], modified: [], removed: [], next_cursor: "cursor-done", has_more: false }',
        '  } else {',
        '    process.stderr.write(`unexpected cursor ${body.cursor}`)',
        '    process.exit(2)',
        '  }',
        '} else {',
        '  process.stderr.write(`unexpected capability ${capability}`)',
        '  process.exit(2)',
        '}',
        'process.stdout.write(JSON.stringify({ response: { json: { result } } }))',
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath
    await fs.writeFile(
      path.join(dataDir, 'connections.json'),
      JSON.stringify([
        {
          itemId: 'item-paged',
          credentialRef: 'plaid:item:item-paged',
          institutionId: 'ins_paged',
          institutionName: 'Paged Bank',
          status: 'connected',
          products: ['transactions'],
          connectedAt: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )

    const syncResponse = await app.request('/api/sync', { method: 'POST' })
    expect(syncResponse.status).toBe(200)
    const syncBody = (await syncResponse.json()) as {
      ok: boolean
      transactions: number
      syncState: { itemCursors: Record<string, string> }
    }
    expect(syncBody).toEqual(
      expect.objectContaining({
        ok: true,
        transactions: 2,
      }),
    )
    expect(syncBody.syncState.itemCursors).toEqual({
      'item-paged': 'cursor-done',
    })

    const calls = (await fs.readFile(fakeAivaultLogPath, 'utf8'))
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as { capability: string; body: { cursor?: string } },
      )
    expect(
      calls.filter((call) => call.capability === 'plaid/transactions-sync'),
    ).toEqual([
      expect.objectContaining({
        body: expect.not.objectContaining({ cursor: expect.any(String) }),
      }),
      expect.objectContaining({
        body: expect.objectContaining({ cursor: 'cursor-page-1' }),
      }),
    ])

    const rawPayloadResponse = await app.request(
      '/api/raw/plaid?itemId=item-paged&includeResponses=true',
    )
    const rawPayload = (await rawPayloadResponse.json()) as {
      evidence: Array<{
        counts: { addedTransactions: number }
        responses?: { transactions?: { syncBatches?: number } }
      }>
    }
    expect(rawPayload.evidence[0]).toEqual(
      expect.objectContaining({
        counts: expect.objectContaining({ addedTransactions: 2 }),
        responses: expect.objectContaining({
          transactions: expect.objectContaining({ syncBatches: 2 }),
        }),
      }),
    )
  })

  it('reports post-Link verification blockers before connection and sync', async () => {
    const response = await app.request('/api/plaid/connection-check')
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      ok: boolean
      checks: Array<{ id: string; ok: boolean }>
      counts: { connections: number; accounts: number; transactions: number }
    }

    expect(body.ok).toBe(false)
    expect(body.counts).toEqual(
      expect.objectContaining({
        connections: 0,
        accounts: 0,
        transactions: 0,
      }),
    )
    expect(body.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'plaid_connection', ok: false }),
        expect.objectContaining({ id: 'accounts_imported', ok: false }),
        expect.objectContaining({ id: 'transactions_imported', ok: false }),
      ]),
    )
  })

  it('flags requested optional Plaid products when normalized facts are missing', async () => {
    await fs.writeFile(
      path.join(dataDir, 'connections.json'),
      JSON.stringify([
        {
          itemId: 'item-optional-gap',
          credentialRef: 'plaid:item:item-optional-gap',
          institutionId: 'ins_optional_gap',
          institutionName: 'Optional Gap Bank',
          status: 'connected',
          products: ['transactions', 'liabilities', 'investments'],
          connectedAt: '2026-06-03T00:00:00.000Z',
          lastSyncAt: '2026-06-03T01:00:00.000Z',
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'accounts.json'),
      JSON.stringify([
        {
          id: 'optional-gap-account',
          source: 'plaid',
          itemId: 'item-optional-gap',
          name: 'Checking',
          type: 'cash',
          currentBalance: 100,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03T01:00:00.000Z',
        },
      ]),
    )
    await fs.mkdir(path.join(dataDir, 'transactions'), { recursive: true })
    await fs.writeFile(
      path.join(dataDir, 'transactions', '2026-06.json'),
      JSON.stringify([
        {
          id: 'optional-gap-transaction',
          source: 'plaid',
          itemId: 'item-optional-gap',
          accountId: 'optional-gap-account',
          name: 'Synthetic Expense',
          amount: 25,
          direction: 'expense',
          category: ['Testing'],
          date: '2026-06-03',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
      ]),
    )

    const healthResponse = await app.request('/api/data-health')
    expect(healthResponse.status).toBe(200)
    const health = (await healthResponse.json()) as {
      providerProducts: {
        products: {
          liabilities: {
            requestedItems: number
            importedFacts: number
            missingItems: number
          }
          investments: {
            requestedItems: number
            importedFacts: number
            missingItems: number
          }
        }
      }
      nextActions: Array<{
        action: string
        rpc: string
        params?: { products?: string[] }
      }>
      warnings: string[]
    }

    expect(health.providerProducts.products.liabilities).toEqual({
      requestedItems: 1,
      importedFacts: 0,
      missingItems: 1,
    })
    expect(health.providerProducts.products.investments).toEqual({
      requestedItems: 1,
      importedFacts: 0,
      missingItems: 1,
    })
    expect(health.warnings).toEqual(
      expect.arrayContaining([
        'connected_liabilities_missing_debts',
        'connected_investments_missing_holdings',
      ]),
    )
    expect(health.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'verify-plaid-optional-products',
          rpc: 'money.sync.history',
          params: { products: ['liabilities', 'investments'] },
        }),
      ]),
    )
  })

  it('suggests optional Plaid products when linked account types imply missing detail feeds', async () => {
    await fs.writeFile(
      path.join(dataDir, 'connections.json'),
      JSON.stringify([
        {
          itemId: 'item-product-hint',
          credentialRef: 'plaid:item:item-product-hint',
          institutionId: 'ins_product_hint',
          institutionName: 'Product Hint Bank',
          status: 'connected',
          products: ['transactions'],
          connectedAt: '2026-06-03T00:00:00.000Z',
          lastSyncAt: '2026-06-03T01:00:00.000Z',
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'accounts.json'),
      JSON.stringify([
        {
          id: 'product-hint-mortgage',
          source: 'plaid',
          itemId: 'item-product-hint',
          name: 'Mortgage',
          type: 'mortgage',
          subtype: 'mortgage',
          currentBalance: -250000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03T01:00:00.000Z',
        },
        {
          id: 'product-hint-retirement',
          source: 'plaid',
          itemId: 'item-product-hint',
          name: 'Retirement',
          type: 'other',
          subtype: 'ira',
          currentBalance: 50000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03T01:00:00.000Z',
        },
      ]),
    )
    await fs.mkdir(path.join(dataDir, 'transactions'), { recursive: true })
    await fs.writeFile(
      path.join(dataDir, 'transactions', '2026-06.json'),
      JSON.stringify([
        {
          id: 'product-hint-transaction',
          source: 'plaid',
          itemId: 'item-product-hint',
          accountId: 'product-hint-mortgage',
          name: 'Synthetic Payment',
          amount: 1000,
          direction: 'expense',
          category: ['Testing'],
          date: '2026-06-03',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
      ]),
    )
    await fs.mkdir(path.join(dataDir, 'raw', 'plaid', 'item-product-hint'), {
      recursive: true,
    })
    await fs.writeFile(
      path.join(dataDir, 'raw', 'plaid', 'item-product-hint', 'evidence.json'),
      JSON.stringify({
        id: 'evidence',
        itemId: 'item-product-hint',
        institutionName: 'Product Hint Bank',
        generatedAt: '2026-06-03T01:00:00.000Z',
        trigger: 'manual',
        products: ['transactions'],
        hasMore: false,
        counts: {
          accounts: 2,
          addedTransactions: 1,
          modifiedTransactions: 0,
          removedTransactions: 0,
          debts: 0,
          holdings: 0,
        },
      }),
    )

    const healthResponse = await app.request('/api/data-health')
    expect(healthResponse.status).toBe(200)
    const health = (await healthResponse.json()) as {
      providerProducts: {
        accountHints: {
          liabilities: {
            accountCount: number
            itemCount: number
            itemAccountCounts: Record<string, number>
            missingProductItems: number
            missingItemIds: string[]
          }
          investments: {
            accountCount: number
            itemCount: number
            itemAccountCounts: Record<string, number>
            missingProductItems: number
            missingItemIds: string[]
          }
        }
      }
      nextActions: Array<{
        action: string
        rpc: string
        params?: {
          itemId?: string
          itemIds?: string[]
          additionalConsentedProducts?: string[]
          sessions?: Array<{
            itemId: string
            additionalConsentedProducts: string[]
          }>
        }
        items?: Array<{
          itemId: string
          additionalConsentedProducts: string[]
          accountHints: { liabilities: number; investments: number }
          reason: string
        }>
      }>
      warnings: string[]
    }
    expect(health.providerProducts.accountHints.liabilities).toEqual(
      expect.objectContaining({
        accountCount: 1,
        itemCount: 1,
        itemAccountCounts: { 'item-product-hint': 1 },
        missingProductItems: 1,
        missingItemIds: ['item-product-hint'],
      }),
    )
    expect(health.providerProducts.accountHints.investments).toEqual(
      expect.objectContaining({
        accountCount: 1,
        itemCount: 1,
        itemAccountCounts: { 'item-product-hint': 1 },
        missingProductItems: 1,
        missingItemIds: ['item-product-hint'],
      }),
    )
    expect(health.warnings).toEqual(
      expect.arrayContaining([
        'linked_liability_accounts_missing_liabilities_product',
        'linked_investment_accounts_missing_investments_product',
      ]),
    )
    expect(health.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'update-plaid-item-consent',
          rpc: 'money.plaid.connectSessions',
          params: expect.objectContaining({
            itemIds: ['item-product-hint'],
            additionalConsentedProducts: ['liabilities', 'investments'],
            sessions: [
              {
                itemId: 'item-product-hint',
                additionalConsentedProducts: ['liabilities', 'investments'],
              },
            ],
          }),
          items: [
            expect.objectContaining({
              itemId: 'item-product-hint',
              additionalConsentedProducts: ['liabilities', 'investments'],
              accountHints: { liabilities: 1, investments: 1 },
              reason: expect.stringContaining('debt-like account'),
            }),
          ],
        }),
      ]),
    )

    const syncStatusResponse = await app.request('/api/sync/status')
    expect(syncStatusResponse.status).toBe(200)
    const syncStatus = (await syncStatusResponse.json()) as {
      items: Array<{
        productCoverage: {
          liabilities: {
            requested: boolean
            suggestedByAccounts: boolean
            suggestedAccountCount: number
          }
          investments: {
            requested: boolean
            suggestedByAccounts: boolean
            suggestedAccountCount: number
          }
        }
        warnings: string[]
        nextAction?: {
          action: string
          rpc?: string
          product?: string
          products?: string[]
          params?: Record<string, unknown>
        }
        nextActions?: Array<{
          action: string
          rpc?: string
          product?: string
          products?: string[]
          params?: Record<string, unknown>
        }>
      }>
      nextActions: Array<{
        action: string
        rpc?: string
        product?: string
        products?: string[]
      }>
    }
    expect(syncStatus.items[0]).toEqual(
      expect.objectContaining({
        productCoverage: expect.objectContaining({
          liabilities: expect.objectContaining({
            requested: false,
            suggestedByAccounts: true,
            suggestedAccountCount: 1,
          }),
          investments: expect.objectContaining({
            requested: false,
            suggestedByAccounts: true,
            suggestedAccountCount: 1,
          }),
        }),
        warnings: expect.arrayContaining([
          'Linked debt-like accounts are present, but the liabilities product was not requested.',
          'Linked investment-like accounts are present, but the investments product was not requested.',
        ]),
        nextAction: expect.objectContaining({
          action: 'relink-with-optional-products',
          rpc: 'money.plaid.connectSession',
          products: ['liabilities', 'investments'],
          params: {
            itemId: 'item-product-hint',
            additionalConsentedProducts: ['liabilities', 'investments'],
          },
        }),
        nextActions: [
          expect.objectContaining({
            action: 'relink-with-optional-products',
            rpc: 'money.plaid.connectSession',
            products: ['liabilities', 'investments'],
            params: {
              itemId: 'item-product-hint',
              additionalConsentedProducts: ['liabilities', 'investments'],
            },
          }),
        ],
      }),
    )
    expect(syncStatus.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'relink-with-optional-products',
          rpc: 'money.plaid.connectSession',
          products: ['liabilities', 'investments'],
        }),
      ]),
    )

    const connectionsResponse = await app.request('/api/connections')
    expect(connectionsResponse.status).toBe(200)
    const connections = (await connectionsResponse.json()) as Array<{
      itemId: string
      nextActions?: Array<{
        action: string
        rpc?: string
        products?: string[]
        params?: { additionalConsentedProducts?: string[] }
      }>
    }>
    expect(connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: 'item-product-hint',
          nextActions: [
            expect.objectContaining({
              action: 'relink-with-optional-products',
              rpc: 'money.plaid.connectSession',
              products: ['liabilities', 'investments'],
              params: expect.objectContaining({
                additionalConsentedProducts: ['liabilities', 'investments'],
              }),
            }),
          ],
        }),
      ]),
    )

    const cardReadinessResponse = await app.request(
      '/api/cards/readiness?ids=debt-payoff-optimizer,investment-trend',
    )
    expect(cardReadinessResponse.status).toBe(200)
    const cardReadiness = (await cardReadinessResponse.json()) as {
      cards: Array<{
        id: string
        status: string
        nextActions?: Array<{
          action: string
          rpc: string
          product?: string
          params?: {
            itemId?: string
            itemIds?: string[]
            additionalConsentedProducts?: string[]
          }
        }>
      }>
    }
    expect(cardReadiness.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'debt-payoff-optimizer',
          status: 'empty',
          nextActions: expect.arrayContaining([
            expect.objectContaining({
              action: 'relink-plaid-liabilities',
              rpc: 'money.plaid.connectSession',
              product: 'liabilities',
              params: {
                itemId: 'item-product-hint',
                itemIds: ['item-product-hint'],
                additionalConsentedProducts: ['liabilities'],
              },
            }),
            expect.objectContaining({
              action: 'patch-debt-metadata',
              rpc: 'money.debts.patch',
              paramsTemplate: expect.objectContaining({
                id: '<debt-or-account-id>',
                apr: 0.12,
              }),
            }),
          ]),
        }),
        expect.objectContaining({
          id: 'investment-trend',
          status: 'ready',
        }),
      ]),
    )
  })

  it('passes post-Link verification after connection, sync facts, and raw evidence', async () => {
    await fs.writeFile(
      path.join(dataDir, 'connections.json'),
      JSON.stringify([
        {
          itemId: 'item-check',
          credentialRef: 'plaid:item:item-check',
          institutionId: 'ins_check',
          institutionName: 'Check Bank',
          status: 'connected',
          products: ['transactions', 'liabilities', 'investments'],
          connectedAt: '2026-06-03T00:00:00.000Z',
          lastSyncAt: '2026-06-03T01:00:00.000Z',
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'accounts.json'),
      JSON.stringify([
        {
          id: 'check-account',
          source: 'plaid',
          itemId: 'item-check',
          name: 'Checking',
          type: 'cash',
          currentBalance: 100,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03T01:00:00.000Z',
        },
      ]),
    )
    await fs.mkdir(path.join(dataDir, 'transactions'), { recursive: true })
    await fs.writeFile(
      path.join(dataDir, 'transactions', '2026-06.json'),
      JSON.stringify([
        {
          id: 'check-transaction',
          source: 'plaid',
          itemId: 'item-check',
          accountId: 'check-account',
          name: 'Coffee',
          amount: 5,
          direction: 'expense',
          category: ['Food and Drink'],
          date: '2026-06-03',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'debts.json'),
      JSON.stringify([
        {
          id: 'check-debt',
          source: 'plaid',
          itemId: 'item-check',
          name: 'Credit Card',
          type: 'credit',
          balance: 250,
          updatedAt: '2026-06-03T01:00:00.000Z',
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'holdings.json'),
      JSON.stringify([
        {
          id: 'check-holding',
          source: 'plaid',
          itemId: 'item-check',
          name: 'ETF',
          quantity: 2,
          price: 50,
          marketValue: 100,
          asOf: '2026-06-03T01:00:00.000Z',
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'sync-state.json'),
      JSON.stringify({
        generatedAt: '2026-06-03T01:00:00.000Z',
        status: 'idle',
        lastSyncAt: '2026-06-03T01:00:00.000Z',
        itemCursors: { 'item-check': 'cursor-check' },
      }),
    )
    await fs.mkdir(path.join(dataDir, 'raw', 'plaid', 'item-check'), {
      recursive: true,
    })
    await fs.writeFile(
      path.join(dataDir, 'raw', 'plaid', 'item-check', 'evidence.json'),
      JSON.stringify({
        id: 'evidence',
        itemId: 'item-check',
        institutionName: 'Check Bank',
        generatedAt: '2026-06-03T01:00:00.000Z',
        trigger: 'manual',
        products: ['transactions', 'liabilities', 'investments'],
        hasMore: false,
        counts: {
          accounts: 1,
          addedTransactions: 1,
          modifiedTransactions: 0,
          removedTransactions: 0,
          debts: 1,
          holdings: 1,
        },
        responses: {},
      }),
    )

    const response = await app.request('/api/plaid/connection-check')
    expect(response.status).toBe(200)
    const bodyText = await response.text()
    expect(bodyText).not.toContain('access-production')
    const body = JSON.parse(bodyText) as {
      ok: boolean
      checks: Array<{ id: string; ok: boolean }>
      counts: {
        connections: number
        accounts: number
        transactions: number
        debts: number
        holdings: number
        rawEvidence: number
      }
    }

    expect(body.ok).toBe(true)
    expect(body.counts).toEqual(
      expect.objectContaining({
        connections: 1,
        accounts: 1,
        transactions: 1,
        debts: 1,
        holdings: 1,
        rawEvidence: 1,
      }),
    )
    expect(body.checks.every((check) => check.ok)).toBe(true)
  })

  it('persists scheduled sync settings and skips run-due when nothing is active', async () => {
    const settingsResponse = await app.request('/api/sync/settings')
    expect(settingsResponse.status).toBe(200)
    const settings = (await settingsResponse.json()) as {
      settings: {
        sync: { scheduledRefreshEnabled: boolean; intervalMinutes: number }
      }
      due: boolean
      reason: string
    }
    expect(settings).toEqual(
      expect.objectContaining({
        due: false,
        reason: 'scheduled_refresh_disabled',
      }),
    )
    expect(settings.settings.sync).toEqual(
      expect.objectContaining({
        scheduledRefreshEnabled: false,
        intervalMinutes: 360,
      }),
    )

    const patchResponse = await app.request('/api/sync/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scheduledRefreshEnabled: true,
        intervalMinutes: 60,
      }),
    })
    expect(patchResponse.status).toBe(200)
    const patched = (await patchResponse.json()) as {
      settings: {
        sync: { scheduledRefreshEnabled: boolean; intervalMinutes: number }
      }
      due: boolean
      reason: string
    }
    expect(patched.settings.sync).toEqual(
      expect.objectContaining({
        scheduledRefreshEnabled: true,
        intervalMinutes: 60,
      }),
    )
    expect(patched.due).toBe(false)
    expect(patched.reason).toBe('no_active_connections')

    const runDueResponse = await app.request('/api/sync/run-due', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(runDueResponse.status).toBe(200)
    const runDue = (await runDueResponse.json()) as {
      skipped: boolean
      reason: string
    }
    expect(runDue).toEqual(
      expect.objectContaining({
        skipped: true,
        reason: 'no_active_connections',
      }),
    )
  })

  it('runs scheduled sync when due and advances the next scheduled run', async () => {
    const fakeAivaultPath = path.join(dataDir, 'fake-aivault-scheduled.mjs')
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        'const capability = process.argv.find((arg) => arg.startsWith("plaid/"))',
        'let result = {}',
        'if (capability === "plaid/accounts-sync") {',
        '  result = { accounts: [{ account_id: "acc-checking", name: "Checking", type: "depository", subtype: "checking", balances: { current: 2500, iso_currency_code: "USD" } }] }',
        '} else if (capability === "plaid/transactions-sync") {',
        '  result = { added: [{ transaction_id: "tx-payroll", account_id: "acc-checking", name: "Payroll", amount: -3000, date: "2026-06-03", iso_currency_code: "USD", pending: false, personal_finance_category: { primary: "INCOME", detailed: "INCOME_WAGES" } }], modified: [], removed: [], next_cursor: "scheduled-cursor", has_more: false }',
        '} else {',
        '  process.stderr.write(`unexpected capability ${capability}`)',
        '  process.exit(2)',
        '}',
        'process.stdout.write(JSON.stringify({ response: { json: { result } } }))',
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath

    await fs.writeFile(
      path.join(dataDir, 'connections.json'),
      JSON.stringify([
        {
          itemId: 'item-scheduled',
          credentialRef: 'plaid:item:item-scheduled',
          institutionId: 'ins_scheduled',
          institutionName: 'Scheduled Bank',
          status: 'connected',
          products: ['transactions'],
          connectedAt: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'settings.json'),
      JSON.stringify({
        sync: {
          scheduledRefreshEnabled: true,
          intervalMinutes: 60,
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
      }),
    )
    await fs.writeFile(
      path.join(dataDir, 'sync-state.json'),
      JSON.stringify({
        generatedAt: '2026-06-03T00:00:00.000Z',
        lastSyncAt: '2026-06-03T00:00:00.000Z',
        nextScheduledRunAt: '2026-06-03T01:00:00.000Z',
        status: 'idle',
        itemCursors: {},
      }),
    )

    const statusResponse = await app.request('/api/sync/settings')
    const status = (await statusResponse.json()) as {
      due: boolean
      reason: string
    }
    expect(status.due).toBe(true)
    expect(status.reason).toBe('due')

    const runDueResponse = await app.request('/api/sync/run-due', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(runDueResponse.status).toBe(200)
    const runDue = (await runDueResponse.json()) as {
      skipped: boolean
      syncedConnections: number
      rawEvidence: number
      syncState: {
        itemCursors: Record<string, string>
        lastTrigger?: string
        lastScheduledRunAt?: string
        nextScheduledRunAt?: string
      }
    }
    expect(runDue.skipped).toBe(false)
    expect(runDue.syncedConnections).toBe(1)
    expect(runDue.rawEvidence).toBe(1)
    expect(runDue.syncState.itemCursors).toEqual({
      'item-scheduled': 'scheduled-cursor',
    })
    expect(runDue.syncState.lastTrigger).toBe('scheduled')
    expect(runDue.syncState.lastScheduledRunAt).toBeTruthy()
    expect(runDue.syncState.nextScheduledRunAt).toBeTruthy()

    const secondRunResponse = await app.request('/api/sync/run-due', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(secondRunResponse.status).toBe(200)
    const secondRun = (await secondRunResponse.json()) as {
      skipped: boolean
      reason: string
    }
    expect(secondRun).toEqual(
      expect.objectContaining({
        skipped: true,
        reason: 'waiting_for_next_scheduled_run',
      }),
    )
  })

  it('syncs optional Plaid liabilities and investments into normalized endpoints', async () => {
    const fakeAivaultPath = path.join(dataDir, 'fake-aivault-sync.mjs')
    const fakeAivaultLogPath = path.join(
      dataDir,
      'fake-aivault-sync-args.jsonl',
    )
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        'import fs from "node:fs"',
        `fs.appendFileSync(${JSON.stringify(fakeAivaultLogPath)}, JSON.stringify(process.argv) + "\\n")`,
        'const capability = process.argv.find((arg) => arg.startsWith("plaid/"))',
        'let result = {}',
        'if (capability === "plaid/accounts-sync") {',
        '  result = { accounts: [',
        '    { account_id: "acc-credit", name: "Rewards Card", type: "credit", subtype: "credit card", balances: { current: 1234, iso_currency_code: "USD" } },',
        '    { account_id: "acc-invest", name: "Brokerage", type: "investment", subtype: "brokerage", balances: { current: 5000, iso_currency_code: "USD" } }',
        '  ] }',
        '} else if (capability === "plaid/transactions-sync") {',
        '  result = { added: [], modified: [], removed: [], next_cursor: "cursor-1", has_more: false }',
        '} else if (capability === "plaid/liabilities-sync") {',
        '  result = { liabilities: { credit: [{ account_id: "acc-credit", aprs: [{ apr_percentage: 22.5 }], minimum_payment_amount: 35, next_payment_due_date: "2026-07-01", is_overdue: false }] } }',
        '} else if (capability === "plaid/investments-sync") {',
        '  result = { holdings: [{ account_id: "acc-invest", security_id: "sec-1", quantity: 10, institution_price: 123.45, institution_value: 1234.5, iso_currency_code: "USD" }], securities: [{ security_id: "sec-1", name: "Example ETF", ticker_symbol: "ETF", type: "etf" }] }',
        '} else {',
        '  process.stderr.write(`unexpected capability ${capability}`)',
        '  process.exit(2)',
        '}',
        'process.stdout.write(JSON.stringify({ response: { json: { result } } }))',
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath

    await fs.writeFile(
      path.join(dataDir, 'connections.json'),
      JSON.stringify([
        {
          itemId: 'item-sync',
          credentialRef: 'plaid:item:item-sync',
          institutionId: 'ins_sync',
          institutionName: 'Sync Bank',
          status: 'error',
          products: ['transactions', 'liabilities', 'investments'],
          connectedAt: '2026-06-03T00:00:00.000Z',
          lastError: 'previous transient sync failure',
        },
      ]),
    )

    const syncResponse = await app.request('/api/sync', {
      method: 'POST',
      headers: { 'x-moldable-workspace': 'personal' },
    })
    expect(syncResponse.status).toBe(200)
    const syncBody = (await syncResponse.json()) as {
      ok: boolean
      debts: number
      holdings: number
      accounts: number
      transactions: number
      rawEvidence: number
    }
    expect(syncBody).toEqual(
      expect.objectContaining({
        ok: true,
        accounts: 2,
        transactions: 0,
        debts: 1,
        holdings: 1,
        rawEvidence: 1,
      }),
    )

    const connectionBody = JSON.parse(
      await fs.readFile(path.join(dataDir, 'connections.json'), 'utf8'),
    ) as Array<{ status: string; lastError?: string }>
    expect(connectionBody[0]?.status).toBe('connected')
    expect(connectionBody[0]?.lastError).toBeUndefined()

    const fakeAivaultCalls = (await fs.readFile(fakeAivaultLogPath, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as string[])
    expect(fakeAivaultCalls.length).toBeGreaterThanOrEqual(4)
    for (const call of fakeAivaultCalls) {
      expect(call).toEqual(
        expect.arrayContaining(['--workspace-id', 'personal']),
      )
    }

    const rawSummaryResponse = await app.request('/api/raw/plaid')
    expect(rawSummaryResponse.status).toBe(200)
    const rawSummary = (await rawSummaryResponse.json()) as {
      total: number
      evidence: Array<{
        itemId: string
        institutionName: string
        counts: { accounts: number; debts: number; holdings: number }
        responses?: unknown
      }>
    }
    expect(rawSummary.total).toBe(1)
    expect(rawSummary.evidence[0]).toEqual(
      expect.objectContaining({
        itemId: 'item-sync',
        institutionName: 'Sync Bank',
        counts: expect.objectContaining({
          accounts: 2,
          debts: 1,
          holdings: 1,
        }),
      }),
    )
    expect(rawSummary.evidence[0]?.responses).toBeUndefined()

    const syncStatusResponse = await app.request('/api/sync/status')
    expect(syncStatusResponse.status).toBe(200)
    const syncStatus = (await syncStatusResponse.json()) as {
      counts: {
        connections: number
        accounts: number
        transactions: number
        debts: number
        holdings: number
        rawEvidence: number
      }
      backfill: { transactionBackfillMode: string; limitation: string }
      items: Array<{
        itemId: string
        status: string
        cursor?: string
        hasCredentialRef: boolean
        counts: {
          accounts: number
          debts: number
          holdings: number
          rawEvidence: number
        }
        productCoverage: {
          liabilities: { requested: boolean; imported: boolean; count: number }
          investments: { requested: boolean; imported: boolean; count: number }
        }
        lastEvidence?: {
          counts: { accounts: number; debts: number; holdings: number }
        }
        warnings: string[]
        nextAction?: { action: string; product?: string; rpc: string }
        credentialRef?: string
      }>
      nextActions: Array<{
        action: string
        product?: string
        rpc: string
        count: number
      }>
      recentEvidence: Array<{ responses?: unknown }>
    }
    expect(syncStatus.counts).toEqual(
      expect.objectContaining({
        connections: 1,
        accounts: 2,
        transactions: 0,
        debts: 1,
        holdings: 1,
        rawEvidence: 1,
      }),
    )
    expect(syncStatus.backfill).toEqual(
      expect.objectContaining({
        transactionBackfillMode: 'plaid-sync-cursor',
        limitation: expect.stringContaining('stored cursor'),
      }),
    )
    expect(syncStatus.items).toEqual([
      expect.objectContaining({
        itemId: 'item-sync',
        status: 'connected',
        cursor: 'cursor-1',
        hasCredentialRef: true,
        counts: expect.objectContaining({
          accounts: 2,
          debts: 1,
          holdings: 1,
          rawEvidence: 1,
        }),
        productCoverage: expect.objectContaining({
          liabilities: expect.objectContaining({
            requested: true,
            imported: true,
            count: 1,
          }),
          investments: expect.objectContaining({
            requested: true,
            imported: true,
            count: 1,
          }),
        }),
        lastEvidence: expect.objectContaining({
          counts: expect.objectContaining({
            accounts: 2,
            debts: 1,
            holdings: 1,
          }),
        }),
        warnings: [
          'Transactions product is connected but no transaction facts are imported.',
        ],
        nextAction: expect.objectContaining({
          action: 'verify-transaction-backfill',
          product: 'transactions',
          rpc: 'money.sync.history',
        }),
      }),
    ])
    expect(syncStatus.nextActions).toEqual([
      expect.objectContaining({
        action: 'verify-transaction-backfill',
        product: 'transactions',
        rpc: 'money.sync.history',
        count: 1,
      }),
    ])
    expect(syncStatus.items[0]?.credentialRef).toBeUndefined()
    expect(syncStatus.recentEvidence[0]?.responses).toBeUndefined()

    const syncHistoryResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.sync.history' }),
    })
    expect(syncHistoryResponse.status).toBe(200)
    const syncHistory = (await syncHistoryResponse.json()) as {
      ok: boolean
      result: { items: Array<{ itemId: string }> }
    }
    expect(syncHistory.ok).toBe(true)
    expect(syncHistory.result.items).toEqual([
      expect.objectContaining({ itemId: 'item-sync' }),
    ])

    const rawPayloadResponse = await app.request(
      '/api/raw/plaid?itemId=item-sync&includeResponses=true',
    )
    expect(rawPayloadResponse.status).toBe(200)
    const rawPayload = (await rawPayloadResponse.json()) as {
      evidence: Array<{
        responses?: { investments?: unknown; liabilities?: unknown }
      }>
    }
    expect(rawPayload.evidence[0]?.responses).toEqual(
      expect.objectContaining({
        liabilities: expect.any(Object),
        investments: expect.any(Object),
      }),
    )

    const debtsResponse = await app.request('/api/debts')
    expect(debtsResponse.status).toBe(200)
    const debtsBody = (await debtsResponse.json()) as {
      total: number
      debts: Array<{ name: string; balance: number; apr?: number }>
    }
    expect(debtsBody.total).toBe(1)
    expect(debtsBody.debts[0]).toEqual(
      expect.objectContaining({
        name: 'Rewards Card',
        balance: 1234,
        apr: 22.5,
      }),
    )

    const holdingsResponse = await app.request('/api/holdings')
    expect(holdingsResponse.status).toBe(200)
    const holdingsBody = (await holdingsResponse.json()) as {
      total: number
      holdings: Array<{
        name: string
        tickerSymbol?: string
        marketValue: number
        assetClass?: string
      }>
    }
    expect(holdingsBody.total).toBe(1)
    expect(holdingsBody.holdings[0]).toEqual(
      expect.objectContaining({
        name: 'Example ETF',
        tickerSymbol: 'ETF',
        marketValue: 1234.5,
        assetClass: 'funds',
      }),
    )
  })

  it('syncs one Plaid connection at a time by item id', async () => {
    const fakeAivaultPath = path.join(
      dataDir,
      'fake-aivault-connection-sync.mjs',
    )
    const fakeAivaultLogPath = path.join(
      dataDir,
      'fake-aivault-connection-sync.jsonl',
    )
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        'import fs from "node:fs"',
        'const args = process.argv.slice(2)',
        'const capability = args.find((arg) => arg.startsWith("plaid/"))',
        'const bodyIndex = args.indexOf("--body")',
        'const body = bodyIndex === -1 ? {} : JSON.parse(args[bodyIndex + 1])',
        `fs.appendFileSync(${JSON.stringify(fakeAivaultLogPath)}, JSON.stringify({ capability, body }) + "\\n")`,
        'const itemId = String(body.credentialRef ?? "").replace("plaid:item:", "")',
        'let result = {}',
        'if (capability === "plaid/accounts-sync") {',
        '  result = { accounts: [{ account_id: `acc-${itemId}`, name: `${itemId} Checking`, type: "depository", subtype: "checking", balances: { current: itemId === "item-alpha" ? 1000 : 2000, iso_currency_code: "USD" } }] }',
        '} else if (capability === "plaid/transactions-sync") {',
        '  result = { added: [{ transaction_id: `tx-${itemId}`, account_id: `acc-${itemId}`, name: `${itemId} Spend`, amount: itemId === "item-alpha" ? 10 : 20, date: "2026-06-03", iso_currency_code: "USD", pending: false, personal_finance_category: { primary: "GENERAL_MERCHANDISE", detailed: "GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE" } }], modified: [], removed: [], next_cursor: `cursor-${itemId}`, has_more: false }',
        '} else {',
        '  process.stderr.write(`unexpected capability ${capability}`)',
        '  process.exit(2)',
        '}',
        'process.stdout.write(JSON.stringify({ response: { json: { result } } }))',
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath

    await fs.writeFile(
      path.join(dataDir, 'connections.json'),
      JSON.stringify([
        {
          itemId: 'item-alpha',
          credentialRef: 'plaid:item:item-alpha',
          institutionId: 'ins_alpha',
          institutionName: 'Alpha Bank',
          status: 'connected',
          products: ['transactions'],
          connectedAt: '2026-06-03T00:00:00.000Z',
        },
        {
          itemId: 'item-beta',
          credentialRef: 'plaid:item:item-beta',
          institutionId: 'ins_beta',
          institutionName: 'Beta Bank',
          status: 'connected',
          products: ['transactions'],
          connectedAt: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )

    const connectionsResponse = await app.request('/api/connections')
    expect(connectionsResponse.status).toBe(200)
    const connectionText = await connectionsResponse.text()
    expect(connectionText).not.toContain('plaid:item:item-alpha')
    const connectionList = JSON.parse(connectionText) as Array<{
      itemId: string
      institutionName: string
      status: string
      hasCredentialRef: boolean
      cursor?: string
    }>
    expect(connectionList).toEqual([
      expect.objectContaining({
        itemId: 'item-alpha',
        institutionName: 'Alpha Bank',
        status: 'connected',
        hasCredentialRef: true,
      }),
      expect.objectContaining({
        itemId: 'item-beta',
        institutionName: 'Beta Bank',
        status: 'connected',
        hasCredentialRef: true,
      }),
    ])

    const listRpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'money.connections.list' }),
    })
    expect(listRpcResponse.status).toBe(200)
    const listRpcText = await listRpcResponse.text()
    expect(listRpcText).not.toContain('plaid:item:item-alpha')
    const listRpc = JSON.parse(listRpcText) as {
      ok: boolean
      result: { total: number; connections: Array<{ itemId: string }> }
    }
    expect(listRpc.ok).toBe(true)
    expect(listRpc.result.total).toBe(2)
    expect(
      listRpc.result.connections.map((connection) => connection.itemId),
    ).toEqual(['item-alpha', 'item-beta'])

    const missingResponse = await app.request(
      '/api/connections/item-missing/sync',
      {
        method: 'POST',
      },
    )
    expect(missingResponse.status).toBe(404)
    await expect(missingResponse.json()).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'connection_not_found' }),
      }),
    )

    const alphaResponse = await app.request(
      '/api/connections/item-alpha/sync',
      {
        method: 'POST',
        headers: { 'x-moldable-workspace': 'personal' },
      },
    )
    expect(alphaResponse.status).toBe(200)
    const alphaBody = (await alphaResponse.json()) as {
      ok: boolean
      syncedConnections: number
      accounts: number
      transactions: number
      syncState: { itemCursors: Record<string, string> }
    }
    expect(alphaBody).toEqual(
      expect.objectContaining({
        ok: true,
        syncedConnections: 1,
        accounts: 1,
        transactions: 1,
      }),
    )
    expect(alphaBody.syncState.itemCursors).toEqual({
      'item-alpha': 'cursor-item-alpha',
    })

    const afterAlphaAccounts = (await (
      await app.request('/api/accounts')
    ).json()) as {
      accounts: Array<{ id: string; itemId?: string }>
    }
    expect(
      afterAlphaAccounts.accounts.map((account) => account.itemId),
    ).toEqual(['item-alpha'])

    const afterAlphaConnections = JSON.parse(
      await fs.readFile(path.join(dataDir, 'connections.json'), 'utf8'),
    ) as Array<{ itemId: string; lastSyncAt?: string }>
    expect(
      afterAlphaConnections.find(
        (connection) => connection.itemId === 'item-alpha',
      )?.lastSyncAt,
    ).toBeTruthy()
    expect(
      afterAlphaConnections.find(
        (connection) => connection.itemId === 'item-beta',
      )?.lastSyncAt,
    ).toBeUndefined()

    const betaRpcResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.connections.sync',
        params: { itemId: 'item-beta' },
      }),
    })
    expect(betaRpcResponse.status).toBe(200)
    const betaRpc = (await betaRpcResponse.json()) as {
      ok: boolean
      result: {
        ok: boolean
        syncedConnections: number
        accounts: number
        transactions: number
        syncState: { itemCursors: Record<string, string> }
      }
    }
    expect(betaRpc.ok).toBe(true)
    expect(betaRpc.result).toEqual(
      expect.objectContaining({
        ok: true,
        syncedConnections: 1,
        accounts: 2,
        transactions: 2,
      }),
    )
    expect(betaRpc.result.syncState.itemCursors).toEqual({
      'item-alpha': 'cursor-item-alpha',
      'item-beta': 'cursor-item-beta',
    })

    const calls = (await fs.readFile(fakeAivaultLogPath, 'utf8'))
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            capability: string
            body: { credentialRef?: string; cursor?: string }
          },
      )
    expect(calls).toEqual([
      expect.objectContaining({
        capability: 'plaid/accounts-sync',
        body: expect.objectContaining({
          credentialRef: 'plaid:item:item-alpha',
        }),
      }),
      expect.objectContaining({
        capability: 'plaid/transactions-sync',
        body: expect.objectContaining({
          credentialRef: 'plaid:item:item-alpha',
        }),
      }),
      expect.objectContaining({
        capability: 'plaid/accounts-sync',
        body: expect.objectContaining({
          credentialRef: 'plaid:item:item-beta',
        }),
      }),
      expect.objectContaining({
        capability: 'plaid/transactions-sync',
        body: expect.objectContaining({
          credentialRef: 'plaid:item:item-beta',
        }),
      }),
    ])
  })

  it('revokes a connection before removing local item facts', async () => {
    const fakeAivaultPath = path.join(dataDir, 'fake-aivault.mjs')
    const fakeAivaultLogPath = `${fakeAivaultPath}.log`
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        "import fs from 'node:fs'",
        'fs.writeFileSync(`${process.argv[1]}.log`, JSON.stringify(process.argv.slice(2)))',
        'process.stdout.write(JSON.stringify({ response: { json: { removed: true } } }))',
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath

    await fs.writeFile(
      path.join(dataDir, 'connections.json'),
      JSON.stringify([
        {
          itemId: 'item-delete',
          credentialRef: 'plaid:item:item-delete',
          institutionId: 'ins_delete',
          institutionName: 'Delete Bank',
          status: 'connected',
          products: ['transactions'],
          connectedAt: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'accounts.json'),
      JSON.stringify([
        {
          id: 'delete-account',
          source: 'plaid',
          itemId: 'item-delete',
          name: 'Checking',
          type: 'cash',
          currentBalance: 100,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03T00:00:00.000Z',
        },
        {
          id: 'keep-account',
          source: 'manual',
          name: 'Cash',
          type: 'cash',
          currentBalance: 50,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )
    await fs.mkdir(path.join(dataDir, 'transactions'), { recursive: true })
    await fs.writeFile(
      path.join(dataDir, 'transactions', '2026-06.json'),
      JSON.stringify([
        {
          id: 'delete-transaction',
          source: 'plaid',
          itemId: 'item-delete',
          name: 'Deleted Item Spend',
          amount: 10,
          direction: 'expense',
          category: ['Test'],
          date: '2026-06-03',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
        {
          id: 'keep-transaction',
          source: 'manual',
          name: 'Kept Spend',
          amount: 5,
          direction: 'expense',
          category: ['Test'],
          date: '2026-06-04',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'sync-state.json'),
      JSON.stringify({
        generatedAt: '2026-06-03T00:00:00.000Z',
        status: 'idle',
        itemCursors: {
          'item-delete': 'cursor-delete',
          'item-keep': 'cursor-keep',
        },
      }),
    )
    await fs.writeFile(
      path.join(dataDir, 'debts.json'),
      JSON.stringify([
        {
          id: 'delete-debt',
          source: 'plaid',
          itemId: 'item-delete',
          name: 'Deleted Credit',
          type: 'credit',
          balance: 100,
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
        {
          id: 'keep-debt',
          source: 'manual',
          name: 'Kept Debt',
          type: 'loan',
          balance: 50,
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'holdings.json'),
      JSON.stringify([
        {
          id: 'delete-holding',
          source: 'plaid',
          itemId: 'item-delete',
          name: 'Deleted Holding',
          quantity: 1,
          price: 100,
          marketValue: 100,
          asOf: '2026-06-03T00:00:00.000Z',
        },
        {
          id: 'keep-holding',
          source: 'manual',
          name: 'Kept Holding',
          quantity: 1,
          price: 50,
          marketValue: 50,
          asOf: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )

    const deleteResponse = await app.request('/api/connections/item-delete', {
      method: 'DELETE',
    })
    expect(deleteResponse.status).toBe(200)
    const deleteBody = (await deleteResponse.json()) as {
      ok: boolean
      removedAccounts: number
      removedTransactions: number
      removedDebts: number
      removedHoldings: number
    }
    expect(deleteBody).toEqual(
      expect.objectContaining({
        ok: true,
        removedAccounts: 1,
        removedTransactions: 1,
        removedDebts: 1,
        removedHoldings: 1,
      }),
    )

    const fakeAivaultArgs = JSON.parse(
      await fs.readFile(fakeAivaultLogPath, 'utf8'),
    ) as string[]
    expect(fakeAivaultArgs).toEqual(
      expect.arrayContaining(['plaid/item-remove']),
    )
    expect(fakeAivaultArgs.join(' ')).toContain('plaid:item:item-delete')

    const connectionsResponse = await app.request('/api/connections')
    expect(await connectionsResponse.json()).toEqual([])

    const accountsResponse = await app.request('/api/accounts')
    const accountsBody = (await accountsResponse.json()) as {
      accounts: Array<{ id: string }>
    }
    expect(accountsBody.accounts.map((account) => account.id)).toEqual([
      'keep-account',
    ])

    const transactionsResponse = await app.request('/api/transactions')
    const transactionsBody = (await transactionsResponse.json()) as {
      transactions: Array<{ id: string }>
    }
    expect(
      transactionsBody.transactions.map((transaction) => transaction.id),
    ).toEqual(['keep-transaction'])

    const debtsResponse = await app.request('/api/debts')
    const debtsBody = (await debtsResponse.json()) as {
      debts: Array<{ id: string }>
    }
    expect(debtsBody.debts.map((debt) => debt.id)).toEqual(['keep-debt'])

    const holdingsResponse = await app.request('/api/holdings')
    const holdingsBody = (await holdingsResponse.json()) as {
      holdings: Array<{ id: string }>
    }
    expect(holdingsBody.holdings.map((holding) => holding.id)).toEqual([
      'keep-holding',
    ])

    const syncState = JSON.parse(
      await fs.readFile(path.join(dataDir, 'sync-state.json'), 'utf8'),
    ) as { itemCursors: Record<string, string> }
    expect(syncState.itemCursors).toEqual({ 'item-keep': 'cursor-keep' })
  })

  it('exposes connection removal through app-to-app RPC', async () => {
    const fakeAivaultPath = path.join(dataDir, 'fake-aivault-rpc-delete.mjs')
    const fakeAivaultLogPath = `${fakeAivaultPath}.log`
    await fs.writeFile(
      fakeAivaultPath,
      [
        '#!/usr/bin/env node',
        "import fs from 'node:fs'",
        'fs.writeFileSync(`${process.argv[1]}.log`, JSON.stringify(process.argv.slice(2)))',
        'process.stdout.write(JSON.stringify({ response: { json: { removed: true } } }))',
      ].join('\n'),
    )
    await fs.chmod(fakeAivaultPath, 0o755)
    process.env.AIVAULT_BIN = fakeAivaultPath

    await fs.writeFile(
      path.join(dataDir, 'connections.json'),
      JSON.stringify([
        {
          itemId: 'item-rpc-delete',
          credentialRef: 'plaid:item:item-rpc-delete',
          institutionId: 'ins_rpc_delete',
          institutionName: 'RPC Delete Bank',
          status: 'connected',
          products: ['transactions'],
          connectedAt: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'accounts.json'),
      JSON.stringify([
        {
          id: 'rpc-delete-account',
          source: 'plaid',
          itemId: 'item-rpc-delete',
          name: 'Checking',
          type: 'cash',
          currentBalance: 100,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03T00:00:00.000Z',
        },
      ]),
    )
    await fs.mkdir(path.join(dataDir, 'transactions'), { recursive: true })
    await fs.writeFile(
      path.join(dataDir, 'transactions', '2026-06.json'),
      JSON.stringify([
        {
          id: 'rpc-delete-transaction',
          source: 'plaid',
          itemId: 'item-rpc-delete',
          name: 'Deleted Item Spend',
          amount: 10,
          direction: 'expense',
          category: ['Test'],
          date: '2026-06-03',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
      ]),
    )
    await fs.writeFile(
      path.join(dataDir, 'sync-state.json'),
      JSON.stringify({
        generatedAt: '2026-06-03T00:00:00.000Z',
        status: 'idle',
        itemCursors: { 'item-rpc-delete': 'cursor-delete' },
      }),
    )

    const deleteResponse = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'money.connections.delete',
        params: { itemId: 'item-rpc-delete' },
      }),
    })
    expect(deleteResponse.status).toBe(200)
    const deleteBody = (await deleteResponse.json()) as {
      ok: boolean
      result: {
        ok: boolean
        remainingConnections: number
        removedAccounts: number
        removedTransactions: number
      }
    }
    expect(deleteBody).toEqual(
      expect.objectContaining({
        ok: true,
        result: expect.objectContaining({
          ok: true,
          remainingConnections: 0,
          removedAccounts: 1,
          removedTransactions: 1,
        }),
      }),
    )

    const fakeAivaultArgs = JSON.parse(
      await fs.readFile(fakeAivaultLogPath, 'utf8'),
    ) as string[]
    expect(fakeAivaultArgs).toEqual(
      expect.arrayContaining(['plaid/item-remove']),
    )
    expect(fakeAivaultArgs.join(' ')).toContain('plaid:item:item-rpc-delete')

    await expect(
      (await app.request('/api/connections')).json(),
    ).resolves.toEqual([])
    const syncState = JSON.parse(
      await fs.readFile(path.join(dataDir, 'sync-state.json'), 'utf8'),
    ) as { itemCursors: Record<string, string> }
    expect(syncState.itemCursors).toEqual({})
  })
})
