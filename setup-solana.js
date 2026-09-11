import { Keypair, Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import 'dotenv/config';

(async () => {
    try {
        console.log("🚀 Iniciando abastecimento do cofre VFOOD...");
        
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_TREASURY_SECRET));
        const treasury = Keypair.fromSecretKey(secretKey);
        const mint = new PublicKey(process.env.SOLANA_VFOOD_MINT);

        console.log(`📍 Token: ${mint.toBase58()}`);

        // 1. Criar ou buscar o cofre (ATA) da Tesouraria usando o Programa Token-2022
        console.log("📦 Abrindo cofre de segurança na blockchain...");
        const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            treasury,
            mint,
            treasury.publicKey,
            undefined,
            'confirmed',
            undefined,
            TOKEN_2022_PROGRAM_ID
        );

        console.log(`✅ Endereço do Cofre: ${treasuryTokenAccount.address.toBase58()}`);

        // 2. Imprimir 1.000.000 de tokens
        const supply = 1000000;
        console.log(`🖨️  Imprimindo ${supply.toLocaleString()} $VFOOD...`);
        
        const txId = await mintTo(
            connection,
            treasury,
            mint,
            treasuryTokenAccount.address,
            treasury.publicKey,
            supply * 100, // Valor com 2 casas decimais
            [],
            undefined,
            TOKEN_2022_PROGRAM_ID
        );

        console.log("\n=============================================");
        console.log(" 🎉 SUCESSO! TESOURARIA ABASTECIDA");
        console.log("=============================================");
        console.log(`Saldo Atual: ${supply.toLocaleString()} $VFOOD`);
        console.log(`Hash da Transação: ${txId}`);
        console.log("=============================================\n");
        console.log("DICA: Agora abra sua Phantom e veja a mágica acontecer!");

    } catch (error) {
        console.error("\n❌ Falha no abastecimento:");
        console.error(error.message);
    }
})();