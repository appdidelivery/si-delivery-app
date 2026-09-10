import { Keypair, Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import 'dotenv/config';

(async () => {
    try {
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_TREASURY_SECRET));
        const treasury = Keypair.fromSecretKey(secretKey);
        
        let mint;
        if (process.env.SOLANA_VFOOD_MINT && process.env.SOLANA_VFOOD_MINT !== "0") {
            console.log("🔍 [1] Contrato existente detectado. Preparando emissão...");
            mint = new PublicKey(process.env.SOLANA_VFOOD_MINT);
        } else {
            console.log("🆕 [1] Criando novo contrato...");
            mint = await createMint(connection, treasury, treasury.publicKey, null, 2);
        }

        console.log(`📍 Mint Address: ${mint.toBase58()}`);

        // 2. Cria a "Conta de Token" (Cofre) da Tesouraria
        console.log("📦 [2] Criando cofre de tokens para a Tesouraria...");
        const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            treasury,
            mint,
            treasury.publicKey
        );

        // 3. Imprime 1.000.000 de $VFOOD (com 2 casas decimais)
        console.log("🖨️ [3] Mintando 1.000.000 $VFOOD no cofre...");
        await mintTo(
            connection,
            treasury,
            mint,
            treasuryTokenAccount.address,
            treasury.publicKey,
            1000000 * 100 // 1 milhão * 100 (devido às 2 casas decimais)
        );

        console.log("\n=============================================");
        console.log(" ✅ SUCESSO! SEU COFRE ESTÁ CHEIO DE $VFOOD");
        console.log("=============================================\n");
        console.log(`SOLANA_VFOOD_MINT=${mint.toBase58()}`);
        console.log(`Endereço do seu Cofre: ${treasuryTokenAccount.address.toBase58()}`);
        console.log("\nAgora você já pode rodar o teste de transferência!");
        
    } catch (error) {
        console.error("\n❌ Erro no processo:", error.message);
    }
})();