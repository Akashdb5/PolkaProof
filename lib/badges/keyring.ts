import { Keyring } from "@polkadot/keyring";
import type { KeyringPair } from "@polkadot/keyring/types";

class BadgeKeyring {
  private keyring = new Keyring({ type: "sr25519" });
  private admin: KeyringPair | null = null;
  private cachedMnemonic: string | null = null;

  ensureAdmin(mnemonic?: string) {
    if (!mnemonic) {
      throw new Error("BADGE_ADMIN_MNEMONIC is not configured");
    }

    if (this.admin && this.cachedMnemonic === mnemonic) {
      return this.admin;
    }

    this.admin = this.keyring.addFromMnemonic(mnemonic);
    this.cachedMnemonic = mnemonic;
    return this.admin;
  }

  getAdmin() {
    if (!this.admin) {
      throw new Error("Badge admin account not initialized");
    }
    return this.admin;
  }
}

export const badgeKeyring = new BadgeKeyring();
