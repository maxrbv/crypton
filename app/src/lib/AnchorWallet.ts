import { Wallet } from "@project-serum/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";

export default class AnchorWallet implements Wallet {
    constructor(readonly payer: Keypair) {}
    
    static local(): AnchorWallet {
        const payer = new Uint8Array([82,5,168,216,6,221,5,101,148,238,68,243,110,30,246,8,228,44,47,47,57,246,134,135,33,89,135,217,155,149,203,250,192,149,250,37,189,23,103,245,55,118,149,78,77,178,160,114,155,136,195,98,166,162,95,86,191,179,118,184,24,228,18,126]);
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