import { Keypair, Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import 'dotenv/config';

(async () => {
    try {
        // 1. Configuração de Conexão com Retry
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_TREASURY_SECRET));
        const treasury = Keypair.fromSecretKey(secretKey);
        const mint = new PublicKey(process.env.SOLANA_VFOOD_MINT);

        console.log(`\nSTART: Verificando Tesouraria ${treasury.publicKey.toBase58()}`);
        console.log(`TOKEN: ${mint.toBase58()}`);

        // 2. Verificação de Saldo de SOL
        const solBalance = await connection.getBalance(treasury.publicKey);
        console.log(`💰 Saldo em SOL: ${solBalance / LAMPORTS_PER_SOL} SOL`);

        if (solBalance < 0.01 * LAMPORTS_PER_SOL) {
            throw new Error("Saldo de SOL insuficiente para criar o cofre. Peça mais no faucet!");
        }

        // 3. Criação do Cofre (ATA) com Log Detalhado
        console.log("📦 [2] Localizando ou Criando cofre de tokens...");
        const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            treasury,
            mint,
            treasury.publicKey,
            { commitment: 'confirmed' }
        );
        console.log(`✅ Cofre pronto: ${treasuryTokenAccount.address.toBase58()}`);

        // 4. Emissão dos Tokens
        const amountToMint = 1000000;
        console.log(`🖨️ [3] Emitindo ${amountToMint.toLocaleString()} $VFOOD...`);
        
        const txId = await mintTo(
            connection,
            treasury,
            mint,
            treasuryTokenAccount.address,
            treasury.publicKey, // A tesouraria deve ser a autoridade
            amountToMint * 100  // Valor * 10^2 decimais
        );

        console.log("\n=============================================");
        console.log(" 🎉 SUCESSO ABSOLUTO! COFRE ABASTECIDO");
        console.log("=============================================");
        console.log(`Hash da Transação: ${txId}`);
        console.log(`Saldo Final: ${amountToMint} $VFOOD`);
        console.log("=============================================\n");
        
    } catch (error) {
        console.error("\n❌ ERRO DETALHADO NO PROCESSO:");
        console.error("---------------------------------------------");
        console.error("Mensagem:", error.message);
        if (error.logs) console.error("Logs da Rede:", error.logs);
        console.error("---------------------------------------------");
        console.log("\nDICA: Se o erro for 'AccountNotFound', aguarde 30s e tente de novo. A Devnet pode estar lenta.");
    }
})();