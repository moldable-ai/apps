#!/usr/bin/env node
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { DatabaseSync } from 'node:sqlite'

const args = parseArgs(process.argv.slice(2))
const accountCount = intArg(args.accounts, 30)
const transactionCount = intArg(args.transactions, 120_000)
const years = intArg(args.years, 7)
const outputDir =
  args.out ??
  path.join(
    tmpdir(),
    `moldable-money-warehouse-benchmark-${Date.now()}-${process.pid}`,
  )
const keep = args.keep === '1' || args.keep === 'true'

const now = new Date('2026-06-05T12:00:00.000Z')
const months = recentMonths(now, years * 12)

const measures = []
const measure = async (label, fn) => {
  const start = performance.now()
  const value = await fn()
  const durationMs = performance.now() - start
  measures.push({ label, durationMs })
  return value
}

await rm(outputDir, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })

const synthetic = generateMoneyDataset({
  accountCount,
  transactionCount,
  months,
})

await measure('filesystem: write sharded facts', () =>
  writeFactShards(outputDir, synthetic),
)
const aggregateBuild = await measure(
  'filesystem ETL: build aggregates/projection',
  () => buildFilesystemWarehouse(outputDir),
)
const sqliteBuild = await measure('sqlite cache: build indexed db', () =>
  buildSqliteCache(outputDir, synthetic),
)

const rawScan = await measure('query: filesystem fact scan', () =>
  queryByFactScan(outputDir, now),
)
const fsProjection = await measure(
  'query: filesystem projection/aggregates',
  () => queryByFilesystemWarehouse(outputDir, now),
)
const sqliteQuery = await measure('query: sqlite indexed cache', () =>
  queryBySqlite(sqliteBuild.db, now),
)

const healthSynthetic = generateHealthDataset({
  days: years * 365,
  samplesPerDay: intArg(args.healthSamplesPerDay, 288),
  endDate: now,
})
await measure('health-like: write daily sample facts', () =>
  writeHealthFactShards(outputDir, healthSynthetic),
)
const healthAgg = await measure(
  'health-like ETL: build daily/monthly aggregates',
  () => buildHealthAggregates(outputDir),
)
const healthRaw = await measure('health-like query: sample fact scan', () =>
  queryHealthByFactScan(outputDir, now),
)
const healthProjected = await measure(
  'health-like query: aggregate projection',
  () => queryHealthByAggregates(outputDir, now),
)

sqliteBuild.db.close()

const result = {
  generatedAt: new Date().toISOString(),
  dataset: {
    money: {
      accounts: synthetic.accounts.length,
      transactions: synthetic.transactions.length,
      months: months.length,
      factBytes: await dirSize(path.join(outputDir, 'facts')),
      aggregateBytes: await dirSize(path.join(outputDir, 'aggregates')),
      projectionBytes: await dirSize(path.join(outputDir, 'projections')),
      sqliteBytes: await fileSize(path.join(outputDir, 'cache.sqlite')),
    },
    healthLike: {
      days: healthSynthetic.days,
      samples: healthSynthetic.samples,
      sampleBytes: await dirSize(path.join(outputDir, 'health', 'facts')),
      aggregateBytes: await dirSize(
        path.join(outputDir, 'health', 'aggregates'),
      ),
    },
  },
  timingsMs: Object.fromEntries(
    measures.map((entry) => [entry.label, round(entry.durationMs)]),
  ),
  checks: {
    rawVsProjection: compareMoneyResults(rawScan, fsProjection),
    sqliteVsProjection: compareMoneyResults(sqliteQuery, fsProjection),
    healthRawVsProjection: compareHealthResults(healthRaw, healthProjected),
  },
  queryResults: {
    factScan: compactMoneyResult(rawScan),
    filesystemProjection: compactMoneyResult(fsProjection),
    sqlite: compactMoneyResult(sqliteQuery),
    healthFactScan: healthRaw,
    healthProjection: healthProjected,
  },
  notes: [
    'filesystem fact scan intentionally reads and parses transaction shards for the query window',
    'filesystem projection reads precomputed aggregate/projection files only',
    'sqlite cache uses a local indexed database as a rebuildable cache, not source of truth',
    'health-like samples model dense wearable data where aggregates matter even more than Money',
  ],
  outputDir: keep ? outputDir : undefined,
}

