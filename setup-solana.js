import { Keypair, Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo, transfer, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import 'dotenv/config';

(async () => {
    try {
        console.log("🚀 [BLOCKCHAIN] Iniciando Operação de Abastecimento e Envio...");
        
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_TREASURY_SECRET));
        const treasury = Keypair.fromSecretKey(secretKey);
        const mint = new PublicKey(process.env.SOLANA_VFOOD_MINT);
        const myPhantomWallet = new PublicKey("7cPFaLtQ3H2GRr1wHaoGeG9hhDDgPWBQGqJ6aXe5Ghsk");

        console.log(`📍 Token Mint: ${mint.toBase58()}`);

        // 1. Criar/Buscar Cofre da Tesouraria
        console.log("📦 Abrindo cofre da Tesouraria...");
        const treasuryATA = await getOrCreateAssociatedTokenAccount(
            connection, treasury, mint, treasury.publicKey, undefined, 'confirmed', undefined, TOKEN_2022_PROGRAM_ID
        );

        // 2. Mintar 1 Milhão de tokens para a Tesouraria
        console.log("🖨️  Mintando 1.000.000 $VFOOD na Tesouraria...");
        await mintTo(
            connection, treasury, mint, treasuryATA.address, treasury.publicKey, 1000000 * 100, [], undefined, TOKEN_2022_PROGRAM_ID
        );

        // 3. ENVIAR 1.000 TOKENS PARA SUA PHANTOM
        console.log(`💸 Enviando 1.000 $VFOOD para sua Phantom (${myPhantomWallet.toBase58()})...`);
        const destinationATA = await getOrCreateAssociatedTokenAccount(
            connection, treasury, mint, myPhantomWallet, undefined, 'confirmed', undefined, TOKEN_2022_PROGRAM_ID
        );

        const signature = await transfer(
            connection,
            treasury,
            treasuryATA.address,
            destinationATA.address,
            treasury.publicKey,
            1000 * 100, // 1.000 tokens * 100 (decimais)
            [],
            undefined,
            TOKEN_2022_PROGRAM_ID
        );

        console.log("\n=============================================");
        console.log(" 🎉 OPERAÇÃO CONCLUÍDA COM SUCESSO!");
        console.log("=============================================");
        console.log(`Saldo Tesouraria: ~999.000 $VFOOD`);
        console.log(`Enviado para Phantom: 1.000 $VFOOD`);
        console.log(`Hash da Transação: ${signature}`);
        console.log("=============================================\n");
        console.log("ABRA SUA PHANTOM AGORA E VEJA O SALDO!");

    } catch (error) {
        console.error("\n❌ Erro na operação:", error.message);
        console.log("DICA: Verifique se o Mint Address no .env está correto.");
    }
})();