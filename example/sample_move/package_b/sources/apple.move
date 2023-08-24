module package_b::apple {

  use std::option;
  use sui::tx_context;
  use sui::transfer;
  use sui::url::Url;
  use sui::coin;
  use sui::tx_context::TxContext;

  struct APPLE has drop {}

  fun init(otw: APPLE, ctx: &mut TxContext) {
    let decimal = 9;
    let symbol = b"APPLE";
    let name = b"Apple Coin";
    let desc = b"Apple Coin is a coin for apple";
    let url = option::none<Url>();
    let (treasury, coin_meta) = coin::create_currency(otw, decimal, symbol, name, desc, url, ctx);
    transfer::public_transfer(treasury, tx_context::sender(ctx));
    transfer::public_share_object(coin_meta);
  }
}
