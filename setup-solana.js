import { Keypair, Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, createMintToInstruction, getAccount } from '@solana/spl-token';
import 'dotenv/config';

(async () => {
    try {
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_TREASURY_SECRET));
        const treasury = Keypair.fromSecretKey(secretKey);
        const mint = new PublicKey(process.env.SOLANA_VFOOD_MINT);

        console.log(`\n🚀 INICIANDO ABASTECIMENTO VFOOD`);
        console.log(`Tesouraria: ${treasury.publicKey.toBase58()}`);
        console.log(`Token: ${mint.toBase58()}`);

        // 1. Calcular endereço do cofre (ATA)
        const ata = getAssociatedTokenAddressSync(mint, treasury.publicKey);
        console.log(`Cofre (ATA): ${ata.toBase58()}`);

        // 2. Verificar se o cofre já existe
        let accountExists = false;
        try {
            await getAccount(connection, ata);
            accountExists = true;
            console.log("✅ Cofre já existe na rede.");
        } catch (e) {
            console.log("📦 Cofre não encontrado. Criando novo registro...");
        }

        const transaction = new Transaction();

        // 3. Se não existe, adiciona instrução de criação
        if (!accountExists) {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    treasury.publicKey,
                    ata,
                    treasury.publicKey,
                    mint
                )
            );
        }

        // 4. Adiciona instrução de impressão (Mintagem) de 1.000.000 tokens
        const amount = 1000000 * 100; // 1 milhão com 2 casas decimais
        transaction.add(
            createMintToInstruction(mint, ata, treasury.publicKey, amount)
        );

        console.log("⏳ Enviando transação para a Blockchain...");
        const signature = await sendAndConfirmTransaction(connection, transaction, [treasury]);

        console.log("\n=============================================");
        console.log(" 🎉 SUCESSO! TOKENS GERADOS COM SUCESSO");
        console.log("=============================================");
        console.log(`Hash: ${signature}`);
        console.log(`Novo Saldo: 1.000.000 $VFOOD`);
        console.log("=============================================\n");

    } catch (error) {
        console.error("\n❌ ERRO CRÍTICO:");
        console.error("---------------------------------------------");
        console.error(error.message);
        if (error.stack) console.log("\nRastro do erro:", error.stack);
    }
})();