// Copyright 2017-2018 Stratumn SAS. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { sig } from "@stratumn/js-crypto";
import * as b64 from "base64-js";
import { Base64 } from "js-base64";
import * as constants from "./const";
import * as errors from "./errors";
import { Link } from "./link";
import { stratumn } from "./proto/chainscript_pb";

/**
 * A signature of configurable parts of a link.
 * Different signature types and versions are allowed to sign different
 * encodings of the data, but we recommend signing a hash of the
 * protobuf-encoded bytes.
 */
export class Signature {
  private s: stratumn.chainscript.ISignature;

  constructor(s: stratumn.chainscript.ISignature) {
    this.s = s;
  }

  /**
   * @returns the version of the signature scheme.
   */
  public version(): string {
    return this.s.version || "";
  }

  /**
   * @returns the algorithm used (for example, "EdDSA").
   */
  public type(): string {
    return this.s.type || "";
  }

  /**
   * @returns a description of the parts of the link that are signed.
   */
  public payloadPath(): string {
    return this.s.payloadPath || "";
  }

  /**
   * @returns the public key of the signer.
   */
  public publicKey(): Uint8Array {
    return this.s.publicKey || new Uint8Array(0);
  }

  /**
   * @returns the signature bytes.
   */
  public signature(): Uint8Array {
    return this.s.signature || new Uint8Array(0);
  }

  /**
   * Validate the signature and throw an exception if invalid.
   * @param link the link signed.
   */
  public validate(link: Link): void {
    if (!this.publicKey() || this.publicKey().length === 0) {
      throw errors.ErrSignaturePublicKeyMissing;
    }

    if (!this.signature() || this.signature().length === 0) {
      throw errors.ErrSignatureMissing;
    }

    switch (this.version()) {
      case constants.SIGNATURE_VERSION_1_0_0:
        const signed = link.signedBytes(this.version(), this.payloadPath());
        const publicKey = new sig.SigningPublicKey({
          pemPublicKey: Base64.atob(b64.fromByteArray(this.publicKey()))
        });

        const valid = publicKey.verify({
          message: signed,
          signature: this.signature()
        });

        if (!valid) {
          throw errors.ErrSignatureInvalid;
        }
        return;
      default:
        throw errors.ErrSignatureVersionUnknown;
    }
  }
}