console.log(JSON.stringify(result, null, 2))

if (!keep) await rm(outputDir, { recursive: true, force: true })

function parseArgs(argv) {
  const parsed = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) continue
    const [rawKey, inlineValue] = arg.slice(2).split('=')
    parsed[rawKey] = inlineValue ?? argv[index + 1] ?? '1'
    if (
      inlineValue === undefined &&
      argv[index + 1] &&
      !argv[index + 1].startsWith('--')
    ) {
      index += 1
    }
  }
  return parsed
}

function intArg(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function generateMoneyDataset({ accountCount, transactionCount, months }) {
  const rng = mulberry32(42)
  const accounts = Array.from({ length: accountCount }, (_, index) => ({
    id: `account-${index + 1}`,
    type:
      index % 11 === 0 ? 'credit' : index % 13 === 0 ? 'investment' : 'cash',
    currency: index % 5 === 0 ? 'CAD' : 'USD',
  }))
  const merchants = Array.from(
    { length: 900 },
    (_, index) => `merchant-${index + 1}`,
  )
  const categories = [
    'groceries',
    'restaurant',
    'mortgage',
    'rent',
    'travel',
    'insurance',
    'utilities',
    'childcare',
    'medical',
    'home',
    'shopping',
    'entertainment',
    'other',
  ]
  const transactions = []
  for (let index = 0; index < transactionCount; index += 1) {
    const month = months[Math.floor(rng() * months.length)]
    const day = String(1 + Math.floor(rng() * 28)).padStart(2, '0')
    const directionRoll = rng()
    const direction =
      directionRoll < 0.08
        ? 'income'
        : directionRoll < 0.22
          ? 'transfer'
          : 'expense'
    const category =
      direction === 'transfer'
        ? 'transfer'
        : categories[Math.floor(rng() * categories.length)]
    const amount =
      direction === 'income'
        ? 500 + rng() * 12_000
        : direction === 'transfer'
          ? 100 + rng() * 18_000
          : 3 + Math.pow(rng(), 2) * 3_500
    const account = accounts[Math.floor(rng() * accounts.length)]
    transactions.push({
      id: `tx-${index + 1}`,
      date: `${month}-${day}`,
      month,
      accountId: account.id,
      merchantId: merchants[Math.floor(rng() * merchants.length)],
      category,
      direction,
      transferReason:
        direction === 'transfer'
          ? rng() < 0.45
            ? 'credit_card_payment'
            : rng() < 0.7
              ? 'investment_transfer'
              : 'bank_transfer'
          : '',
      currency: account.currency,
      amount: round(amount),
    })
  }
  return { accounts, transactions }
}

async function writeFactShards(root, data) {
  const factsDir = path.join(root, 'facts', 'transactions')
  await mkdir(factsDir, { recursive: true })
  await mkdir(path.join(root, 'facts', 'accounts'), { recursive: true })
  await writeJson(
    path.join(root, 'facts', 'accounts', 'current.json'),
    data.accounts,
  )
  const byMonth = groupBy(data.transactions, (transaction) => transaction.month)
  await Promise.all(
    [...byMonth.entries()].map(([month, rows]) =>
      writeJsonl(path.join(factsDir, `${month}.jsonl`), rows),
    ),
  )
}

async function buildFilesystemWarehouse(root) {
  const factsDir = path.join(root, 'facts', 'transactions')
  const aggregateDir = path.join(root, 'aggregates', 'monthly')
  const projectionDir = path.join(root, 'projections')
  await mkdir(aggregateDir, { recursive: true })
  await mkdir(projectionDir, { recursive: true })
  const files = (await readdir(factsDir))
    .filter((file) => file.endsWith('.jsonl'))
    .sort()
  const monthly = []
  for (const file of files) {
    const month = file.slice(0, -'.jsonl'.length)
    const rows = await readJsonl(path.join(factsDir, file))
    const aggregate = aggregateTransactions(month, rows)
    monthly.push(aggregate)
    await writeJson(path.join(aggregateDir, `${month}.json`), aggregate)
  }
  const projection = dashboardProjectionFromAggregates(monthly)
  await writeJson(path.join(projectionDir, 'cards-current.json'), projection)
  return projection
}

async function buildSqliteCache(root, data) {
  const dbPath = path.join(root, 'cache.sqlite')
  const db = new DatabaseSync(dbPath)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      month TEXT NOT NULL,
      accountId TEXT NOT NULL,
      merchantId TEXT NOT NULL,
      category TEXT NOT NULL,
      direction TEXT NOT NULL,
      transferReason TEXT,
      currency TEXT NOT NULL,
      amount REAL NOT NULL
    );
    CREATE INDEX idx_transactions_month_direction ON transactions(month, direction);
    CREATE INDEX idx_transactions_month_category ON transactions(month, category);
    CREATE INDEX idx_transactions_month_amount ON transactions(month, amount);
    CREATE INDEX idx_transactions_merchant_month ON transactions(merchantId, month);
  `)
  const insert = db.prepare(`
    INSERT INTO transactions
    (id, date, month, accountId, merchantId, category, direction, transferReason, currency, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  db.exec('BEGIN')
  for (const transaction of data.transactions) {
    insert.run(
      transaction.id,
      transaction.date,
      transaction.month,
      transaction.accountId,
      transaction.merchantId,
      transaction.category,
      transaction.direction,
      transaction.transferReason,
      transaction.currency,
      transaction.amount,
    )
  }
  db.exec('COMMIT')
  return { db }
}

async function queryByFactScan(root, now) {
  const factsDir = path.join(root, 'facts', 'transactions')
  const windowMonths = recentMonths(now, 6)
  const rows = []
  for (const month of windowMonths) {
    rows.push(...(await readJsonl(path.join(factsDir, `${month}.jsonl`))))
  }
  return queryMoneyRows(rows, currentMonth(now), windowMonths)
}

async function queryByFilesystemWarehouse(root, now) {
  const windowMonths = recentMonths(now, 6)
  const aggregates = []
  for (const month of windowMonths) {
    aggregates.push(
      JSON.parse(
        await readFile(
          path.join(root, 'aggregates', 'monthly', `${month}.json`),
          'utf8',
        ),
      ),
    )
  }
  return queryMoneyAggregates(aggregates, currentMonth(now), windowMonths)
}

async function queryBySqlite(db, now) {
  const windowMonths = recentMonths(now, 6)
  const monthParams = windowMonths.map(() => '?').join(',')
  const current = currentMonth(now)
  const currentRows = db
    .prepare(
      `
      SELECT direction, SUM(amount) AS amount
      FROM transactions
      WHERE month = ? AND direction IN ('income', 'expense')
      GROUP BY direction
    `,
    )
    .all(current)
  const categoryRows = db
    .prepare(
      `
      SELECT category, SUM(amount) AS amount, COUNT(*) AS count
      FROM transactions
      WHERE month IN (${monthParams}) AND direction = 'expense'
      GROUP BY category
      ORDER BY amount DESC
      LIMIT 5
    `,
    )
    .all(...windowMonths)
  const largestExpenses = db
    .prepare(
      `
      SELECT id, date, merchantId, category, amount
      FROM transactions
      WHERE month IN (${monthParams}) AND direction = 'expense'
      ORDER BY amount DESC
      LIMIT 5
    `,
    )
    .all(...windowMonths)
  const transfers = db
    .prepare(
      `
      SELECT SUM(amount) AS amount
      FROM transactions
      WHERE month IN (${monthParams}) AND direction = 'transfer'
    `,
    )
    .get(...windowMonths)
  const currentIncome = Number(
    currentRows.find((row) => row.direction === 'income')?.amount ?? 0,
  )
  const currentExpenses = Number(
    currentRows.find((row) => row.direction === 'expense')?.amount ?? 0,
  )
  return {
    currentMonthCashFlow: round(currentIncome - currentExpenses),
    categoryTop5: categoryRows.map((row) => ({
      key: row.category,
      amount: round(Number(row.amount)),
      count: Number(row.count),
    })),
    largestExpenses: largestExpenses.map((row) => ({
      id: row.id,
      date: row.date,
      merchantId: row.merchantId,
      category: row.category,
      amount: round(Number(row.amount)),
    })),
    transferVolume: round(Number(transfers?.amount ?? 0)),
  }
}

function aggregateTransactions(month, rows) {
  const totals = { income: 0, expense: 0, transfer: 0 }
  const categories = new Map()
  const merchants = new Map()
  const transferReasons = new Map()
  const topExpenses = []

  for (const row of rows) {
    totals[row.direction] += row.amount
    if (row.direction === 'expense') {
      incrementAggregate(categories, row.category, row.amount)
      incrementAggregate(merchants, row.merchantId, row.amount)
      pushTop(topExpenses, {
        id: row.id,
        date: row.date,
        merchantId: row.merchantId,
        category: row.category,
        amount: row.amount,
      })
    }
    if (row.direction === 'transfer') {
      incrementAggregate(
        transferReasons,
        row.transferReason || 'transfer',
        row.amount,
      )
    }
  }
  return {
    month,
    totals: mapValues(totals, round),
    categories: mapAggregate(categories),
    merchants: mapAggregate(merchants),
    transferReasons: mapAggregate(transferReasons),
    topExpenses: topExpenses.sort((a, b) => b.amount - a.amount).slice(0, 20),
  }
}

function dashboardProjectionFromAggregates(monthly) {
  const lastSix = monthly.slice(-6)
  return queryMoneyAggregates(
    lastSix,
    monthly.at(-1)?.month,
    lastSix.map((entry) => entry.month),
  )
}

function queryMoneyRows(rows, currentMonth, windowMonths) {
  const currentRows = rows.filter((row) => row.month === currentMonth)
  const income = sum(
    currentRows
      .filter((row) => row.direction === 'income')
      .map((row) => row.amount),
  )
  const expenses = sum(
    currentRows
      .filter((row) => row.direction === 'expense')
      .map((row) => row.amount),
  )
  const category = new Map()
  const top = []
  let transferVolume = 0
  for (const row of rows) {
    if (row.direction === 'expense') {
      incrementAggregate(category, row.category, row.amount)
      pushTop(top, {
        id: row.id,
        date: row.date,
        merchantId: row.merchantId,
        category: row.category,
        amount: row.amount,
      })
    } else if (row.direction === 'transfer') {
      transferVolume += row.amount
    }
  }
  return {
    currentMonthCashFlow: round(income - expenses),
    categoryTop5: topAggregate(category),
    largestExpenses: top.sort((a, b) => b.amount - a.amount).slice(0, 5),
    transferVolume: round(transferVolume),
    months: windowMonths,
  }
}

function queryMoneyAggregates(aggregates, currentMonth, windowMonths) {
  const current = aggregates.find(
    (aggregate) => aggregate.month === currentMonth,
  )
  const categories = new Map()
  const top = []
  let transferVolume = 0
  for (const aggregate of aggregates) {
    for (const row of aggregate.categories)
      incrementAggregate(categories, row.key, row.amount, row.count)
    for (const row of aggregate.topExpenses) pushTop(top, row)
    transferVolume += aggregate.totals.transfer
  }
  return {
    currentMonthCashFlow: round(
      (current?.totals.income ?? 0) - (current?.totals.expense ?? 0),
    ),
    categoryTop5: topAggregate(categories),
    largestExpenses: top.sort((a, b) => b.amount - a.amount).slice(0, 5),
    transferVolume: round(transferVolume),
    months: windowMonths,
  }
}

function generateHealthDataset({ days, samplesPerDay, endDate }) {
  const rng = mulberry32(99)
  const totalSamples = days * samplesPerDay
  const samples = []
  const start = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate(),
    ),
  )
  start.setUTCDate(start.getUTCDate() - days + 1)
  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + dayIndex)
    const day = date.toISOString().slice(0, 10)
    for (let sampleIndex = 0; sampleIndex < samplesPerDay; sampleIndex += 1) {
      const hour = (sampleIndex / samplesPerDay) * 24
      samples.push({
        day,
        month: day.slice(0, 7),
        kind: 'heartRate',
        value: round(
          58 + Math.sin((hour / 24) * Math.PI * 2) * 11 + rng() * 28,
        ),
      })
    }
  }
  return { days, samples: totalSamples, rows: samples }
}

