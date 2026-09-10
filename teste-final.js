import 'dotenv/config';
import { Keypair, Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';

(async () => {
    try {
        console.log("🚀 Iniciando teste de transferência...");
        const treasurySecret = process.env.SOLANA_TREASURY_SECRET;
        const mintAddr = process.env.SOLANA_VFOOD_MINT;
        
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const secretKey = Uint8Array.from(JSON.parse(treasurySecret));
        const treasury = Keypair.fromSecretKey(secretKey);
        const mint = new PublicKey(mintAddr);

        console.log(`Tesouraria: ${treasury.publicKey.toBase58()}`);
        console.log("Criando/Buscando contas de token...");

        const ata = await getOrCreateAssociatedTokenAccount(connection, treasury, mint, treasury.publicKey);
        
        console.log("✅ Conexão com a rede OK!");
        console.log(`Saldo de tokens disponível na conta: ${ata.address.toBase58()}`);
        console.log("\nSe chegou aqui sem erro, o backend vai funcionar na Vercel!");
    } catch (e) {
        console.error("❌ Erro no teste:", e.message);
    }
})();