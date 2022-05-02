import { Wallet } from "@project-serum/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";

export default class AnchorWallet implements Wallet {
    constructor(readonly payer: Keypair) {}
    
    static local(): AnchorWallet {
        const payer = new Uint8Array([0,36,6,78,19,66,87,231,192,105,103,94,233,94,151,66,161,178,182,244,143,180,152,53,143,234,114,20,66,111,134,218,60,34,46,151,247,10,121,69,181,103,87,189,255,233,50,145,233,76,63,58,59,47,0,145,28,222,79,84,74,83,0,11]);
        return new AnchorWallet(Keypair.fromSecretKey(payer))
    }

    async signTransaction(tx: Transaction): Promise<Transaction> {
        return (window as any).solana.signTransaction(this.payer);
    }
    
    async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
        return txs.map(t => (window as any).solana.signTransaction(this.payer));
    }

    get publicKey(): PublicKey {
        return this.payer.publicKey;
    }
}