async function writeHealthFactShards(root, data) {
  const dir = path.join(root, 'health', 'facts', 'samples', 'heart-rate')
  await mkdir(dir, { recursive: true })
  const byDay = groupBy(data.rows, (row) => row.day)
  await Promise.all(
    [...byDay.entries()].map(([day, rows]) =>
      writeJsonl(path.join(dir, `${day}.jsonl`), rows),
    ),
  )
}

async function buildHealthAggregates(root) {
  const factDir = path.join(root, 'health', 'facts', 'samples', 'heart-rate')
  const dailyDir = path.join(root, 'health', 'aggregates', 'daily')
  const monthlyDir = path.join(root, 'health', 'aggregates', 'monthly')
  await mkdir(dailyDir, { recursive: true })
  await mkdir(monthlyDir, { recursive: true })
  const monthly = new Map()
  const files = (await readdir(factDir))
    .filter((file) => file.endsWith('.jsonl'))
    .sort()
  for (const file of files) {
    const rows = await readJsonl(path.join(factDir, file))
    const values = rows.map((row) => row.value)
    const day = file.slice(0, -'.jsonl'.length)
    const daily = {
      day,
      month: day.slice(0, 7),
      avgHeartRate: round(average(values)),
      minHeartRate: round(Math.min(...values)),
      maxHeartRate: round(Math.max(...values)),
      samples: values.length,
    }
    await writeJson(path.join(dailyDir, `${day}.json`), daily)
    const monthRows = monthly.get(daily.month) ?? []
    monthRows.push(daily)
    monthly.set(daily.month, monthRows)
  }
  for (const [month, days] of monthly) {
    await writeJson(path.join(monthlyDir, `${month}.json`), {
      month,
      avgHeartRate: round(average(days.map((day) => day.avgHeartRate))),
      minHeartRate: Math.min(...days.map((day) => day.minHeartRate)),
      maxHeartRate: Math.max(...days.map((day) => day.maxHeartRate)),
      samples: sum(days.map((day) => day.samples)),
      days: days.length,
    })
  }
  return { months: monthly.size }
}

