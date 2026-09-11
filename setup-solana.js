import { Keypair, Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import 'dotenv/config';

(async () => {
    try {
        console.log("🚀 Iniciando abastecimento simplificado...");
        
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_TREASURY_SECRET));
        const treasury = Keypair.fromSecretKey(secretKey);
        const mint = new PublicKey(process.env.SOLANA_VFOOD_MINT);

        // 1. Criar ou buscar o cofre (ATA) avisando que o programa é o Token-2022
        console.log("📦 Criando/Buscando cofre de tokens...");
        const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            treasury,
            mint,
            treasury.publicKey,
            undefined,
            'confirmed',
            undefined,
            TOKEN_2022_PROGRAM_ID // <-- A ÚNICA DIFERENÇA QUE IMPORTA
        );

        console.log(`✅ Cofre: ${treasuryTokenAccount.address.toBase58()}`);

        // 2. Imprimir os tokens
        console.log("🖨️  Mintando 1.000.000 $VFOOD...");
        const txId = await mintTo(
            connection,
            treasury,
            mint,
            treasuryTokenAccount.address,
            treasury.publicKey,
            1000000 * 100, // 1 milhão com 2 casas decimais
            [],
            undefined,
            TOKEN_2022_PROGRAM_ID // <-- AVISANDO O PROGRAMA CORRETO NOVAMENTE
        );

        console.log("\n=============================================");
        console.log(" 🎉 SUCESSO! SEU COFRE ESTÁ CHEIO");
        console.log("=============================================");
        console.log(`Transação: ${txId}`);
        console.log(`Saldo: 1.000.000 $VFOOD`);
        console.log("=============================================\n");

    } catch (error) {
        console.error("\n❌ Falha no processo:");
        console.error(error.message);
        console.log("\nSe o erro for 'Connection Refused', aguarde 5 segundos e rode novamente.");
    }
})();