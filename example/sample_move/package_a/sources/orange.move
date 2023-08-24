module package_a::orange {

  use std::option;

  use sui::transfer;
  use sui::url::Url;
  use sui::tx_context::TxContext;
  use sui::object::{Self, UID};
  use sui::coin::{Self, Coin, TreasuryCap};

  use package_b::apple::APPLE;

  struct ORANGE has drop {}

  struct Vault has key {
    id: UID,
    apple: Coin<APPLE>,
  }

  fun init(otw: ORANGE, ctx: &mut TxContext) {
    let decimal = 9;
    let symbol = b"ORANGE";
    let name = b"Orange Coin";
    let desc = b"Orange Coin is a coin for orange";
    let url = option::none<Url>();
    let (treasury_cap, coin_meta) = coin::create_currency(otw, decimal, symbol, name, desc, url, ctx);
    let vault = Vault {
      id: object::new(ctx),
      apple: coin::zero(ctx),
    };
    transfer::share_object(vault);
    transfer::public_share_object(treasury_cap);
    transfer::public_share_object(coin_meta);
  }

  public fun swap_apple_to_orange(
    vault: &mut Vault,
    treasury_cap: &mut TreasuryCap<ORANGE>,
    apple: Coin<APPLE>,
    ctx: &mut TxContext,
  ): Coin<ORANGE> {
    let apple_amount = coin::value(&apple);
    coin::join(&mut vault.apple, apple);
    coin::mint(treasury_cap, apple_amount, ctx)
  }
}
