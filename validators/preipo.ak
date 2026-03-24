use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Output, ScriptContext, Spend, Transaction, find_input,
}
use aiken/transaction/credential.{VerificationKey}

type PubKeyHash =
  Hash<Blake2b_224, VerificationKey>

/// Fixed-point scale for price vs token amounts (off-chain uses same).
const scale: Int = 1_000_000

/// EMA-style TWAV: twav' = (twav * 9 + current') / 10 after first update.
const twav_num: Int = 9

const twav_den: Int = 10

/// Max |Δprice| / price per oracle step (basis points).
const max_variance_bps: Int = 2000

/// Min milliseconds between oracle updates (skipped when seq == 0). Low for Preprod demos.
const min_interval_ms: Int = 1_000

/// Pool implied price vs twav (basis points). Wider so multi-step demos stay valid.
const pool_deviation_bps: Int = 2500

fn abs_int(x: Int) -> Int {
  if x < 0 {
    0 - x
  } else {
    x
  }
}

/// Single-market datum: oracle + USDCx vault accounting + pool reserves (one UTxO per market).
type MarketState {
  index_id: ByteArray,
  current_price: Int,
  twav_price: Int,
  publisher_keyset_hash: PubKeyHash,
  last_oracle_time: Int,
  collateral_locked: Int,
  vtoken_supply: Int,
  reserve_a: Int,
  reserve_b: Int,
  seq: Int,
}

type PerpDatum {
  trader: PubKeyHash,
  operator: PubKeyHash,
  market: Option<MarketState>,
}

/// One validator: Oracle | Collateral mint/redeem | Pool swap (Mesh/Lucid off-chain).
type PerpRedeemer {
  Oracle(MarketState)
  Mint(MarketState)
  Redeem(MarketState)
  /// sell_a: 1 = sell A for B, 0 = sell B for A; amount_in, min_out; next state carries new reserves.
  Swap(Int, Int, Int, MarketState)
}

fn signed(tx: Transaction, who: PubKeyHash) -> Bool {
  list.has(tx.extra_signatories, who)
}

/// Implied micro-price: quote per base (reserve_b * scale / reserve_a).
fn implied_price(res_a: Int, res_b: Int) -> Int {
  if res_a <= 0 {
    0
  } else {
    res_b * scale / res_a
  }
}

