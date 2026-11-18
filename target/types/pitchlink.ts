/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pitchlink.json`.
 */
export type Pitchlink = {
  "address": "EvJeVAfsJQ5tKR2RH4to2jgePPftg175H2re4Tw9V9AD",
  "metadata": {
    "name": "pitchlink",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Pitchlink: pump.fun-style single-link ad auction for niche creators on Solana"
  },
  "instructions": [
    {
      "name": "cancelAuction",
      "docs": [
        "Creator cancels — only allowed while there are no bids."
      ],
      "discriminator": [
        156,
        43,
        197,
        110,
        218,
        105,
        143,
        182
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.creator",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "Included so its address is verified against the auction's PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "incrementClick",
      "docs": [
        "Records one click on a tracked link. Permissionless."
      ],
      "discriminator": [
        189,
        6,
        253,
        63,
        135,
        146,
        88,
        65
      ],
      "accounts": [
        {
          "name": "clickCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  108,
                  105,
                  99,
                  107,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "linkId"
              }
            ]
          }
        },
        {
          "name": "clicker",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "linkId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        }
      ]
    },
    {
      "name": "initClickCounter",
      "docs": [
        "Creates the ClickCounter PDA for a tracked link (count = 0)."
      ],
      "discriminator": [
        146,
        218,
        148,
        116,
        19,
        197,
        211,
        39
      ],
      "accounts": [
        {
          "name": "clickCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  108,
                  105,
                  99,
                  107,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "linkId"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "linkId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "creator",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initializeAuction",
      "docs": [
        "Creator opens their ad-slot auction."
      ],
      "discriminator": [
        37,
        10,
        117,
        197,
        208,
        88,
        117,
        62
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "No data stored; address derived from auction key per CONTRACT.md."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "endTs",
          "type": "i64"
        }
      ]
    },
    {
      "name": "placeBid",
      "docs": [
        "Brand places a bid. Must strictly exceed current highest_bid.",
        "Atomically refunds the previous highest bidder."
      ],
      "discriminator": [
        238,
        77,
        148,
        91,
        200,
        151,
        92,
        146
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.creator",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "System-owned, no data; address is enforced by the seeds + bump."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "previousBidder",
          "docs": [
            "auction.highest_bidder before any refund transfer occurs."
          ],
          "writable": true
        },
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settleAuction",
      "docs": [
        "After end_ts: pay highest_bid from treasury to creator, mark settled."
      ],
      "discriminator": [
        246,
        196,
        183,
        98,
        222,
        139,
        46,
        133
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.creator",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true
        },
        {
          "name": "settler",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "auction",
      "discriminator": [
        218,
        94,
        247,
        242,
        126,
        233,
        131,
        81
      ]
    },
    {
      "name": "clickCounter",
      "discriminator": [
        241,
        48,
        60,
        127,
        219,
        147,
        20,
        167
      ]
    }
  ],
  "events": [
    {
      "name": "bidPlaced",
      "discriminator": [
        135,
        53,
        176,
        83,
        193,
        69,
        108,
        61
      ]
    },
    {
      "name": "clickRecorded",
      "discriminator": [
        46,
        88,
        140,
        247,
        34,
        42,
        108,
        98
      ]
    },
    {
      "name": "settled",
      "discriminator": [
        232,
        210,
        40,
        17,
        142,
        124,
        145,
        238
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidEndTs",
      "msg": "Auction end timestamp must be in the future"
    },
    {
      "code": 6001,
      "name": "auctionEnded",
      "msg": "Auction has already ended"
    },
    {
      "code": 6002,
      "name": "auctionStillActive",
      "msg": "Auction is still active"
    },
    {
      "code": 6003,
      "name": "alreadySettled",
      "msg": "Auction has already been settled"
    },
    {
      "code": 6004,
      "name": "bidTooLow",
      "msg": "Bid must be strictly greater than current highest bid"
    },
    {
      "code": 6005,
      "name": "creatorCannotBid",
      "msg": "Creator cannot bid on their own auction"
    },
    {
      "code": 6006,
      "name": "notCreator",
      "msg": "Only the creator can cancel the auction"
    },
    {
      "code": 6007,
      "name": "auctionHasBids",
      "msg": "Cannot cancel an auction that already has bids"
    },
    {
      "code": 6008,
      "name": "previousBidderMismatch",
      "msg": "Previous bidder account does not match the current highest bidder"
    },
    {
      "code": 6009,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6010,
      "name": "invalidLinkId",
      "msg": "Link id must not be all zero bytes"
    }
  ],
  "types": [
    {
      "name": "auction",
      "docs": [
        "Auction account for a single creator's ad slot.",
        "",
        "PDA seeds (from CONTRACT.md): [b\"auction\", creator_pubkey]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "docs": [
              "Creator who gets paid when the auction settles (the influencer)."
            ],
            "type": "pubkey"
          },
          {
            "name": "endTs",
            "docs": [
              "Unix timestamp when the auction closes."
            ],
            "type": "i64"
          },
          {
            "name": "highestBid",
            "docs": [
              "Current highest bid in lamports (0 if no bids yet)."
            ],
            "type": "u64"
          },
          {
            "name": "highestBidder",
            "docs": [
              "Current highest bidder (Pubkey::default() if no bids)."
            ],
            "type": "pubkey"
          },
          {
            "name": "settled",
            "docs": [
              "True once settle_auction has moved funds to the creator."
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "Cached bump for the auction PDA."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bidPlaced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "clickCounter",
      "docs": [
        "On-chain click counter for one tracked link.",
        "",
        "Fully independent of the auction accounts: no payment, escrow, or auction",
        "logic touches this account.",
        "",
        "PDA seeds: [b\"clicks\", link_id]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "linkId",
            "docs": [
              "Fixed-length identifier of the tracked link (zero-padded UTF-8)."
            ],
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "count",
            "docs": [
              "Total clicks recorded for this link."
            ],
            "type": "u64"
          },
          {
            "name": "creator",
            "docs": [
              "Creator the link credits (who the conversion belongs to)."
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "docs": [
              "Cached bump for the click counter PDA."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "clickRecorded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "linkId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "count",
            "type": "u64"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "settled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
