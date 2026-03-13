import { createPublicClient, http, encodeFunctionData, parseUnits, type Hex } from 'viem'
import { avalanche } from 'viem/chains'
import type { ExchangeAdapter, OrderParams, OrderResult, Position } from './types'
import { GMX_API_BASE } from '../utils/constants'

// GMX V2 Avalanche contract addresses
const EXCHANGE_ROUTER = '0x11E590f6092D557bF71BaDEd50D81521E37eA5D0' as const
const USDC_ADDRESS = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as const

// Simplified ABI for createOrder
const EXCHANGE_ROUTER_ABI = [
  {
    name: 'createOrder',
    type: 'function',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'addresses', type: 'tuple', components: [
            { name: 'receiver', type: 'address' },
            { name: 'cancellationReceiver', type: 'address' },
            { name: 'callbackContract', type: 'address' },
            { name: 'uiFeeReceiver', type: 'address' },
            { name: 'market', type: 'address' },
            { name: 'initialCollateralToken', type: 'address' },
            { name: 'swapPath', type: 'address[]' },
          ]},
          { name: 'numbers', type: 'tuple', components: [
            { name: 'sizeDeltaUsd', type: 'uint256' },
            { name: 'initialCollateralDeltaAmount', type: 'uint256' },
            { name: 'triggerPrice', type: 'uint256' },
            { name: 'acceptablePrice', type: 'uint256' },
            { name: 'executionFee', type: 'uint256' },
            { name: 'callbackGasLimit', type: 'uint256' },
            { name: 'minOutputAmount', type: 'uint256' },
          ]},
          { name: 'orderType', type: 'uint256' },
          { name: 'decreasePositionSwapType', type: 'uint256' },
          { name: 'isLong', type: 'bool' },
          { name: 'shouldUnwrapNativeToken', type: 'bool' },
          { name: 'autoCancel', type: 'bool' },
          { name: 'referralCode', type: 'bytes32' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const

const publicClient = createPublicClient({
  chain: avalanche,
  transport: http(process.env.AVALANCHE_RPC_URL || 'https://avalanche-c-chain-rpc.publicnode.com/'),
})

// Market token lookup from GMX API
let marketsCache: Record<string, string> | null = null

async function getMarketToken(symbol: string): Promise<string | null> {
  if (!marketsCache) {
    try {
      const res = await fetch(`${GMX_API_BASE}/markets/info`)
      if (!res.ok) return null
      const data = await res.json()
      const markets = data.markets || data || []
      marketsCache = {}
      for (const m of markets) {
        // Extract symbol from market name like "ETH/USD [WETH-USDC]"
        const sym = m.name?.split('/')[0]?.trim()
        if (sym) marketsCache[sym] = m.marketToken
      }
    } catch {
      return null
    }
  }
  return marketsCache[symbol] || null
}

export class GmxAdapter implements ExchangeAdapter {
  venue = 'GMX'

  async getPositions(userAddress: string): Promise<Position[]> {
    // Fetch positions from GMX API
    try {
      const res = await fetch(`${GMX_API_BASE}/positions/${userAddress}`)
      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []

      return data.map((p: Record<string, unknown>) => ({
        venue: 'GMX',
        market: (p.market as string) || '',
        side: p.isLong ? 'long' as const : 'short' as const,
        sizeUsd: Number(p.sizeInUsd) / 1e30,
        entryPrice: Number(p.entryPrice) / 1e30,
        markPrice: Number(p.markPrice) / 1e30,
        unrealizedPnl: Number(p.unrealizedPnl) / 1e30,
        leverage: Number(p.leverage) / 1e4,
        liquidationPrice: p.liquidationPrice ? Number(p.liquidationPrice) / 1e30 : null,
        fundingAccrued: Number(p.fundingFeeAmount || 0) / 1e30,
      }))
    } catch {
      return []
    }
  }

  async placeOrder(userAddress: string, params: OrderParams): Promise<OrderResult> {
    const marketToken = await getMarketToken(params.market)
    if (!marketToken) {
      return {
        orderId: '',
        venue: 'GMX',
        market: params.market,
        side: params.side,
        sizeUsd: params.sizeUsd,
        entryPrice: null,
        status: 'failed',
        timestamp: Math.floor(Date.now() / 1000),
      }
    }

    const sizeDeltaUsd = parseUnits(params.sizeUsd.toFixed(0), 30)
    const collateralAmount = parseUnits(
      (params.sizeUsd / params.leverage).toFixed(6),
      6, // USDC has 6 decimals
    )

    const executionFee = parseUnits('0.01', 18) // 0.01 AVAX

    // Build unsigned transaction
    const data = encodeFunctionData({
      abi: EXCHANGE_ROUTER_ABI,
      functionName: 'createOrder',
      args: [{
        addresses: {
          receiver: userAddress as Hex,
          cancellationReceiver: userAddress as Hex,
          callbackContract: '0x0000000000000000000000000000000000000000' as Hex,
          uiFeeReceiver: '0x0000000000000000000000000000000000000000' as Hex,
          market: marketToken as Hex,
          initialCollateralToken: USDC_ADDRESS,
          swapPath: [],
        },
        numbers: {
          sizeDeltaUsd,
          initialCollateralDeltaAmount: collateralAmount,
          triggerPrice: BigInt(0),
          acceptablePrice: params.side === 'long'
            ? parseUnits('99999', 30)  // Max acceptable for long
            : BigInt(1),               // Min acceptable for short
          executionFee,
          callbackGasLimit: BigInt(0),
          minOutputAmount: BigInt(0),
        },
        orderType: BigInt(params.orderType === 'market' ? 2 : 3), // MarketIncrease : LimitIncrease
        decreasePositionSwapType: BigInt(0),
        isLong: params.side === 'long',
        shouldUnwrapNativeToken: false,
        autoCancel: false,
        referralCode: '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex,
      }],
    })

    return {
      orderId: `gmx-${Date.now()}`,
      venue: 'GMX',
      market: params.market,
      side: params.side,
      sizeUsd: params.sizeUsd,
      entryPrice: null,
      status: 'pending',
      timestamp: Math.floor(Date.now() / 1000),
      unsignedTx: {
        to: EXCHANGE_ROUTER,
        data,
        value: executionFee.toString(),
      },
    }
  }

  async closePosition(userAddress: string, market: string): Promise<OrderResult> {
    // For closing, we'd build a decrease order
    // Simplified: returns a pending result that needs to be signed
    return this.placeOrder(userAddress, {
      market,
      side: 'long', // Will be handled by the decrease logic
      sizeUsd: 0,
      leverage: 1,
      orderType: 'market',
    })
  }

  async getBalance(userAddress: string): Promise<number> {
    try {
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: [{
          name: 'balanceOf',
          type: 'function',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
        }],
        functionName: 'balanceOf',
        args: [userAddress as Hex],
      })
      return Number(balance) / 1e6
    } catch {
      return 0
    }
  }
}