validator {
  fn preipo(data: PerpDatum, redeemer: PerpRedeemer, ctx: ScriptContext) -> Bool {
    expect Spend(own_output_ref) = ctx.purpose
    expect Some(own_input) = find_input(ctx.transaction.inputs, own_output_ref)

    let get_own_output =
      fn() -> Output {
        expect [own_out] = {
          let is_own =
            fn(o: Output) -> Bool { o.address == own_input.output.address }
          ctx.transaction.outputs |> list.filter(is_own)
        }
        own_out
      }

    let in_value = own_input.output.value
    let out_value = get_own_output().value

    let correct_continue =
      fn(new: MarketState) -> Bool {
        expect InlineDatum(raw) = get_own_output().datum
        expect out_datum: PerpDatum = raw

        data.trader == out_datum.trader && data.operator == out_datum.operator && Some(
          new,
        ) == out_datum.market
      }

    let preserved_ids =
      fn(old: MarketState, new: MarketState) -> Bool {
        new.index_id == old.index_id && new.publisher_keyset_hash == old.publisher_keyset_hash
      }

    when redeemer is {
      Oracle(new) -> {
        expect Some(old) = data.market

        let seq_ok = new.seq == old.seq + 1

        let oracle_fields_preserved =
          new.collateral_locked == old.collateral_locked && new.vtoken_supply == old.vtoken_supply && new.reserve_a == old.reserve_a && new.reserve_b == old.reserve_b

        let interval_ok =
          if old.seq == 0 {
            True
          } else {
            new.last_oracle_time >= old.last_oracle_time + min_interval_ms
          }

        let variance_ok =
          if old.current_price <= 0 {
            False
          } else {
            abs_int(new.current_price - old.current_price) * 10000 <= max_variance_bps * old.current_price
          }

        let twav_ok =
          if old.seq == 0 {
            new.twav_price == new.current_price
          } else {
            new.twav_price == (old.twav_price * twav_num + new.current_price) / twav_den
          }

        preserved_ids(old, new)? && seq_ok? && oracle_fields_preserved? && interval_ok? && variance_ok? && twav_ok? && correct_continue(
          new,
        )? && (in_value == out_value)? && signed(
          ctx.transaction,
          new.publisher_keyset_hash,
        )?
      }

      Mint(new) -> {
        expect Some(old) = data.market

        let seq_ok = new.seq == old.seq + 1

        let minted = new.vtoken_supply - old.vtoken_supply

        let expected_collateral = old.collateral_locked + minted * old.twav_price / scale

        let pool_ok =
          new.reserve_a == old.reserve_a && new.reserve_b == old.reserve_b

        let prices_ok =
          new.current_price == old.current_price && new.twav_price == old.twav_price && new.last_oracle_time == old.last_oracle_time

        let mint_ok = minted > 0 && new.collateral_locked == expected_collateral

        preserved_ids(old, new)? && seq_ok? && mint_ok? && pool_ok? && prices_ok? && (in_value == out_value)? && correct_continue(
          new,
        )? && signed(ctx.transaction, data.trader)?
      }

      Redeem(new) -> {
        expect Some(old) = data.market

        let seq_ok = new.seq == old.seq + 1

        let burned = old.vtoken_supply - new.vtoken_supply

        let payout = burned * old.twav_price / scale

        let expected_collateral = old.collateral_locked - payout

        let pool_ok =
          new.reserve_a == old.reserve_a && new.reserve_b == old.reserve_b

        let prices_ok =
          new.current_price == old.current_price && new.twav_price == old.twav_price && new.last_oracle_time == old.last_oracle_time

        let redeem_ok = burned > 0 && new.collateral_locked == expected_collateral

        preserved_ids(old, new)? && seq_ok? && redeem_ok? && pool_ok? && prices_ok? && (in_value == out_value)? && correct_continue(
          new,
        )? && signed(ctx.transaction, data.trader)?
      }

      Swap(sell_a, amount_in, min_out, new) -> {
        expect Some(old) = data.market

        let seq_ok = new.seq == old.seq + 1

        let vault_ok =
          new.collateral_locked == old.collateral_locked && new.vtoken_supply == old.vtoken_supply

        let oracle_ok =
          new.current_price == old.current_price && new.twav_price == old.twav_price && new.last_oracle_time == old.last_oracle_time

        let amount_ok = amount_in > 0

        let cp_ok =
          if sell_a == 1 {
            let new_a = old.reserve_a + amount_in
            if new_a <= 0 {
              False
            } else {
              let out = old.reserve_b * amount_in / new_a
              let new_b = old.reserve_b - out
              new.reserve_a == new_a && new.reserve_b == new_b && out >= min_out
            }
          } else if sell_a == 0 {
            let new_b = old.reserve_b + amount_in
            if new_b <= 0 {
              False
            } else {
              let out = old.reserve_a * amount_in / new_b
              let new_a = old.reserve_a - out
              new.reserve_a == new_a && new.reserve_b == new_b && out >= min_out
            }
          } else {
            False
          }

        let implied = implied_price(new.reserve_a, new.reserve_b)

        let dev_ok =
          if old.twav_price <= 0 {
            False
          } else {
            abs_int(implied - old.twav_price) * 10000 <= pool_deviation_bps * old.twav_price
          }

        preserved_ids(old, new)? && seq_ok? && vault_ok? && oracle_ok? && amount_ok? && cp_ok? && dev_ok? && (in_value == out_value)? && correct_continue(
          new,
        )? && signed(ctx.transaction, data.trader)?
      }
    }
  }
}
