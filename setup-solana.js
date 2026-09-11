import { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMint, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import 'dotenv/config';

(async () => {
    try {
        console.log("1. Conectando à Solana Devnet...");
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        
        console.log("2. Lendo chave da Tesouraria...");
        const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_TREASURY_SECRET));
        const treasury = Keypair.fromSecretKey(secretKey);

        console.log("3. Verificando saldo para taxas...");
        const balance = await connection.getBalance(treasury.publicKey);
        console.log(`Saldo: ${balance / LAMPORTS_PER_SOL} SOL`);

        console.log("4. Criando contrato definitivo ($VFOOD)...");
        // Criando com o padrão Token-2022 (Moderno)
        const mint = await createMint(
            connection,
            treasury,
            treasury.publicKey,
            null,
            2,
            undefined,
            undefined,
            TOKEN_2022_PROGRAM_ID
        );

        console.log("\n=============================================");
        console.log(" 🎉 SUCESSO! O NOVO TOKEN FOI CRIADO");
        console.log("=============================================\n");
        console.log(`COPIE ESTE ENDEREÇO PARA O SEU .env:`);
        console.log(`SOLANA_VFOOD_MINT=${mint.toBase58()}`);
        console.log("\n=============================================");
        console.log("DICA: Após colar no .env, rode o script 'node setup-solana.js' para encher o cofre.");

    } catch (error) {
        console.error("\n❌ Erro ao criar token:", error.message);
    }
})();