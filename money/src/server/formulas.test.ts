import {
  DEFAULT_CARD_DEFINITIONS,
  type MoneyFormulaData,
  buildCollections,
  diagnoseFormula,
  evaluateCards,
  evaluateFormula,
  evaluateFormulaValue,
} from './formulas'
import {
  deriveRecurringExtensions,
  deriveTaxContributionExtensions,
} from './money-storage'
import type {
  MoneyExtensionRegistry,
  MoneyForecastScenario,
  MoneyTransaction,
  RawMoneyData,
} from './money-types'
import { createSeedMoneyData } from './seed-data'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'

function transaction(
  id: string,
  date: string,
  amount: number,
  direction: MoneyTransaction['direction'] = 'expense',
): MoneyTransaction {
  return {
    id,
    source: 'manual',
    name: id,
    amount,
    direction,
    category: [direction],
    date,
    isoCurrencyCode: 'USD',
    recurring: false,
  }
}

describe('money formulas', () => {
  it('evaluates semantic collection methods', () => {
    const data = createSeedMoneyData(new Date('2026-06-03T12:00:00Z'))
    const collections = buildCollections(data)

    expect(evaluateFormula('Accounts.Sum()', collections)).toBe(107251)
    expect(evaluateFormula('Subscriptions.Count()', collections, data)).toBe(2)
    expect(
      evaluateFormula(
        '(Income.Sum() - Expenses.Sum()) / Income.Sum()',
        collections,
        data,
      ),
    ).toBeCloseTo(0.6, 2)
  })

  it('evaluates chained methods and domain functions over normalized facts', () => {
    const data = createSeedMoneyData(new Date('2026-06-03T12:00:00Z'))
    const collections = buildCollections(data)

    expect(
      evaluateFormula('Subscriptions.Monthly().Count()', collections, data),
    ).toBe(2)
    expect(
      evaluateFormula('Subscriptions.Monthly().Sum()', collections, data),
    ).toBe(37)
    expect(
      evaluateFormula(
        'Expenses.Where(category = "Food").Sum()',
        collections,
        data,
      ),
    ).toBe(842)
    expect(
      evaluateFormula(
        'Runway(Cash.Sum(), Expenses.MonthlyAverage(6))',
        collections,
        data,
      ),
    ).toBeCloseTo(3.49, 2)
    expect(
      evaluateFormula('DebtPayoff(Debt.Where(balance > 0))', collections, data),
    ).toBe(17512)
  })

  it('treats payments to linked card accounts as transfers before expense rollups', () => {
    const data: MoneyFormulaData = {
      accounts: [
        {
          id: 'checking',
          source: 'manual',
          name: 'Everyday Checking',
          type: 'cash',
          currentBalance: 5000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-05',
        },
        {
          id: 'linked-card',
          source: 'manual',
          name: 'Cash Back Visa',
          officialName: 'Example Cash Back Visa',
          type: 'credit',
          currentBalance: -300,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-05',
        },
      ],
      transactions: [
        {
          id: 'card-payment',
          source: 'manual',
          name: 'Bill payment - Example CAD Account - Internet /Example Cash Back Visa',
          merchantName: 'Example CAD Account',
          amount: 2400,
          direction: 'expense',
          category: [
            'RENT_AND_UTILITIES',
            'RENT_AND_UTILITIES_INTERNET_AND_CABLE',
          ],
          date: '2026-06-01',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
        transaction('actual-utility', '2026-06-02', 120),
      ],
    }
    const collections = buildCollections(data)

    expect(evaluateFormula('Expenses.Sum()', collections, data)).toBe(120)
    expect(evaluateFormula('Transfers.Sum()', collections, data)).toBe(2400)
    expect(
      evaluateFormula(
        'Transfers.Where(transferReason = "credit_card_payment").Count()',
        collections,
        data,
      ),
    ).toBe(1)
  })

  it('computes runway from net burn instead of gross expenses', () => {
    const data: MoneyFormulaData = {
      accounts: [
        {
          id: 'cash',
          source: 'manual',
          name: 'Cash',
          type: 'cash',
          currentBalance: 12000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-05',
        },
      ],
      transactions: [
        transaction('income', '2026-06-01', 3000, 'income'),
        transaction('expense', '2026-06-02', 5000, 'expense'),
      ],
    }
    const [runway] = evaluateCards(
      data,
      DEFAULT_CARD_DEFINITIONS.filter((card) => card.id === 'runway'),
    )

    expect(runway.formula).toBe(
      'Runway(Cash.Sum(), Expenses.MonthlyAverage(6) - Income.MonthlyAverage(6))',
    )
    expect(runway.value).toEqual(
      expect.objectContaining({
        type: 'duration',
        amount: 6,
        unit: 'month',
        days: 180,
      }),
    )
  })

  it('evaluates card-account credit utilization tables', () => {
    const data: MoneyFormulaData = {
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
    }
    const collections = buildCollections(data)

    expect(evaluateFormula('CardAccounts.Sum()', collections, data)).toBe(800)
    const utilization = evaluateFormulaValue(
      'CreditUtilization(CardAccounts.Where(creditLimit > 0))',
      collections,
      data,
    )
    expect(utilization).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({
            key: 'total',
            balance: 800,
            creditLimit: 3000,
            availableCredit: 2200,
            utilization: 800 / 3000,
          }),
          expect.objectContaining({
            key: 'card-two',
            balance: 300,
            creditLimit: 1000,
            utilization: 0.3,
          }),
        ]),
      }),
    )
    expect(
      evaluateFormulaValue(
        'CreditUtilization(CardAccounts)',
        collections,
        data,
      ),
    ).toEqual(utilization)
  })

  it('classifies liquid and illiquid assets for account formulas', () => {
    const data: MoneyFormulaData = {
      accounts: [
        {
          id: 'cash',
          source: 'manual',
          name: 'Checking',
          type: 'cash',
          subtype: 'checking',
          currentBalance: 1000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
        },
        {
          id: 'brokerage',
          source: 'manual',
          name: 'Taxable Brokerage',
          type: 'investment',
          subtype: 'brokerage',
          currentBalance: 2000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
          investmentAccountKind: 'brokerage',
        },
        {
          id: 'ira',
          source: 'manual',
          name: 'IRA',
          type: 'investment',
          subtype: 'ira',
          currentBalance: 3000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
        },
        {
          id: 'rrsp',
          source: 'manual',
          name: 'RRSP',
          type: 'investment',
          subtype: 'rrsp',
          currentBalance: 4000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
        },
        {
          id: 'tfsa',
          source: 'manual',
          name: 'TFSA',
          type: 'investment',
          subtype: 'tfsa',
          currentBalance: 5000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
        },
        {
          id: 'home',
          source: 'manual',
          name: 'Home',
          type: 'other',
          subtype: 'real_estate',
          currentBalance: 282000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
          isAsset: true,
        },
        {
          id: 'mortgage',
          source: 'manual',
          name: 'Mortgage',
          type: 'mortgage',
          currentBalance: -200000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
        },
        {
          id: 'card',
          source: 'manual',
          name: 'Credit Card',
          type: 'credit',
          currentBalance: -500,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
          availableCredit: 9500,
        },
        {
          id: 'locked-brokerage',
          source: 'manual',
          name: 'Locked Brokerage Lot',
          type: 'investment',
          subtype: 'brokerage',
          currentBalance: 6000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
          liquidity: 'illiquid',
        },
      ],
      transactions: [],
    }
    const collections = buildCollections(data)

    expect(diagnoseFormula('LiquidAssets.Sum()', collections)).toEqual([])
    expect(diagnoseFormula('IlliquidAssets.Sum()', collections)).toEqual([])
    expect(
      diagnoseFormula(
        'Accounts.Where(isAsset = true).GroupBy(liquidityClass).PercentOfTotal()',
        collections,
      ),
    ).toEqual([])
    expect(collections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'LiquidAssets', value: 3000, count: 2 }),
        expect.objectContaining({
          id: 'IlliquidAssets',
          value: 300000,
          count: 5,
        }),
      ]),
    )
    expect(evaluateFormula('LiquidAssets.Sum()', collections, data)).toBe(3000)
    expect(evaluateFormula('IlliquidAssets.Sum()', collections, data)).toBe(
      300000,
    )
    expect(
      evaluateFormula(
        'Accounts.Where(liquidityTier <= 1).Sum()',
        collections,
        data,
      ),
    ).toBe(1000)

    const byLiquidity = evaluateFormulaValue(
      'Accounts.Where(isAsset = true).GroupBy(liquidityClass).PercentOfTotal()',
      collections,
      data,
    )
    expect(byLiquidity).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({
            key: 'liquid',
            label: 'Liquid',
            value: 3000,
            count: 2,
            percentOfTotal: 3000 / 303000,
          }),
          expect.objectContaining({
            key: 'illiquid',
            label: 'Illiquid',
            value: 300000,
            count: 5,
            percentOfTotal: 300000 / 303000,
          }),
        ]),
      }),
    )

    const [liquidityCard] = evaluateCards(
      data,
      DEFAULT_CARD_DEFINITIONS.filter(
        (card) => card.id === 'liquid-vs-illiquid',
      ),
    )
    expect(liquidityCard).toEqual(
      expect.objectContaining({
        id: 'liquid-vs-illiquid',
        title: 'Liquid vs Illiquid',
        kind: 'breakdown',
      }),
    )
  })

  it('caps FIRE age when savings are non-positive', () => {
    const data: MoneyFormulaData = {
      accounts: [
        {
          id: 'asset-account',
          source: 'manual',
          name: 'Asset Account',
          type: 'cash',
          currentBalance: 100_000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03T00:00:00.000Z',
        },
      ],
      transactions: [
        transaction('monthly-spend', '2026-06-01', 10_000, 'expense'),
      ],
    }
    const collections = buildCollections(data)

    expect(
      evaluateFormulaValue(
        'FreedomAge(Assets.Sum(), Expenses.MonthlyAverage(6), Income.MonthlyAverage(6), 42, 0.04, 99)',
        collections,
        data,
      ),
    ).toBe(99)

    const fireCard = DEFAULT_CARD_DEFINITIONS.find(
      (card) => card.id === 'financial-independence-projection',
    )
    expect(fireCard).toBeDefined()
    expect(evaluateCards(data, [fireCard!])[0]).toEqual(
      expect.objectContaining({
        value: 99,
        displayValue: '99+',
      }),
    )
  })

  it('does not invent a child FIRE age when current age is unknown', () => {
    const data: MoneyFormulaData = {
      accounts: [
        {
          id: 'asset-account',
          source: 'manual',
          name: 'Asset Account',
          type: 'cash',
          currentBalance: 200_000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03T00:00:00.000Z',
        },
      ],
      transactions: [
        transaction('monthly-income', '2026-06-01', 10_000, 'income'),
        transaction('monthly-spend', '2026-06-02', 2_000, 'expense'),
      ],
    }
    const collections = buildCollections(data)

    expect(
      evaluateFormulaValue(
        'FreedomAge(Assets.Sum(), Expenses.MonthlyAverage(6), Income.MonthlyAverage(6), 0, 0.04, 99)',
        collections,
        data,
      ),
    ).toBe(99)
  })

  it('projects FIRE age from assets, spend, income, and withdrawal rate', () => {
    const data: MoneyFormulaData = {
      accounts: [
        {
          id: 'asset-account',
          source: 'manual',
          name: 'Asset Account',
          type: 'cash',
          currentBalance: 200_000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03T00:00:00.000Z',
        },
      ],
      transactions: [
        transaction('monthly-income', '2026-06-01', 10_000, 'income'),
        transaction('monthly-spend', '2026-06-02', 2_000, 'expense'),
      ],
    }
    const collections = buildCollections(data)

    expect(
      evaluateFormulaValue(
        'FreedomAge(Assets.Sum(), Expenses.MonthlyAverage(6), Income.MonthlyAverage(6), 40, 0.04, 99)',
        collections,
        data,
      ),
    ).toBe(45)
    expect(
      evaluateFormulaValue(
        'FreedomAge(Assets.Sum(), Expenses.MonthlyAverage(6), Income.MonthlyAverage(6), 40, 0.04, 99)',
        collections,
        {
          ...data,
          accounts: data.accounts.map((account) => ({
            ...account,
            currentBalance: 700_000,
          })),
        },
      ),
    ).toBe(40)
  })

  it('filters recurring facts by derived due dates', () => {
    const data: MoneyFormulaData = {
      accounts: [],
      transactions: [
        transaction('rent-may', '2026-05-01', 1800),
        transaction('rent-jun', '2026-06-01', 1800),
        transaction('netflix-may', '2026-05-15', 22),
        transaction('netflix-jun', '2026-06-15', 22),
      ],
      extensions: [
        {
          entity: 'transaction',
          entityId: 'rent-may',
          namespace: 'recurringObligation',
          source: 'rule',
          confidence: 0.9,
          updatedAt: '2026-06-15T00:00:00.000Z',
          values: {
            active: true,
            key: 'rent',
            cadence: 'monthly',
            monthlyAmount: 1800,
            nextDueDate: '2026-07-01',
          },
        },
        {
          entity: 'transaction',
          entityId: 'rent-jun',
          namespace: 'recurringObligation',
          source: 'rule',
          confidence: 0.9,
          updatedAt: '2026-06-15T00:00:00.000Z',
          values: {
            active: true,
            key: 'rent',
            cadence: 'monthly',
            monthlyAmount: 1800,
            nextDueDate: '2026-07-01',
          },
        },
        {
          entity: 'transaction',
          entityId: 'netflix-may',
          namespace: 'subscription',
          source: 'rule',
          confidence: 0.9,
          updatedAt: '2026-06-15T00:00:00.000Z',
          values: {
            active: true,
            key: 'netflix',
            cadence: 'monthly',
            monthlyAmount: 22,
            nextDueDate: '2026-07-15',
          },
        },
        {
          entity: 'transaction',
          entityId: 'netflix-jun',
          namespace: 'subscription',
          source: 'rule',
          confidence: 0.9,
          updatedAt: '2026-06-15T00:00:00.000Z',
          values: {
            active: true,
            key: 'netflix',
            cadence: 'monthly',
            monthlyAmount: 22,
            nextDueDate: '2026-07-15',
          },
        },
      ],
    }
    const collections = buildCollections(data)

    expect(
      evaluateFormula(
        'RecurringObligations.DueSoon(20d).Unique(key).Sum()',
        collections,
        data,
      ),
    ).toBe(1800)
    expect(
      evaluateFormula(
        'Subscriptions.DueSoon(20d).Unique(subscriptionKey).Count()',
        collections,
        data,
      ),
    ).toBe(0)
    expect(
      evaluateFormula(
        'Subscriptions.DueSoon(45d).Unique(subscriptionKey).Count()',
        collections,
        data,
      ),
    ).toBe(1)
  })

  it('filters recurring facts by formula-visible confidence metadata', () => {
    const data: MoneyFormulaData = {
      accounts: [],
      transactions: [
        transaction('gym-apr', '2026-04-05', 44),
        transaction('gym-may', '2026-05-05', 44),
        transaction('gym-jun', '2026-06-05', 44),
      ].map((entry) => ({
        ...entry,
        merchantName: 'Gym Club',
        category: ['Fitness', 'Subscription'],
      })),
    }
    const extensions = deriveRecurringExtensions(data.transactions)
    const collections = buildCollections({ ...data, extensions })

    expect(extensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          namespace: 'subscription',
          confidence: expect.any(Number),
          values: expect.objectContaining({
            status: 'active',
            confidence: expect.any(Number),
            observedCount: 3,
            firstDate: '2026-04-05',
            amountVariancePercent: 0,
          }),
        }),
      ]),
    )
    expect(
      evaluateFormula(
        'Subscriptions.Where(recurringConfidence >= 0.8).Unique(subscriptionKey).Count()',
        collections,
        { ...data, extensions },
      ),
    ).toBe(1)
    expect(
      evaluateFormula(
        'Subscriptions.Where(observedCount >= 3).Unique(subscriptionKey).Sum()',
        collections,
        { ...data, extensions },
      ),
    ).toBe(44)
  })

  it('excludes materially stale recurring series from active recurring formulas', () => {
    const data: MoneyFormulaData = {
      accounts: [],
      transactions: [
        {
          ...transaction('current-anchor', '2026-06-15', 1),
          direction: 'income',
        },
        {
          ...transaction('old-service', '2026-01-15', 30),
          merchantName: 'Old Service',
          category: ['Software', 'Subscription'],
        },
        {
          ...transaction('current-service', '2026-06-01', 40),
          merchantName: 'Current Service',
          category: ['Software', 'Subscription'],
        },
      ],
      extensions: [
        {
          entity: 'transaction',
          entityId: 'old-service',
          namespace: 'subscription',
          source: 'rule',
          confidence: 0.9,
          updatedAt: '2026-06-15T00:00:00.000Z',
          values: {
            active: true,
            key: 'old-service',
            cadence: 'monthly',
            monthlyAmount: 30,
            intervalDays: 30,
            nextDueDate: '2026-02-15',
            status: 'active',
          },
        },
        {
          entity: 'transaction',
          entityId: 'current-service',
          namespace: 'subscription',
          source: 'rule',
          confidence: 0.9,
          updatedAt: '2026-06-15T00:00:00.000Z',
          values: {
            active: true,
            key: 'current-service',
            cadence: 'monthly',
            monthlyAmount: 40,
            intervalDays: 30,
            nextDueDate: '2026-07-01',
            status: 'active',
          },
        },
      ],
    }
    const collections = buildCollections(data)

    expect(
      evaluateFormula(
        'Subscriptions.Unique(subscriptionKey).Count()',
        collections,
        data,
      ),
    ).toBe(1)
    expect(
      evaluateFormula(
        'Subscriptions.Unique(subscriptionKey).Sum()',
        collections,
        data,
      ),
    ).toBe(40)
    expect(
      evaluateFormula(
        'Expenses.Where(subscription = true).Sum()',
        collections,
        data,
      ),
    ).toBe(40)
  })

  it('excludes skipped or dismissed recurring extensions from active recurring collections', () => {
    const data: MoneyFormulaData = {
      accounts: [],
      transactions: [
        {
          ...transaction('stream-apr', '2026-04-05', 12),
          merchantName: 'StreamCo',
          category: ['Entertainment', 'Subscription'],
          recurring: true,
        },
        {
          ...transaction('stream-may', '2026-05-05', 12),
          merchantName: 'StreamCo',
          category: ['Entertainment', 'Subscription'],
          recurring: true,
        },
      ],
      extensions: [
        {
          entity: 'transaction',
          entityId: 'stream-apr',
          namespace: 'subscription',
          source: 'user',
          confidence: 1,
          updatedAt: '2026-06-15T00:00:00.000Z',
          values: {
            active: false,
            key: 'streamco',
            cadence: 'monthly',
            monthlyAmount: 12,
            status: 'dismissed',
          },
        },
        {
          entity: 'transaction',
          entityId: 'stream-may',
          namespace: 'subscription',
          source: 'user',
          confidence: 1,
          updatedAt: '2026-06-15T00:00:00.000Z',
          values: {
            active: false,
            key: 'streamco',
            cadence: 'monthly',
            monthlyAmount: 12,
            status: 'skipped',
          },
        },
      ],
    }
    const collections = buildCollections(data)

    expect(evaluateFormula('Subscriptions.Count()', collections, data)).toBe(0)
    expect(
      evaluateFormula(
        'Expenses.Where(subscription = true).Sum()',
        collections,
        data,
      ),
    ).toBe(0)
    expect(
      evaluateFormula(
        'Expenses.Where(recurringStatus = "dismissed").Count()',
        collections,
        data,
      ),
    ).toBe(1)
  })

  it('returns typed forecast values with confidence and intervals', () => {
    const data: MoneyFormulaData = {
      accounts: [],
      transactions: [
        transaction('jan', '2026-01-10', 100),
        transaction('feb', '2026-02-10', 125),
        transaction('mar', '2026-03-10', 150),
      ],
    }
    const collections = buildCollections(data)

    const scalarForecast = evaluateFormulaValue(
      'Forecast(Expenses.MonthlyAverage(3), 2, 0.8)',
      collections,
      data,
    )
    expect(scalarForecast).toEqual(
      expect.objectContaining({
        type: 'forecast',
        value: 125,
        confidence: 0.8,
        method: 'point',
        periods: 2,
        basis: { value: 125, observations: 1 },
      }),
    )

    const seriesForecast = evaluateFormulaValue(
      'Forecast(Expenses.Monthly().Trend(), 2, 0.75)',
      collections,
      data,
    )
    expect(seriesForecast).toEqual(
      expect.objectContaining({
        type: 'forecast',
        confidence: 0.75,
        method: 'series-linear',
        periods: 2,
        unit: 'month',
        value: 200,
        basis: { value: 150, observations: 3 },
        points: [
          expect.objectContaining({ key: '2026-04', value: 175 }),
          expect.objectContaining({ key: '2026-05', value: 200 }),
        ],
      }),
    )
    expect(
      evaluateFormula(
        'Forecast(Expenses.Monthly().Trend(), 2)',
        collections,
        data,
      ),
    ).toBe(200)
  })

  it('applies named forecast scenarios to forecast values', () => {
    const forecastScenarios: MoneyForecastScenario[] = [
      {
        id: 'trim-subscriptions',
        name: 'Trim Subscriptions',
        status: 'draft',
        horizonPeriods: 12,
        confidence: 0.7,
        changes: [
          {
            id: 'cancel-streaming',
            label: 'Cancel Streaming',
            amountMonthly: -25,
            status: 'accepted',
          },
          {
            id: 'reduce-discretionary',
            label: 'Reduce Discretionary',
            percentChange: -0.1,
            status: 'draft',
          },
          {
            id: 'rejected-gym',
            label: 'Rejected Gym Cut',
            amountMonthly: -50,
            status: 'rejected',
          },
        ],
      },
    ]
    const data: MoneyFormulaData = {
      accounts: [],
      transactions: [transaction('jan', '2026-01-10', 100)],
      forecastScenarios,
    }
    const collections = buildCollections(data)

    const scenarioForecast = evaluateFormulaValue(
      'ForecastScenario(Expenses.MonthlyAverage(1), "trim-subscriptions")',
      collections,
      data,
    )
    expect(scenarioForecast).toEqual(
      expect.objectContaining({
        type: 'forecast',
        value: 65,
        low: expect.any(Number),
        high: expect.any(Number),
        confidence: 0.7,
        method: 'scenario-point',
        periods: 12,
        scenario: expect.objectContaining({
          id: 'trim-subscriptions',
          monthlyDelta: -35,
          annualDelta: -420,
          acceptedChanges: 2,
          rejectedChanges: 1,
        }),
      }),
    )
  })

  it('returns debt payoff optimizer tables from debt collections', () => {
    const data: MoneyFormulaData = {
      accounts: [],
      transactions: [],
      debts: [
        {
          id: 'card',
          source: 'manual',
          name: 'Rewards Card',
          type: 'credit',
          balance: 1000,
          apr: 0.22,
          minimumPayment: 50,
          nextPaymentDueDate: '2026-07-01',
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
        {
          id: 'loan',
          source: 'manual',
          name: 'Student Loan',
          type: 'student',
          balance: 5000,
          apr: 0.06,
          minimumPayment: 100,
          nextPaymentDueDate: '2026-07-10',
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
      ],
    }
    const collections = buildCollections(data)
    const payoff = evaluateFormulaValue(
      'DebtPayoff(Debt.Where(balance > 0), 300, "avalanche")',
      collections,
      data,
    )

    expect(payoff).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: [
          expect.objectContaining({
            id: 'card',
            label: 'Rewards Card',
            priority: 1,
            strategy: 'avalanche',
            balance: 1000,
            apr: 0.22,
            minimumPayment: 50,
            monthlyPayment: 200,
            nextPaymentDueDate: '2026-07-01',
          }),
          expect.objectContaining({
            id: 'loan',
            priority: 2,
            monthlyPayment: 100,
          }),
        ],
      }),
    )
    const payoffRows = (payoff as { rows: Array<Record<string, unknown>> }).rows
    const cardPayoff = payoffRows.find((row) => row.id === 'card')
    const loanPayoff = payoffRows.find((row) => row.id === 'loan')
    expect(cardPayoff?.payoffMonths).toEqual(expect.any(Number))
    expect(loanPayoff?.payoffMonths).toEqual(expect.any(Number))
    expect(loanPayoff?.payoffMonths as number).toBeGreaterThan(
      cardPayoff?.payoffMonths as number,
    )
    expect(loanPayoff?.payoffMonths as number).toBeLessThan(30)
    expect(loanPayoff?.monthlyPayment).toBe(100)
    expect(loanPayoff?.interestEstimate).toEqual(expect.any(Number))
    expect(
      evaluateFormula(
        'DebtPayoff(Debt.Where(balance > 0), 300)',
        collections,
        data,
      ),
    ).toBe(6000)
    expect(evaluateFormula('DebtPayoff(Debt.Sum())', collections, data)).toBe(
      6000,
    )
    expect(
      evaluateFormula(
        'InterestDrag(Debt.Where(balance > 0))',
        collections,
        data,
      ),
    ).toBe(520)
    expect(
      evaluateFormula(
        'InterestDrag(Debt.Where(balance > 0), "monthly")',
        collections,
        data,
      ),
    ).toBeCloseTo(43.33, 2)

    const unknownAprData: MoneyFormulaData = {
      accounts: [
        {
          id: 'card-without-apr',
          source: 'manual',
          name: 'Card Without APR',
          type: 'credit',
          currentBalance: -750,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
          creditLimit: 2000,
        },
      ],
      transactions: [],
      debts: [
        {
          id: 'loan-without-apr',
          source: 'manual',
          name: 'Loan Without APR',
          type: 'loan',
          balance: 2500,
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
        {
          id: 'loan-with-apr',
          source: 'manual',
          name: 'Loan With APR',
          type: 'loan',
          balance: 1000,
          apr: 0.08,
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
      ],
    }
    const knownAprDebts = evaluateFormulaValue(
      'Debt.Where(balance > 0 and apr > 0).Top(5, apr)',
      buildCollections(unknownAprData),
      unknownAprData,
    )
    expect(knownAprDebts).toEqual(
      expect.objectContaining({
        type: 'entity-list',
        entities: [
          expect.objectContaining({
            id: 'loan-with-apr',
          }),
        ],
      }),
    )
    expect(
      evaluateFormula(
        'InterestDrag(Debt.Where(balance > 0 and apr > 0))',
        buildCollections(unknownAprData),
        unknownAprData,
      ),
    ).toBe(80)

    const partialDebtMetadataData: MoneyFormulaData = {
      accounts: [
        {
          id: 'card-without-metadata',
          source: 'manual',
          name: 'Card Without Metadata',
          type: 'credit',
          currentBalance: -750,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
        },
        {
          id: 'loan-account',
          source: 'manual',
          name: 'Loan Account',
          type: 'loan',
          currentBalance: -1000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
        },
      ],
      transactions: [],
      debts: [
        {
          id: 'manual-loan-metadata',
          source: 'manual',
          accountId: 'loan-account',
          name: 'Loan Account',
          type: 'loan',
          balance: 1000,
          apr: 0.08,
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
      ],
    }
    expect(
      evaluateFormula(
        'Debt.Count()',
        buildCollections(partialDebtMetadataData),
        partialDebtMetadataData,
      ),
    ).toBe(2)
    expect(
      evaluateFormula(
        'Debt.Where(balance > 0 and apr > 0).Count()',
        buildCollections(partialDebtMetadataData),
        partialDebtMetadataData,
      ),
    ).toBe(1)

    const percentAprData: MoneyFormulaData = {
      accounts: [],
      transactions: [],
      debts: [
        {
          id: 'percentage-apr',
          source: 'manual',
          name: 'Percentage APR Loan',
          type: 'loan',
          balance: 1200,
          apr: 6,
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
      ],
    }
    expect(
      evaluateFormula(
        'InterestDrag(Debt.Where(balance > 0), "daily")',
        buildCollections(percentAprData),
        percentAprData,
      ),
    ).toBeCloseTo(0.197, 3)
  })

  it('derives tax contribution extensions from high-confidence contribution transactions', () => {
    const data: MoneyFormulaData = {
      accounts: [],
      transactions: [
        transaction('hsa', '2026-01-15', 500, 'transfer'),
        transaction('401k', '2026-01-31', 200, 'expense'),
        transaction('hsa-store', '2026-02-01', 50),
        transaction('ira-distribution', '2026-02-15', 300, 'income'),
      ].map((entry) => {
        if (entry.id === 'hsa') {
          return {
            ...entry,
            name: 'HSA Contribution Transfer',
            category: ['Transfer'],
          }
        }
        if (entry.id === '401k') {
          return {
            ...entry,
            name: 'Payroll 401k employee deferral',
            category: ['Payroll'],
          }
        }
        if (entry.id === 'hsa-store') {
          return {
            ...entry,
            name: 'HSA Store Purchase',
            category: ['Shopping'],
          }
        }
        return { ...entry, name: 'IRA Distribution', category: ['Income'] }
      }),
    }
    const extensions = deriveTaxContributionExtensions(data.transactions)
    const collections = buildCollections({ ...data, extensions })

    expect(extensions).toEqual([
      expect.objectContaining({
        entityId: 'hsa',
        namespace: 'taxContribution',
        source: 'rule',
        values: expect.objectContaining({
          type: 'hsa',
          taxYear: 2026,
          amount: 500,
          contributionSource: 'transfer',
        }),
      }),
      expect.objectContaining({
        entityId: '401k',
        values: expect.objectContaining({
          type: '401k',
          amount: 200,
          contributionSource: 'payroll',
        }),
      }),
    ])
    expect(
      evaluateFormula(
        'TaxContributions.Where(type = "hsa").ThisYear().Sum()',
        collections,
        { ...data, extensions },
      ),
    ).toBe(500)
    expect(
      evaluateFormula(
        'TaxContributions.Where(taxContributionSource = "payroll").Sum()',
        collections,
        { ...data, extensions },
      ),
    ).toBe(200)

    const formulaData: MoneyFormulaData = {
      ...data,
      extensions,
      taxContributionLimits: [
        {
          id: '401k-2026-standard',
          type: '401k',
          taxYear: 2026,
          label: '401(k) elective deferral',
          limit: 24500,
          variant: 'standard',
        },
        {
          id: 'hsa-2026-self',
          type: 'hsa',
          taxYear: 2026,
          label: 'HSA self-only coverage',
          limit: 4400,
          variant: 'self',
        },
      ],
    }
    const room = evaluateFormulaValue(
      'ContributionRoom(TaxContributions.ThisYear())',
      collections,
      formulaData,
    )
    expect(room).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({
            type: '401k',
            used: 200,
            limit: 24500,
            remaining: 24300,
            value: 24300,
          }),
          expect.objectContaining({
            type: 'hsa',
            variant: 'self',
            used: 500,
            limit: 4400,
            remaining: 3900,
            value: 3900,
          }),
        ]),
      }),
    )
    expect(
      evaluateFormula(
        'ContributionRoom(TaxContributions.ThisYear(), "401k", 2026)',
        collections,
        formulaData,
      ),
    ).toBe(24300)
    expect(
      evaluateFormula(
        'ContributionRoom(TaxContributions.ThisYear(), "529", 2026)',
        collections,
        formulaData,
      ),
    ).toBe(0)
  })

  it('groups investments by normalized asset class and computes allocation drift', () => {
    const data: MoneyFormulaData = {
      accounts: [],
      transactions: [],
      holdings: [
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
      ],
    }
    const collections = buildCollections(data)

    expect(
      evaluateFormulaValue(
        'Investments.GroupBy(assetClass).PercentOfTotal()',
        collections,
        data,
      ),
    ).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({
            key: 'funds',
            value: 900,
            percentOfTotal: 0.9,
          }),
          expect.objectContaining({
            key: 'cash',
            value: 100,
            percentOfTotal: 0.1,
          }),
        ]),
      }),
    )

    expect(
      evaluateFormulaValue(
        'AllocationDrift(Investments.GroupBy(assetClass).PercentOfTotal(), "funds:0.80,cash:0.15,crypto:0.05")',
        collections,
        data,
      ),
    ).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({
            key: 'funds',
            actualPercent: 0.9,
            targetPercent: 0.8,
            drift: expect.closeTo(0.1, 8),
            rebalanceAmount: expect.closeTo(-100, 8),
          }),
          expect.objectContaining({
            key: 'cash',
            actualPercent: 0.1,
            targetPercent: 0.15,
            drift: expect.closeTo(-0.05, 8),
            rebalanceAmount: expect.closeTo(50, 8),
          }),
          expect.objectContaining({
            key: 'crypto',
            actualPercent: 0,
            targetPercent: 0.05,
            drift: -0.05,
            rebalanceAmount: 50,
          }),
        ]),
      }),
    )
    expect(
      evaluateFormula(
        'AllocationDrift(Investments.GroupBy(assetClass).PercentOfTotal(), "funds:80%,cash:20%")',
        collections,
        data,
      ),
    ).toBe(1000)

    expect(
      evaluateFormulaValue(
        'AllocationDrift(Investments.GroupBy(assetClass).PercentOfTotal(), "retirement")',
        collections,
        {
          ...data,
          allocationTargets: [
            {
              id: 'retirement',
              name: 'Retirement',
              allocations: { funds: 0.8, cash: 0.2 },
            },
          ],
        },
      ),
    ).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({
            key: 'funds',
            targetPercent: 0.8,
            drift: expect.closeTo(0.1, 8),
          }),
          expect.objectContaining({
            key: 'cash',
            targetPercent: 0.2,
            drift: expect.closeTo(-0.1, 8),
          }),
        ]),
      }),
    )
  })

  it('normalizes investment tax treatment for tax-sheltered formulas', () => {
    const data: MoneyFormulaData = {
      accounts: [
        {
          id: 'brokerage',
          source: 'manual',
          name: 'Taxable Brokerage',
          type: 'investment',
          currentBalance: 900,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
        },
        {
          id: 'retirement',
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
        {
          id: 'health',
          source: 'manual',
          name: 'Health Savings Account',
          subtype: 'hsa',
          type: 'investment',
          currentBalance: 500,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
        },
      ],
      transactions: [],
      holdings: [
        {
          id: 'ira-fund',
          source: 'manual',
          accountId: 'retirement',
          accountName: 'Traditional IRA',
          accountSubtype: 'ira',
          name: 'Total Market ETF',
          type: 'etf',
          quantity: 10,
          price: 100,
          marketValue: 1000,
          asOf: '2026-06-03',
        },
        {
          id: 'brokerage-fund',
          source: 'manual',
          accountId: 'brokerage',
          accountName: 'Taxable Brokerage',
          name: 'Total Bond ETF',
          type: 'etf',
          quantity: 5,
          price: 100,
          marketValue: 500,
          asOf: '2026-06-03',
        },
      ],
    }
    const collections = buildCollections(data)

    expect(evaluateFormula('TaxSheltered.Sum()', collections, data)).toBe(1600)
    expect(
      evaluateFormula(
        'TaxSheltered.Where(investmentAccountKind = "ira").Sum()',
        collections,
        data,
      ),
    ).toBe(1100)
    expect(
      evaluateFormula(
        'Accounts.Where(contributionLimitAnnual > 0).Sum()',
        collections,
        data,
      ),
    ).toBe(1100)
    expect(
      evaluateFormula(
        'Investments.Where(taxTreatment = "tax_deferred").Sum()',
        collections,
        data,
      ),
    ).toBe(1000)
  })

  it('treats retirement subtypes on other accounts as investments', () => {
    const data: MoneyFormulaData = {
      accounts: [
        {
          id: 'ira-other',
          source: 'manual',
          name: 'Retirement Account',
          subtype: 'ira',
          type: 'other',
          currentBalance: 12_000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
        },
        {
          id: 'rrsp-other',
          source: 'manual',
          name: 'Canadian Retirement Account',
          subtype: 'rrsp',
          type: 'other',
          currentBalance: 8_000,
          isoCurrencyCode: 'CAD',
          asOf: '2026-06-03',
        },
      ],
      transactions: [],
    }
    const collections = buildCollections(data)

    expect(evaluateFormula('Investments.Sum()', collections, data)).toBe(20_000)
    expect(evaluateFormula('TaxSheltered.Sum()', collections, data)).toBe(
      20_000,
    )
    expect(
      evaluateFormulaValue(
        'Investments.GroupBy(taxTreatment).PercentOfTotal()',
        collections,
        data,
      ),
    ).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({ key: 'tax_deferred', value: 20_000 }),
        ]),
      }),
    )
  })

  it('evaluates first-class recommendation action collections', () => {
    const data: MoneyFormulaData = {
      accounts: [],
      transactions: [],
      recommendations: [
        {
          id: 'large-travel-review',
          kind: 'opportunity',
          status: 'required',
          severity: 'high',
          title: 'Review large travel expense',
          reason: 'Large non-essential expense to review.',
          source: 'rule',
          confidence: 0.86,
          estimatedImpact: 300,
          scenarioId: 'review-large-travel',
          sourceLinks: [{ entity: 'transaction', entityId: 'tx-trip' }],
          createdAt: '2026-06-03T00:00:00.000Z',
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
        {
          id: 'late-card-payment',
          kind: 'warning',
          status: 'suggested',
          severity: 'medium',
          title: 'Review debt payment',
          source: 'rule',
          estimatedImpact: 50,
          sourceLinks: [{ entity: 'debt', entityId: 'card' }],
          createdAt: '2026-06-03T00:00:00.000Z',
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
      ],
    }
    const collections = buildCollections(data)

    expect(evaluateFormula('ReviewActions.Count()', collections, data)).toBe(2)
    expect(evaluateFormula('ReviewActions.Sum()', collections, data)).toBe(350)
    expect(
      evaluateFormula(
        'Opportunities.Where(status = "required").Sum()',
        collections,
        data,
      ),
    ).toBe(300)
    expect(evaluateFormula('Warnings.Count()', collections, data)).toBe(1)
    expect(
      evaluateFormulaValue(
        'ReviewActions.Top(1, estimatedImpact)',
        collections,
        data,
      ),
    ).toEqual(
      expect.objectContaining({
        type: 'entity-list',
        entities: [
          expect.objectContaining({
            id: 'large-travel-review',
            kind: 'recommendation',
            value: 300,
            fields: expect.objectContaining({
              status: 'required',
              severity: 'high',
              sourceEntity: 'transaction',
            }),
          }),
        ],
      }),
    )
  })

  it('builds formula collections from non-transaction extension values', () => {
    const extensionRegistry: MoneyExtensionRegistry = {
      version: 1,
      extensions: [
        {
          namespace: 'accountGoal',
          label: 'Account Goal',
          entity: 'account',
          fields: [
            {
              name: 'rating',
              label: 'Rating',
              type: 'enum',
              enumValues: ['high', 'low'],
            },
            { name: 'amount', label: 'Amount', type: 'money' },
          ],
          derivedCollections: [
            {
              id: 'TrackedAccounts',
              name: 'Tracked Accounts',
              entity: 'account',
              baseCollection: 'Accounts',
              predicate: 'accountGoal_amount > 0',
            },
          ],
        },
        {
          namespace: 'payoffPlan',
          label: 'Payoff Plan',
          entity: 'debt',
          fields: [
            {
              name: 'priority',
              label: 'Priority',
              type: 'enum',
              enumValues: ['high', 'low'],
            },
            { name: 'amount', label: 'Extra Payment', type: 'money' },
          ],
          derivedCollections: [
            {
              id: 'DebtPlans',
              name: 'Debt Plans',
              entity: 'debt',
              baseCollection: 'Debt',
              predicate: 'payoffPlan_amount > 0',
            },
          ],
        },
        {
          namespace: 'assetSleeve',
          label: 'Asset Sleeve',
          entity: 'holding',
          fields: [
            {
              name: 'sleeve',
              label: 'Sleeve',
              type: 'enum',
              enumValues: ['crypto', 'stock'],
            },
            { name: 'percent', label: 'Percent', type: 'percent' },
          ],
          derivedCollections: [
            {
              id: 'SleevedHoldings',
              name: 'Sleeved Holdings',
              entity: 'holding',
              baseCollection: 'Investments',
              predicate: 'assetSleeve_percent > 0',
            },
          ],
        },
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
    }
    const data: MoneyFormulaData = {
      accounts: [
        {
          id: 'cash-main',
          source: 'manual',
          name: 'Main Cash',
          type: 'cash',
          currentBalance: 1000,
          isoCurrencyCode: 'USD',
          asOf: '2026-06-03',
        },
      ],
      transactions: [],
      debts: [
        {
          id: 'card-debt',
          source: 'manual',
          name: 'Credit Card',
          type: 'credit',
          balance: 500,
          apr: 0.22,
          currencyCode: 'USD',
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
      ],
      holdings: [
        {
          id: 'btc-holding',
          source: 'manual',
          name: 'Bitcoin',
          tickerSymbol: 'BTC',
          type: 'crypto',
          quantity: 0.01,
          price: 30000,
          marketValue: 300,
          asOf: '2026-06-03',
        },
      ],
      merchants: [
        {
          id: 'corner-market',
          source: 'derived',
          name: 'Corner Market',
          transactionCount: 3,
          income: 0,
          expenses: 200,
          netAmount: -200,
          lastTransactionDate: '2026-06-03',
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
      ],
      persons: [
        {
          id: 'alex',
          source: 'derived',
          name: 'Alex',
          transactionCount: 2,
          amountOwedToMe: 120,
          amountIOwe: 20,
          amountSettled: 40,
          lastActivityDate: '2026-06-03',
          updatedAt: '2026-06-03T00:00:00.000Z',
        },
      ],
      extensions: [
        {
          entity: 'account',
          entityId: 'cash-main',
          namespace: 'accountGoal',
          source: 'user',
          updatedAt: '2026-06-03T00:00:00.000Z',
          values: { rating: 'high', amount: 25 },
        },
        {
          entity: 'debt',
          entityId: 'card-debt',
          namespace: 'payoffPlan',
          source: 'user',
          updatedAt: '2026-06-03T00:00:00.000Z',
          values: { priority: 'high', amount: 50 },
        },
        {
          entity: 'holding',
          entityId: 'btc-holding',
          namespace: 'assetSleeve',
          source: 'user',
          updatedAt: '2026-06-03T00:00:00.000Z',
          values: { sleeve: 'crypto', percent: 0.5 },
        },
        {
          entity: 'merchant',
          entityId: 'corner-market',
          namespace: 'merchantLens',
          source: 'user',
          updatedAt: '2026-06-03T00:00:00.000Z',
          values: { tier: 'core', percent: 0.1 },
        },
        {
          entity: 'person',
          entityId: 'alex',
          namespace: 'relationship',
          source: 'user',
          updatedAt: '2026-06-03T00:00:00.000Z',
          values: { circle: 'home', amount: 75 },
        },
      ],
      extensionRegistry,
    }
    const collections = buildCollections(data)

    expect(
      evaluateFormula(
        'TrackedAccounts.Where(rating = "high").Sum()',
        collections,
        data,
      ),
    ).toBe(25)
    expect(
      evaluateFormula(
        'DebtPlans.Where(priority = "high").Sum()',
        collections,
        data,
      ),
    ).toBe(50)
    expect(
      evaluateFormula(
        'SleevedHoldings.Where(sleeve = "crypto").Sum()',
        collections,
        data,
      ),
    ).toBe(150)
    expect(
      evaluateFormula(
        'MerchantLens.Where(tier = "core").Sum()',
        collections,
        data,
      ),
    ).toBe(20)
    expect(
      evaluateFormula(
        'RelationshipBalances.Where(circle = "home").Sum()',
        collections,
        data,
      ),
    ).toBe(75)

    expect(evaluateFormulaValue('DebtPlans.Top(1)', collections, data)).toEqual(
      expect.objectContaining({
        type: 'entity-list',
        entities: [
          expect.objectContaining({
            id: 'card-debt',
            kind: 'debt',
            value: 50,
          }),
        ],
      }),
    )
    expect(
      evaluateFormulaValue('MerchantLens.Top(1)', collections, data),
    ).toEqual(
      expect.objectContaining({
        type: 'entity-list',
        entities: [
          expect.objectContaining({
            id: 'corner-market',
            kind: 'merchant',
            value: 20,
          }),
        ],
      }),
    )
    expect(
      evaluateFormulaValue('RelationshipBalances.Top(1)', collections, data),
    ).toEqual(
      expect.objectContaining({
        type: 'entity-list',
        entities: [
          expect.objectContaining({
            id: 'alex',
            kind: 'person',
            value: 75,
          }),
        ],
      }),
    )
  })

  it('supports date and duration literals', () => {
    const data = createSeedMoneyData(new Date('2026-06-03T12:00:00Z'))
    const collections = buildCollections(data)

    expect(
      evaluateFormula(
        'Expenses.Where(date >= 2026-06-08).Count()',
        collections,
        data,
      ),
    ).toBe(2)
    expect(evaluateFormulaValue('2026-06-03', collections, data)).toEqual({
      type: 'date',
      isoDate: '2026-06-03',
    })
    expect(evaluateFormulaValue('6mo', collections, data)).toEqual({
      type: 'duration',
      amount: 6,
      unit: 'month',
      days: 180,
    })
  })

  it('supports calendar and rolling period methods', () => {
    const data: RawMoneyData = {
      accounts: [],
      transactions: [
        {
          id: 'income-current',
          source: 'manual',
          name: 'Current Payroll',
          amount: 1000,
          direction: 'income',
          category: ['Income'],
          date: '2026-06-02',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
        {
          id: 'expense-current',
          source: 'manual',
          name: 'Current Rent',
          amount: 300,
          direction: 'expense',
          category: ['Housing'],
          date: '2026-06-01',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
        {
          id: 'expense-last-month',
          source: 'manual',
          name: 'Last Month Rent',
          amount: 200,
          direction: 'expense',
          category: ['Housing'],
          date: '2026-05-15',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
        {
          id: 'expense-ytd',
          source: 'manual',
          name: 'Year To Date Medical',
          amount: 75,
          direction: 'expense',
          category: ['Health'],
          date: '2026-01-15',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
        {
          id: 'expense-last-year',
          source: 'manual',
          name: 'Old Rent',
          amount: 100,
          direction: 'expense',
          category: ['Housing'],
          date: '2025-06-15',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
      ],
    }
    const collections = buildCollections(data)

    expect(
      evaluateFormula(
        'Income.ThisMonth().Sum() - Expenses.ThisMonth().Sum()',
        collections,
        data,
      ),
    ).toBe(700)
    expect(evaluateFormula('CashFlow.Sum()', collections, data)).toBe(325)
    expect(
      evaluateFormula('CashFlow.ThisMonth().Sum()', collections, data),
    ).toBe(700)
    expect(
      evaluateFormula('CashFlow.LastMonth().Sum()', collections, data),
    ).toBe(-200)
    expect(
      evaluateFormula('Expenses.LastMonth().Sum()', collections, data),
    ).toBe(200)
    expect(
      evaluateFormula(
        'Expenses.ThisMonth().PreviousPeriod().Sum()',
        collections,
        data,
      ),
    ).toBe(200)
    expect(
      evaluateFormula(
        'ChangeVs(Expenses.ThisMonth().Sum(), Expenses.ThisMonth().PreviousPeriod().Sum())',
        collections,
        data,
      ),
    ).toBe(0.5)
    expect(evaluateFormula('Expenses.YTD().Sum()', collections, data)).toBe(575)
    expect(
      evaluateFormula('Expenses.ThisYear().Sum()', collections, data),
    ).toBe(575)
    expect(
      evaluateFormula('Expenses.LastYear().Sum()', collections, data),
    ).toBe(100)
    expect(
      evaluateFormula(
        'Expenses.ThisYear().PreviousPeriod().Sum()',
        collections,
        data,
      ),
    ).toBe(100)
    expect(
      evaluateFormula(
        'Expenses.Between(2026-05-01, 2026-06-01).Sum()',
        collections,
        data,
      ),
    ).toBe(500)
    expect(
      evaluateFormula(
        'Expenses.Between(2026-06-01, 2026-05-01).Sum()',
        collections,
        data,
      ),
    ).toBe(500)
    expect(
      evaluateFormula('Expenses.Rolling(30d).Sum()', collections, data),
    ).toBe(500)
    expect(
      evaluateFormula('Expenses.PreviousPeriod().Count()', collections, data),
    ).toBe(0)
    expect(
      evaluateFormula('Expenses.Monthly().PeriodAverage()', collections, data),
    ).toBe(168.75)
    expect(
      evaluateFormulaValue('Expenses.Weekly().Trend()', collections, data),
    ).toMatchObject({
      type: 'series',
      points: expect.arrayContaining([
        expect.objectContaining({ key: '2026-W23', value: 300 }),
      ]),
    })
    expect(
      evaluateFormulaValue('CashFlow.Monthly().Trend()', collections, data),
    ).toMatchObject({
      type: 'series',
      points: expect.arrayContaining([
        expect.objectContaining({ key: '2026-06', value: 700, count: 2 }),
        expect.objectContaining({ key: '2026-05', value: -200, count: 1 }),
      ]),
    })
    expect(
      evaluateFormulaValue('Expenses.Daily().Trend()', collections, data),
    ).toMatchObject({
      type: 'series',
      points: expect.arrayContaining([
        expect.objectContaining({ key: '2026-06-01', value: 300 }),
      ]),
    })
    expect(
      evaluateFormulaValue('Expenses.Yearly().Trend()', collections, data),
    ).toMatchObject({
      type: 'series',
      points: expect.arrayContaining([
        expect.objectContaining({ key: '2026', value: 575 }),
        expect.objectContaining({ key: '2025', value: 100 }),
      ]),
    })
    expect(
      evaluateFormulaValue(
        'Expenses.Monthly().Trend().MovingAverage(2)',
        collections,
        data,
      ),
    ).toMatchObject({
      type: 'series',
      points: [
        expect.objectContaining({ key: '2025-06', value: 100, count: 1 }),
        expect.objectContaining({ key: '2026-01', value: 87.5, count: 2 }),
        expect.objectContaining({ key: '2026-05', value: 137.5, count: 2 }),
        expect.objectContaining({ key: '2026-06', value: 250, count: 2 }),
      ],
    })
    expect(
      evaluateFormulaValue(
        'Expenses.Monthly().Trend().Cumulative()',
        collections,
        data,
      ),
    ).toMatchObject({
      type: 'series',
      points: [
        expect.objectContaining({ key: '2025-06', value: 100, count: 1 }),
        expect.objectContaining({ key: '2026-01', value: 175, count: 2 }),
        expect.objectContaining({ key: '2026-05', value: 375, count: 3 }),
        expect.objectContaining({ key: '2026-06', value: 675, count: 4 }),
      ],
    })
    expect(
      evaluateFormulaValue('Expenses.Top(1, date)', collections, data),
    ).toMatchObject({
      type: 'entity-list',
      entities: [expect.objectContaining({ id: 'expense-current' })],
    })
    expect(
      evaluateFormulaValue('Expenses.Bottom(1, date)', collections, data),
    ).toMatchObject({
      type: 'entity-list',
      entities: [expect.objectContaining({ id: 'expense-last-year' })],
    })
  })

  it('handles calendar window boundaries across month and year rollovers', () => {
    const data: RawMoneyData = {
      accounts: [],
      transactions: [
        transaction('dec-2025-expense', '2025-12-31', 10),
        transaction('jan-2026-expense', '2026-01-01', 20),
        transaction('dec-2026-expense', '2026-12-31', 30),
        transaction('jan-2027-expense', '2027-01-01', 40),
        transaction('jan-2027-income', '2027-01-01', 100, 'income'),
      ],
    }
    const collections = buildCollections(data)

    expect(
      evaluateFormula('Expenses.ThisMonth().Sum()', collections, data),
    ).toBe(40)
    expect(
      evaluateFormula('Expenses.LastMonth().Sum()', collections, data),
    ).toBe(30)
    expect(evaluateFormula('Expenses.YTD().Sum()', collections, data)).toBe(40)
    expect(
      evaluateFormula('Expenses.ThisYear().Sum()', collections, data),
    ).toBe(40)
    expect(
      evaluateFormula('Expenses.LastYear().Sum()', collections, data),
    ).toBe(50)
    expect(
      evaluateFormula(
        'Income.ThisMonth().Sum() - Expenses.ThisMonth().Sum()',
        collections,
        data,
      ),
    ).toBe(60)
  })

  it('evaluates balance snapshot trends with latest value per period', () => {
    const data: MoneyFormulaData = {
      accounts: [],
      transactions: [],
      balanceSnapshots: [
        {
          id: 'net-worth-jan',
          source: 'manual',
          kind: 'netWorth',
          date: '2026-01-31',
          asOf: '2026-01-31T12:00:00.000Z',
          value: 10000,
          createdAt: '2026-01-31T12:00:00.000Z',
        },
        {
          id: 'net-worth-feb-early',
          source: 'manual',
          kind: 'netWorth',
          date: '2026-02-10',
          asOf: '2026-02-10T12:00:00.000Z',
          value: 11000,
          createdAt: '2026-02-10T12:00:00.000Z',
        },
        {
          id: 'net-worth-feb-late',
          source: 'manual',
          kind: 'netWorth',
          date: '2026-02-28',
          asOf: '2026-02-28T12:00:00.000Z',
          value: 12500,
          createdAt: '2026-02-28T12:00:00.000Z',
        },
        {
          id: 'investment-feb',
          source: 'manual',
          kind: 'investment',
          date: '2026-02-28',
          asOf: '2026-02-28T12:00:00.000Z',
          value: 4500,
          createdAt: '2026-02-28T12:00:00.000Z',
        },
      ],
    }
    const collections = buildCollections(data)

    expect(evaluateFormula('NetWorthHistory.Sum()', collections, data)).toBe(
      12500,
    )
    expect(
      evaluateFormulaValue(
        'NetWorthHistory.Monthly().Trend()',
        collections,
        data,
      ),
    ).toEqual({
      type: 'series',
      points: [
        expect.objectContaining({ key: '2026-01', value: 10000, count: 1 }),
        expect.objectContaining({ key: '2026-02', value: 12500, count: 2 }),
      ],
    })
    expect(
      evaluateFormulaValue(
        'InvestmentHistory.Monthly().Trend()',
        collections,
        data,
      ),
    ).toEqual({
      type: 'series',
      points: [
        expect.objectContaining({ key: '2026-02', value: 4500, count: 1 }),
      ],
    })
    expect(
      evaluateFormulaValue('NetWorthHistory.Top(1, date)', collections, data),
    ).toMatchObject({
      type: 'entity-list',
      entities: [
        expect.objectContaining({
          id: 'net-worth-feb-late',
          kind: 'balanceSnapshot',
          value: 12500,
        }),
      ],
    })
  })

  it('uses inclusive rolling windows anchored to the latest fact date', () => {
    const data: RawMoneyData = {
      accounts: [],
      transactions: [
        transaction('anchor', '2026-06-30', 1),
        transaction('one-day-before', '2026-06-29', 2),
        transaction('seven-day-boundary', '2026-06-24', 4),
        transaction('just-before-seven-day', '2026-06-23', 8),
        transaction('thirty-day-boundary', '2026-06-01', 16),
        transaction('just-before-thirty-day', '2026-05-31', 32),
        transaction('six-month-boundary', '2026-01-02', 64),
        transaction('before-six-month', '2026-01-01', 128),
      ],
    }
    const collections = buildCollections(data)

    expect(
      evaluateFormula('Expenses.Rolling(1d).Sum()', collections, data),
    ).toBe(1)
    expect(
      evaluateFormula('Expenses.Rolling(7d).Sum()', collections, data),
    ).toBe(7)
    expect(
      evaluateFormula('Expenses.Rolling(30d).Sum()', collections, data),
    ).toBe(31)
    expect(
      evaluateFormula('Expenses.Rolling(6mo).Sum()', collections, data),
    ).toBe(127)
  })

  it('supports transaction extension fields in formulas', () => {
    const data: RawMoneyData = {
      accounts: [],
      transactions: [
        {
          id: 'openai',
          source: 'manual',
          name: 'OpenAI',
          amount: 50,
          direction: 'expense',
          category: ['Software'],
          date: '2026-06-01',
          isoCurrencyCode: 'USD',
          recurring: false,
          extensions: {
            subscription: {
              active: true,
              cadence: 'monthly',
              need: 'useful',
              key: 'openai',
            },
          },
        },
        {
          id: 'openai-second-seat',
          source: 'manual',
          name: 'OpenAI Seat',
          amount: 20,
          direction: 'expense',
          category: ['Software'],
          date: '2026-06-02',
          isoCurrencyCode: 'USD',
          recurring: false,
          extensions: {
            subscription: {
              active: true,
              cadence: 'monthly',
              key: 'openai',
            },
          },
        },
        {
          id: 'dinner',
          source: 'manual',
          name: 'Dinner',
          amount: 80,
          direction: 'expense',
          category: ['Food'],
          date: '2026-06-03',
          isoCurrencyCode: 'USD',
          recurring: false,
          extensions: {
            sharedExpense: {
              status: 'owed',
              amount: 40,
              personId: 'alex',
            },
            joyReview: {
              rating: 'negative',
              decision: 'reduce',
            },
          },
        },
        {
          id: 'hsa-transfer',
          source: 'manual',
          name: 'HSA Contribution',
          amount: 500,
          direction: 'expense',
          category: ['Transfer'],
          date: '2026-06-04',
          isoCurrencyCode: 'USD',
          recurring: false,
          extensions: {
            taxContribution: {
              type: 'hsa',
              taxYear: 2026,
              amount: 500,
            },
          },
        },
      ],
    }
    const collections = buildCollections(data)

    expect(
      evaluateFormula('Subscriptions.ThisMonth().Count()', collections, data),
    ).toBe(2)
    expect(
      evaluateFormula(
        'Subscriptions.ThisMonth().Unique(subscriptionKey).Count()',
        collections,
        data,
      ),
    ).toBe(1)
    expect(
      evaluateFormula(
        'Expenses.Where(subscription = true).Where(cadence = "monthly").Sum()',
        collections,
        data,
      ),
    ).toBe(70)
    expect(
      evaluateFormula(
        'JoyReview.Where(rating = "negative").Sum()',
        collections,
        data,
      ),
    ).toBe(80)
    expect(
      evaluateFormula(
        'SharedExpenses.Where(status = "owed").Sum()',
        collections,
        data,
      ),
    ).toBe(40)
    expect(
      evaluateFormula(
        'TaxContributions.Where(type = "hsa").Sum()',
        collections,
        data,
      ),
    ).toBe(500)
    expect(
      evaluateFormulaValue(
        'SharedExpenses.Where(personId = "alex").GroupBy(status).PercentOfTotal()',
        collections,
        data,
      ),
    ).toMatchObject({
      type: 'table',
      rows: [
        expect.objectContaining({
          key: 'owed',
          label: 'Owed',
          value: 40,
          percentOfTotal: 1,
        }),
      ],
    })
  })

  it('returns typed series, table, and entity-list values', () => {
    const data = createSeedMoneyData(new Date('2026-06-03T12:00:00Z'))
    const collections = buildCollections(data)

    expect(evaluateFormulaValue('Expenses.Trend()', collections, data)).toEqual(
      {
        type: 'series',
        points: [
          {
            key: '2026-06',
            label: '2026-06',
            value: 3679,
            count: 4,
            startDate: '2026-06-01',
          },
        ],
      },
    )

    expect(
      evaluateFormulaValue(
        'Expenses.GroupBy(category).PercentOfTotal()',
        collections,
        data,
      ),
    ).toMatchObject({
      type: 'table',
      columns: expect.arrayContaining([
        { key: 'percentOfTotal', label: 'Percent of Total', kind: 'percent' },
      ]),
      rows: expect.arrayContaining([
        expect.objectContaining({
          label: 'Housing Rent',
          value: 2800,
          count: 1,
          percentOfTotal: 2800 / 3679,
        }),
      ]),
    })

    const providerCategoryData: MoneyFormulaData = {
      accounts: [],
      transactions: [
        {
          ...transaction('provider-grocery', '2026-06-01', 120),
          merchantName: 'Market Basket',
          category: ['FOOD_AND_DRINK', 'FOOD_AND_DRINK_GROCERIES'],
          providerCategoryPrimary: 'FOOD_AND_DRINK',
          providerCategoryDetailed: 'FOOD_AND_DRINK_GROCERIES',
        },
        {
          ...transaction('provider-transfer', '2026-06-02', 80, 'transfer'),
          merchantName: 'Internal Bank Transfer',
          category: ['TRANSFER_IN', 'TRANSFER_IN_ACCOUNT_TRANSFER'],
          providerCategoryPrimary: 'TRANSFER_IN',
          providerCategoryDetailed: 'TRANSFER_IN_ACCOUNT_TRANSFER',
          transferReason: 'provider_transfer_in',
        },
      ],
    }
    const providerCollections = buildCollections(providerCategoryData)

    expect(
      evaluateFormulaValue(
        'Transactions.GroupBy(category).PercentOfTotal()',
        providerCollections,
        providerCategoryData,
      ),
    ).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({
            key: 'FOOD_AND_DRINK FOOD_AND_DRINK_GROCERIES',
            label: 'Groceries',
            value: 120,
          }),
          expect.objectContaining({
            key: 'TRANSFER_IN TRANSFER_IN_ACCOUNT_TRANSFER',
            label: 'Account Transfer',
            value: 80,
          }),
        ]),
      }),
    )
    expect(
      evaluateFormulaValue(
        'Transactions.GroupBy(providerCategoryPrimary).PercentOfTotal()',
        providerCollections,
        providerCategoryData,
      ),
    ).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({
            key: 'FOOD_AND_DRINK',
            label: 'Food and Drink',
          }),
        ]),
      }),
    )
    expect(
      evaluateFormulaValue(
        'Transactions.GroupBy(merchantId).PercentOfTotal()',
        providerCollections,
        providerCategoryData,
      ),
    ).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({
            key: 'market-basket',
            label: 'Market Basket',
          }),
        ]),
      }),
    )
    expect(
      evaluateFormulaValue(
        'Transfers.GroupBy(transferReason).PercentOfTotal()',
        providerCollections,
        providerCategoryData,
      ),
    ).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: [
          expect.objectContaining({
            key: 'provider_transfer_in',
            label: 'Provider Transfer In',
          }),
        ],
      }),
    )

    expect(
      evaluateFormulaValue('Expenses.Sort(desc).Top(2)', collections, data),
    ).toMatchObject({
      type: 'entity-list',
      entities: [
        expect.objectContaining({ id: 'seed-rent', value: 2800 }),
        expect.objectContaining({ id: 'seed-groceries', value: 842 }),
      ],
    })
    expect(
      evaluateFormulaValue(
        'Expenses.Sort(desc).Limit(2, 1)',
        collections,
        data,
      ),
    ).toMatchObject({
      type: 'entity-list',
      entities: [
        expect.objectContaining({ id: 'seed-groceries', value: 842 }),
        expect.objectContaining({ id: 'seed-netflix', value: 22 }),
      ],
    })
    expect(
      evaluateFormulaValue(
        'Expenses.Sort(desc).Offset(2).Limit(1)',
        collections,
        data,
      ),
    ).toMatchObject({
      type: 'entity-list',
      entities: [expect.objectContaining({ id: 'seed-netflix', value: 22 })],
    })
  })

  it('rejects invalid or unknown formula references', () => {
    const data = createSeedMoneyData(new Date('2026-06-03T12:00:00Z'))
    const collections = buildCollections(data)

    expect(() => evaluateFormula('Accounts.Sum(', collections)).toThrow(
      /Invalid formula/,
    )
    expect(() => evaluateFormula('Crypto.Sum()', collections)).toThrow(
      /Unknown collection: Crypto/,
    )
    expect(diagnoseFormula('Expenses.Median()', collections)).toEqual([
      expect.objectContaining({
        message: 'Unsupported collection method: Median',
      }),
    ])
    expect(diagnoseFormula('Shell(Cash.Sum())', collections)).toEqual([
      expect.objectContaining({
        message: 'Unsupported function: Shell',
      }),
    ])
    expect(diagnoseFormula('Runway(Cash.Sum())', collections)).toEqual([
      expect.objectContaining({
        message: 'Runway expects 2 arguments, but received 1.',
      }),
    ])
    expect(
      diagnoseFormula(
        'FreedomAge(Assets.Sum() / Expenses.MonthlyAverage(6))',
        collections,
      ),
    ).toEqual([
      expect.objectContaining({
        message: 'FreedomAge expects 3-6 arguments, but received 1.',
      }),
    ])
    expect(() => evaluateFormula('Runway(Cash.Sum())', collections)).toThrow(
      /Runway expects 2 arguments/,
    )
    expect(() =>
      evaluateFormula(
        'FreedomAge(Assets.Sum() / Expenses.MonthlyAverage(6))',
        collections,
      ),
    ).toThrow(/FreedomAge expects 3-6 arguments/)
    expect(() => evaluateFormula('Shell(Cash.Sum())', collections)).toThrow(
      /Unsupported function: Shell/,
    )
  })

  it('returns stable diagnostics for unsupported methods and multiline formulas', () => {
    const data = createSeedMoneyData(new Date('2026-06-03T12:00:00Z'))
    const collections = buildCollections(data)

    expect(diagnoseFormula('Expenses.NotAMethod().Sum()', collections)).toEqual(
      [
        expect.objectContaining({
          message: 'Unsupported collection method: NotAMethod',
          range: expect.objectContaining({
            start: expect.objectContaining({
              line: 0,
              character: 0,
              offset: 0,
            }),
          }),
        }),
      ],
    )

    expect(diagnoseFormula('Shell(Cash.Sum())', collections)).toEqual([
      expect.objectContaining({
        message: 'Unsupported function: Shell',
        range: expect.objectContaining({
          start: expect.objectContaining({ line: 0, character: 0, offset: 0 }),
        }),
      }),
    ])

    expect(
      diagnoseFormula('Income.Sum() +\nCrypto.Sum()', collections),
    ).toEqual([
      expect.objectContaining({
        message: 'Unknown collection: Crypto',
        range: {
          start: { line: 1, character: 0, offset: 15 },
          end: { line: 1, character: 6, offset: 21 },
        },
      }),
    ])
  })

  it('returns source ranges for formula diagnostics', () => {
    const data = createSeedMoneyData(new Date('2026-06-03T12:00:00Z'))
    const collections = buildCollections(data)

    expect(diagnoseFormula('Crypto.Sum()', collections)).toEqual([
      {
        message: 'Unknown collection: Crypto',
        range: {
          start: { line: 0, character: 0, offset: 0 },
          end: { line: 0, character: 6, offset: 6 },
        },
      },
    ])

    const parseDiagnostics = diagnoseFormula('Accounts.Sum(', collections)
    expect(parseDiagnostics.length).toBeGreaterThan(0)
    expect(parseDiagnostics[0]?.message).toMatch(/Expecting/)
    expect(parseDiagnostics[0]?.range).toEqual(
      expect.objectContaining({
        start: expect.objectContaining({
          line: expect.any(Number),
          character: expect.any(Number),
          offset: expect.any(Number),
        }),
        end: expect.objectContaining({
          line: expect.any(Number),
          character: expect.any(Number),
          offset: expect.any(Number),
        }),
      }),
    )
  })

  it('evaluates default cards from raw money data', () => {
    const data = createSeedMoneyData(new Date('2026-06-03T12:00:00Z'))
    const cards = evaluateCards(data)

    expect(cards.find((card) => card.id === 'net-worth')?.displayValue).toBe(
      '$107,251',
    )
    expect(cards.find((card) => card.id === 'income-saved')?.displayValue).toBe(
      '60%',
    )
    expect(
      cards.find((card) => card.id === 'income-saved')?.secondaryResults,
    ).toEqual(
      expect.objectContaining({
        rollingIncome: expect.objectContaining({
          formula: 'Income.Rolling(6mo).Sum()',
          outputType: 'money',
          displayValue: expect.stringMatching(/^\$/),
          referencedCollections: ['Income'],
        }),
        rollingExpenses: expect.objectContaining({
          formula: 'Expenses.Rolling(6mo).Sum()',
          outputType: 'money',
          displayValue: expect.stringMatching(/^\$/),
          referencedCollections: ['Expenses'],
        }),
        currentMonthCashFlow: expect.objectContaining({
          formula: 'CashFlow.ThisMonth().Sum()',
          outputType: 'money',
          displayValue: expect.stringMatching(/^\$/),
          referencedCollections: ['CashFlow'],
        }),
      }),
    )
    const runwayValue = cards.find((card) => card.id === 'runway')?.value
    expect(runwayValue).toEqual(
      expect.objectContaining({
        type: 'duration',
        unit: 'month',
      }),
    )
    if (
      typeof runwayValue !== 'object' ||
      runwayValue === null ||
      !('type' in runwayValue) ||
      runwayValue.type !== 'duration'
    ) {
      throw new Error('Expected runway card to evaluate to a duration value')
    }
    expect(runwayValue.amount).toBe(99 * 12)
    expect(
      cards.find((card) => card.id === 'financial-independence-projection')
        ?.secondaryResults,
    ).toEqual(
      expect.objectContaining({
        monthsCovered: expect.objectContaining({
          formula: 'Assets.Sum() / Expenses.MonthlyAverage(6)',
          outputType: 'number',
          displayValue: expect.not.stringMatching(/^\$/),
        }),
        monthlySavings: expect.objectContaining({
          formula: 'Income.MonthlyAverage(6) - Expenses.MonthlyAverage(6)',
          outputType: 'money',
          displayValue: expect.stringMatching(/^\$/),
        }),
      }),
    )
    expect(
      cards.find((card) => card.id === 'financial-independence-projection'),
    ).toEqual(
      expect.objectContaining({
        outputType: 'number',
        displayValue: expect.not.stringMatching(/^\$/),
      }),
    )
    expect(cards.find((card) => card.id === 'top-merchants')?.value).toEqual(
      expect.objectContaining({
        type: 'entity-list',
        entities: expect.arrayContaining([
          expect.objectContaining({ kind: 'merchant' }),
        ]),
      }),
    )
    expect(
      cards.find((card) => card.id === 'monthly-merchant-spend')?.value,
    ).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({
            key: expect.any(String),
            value: expect.any(Number),
          }),
        ]),
      }),
    )
  })

  it('infers spreadsheet-style money ratios as percent or number instead of money', () => {
    const data = createSeedMoneyData(new Date('2026-06-03T12:00:00Z'))
    const [percentCard, ratioCard] = evaluateCards(data, [
      {
        id: 'custom-savings-ratio',
        title: 'Custom Savings Ratio',
        kind: 'ratio',
        formula: '(Income.Sum() - Expenses.Sum()) / Income.Sum()',
        format: 'percent',
      },
      {
        id: 'custom-months-covered',
        title: 'Custom Months Covered',
        kind: 'metric',
        formula: 'Assets.Sum() / Expenses.MonthlyAverage(6)',
        format: 'number',
      },
    ])

    expect(percentCard).toEqual(
      expect.objectContaining({
        outputType: 'percent',
        displayValue: expect.stringMatching(/%$/),
      }),
    )
    expect(ratioCard).toEqual(
      expect.objectContaining({
        outputType: 'number',
        displayValue: expect.not.stringMatching(/^\$/),
      }),
    )
  })

  it('uses rolling savings rate for default savings cards so partial months do not read as zero', () => {
    const data: RawMoneyData = {
      accounts: [],
      transactions: [
        {
          id: 'income-last-month',
          source: 'manual',
          name: 'Last Month Payroll',
          amount: 1000,
          direction: 'income',
          category: ['Income'],
          date: '2026-05-15',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
        {
          id: 'expense-last-month',
          source: 'manual',
          name: 'Last Month Expenses',
          amount: 250,
          direction: 'expense',
          category: ['Spending'],
          date: '2026-05-20',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
        {
          id: 'expense-current-month',
          source: 'manual',
          name: 'Current Month Expenses',
          amount: 250,
          direction: 'expense',
          category: ['Spending'],
          date: '2026-06-03',
          isoCurrencyCode: 'USD',
          recurring: false,
        },
      ],
    }
    const cards = evaluateCards(data)
    const incomeSaved = cards.find((card) => card.id === 'income-saved')
    const savingsHealth = cards.find((card) => card.id === 'savings-health')

    expect(incomeSaved).toEqual(
      expect.objectContaining({
        formula:
          'SavingsRate(Income.Rolling(6mo).Sum(), Expenses.Rolling(6mo).Sum())',
        displayValue: '50%',
      }),
    )
    expect(savingsHealth).toEqual(
      expect.objectContaining({
        formula:
          'SavingsRate(Income.Rolling(6mo).Sum(), Expenses.Rolling(6mo).Sum())',
        displayValue: '50%',
      }),
    )
    expect(
      evaluateFormula(
        'SavingsRate(Income.ThisMonth().Sum(), Expenses.ThisMonth().Sum())',
        buildCollections(data),
        data,
      ),
    ).toBe(0)
  })

  it('keeps transaction filters and groups near-linear on larger imports', () => {
    const transactions = Array.from({ length: 2_500 }, (_, index) =>
      transaction(
        `large-import-${index}`,
        `2026-06-${String((index % 28) + 1).padStart(2, '0')}`,
        index + 1,
        index % 3 === 0 ? 'income' : index % 3 === 1 ? 'expense' : 'transfer',
      ),
    )
    const data: MoneyFormulaData = { accounts: [], transactions }
    const collections = buildCollections(data)

    const startedAt = performance.now()

    expect(
      evaluateFormulaValue(
        'Transactions.Where(direction = "income").Count()',
        collections,
        data,
      ),
    ).toBe(834)
    const directionMix = evaluateFormulaValue(
      'Transactions.GroupBy(direction).PercentOfTotal()',
      collections,
      data,
    ) as unknown as {
      type: 'table'
      rows: Array<{ key: string; count: number; percentOfTotal: number }>
    }

    expect(directionMix.type).toBe('table')
    expect(directionMix.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'income', count: 834 }),
        expect.objectContaining({ key: 'expense', count: 833 }),
        expect.objectContaining({ key: 'transfer', count: 833 }),
      ]),
    )
    expect(performance.now() - startedAt).toBeLessThan(1_000)
  })

  it('groups transactions by normalized currency aliases', () => {
    const data: MoneyFormulaData = {
      accounts: [],
      transactions: [
        {
          ...transaction('usd-expense', '2026-06-01', 100),
          isoCurrencyCode: 'USD',
        },
        {
          ...transaction('cad-expense', '2026-06-02', 150),
          isoCurrencyCode: 'CAD',
        },
        {
          ...transaction('cad-income', '2026-06-03', 200, 'income'),
          isoCurrencyCode: 'CAD',
        },
      ],
    }
    const collections = buildCollections(data)

    expect(
      evaluateFormulaValue(
        'Transactions.GroupBy(currency).PercentOfTotal()',
        collections,
        data,
      ),
    ).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({ key: 'CAD', value: 350, count: 2 }),
          expect.objectContaining({ key: 'USD', value: 100, count: 1 }),
        ]),
      }),
    )
    expect(
      evaluateFormulaValue(
        'Expenses.GroupBy(isoCurrencyCode).PercentOfTotal()',
        collections,
        data,
      ),
    ).toEqual(
      expect.objectContaining({
        type: 'table',
        rows: expect.arrayContaining([
          expect.objectContaining({ key: 'CAD', value: 150, count: 1 }),
          expect.objectContaining({ key: 'USD', value: 100, count: 1 }),
        ]),
      }),
    )
  })

  it('evaluates every default primary and secondary card formula', () => {
    const data = createSeedMoneyData(new Date('2026-06-03T12:00:00Z'))
    const collections = buildCollections(data)

    for (const card of DEFAULT_CARD_DEFINITIONS) {
      expect(() =>
        evaluateFormulaValue(card.formula, collections, data),
      ).not.toThrow()

      for (const formula of Object.values(card.secondaryFormulas ?? {})) {
        expect(() =>
          evaluateFormulaValue(formula, collections, data),
        ).not.toThrow()
      }
    }
  })
})