async function queryHealthByFactScan(root, now) {
  const factDir = path.join(root, 'health', 'facts', 'samples', 'heart-rate')
  const days = recentDays(now, 30)
  const values = []
  for (const day of days) {
    values.push(
      ...(await readJsonl(path.join(factDir, `${day}.jsonl`))).map(
        (row) => row.value,
      ),
    )
  }
  return {
    avgHeartRate: round(average(values)),
    minHeartRate: Math.min(...values),
    maxHeartRate: Math.max(...values),
    samples: values.length,
  }
}

async function queryHealthByAggregates(root, now) {
  const dailyDir = path.join(root, 'health', 'aggregates', 'daily')
  const days = recentDays(now, 30)
  const aggregates = []
  for (const day of days) {
    aggregates.push(
      JSON.parse(await readFile(path.join(dailyDir, `${day}.json`), 'utf8')),
    )
  }
  return {
    avgHeartRate: round(weightedAverage(aggregates, 'avgHeartRate', 'samples')),
    minHeartRate: Math.min(...aggregates.map((day) => day.minHeartRate)),
    maxHeartRate: Math.max(...aggregates.map((day) => day.maxHeartRate)),
    samples: sum(aggregates.map((day) => day.samples)),
  }
}

function recentMonths(now, count) {
  const result = []
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(cursor)
    date.setUTCMonth(cursor.getUTCMonth() - index)
    result.push(date.toISOString().slice(0, 7))
  }
  return result
}

function recentDays(now, count) {
  const result = []
  const cursor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(cursor)
    date.setUTCDate(cursor.getUTCDate() - index)
    result.push(date.toISOString().slice(0, 10))
  }
  return result
}

function currentMonth(now) {
  return now.toISOString().slice(0, 7)
}

function mulberry32(seed) {
  return function next() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function groupBy(rows, keyFn) {
  const groups = new Map()
  for (const row of rows) {
    const key = keyFn(row)
    const existing = groups.get(key) ?? []
    existing.push(row)
    groups.set(key, existing)
  }
  return groups
}

function incrementAggregate(map, key, amount, count = 1) {
  const existing = map.get(key) ?? { amount: 0, count: 0 }
  existing.amount += amount
  existing.count += count
  map.set(key, existing)
}

function mapAggregate(map) {
  return [...map.entries()]
    .map(([key, value]) => ({
      key,
      amount: round(value.amount),
      count: value.count,
    }))
    .sort((a, b) => b.amount - a.amount)
}

function topAggregate(map) {
  return mapAggregate(map).slice(0, 5)
}

function pushTop(rows, row) {
  rows.push({ ...row, amount: round(row.amount) })
  if (rows.length > 64) {
    rows.sort((a, b) => b.amount - a.amount)
    rows.length = 20
  }
}

function compareMoneyResults(left, right) {
  return (
    left.currentMonthCashFlow === right.currentMonthCashFlow &&
    left.transferVolume === right.transferVolume &&
    JSON.stringify(left.categoryTop5) === JSON.stringify(right.categoryTop5) &&
    JSON.stringify(left.largestExpenses) ===
      JSON.stringify(right.largestExpenses)
  )
}

function compareHealthResults(left, right) {
  return (
    Math.abs(left.avgHeartRate - right.avgHeartRate) <= 0.02 &&
    left.minHeartRate === right.minHeartRate &&
    left.maxHeartRate === right.maxHeartRate &&
    left.samples === right.samples
  )
}

function compactMoneyResult(result) {
  return {
    currentMonthCashFlow: result.currentMonthCashFlow,
    transferVolume: result.transferVolume,
    categoryTop5: result.categoryTop5,
    largestExpenseAmounts: result.largestExpenses.map((row) => row.amount),
  }
}

function mapValues(object, fn) {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key, fn(value)]),
  )
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0)
}

function average(values) {
  return values.length === 0 ? 0 : sum(values) / values.length
}

function weightedAverage(rows, valueKey, weightKey) {
  const weight = sum(rows.map((row) => row[weightKey]))
  if (weight === 0) return 0
  return sum(rows.map((row) => row[valueKey] * row[weightKey])) / weight
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(value)}\n`)
}

async function writeJsonl(file, rows) {
  await mkdir(path.dirname(file), { recursive: true })
  await new Promise((resolve, reject) => {
    const stream = createWriteStream(file)
    stream.on('error', reject)
    stream.on('finish', resolve)
    for (const row of rows) stream.write(`${JSON.stringify(row)}\n`)
    stream.end()
  })
}

async function readJsonl(file) {
  const text = await readFile(file, 'utf8')
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

async function dirSize(dir) {
  let total = 0
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    total += entry.isDirectory() ? await dirSize(full) : (await stat(full)).size
  }
  return total
}

async function fileSize(file) {
  return (await stat(file)).size
}
